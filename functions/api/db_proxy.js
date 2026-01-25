/**
 * CloudChan 数据库代理（Cloudflare Pages Functions）
 *
 * 该接口作为前端与 Upstash Redis 之间的代理层：
 * - 敏感信息（UPSTASH_URL / UPSTASH_TOKEN / ADMIN_PASSWORD）仅存储在后端环境变量
 * - 前端只调用 /api/db_proxy，不需要也不应该知道数据库连接信息
 */

// Upstash 中使用的 Key
const FILES_KEY = 'my_crust_files';
const FOLDERS_KEY = 'cc_folders';

// 统一 JSON 响应格式（默认禁用缓存，避免浏览器/边缘缓存导致数据不同步）
function jsonResponse(body, init = {}) {
    const headers = new Headers(init.headers);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (!headers.has('Cache-Control')) {
        headers.set('Cache-Control', 'no-store');
    }
    return new Response(JSON.stringify(body), { ...init, headers });
}

// 统一错误响应格式
function errorResponse(status, error) {
    return jsonResponse({ error }, { status });
}

// 安全读取 JSON 请求体（解析失败返回 null）
async function readJsonBody(request) {
    try {
        return await request.json();
    } catch {
        return null;
    }
}

// Upstash 的 HGETALL 结果在不同场景可能是数组或对象，这里做一次归一化
function normalizeHgetallResult(result) {
    if (!result) return {};
    if (Array.isArray(result)) {
        const obj = {};
        for (let i = 0; i < result.length; i += 2) {
            const k = result[i];
            const v = result[i + 1];
            if (typeof k === 'string') obj[k] = v;
        }
        return obj;
    }
    if (typeof result === 'object') return result;
    return {};
}

// 执行一条 Upstash REST 命令（Redis 命令数组）
async function upstashCommand(env, command) {
    const res = await fetch(env.UPSTASH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.UPSTASH_TOKEN}`
        },
        body: JSON.stringify(command)
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(`Upstash HTTP ${res.status}`);
    }
    if (!json || json.error) {
        throw new Error(json?.error || 'Upstash error');
    }
    return json.result;
}

// 安全解析 JSON（Upstash list/hash 的值通常是 JSON 字符串）
function parseJsonMaybe(value) {
    if (value && typeof value === 'object') return value;
    if (typeof value !== 'string') return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

// 加载文件列表（并过滤明显无效的数据）
async function loadAllFiles(env) {
    const result = await upstashCommand(env, ['LRANGE', FILES_KEY, '0', '-1']);
    const raw = Array.isArray(result) ? result : [];
    const files = raw.map(parseJsonMaybe).filter(item => item && item.cid && item.name);
    return files;
}

function isVerifiedOk(file) {
    if (!file) return false;
    if (file.verified === true) return true;
    return String(file.verify_status || '').toLowerCase() === 'ok';
}

function dedupeFiles(files) {
    const seen = new Map();
    const kept = [];
    let changed = false;

    const score = (f) => {
        const status = String(f?.verify_status || '').toLowerCase();
        const verified = f?.verified === true;
        const folderId = String(f?.folder_id || 'default');
        const uploadedAt = Number(f?.uploadedAt || 0);

        let statusScore = 0;
        if (verified || status === 'ok') statusScore = 40;
        else if (status === 'verifying') statusScore = 20;
        else if (status === 'pending') statusScore = 10;
        else if (status === 'failed') statusScore = 0;

        const folderScore = folderId && folderId !== 'default' ? 5 : 0;
        const timeScore = uploadedAt > 0 ? Math.min(5, Math.floor(uploadedAt / 1e12)) : 0;
        return statusScore + folderScore + timeScore;
    };

    for (const f of files) {
        const cid = String(f?.cid || '');
        if (!cid) continue;
        const name = String(f?.name || '');
        const size = Number(f?.size || 0);
        const key = `${cid}|${name}|${size}`;

        if (!seen.has(key)) {
            seen.set(key, kept.length);
            kept.push(f);
            continue;
        }

        changed = true;
        const idx = seen.get(key);
        const current = kept[idx];

        const pick = score(f) > score(current) ? f : current;
        const other = pick === f ? current : f;

        const merged = { ...other, ...pick };

        const currentFolderId = String(current?.folder_id || 'default');
        const otherFolderId = String(other?.folder_id || 'default');
        const pickFolderId = String(pick?.folder_id || 'default');

        if (currentFolderId === 'default' && pickFolderId !== 'default') {
            merged.folder_id = pickFolderId;
        } else if (currentFolderId !== 'default') {
            merged.folder_id = currentFolderId;
        } else if (otherFolderId !== 'default') {
            merged.folder_id = otherFolderId;
        } else {
            merged.folder_id = 'default';
        }

        if (isVerifiedOk(current) || isVerifiedOk(f)) {
            merged.verified = true;
            merged.verify_status = 'ok';
        }

        kept[idx] = merged;
    }

    return { files: kept, changed };
}

// 覆盖保存完整文件列表（写入临时 key 后 RENAME，避免中途失败导致清空或残缺）
async function saveAllFiles(env, files) {
    if (!Array.isArray(files) || files.length === 0) {
        await upstashCommand(env, ['DEL', FILES_KEY]);
        return;
    }

    const suffix = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const tempKey = `${FILES_KEY}:tmp:${suffix}`;

    await upstashCommand(env, ['DEL', tempKey]);

    try {
        const values = files.map(file => JSON.stringify(file));
        const chunkSize = 200;
        for (let i = 0; i < values.length; i += chunkSize) {
            const chunk = values.slice(i, i + chunkSize);
            await upstashCommand(env, ['RPUSH', tempKey, ...chunk]);
        }

        await upstashCommand(env, ['RENAME', tempKey, FILES_KEY]);
        await ensureKeyPersistent(env, FILES_KEY);
    } catch (e) {
        await upstashCommand(env, ['DEL', tempKey]).catch(() => {});
        throw e;
    }
}

// 在“fileId 优先、index 兜底”的策略下定位文件
function findFileIndex(files, body) {
    const fileId = body?.fileId;
    if (fileId !== undefined && fileId !== null) {
        const indexById = files.findIndex(f => f?.id === fileId || String(f?.id) === String(fileId));
        if (indexById >= 0) return indexById;
    }

    const index = body?.index;
    if (typeof index === 'number' && index >= 0 && index < files.length) return index;
    return -1;
}

// 归一化 fileIds（允许 string/number 或数组输入）
function normalizeToStringArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => String(v));
    return [String(value)];
}

// 归一化 indices（允许 string/number 或数组输入）
function normalizeToNumberArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => Number(v)).filter(v => Number.isFinite(v));
    const n = Number(value);
    return Number.isFinite(n) ? [n] : [];
}

async function ensureDefaultFolder(env) {
    const result = await upstashCommand(env, ['HGET', FOLDERS_KEY, 'default']);
    if (!result) {
        const defaultFolder = {
            id: 'default',
            name: '默认文件夹',
            parentId: null,
            createdAt: new Date().toLocaleString()
        };
        await upstashCommand(env, ['HSET', FOLDERS_KEY, 'default', JSON.stringify(defaultFolder)]);
    }

    await ensureKeyPersistent(env, FOLDERS_KEY);
}

async function ensureKeyPersistent(env, key) {
    try {
        const ttl = await upstashCommand(env, ['TTL', key]);
        const n = Number(ttl);
        if (Number.isFinite(n) && n > 0) {
            await upstashCommand(env, ['PERSIST', key]);
        }
    } catch {}
}

export async function onRequest(context) {
    const { request, env } = context;

    if (!env.UPSTASH_URL || !env.UPSTASH_TOKEN) {
        return errorResponse(500, 'Database configuration error: Missing environment variables');
    }

    function normalizePassword(value) {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        if (trimmed.length >= 2) {
            const first = trimmed[0];
            const last = trimmed[trimmed.length - 1];
            if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
                return trimmed.slice(1, -1).trim();
            }
        }
        return trimmed;
    }

    const expectedPassword = normalizePassword(env.ADMIN_PASSWORD);
    if (!expectedPassword) {
        return errorResponse(500, 'System Error: Env vars not configured');
    }

    const userPassword = normalizePassword(
        request.headers.get('x-auth-token') ||
        request.headers.get('x-admin-password') ||
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    );
    if (!userPassword || userPassword !== expectedPassword) {
        return errorResponse(401, 'Unauthorized: Invalid or missing password');
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const method = request.method;

    if (method !== 'GET') {
        const csrfToken = request.headers.get('x-csrf-token');
        if (!csrfToken) {
            return errorResponse(403, 'Forbidden: Missing CSRF token');
        }
    }

    try {
        switch (action) {
            case 'db_stats': {
                if (method !== 'GET') return errorResponse(405, 'Method not allowed');

                await ensureDefaultFolder(env);

                const filesExists = Boolean(await upstashCommand(env, ['EXISTS', FILES_KEY]));
                const foldersExists = Boolean(await upstashCommand(env, ['EXISTS', FOLDERS_KEY]));
                const filesCount = filesExists ? Number(await upstashCommand(env, ['LLEN', FILES_KEY])) : 0;
                const foldersCount = foldersExists ? Number(await upstashCommand(env, ['HLEN', FOLDERS_KEY])) : 0;
                const filesTtl = filesExists ? Number(await upstashCommand(env, ['TTL', FILES_KEY])) : -2;
                const foldersTtl = foldersExists ? Number(await upstashCommand(env, ['TTL', FOLDERS_KEY])) : -2;
                const hasDefaultFolder = Boolean(await upstashCommand(env, ['HEXISTS', FOLDERS_KEY, 'default']));

                return jsonResponse({
                    success: true,
                    data: {
                        keys: {
                            files: { key: FILES_KEY, exists: filesExists, count: filesCount, ttl: filesTtl },
                            folders: { key: FOLDERS_KEY, exists: foldersExists, count: foldersCount, ttl: foldersTtl, hasDefault: hasDefaultFolder }
                        }
                    }
                });
            }

            case 'scan_keys': {
                if (method !== 'GET') return errorResponse(405, 'Method not allowed');

                const cursor = url.searchParams.get('cursor') || '0';
                const pattern = url.searchParams.get('pattern') || '*';
                const requestedCount = Number(url.searchParams.get('count') || '100');
                const count = Number.isFinite(requestedCount) ? Math.max(1, Math.min(200, Math.floor(requestedCount))) : 100;

                const result = await upstashCommand(env, ['SCAN', cursor, 'MATCH', pattern, 'COUNT', String(count)]);
                const nextCursor = Array.isArray(result) ? String(result[0] ?? '0') : '0';
                const keys = Array.isArray(result) ? (Array.isArray(result[1]) ? result[1] : []) : [];

                return jsonResponse({
                    success: true,
                    data: { cursor: nextCursor, keys }
                });
            }

            case 'key_info': {
                if (method !== 'GET') return errorResponse(405, 'Method not allowed');

                const key = url.searchParams.get('key');
                if (!key || typeof key !== 'string') return errorResponse(400, 'Missing key');
                if (key.length > 256) return errorResponse(400, 'Key too long');

                const type = await upstashCommand(env, ['TYPE', key]);
                const ttl = await upstashCommand(env, ['TTL', key]);
                let length = null;

                if (type === 'list') length = Number(await upstashCommand(env, ['LLEN', key]));
                else if (type === 'hash') length = Number(await upstashCommand(env, ['HLEN', key]));
                else if (type === 'set') length = Number(await upstashCommand(env, ['SCARD', key]));
                else if (type === 'zset') length = Number(await upstashCommand(env, ['ZCARD', key]));
                else if (type === 'string') {
                    const strLen = await upstashCommand(env, ['STRLEN', key]);
                    length = Number(strLen);
                }

                return jsonResponse({
                    success: true,
                    data: { key, type, ttl, length }
                });
            }

            case 'raw_files': {
                if (method !== 'GET') return errorResponse(405, 'Method not allowed');

                const requestedLimit = Number(url.searchParams.get('limit') || '50');
                const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(200, Math.floor(requestedLimit))) : 50;

                const exists = Boolean(await upstashCommand(env, ['EXISTS', FILES_KEY]));
                if (!exists) {
                    return jsonResponse({ success: true, data: { key: FILES_KEY, exists: false, items: [] } });
                }

                const raw = await upstashCommand(env, ['LRANGE', FILES_KEY, '0', String(limit - 1)]);
                const items = (Array.isArray(raw) ? raw : []).map((value) => {
                    const parsed = parseJsonMaybe(value);
                    return {
                        ok: Boolean(parsed),
                        value,
                        parsed
                    };
                });

                return jsonResponse({
                    success: true,
                    data: { key: FILES_KEY, exists: true, items }
                });
            }

            case 'load_files': {
                const files = await loadAllFiles(env);
                const deduped = dedupeFiles(files);
                if (deduped.changed) {
                    await saveAllFiles(env, deduped.files);
                }
                return jsonResponse({ success: true, data: deduped.files });
            }

            case 'check_verification_status': {
                if (method !== 'GET') return errorResponse(405, 'Method not allowed');

                const files = await loadAllFiles(env);

                // 查找验证失败的文件
                const failedFiles = files.filter(file => {
                    const status = String(file?.verify_status || '').toLowerCase();
                    return status === 'failed' || status === 'error';
                });

                return jsonResponse({
                    success: true,
                    failedFiles
                });
            }

            case 'save_file': {
                if (method !== 'POST') return errorResponse(405, 'Method not allowed');
                const body = await readJsonBody(request);
                if (!body) return errorResponse(400, 'Invalid JSON body');
                if (!body.name || !body.size || !body.cid) return errorResponse(400, 'Missing required fields');

                const record = {
                    id: body.id ?? Date.now(),
                    name: body.name,
                    size: body.size,
                    cid: body.cid,
                    date: body.date || new Date().toLocaleString(),
                    folder_id: body.folder_id || 'default',
                    hash: body.hash,
                    verified: body.verified,
                    verify_status: body.verify_status,
                    verify_message: body.verify_message,
                    uploadedAt: body.uploadedAt
                };

                const files = await loadAllFiles(env);
                const cid = String(record.cid);
                const name = String(record.name);
                const size = Number(record.size);
                const key = `${cid}|${name}|${size}`;
                const existingIdx = files.findIndex(f => `${String(f?.cid || '')}|${String(f?.name || '')}|${Number(f?.size || 0)}` === key);

                if (existingIdx >= 0) {
                    const existing = files[existingIdx] || {};
                    const existingFolderId = String(existing?.folder_id || 'default');
                    const incomingFolderId = String(record?.folder_id || 'default');

                    const merged = { ...existing, ...record, id: existing.id ?? record.id };
                    if (existingFolderId !== 'default' && incomingFolderId === 'default') {
                        merged.folder_id = existingFolderId;
                    } else if (existingFolderId === 'default' && incomingFolderId !== 'default') {
                        merged.folder_id = incomingFolderId;
                    } else {
                        merged.folder_id = existingFolderId || incomingFolderId || 'default';
                    }

                    if (isVerifiedOk(existing) || isVerifiedOk(record)) {
                        merged.verified = true;
                        merged.verify_status = 'ok';
                    }

                    files[existingIdx] = merged;
                    const deduped = dedupeFiles(files);
                    await saveAllFiles(env, deduped.files);
                    return jsonResponse({ success: true, message: 'File record merged', data: { id: merged.id, deduped: true } });
                }

                await upstashCommand(env, ['LPUSH', FILES_KEY, JSON.stringify(record)]);
                await ensureKeyPersistent(env, FILES_KEY);
                return jsonResponse({ success: true, message: 'File record saved', data: { id: record.id } });
            }

            case 'delete_file': {
                if (method !== 'POST') return errorResponse(405, 'Method not allowed');
                const body = await readJsonBody(request);
                if (!body) return errorResponse(400, 'Invalid JSON body');

                const files = await loadAllFiles(env);
                const idx = findFileIndex(files, body);
                if (idx < 0) return errorResponse(400, 'File not found');
                files.splice(idx, 1);
                await saveAllFiles(env, files);
                return jsonResponse({ success: true, message: 'File deleted successfully' });
            }

            case 'delete_files': {
                if (method !== 'POST') return errorResponse(405, 'Method not allowed');
                const body = await readJsonBody(request);
                if (!body) return errorResponse(400, 'Invalid JSON body');

                const fileIds = normalizeToStringArray(body.fileIds);
                const indices = normalizeToNumberArray(body.indices);
                if (fileIds.length === 0 && indices.length === 0) {
                    return errorResponse(400, 'Missing fileIds or indices');
                }

                const files = await loadAllFiles(env);
                const idSet = new Set(fileIds.map(String));

                const indicesSet = new Set(
                    indices
                        .filter(i => i >= 0 && i < files.length)
                        .map(i => i)
                );

                const kept = files.filter((file, idx) => {
                    if (indicesSet.has(idx)) return false;
                    if (file?.id !== undefined && file?.id !== null && idSet.has(String(file.id))) return false;
                    return true;
                });

                const deleted = files.length - kept.length;
                await saveAllFiles(env, kept);
                return jsonResponse({ success: true, deleted });
            }

            case 'rename_file': {
                if (method !== 'POST') return errorResponse(405, 'Method not allowed');
                const body = await readJsonBody(request);
                if (!body) return errorResponse(400, 'Invalid JSON body');
                if (!body.newName || typeof body.newName !== 'string' || body.newName.trim() === '') {
                    return errorResponse(400, 'Invalid new file name');
                }

                const files = await loadAllFiles(env);
                const idx = findFileIndex(files, body);
                if (idx < 0) return errorResponse(400, 'File not found');
                files[idx].name = body.newName.trim();
                await saveAllFiles(env, files);
                return jsonResponse({ success: true, message: 'File renamed successfully' });
            }

            case 'update_file': {
                if (method !== 'POST') return errorResponse(405, 'Method not allowed');
                const body = await readJsonBody(request);
                if (!body) return errorResponse(400, 'Invalid JSON body');

                const files = await loadAllFiles(env);
                const idx = findFileIndex(files, body);
                if (idx < 0) return errorResponse(400, 'File not found');

                const patch = body.patch && typeof body.patch === 'object' ? body.patch : null;
                if (!patch) return errorResponse(400, 'Missing patch');

                const next = { ...files[idx], ...patch };
                files[idx] = next;
                await saveAllFiles(env, files);
                return jsonResponse({ success: true, data: next });
            }

            case 'move_file': {
                if (method !== 'POST') return errorResponse(405, 'Method not allowed');
                const body = await readJsonBody(request);
                if (!body) return errorResponse(400, 'Invalid JSON body');
                if (!body.folderId) return errorResponse(400, 'Invalid folder ID');

                const files = await loadAllFiles(env);
                const idx = findFileIndex(files, body);
                if (idx < 0) return errorResponse(400, 'File not found');
                files[idx].folder_id = body.folderId;
                await saveAllFiles(env, files);
                return jsonResponse({ success: true, message: 'File moved successfully' });
            }

            case 'move_files': {
                if (method !== 'POST') return errorResponse(405, 'Method not allowed');
                const body = await readJsonBody(request);
                if (!body) return errorResponse(400, 'Invalid JSON body');
                if (!body.folderId) return errorResponse(400, 'Invalid folder ID');
                const fileIds = normalizeToStringArray(body.fileIds);
                if (fileIds.length === 0) return errorResponse(400, 'Missing fileIds');

                const files = await loadAllFiles(env);
                const idSet = new Set(fileIds.map(String));

                let moved = 0;
                for (const file of files) {
                    if (file?.id !== undefined && file?.id !== null && idSet.has(String(file.id))) {
                        file.folder_id = body.folderId;
                        moved++;
                    }
                }

                await saveAllFiles(env, files);
                return jsonResponse({ success: true, moved });
            }

            case 'propagate_file': {
                if (method !== 'POST') return errorResponse(405, 'Method not allowed');
                return await handlePropagateFile(request);
            }

            case 'verify_file': {
                if (method !== 'POST') return errorResponse(405, 'Method not allowed');
                const body = await readJsonBody(request);
                if (!body) return errorResponse(400, 'Invalid JSON body');
                if (!body.fileId || !body.cid) return errorResponse(400, 'Missing required fields');

                const files = await loadAllFiles(env);
                const idx = files.findIndex(f => f?.id === body.fileId || String(f?.id) === String(body.fileId));
                if (idx < 0) return errorResponse(400, 'File not found');

                const file = files[idx];
                const cid = body.cid;
                const hash = body.hash;

                try {
                    // 调用后端验证API
                    const verifyUrl = `/api/ipfs_verify?cid=${encodeURIComponent(cid)}&method=auto&maxRetries=3&timeoutMs=8000&parallel=4&rangeFallback=1&profile=AUTO`;
                    const verifyRes = await fetch(verifyUrl, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    const verifyData = await verifyRes.json();
                    
                    if (verifyData.success) {
                        // 验证成功
                        file.verified = true;
                        file.verify_status = 'ok';
                        file.verify_message = verifyData.message || '验证成功';
                    } else {
                        // 验证失败
                        const err = verifyData.error || '验证失败';
                        const permanent = typeof err === 'string' && err.includes('哈希不匹配');
                        
                        if (permanent) {
                            file.verified = false;
                            file.verify_status = 'failed';
                            file.verify_message = err;
                        } else {
                            file.verified = false;
                            file.verify_status = 'pending';
                            file.verify_message = `校验失败，已加入自动重试：${err}`;
                        }
                    }

                    files[idx] = file;
                    await saveAllFiles(env, files);

                    return jsonResponse({ success: true, data: file });
                } catch (e) {
                    // 验证失败，设置为pending状态
                    file.verified = false;
                    file.verify_status = 'pending';
                    file.verify_message = `校验失败，网络错误：${e.message}`;
                    
                    files[idx] = file;
                    await saveAllFiles(env, files);

                    return jsonResponse({ success: true, data: file, error: e.message });
                }
            }

            case 'load_folders': {
                await ensureDefaultFolder(env);
                const result = await upstashCommand(env, ['HGETALL', FOLDERS_KEY]);
                const map = normalizeHgetallResult(result);
                const folders = Object.keys(map).map(id => parseJsonMaybe(map[id])).filter(Boolean);
                return jsonResponse({ success: true, data: folders });
            }

            case 'create_folder': {
                if (method !== 'POST') return errorResponse(405, 'Method not allowed');
                const body = await readJsonBody(request);
                if (!body) return errorResponse(400, 'Invalid JSON body');
                if (!body.name) return errorResponse(400, 'Missing folder name');

                const folderId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
                    ? `folder_${crypto.randomUUID()}`
                    : `folder_${Date.now()}_${Math.random().toString(16).slice(2)}`;
                const folder = {
                    id: folderId,
                    name: body.name,
                    parentId: body.parentId || null,
                    createdAt: new Date().toLocaleString()
                };
                await upstashCommand(env, ['HSET', FOLDERS_KEY, folder.id, JSON.stringify(folder)]);
                await ensureKeyPersistent(env, FOLDERS_KEY);
                return jsonResponse({ success: true, data: folder });
            }

            case 'delete_folder': {
                if (method !== 'POST') return errorResponse(405, 'Method not allowed');
                const body = await readJsonBody(request);
                if (!body) return errorResponse(400, 'Invalid JSON body');
                if (!body.folderId) return errorResponse(400, 'Missing folder ID');
                if (body.folderId === 'default') return errorResponse(400, 'Cannot delete default folder');

                const folderId = String(body.folderId);

                const recursive = body.recursive === true;
                const files = await loadAllFiles(env);

                if (recursive) {
                    // 递归获取所有子文件夹 ID
                    const result = await upstashCommand(env, ['HGETALL', FOLDERS_KEY]);
                    const map = normalizeHgetallResult(result);
                    const allFolders = Object.keys(map).map(id => parseJsonMaybe(map[id])).filter(Boolean);
                    
                    const folderIdsToDelete = new Set([folderId]);
                    let added;
                    do {
                        added = false;
                        for (const f of allFolders) {
                            const parentId = f?.parentId !== undefined && f?.parentId !== null ? String(f.parentId) : '';
                            const id = f?.id !== undefined && f?.id !== null ? String(f.id) : '';
                            if (parentId && folderIdsToDelete.has(parentId) && id && !folderIdsToDelete.has(id)) {
                                folderIdsToDelete.add(id);
                                added = true;
                            }
                        }
                    } while (added);

                    // 删除所有相关文件
                    const keptFiles = files.filter(file => !folderIdsToDelete.has(String(file.folder_id)));
                    if (keptFiles.length !== files.length) {
                        await saveAllFiles(env, keptFiles);
                    }

                    // 删除所有文件夹
                    const folderIdsArray = Array.from(folderIdsToDelete);
                    await upstashCommand(env, ['HDEL', FOLDERS_KEY, ...folderIdsArray]);
                    
                    return jsonResponse({ 
                        success: true, 
                        message: `Folder and its contents deleted`,
                        deletedFolders: folderIdsArray.length,
                        deletedFiles: files.length - keptFiles.length
                    });
                } else {
                    const filesInFolder = files.filter(file => String(file.folder_id) === folderId);
                    if (filesInFolder.length > 0) {
                        return errorResponse(400, `Cannot delete folder with ${filesInFolder.length} files`);
                    }

                    // 检查是否有子文件夹
                    const result = await upstashCommand(env, ['HGETALL', FOLDERS_KEY]);
                    const map = normalizeHgetallResult(result);
                    const hasSubfolders = Object.values(map).some(raw => {
                        const f = parseJsonMaybe(raw);
                        return f && String(f.parentId) === folderId;
                    });

                    if (hasSubfolders) {
                        return errorResponse(400, `Cannot delete folder with subfolders`);
                    }

                    await upstashCommand(env, ['HDEL', FOLDERS_KEY, folderId]);
                    return jsonResponse({ success: true, message: 'Folder deleted' });
                }
            }

            case 'rename_folder': {
                if (method !== 'POST') return errorResponse(405, 'Method not allowed');
                const body = await readJsonBody(request);
                if (!body) return errorResponse(400, 'Invalid JSON body');
                if (!body.folderId || !body.newName) return errorResponse(400, 'Missing folder ID or new name');
                if (body.folderId === 'default') return errorResponse(400, 'Cannot rename default folder');

                const raw = await upstashCommand(env, ['HGET', FOLDERS_KEY, body.folderId]);
                if (!raw) return errorResponse(404, 'Folder not found');
                const folder = parseJsonMaybe(raw);
                if (!folder) return errorResponse(500, 'Folder data corrupted');
                folder.name = body.newName;
                await upstashCommand(env, ['HSET', FOLDERS_KEY, body.folderId, JSON.stringify(folder)]);
                return jsonResponse({ success: true, data: folder });
            }

            default:
                return errorResponse(400, 'Invalid action');
        }
    } catch (error) {
        return errorResponse(500, `Server error: ${error?.message || 'Unknown error'}`);
    }
}

async function handlePropagateFile(request) {
    const body = await readJsonBody(request);
    if (!body || !body.cid || typeof body.cid !== 'string') {
        return errorResponse(400, 'Invalid CID');
    }

    const publicGateways = [
        { name: 'Cloudflare-CN', url: `https://cf-ipfs.com/ipfs/${body.cid}` },
        { name: 'Cloudflare-IPFS', url: `https://cloudflare-ipfs.com/ipfs/${body.cid}` },
        { name: 'DWeb Link', url: `https://dweb.link/ipfs/${body.cid}` },
        { name: 'W3S Link', url: `https://w3s.link/ipfs/${body.cid}` },
        { name: 'IPFS.io', url: `https://ipfs.io/ipfs/${body.cid}` },
        { name: '4EVERLAND', url: `https://4everland.io/ipfs/${body.cid}` },
        { name: 'Lighthouse', url: `https://gateway.lighthouse.storage/ipfs/${body.cid}` },
        { name: 'IPFSScan-CN', url: `https://cdn.ipfsscan.io/ipfs/${body.cid}` },
        { name: 'Infura', url: `https://ipfs.infura.io/ipfs/${body.cid}` },
        { name: 'Pinata Gateway', url: `https://gateway.pinata.cloud/ipfs/${body.cid}` },
        { name: 'NFT Storage', url: `https://nftstorage.link/ipfs/${body.cid}` },
        { name: 'Web3.Storage', url: `https://web3.storage/ipfs/${body.cid}` },
        { name: 'IPFS TTL', url: `https://ipfs.eternum.io/ipfs/${body.cid}` },
        { name: 'Fleek', url: `https://ipfs.fleek.co/ipfs/${body.cid}` },
        { name: 'Crust Websites', url: `https://crustwebsites.net/ipfs/${body.cid}` },
        { name: 'Jorropo', url: `https://ipfs.jorropo.com/ipfs/${body.cid}` },
        { name: 'Via IPFS', url: `https://via.ipfs.io/ipfs/${body.cid}` },
        { name: 'Trust IPFS', url: `https://trustipfs.io/ipfs/${body.cid}` },
        { name: 'Akasha', url: `https://ipfs.akasha.link/ipfs/${body.cid}` },
        { name: 'Protocol Labs', url: `https://ipfs.runfission.com/ipfs/${body.cid}` },
        { name: 'Cafe', url: `https://cafe.cloud.ipfs.team/ipfs/${body.cid}` }
    ];

    const gatewayPromises = publicGateways.map(async (gateway) => {
        const maxRetries = 2;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                const res = await fetch(gateway.url, { method: 'HEAD', signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.ok) {
                    return { gateway: gateway.name, success: true, message: `已触发缓存 (HTTP ${res.status})` };
                }

                if (attempt === maxRetries) {
                    return { gateway: gateway.name, success: false, error: `HTTP ${res.status}` };
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                if (attempt === maxRetries) {
                    return { gateway: gateway.name, success: false, error: error?.message || 'Request failed' };
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return { gateway: gateway.name, success: false, error: 'Unknown error' };
    });

    const settled = await Promise.allSettled(gatewayPromises);
    const results = settled.map(r => (r.status === 'fulfilled' ? r.value : { gateway: 'Unknown', success: false, error: r.reason?.message || 'Promise rejected' }));

    return jsonResponse({
        success: true,
        message: 'Propagation completed',
        results,
        summary: {
            total: results.length,
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        }
    });
}
