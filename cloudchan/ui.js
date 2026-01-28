/**
 * CloudChan UI 模块
 * @version 2.2.1
 */

import { CONFIG } from './config.js?v=2.2.1';

console.log(`CloudChan UI 已加载 - 版本: ${CONFIG.APP.VERSION}`);

// 缓存：网关列表与健康追踪数据（localStorage）
const STORAGE_KEY = 'cc_gateways_v2'; // 升级到 v2，支持版本检测
const STORAGE_VERSION_KEY = 'cc_gateways_version'; // 存储配置版本
const HEALTH_CACHE_KEY = CONFIG.GATEWAY_HEALTH.HEALTH_CACHE_KEY;
const HEALTH_CACHE_EXPIRY = CONFIG.GATEWAY_HEALTH.HEALTH_CACHE_EXPIRY;  // 30 天过期
const NETWORK_PROFILE_KEY = 'cc_network_profile';

function getNetworkProfile() {
    const raw = (localStorage.getItem(NETWORK_PROFILE_KEY) || 'AUTO').toUpperCase();
    if (raw === 'CN' || raw === 'INTL' || raw === 'AUTO') return raw;
    return 'AUTO';
}

function setNetworkProfile(value) {
    const v = String(value || '').toUpperCase();
    localStorage.setItem(NETWORK_PROFILE_KEY, (v === 'CN' || v === 'INTL' || v === 'AUTO') ? v : 'AUTO');
}

// 读取网关列表缓存并与默认列表合并（支持版本检测）
function loadGateways() {
    const defaults = [...CONFIG.DEFAULT_GATEWAYS];
    const currentVersion = `${CONFIG.APP.VERSION}-${CONFIG.APP.BUILD_TIME}`;

    try {
        // 检查版本是否变化
        const cachedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
        if (cachedVersion !== currentVersion) {
            console.log(`⚠️ 网关配置版本变化 (${cachedVersion} → ${currentVersion})，清除旧缓存`);
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_VERSION_KEY);
            localStorage.setItem(STORAGE_VERSION_KEY, currentVersion);
            return defaults;
        }

        const cachedStr = localStorage.getItem(STORAGE_KEY);
        if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            const existingUrls = new Set(defaults.map(g => g.url));

            let loadedCount = 0;
            cached.forEach(gw => {
                if (!existingUrls.has(gw.url)) {
                    defaults.push(gw);
                    existingUrls.add(gw.url);
                    loadedCount++;
                }
            });
            if(loadedCount > 0) console.log(`已加载 ${loadedCount} 个本地缓存节点，总计 ${defaults.length} 个网关`);
        }
    } catch (e) {
        console.error("读取网关缓存失败", e);
    }
    return defaults;
}

// 保存当前列表到本地
function saveGateways(gateways) {
    try {
        const cleanList = gateways.map(g => ({
            name: g.name,
            url: g.url,
            icon: g.icon,
            priority: g.priority,
            region: g.region
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
        // 保存当前配置版本
        localStorage.setItem(STORAGE_VERSION_KEY, `${CONFIG.APP.VERSION}-${CONFIG.APP.BUILD_TIME}`);
    } catch (e) {
        console.error("保存网关缓存失败", e);
    }
}

// 读取网关健康缓存（增强版 - 支持详细状态追踪）
function loadGatewayHealth() {
    try {
        const cachedStr = localStorage.getItem(HEALTH_CACHE_KEY);
        if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            if (cached.timestamp && Date.now() - cached.timestamp < HEALTH_CACHE_EXPIRY) {
                console.log(`✓ 加载网关健康缓存: ${Object.keys(cached.data).length} 条记录`);
                return cached.data;
            }
        }
    } catch (e) {
        console.error("读取网关健康缓存失败", e);
    }
    return {};
}

// 保存网关健康状态（增强版 - 追踪失败次数等）
function saveGatewayHealth(healthData) {
    try {
        const cacheData = {
            timestamp: Date.now(),
            data: healthData
        };
        localStorage.setItem(HEALTH_CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
        console.error("保存网关健康状态失败", e);
    }
}

// 更新网关健康状态（记录成功/失败次数、连续失败等）
function updateGatewayHealth(healthData, gatewayUrl, testResult) {
    const now = Date.now();
    const existing = healthData[gatewayUrl] || {
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        lastSuccessTime: 0,
        lastFailureTime: 0,
        lastCheckTime: 0
    };

    const updated = { ...existing, lastCheckTime: now };

    if (testResult.success) {
        // 测试成功
        updated.successCount = (existing.successCount || 0) + 1;
        updated.consecutiveFailures = 0;  // 重置连续失败次数
        updated.lastSuccessTime = now;
        updated.healthScore = testResult.score || 100;
        updated.latency = testResult.latency;
    } else {
        // 测试失败
        updated.failureCount = (existing.failureCount || 0) + 1;
        updated.consecutiveFailures = (existing.consecutiveFailures || 0) + 1;
        updated.lastFailureTime = now;
        updated.healthScore = 0;
        updated.latency = -1;
    }

    healthData[gatewayUrl] = updated;
    return updated;
}

// 判断网关是否需要清理（根据健康追踪与清理规则）
function shouldCleanupGateway(healthData, gatewayUrl, gatewayConfig = {}) {
    const health = healthData[gatewayUrl];
    if (!health) {
        return { shouldCleanup: false, reason: '' };
    }

    const cleanupConfig = CONFIG.GATEWAY_HEALTH.CLEANUP;
    const now = Date.now();
    let reasons = [];

    // 规则1：失败次数过多
    if (health.failureCount >= cleanupConfig.MAX_FAILURE_COUNT) {
        reasons.push(`失败次数过多 (${health.failureCount}/${cleanupConfig.MAX_FAILURE_COUNT})`);
    }

    // 规则2：连续失败次数过多
    if (health.consecutiveFailures >= cleanupConfig.MAX_CONSECUTIVE_FAILURES) {
        reasons.push(`连续失败 ${health.consecutiveFailures} 次`);
    }

    // 规则3：长时间未使用（从未成功过或很久未成功）
    const daysSinceLastSuccess = health.lastSuccessTime
        ? (now - health.lastSuccessTime) / (1000 * 60 * 60 * 24)
        : cleanupConfig.MAX_UNUSED_DAYS + 1;

    if (daysSinceLastSuccess >= cleanupConfig.MAX_UNUSED_DAYS) {
        reasons.push(`${Math.round(daysSinceLastSuccess)} 天未成功访问`);
    }

    // 规则4：健康分数过低
    if (health.healthScore !== undefined && health.healthScore < cleanupConfig.MIN_HEALTH_SCORE) {
        reasons.push(`健康分数过低 (${health.healthScore})`);
    }

    // 默认网关（优先级<=10）不受自动清理影响
    if (gatewayConfig.priority && gatewayConfig.priority <= 10) {
        reasons = [];
    }

    return {
        shouldCleanup: reasons.length > 0,
        reason: reasons.join('，')
    };
}

// 标记需要清理的网关（返回清理候选列表与原因）
function identifyCleanupGateways(gateways, healthData) {
    const cleanupList = [];

    gateways.forEach(gw => {
        const checkResult = shouldCleanupGateway(healthData, gw.url, gw);
        if (checkResult.shouldCleanup) {
            cleanupList.push({
                ...gw,
                cleanupReason: checkResult.reason,
                health: healthData[gw.url]
            });
        }
    });

    return cleanupList;
}

// 执行网关清理（默认网关不清理）
function performGatewayCleanup(gateways, healthData) {
    const cleanupConfig = CONFIG.GATEWAY_HEALTH.CLEANUP;

    if (!cleanupConfig.ENABLED) {
        return { cleaned: 0, gateways, message: '自动清理未启用' };
    }

    const cleanupList = identifyCleanupGateways(gateways, healthData);

    if (cleanupList.length === 0) {
        return { cleaned: 0, gateways, message: '没有需要清理的网关' };
    }

    const urlsToCleanup = new Set(cleanupList.map(gw => gw.url));

    const newGateways = gateways.filter(gw => {
        // 保留默认网关（优先级<=10）
        if (gw.priority && gw.priority <= 10) {
            return true;
        }
        return !urlsToCleanup.has(gw.url);
    });

    const cleanedCount = gateways.length - newGateways.length;

    return {
        cleaned: cleanedCount,
        gateways: newGateways,
        removedGateways: cleanupList,
        message: `已清理 ${cleanedCount} 个长期不可用的网关`
    };
}

// 读取检测结果短期缓存（默认 10 分钟）
async function loadCheckResultCache() {
    try {
        const cachedStr = localStorage.getItem(CONFIG.GATEWAY_TEST.CHECK_CACHE_KEY);
        console.log('=== 读取网关测试缓存 ===');
        console.log('缓存键:', CONFIG.GATEWAY_TEST.CHECK_CACHE_KEY);
        console.log('缓存内容存在:', !!cachedStr);

        if (!cachedStr) {
            console.log('⚠️ 缓存不存在');
            return { results: null, ageSeconds: 0, isExpired: true };
        }

        let cached;
        try {
            if (cachedStr.startsWith('H4sI')) { // 检查是否为gzip压缩数据（Base64编码）
                console.log('ℹ️ 检测到压缩缓存数据，正在解压...');
                // 解压数据
                const binaryString = atob(cachedStr);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                const decompressedStream = new Response(bytes.buffer).body
                    .pipeThrough(new DecompressionStream('gzip'));
                const decompressedText = await new Response(decompressedStream).text();
                cached = JSON.parse(decompressedText);
                console.log('✅ 缓存数据已解压');
            } else {
                cached = JSON.parse(cachedStr);
                console.log('ℹ️ 使用原始JSON缓存数据');
            }
        } catch (e) {
            console.error('⚠️ 缓存解析失败:', e);
            return { results: null, ageSeconds: 0, isExpired: true };
        }

        if (!cached || !cached.results || !Array.isArray(cached.results)) {
            console.log('⚠️ 缓存数据格式无效');
            return { results: null, ageSeconds: 0, isExpired: true };
        }

        // 检查缓存版本
        if (cached.version !== CONFIG.GATEWAY_TEST.CACHE_VERSION) {
            console.log(`⚠️ 缓存版本不匹配，当前版本: ${CONFIG.GATEWAY_TEST.CACHE_VERSION}，缓存版本: ${cached.version || '未定义'}`);
            return { results: null, ageSeconds: 0, isExpired: true };
        }

        console.log('缓存时间戳:', cached.timestamp);
        console.log('当前时间:', Date.now());
        console.log('缓存结果数量:', cached.results.length);
        console.log('缓存有效期(毫秒):', CONFIG.GATEWAY_TEST.CHECK_CACHE_EXPIRY);

        if (!cached.timestamp || !Number.isFinite(cached.timestamp)) {
            console.log('⚠️ 缓存时间戳无效');
            return { results: null, ageSeconds: 0, isExpired: true };
        }

        const timeDiff = Date.now() - cached.timestamp;
        console.log('时间差(毫秒):', timeDiff);

        if (timeDiff < 0) {
            console.log('⚠️ 缓存时间戳异常（未来时间）');
            return { results: null, ageSeconds: 0, isExpired: true };
        }

        if (timeDiff >= CONFIG.GATEWAY_TEST.CHECK_CACHE_EXPIRY) {
            console.log(`⚠️ 检测结果缓存已过期 (${Math.round(timeDiff / 1000)}秒前)`);
            // 自动清理过期缓存
            localStorage.removeItem(CONFIG.GATEWAY_TEST.CHECK_CACHE_KEY);
            return { results: null, ageSeconds: 0, isExpired: true };
        }

        const ageSeconds = Math.round(timeDiff / 1000);
        console.log(`✅ 使用检测结果缓存 (缓存时长: ${ageSeconds}秒)`);
        return {
            results: cached.results,
            ageSeconds: ageSeconds,
            isExpired: false,
            version: cached.version,
            statistics: cached.statistics || {}
        };
    } catch (e) {
        console.error("❌ 读取检测结果缓存失败:", e);
        return { results: null, ageSeconds: 0, isExpired: true };
    }
}

// 保存检测结果短期缓存（默认 10 分钟）
async function saveCheckResultCache(results) {
    try {
        if (!results || !Array.isArray(results) || results.length === 0) {
            console.warn('⚠️ 跳过保存无效的缓存结果:', results);
            return false;
        }

        // 计算缓存统计信息
        const statistics = {
            total: results.length,
            available: results.filter(r => r.isAvailable).length,
            unavailable: results.filter(r => !r.isAvailable).length,
            averageLatency: Math.round(results.filter(r => r.isAvailable && r.latency >= 0)
                .reduce((sum, r) => sum + r.latency, 0) / 
                (results.filter(r => r.isAvailable && r.latency >= 0).length || 1)),
            fastestGateway: results.filter(r => r.isAvailable)
                .sort((a, b) => a.latency - b.latency)[0]?.url || '',
            cachedAt: new Date().toISOString()
        };

        const cacheData = {
            timestamp: Date.now(),
            results: results,
            version: CONFIG.GATEWAY_TEST.CACHE_VERSION,
            statistics: statistics
        };

        console.log('=== 保存网关测试缓存 ===');
        console.log('缓存结果数量:', results.length);
        console.log('缓存键:', CONFIG.GATEWAY_TEST.CHECK_CACHE_KEY);
        console.log('缓存时间戳:', cacheData.timestamp);
        console.log('缓存版本:', cacheData.version);
        console.log('缓存统计信息:', statistics);

        // 尝试压缩缓存数据（仅当支持时）
        let cacheString;
        try {
            if (typeof CompressionStream !== 'undefined' && typeof ReadableStream !== 'undefined') {
                const stream = new Blob([JSON.stringify(cacheData)]).stream();
                const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
                const buffer = await new Response(compressedStream).arrayBuffer();
                cacheString = btoa(String.fromCharCode(...new Uint8Array(buffer)));
                console.log('✅ 缓存数据已压缩');
            } else {
                cacheString = JSON.stringify(cacheData);
                console.log('ℹ️ 浏览器不支持压缩，使用原始JSON');
            }
        } catch (e) {
            console.warn('⚠️ 缓存压缩失败，回退到原始JSON:', e);
            cacheString = JSON.stringify(cacheData);
        }

        localStorage.setItem(CONFIG.GATEWAY_TEST.CHECK_CACHE_KEY, cacheString);

        // 验证保存是否成功
        const savedData = localStorage.getItem(CONFIG.GATEWAY_TEST.CHECK_CACHE_KEY);
        if (!savedData) {
            console.error('❌ 缓存保存失败：保存后读取为空');
            return false;
        }

        try {
            let parsed;
            if (savedData.startsWith('H4sI')) { // 检查是否为gzip压缩数据（Base64编码）
                console.log('ℹ️ 检测到压缩缓存数据');
                // 解压逻辑（仅在验证时使用）
                const binaryString = atob(savedData);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const decompressedStream = new Response(bytes.buffer).body
                    .pipeThrough(new DecompressionStream('gzip'));
                const decompressedText = await new Response(decompressedStream).text();
                parsed = JSON.parse(decompressedText);
            } else {
                parsed = JSON.parse(savedData);
            }
            
            if (!parsed || !parsed.results || parsed.results.length !== results.length) {
                console.error('❌ 缓存验证失败：数据不一致');
                return false;
            }
        } catch (e) {
            console.error('❌ 缓存验证失败：解析错误', e);
            return false;
        }

        console.log(`✅ 检测结果已缓存，有效期 ${CONFIG.GATEWAY_TEST.CHECK_CACHE_EXPIRY / 1000 / 60} 分钟`);
        console.log(`📊 缓存大小: ${Math.round(savedData.length / 1024)} KB`);
        return true;
    } catch (e) {
        console.error("❌ 保存检测结果缓存失败:", e);
        return false;
    }
}

// 清除检测结果缓存
function clearCheckResultCache() {
    localStorage.removeItem(CONFIG.GATEWAY_TEST.CHECK_CACHE_KEY);
    console.log('✓ 已清除检测结果缓存');
}

// 根据优先级和健康状态排序网关
function sortGatewaysByPriority(gateways, healthData = {}) {
    return gateways.sort((a, b) => {
        const priorityA = a.priority || 999;
        const priorityB = b.priority || 999;

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        const healthA = healthData[a.url] || { score: 50 };
        const healthB = healthData[b.url] || { score: 50 };

        return healthB.score - healthA.score;
    });
}

export const UI = {
    currentGateways: loadGateways(),
    // 撤销功能相关状态
    undoStack: [], // 撤销操作栈
    maxUndoItems: 10, // 最大撤销项目数
    undoTimeout: 5000, // 撤销超时时间（毫秒）
    currentUndoTimer: null, // 当前撤销定时器

    toast: (msg, type = 'info') => {
        const container = document.getElementById('toast-container') || createToastContainer();
        const div = document.createElement('div');
        div.className = `toast ${type}`;
        div.textContent = msg;
        container.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    },

    /**
     * 显示确认对话框
     */
    confirm: (message, options = {}) => {
        return new Promise((resolve) => {
            const defaultOptions = {
                title: '确认操作',
                confirmText: '确定',
                cancelText: '取消',
                confirmClass: 'btn-primary',
                cancelClass: 'btn-secondary'
            };

            const mergedOptions = { ...defaultOptions, ...options };

            // 创建对话框
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-box glass-effect" style="width: 400px; max-width: 90%;">
                    <div style="padding: 20px;">
                        <h3 style="margin-top: 0; margin-bottom: 15px;">${mergedOptions.title}</h3>
                        <p style="margin-bottom: 20px;">${message}</p>
                        <div style="display: flex; justify-content: flex-end; gap: 10px;">
                            <button id="confirm-cancel-btn" class="btn ${mergedOptions.cancelClass}">${mergedOptions.cancelText}</button>
                            <button id="confirm-ok-btn" class="btn ${mergedOptions.confirmClass}">${mergedOptions.confirmText}</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // 事件处理
            const cancelBtn = overlay.querySelector('#confirm-cancel-btn');
            const okBtn = overlay.querySelector('#confirm-ok-btn');

            const cleanup = () => {
                overlay.remove();
            };

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            okBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            // 点击模态框外部关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            });

            // ESC键关闭
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    },

    promptRename: (initialName, options = {}) => {
        return new Promise((resolve) => {
            const title = options.title || '重命名文件';

            const name = String(initialName || '');
            const lastDot = name.lastIndexOf('.');
            const hasSuffix = lastDot > 0 && lastDot < name.length - 1;
            const baseName = hasSuffix ? name.slice(0, lastDot) : name;
            const suffixRaw = hasSuffix ? name.slice(lastDot + 1) : '';

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-box glass-effect" style="width: 460px; max-width: 92%;">
                    <div style="padding: 20px;">
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                            <h3 style="margin:0;">${title}</h3>
                            <button type="button" class="btn-icon" id="rename-close-btn" aria-label="关闭">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div class="form-group" style="margin-top: 14px;">
                            <label><i class="fa-solid fa-pen"></i> 文件名</label>
                            <div class="input-wrapper">
                                <input type="text" id="rename-base-input" value="${baseName.replace(/"/g, '&quot;')}" autocomplete="off">
                            </div>
                        </div>

                        <div style="margin-top: 12px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
                            <label style="display:flex; align-items:center; gap:8px; color: var(--text-secondary); font-size: 0.92rem;">
                                <input type="checkbox" id="rename-suffix-toggle">
                                编辑后缀
                            </label>
                            <div style="color: var(--text-tertiary); font-size: 0.88rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${hasSuffix ? '.' + suffixRaw : ''}">
                                ${hasSuffix ? ('当前后缀：.' + suffixRaw) : '当前无后缀'}
                            </div>
                        </div>

                        <div class="form-group" id="rename-suffix-row" style="margin-top: 10px; display:none;">
                            <label><i class="fa-solid fa-tag"></i> 后缀</label>
                            <div class="input-wrapper" style="gap:8px;">
                                <span style="padding-left: 6px; color: var(--text-tertiary);">.</span>
                                <input type="text" id="rename-suffix-input" value="${suffixRaw.replace(/"/g, '&quot;')}" autocomplete="off" style="padding-left: 10px;">
                            </div>
                        </div>

                        <div id="rename-error" style="margin-top: 12px; color: #dc2626; font-size: 0.9rem; display:none;"></div>

                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 18px;">
                            <button type="button" class="btn btn-secondary" id="rename-cancel-btn">取消</button>
                            <button type="button" class="btn btn-primary" id="rename-ok-btn">确定</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const baseInput = overlay.querySelector('#rename-base-input');
            const suffixToggle = overlay.querySelector('#rename-suffix-toggle');
            const suffixRow = overlay.querySelector('#rename-suffix-row');
            const suffixInput = overlay.querySelector('#rename-suffix-input');
            const errorEl = overlay.querySelector('#rename-error');

            const showError = (msg) => {
                if (!errorEl) return;
                errorEl.textContent = msg;
                errorEl.style.display = msg ? 'block' : 'none';
            };

            const cleanup = () => {
                overlay.remove();
                document.removeEventListener('keydown', handleEsc);
            };

            const finish = (value) => {
                cleanup();
                resolve(value);
            };

            const handleOk = () => {
                const base = String(baseInput?.value || '').trim();
                const editSuffix = !!suffixToggle?.checked;
                const suffix = String(suffixInput?.value || '').trim();

                if (!base) {
                    showError('文件名不能为空');
                    baseInput?.focus?.();
                    return;
                }

                const finalSuffix = editSuffix ? (suffix ? `.${suffix}` : '') : (hasSuffix ? `.${suffixRaw}` : '');
                finish(base + finalSuffix);
            };

            const handleEsc = (e) => {
                if (e.key === 'Escape') finish(null);
                if (e.key === 'Enter') handleOk();
            };

            overlay.querySelector('#rename-cancel-btn')?.addEventListener('click', () => finish(null));
            overlay.querySelector('#rename-close-btn')?.addEventListener('click', () => finish(null));
            overlay.querySelector('#rename-ok-btn')?.addEventListener('click', handleOk);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) finish(null);
            });

            suffixToggle?.addEventListener('change', () => {
                const on = !!suffixToggle.checked;
                if (suffixRow) suffixRow.style.display = on ? 'block' : 'none';
                showError('');
                if (on) suffixInput?.focus?.();
            });

            document.addEventListener('keydown', handleEsc);
            baseInput?.focus?.();
            baseInput?.select?.();
        });
    },

    promptAddGateway: (options = {}) => {
        return new Promise((resolve) => {
            const title = options.title || '添加自定义网关';
            const defaultRegion = options.defaultRegion || 'AUTO';

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-box glass-effect" style="width: 520px; max-width: 94%;">
                    <div style="padding: 20px;">
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                            <h3 style="margin:0;">${title}</h3>
                            <button type="button" class="btn-icon" id="add-gw-close-btn" aria-label="关闭">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div class="form-group" style="margin-top: 14px;">
                            <label><i class="fa-solid fa-font"></i> 名称</label>
                            <div class="input-wrapper">
                                <input type="text" id="add-gw-name" placeholder="例如：我的网关" autocomplete="off">
                            </div>
                        </div>

                        <div class="form-group" style="margin-top: 12px;">
                            <label><i class="fa-solid fa-link"></i> 网关地址</label>
                            <div class="input-wrapper">
                                <input type="text" id="add-gw-url" placeholder="例如：https://example.com/ipfs/" autocomplete="off">
                            </div>
                        </div>

                        <div class="form-group" style="margin-top: 12px;">
                            <label><i class="fa-solid fa-globe"></i> 区域</label>
                            <div class="input-wrapper">
                                <select id="add-gw-region" class="input-select" title="用于优选排序">
                                    <option value="AUTO" ${defaultRegion === 'AUTO' ? 'selected' : ''}>自动</option>
                                    <option value="CN" ${defaultRegion === 'CN' ? 'selected' : ''}>国内</option>
                                    <option value="INTL" ${defaultRegion === 'INTL' ? 'selected' : ''}>海外/代理</option>
                                </select>
                            </div>
                        </div>

                        <div id="add-gw-error" style="margin-top: 12px; color: #dc2626; font-size: 0.9rem; display:none;"></div>

                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 18px;">
                            <button type="button" class="btn btn-secondary" id="add-gw-cancel-btn">取消</button>
                            <button type="button" class="btn btn-primary" id="add-gw-ok-btn">添加</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const nameInput = overlay.querySelector('#add-gw-name');
            const urlInput = overlay.querySelector('#add-gw-url');
            const regionSelect = overlay.querySelector('#add-gw-region');
            const errorEl = overlay.querySelector('#add-gw-error');

            const showError = (msg) => {
                if (!errorEl) return;
                errorEl.textContent = msg;
                errorEl.style.display = msg ? 'block' : 'none';
            };

            const cleanup = () => {
                overlay.remove();
                document.removeEventListener('keydown', handleEsc);
            };

            const finish = (value) => {
                cleanup();
                resolve(value);
            };

            const handleOk = () => {
                const name = String(nameInput?.value || '').trim();
                const url = String(urlInput?.value || '').trim();
                const region = String(regionSelect?.value || 'AUTO').toUpperCase();

                if (!name) {
                    showError('名称不能为空');
                    nameInput?.focus?.();
                    return;
                }
                if (!url) {
                    showError('网关地址不能为空');
                    urlInput?.focus?.();
                    return;
                }
                finish({ name, url, region: (region === 'CN' || region === 'INTL') ? region : 'AUTO' });
            };

            const handleEsc = (e) => {
                if (e.key === 'Escape') finish(null);
                if (e.key === 'Enter') handleOk();
            };

            overlay.querySelector('#add-gw-cancel-btn')?.addEventListener('click', () => finish(null));
            overlay.querySelector('#add-gw-close-btn')?.addEventListener('click', () => finish(null));
            overlay.querySelector('#add-gw-ok-btn')?.addEventListener('click', handleOk);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) finish(null);
            });

            document.addEventListener('keydown', handleEsc);
            nameInput?.focus?.();
        });
    },

    formatDisplayDate: (raw) => {
        const full = String(raw || '').trim();
        if (!full) return { full: '', medium: '', short: '' };

        const m = full.match(/^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+(\d{1,2}:\d{2})(?::(\d{2}))?/);
        if (m) {
            const datePart = m[1];
            const hm = m[2];
            const sec = m[3];
            const normalizedFull = sec ? `${datePart} ${hm}:${sec}` : `${datePart} ${hm}`;
            return {
                full: normalizedFull,
                medium: `${datePart} ${hm}`,
                short: hm
            };
        }

        const parts = full.split(/\s+/);
        if (parts.length >= 2) {
            const datePart = parts[0];
            const timePart = parts[1];
            const hm = (timePart.match(/^(\d{1,2}:\d{2})/) || [])[1] || timePart;
            return { full, medium: `${datePart} ${hm}`, short: hm };
        }

        return { full, medium: full, short: full };
    },

    /**
     * 添加撤销操作
     */
    addUndo: (action) => {
        // 确保action包含必要的属性
        const undoAction = {
            id: Date.now(),
            timestamp: Date.now(),
            action: action.action,
            description: action.description,
            data: action.data,
            undoFunction: action.undoFunction
        };

        // 添加到撤销栈
        UI.undoStack.unshift(undoAction);

        // 限制撤销栈大小
        if (UI.undoStack.length > UI.maxUndoItems) {
            UI.undoStack.pop();
        }

        // 显示撤销提示
        UI.showUndoNotification(action.description);

        // 清除之前的定时器
        if (UI.currentUndoTimer) {
            clearTimeout(UI.currentUndoTimer);
        }

        // 设置新的定时器
        UI.currentUndoTimer = setTimeout(() => {
            UI.clearUndo();
        }, UI.undoTimeout);
    },

    /**
     * 显示撤销通知
     */
    showUndoNotification: (description) => {
        const container = document.getElementById('toast-container') || createToastContainer();
        const div = document.createElement('div');
        div.className = 'toast undo';
        const span = document.createElement('span');
        span.textContent = description;
        const undoBtn = document.createElement('button');
        undoBtn.type = 'button';
        undoBtn.id = 'undo-btn';
        undoBtn.textContent = '撤销';
        undoBtn.style.marginLeft = '10px';
        undoBtn.style.padding = '5px 10px';
        undoBtn.style.background = 'rgba(255,255,255,0.3)';
        undoBtn.style.border = 'none';
        undoBtn.style.borderRadius = '4px';
        undoBtn.style.cursor = 'pointer';
        undoBtn.style.fontSize = '0.9em';
        div.appendChild(span);
        div.appendChild(undoBtn);
        container.appendChild(div);

        // 撤销按钮事件
        undoBtn.addEventListener('click', () => {
            UI.undo();
            div.remove();
        });

        // 自动移除
        setTimeout(() => {
            if (div.parentNode) {
                div.remove();
            }
        }, UI.undoTimeout);
    },

    /**
     * 执行撤销操作
     */
    undo: () => {
        if (UI.undoStack.length === 0) {
            UI.toast('没有可撤销的操作', 'info');
            return;
        }

        const action = UI.undoStack.shift();

        if (action.undoFunction) {
            try {
                action.undoFunction(action.data);
                UI.toast(`已撤销：${action.description}`, 'success');
            } catch (error) {
                console.error('撤销操作失败:', error);
                UI.toast('撤销操作失败', 'error');
            }
        }

        // 清除定时器
        if (UI.currentUndoTimer) {
            clearTimeout(UI.currentUndoTimer);
            UI.currentUndoTimer = null;
        }

        // 隐藏撤销提示
        const undoToast = document.querySelector('.toast.undo');
        if (undoToast) {
            undoToast.remove();
        }
    },

    /**
     * 清除撤销栈
     */
    clearUndo: () => {
        UI.undoStack = [];
        if (UI.currentUndoTimer) {
            clearTimeout(UI.currentUndoTimer);
            UI.currentUndoTimer = null;
        }
    },

    renderFileList: (items, deleteCallback, downloadCallback, renameCallback, propagateCallback) => {
        const tbody = document.getElementById('fileTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if(!items || items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#999;">暂无文件</td></tr>';
            return;
        }

        items.forEach((item, index) => {
            const data = typeof item === 'string' ? JSON.parse(item) : item;
            const globalIndex = App?.allFiles?.findIndex?.(f => f?.id === data?.id) ?? -1;
            const sizeMB = (data.size / (1024*1024)).toFixed(2);
            const verify = App?.getFileVerifyLabel ? App.getFileVerifyLabel(data) : { text: '未知', className: 'verify-unknown', title: '' };
            const isVerifying = (data?.verify_status || '').toLowerCase() === 'verifying';
            const dateDisplay = UI.formatDisplayDate(data.date);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="width:30px;">
                    <input type="checkbox" class="file-checkbox" data-file-index="${globalIndex >= 0 ? globalIndex : index}">
                </td>
                <td class="td-name" title="${data.name}">
                    <div class="file-name-wrap">
                        <span class="file-name-text">${data.name}</span>
                        <span class="verify-badge ${verify.className}" title="${verify.title || ''}">${verify.text}</span>
                    </div>
                </td>
                <td>${sizeMB} MB</td>
                <td class="td-date" title="${dateDisplay.full}">
                    <span class="date-full">${dateDisplay.full}</span>
                    <span class="date-medium">${dateDisplay.medium}</span>
                    <span class="date-short">${dateDisplay.short}</span>
                </td>
                <td class="td-actions">
                    <div class="file-actions">
                        <button class="btn-icon verify-btn" title="重试校验" ${isVerifying ? 'disabled' : ''}>
                            <i class="fa-solid fa-shield-halved"></i>
                        </button>
                        <button class="btn-icon move-btn" title="移动到文件夹">
                            <i class="fa-solid fa-arrow-right-arrow-left"></i>
                        </button>
                        <button class="btn-icon rename-btn" title="重命名">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon propagate-btn" title="重新传播到公共网关">
                            <i class="fa-solid fa-share-nodes"></i>
                        </button>
                        <button class="btn-icon download-btn" title="下载">
                            <i class="fa-solid fa-cloud-arrow-down"></i>
                        </button>
                        <button class="btn-icon delete-btn" title="删除">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            const nameTd = tr.querySelector('.td-name');
            if (nameTd) {
                nameTd.onclick = (e) => {
                    if (e.target?.closest?.('button,a,input,label')) return;
                    nameTd.classList.toggle('expanded');
                };
            }
            tr.querySelector('.download-btn').onclick = () => downloadCallback?.(data);
            tr.querySelector('.delete-btn').onclick = () => deleteCallback?.(data, globalIndex >= 0 ? globalIndex : index);
            if (renameCallback) {
                tr.querySelector('.rename-btn').onclick = () => renameCallback(data, globalIndex >= 0 ? globalIndex : index);
            }
            if (propagateCallback) {
                tr.querySelector('.propagate-btn').onclick = () => propagateCallback(data);
            }
            tr.querySelector('.verify-btn').onclick = () => App?.retryVerifyFile?.(data);
            // 移动文件按钮事件
            tr.querySelector('.move-btn').onclick = () => {
                App.moveFile(data, globalIndex >= 0 ? globalIndex : index);
            };
            // 复选框事件
            tr.querySelector('.file-checkbox').onchange = () => {
                App.updateSelectedFiles();
            };
            tbody.appendChild(tr);
        });
    },

    renderFileGrid: (items, deleteCallback, downloadCallback, renameCallback, propagateCallback) => {
        const grid = document.getElementById('fileGrid');
        if (!grid) return;
        grid.innerHTML = '';

        if (!items || items.length === 0) {
            grid.innerHTML = '<div style="padding:24px; text-align:center; color:#64748b;">暂无文件</div>';
            return;
        }

        items.forEach((item, index) => {
            const data = typeof item === 'string' ? JSON.parse(item) : item;
            const globalIndex = App?.allFiles?.findIndex?.(f => f?.id === data?.id) ?? -1;
            const fileIndex = globalIndex >= 0 ? globalIndex : index;
            const sizeMB = (data.size / (1024 * 1024)).toFixed(2);
            const verify = App?.getFileVerifyLabel ? App.getFileVerifyLabel(data) : { text: '未知', className: 'verify-unknown', title: '' };
            const isVerifying = (data?.verify_status || '').toLowerCase() === 'verifying';
            const dateDisplay = UI.formatDisplayDate(data.date);

            const card = document.createElement('div');
            card.className = 'file-card';
            card.innerHTML = `
                <input type="checkbox" class="file-checkbox file-card-check" data-file-index="${fileIndex}">
                <div class="file-card-top">
                    <div class="file-card-icon">
                        <i class="fa-solid fa-file" aria-hidden="true"></i>
                    </div>
                    <div class="file-card-main">
                        <div class="file-name-wrap">
                            <span class="file-card-name" title="${data.name}">${data.name}</span>
                            <span class="verify-badge ${verify.className}" title="${verify.title || ''}">${verify.text}</span>
                        </div>
                        <div class="file-card-meta">
                            <span>${sizeMB} MB</span>
                            <span class="file-card-date" title="${dateDisplay.full}">
                                <span class="date-full">${dateDisplay.full}</span>
                                <span class="date-medium">${dateDisplay.medium}</span>
                                <span class="date-short">${dateDisplay.short}</span>
                            </span>
                        </div>
                    </div>
                </div>
                <div class="file-card-actions">
                    <button class="btn-icon download-btn" title="下载">
                        <i class="fa-solid fa-cloud-arrow-down"></i>
                    </button>
                    <button class="btn-icon more-btn" title="更多操作" aria-haspopup="menu" aria-expanded="false">
                        <i class="fa-solid fa-ellipsis"></i>
                    </button>
                </div>
            `;

            card.querySelector('.download-btn').onclick = () => downloadCallback?.(data);
            const moreBtn = card.querySelector('.more-btn');
            moreBtn.onclick = (e) => {
                e.stopPropagation();
                UI.showFileContextMenu({
                    anchorEl: moreBtn,
                    file: data,
                    fileIndex,
                    isVerifying,
                    callbacks: {
                        deleteCallback,
                        downloadCallback,
                        renameCallback,
                        propagateCallback
                    }
                });
            };
            card.querySelector('.file-checkbox').onchange = () => {
                App.updateSelectedFiles();
            };

            grid.appendChild(card);
        });
    },

    ensureFileContextMenu: () => {
        if (UI.fileContextMenuEl) return;

        const el = document.createElement('div');
        el.className = 'file-context-menu';
        el.setAttribute('role', 'menu');
        el.innerHTML = `
            <button type="button" class="file-context-menu-item" data-action="download" role="menuitem">
                <i class="fa-solid fa-cloud-arrow-down"></i>
                下载
            </button>
            <button type="button" class="file-context-menu-item" data-action="rename" role="menuitem">
                <i class="fa-solid fa-pen"></i>
                重命名
            </button>
            <button type="button" class="file-context-menu-item" data-action="move" role="menuitem">
                <i class="fa-solid fa-arrow-right-arrow-left"></i>
                移动
            </button>
            <button type="button" class="file-context-menu-item" data-action="propagate" role="menuitem">
                <i class="fa-solid fa-share-nodes"></i>
                传播
            </button>
            <button type="button" class="file-context-menu-item" data-action="verify" role="menuitem">
                <i class="fa-solid fa-shield-halved"></i>
                重试校验
            </button>
            <button type="button" class="file-context-menu-item delete" data-action="delete" role="menuitem">
                <i class="fa-solid fa-trash"></i>
                删除
            </button>
        `;

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const actionEl = e.target.closest('[data-action]');
            const action = actionEl?.dataset?.action;
            const data = UI.fileContextData;
            UI.hideFileContextMenu();
            if (!action || !data?.file) return;

            const { file, fileIndex, callbacks } = data;
            if (action === 'download') callbacks?.downloadCallback?.(file);
            if (action === 'rename') callbacks?.renameCallback?.(file, fileIndex);
            if (action === 'move') App?.moveFile?.(file, fileIndex);
            if (action === 'propagate') callbacks?.propagateCallback?.(file);
            if (action === 'verify') App?.retryVerifyFile?.(file);
            if (action === 'delete') callbacks?.deleteCallback?.(file, fileIndex);
        });

        document.addEventListener('click', () => UI.hideFileContextMenu());
        window.addEventListener('scroll', () => UI.hideFileContextMenu(), true);
        window.addEventListener('resize', () => UI.hideFileContextMenu());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') UI.hideFileContextMenu();
        });

        document.body.appendChild(el);
        UI.fileContextMenuEl = el;
    },

    showFileContextMenu: ({ anchorEl, file, fileIndex, isVerifying, callbacks }) => {
        UI.ensureFileContextMenu();
        const el = UI.fileContextMenuEl;
        if (!el || !anchorEl) return;

        if (UI.fileContextTriggerEl) {
            UI.fileContextTriggerEl.setAttribute('aria-expanded', 'false');
        }
        UI.fileContextTriggerEl = anchorEl;
        anchorEl.setAttribute('aria-expanded', 'true');

        UI.fileContextData = { file, fileIndex, callbacks };
        const verifyItem = el.querySelector('[data-action="verify"]');
        if (verifyItem) verifyItem.disabled = !!isVerifying;

        el.style.left = '-9999px';
        el.style.top = '-9999px';
        el.classList.add('show');

        const rect = anchorEl.getBoundingClientRect();
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const menuRect = el.getBoundingClientRect();

        let left = rect.left;
        let top = rect.bottom + 8;

        if (left + menuRect.width > viewportW - 8) left = Math.max(8, viewportW - menuRect.width - 8);
        if (top + menuRect.height > viewportH - 8) top = Math.max(8, rect.top - menuRect.height - 8);

        el.style.left = `${Math.round(left)}px`;
        el.style.top = `${Math.round(top)}px`;
    },

    hideFileContextMenu: () => {
        const el = UI.fileContextMenuEl;
        if (!el) return;
        el.classList.remove('show');
        el.style.left = '-9999px';
        el.style.top = '-9999px';
        if (UI.fileContextTriggerEl) {
            UI.fileContextTriggerEl.setAttribute('aria-expanded', 'false');
        }
        UI.fileContextTriggerEl = null;
        UI.fileContextData = null;
    },

    showGatewayModal: async (cid, filename) => {
        const oldModal = document.getElementById('gw-modal-overlay');
        if(oldModal) oldModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'gw-modal-overlay';
        overlay.className = 'modal-overlay';

        const hideUnavailablePref = localStorage.getItem('cc_hide_unavailable') === 'true';
        const networkProfile = getNetworkProfile();

        overlay.innerHTML = `
            <div class="modal-box glass-effect">
                <div class="modal-header">
                    <div class="modal-title">
                        <div class="modal-title-icon">🚀</div>
                        <h3>选择下载通道</h3>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <label class="hide-unavailable-label">
                            <select id="network-profile-select" class="input-select" title="网络环境偏好（影响网关评分与推荐）">
                                <option value="AUTO" ${networkProfile === 'AUTO' ? 'selected' : ''}>自动</option>
                                <option value="CN" ${networkProfile === 'CN' ? 'selected' : ''}>国内</option>
                                <option value="INTL" ${networkProfile === 'INTL' ? 'selected' : ''}>海外/代理</option>
                            </select>
                        </label>
                        <label class="hide-unavailable-label">
                            <input type="checkbox" id="hide-unavailable-check" ${hideUnavailablePref ? 'checked' : ''}>
                            隐藏不可用
                        </label>
                        <button id="cleanup-btn" class="btn-text-action btn-cleanup" title="清理长期不可用网关">
                            <i class="fa-solid fa-broom"></i> 清理
                        </button>
                        <button id="add-gw-btn" class="btn-text-action btn-add" title="添加自定义网关">
                            <i class="fa-solid fa-plus"></i> 添加
                        </button>
                        <button id="fetch-more-btn" class="btn-text-action btn-detect" title="探测更多节点">
                            <i class="fa-solid fa-globe"></i> 探测
                        </button>
                        <button id="reset-btn" class="btn-text-action btn-reset" title="重置为默认列表">
                            <i class="fa-solid fa-rotate-left"></i> 重置
                        </button>
                        <button id="close-modal-btn" class="btn-close-modal" title="关闭">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
                <div id="gw-status-bar" class="gw-status-bar"></div>
                <div id="gw-list" class="gw-list"></div>
            </div>
        `;

        document.body.appendChild(overlay);

        const gwList = document.getElementById('gw-list');
        const gwStatusBar = document.getElementById('gw-status-bar');
        const fetchBtn = document.getElementById('fetch-more-btn');
        const cleanupBtn = document.getElementById('cleanup-btn');  // 新增
        const addGwBtn = document.getElementById('add-gw-btn');
        const resetBtn = document.getElementById('reset-btn');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const hideUnavailableCheck = document.getElementById('hide-unavailable-check');
        const networkProfileSelect = document.getElementById('network-profile-select');

        let sortedGateways;

        const normalizeGatewayUrl = (raw) => {
            let u = String(raw || '').trim();
            if (!u) return '';
            if (!/^https?:\/\//i.test(u)) return '';
            u = u.replace(/\s+/g, '');
            if (!u.endsWith('/')) u += '/';
            const lower = u.toLowerCase();
            if (!lower.includes('/ipfs/')) {
                if (lower.endsWith('/ipfs')) u += '/';
                else u += 'ipfs/';
            }
            return u;
        };

        const renderGatewayList = (results, cid, filename) => {
            gwList.innerHTML = '';
            gwStatusBar.innerHTML = '';

            if (!results || results.length === 0) {
                gwList.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">暂无可用网关</div>';
                return;
            }

            const total = results.length;
            const available = results.filter(r => r.isAvailable).length;
            const avgLatency = results
                .filter(r => r.isAvailable && r.latency >= 0)
                .reduce((sum, r) => sum + r.latency, 0) / Math.max(1, results.filter(r => r.isAvailable && r.latency >= 0).length);

            const isFromCache = results[0].fromCache;
            const cacheInfo = isFromCache ?
                `<span style="color:#2ed573; font-size:0.85rem; font-weight:bold; margin-left:10px; padding:4px 10px; background:rgba(46, 213, 115, 0.1); border-radius:4px;">
                    <i class="fa-solid fa-bolt"></i> 使用缓存 (${results[0].cacheAge}秒前)
                </span>` :
                `<span style="color:#ff6b6b; font-size:0.85rem; margin-left:10px; padding:4px 10px; background:rgba(255, 107, 107, 0.1); border-radius:4px;">
                    <i class="fa-solid fa-gauge-high"></i> 实时测试
                </span>`;

            gwStatusBar.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <span>总计: ${total} | 可用: ${available} | 平均延迟: ${Math.round(avgLatency)}ms</span>
                    ${cacheInfo}
                </div>
            `;

            const displayGateways = hideUnavailableCheck.checked ?
                results.filter(gw => gw.isAvailable) : results;

            const cnCount = displayGateways.filter(gw => gw.region === 'CN' && gw.isAvailable).length;
            if (cnCount > 0) {
                const countDiv = document.createElement('div');
                countDiv.style.padding = '8px 16px';
                countDiv.style.background = 'rgba(99, 102, 241, 0.05)';
                countDiv.style.borderBottom = '1px solid #e2e8f0';
                countDiv.style.fontSize = '0.85rem';
                countDiv.style.color = '#4a5568';
                countDiv.innerHTML = `🇨🇳 国内友好节点: ${cnCount}`;
                gwList.appendChild(countDiv);
            }

            displayGateways.forEach(gw => {
                const isError = !gw.isAvailable;
                let statusColor, statusText, errorDetail = '';

                if (isError) {
                    statusColor = '#ff4757';
                    statusText = '不可用';

                    if (gw.errorType === 'timeout') {
                        errorDetail = '超时';
                    } else if (gw.errorType === 'network') {
                        errorDetail = '网络错误';
                    } else if (gw.errorType === 'server') {
                        errorDetail = gw.statusCode || '错误';
                    }
                } else if (gw.latency < 500) {
                    statusColor = '#2ed573';
                    statusText = '极速';
                } else if (gw.latency < 1000) {
                    statusColor = '#2ed573';
                    statusText = '快速';
                } else if (gw.latency < 2000) {
                    statusColor = '#ffa502';
                    statusText = '良好';
                } else if (gw.latency < 5000) {
                    statusColor = '#ffa502';
                    statusText = '较慢';
                } else {
                    statusColor = '#a4b0be';
                    statusText = '慢';
                }

                if (!isError) statusText += ` ${gw.latency}ms`;
                if (errorDetail) statusText += ` (${errorDetail})`;

                const linkHref = isError ? 'javascript:void(0)' : `${gw.url}${cid}?filename=${encodeURIComponent(filename)}`;
                const regionTag = gw.region === 'CN' ? '<span style="background:#e53e3e; color:#fff; font-size:0.65rem; padding:1px 4px; border-radius:3px; margin-left:5px;">CN</span>' : '';
                const priorityStar = (gw.priority || 999) <= 5 ? '<span style="color:#ffd700; margin-left:3px;">★</span>' : '';

                const div = document.createElement('a');
                div.className = 'gateway-link';
                div.href = linkHref;
                div.target = isError ? '' : '_blank';
                div.style.opacity = isError ? '0.5' : '1';
                div.style.cursor = isError ? 'not-allowed' : 'pointer';

                div.innerHTML = `
                    <span class="gw-icon">${gw.icon || '🌐'}</span>
                    <span class="gw-name">${gw.name}${regionTag}${priorityStar}</span>
                    <span style="font-size:0.75rem; color:${statusColor}; font-weight:bold; margin-right:10px; background:rgba(0,0,0,0.05); padding:2px 6px; border-radius:4px;">${statusText}</span>
                    <span class="gw-arrow">➜</span>
                `;

                // 点击网关链接后自动关闭模态框
                div.addEventListener('click', (e) => {
                    if (!isError) {
                        // 立即关闭模态框，不等待链接打开
                        const currentOverlay = document.getElementById('gw-modal-overlay');
                        if (currentOverlay) {
                            currentOverlay.remove();
                        }
                    }
                });

                gwList.appendChild(div);
            });
        };

        hideUnavailableCheck.onchange = () => {
            localStorage.setItem('cc_hide_unavailable', hideUnavailableCheck.checked);
            renderGatewayList(sortedGateways, cid, filename);
        };

        networkProfileSelect.onchange = async () => {
            setNetworkProfile(networkProfileSelect.value);
            clearCheckResultCache();
            const newResults = await testAllGateways(UI.currentGateways, CONFIG.TEST_CID, true);
            if (document.getElementById('gw-modal-overlay')) {
                sortedGateways = newResults;
                await renderGatewayList(sortedGateways, cid, filename);
            }
        };

        closeModalBtn.onclick = () => overlay.remove();
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };

        addGwBtn.onclick = async () => {
            try {
                const data = await UI.promptAddGateway({ defaultRegion: getNetworkProfile() });
                if (!data) return;

                const url = normalizeGatewayUrl(data.url);
                if (!url) {
                    UI.toast("网关地址无效（需 http/https）", "error");
                    return;
                }

                const exists = UI.currentGateways.some(g => String(g?.url || '') === url);
                if (exists) {
                    UI.toast("该网关已存在", "info");
                    return;
                }

                UI.currentGateways = [
                    ...UI.currentGateways,
                    {
                        name: data.name,
                        url,
                        icon: '🌐',
                        priority: 50,
                        region: data.region === 'CN' ? 'CN' : 'INTL'
                    }
                ];
                saveGateways(UI.currentGateways);
                clearCheckResultCache();
                UI.toast("已添加自定义网关", "success");

                const newResults = await testAllGateways(UI.currentGateways, CONFIG.TEST_CID, true);
                if (document.getElementById('gw-modal-overlay')) {
                    sortedGateways = newResults;
                    await renderGatewayList(sortedGateways, cid, filename);
                }
            } catch (e) {
                console.error("添加网关失败:", e);
                UI.toast("添加网关失败: " + e.message, "error");
            }
        };

        fetchBtn.onclick = async () => {
            fetchBtn.disabled = true;
            fetchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

            try {
                const newGateways = await fetchPublicGateways();
                const newResults = await testAllGateways(UI.currentGateways, false);

                if (document.getElementById('gw-modal-overlay')) {
                    sortedGateways = newResults;
                    await renderGatewayList(sortedGateways, cid, filename);
                }
            } catch (e) {
                console.error("探测失败:", e);
                UI.toast("探测失败: " + e.message, "error");
            } finally {
                fetchBtn.disabled = false;
                fetchBtn.innerHTML = '<i class="fa-solid fa-globe"></i> 探测';
            }
        };

        resetBtn.onclick = async () => {
            if(confirm('确定要清空探测到的节点，恢复默认列表吗？')) {
                localStorage.removeItem(STORAGE_KEY);
                clearCheckResultCache();
                UI.currentGateways = [...CONFIG.DEFAULT_GATEWAYS];
                UI.toast("已恢复默认网关列表");
                const newResults = await testAllGateways(UI.currentGateways, false);
                if (document.getElementById('gw-modal-overlay')) {
                    sortedGateways = newResults;
                    await renderGatewayList(sortedGateways, cid, filename);
                }
            }
        };

        // 清理长期不可用网关
        cleanupBtn.onclick = async () => {
            const healthData = loadGatewayHealth();
            const cleanupList = identifyCleanupGateways(UI.currentGateways, healthData);

            if (cleanupList.length === 0) {
                UI.toast("✅ 没有需要清理的网关", "success");
                return;
            }

            const cleanupReasons = cleanupList.map(gw =>
                `- ${gw.name}: ${gw.cleanupReason}`
            ).join('\n');

            if (confirm(`发现 ${cleanupList.length} 个长期不可用的网关：\n\n${cleanupReasons}\n\n确定要清理这些网关吗？`)) {
                const result = performGatewayCleanup(UI.currentGateways, healthData);

                if (result.cleaned > 0) {
                    UI.currentGateways = result.gateways;
                    saveGateways(UI.currentGateways);
                    UI.toast(`✅ ${result.message}`, "success");

                    // 清除缓存并重新测试
                    clearCheckResultCache();
                    const newResults = await testAllGateways(UI.currentGateways, true);
                    if (document.getElementById('gw-modal-overlay')) {
                        sortedGateways = newResults;
                        await renderGatewayList(sortedGateways, cid, filename);
                    }
                }
            }
        };

        // 优先使用缓存，避免短时间内重复检测
        const cacheData = await loadCheckResultCache();

        console.log('=== 网关测试缓存检查 ===');
        console.log('缓存数据:', cacheData);
        console.log('缓存结果数量:', cacheData.results?.length);
        console.log('缓存是否过期:', cacheData.isExpired);

        if (cacheData.results && !cacheData.isExpired) {
            sortedGateways = cacheData.results.map((r, idx) => ({
                ...r,
                cacheAge: cacheData.ageSeconds,
                fromCache: true
            }));
            console.log(`✓ 使用缓存检测结果，跳过网关测试`);
            await renderGatewayList(sortedGateways, cid, filename);
        } else {
            console.log('缓存未命中或已过期，开始网关测试...');

            // 显示加载提示
            if (gwList) {
                gwList.innerHTML = '<div style="padding:30px; text-align:center; color:#64748B;"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem; margin-bottom:10px; display:block;"></i>正在测速网关...</div>';
            }

            sortedGateways = await testAllGateways(UI.currentGateways);

            // 检查模态框是否仍然存在，如果不存在说明用户已经关闭了
            if (document.getElementById('gw-modal-overlay')) {
                await renderGatewayList(sortedGateways, cid, filename);
            }
        }
    }
};

// 从公共源获取网关列表（增强版错误处理）
async function fetchPublicGateways() {
    console.log('🔍 开始探测公共网关...');
    const sources = CONFIG.PUBLIC_GATEWAY_SOURCES;
    const gateways = [];
    const seenUrls = new Set();

    CONFIG.DEFAULT_GATEWAYS.forEach(gw => seenUrls.add(gw.url));

    const promises = sources.map(async (source, index) => {
        try {
            console.log(`  尝试源 ${index + 1}/${sources.length}: ${source}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 增加超时到15秒

            const res = await fetch(source, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                console.warn(`  源 ${index} 返回 HTTP ${res.status}`);
                return [];
            }

            const data = await res.json();
            let urlList = [];

            if (Array.isArray(data)) {
                urlList = data;
            } else if (data.gateways && Array.isArray(data.gateways)) {
                urlList = data.gateways;
            } else if (data.info && Array.isArray(data.info)) {
                urlList = data.info.map(info => ({
                    url: info.ipfsGateway,
                    name: info.name
                }));
            } else if (typeof data === 'object') {
                Object.keys(data).forEach(key => {
                    if (Array.isArray(data[key])) {
                        urlList.push(...data[key]);
                    }
                });
            }

            console.log(`  ✓ 源 ${index} 成功获取 ${urlList.length} 个网关`);
            return urlList;

        } catch (e) {
            console.warn(`  ✗ 源 ${index} 失败: ${e.message}`);
            return [];
        }
    });

    const results = await Promise.allSettled(promises);
    let successCount = 0;

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
            const urlList = result.value;

            urlList.forEach(gw => {
                let url, name;

                if (typeof gw === 'string') {
                    url = gw;
                    name = gw.replace(/^https?:\/\/([^\/]+).*/, '$1');
                } else if (gw && typeof gw === 'object') {
                    url = gw.url || gw.link || gw.gateway;
                    name = gw.name || gw.title || gw.service || url.replace(/^https?:\/\/([^\/]+).*/, '$1');
                }

                if (url && typeof url === 'string' && url.startsWith('http')) {
                    // 规范化 URL
                    if (!url.endsWith('/ipfs/') && !url.endsWith('/')) {
                        url = url.replace(/\/$/, '') + '/ipfs/';
                    } else if (!url.endsWith('/ipfs/')) {
                        url = url + 'ipfs/';
                    }

                    if (!seenUrls.has(url)) {
                        gateways.push({
                            name: name ? name.substring(0, 40) : url.replace(/^https?:\/\/([^\/]+).*/, '$1'),
                            url: url,
                            icon: '🌐',
                            priority: 50,
                            region: 'DISCOVERED'
                        });
                        seenUrls.add(url);
                    }
                }
            });

            if (result.value.length > 0) {
                successCount++;
                console.log(`  ✓ 源 ${index}: 解析 ${result.value.length} 个网关`);
            }
        }
    });

    console.log(`📊 探测完成: ${successCount}/${sources.length} 个源成功，共发现 ${gateways.length} 个新网关`);

    if (gateways.length > 0) {
        const merged = [...UI.currentGateways, ...gateways];
        UI.currentGateways = merged;
        saveGateways(merged);
        UI.toast(`✅ 发现 ${gateways.length} 个新网关，当前总计 ${merged.length} 个`, "success");
    } else {
        UI.toast("⚠️ 未发现新网关节点，所有源可能不可用", "warning");
    }

    return gateways;
}

// 测试所有网关速度（支持缓存）
async function testAllGateways(gateways, testCid = CONFIG.TEST_CID, forceRefresh = false) {
    if (!gateways || gateways.length === 0) return [];

    // 如果允许使用缓存且缓存未过期，直接返回缓存结果
    if (!forceRefresh) {
        const cacheData = await loadCheckResultCache();
        if (cacheData.results && !cacheData.isExpired) {
            console.log(`✓ 使用缓存检测结果，耗时: 0ms`);
            return cacheData.results.map((r, idx) => ({
                ...r,
                cacheAge: cacheData.ageSeconds,
                fromCache: true
            }));
        }
    }

    const healthData = loadGatewayHealth();
    const sortedGateways = sortGatewaysByPriority([...gateways], healthData);

    const results = [];
    const TIMEOUT = CONFIG.GATEWAY_TEST.TIMEOUT;
    const RETRY_TIMES = CONFIG.GATEWAY_TEST.RETRY_TIMES;
    const RETRY_DELAY = CONFIG.GATEWAY_TEST.RETRY_DELAY;

    const concurrentLimit = CONFIG.GATEWAY_TEST.CONCURRENT_LIMIT;
    const chunks = [];

    for (let i = 0; i < sortedGateways.length; i += concurrentLimit) {
        chunks.push(sortedGateways.slice(i, i + concurrentLimit));
    }

    const newHealthData = { ...healthData };

        const testSingleGateway = async (gw, retryCount = 0) => {
        const startTime = performance.now();
        let score = 0;
        let latency = -1;
        let isAvailable = false;
        let statusCode = 0;
        let errorType = 'none';
        const networkProfile = getNetworkProfile();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

            const res = await fetch(`${gw.url}${testCid}`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Range': 'bytes=0-1023',
                    'User-Agent': 'Mozilla/5.0 (CloudChan Gateway Checker)'
                }
            });
            clearTimeout(timeoutId);

            statusCode = res.status;

            if (res.ok || res.status === 206) {
                latency = Math.round(performance.now() - startTime);
                isAvailable = true;

                if (latency < 500) {
                    score = 100;
                } else if (latency < 1000) {
                    score = 85;
                } else if (latency < 2000) {
                    score = 70;
                } else if (latency < 5000) {
                    score = 50;
                } else if (latency < 10000) {
                    score = 30;
                } else {
                    score = 20;
                }

                if (networkProfile === 'CN') {
                    if (gw.region === 'CN') score = Math.min(100, score + 15);
                } else if (networkProfile === 'INTL') {
                    if (gw.region !== 'CN') score = Math.min(100, score + 10);
                } else {
                    if (gw.region === 'CN') score = Math.min(100, score + 15);
                }
            } else if (res.status === 406) {
                latency = Math.round(performance.now() - startTime);
                isAvailable = true;
                score = 40;
            } else if (res.status === 502 || res.status === 504) {
                if (retryCount < RETRY_TIMES) {
                    console.log(`${gw.name} 返回 ${statusCode}，正在重试...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    return testSingleGateway(gw, retryCount + 1);
                } else {
                    isAvailable = false;
                    errorType = 'server';
                    score = 0;
                    console.warn(`${gw.name} 重试 ${RETRY_TIMES} 次后仍返回 ${statusCode}，标记为不可用`);
                }
            } else {
                latency = -1;
                score = 0;
                isAvailable = false;
                errorType = 'server';
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                errorType = 'timeout';
                console.log(`${gw.name}: 超时`);
            } else {
                errorType = 'network';
                console.log(`${gw.name}: 网络错误 - ${e.message}`);
            }

            if (retryCount < RETRY_TIMES) {
                console.log(`${gw.name} 测试失败，正在重试...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return testSingleGateway(gw, retryCount + 1);
            } else {
                console.warn(`${gw.name} 重试 ${RETRY_TIMES} 次后仍失败`);
            }

            score = 0;
            isAvailable = false;
        }

        // 更新健康状态（用于排序与清理判断）
        updateGatewayHealth(newHealthData, gw.url, {
            success: isAvailable,
            score: score,
            latency: latency
        });

        return {
            name: gw.name,
            url: gw.url,
            icon: gw.icon,
            priority: gw.priority,
            region: gw.region,
            latency: latency,
            isAvailable: isAvailable,
            healthScore: score,
            errorType: errorType,
            statusCode: statusCode,
            fromCache: false
        };
    };

    for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk.map(gw => testSingleGateway(gw)));
        results.push(...chunkResults);
    }

    saveGatewayHealth(newHealthData);

    // 保存检测结果到短期缓存（仅在结果非空时保存）
    if (results && results.length > 0) {
        saveCheckResultCache(results).catch(() => {});
        console.log(`✓ 网关测试完成，已缓存 ${results.length} 个网关结果`);
    } else {
        console.warn('⚠️ 网关测试结果为空，不保存缓存');
    }

    // 自动清理长期不可用网关（如果启用）
    if (CONFIG.GATEWAY_HEALTH.CLEANUP.AUTO_CLEANUP) {
        const cleanupResult = performGatewayCleanup(gateways, newHealthData);
        if (cleanupResult.cleaned > 0) {
            console.log(`✅ ${cleanupResult.message}`);
            UI.toast(`✅ ${cleanupResult.message}`, "success");
        }
    }

    results.sort((a, b) => {
        if (a.isAvailable !== b.isAvailable) {
            return b.isAvailable - a.isAvailable;
        }
        if (a.isAvailable && b.isAvailable && a.latency >= 0 && b.latency >= 0) {
            return a.latency - b.latency;
        }
        return (a.priority || 999) - (b.priority || 999);
    });

    return results;
},

/**
 * 打开添加 CID 模态框
 */
openAddCidModal: () => {
    const modal = document.getElementById('addCidModal');
    const backdrop = document.getElementById('addCidModalBackdrop');

    if (!modal || !backdrop) {
        UI.toast('模态框元素未找到', 'error');
        return;
    }

    // 清空表单
    const cidInput = document.getElementById('cidInput');
    const fileNameInput = document.getElementById('fileNameInput');
    const fileSizeInput = document.getElementById('fileSizeInput');
    const batchCidInput = document.getElementById('batchCidInput');
    const validationStatus = document.getElementById('cidValidationStatus');
    const confirmBtn = document.getElementById('confirmAddCidBtn');
    const batchPreview = document.getElementById('batchPreview');

    if (cidInput) cidInput.value = '';
    if (fileNameInput) fileNameInput.value = '';
    if (fileSizeInput) fileSizeInput.value = '';
    if (batchCidInput) batchCidInput.value = '';
    if (validationStatus) validationStatus.hidden = true;
    if (confirmBtn) confirmBtn.disabled = true;
    if (batchPreview) batchPreview.hidden = true;

    // 显示模态框
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    setTimeout(() => {
        if (cidInput) cidInput.focus();
    }, 100);

    UI.bindAddCidModalEvents();
},

/**
 * 关闭添加 CID 模态框
 */
closeAddCidModal: () => {
    const modal = document.getElementById('addCidModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }
},

/**
 * 绑定添加 CID 模态框的事件监听器
 */
bindAddCidModalEvents: () => {
    const closeBtn = document.getElementById('closeAddCidModal');
    const cancelBtn = document.getElementById('cancelAddCidBtn');
    const backdrop = document.getElementById('addCidModalBackdrop');
    const confirmBtn = document.getElementById('confirmAddCidBtn');
    const pasteBtn = document.getElementById('pasteCidBtn');
    const cidInput = document.getElementById('cidInput');
    const batchCidInput = document.getElementById('batchCidInput');
    const validationStatus = document.getElementById('cidValidationStatus');
    const autoFetchInfo = document.getElementById('autoFetchInfo');
    const modeBtns = document.querySelectorAll('.mode-btn');

    // 克隆节点以避免重复绑定
    const newCloseBtn = closeBtn?.cloneNode(true);
    const newCancelBtn = cancelBtn?.cloneNode(true);
    const newBackdrop = backdrop?.cloneNode(true);
    const newConfirmBtn = confirmBtn?.cloneNode(true);
    const newPasteBtn = pasteBtn?.cloneNode(true);
    const newCidInput = cidInput?.cloneNode(true);
    const newBatchCidInput = batchCidInput?.cloneNode(true);
    const newAutoFetchInfo = autoFetchInfo?.cloneNode(true);

    if (closeBtn) closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    if (cancelBtn) cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    if (backdrop) backdrop.parentNode.replaceChild(newBackdrop, backdrop);
    if (confirmBtn) confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    if (pasteBtn) pasteBtn.parentNode.replaceChild(newPasteBtn, pasteBtn);
    if (cidInput) cidInput.parentNode.replaceChild(newCidInput, cidInput);
    if (batchCidInput) batchCidInput.parentNode.replaceChild(newBatchCidInput, batchCidInput);
    if (autoFetchInfo) autoFetchInfo.parentNode.replaceChild(newAutoFetchInfo, autoFetchInfo);

    // 关闭按钮
    if (newCloseBtn) {
        newCloseBtn.addEventListener('click', UI.closeAddCidModal);
    }

    // 取消按钮
    if (newCancelBtn) {
        newCancelBtn.addEventListener('click', UI.closeAddCidModal);
    }

    // 背景点击关闭
    if (newBackdrop) {
        newBackdrop.addEventListener('click', UI.closeAddCidModal);
    }

    // ESC 键关闭
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            UI.closeAddCidModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // 模式切换
    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            UI.switchCidInputMode(mode);
        });
    });

    // 粘贴按钮
    if (newPasteBtn && newCidInput) {
        newPasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                newCidInput.value = text;
                UI.validateCidInput();
                UI.toast('已粘贴', 'success');
            } catch (e) {
                UI.toast('无法访问剪贴板', 'error');
            }
        });
    }

    // CID 输入框实时验证（单个模式）
    if (newCidInput) {
        newCidInput.addEventListener('input', UI.validateCidInput);
        newCidInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !newConfirmBtn.disabled) {
                UI.submitAddCid();
            }
        });
    }

    // 批量输入框实时验证
    if (newBatchCidInput) {
        newBatchCidInput.addEventListener('input', UI.validateBatchCidInput);
    }

    // 自动获取信息复选框
    if (newAutoFetchInfo) {
        newAutoFetchInfo.addEventListener('change', () => {
            if (newBatchCidInput.value.trim()) {
                UI.validateBatchCidInput();
            }
        });
    }

    // 确认按钮
    if (newConfirmBtn) {
        newConfirmBtn.addEventListener('click', UI.submitAddCid);
    }
},

/**
 * 切换 CID 输入模式
 */
switchCidInputMode: (mode) => {
    const singleMode = document.getElementById('singleCidMode');
    const batchMode = document.getElementById('batchCidMode');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const validationStatus = document.getElementById('cidValidationStatus');
    const confirmBtn = document.getElementById('confirmAddCidBtn');
    const batchPreview = document.getElementById('batchPreview');

    // 更新按钮状态
    modeBtns.forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 切换显示区域
    if (mode === 'single') {
        if (singleMode) singleMode.hidden = false;
        if (batchMode) batchMode.hidden = true;
        if (batchPreview) batchPreview.hidden = true;
        UI.validateCidInput();
    } else {
        if (singleMode) singleMode.hidden = true;
        if (batchMode) batchMode.hidden = false;
        if (validationStatus) validationStatus.hidden = true;
        UI.validateBatchCidInput();
    }
},

/**
 * 验证单个 CID 输入
 */
validateCidInput: async () => {
    const cidInput = document.getElementById('cidInput');
    const validationStatus = document.getElementById('cidValidationStatus');
    const confirmBtn = document.getElementById('confirmAddCidBtn');

    if (!cidInput) return;

    const cid = cidInput.value.trim();

    if (!cid) {
        if (validationStatus) validationStatus.hidden = true;
        if (confirmBtn) confirmBtn.disabled = true;
        return;
    }

    if (validationStatus) {
        validationStatus.hidden = false;
        validationStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 正在验证 CID...';
    }

    const validation = App.validateCid(cid);

    if (!validation.valid) {
        if (validationStatus) {
            validationStatus.innerHTML = `<i class="fa-solid fa-times-circle"></i> ${validation.error}`;
            validationStatus.style.color = '#ff6b6b';
        }
        if (confirmBtn) confirmBtn.disabled = true;
        return;
    }

    const existingFile = App.allFiles.find(f => f.cid === validation.cid);
    if (existingFile) {
        if (validationStatus) {
            validationStatus.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i> 该 CID 已存在于列表中`;
            validationStatus.style.color = '#ffd93d';
        }
        if (confirmBtn) confirmBtn.disabled = true;
        return;
    }

    if (validationStatus) {
        validationStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> CID 有效';
        validationStatus.style.color = '#6bcf7f';
    }
    if (confirmBtn) confirmBtn.disabled = false;
},

/**
 * 验证批量 CID 输入
 */
validateBatchCidInput: async () => {
    const batchCidInput = document.getElementById('batchCidInput');
    const autoFetchInfo = document.getElementById('autoFetchInfo');
    const batchPreview = document.getElementById('batchPreview');
    const batchPreviewCount = document.getElementById('batchPreviewCount');
    const batchPreviewList = document.getElementById('batchPreviewList');
    const confirmBtn = document.getElementById('confirmAddCidBtn');

    if (!batchCidInput) return;

    const text = batchCidInput.value.trim();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
        if (batchPreview) batchPreview.hidden = true;
        if (confirmBtn) confirmBtn.disabled = true;
        return;
    }

    // 验证每个 CID
    const validCids = [];
    const invalidCids = [];
    const duplicateCids = [];

    lines.forEach(line => {
        const cid = line.trim();
        const validation = App.validateCid(cid);

        if (!validation.valid) {
            invalidCids.push({ cid, error: validation.error });
        } else {
            const existingFile = App.allFiles.find(f => f.cid === validation.cid);
            if (existingFile) {
                duplicateCids.push(validation.cid);
            } else {
                validCids.push(validation.cid);
            }
        }
    });

    // 显示预览
    if (batchPreview && batchPreviewCount && batchPreviewList) {
        batchPreview.hidden = false;
        batchPreviewCount.textContent = validCids.length;

        let previewHtml = '';
        validCids.slice(0, 5).forEach(cid => {
            previewHtml += `<div class="batch-preview-item">${cid.substring(0, 20)}...</div>`;
        });

        if (validCids.length > 5) {
            previewHtml += `<div class="batch-preview-more">还有 ${validCids.length - 5} 个...</div>`;
        }

        if (invalidCids.length > 0) {
            previewHtml += `<div class="batch-preview-error">${invalidCids.length} 个无效 CID</div>`;
        }

        if (duplicateCids.length > 0) {
            previewHtml += `<div class="batch-preview-duplicate">${duplicateCids.length} 个重复 CID</div>`;
        }

        batchPreviewList.innerHTML = previewHtml;
    }

    // 启用/禁用确认按钮
    if (confirmBtn) {
        confirmBtn.disabled = validCids.length === 0;
    }
},

/**
 * 提交添加 CID
 */
submitAddCid: async () => {
    const singleMode = document.getElementById('singleCidMode');
    const batchMode = document.getElementById('batchCidMode');
    const confirmBtn = document.getElementById('confirmAddCidBtn');

    if (!confirmBtn) return;

    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 添加中...';

    try {
        if (!singleMode?.hidden) {
            // 单个 CID 模式
            const cidInput = document.getElementById('cidInput');
            const fileNameInput = document.getElementById('fileNameInput');
            const fileSizeInput = document.getElementById('fileSizeInput');

            if (!cidInput || !cidInput.value.trim()) {
                UI.toast('请输入 CID', 'error');
                return;
            }

            const cid = cidInput.value.trim();
            const fileName = fileNameInput ? fileNameInput.value : '';
            const fileSize = fileSizeInput ? parseInt(fileSizeInput.value, 10) || 0 : 0;

            const success = await App.addCidFile(cid, fileName, fileSize);
            if (success) {
                UI.closeAddCidModal();
            }
        } else if (!batchMode?.hidden) {
            // 批量导入模式
            const batchCidInput = document.getElementById('batchCidInput');
            const autoFetchInfo = document.getElementById('autoFetchInfo');

            if (!batchCidInput || !batchCidInput.value.trim()) {
                UI.toast('请输入 CID 列表', 'error');
                return;
            }

            const text = batchCidInput.value.trim();
            const lines = text.split('\n').filter(line => line.trim());
            const validCids = lines.filter(line => {
                const validation = App.validateCid(line.trim());
                return validation.valid && !App.allFiles.find(f => f.cid === validation.cid);
            });

            const autoFetch = autoFetchInfo ? autoFetchInfo.checked : true;
            const result = await App.batchImportCids(validCids, autoFetch);

            if (result.successCount > 0) {
                UI.closeAddCidModal();
            }
        }
    } catch (e) {
        UI.toast(`添加失败: ${e.message}`, 'error');
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fa-solid fa-plus"></i> 添加到列表';
        }
    }
},

/**
 * 复制 CID
 */
copyCid: async (cid, fileName) => {
    await App.copyCidToClipboard(cid, fileName);
},

/**
 * 分享文件
 */
shareFile: async (fileId) => {
    await App.generateShareLink(fileId, 7); // 默认7天有效期
},

/**
 * 显示分享设置对话框
 */
showShareSettings: async (fileId, fileName) => {
    const duration = await UI.prompt('请设置分享时长（天）:', '7');
    if (!duration) return;

    const days = parseInt(duration, 10);
    if (isNaN(days) || days <= 0) {
        UI.toast('请输入有效的天数', 'error');
        return;
    }

    await App.generateShareLink(fileId, days);
},

/**
 * 显示提示对话框
 */
prompt: (message, defaultValue = '') => {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box glass-effect" style="width: 400px; max-width: 90%;">
                <div style="padding: 20px;">
                    <h3 style="margin-top: 0; margin-bottom: 15px;">设置分享时长</h3>
                    <p style="margin-bottom: 15px;">${message}</p>
                    <input type="number" id="promptInput" value="${defaultValue}" min="1" max="365" style="width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px;">
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button id="promptCancelBtn" class="btn btn-secondary">取消</button>
                        <button id="promptOkBtn" class="btn btn-primary">确定</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const input = overlay.querySelector('#promptInput');
        const cancelBtn = overlay.querySelector('#promptCancelBtn');
        const okBtn = overlay.querySelector('#promptOkBtn');

        const cleanup = () => {
            overlay.remove();
        };

        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(null);
        });

        okBtn.addEventListener('click', () => {
            const value = input.value;
            cleanup();
            resolve(value);
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const value = input.value;
                cleanup();
                resolve(value);
            }
        });

        input.focus();
    });
}

function createToastContainer() {
    const div = document.createElement('div');
    div.id = 'toast-container';
    document.body.appendChild(div);
    return div;
}
