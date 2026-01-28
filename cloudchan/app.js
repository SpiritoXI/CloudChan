/**
 * CloudChan - 白色水晶风格 Web3 个人网盘
 * 主应用逻辑
 * @version 2.2.1
 */

import { CONFIG } from './config.js?v=2.2.1';
import { UI } from './ui.js?v=2.2.1';

/**
 * 主应用对象
 */
const App = {
    // 状态
    allFiles: [],
    allFolders: [],
    filteredFiles: [], // 搜索过滤后的文件列表
    paginatedFiles: [], // 分页后的文件列表
    selectedFolder: null,
    isUploading: false,
    selectedFile: null,
    uploadFiles: [], // 多文件上传：选中的文件列表
    selectedFiles: [], // 批量操作：选中的文件列表
    searchQuery: '', // 当前搜索查询
    viewMode: 'list',
    autoUpload: true,
    folderContextMenuEl: null,
    folderContextTargetFolder: null,
    folderContextTriggerEl: null,
    // 分页状态
    currentPage: 1,
    itemsPerPage: 10, // 每页显示的文件数量
    totalPages: 1,
    // 懒加载状态
    lazyLoading: false,
    lazyLoadedCount: 0,
    lazyLoadThreshold: 100, // 滚动阈值，单位像素

    // 常量配置
    MAX_FILE_SIZE: CONFIG.UPLOAD.MAX_SIZE,
    MAX_FILE_SIZE_TEXT: CONFIG.UPLOAD.MAX_SIZE_TEXT,
    VERSION: CONFIG.APP.VERSION,
    BUILD_TIME: CONFIG.APP.BUILD_TIME,
    // 安全配置
    CSRF_TOKEN_KEY: 'cc_csrf_token',

    /**
     * XSS 防护：转义 HTML 特殊字符
     */
    sanitizeHtml: (html) => {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    },

    /**
     * XSS 防护：清理用户输入（对外统一入口）
     */
    sanitizeInput: (input) => {
        if (typeof input !== 'string') {
            return input;
        }
        return App.sanitizeHtml(input);
    },

    /**
     * 生成CSRF令牌
     */
    generateCsrfToken: () => {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(App.CSRF_TOKEN_KEY, token);
        return token;
    },

    /**
     * 获取CSRF令牌
     */
    getCsrfToken: () => {
        let token = localStorage.getItem(App.CSRF_TOKEN_KEY);
        if (!token) {
            token = App.generateCsrfToken();
        }
        return token;
    },

    /**
     * 验证CSRF令牌
     */
    validateCsrfToken: (token) => {
        const storedToken = localStorage.getItem(App.CSRF_TOKEN_KEY);
        return token === storedToken;
    },

    /**
     * 安全的fetch请求包装函数，自动添加CSRF令牌
     */
    secureFetch: async (url, options = {}) => {
        const token = App.getCsrfToken();
        const headers = {
            'x-csrf-token': token,
            ...options.headers
        };

        return fetch(url, {
            ...options,
            headers
        });
    },

    readErrorMessage: async (res) => {
        try {
            const data = await res.clone().json();
            return data?.error || data?.message || null;
        } catch {
            return null;
        }
    },

    checkDbStatus: async () => {
        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            throw new Error('未登录');
        }

        const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=db_stats`, {
            method: 'GET',
            cache: 'no-store',
            headers: { 'x-auth-token': pwd }
        });

        if (!res.ok) {
            const message = await App.readErrorMessage(res);
            throw new Error(message || `HTTP ${res.status}`);
        }

        return await res.json();
    },

    /**
     * 初始化应用
     */
    init: async () => {
        console.log(`🚀 CloudChan 正在加载 - 白色水晶风格 V${App.VERSION}`);

        App.initVersionInfo();
        App.initUploadLimitHint();
        App.initCacheStatus();
        App.initEventListeners();
        App.initViewMode();
        App.initDragAndDrop();
        App.initLazyLoading(); // 初始化懒加载
        App.generateCsrfToken(); // 生成CSRF令牌

        // 登录检查
        if (!localStorage.getItem('cc_pwd')) {
            await App.loginFlow();
        }

        await App.loadFolders();
        await App.loadFiles();
        App.initVerificationChecker(); // 初始化验证状态检查器
        console.log("✅ CloudChan 初始化完成");
        console.log("🔍 验证状态检查器已启动，会自动检测并重新上传验证失败的文件");
    },

    initUploadLimitHint: () => {
        const el = document.getElementById('maxUploadSizeText');
        if (el) el.textContent = App.MAX_FILE_SIZE_TEXT;
    },

    /**
     * 批量操作：更新选中的文件列表
     */
    updateSelectedFiles: () => {
        const checkboxes = document.querySelectorAll('.file-checkbox:checked');
        const selectedIndices = Array.from(checkboxes).map(checkbox => {
            return parseInt(checkbox.dataset.fileIndex);
        });
        
        App.selectedFiles = selectedIndices.map(index => App.allFiles[index]);
        App.updateBatchButtons();
    },

    /**
     * 批量操作：全选文件
     */
    selectAllFiles: () => {
        const checkboxes = document.querySelectorAll('.file-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        App.updateSelectedFiles();
        UI.toast("已选择所有文件", "success");
    },

    /**
     * 批量操作：取消选择所有文件
     */
    clearSelectedFiles: () => {
        const checkboxes = document.querySelectorAll('.file-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        App.selectedFiles = [];
        App.updateBatchButtons();
        UI.toast("已取消选择", "success");
    },

    /**
     * 批量操作：更新批量按钮状态
     */
    updateBatchButtons: () => {
        const batchDeleteBtn = document.getElementById('batchDeleteBtn');
        const batchMoveBtn = document.getElementById('batchMoveBtn');
        const selectedCount = App.selectedFiles.length;

        if (batchDeleteBtn) {
            batchDeleteBtn.disabled = selectedCount === 0;
            batchDeleteBtn.textContent = `批量删除 (${selectedCount})`;
        }

        if (batchMoveBtn) {
            batchMoveBtn.disabled = selectedCount === 0;
            batchMoveBtn.textContent = `批量移动 (${selectedCount})`;
        }
    },

    /**
     * 批量操作：批量删除文件
     */
    batchDeleteFiles: async () => {
        if (App.selectedFiles.length === 0) {
            UI.toast("请先选择要删除的文件", "error");
            return;
        }

        if (!confirm(`确定要删除选中的 ${App.selectedFiles.length} 个文件吗？\n\n此操作不可撤销！`)) {
            return;
        }

        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            UI.toast("请先登录", "error");
            return;
        }

        try {
            UI.toast(`正在删除 ${App.selectedFiles.length} 个文件...`, "info");

            const fileIds = App.selectedFiles
                .map(file => file?.id)
                .filter(id => id !== undefined && id !== null);
            const totalCount = fileIds.length;

            const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=delete_files`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': pwd
                },
                body: JSON.stringify({ fileIds })
            });

            if (res.status === 401) {
                localStorage.removeItem('cc_pwd');
                UI.toast("密码已失效，请重新登录", "error");
                setTimeout(() => location.reload(), 1500);
                return;
            }

            if (!res.ok) {
                const message = await App.readErrorMessage(res);
                throw new Error(message || `HTTP ${res.status}`);
            }

            const json = await res.json().catch(() => ({}));
            if (!json.success) {
                throw new Error(json.error || '批量删除失败');
            }
            const successCount = Number.isFinite(json.deleted) ? json.deleted : totalCount;

            // 重新加载文件列表
            App.selectedFiles = [];
            await App.loadFiles();
            App.updateBatchButtons();
            UI.toast(`成功删除 ${successCount}/${totalCount} 个文件`, "success");

        } catch (e) {
            console.error("批量删除文件错误:", e);
            UI.toast("批量删除文件失败: " + e.message, "error");
        }
    },

    /**
     * 批量操作：批量移动文件
     */
    batchMoveFiles: async () => {
        if (App.selectedFiles.length === 0) {
            UI.toast("请先选择要移动的文件", "error");
            return;
        }

        // 显示文件夹选择对话框
        const folderOptions = App.allFolders.map(folder => {
            return { value: folder.id, label: folder.name };
        });

        // 构建选择对话框
        const dialogContent = `
            <div style="padding: 20px;">
                <h3 style="margin-top: 0;">批量移动文件到文件夹</h3>
                <p style="margin-bottom: 15px;">选择目标文件夹:</p>
                <select id="batchTargetFolderSelect" style="width: 100%; padding: 10px; border-radius: 8px; border: 1.5px solid rgba(124, 58, 237, 0.2);">
                    ${folderOptions.map(option => 
                        `<option value="${option.value}">${option.label}</option>`
                    ).join('')}
                </select>
                <div style="margin-top: 20px; text-align: right;">
                    <button id="batchCancelMoveBtn" style="margin-right: 10px; padding: 10px 20px; border: none; border-radius: 8px; background: rgba(124, 58, 237, 0.1); color: var(--text-secondary); cursor: pointer;">取消</button>
                    <button id="batchConfirmMoveBtn" style="padding: 10px 20px; border: none; border-radius: 8px; background: var(--crystal-primary); color: white; cursor: pointer;">移动</button>
                </div>
            </div>
        `;

        // 创建对话框
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box glass-effect" style="width: 400px; max-width: 90%;">
                ${dialogContent}
            </div>
        `;

        document.body.appendChild(overlay);

        // 事件处理
        const cancelBtn = overlay.querySelector('#batchCancelMoveBtn');
        const confirmBtn = overlay.querySelector('#batchConfirmMoveBtn');
        const selectEl = overlay.querySelector('#batchTargetFolderSelect');

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

        confirmBtn.addEventListener('click', async () => {
            const targetFolderId = selectEl.value;
            if (!targetFolderId) {
                UI.toast("请选择目标文件夹", "error");
                return;
            }

            overlay.remove();
            await App.performBatchMoveFiles(targetFolderId);
        });

        // 点击模态框外部关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    },

    /**
     * 执行批量移动文件操作
     */
    performBatchMoveFiles: async (targetFolderId) => {
        if (!targetFolderId || App.selectedFiles.length === 0) {
            UI.toast("无效的目标文件夹或未选择文件", "error");
            return;
        }

        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            UI.toast("请先登录", "error");
            return;
        }

        try {
            UI.toast(`正在移动 ${App.selectedFiles.length} 个文件...`, "info");

            const fileIds = App.selectedFiles
                .map(file => file?.id)
                .filter(id => id !== undefined && id !== null);

            const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=move_files`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': pwd
                },
                body: JSON.stringify({ fileIds, folderId: targetFolderId })
            });

            if (res.status === 401) {
                localStorage.removeItem('cc_pwd');
                UI.toast("密码已失效，请重新登录", "error");
                setTimeout(() => location.reload(), 1500);
                return;
            }

            if (!res.ok) {
                const message = await App.readErrorMessage(res);
                throw new Error(message || `HTTP ${res.status}`);
            }

            const json = await res.json().catch(() => ({}));
            if (!json.success) {
                throw new Error(json.error || '批量移动文件失败');
            }
            const successCount = Number.isFinite(json.moved) ? json.moved : fileIds.length;

            // 重新加载文件列表
            App.selectedFiles = [];
            await App.loadFiles();
            App.updateBatchButtons();
            const targetFolder = App.allFolders.find(folder => folder.id === targetFolderId);
            UI.toast(`成功移动 ${successCount} 个文件到 "${targetFolder ? targetFolder.name : '未知文件夹'}"`, "success");

        } catch (e) {
            console.error("批量移动文件错误:", e);
            UI.toast("批量移动文件失败: " + e.message, "error");
        }
    },

    /**
     * 搜索文件
     */
    searchFiles: () => {
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (!searchInput) return;

        const query = searchInput.value.trim().toLowerCase();
        App.searchQuery = query;

        // 更新UI
        if (query) {
            clearSearchBtn.hidden = false;
        } else {
            clearSearchBtn.hidden = true;
        }

        // 执行搜索过滤
        App.filterFiles();
    },

    /**
     * 清除搜索
     */
    clearSearch: () => {
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (!searchInput) return;

        searchInput.value = '';
        clearSearchBtn.hidden = true;
        App.searchQuery = '';
        
        // 重新过滤文件
        App.filterFiles();
        UI.toast("搜索已清除", "success");
    },

    /**
     * 过滤文件列表
     */
    filterFiles: () => {
        let filtered = [...App.allFiles];

        // 按文件夹过滤
        if (App.selectedFolder) {
            const folderId = String(App.selectedFolder.id);
            filtered = filtered.filter(file => String(file.folder_id) === folderId);
        }

        // 按搜索查询过滤
        if (App.searchQuery) {
            const query = App.searchQuery.toLowerCase();
            filtered = filtered.filter(file => {
                // 搜索文件名
                if (file.name.toLowerCase().includes(query)) {
                    return true;
                }
                // 搜索文件类型（扩展名）
                const ext = file.name.split('.').pop()?.toLowerCase();
                if (ext && ext.includes(query)) {
                    return true;
                }
                return false;
            });
        }

        // 按时间排序（最新的在前面）
        filtered.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        });

        App.filteredFiles = filtered;
        App.currentPage = 1; // 重置到第一页
        App.calculateTotalPages();
        App.applyPagination();

        // 更新状态文本
        const searchInput = document.getElementById('searchInput');
        if (App.searchQuery) {
            UI.toast(`找到 ${App.filteredFiles.length} 个匹配的文件`, "info");
        }
    },

    /**
     * 计算总页数
     */
    calculateTotalPages: () => {
        App.totalPages = Math.ceil(App.filteredFiles.length / App.itemsPerPage);
    },

    /**
     * 应用分页
     */
    applyPagination: () => {
        const startIndex = (App.currentPage - 1) * App.itemsPerPage;
        const endIndex = startIndex + App.itemsPerPage;
        App.paginatedFiles = App.filteredFiles.slice(startIndex, endIndex);
        App.renderFileListWithPagination();
    },

    /**
     * 渲染带分页的文件列表
     */
    renderFileListWithPagination: () => {
        if (App.viewMode === 'grid') {
            UI.renderFileGrid(
                App.paginatedFiles,
                App.deleteFile,
                App.downloadFile,
                App.renameFile,
                App.repropagateFile
            );
        } else {
            UI.renderFileList(
                App.paginatedFiles,
                App.deleteFile,
                App.downloadFile,
                App.renameFile,
                App.repropagateFile
            );
        }
        App.renderPaginationControls();
    },

    /**
     * 渲染分页控件
     */
    renderPaginationControls: () => {
        let paginationContainer = document.getElementById('paginationControls');
        if (!paginationContainer) {
            // 创建分页控件容器
            const tableContainer = document.querySelector('.table-container');
            if (tableContainer) {
                const paginationDiv = document.createElement('div');
                paginationDiv.id = 'paginationControls';
                paginationDiv.className = 'pagination-controls';
                tableContainer.appendChild(paginationDiv);
                paginationContainer = paginationDiv;
            } else {
                return;
            }
        }

        // 重置分页控件
        paginationContainer.innerHTML = '';

        if (App.totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';

        // 创建分页按钮和信息
        const paginationInfo = document.createElement('div');
        paginationInfo.className = 'pagination-info';
        paginationInfo.textContent = `第 ${App.currentPage} 页，共 ${App.totalPages} 页`;
        paginationContainer.appendChild(paginationInfo);

        const paginationButtons = document.createElement('div');
        paginationButtons.className = 'pagination-buttons';

        // 上一页按钮
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i> 上一页';
        prevBtn.disabled = App.currentPage === 1;
        prevBtn.onclick = () => App.changePage(App.currentPage - 1);
        paginationButtons.appendChild(prevBtn);

        // 数字按钮
        const maxButtons = 5;
        let startPage = Math.max(1, App.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(App.totalPages, startPage + maxButtons - 1);

        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (startPage > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.className = 'pagination-btn';
            firstBtn.textContent = '1';
            firstBtn.onclick = () => App.changePage(1);
            paginationButtons.appendChild(firstBtn);

            if (startPage > 2) {
                const ellipsis1 = document.createElement('span');
                ellipsis1.className = 'pagination-ellipsis';
                ellipsis1.textContent = '...';
                paginationButtons.appendChild(ellipsis1);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === App.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => App.changePage(i);
            paginationButtons.appendChild(pageBtn);
        }

        if (endPage < App.totalPages) {
            if (endPage < App.totalPages - 1) {
                const ellipsis2 = document.createElement('span');
                ellipsis2.className = 'pagination-ellipsis';
                ellipsis2.textContent = '...';
                paginationButtons.appendChild(ellipsis2);
            }

            const lastBtn = document.createElement('button');
            lastBtn.className = 'pagination-btn';
            lastBtn.textContent = App.totalPages;
            lastBtn.onclick = () => App.changePage(App.totalPages);
            paginationButtons.appendChild(lastBtn);
        }

        // 下一页按钮
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '下一页 <i class="fa-solid fa-chevron-right"></i>';
        nextBtn.disabled = App.currentPage === App.totalPages;
        nextBtn.onclick = () => App.changePage(App.currentPage + 1);
        paginationButtons.appendChild(nextBtn);

        paginationContainer.appendChild(paginationButtons);
    },

    /**
     * 切换到指定页码
     */
    changePage: (page) => {
        if (page < 1 || page > App.totalPages) {
            return;
        }
        App.currentPage = page;
        App.applyPagination();
        // 滚动到文件列表顶部
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            tableContainer.scrollIntoView({ behavior: 'smooth' });
        }
    },

    /**
     * 初始化懒加载监听
     */
    initLazyLoading: () => {
        const tableContainer = document.querySelector('.table-container');
        if (!tableContainer) {
            return;
        }

        // 监听滚动事件
        tableContainer.addEventListener('scroll', () => {
            App.checkLazyLoad();
        });

        // 初始加载
        App.lazyLoadedCount = App.itemsPerPage;
    },

    /**
     * 检查是否需要加载更多文件
     */
    checkLazyLoad: () => {
        const tableContainer = document.querySelector('.table-container');
        if (!tableContainer || App.lazyLoading || App.currentPage >= App.totalPages) {
            return;
        }

        // 检查是否滚动到接近底部
        const { scrollTop, scrollHeight, clientHeight } = tableContainer;
        if (scrollHeight - scrollTop - clientHeight < App.lazyLoadThreshold) {
            App.loadMoreFiles();
        }
    },

    /**
     * 加载更多文件
     */
    loadMoreFiles: async () => {
        if (App.lazyLoading || App.currentPage >= App.totalPages) {
            return;
        }

        App.lazyLoading = true;
        App.currentPage++;

        try {
            // 显示加载指示器
            const tableBody = document.getElementById('fileTableBody');
            if (tableBody) {
                const loadingRow = document.createElement('tr');
                loadingRow.id = 'lazyLoadLoadingRow';
                loadingRow.innerHTML = `<td colspan="5" style="text-align:center; color:#94A3B8; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> 加载更多文件...</td>`;
                tableBody.appendChild(loadingRow);
            }

            // 应用分页，加载下一页
            App.applyPagination();

        } finally {
            App.lazyLoading = false;
            // 移除加载指示器
            const loadingRow = document.getElementById('lazyLoadLoadingRow');
            if (loadingRow) {
                loadingRow.remove();
            }
        }
    },

    /**
     * 初始化版本信息显示
     */
    initVersionInfo: () => {
        const versionInfo = document.getElementById('version-info');
        if (versionInfo) {
            versionInfo.innerHTML = `<i class="fa-solid fa-check-circle"></i> 版本: ${App.VERSION} (构建于 ${App.BUILD_TIME})`;
        }
    },

    /**
     * 初始化缓存状态显示
     */
    initCacheStatus: () => {
        const cacheStatus = document.getElementById('cache-status');
        if (!cacheStatus) return;

        const cacheKey = 'cc_gateway_check_result_v1';
        const cachedData = localStorage.getItem(cacheKey);
        
        if (cachedData) {
            try {
                const cache = JSON.parse(cachedData);
                const age = Math.round((Date.now() - cache.timestamp) / 1000);
                cacheStatus.innerHTML = `<i class="fa-solid fa-database"></i> 网关测试缓存: ${age}秒前`;
            } catch (e) {
                console.error('解析缓存数据失败:', e);
            }
        } else {
            cacheStatus.innerHTML = `<i class="fa-solid fa-database"></i> 网关测试缓存: 无`;
        }
    },

    /**
     * 初始化事件监听器
     */
    initEventListeners: () => {
        App.ensureFolderContextMenu();

        // 文件选择
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.onchange = App.handleFileSelect;
            // 确保在移动端能够正常触发
            fileInput.style.position = 'absolute';
            fileInput.style.top = '0';
            fileInput.style.left = '0';
            fileInput.style.width = '100%';
            fileInput.style.height = '100%';
            fileInput.style.opacity = '0';
            fileInput.style.zIndex = '10';
            fileInput.style.cursor = 'pointer';
        }

        const uploadBtnPrimary = document.getElementById('uploadBtnPrimary');
        if (uploadBtnPrimary && fileInput) {
            // 确保上传按钮有足够的触摸目标
            uploadBtnPrimary.style.position = 'relative';
            uploadBtnPrimary.style.zIndex = '5';
            uploadBtnPrimary.style.touchAction = 'manipulation';
            
            // 绑定点击事件，确保在移动端能够正常触发
            uploadBtnPrimary.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInput.click();
            }, { passive: false });
            
            // 添加触摸事件支持
            uploadBtnPrimary.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInput.click();
            }, { passive: false });
        }

        const viewListBtn = document.getElementById('viewListBtn');
        if (viewListBtn) {
            viewListBtn.addEventListener('click', () => App.setViewMode('list'));
        }

        const viewGridBtn = document.getElementById('viewGridBtn');
        if (viewGridBtn) {
            viewGridBtn.addEventListener('click', () => App.setViewMode('grid'));
        }

        // 开始上传按钮
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.onclick = App.startUpload;
        }

        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.onclick = App.handleRefresh;
        }

        // 新建文件夹按钮
        const newFolderBtn = document.getElementById('newFolderBtn');
        if (newFolderBtn) {
            newFolderBtn.onclick = () => App.createFolder();
        }

        // 批量操作按钮
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
            selectAllBtn.onclick = App.selectAllFiles;
        }

        const clearSelectionBtn = document.getElementById('clearSelectionBtn');
        if (clearSelectionBtn) {
            clearSelectionBtn.onclick = App.clearSelectedFiles;
        }

        const batchDeleteBtn = document.getElementById('batchDeleteBtn');
        if (batchDeleteBtn) {
            batchDeleteBtn.onclick = App.batchDeleteFiles;
        }

        const batchMoveBtn = document.getElementById('batchMoveBtn');
        if (batchMoveBtn) {
            batchMoveBtn.onclick = App.batchMoveFiles;
        }

        // 全选复选框
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.onchange = (e) => {
                if (e.target.checked) {
                    App.selectAllFiles();
                } else {
                    App.clearSelectedFiles();
                }
            };
        }

        // 搜索功能
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const clearSearchBtn = document.getElementById('clearSearchBtn');

        if (searchInput) {
            // 输入框回车搜索
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    App.searchFiles();
                }
            });

            // 输入框实时搜索（延迟）
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    App.searchFiles();
                }, 300);
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                App.searchFiles();
            });
        }

        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                App.clearSearch();
            });
        }
    },

    initViewMode: () => {
        const saved = localStorage.getItem('cc_view_mode');
        if (saved === 'grid' || saved === 'list') {
            App.viewMode = saved;
        } else {
            App.viewMode = 'list';
        }
        App.setViewMode(App.viewMode, { persist: false, rerender: false });
    },

    setViewMode: (mode, options = {}) => {
        const persist = options.persist !== false;
        const rerender = options.rerender !== false;
        if (mode !== 'grid' && mode !== 'list') return;

        App.viewMode = mode;
        if (persist) {
            localStorage.setItem('cc_view_mode', mode);
        }

        const listViewEl = document.getElementById('filesListView');
        const gridViewEl = document.getElementById('filesGridView');
        if (listViewEl) listViewEl.hidden = mode !== 'list';
        if (gridViewEl) gridViewEl.hidden = mode !== 'grid';

        const viewListBtn = document.getElementById('viewListBtn');
        const viewGridBtn = document.getElementById('viewGridBtn');
        if (viewListBtn) {
            const isActive = mode === 'list';
            viewListBtn.classList.toggle('active', isActive);
            viewListBtn.setAttribute('aria-pressed', String(isActive));
        }
        if (viewGridBtn) {
            const isActive = mode === 'grid';
            viewGridBtn.classList.toggle('active', isActive);
            viewGridBtn.setAttribute('aria-pressed', String(isActive));
        }

        App.selectedFiles = [];
        App.updateBatchButtons();

        if (rerender && App.paginatedFiles) {
            App.renderFileListWithPagination();
        }
    },

    /**
     * 初始化拖拽上传
     */
    initDragAndDrop: () => {
        const dropZone = document.getElementById('fileDropZone');
        const fileInput = document.getElementById('fileInput');

        if (!dropZone || !fileInput) return;

        let dragCounter = 0;

        dropZone.ondragenter = (e) => {
            e.preventDefault();
            dragCounter += 1;
            dropZone.classList.add('drop-active');
        };

        dropZone.ondragover = (e) => {
            e.preventDefault();
        };

        dropZone.ondragleave = () => {
            dragCounter = Math.max(0, dragCounter - 1);
            if (dragCounter === 0) {
                dropZone.classList.remove('drop-active');
            }
        };

        dropZone.ondrop = (e) => {
            e.preventDefault();
            dragCounter = 0;
            dropZone.classList.remove('drop-active');
            
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                App.handleFileSelect({ target: fileInput });
            }
        };
    },

    /**
     * 处理刷新操作
     */
    handleRefresh: async () => {
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.classList.add('fa-spin');

        try {
            await App.loadFolders();
            await App.loadFiles();
            UI.toast("刷新成功", "success");
        } catch (e) {
            console.error("刷新失败:", e);
            UI.toast("刷新失败: " + e.message, "error");
        } finally {
            setTimeout(() => refreshBtn.classList.remove('fa-spin'), 500);
        }
    },

    /**
     * 构建文件夹树结构
     */
    buildFolderTree: () => {
        const folders = [...App.allFolders];
        const folderMap = new Map();
        const tree = [];

        // 创建文件夹映射
        folders.forEach(folder => {
            folderMap.set(folder.id, { ...folder, children: [] });
        });

        // 构建树结构
        folders.forEach(folder => {
            const currentFolder = folderMap.get(folder.id);
            if (folder.parentId === null) {
                // 根文件夹
                tree.push(currentFolder);
            } else {
                // 子文件夹
                const parent = folderMap.get(folder.parentId);
                if (parent) {
                    parent.children.push(currentFolder);
                }
            }
        });

        return tree;
    },

    /**
     * 加载文件夹列表
     */
    loadFolders: async () => {
        const pwd = localStorage.getItem('cc_pwd');
        const folderListEl = document.getElementById('folderList');

        if (!pwd) {
            return;
        }

        try {
            folderListEl.innerHTML = '<div class="folder-loading"><i class="fa-solid fa-spinner"></i> 正在加载文件夹...</div>';

            const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=load_folders`, {
                method: 'GET',
                headers: { 'x-auth-token': pwd }
            });

            // 处理未授权
            if (res.status === 401) {
                localStorage.removeItem('cc_pwd');
                UI.toast("密码已失效，请重新登录", "error");
                setTimeout(() => location.reload(), 1500);
                return;
            }

            if (!res.ok) {
                const message = await App.readErrorMessage(res);
                throw new Error(message || `HTTP ${res.status}`);
            }

            const json = await res.json();
            App.allFolders = json.data || [];

            // 渲染文件夹列表
            App.renderFolders();

        } catch (e) {
            console.error("加载文件夹失败:", e);
            folderListEl.innerHTML = '<div style="color: #ff6b6b; font-size: 0.9rem;">加载文件夹失败: ' + e.message + '</div>';
        }
    },

    /**
     * 递归渲染文件夹树
     */
    renderFolderTree: (parentEl, folders, level = 0) => {
        folders.forEach(folder => {
            const folderEl = document.createElement('div');
            folderEl.className = `folder-item ${App.selectedFolder && App.selectedFolder.id === folder.id ? 'selected' : ''} level-${level}`;
            folderEl.style.paddingLeft = `${level * 20}px`;
            
            const hasChildren = folder.children && folder.children.length > 0;
            const isExpanded = folder.isExpanded !== false;
            
            folderEl.innerHTML = `
                <div class="folder-header">
                    ${hasChildren ? `
                        <button class="folder-toggle ${isExpanded ? 'expanded' : ''}" title="${isExpanded ? '折叠' : '展开'}">
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                    ` : '<div class="folder-toggle-placeholder"></div>'}
                    <i class="fa-solid fa-folder" aria-hidden="true"></i>
                    <span class="folder-name">${folder.name}</span>
                    <div class="folder-actions">
                        <button class="folder-action-btn create-subfolder" title="在当前文件夹下创建子文件夹" data-folder-id="${folder.id}">
                            <i class="fa-solid fa-folder-plus"></i>
                        </button>
                        <button class="folder-action-btn folder-more" title="更多操作" aria-label="更多操作" aria-haspopup="menu" aria-expanded="false" data-folder-id="${folder.id}">
                            <i class="fa-solid fa-ellipsis"></i>
                        </button>
                    </div>
                </div>
                ${hasChildren ? `<div class="folder-children ${isExpanded ? 'expanded' : ''}"></div>` : ''}
            `;

            // 点击文件夹选择
            folderEl.addEventListener('click', (e) => {
                if (!e.target.closest('.folder-action-btn') && !e.target.closest('.folder-toggle')) {
                    App.selectFolder(folder);
                }
            });

            // 展开/折叠文件夹
            if (hasChildren) {
                const toggleBtn = folderEl.querySelector('.folder-toggle');
                const childrenContainer = folderEl.querySelector('.folder-children');
                
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleBtn.classList.toggle('expanded');
                    childrenContainer.classList.toggle('expanded');
                    folder.isExpanded = !folder.isExpanded;
                });

                // 递归渲染子文件夹
                App.renderFolderTree(childrenContainer, folder.children, level + 1);
            }

            // 创建子文件夹
            const createSubfolderBtn = folderEl.querySelector('.create-subfolder');
            createSubfolderBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                App.createFolder(folder.id);
            });

            const moreBtn = folderEl.querySelector('.folder-more');
            moreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                App.showFolderContextMenu({ folder, anchorEl: moreBtn });
            });

            folderEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                App.showFolderContextMenu({ folder, point: { x: e.clientX, y: e.clientY } });
            });

            parentEl.appendChild(folderEl);
        });
    },

    ensureFolderContextMenu: () => {
        if (App.folderContextMenuEl) return;

        const el = document.createElement('div');
        el.className = 'folder-context-menu';
        el.setAttribute('role', 'menu');
        el.innerHTML = `
            <button type="button" class="folder-context-menu-item" data-action="rename" role="menuitem">
                <i class="fa-solid fa-pen"></i>
                重命名
            </button>
            <button type="button" class="folder-context-menu-item delete" data-action="delete" role="menuitem">
                <i class="fa-solid fa-trash"></i>
                删除
            </button>
        `;

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const actionEl = e.target.closest('[data-action]');
            const action = actionEl?.dataset?.action;
            const folder = App.folderContextTargetFolder;
            App.hideFolderContextMenu();
            if (!action || !folder) return;
            if (action === 'rename') App.renameFolder(folder);
            if (action === 'delete') App.deleteFolder(folder);
        });

        document.addEventListener('click', () => App.hideFolderContextMenu());
        window.addEventListener('scroll', () => App.hideFolderContextMenu(), true);
        window.addEventListener('resize', () => App.hideFolderContextMenu());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') App.hideFolderContextMenu();
        });

        document.body.appendChild(el);
        App.folderContextMenuEl = el;
    },

    showFolderContextMenu: ({ folder, anchorEl = null, point = null }) => {
        App.ensureFolderContextMenu();
        const el = App.folderContextMenuEl;
        if (!el) return;

        if (App.folderContextTriggerEl) {
            App.folderContextTriggerEl.setAttribute('aria-expanded', 'false');
        }

        App.folderContextTargetFolder = folder;
        App.folderContextTriggerEl = anchorEl;
        if (anchorEl) anchorEl.setAttribute('aria-expanded', 'true');

        el.style.left = '-9999px';
        el.style.top = '-9999px';
        el.classList.add('show');

        let x;
        let y;
        if (point) {
            x = window.scrollX + point.x;
            y = window.scrollY + point.y;
        } else if (anchorEl) {
            const rect = anchorEl.getBoundingClientRect();
            x = window.scrollX + rect.left;
            y = window.scrollY + rect.bottom + 6;
        } else {
            x = window.scrollX + 10;
            y = window.scrollY + 10;
        }

        const menuWidth = el.offsetWidth || 160;
        const menuHeight = el.offsetHeight || 80;
        const minLeft = window.scrollX + 8;
        const minTop = window.scrollY + 8;
        const maxLeft = window.scrollX + window.innerWidth - menuWidth - 8;
        const maxTop = window.scrollY + window.innerHeight - menuHeight - 8;

        const left = Math.max(minLeft, Math.min(x, maxLeft));
        const top = Math.max(minTop, Math.min(y, maxTop));

        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
    },

    hideFolderContextMenu: () => {
        const el = App.folderContextMenuEl;
        if (!el) return;
        el.classList.remove('show');
        App.folderContextTargetFolder = null;
        if (App.folderContextTriggerEl) {
            App.folderContextTriggerEl.setAttribute('aria-expanded', 'false');
        }
        App.folderContextTriggerEl = null;
    },

    /**
     * 渲染文件夹列表
     */
    renderFolders: () => {
        const folderListEl = document.getElementById('folderList');
        if (!folderListEl) return;

        if (App.allFolders.length === 0) {
            folderListEl.innerHTML = '<div style="color: #999; font-size: 0.9rem;">暂无文件夹</div>';
            return;
        }

        folderListEl.innerHTML = '';

        // 默认选中第一个文件夹（如果没有选中的文件夹）
        if (!App.selectedFolder && App.allFolders.length > 0) {
            App.selectedFolder = App.allFolders[0];
        }

        // 构建并渲染文件夹树
        const folderTree = App.buildFolderTree();
        App.renderFolderTree(folderListEl, folderTree);
    },

    /**
     * 选择文件夹
     */
    selectFolder: (folder) => {
        App.selectedFolder = folder;
        App.renderFolders();
        App.loadFiles();
        UI.toast(`已切换到文件夹 "${folder.name}"`, "success");
    },

    /**
     * 创建新文件夹
     */
    createFolder: async (parentId = null) => {
        let promptText = "请输入新文件夹名称:";
        if (parentId) {
            const parentFolder = App.allFolders.find(f => f.id === parentId);
            if (parentFolder) {
                promptText = `请输入在 "${parentFolder.name}" 下的子文件夹名称:`;
            }
        }
        
        const folderName = prompt(promptText);
        
        if (folderName === null) return;
        if (!folderName.trim()) {
            UI.toast("文件夹名称不能为空", "error");
            return;
        }

        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            UI.toast("请先登录", "error");
            return;
        }

        try {
            UI.toast("正在创建文件夹...", "info");

            const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=create_folder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': pwd
                },
                body: JSON.stringify({ 
                    name: App.sanitizeInput(folderName.trim()),
                    parentId: parentId
                })
            });

            if (res.status === 401) {
                localStorage.removeItem('cc_pwd');
                UI.toast("密码已失效，请重新登录", "error");
                setTimeout(() => location.reload(), 1500);
                return;
            }

            if (!res.ok) {
                const message = await App.readErrorMessage(res);
                throw new Error(message || `HTTP ${res.status}`);
            }

            const json = await res.json();
            if (!json.success) {
                throw new Error(json.error || '创建文件夹失败');
            }

            await App.loadFolders();
            UI.toast("文件夹创建成功", "success");

        } catch (e) {
            console.error("创建文件夹错误:", e);
            UI.toast("创建文件夹失败: " + e.message, "error");
        }
    },

    /**
     * 删除文件夹
     */
    deleteFolder: async (folder) => {
        if (!folder || !folder.name) {
            UI.toast("无效的文件夹信息", "error");
            return;
        }

        if (folder.id === 'default') {
            UI.toast("不能删除默认文件夹", "error");
            return;
        }

        const folderId = String(folder.id);

        // 检查是否有子文件夹
        const hasSubfolders = App.allFolders.some(f => String(f.parentId) === folderId);

        // 检查是否有文件
        const hasFiles = App.allFiles.some(f => String(f.folder_id) === folderId);
        
        let confirmMessage = `确定要删除文件夹 "${folder.name}" 吗？`;
        let isRecursive = false;
        
        if (hasSubfolders || hasFiles) {
            isRecursive = true;
            confirmMessage = `文件夹 "${folder.name}" 不是空的，包含 ${hasSubfolders ? '子文件夹' : ''}${hasSubfolders && hasFiles ? '和' : ''}${hasFiles ? '文件' : ''}。<br><br><strong style="color: #ff6b6b;">警告:</strong> 继续操作将删除该文件夹及其所有内容！<br><br>确定要全部删除吗？`;
        }

        // 使用新的确认对话框
        const confirmed = await UI.confirm(confirmMessage, {
            title: isRecursive ? "递归删除确认" : "删除文件夹确认",
            confirmText: isRecursive ? "全部删除" : "删除",
            confirmClass: "danger"
        });

        if (!confirmed) {
            return;
        }

        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            UI.toast("请先登录", "error");
            return;
        }

        // 保存文件夹信息用于撤销
        const deletedFolder = { ...folder };

        try {
            UI.toast(isRecursive ? "正在递归删除..." : "正在删除文件夹...", "info");

            const doDelete = async (recursive) => {
                const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=delete_folder`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': pwd
                    },
                    body: JSON.stringify({
                        folderId: folder.id,
                        recursive
                    })
                });

                if (res.status === 401) {
                    localStorage.removeItem('cc_pwd');
                    UI.toast("密码已失效，请重新登录", "error");
                    setTimeout(() => location.reload(), 1500);
                    return null;
                }

                if (!res.ok) {
                    const message = await App.readErrorMessage(res);
                    const error = new Error(message || `HTTP ${res.status}`);
                    error.status = res.status;
                    error.serverMessage = message;
                    throw error;
                }

                return await res.json();
            };

            let json;
            try {
                json = await doDelete(isRecursive);
                if (!json) return;
            } catch (err) {
                const message = err?.serverMessage || err?.message || '';
                const isNonRecursiveBlocked = !isRecursive && err?.status === 400 && (
                    /Cannot delete folder with\s+\d+\s+files?/i.test(message) ||
                    /Cannot delete folder with\s+subfolders/i.test(message)
                );

                if (isNonRecursiveBlocked) {
                    const confirmedRecursive = await UI.confirm(
                        `后端检测到该文件夹不是空的：${App.sanitizeInput(message)}<br><br><strong style="color: #ff6b6b;">警告:</strong> 继续操作将递归删除该文件夹及其所有内容！<br><br>确定要全部删除吗？`,
                        {
                            title: "递归删除确认",
                            confirmText: "全部删除",
                            confirmClass: "danger"
                        }
                    );

                    if (!confirmedRecursive) {
                        return;
                    }

                    UI.toast("正在递归删除...", "info");
                    json = await doDelete(true);
                    if (!json) return;
                } else {
                    throw err;
                }
            }

            if (!json.success) {
                throw new Error(json.error || '删除文件夹失败');
            }

            // 如果删除的是当前选中的文件夹，切换到默认文件夹
            if (App.selectedFolder && App.selectedFolder.id === folder.id) {
                App.selectedFolder = null;
            }

            await App.loadFolders();
            await App.loadFiles();
            UI.toast("文件夹删除成功", "success");

            // 添加撤销操作
            UI.addUndo({
                action: 'delete_folder',
                description: `已删除文件夹 "${folder.name}"`,
                data: deletedFolder,
                undoFunction: async (data) => {
                    // 撤销删除：重新创建文件夹
                    try {
                        const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=create_folder`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-auth-token': pwd
                            },
                            body: JSON.stringify({
                                name: data.name,
                                parentId: data.parentId
                            })
                        });

                        if (res.ok) {
                            await App.loadFolders();
                            UI.toast(`已撤销删除："${data.name}"`, "success");
                        } else {
                            throw new Error('恢复文件夹失败');
                        }
                    } catch (error) {
                        console.error('撤销删除文件夹失败:', error);
                        UI.toast('撤销删除文件夹失败: ' + error.message, "error");
                    }
                }
            });

        } catch (e) {
            console.error("删除文件夹错误:", e);
            UI.toast("删除文件夹失败: " + e.message, "error");
        }
    },

    /**
     * 重命名文件夹
     */
    renameFolder: async (folder) => {
        if (!folder || !folder.name) {
            UI.toast("无效的文件夹信息", "error");
            return;
        }

        if (folder.id === 'default') {
            UI.toast("不能重命名默认文件夹", "error");
            return;
        }

        const newName = prompt("请输入新的文件夹名称:", folder.name);
        
        if (newName === null) return;
        if (!newName.trim()) {
            UI.toast("文件夹名称不能为空", "error");
            return;
        }
        if (newName === folder.name) {
            UI.toast("文件夹名称未改变", "info");
            return;
        }

        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            UI.toast("请先登录", "error");
            return;
        }

        try {
            UI.toast("正在重命名文件夹...", "info");

            const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=rename_folder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': pwd
                },
                body: JSON.stringify({ folderId: folder.id, newName: App.sanitizeInput(newName.trim()) })
            });

            if (res.status === 401) {
                localStorage.removeItem('cc_pwd');
                UI.toast("密码已失效，请重新登录", "error");
                setTimeout(() => location.reload(), 1500);
                return;
            }

            if (!res.ok) {
                const message = await App.readErrorMessage(res);
                throw new Error(message || `HTTP ${res.status}`);
            }

            const json = await res.json();
            if (!json.success) {
                throw new Error(json.error || '重命名文件夹失败');
            }

            await App.loadFolders();
            UI.toast("文件夹重命名成功", "success");

        } catch (e) {
            console.error("重命名文件夹错误:", e);
            UI.toast("重命名文件夹失败: " + e.message, "error");
        }
    },

    /**
     * 移动文件到指定文件夹
     */
    moveFile: async (file, index) => {
        if (!file || !file.name) {
            UI.toast("无效的文件信息", "error");
            return;
        }

        // 显示文件夹选择对话框
        const folderOptions = App.allFolders.map(folder => {
            return { value: folder.id, label: folder.name };
        });

        // 构建选择对话框
        const dialogContent = `
            <div style="padding: 20px;">
                <h3 style="margin-top: 0;">移动文件到文件夹</h3>
                <p style="margin-bottom: 15px;">选择目标文件夹:</p>
                <select id="targetFolderSelect" style="width: 100%; padding: 10px; border-radius: 8px; border: 1.5px solid rgba(124, 58, 237, 0.2);">
                    ${folderOptions.map(option => 
                        `<option value="${option.value}" ${App.selectedFolder && App.selectedFolder.id === option.value ? 'selected' : ''}>${option.label}</option>`
                    ).join('')}
                </select>
                <div style="margin-top: 20px; text-align: right;">
                    <button id="cancelMoveBtn" style="margin-right: 10px; padding: 10px 20px; border: none; border-radius: 8px; background: rgba(124, 58, 237, 0.1); color: var(--text-secondary); cursor: pointer;">取消</button>
                    <button id="confirmMoveBtn" style="padding: 10px 20px; border: none; border-radius: 8px; background: var(--crystal-primary); color: white; cursor: pointer;">移动</button>
                </div>
            </div>
        `;

        // 创建对话框
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box glass-effect" style="width: 400px; max-width: 90%;">
                ${dialogContent}
            </div>
        `;

        document.body.appendChild(overlay);

        // 事件处理
        const cancelBtn = overlay.querySelector('#cancelMoveBtn');
        const confirmBtn = overlay.querySelector('#confirmMoveBtn');
        const selectEl = overlay.querySelector('#targetFolderSelect');

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

        confirmBtn.addEventListener('click', async () => {
            const targetFolderId = selectEl.value;
            if (!targetFolderId) {
                UI.toast("请选择目标文件夹", "error");
                return;
            }

            overlay.remove();
            await App.performMoveFile(file, index, targetFolderId);
        });

        // 点击模态框外部关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    },

    /**
     * 执行文件移动操作
     */
    performMoveFile: async (file, index, targetFolderId) => {
        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            UI.toast("请先登录", "error");
            return;
        }

        try {
            UI.toast("正在移动文件...", "info");

            const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=move_file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': pwd
                },
                body: JSON.stringify({ fileId: file.id, index, folderId: targetFolderId })
            });

            if (res.status === 401) {
                localStorage.removeItem('cc_pwd');
                UI.toast("密码已失效，请重新登录", "error");
                setTimeout(() => location.reload(), 1500);
                return;
            }

            if (!res.ok) {
                const message = await App.readErrorMessage(res);
                throw new Error(message || `HTTP ${res.status}`);
            }

            const json = await res.json();
            if (!json.success) {
                throw new Error(json.error || '移动文件失败');
            }

            // 重新加载文件列表
            await App.loadFiles();

            // 获取目标文件夹名称
            const targetFolder = App.allFolders.find(folder => folder.id === targetFolderId);
            UI.toast(`文件已移动到 "${targetFolder ? targetFolder.name : '未知文件夹'}"`, "success");

        } catch (e) {
            console.error("移动文件错误:", e);
            UI.toast("移动文件失败: " + e.message, "error");
        }
    },

    /**
     * 登录流程
     */
    loginFlow: async () => {
        // 重定向到登录页面
        window.location.href = 'login.html';
    },

    /**
     * 加载文件列表
     */
    loadFiles: async () => {
        const pwd = localStorage.getItem('cc_pwd');
        const tbody = document.getElementById('fileTableBody');

        if (!pwd) {
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ff6b6b;">🔒 请先登录</td></tr>';
            }
            return;
        }

        try {
            const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=load_files`, {
                method: 'GET',
                headers: { 'x-auth-token': pwd }
            });

            // 处理未授权
            if (res.status === 401) {
                localStorage.removeItem('cc_pwd');
                UI.toast("密码已失效，请重新登录", "error");
                setTimeout(() => location.reload(), 1500);
                return;
            }

            if (!res.ok) {
                const message = await App.readErrorMessage(res);
                throw new Error(message || `HTTP ${res.status}`);
            }

            const json = await res.json();

            if (!json.success) {
                throw new Error(json.error || '加载失败');
            }

            // 过滤有效文件并存储所有文件
            App.allFiles = (json.data || []).filter(item => item && item.cid && item.name);

            // 使用新的过滤系统
            App.filterFiles();
            
            // 更新存储空间统计
            App.updateStorageStatistics();

            App.syncVerifyRetryTimers();

        } catch (e) {
            console.error("加载文件失败:", e);
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center; color:#ff6b6b;">
                            加载失败: ${e.message}<br>
                            <button onclick="App.loadFiles()" style="margin-top:10px; padding:5px 15px; cursor:pointer;">重试</button>
                        </td>
                    </tr>
                `;
            }
            UI.toast("加载文件列表失败", "error");
        }
    },

    /**
     * 计算存储空间使用情况
     */
    calculateStorageUsage: () => {
        // 计算总文件大小
        const totalSize = App.allFiles.reduce((acc, file) => acc + (file.size || 0), 0);
        // 计算文件数量
        const totalFiles = App.allFiles.length;
        // 计算文件夹数量
        const totalFolders = App.allFolders.length;
        
        return {
            totalSize,
            totalFiles,
            totalFolders
        };
    },

    /**
     * 格式化文件大小
     */
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * 更新存储空间统计显示
     */
    updateStorageStatistics: () => {
        const storageStats = App.calculateStorageUsage();
        const { totalSize, totalFiles, totalFolders } = storageStats;
        
        // 查找或创建存储空间统计元素
        let statsContainer = document.getElementById('storageStatistics');
        
        if (!statsContainer) {
            // 创建存储空间统计容器
            statsContainer = document.createElement('div');
            statsContainer.id = 'storageStatistics';
            statsContainer.className = 'storage-statistics glass-effect';
            
            // 插入到页面合适位置
            const mainContainer = document.querySelector('.main-container');
            if (mainContainer) {
                mainContainer.insertBefore(statsContainer, mainContainer.firstChild);
            }
        }
        
        // 更新统计内容
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${totalFiles}</div>
                    <div class="stat-label">文件总数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalFolders}</div>
                    <div class="stat-label">文件夹总数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${App.formatFileSize(totalSize)}</div>
                    <div class="stat-label">总存储空间</div>
                </div>
            </div>
        `;
    },

    /**
     * 删除文件
     */
    deleteFile: async (targetItem, index) => {
        if (!targetItem || !targetItem.name) {
            UI.toast("无效的文件信息", "error");
            return;
        }

        // 使用新的确认对话框
        const confirmed = await UI.confirm(
            `确定要删除 "${targetItem.name}" 吗？<br><br>注意: 这只会删除记录，文件仍在 IPFS 上。`,
            {
                title: "删除文件确认",
                confirmText: "删除",
                confirmClass: "danger"
            }
        );

        if (!confirmed) {
            return;
        }

        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            UI.toast("请先登录", "error");
            return;
        }

        // 保存文件信息用于撤销
        const deletedFile = { ...targetItem, index };

        try {
            UI.toast("正在删除...", "info");

            const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=delete_file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': pwd
                },
                body: JSON.stringify({ fileId: targetItem.id, index })
            });

            if (res.status === 401) {
                localStorage.removeItem('cc_pwd');
                UI.toast("密码已失效，请重新登录", "error");
                setTimeout(() => location.reload(), 1500);
                return;
            }

            if (!res.ok) {
                const message = await App.readErrorMessage(res);
                throw new Error(message || `HTTP ${res.status}`);
            }

            const json = await res.json();

            if (!json.success) {
                throw new Error(json.error || '删除失败');
            }

            UI.toast("删除成功！", "success");
            await App.loadFiles();

            // 添加撤销操作
            UI.addUndo({
                action: 'delete_file',
                description: `已删除文件 "${targetItem.name}"`,
                data: deletedFile,
                undoFunction: async (data) => {
                    // 撤销删除：重新添加文件记录
                    try {
                        const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=save_file`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-auth-token': pwd
                            },
                            body: JSON.stringify(data)
                        });

                        if (res.ok) {
                            await App.loadFiles();
                            UI.toast(`已撤销删除："${data.name}"`, "success");
                        } else {
                            throw new Error('恢复文件记录失败');
                        }
                    } catch (error) {
                        console.error('撤销删除失败:', error);
                        UI.toast('撤销删除失败: ' + error.message, "error");
                    }
                }
            });

        } catch (e) {
            console.error("删除文件错误:", e);
            UI.toast("删除失败: " + e.message, "error");
        }
    },

    /**
     * 重命名文件
     */
    renameFile: async (targetItem, index) => {
        if (!targetItem || !targetItem.name) {
            UI.toast("无效的文件信息", "error");
            return;
        }

        const newName = await UI.promptRename(targetItem.name, { title: '重命名文件' });
        
        if (newName === null) return;
        if (!newName.trim()) {
            UI.toast("文件名不能为空", "error");
            return;
        }
        if (newName === targetItem.name) {
            UI.toast("文件名未改变", "info");
            return;
        }

        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            UI.toast("请先登录", "error");
            return;
        }

        try {
            UI.toast("正在重命名...", "info");

            const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=rename_file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': pwd
                },
                body: JSON.stringify({ fileId: targetItem.id, index, newName: App.sanitizeInput(newName) })
            });

            if (res.status === 401) {
                localStorage.removeItem('cc_pwd');
                UI.toast("密码已失效，请重新登录", "error");
                setTimeout(() => location.reload(), 1500);
                return;
            }

            if (!res.ok) {
                const message = await App.readErrorMessage(res);
                throw new Error(message || `HTTP ${res.status}`);
            }

            const json = await res.json();

            if (!json.success) {
                throw new Error(json.error || '重命名失败');
            }

            UI.toast("重命名成功！", "success");
            await App.loadFiles();

        } catch (e) {
            console.error("重命名文件错误:", e);
            UI.toast("重命名失败: " + e.message, "error");
        }
    },

    /**
     * 传播文件到公共网关
     */
    propagateFile: async (targetItem) => {
        if (!targetItem || !targetItem.cid) {
            UI.toast("无效的文件信息", "error");
            return;
        }

        try {
            UI.toast("正在传播到公共网关...", "info");

            const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=propagate_file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': localStorage.getItem('cc_pwd')
                },
                body: JSON.stringify({
                    cid: targetItem.cid
                })
            });

            if (!res.ok) {
                const message = await App.readErrorMessage(res);
                throw new Error(message || `HTTP ${res.status}`);
            }

            const json = await res.json();
            
            if (json.error) {
                throw new Error(json.error || '传播失败');
            }

            // 显示传播结果摘要
            const summary = json.summary;
            UI.toast(`传播完成！成功: ${summary.success}, 失败: ${summary.failed}`, "success");

        } catch (e) {
            console.error("传播文件错误:", e);
            UI.toast("传播失败: " + e.message, "error");
        }
    },

    downloadFile: async (targetItem) => {
        if (!targetItem || !targetItem.cid) {
            UI.toast("无效的文件信息", "error");
            return;
        }
        await UI.showGatewayModal(targetItem.cid, targetItem.name || 'download');
    },

    getFileVerifyLabel: (file) => {
        const status = (file?.verify_status || '').toLowerCase();
        if (file?.verified === true || status === 'ok') {
            return { text: '已可用', className: 'verify-ok', title: file?.verify_message || '已通过验证' };
        }
        if (status === 'verifying') {
            return { text: '校验中', className: 'verify-verifying', title: file?.verify_message || '正在验证' };
        }
        if (status === 'failed') {
            return { text: '失败', className: 'verify-failed', title: file?.verify_message || '验证失败' };
        }
        if (status === 'pending') {
            return { text: '等待可用', className: 'verify-pending', title: file?.verify_message || '等待网关可用' };
        }
        return { text: '未知', className: 'verify-unknown', title: '未记录验证状态' };
    },

    updateFilePatch: async (fileId, patch) => {
        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) throw new Error('请先登录');

        const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=update_file`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': pwd
            },
            body: JSON.stringify({ fileId, patch })
        });

        if (res.status === 401) {
            localStorage.removeItem('cc_pwd');
            throw new Error('密码已失效');
        }
        if (!res.ok) {
            const message = await App.readErrorMessage(res);
            throw new Error(message || `HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!json.success) throw new Error(json.error || '更新失败');
        return json.data;
    },

    verifyRetryTimers: new Map(),
    verifyRetryStateKey: 'cc_verify_retry_state_v1',

    getAutoVerifyRetryConfig: () => {
        const cfg = CONFIG?.INTEGRITY_CHECK || {};
        return {
            enabled: cfg?.AUTO_VERIFY_RETRY_ENABLED !== false,
            maxAttempts: Math.max(1, Number(cfg?.AUTO_VERIFY_RETRY_MAX_ATTEMPTS) || 6),
            baseDelayMs: Math.max(500, Number(cfg?.AUTO_VERIFY_RETRY_BASE_DELAY_MS) || 3000),
            maxDelayMs: Math.max(2000, Number(cfg?.AUTO_VERIFY_RETRY_MAX_DELAY_MS) || 120000),
            jitterMs: Math.max(0, Number(cfg?.AUTO_VERIFY_RETRY_JITTER_MS) || 800),
            retryFailedWindowMs: Math.max(0, Number(cfg?.AUTO_VERIFY_RETRY_FAILED_WINDOW_MS) || 24 * 60 * 60 * 1000),
            verifyingStuckWindowMs: Math.max(10000, Number(cfg?.AUTO_VERIFY_RETRY_VERIFYING_STUCK_WINDOW_MS) || 3 * 60 * 1000)
        };
    },

    loadVerifyRetryState: () => {
        try {
            const raw = localStorage.getItem(App.verifyRetryStateKey);
            if (!raw) return {};
            const json = JSON.parse(raw);
            return (json && typeof json === 'object') ? json : {};
        } catch {
            return {};
        }
    },

    saveVerifyRetryState: (state) => {
        try {
            localStorage.setItem(App.verifyRetryStateKey, JSON.stringify(state || {}));
        } catch {}
    },

    cancelVerifyRetry: (fileId) => {
        try {
            const t = App.verifyRetryTimers.get(String(fileId));
            if (t) clearTimeout(t);
            App.verifyRetryTimers.delete(String(fileId));
        } catch {}
    },

    shortenErrorMessage: (msg, maxLen = 160) => {
        const s = String(msg || '').replace(/\s+/g, ' ').trim();
        if (!s) return '';
        return s.length > maxLen ? (s.slice(0, maxLen - 1) + '…') : s;
    },

    computeVerifyRetryDelayMs: (attemptNumber) => {
        const cfg = App.getAutoVerifyRetryConfig();
        const exp = Math.max(0, Number(attemptNumber) - 1);
        const raw = cfg.baseDelayMs * Math.pow(2, exp);
        const capped = Math.min(cfg.maxDelayMs, Math.max(cfg.baseDelayMs, raw));
        const jitter = cfg.jitterMs > 0 ? Math.floor(Math.random() * cfg.jitterMs) : 0;
        return capped + jitter;
    },

    formatDelaySeconds: (ms) => {
        const sec = Math.max(1, Math.round(Number(ms) / 1000));
        return `${sec} 秒`;
    },

    scheduleVerifyRetry: async (targetItem, options = {}) => {
        const cfg = App.getAutoVerifyRetryConfig();
        if (!cfg.enabled) return;
        if (!targetItem || !targetItem.cid || !targetItem.id) return;

        const fileId = String(targetItem.id);
        const updatePatch = typeof options.updatePatch === 'function'
            ? options.updatePatch
            : (patch) => App.updateFilePatch(targetItem.id, patch);

        const state = App.loadVerifyRetryState();
        const prev = state[fileId] && typeof state[fileId] === 'object' ? state[fileId] : {};
        const attemptsMade = Math.max(0, Number(options.attemptsMade ?? prev.attemptsMade ?? 0));
        const maxAttempts = Math.max(1, Number(options.maxAttempts ?? prev.maxAttempts ?? cfg.maxAttempts));
        if (attemptsMade >= maxAttempts) return;

        const nextAttempt = attemptsMade + 1;
        const delayMs = App.computeVerifyRetryDelayMs(nextAttempt);
        const nextAt = Date.now() + delayMs;

        state[fileId] = {
            attemptsMade,
            maxAttempts,
            nextAt,
            cid: String(targetItem.cid),
            hash: targetItem.hash ? String(targetItem.hash) : (prev.hash ? String(prev.hash) : null),
            lastError: options.lastError ? String(options.lastError).slice(0, 500) : (prev.lastError || null)
        };
        App.saveVerifyRetryState(state);

        const shortErr = App.shortenErrorMessage(options.lastError || prev.lastError, 140);
        const msgPrefix = shortErr ? `自动重试排队：${shortErr}。` : '自动重试排队中。';
        await updatePatch({
            verified: false,
            verify_status: 'pending',
            verify_message: `${msgPrefix}${App.formatDelaySeconds(delayMs)}后重试 (${nextAttempt}/${maxAttempts})`
        });

        App.cancelVerifyRetry(fileId);
        const timeoutId = setTimeout(() => {
            void App.runScheduledVerifyRetry(fileId);
        }, Math.max(0, delayMs));
        App.verifyRetryTimers.set(fileId, timeoutId);
    },

    runScheduledVerifyRetry: async (fileId) => {
        const cfg = App.getAutoVerifyRetryConfig();
        if (!cfg.enabled) return;

        const id = String(fileId);
        const state = App.loadVerifyRetryState();
        const entry = state[id] && typeof state[id] === 'object' ? state[id] : null;
        if (!entry || !entry.cid) return;

        const current = Array.isArray(App.allFiles) ? App.allFiles.find(f => String(f?.id) === id) : null;
        if (!current) {
            delete state[id];
            App.saveVerifyRetryState(state);
            App.cancelVerifyRetry(id);
            return;
        }

        const status = String(current?.verify_status || '').toLowerCase();
        if (current?.verified === true || status === 'ok') {
            delete state[id];
            App.saveVerifyRetryState(state);
            App.cancelVerifyRetry(id);
            return;
        }

        if (status === 'verifying') {
            const delayMs = Math.min(15000, App.computeVerifyRetryDelayMs(Math.max(1, Number(entry.attemptsMade) + 1)));
            App.cancelVerifyRetry(id);
            const timeoutId = setTimeout(() => {
                void App.runScheduledVerifyRetry(id);
            }, delayMs);
            App.verifyRetryTimers.set(id, timeoutId);
            return;
        }

        const attemptsMade = Math.max(0, Number(entry.attemptsMade || 0));
        const maxAttempts = Math.max(1, Number(entry.maxAttempts || cfg.maxAttempts));
        const nextAttempt = attemptsMade + 1;
        if (attemptsMade >= maxAttempts) {
            delete state[id];
            App.saveVerifyRetryState(state);
            App.cancelVerifyRetry(id);
            return;
        }

        const updatePatch = (patch) => App.updateFilePatch(current.id, patch);

        try {
            await updatePatch({
                verified: false,
                verify_status: 'verifying',
                verify_message: `自动重试校验中... (${nextAttempt}/${maxAttempts})`
            });

            try {
                void App.secureFetch(`${CONFIG.API_DB_PROXY}?action=propagate_file`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': localStorage.getItem('cc_pwd')
                    },
                    body: JSON.stringify({ cid: entry.cid })
                });
            } catch {}

            // 从后端拉取验证状态并触发重新验证
            const pwd = localStorage.getItem('cc_pwd');
            if (!pwd) {
                throw new Error('未登录');
            }

            // 调用后端验证接口
            const verifyRes = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=verify_file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': pwd
                },
                body: JSON.stringify({ 
                    fileId: current.id, 
                    cid: entry.cid, 
                    hash: current.hash || entry.hash 
                })
            });

            if (!verifyRes.ok) {
                throw new Error(`后端验证失败: ${verifyRes.status}`);
            }

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
                await updatePatch({
                    verified: true,
                    verify_status: 'ok',
                    verify_message: verifyData.message || '后端验证成功'
                });
                delete state[id];
                App.saveVerifyRetryState(state);
                App.cancelVerifyRetry(id);
                void App.loadFiles();
                return;
            } else {
                throw new Error(verifyData.error || '后端验证失败');
            }
        } catch (e) {
            const err = e?.message || '自动重试异常';
            const permanent = typeof err === 'string' && err.includes('哈希不匹配');
            const newAttemptsMade = nextAttempt;
            state[id] = { ...entry, attemptsMade: newAttemptsMade, lastError: String(err).slice(0, 500) };
            App.saveVerifyRetryState(state);

            if (permanent || newAttemptsMade >= maxAttempts) {
                try {
                    await App.updateFilePatch(current.id, {
                        verified: false,
                        verify_status: 'failed',
                        verify_message: permanent ? err : `自动重试已达上限：${App.shortenErrorMessage(err, 180)}`
                    });
                } catch {}
                delete state[id];
                App.saveVerifyRetryState(state);
                App.cancelVerifyRetry(id);
            } else {
                await App.scheduleVerifyRetry(current, { attemptsMade: newAttemptsMade, maxAttempts, lastError: err });
            }
            void App.loadFiles();
        }
    },

    syncVerifyRetryTimers: () => {
        const cfg = App.getAutoVerifyRetryConfig();
        if (!cfg.enabled) return;

        const state = App.loadVerifyRetryState();
        let changed = false;
        const now = Date.now();
        const files = Array.isArray(App.allFiles) ? App.allFiles : [];
        const fileById = new Map(files.map(f => [String(f?.id), f]));

        for (const [fileId, entry] of Object.entries(state)) {
            const f = fileById.get(String(fileId));
            const status = String(f?.verify_status || '').toLowerCase();
            if (!f || f?.verified === true || status === 'ok') {
                delete state[fileId];
                App.cancelVerifyRetry(fileId);
                changed = true;
                continue;
            }
            if (f?.verified == null) {
                delete state[fileId];
                App.cancelVerifyRetry(fileId);
                changed = true;
                continue;
            }

            const nextAt = Math.max(now, Number(entry?.nextAt || now));
            const delayMs = Math.max(0, nextAt - now);
            App.cancelVerifyRetry(fileId);
            const timeoutId = setTimeout(() => {
                void App.runScheduledVerifyRetry(fileId);
            }, delayMs);
            App.verifyRetryTimers.set(String(fileId), timeoutId);
        }

        for (const f of files) {
            const id = String(f?.id);
            if (!id || state[id]) continue;
            const status = String(f?.verify_status || '').toLowerCase();
            if (f?.verified !== false) continue;
            if (status === 'verifying') {
                const uploadedAt = Number(f?.uploadedAt || 0);
                if (uploadedAt && now - uploadedAt >= cfg.verifyingStuckWindowMs) {
                    void App.scheduleVerifyRetry(f, { attemptsMade: 0, maxAttempts: cfg.maxAttempts, lastError: '校验超时，自动重试' }).catch(() => {});
                }
                continue;
            }
            if (status !== 'pending' && status !== 'failed') continue;
            if (status === 'failed') {
                const uploadedAt = Number(f?.uploadedAt || 0);
                if (!uploadedAt || now - uploadedAt > cfg.retryFailedWindowMs) continue;
            }
            void App.scheduleVerifyRetry(f, { attemptsMade: 0, maxAttempts: cfg.maxAttempts, lastError: f?.verify_message || '' }).catch(() => {});
        }

        if (changed) App.saveVerifyRetryState(state);
    },

    retryVerifyFile: async (targetItem) => {
        if (!targetItem || !targetItem.cid) {
            UI.toast("无效的文件信息", "error");
            return;
        }

        try {
            App.cancelVerifyRetry(targetItem.id);
            const state = App.loadVerifyRetryState();
            delete state[String(targetItem.id)];
            App.saveVerifyRetryState(state);

            UI.toast("开始重试校验...", "info");
            await App.updateFilePatch(targetItem.id, {
                verified: false,
                verify_status: 'verifying',
                verify_message: '手动重试校验中...'
            });

            try {
                void App.secureFetch(`${CONFIG.API_DB_PROXY}?action=propagate_file`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': localStorage.getItem('cc_pwd')
                    },
                    body: JSON.stringify({ cid: targetItem.cid })
                });
            } catch {}

            const method = (CONFIG.INTEGRITY_CHECK.METHOD || 'head').toLowerCase();
            let result;
            if (method === 'full' && targetItem.hash) {
                result = await App.verifyFileIntegrity(targetItem.cid, targetItem.hash, Math.max(2, CONFIG.INTEGRITY_CHECK.MAX_RETRIES));
            } else {
                result = await App.verifyFileIntegrityFast(targetItem.cid, Math.max(2, CONFIG.INTEGRITY_CHECK.MAX_RETRIES));
            }

            if (result.success) {
                await App.updateFilePatch(targetItem.id, {
                    verified: true,
                    verify_status: 'ok',
                    verify_message: result.message || '验证成功'
                });
                UI.toast("校验成功", "success");
            } else {
                const err = result.error || '验证失败';
                const permanent = typeof err === 'string' && err.includes('哈希不匹配');
                if (permanent) {
                    await App.updateFilePatch(targetItem.id, {
                        verified: false,
                        verify_status: 'failed',
                        verify_message: err
                    });
                    UI.toast("校验失败: " + (err || ''), "error");
                } else {
                    await App.scheduleVerifyRetry(targetItem, { attemptsMade: 1, lastError: err });
                    UI.toast("校验未通过，已进入自动重试队列", "warning");
                }
            }

            await App.loadFiles();
        } catch (e) {
            console.error("重试校验失败:", e);
            UI.toast("重试校验失败: " + e.message, "error");
        }
    },

    repropagateFile: async (targetItem) => {
        if (!targetItem || !targetItem.cid) {
            UI.toast("无效的文件信息", "error");
            return;
        }
        try {
            UI.toast("正在重新传播到公共网关...", "info");
            await App.updateFilePatch(targetItem.id, {
                verify_status: 'pending',
                verify_message: '已触发传播，等待网关可用...'
            });
            await App.propagateFile(targetItem);
            await App.loadFiles();
        } catch (e) {
            console.error("重新传播失败:", e);
            UI.toast("重新传播失败: " + e.message, "error");
        }
    },

    /**
     * 处理文件选择
     */
    handleFileSelect: (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // 验证所有文件大小
        const invalidFiles = files.filter(file => file.size > App.MAX_FILE_SIZE);
        if (invalidFiles.length > 0) {
            UI.toast(`部分文件过大，最大支持 ${App.MAX_FILE_SIZE_TEXT}`, "error");
            return;
        }

        App.uploadFiles = files;

        // 更新 UI
        const uploadStatusBox = document.getElementById('upload-status-box');
        const startBtn = document.getElementById('startBtn');
        const fileName = document.getElementById('file-name');

        if (uploadStatusBox) {
            uploadStatusBox.hidden = false;
            uploadStatusBox.style.display = '';
        }
        if (startBtn) {
            startBtn.hidden = true;
            startBtn.style.display = '';
        }
        
        if (fileName) {
            if (files.length === 1) {
                fileName.textContent = files[0].name;
            } else {
                fileName.textContent = `${files.length} 个文件`;
            }
        }

        // 重置进度
        App.updateUploadProgress(0, `已选择 ${files.length} 个文件，准备上传...`);

        if (App.autoUpload && !App.isUploading) {
            App.updateUploadProgress(0, `已选择 ${files.length} 个文件，正在自动上传...`);
            Promise.resolve()
                .then(() => App.startUpload())
                .catch((err) => UI.toast(err?.message || "自动上传失败", "error"));
        } else if (startBtn) {
            startBtn.hidden = false;
        }
    },

    /**
     * 更新上传进度
     */
    updateUploadProgress: (percent, statusText) => {
        const percentText = document.getElementById('percent-text');
        const progressBar = document.getElementById('progress-bar');
        const statusEl = document.getElementById('status-text');

        // 确保进度值在合理范围内
        const safePercent = Math.max(0, Math.min(100, percent));
        
        if (percentText) percentText.textContent = `${Math.round(safePercent)}%`;
        if (progressBar) progressBar.style.width = `${safePercent}%`;
        if (statusEl) statusEl.textContent = statusText;
    },

    /**
     * 计算文件哈希
     */
    calculateFileHash: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const buffer = e.target.result;
                    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    resolve(hashHex);
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * 快速验证文件完整性（HEAD 请求）
     * 适用于大文件验证，速度更快
     */
    verifyFileIntegrityFast: async (cid, maxRetries = 2) => {
        const sourceGateways = Array.isArray(UI?.currentGateways) && UI.currentGateways.length > 0
            ? UI.currentGateways
            : (Array.isArray(CONFIG.DEFAULT_GATEWAYS) ? CONFIG.DEFAULT_GATEWAYS : []);
        const gateways = [
            ...sourceGateways.map(g => ({ name: g?.name || 'Gateway', base: g?.url })),
            { name: 'IPFS.io', base: 'https://ipfs.io/ipfs/' }
        ]
            .filter(g => typeof g.base === 'string' && g.base.includes('/ipfs/'))
            .filter((g, idx, arr) => arr.findIndex(x => x.base === g.base) === idx);

        if (gateways.length === 0) {
            return { success: false, error: '验证失败：未配置可用网关' };
        }

        const preferredGatewayBase = localStorage.getItem('cc_preferred_gateway_base');
        const preferredGateways = preferredGatewayBase
            ? gateways.filter(g => g.base === preferredGatewayBase)
            : [];
        const restGateways = preferredGatewayBase
            ? gateways.filter(g => g.base !== preferredGatewayBase)
            : gateways;
        const orderedGateways = [...preferredGateways, ...restGateways];

        const headTimeout = CONFIG.INTEGRITY_CHECK.HEAD_TIMEOUT;
        const parallel = Math.max(1, Math.min(8, Number(CONFIG.INTEGRITY_CHECK.PARALLEL_GATEWAYS) || 3));
        const rangeFallback = CONFIG.INTEGRITY_CHECK.RANGE_FALLBACK !== false;
        const rangeParallel = Math.max(1, Math.min(6, Number(CONFIG.INTEGRITY_CHECK.RANGE_PARALLEL) || 2));

        try {
            const profile = (localStorage.getItem('cc_network_profile') || 'AUTO').toUpperCase();
            const safeGateways = gateways.slice(0, 12).map(g => ({ name: String(g.name || 'Gateway').slice(0, 40), base: String(g.base || '').slice(0, 220) }));
            const params = new URLSearchParams({
                cid: String(cid),
                method: 'auto',
                maxRetries: String(maxRetries),
                timeoutMs: String(headTimeout),
                parallel: String(parallel),
                rangeFallback: rangeFallback ? '1' : '0',
                rangeParallel: String(rangeParallel),
                profile: (profile === 'CN' || profile === 'INTL' || profile === 'AUTO') ? profile : 'AUTO',
                gateways: JSON.stringify(safeGateways)
            });
            const res = await fetch(`/api/ipfs_verify?${params.toString()}`, { cache: 'no-store' });
            const json = await res.json().catch(() => null);
            if (json && json.success) {
                if (json?.data?.gateway?.base) {
                    try { localStorage.setItem('cc_preferred_gateway_base', json.data.gateway.base); } catch {}
                }
                return { success: true, message: json.message || '文件存在验证成功' };
            }
            if (json && json.success === false && json.error) {
                return { success: false, error: json.error };
            }
        } catch {}

        const headCheck = async (g) => {
            const url = `${g.base}${cid}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), headTimeout);
            try {
                const res = await fetch(url, { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
                return { ok: res.ok, status: res.status, gateway: g, controller };
            } catch (e) {
                return { ok: false, error: e, gateway: g, controller };
            } finally {
                clearTimeout(timeoutId);
            }
        };

        const rangeCheck = async (g) => {
            const url = `${g.base}${cid}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), headTimeout);
            try {
                const res = await fetch(url, {
                    method: 'GET',
                    signal: controller.signal,
                    cache: 'no-store',
                    headers: { Range: 'bytes=0-0' }
                });
                const ok = res.ok || res.status === 206;
                return { ok, status: res.status, gateway: g, controller };
            } catch (e) {
                return { ok: false, error: e, gateway: g, controller };
            } finally {
                clearTimeout(timeoutId);
            }
        };

        const parallelFirstSuccess = async (gatewaysToTry, checker) => {
            const controllers = [];
            let settled = 0;
            let resolved = false;
            const errors = [];

            return await new Promise((resolve) => {
                const runOne = async (g) => {
                    const result = await checker(g);
                    controllers.push(result.controller);
                    settled++;
                    if (!resolved && result.ok) {
                        resolved = true;
                        for (const c of controllers) {
                            try { c.abort(); } catch {}
                        }
                        localStorage.setItem('cc_preferred_gateway_base', result.gateway.base);
                        resolve({ success: true, gateway: result.gateway, status: result.status });
                        return;
                    }

                    const errMsg = result.error
                        ? (result.error?.name === 'AbortError' ? '超时' : (result.error?.message || '错误'))
                        : `HTTP ${result.status}`;
                    errors.push(`${result.gateway.name}: ${errMsg}`);

                    if (settled === gatewaysToTry.length && !resolved) {
                        resolve({ success: false, errors });
                    }
                };

                for (const g of gatewaysToTry) {
                    runOne(g);
                }
            });
        };

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const headGateways = orderedGateways.slice(0, parallel);
            const headResult = await parallelFirstSuccess(headGateways, headCheck);
            if (headResult.success) {
                return { success: true, message: `文件存在验证成功 (${headResult.gateway.name}, 尝试 ${attempt}/${maxRetries})` };
            }

            let rangeErrors = [];
            if (rangeFallback) {
                const rangeGateways = orderedGateways.slice(0, Math.max(parallel, rangeParallel));
                const rangeResult = await parallelFirstSuccess(rangeGateways.slice(0, rangeParallel), rangeCheck);
                if (rangeResult.success) {
                    return { success: true, message: `文件存在验证成功 (${rangeResult.gateway.name}, 尝试 ${attempt}/${maxRetries})` };
                }
                rangeErrors = rangeResult.errors || [];
            }

            if (attempt === maxRetries) {
                const headErrs = headResult.errors || [];
                const combined = [...headErrs, ...rangeErrors].filter(Boolean);
                return { success: false, error: `验证失败 (尝试 ${attempt}/${maxRetries})：${combined.slice(0, 8).join('；')}` };
            }

            await new Promise(resolve => setTimeout(resolve, 600));
        }

        return { success: false, error: '验证失败：超过最大重试次数' };
    },

    /**
     * 完整哈希验证（备用方案）
     * 用于需要严格验证的场景
     */
    verifyFileIntegrity: async (cid, originalHash, maxRetries = 3) => {
        const verifyUrl = `https://ipfs.io/ipfs/${cid}`;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CONFIG.INTEGRITY_CHECK.FULL_TIMEOUT);

                const res = await fetch(verifyUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!res.ok) {
                    const message = await App.readErrorMessage(res);
                    throw new Error(message || `HTTP ${res.status}`);
                }

                const buffer = await res.arrayBuffer();
                const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                if (hashHex === originalHash) {
                    return { success: true, message: `哈希验证成功 (尝试 ${attempt}/${maxRetries})` };
                } else {
                    return {
                        success: false,
                        error: `哈希不匹配\n原始: ${originalHash.substring(0, 16)}...\n验证: ${hashHex.substring(0, 16)}...`
                    };
                }
            } catch (error) {
                if (attempt === maxRetries) {
                    return { success: false, error: `验证失败: ${error.message} (尝试 ${attempt}/${maxRetries})` };
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        return { success: false, error: '验证失败：超过最大重试次数' };
    },

    /**
     * 开始上传文件
     */
    startUpload: async (retryCount = 0) => {
        // 获取选中的文件
        let files = App.uploadFiles;
        
        if (files.length === 0) {
            const fileInput = document.getElementById('fileInput');
            if (fileInput && fileInput.files.length > 0) {
                files = Array.from(fileInput.files);
            } else {
                UI.toast("请先选择文件", "error");
                return;
            }
        }

        if (App.isUploading) {
            UI.toast("已有上传任务在进行中", "error");
            return;
        }

        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            App.loginFlow();
            return;
        }

        const btn = document.getElementById('startBtn');
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "🔑 获取授权...";
        App.isUploading = true;

        try {
            // 获取上传授权（一次授权用于所有文件）
            btn.innerText = "🔑 获取授权...";
            const tokenRes = await App.secureFetch(CONFIG.API_GET_TOKEN, {
                headers: { 'x-auth-token': pwd },
                cache: 'no-store'
            });

            if (tokenRes.status === 401) {
                localStorage.removeItem('cc_pwd');
                UI.toast("密码错误，请重新登录", "error");
                setTimeout(() => location.reload(), 1500);
                return;
            }

            if (!tokenRes.ok) {
                const errorData = await tokenRes.json().catch(() => ({}));
                throw new Error(errorData.error || `无法获取上传凭证 (HTTP ${tokenRes.status})`);
            }

            const tokenData = await tokenRes.json();
            let realToken = tokenData.token;

            if (!realToken) {
                throw new Error("后端未返回有效的 Token");
            }

            // 格式化 Token
            if (!realToken.startsWith('Basic ') && !realToken.startsWith('Bearer ')) {
                realToken = 'Basic ' + realToken;
            }

            // 逐个上传文件
            let successCount = 0;
            let failCount = 0;
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileIndex = i + 1;
                
                try {
                    const method = (CONFIG.INTEGRITY_CHECK.METHOD || 'head').toLowerCase();
                    const skipOverSize = Number(CONFIG.INTEGRITY_CHECK.SKIP_OVER_SIZE_BYTES) || 0;
                    const shouldSkipVerifyBySize = skipOverSize > 0 && file.size >= skipOverSize;
                    const effectiveMethod = (method === 'none' || shouldSkipVerifyBySize) ? 'none' : method;

                    let fileHash = null;
                    if (effectiveMethod === 'full') {
                        const overallProgress = Math.round((i / files.length) * 100);
                        App.updateUploadProgress(overallProgress, `正在计算哈希 ${fileIndex}/${files.length}：${file.name}`);
                        fileHash = await App.calculateFileHash(file);
                    }

                    // 1. 上传到 Crust
                    const overallProgress = Math.round((i / files.length) * 100);
                    App.updateUploadProgress(overallProgress, `正在上传第 ${fileIndex}/${files.length} 个文件：${file.name}`);

                    btn.innerText = `🚀 上传中 (${fileIndex}/${files.length})...`;
                    
                    // 提供更平滑的进度更新
                    const uploadStartProgress = overallProgress;
                    const uploadEndProgress = overallProgress + Math.round((1 / files.length) * 70); // 70% of per-file progress for upload
                    
                    // 上传前的准备状态
                    App.updateUploadProgress(uploadStartProgress, `准备上传第 ${fileIndex}/${files.length} 个文件：${file.name}`);
                    
                    // 模拟上传准备进度，提高用户感知速度
                    for (let j = 0; j < 3; j++) {
                        const prepProgress = uploadStartProgress + Math.round((j + 1) * (uploadEndProgress - uploadStartProgress) / 4);
                        App.updateUploadProgress(prepProgress, `正在连接上传服务器...`);
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }

                    // 执行实际上传
                    App.updateUploadProgress(uploadStartProgress + Math.round((uploadEndProgress - uploadStartProgress) * 0.3), `正在上传第 ${fileIndex}/${files.length} 个文件：${file.name}`);
                    const cid = await App.uploadToCrust(file, realToken);

                    // 上传完成，更新进度
                    App.updateUploadProgress(uploadEndProgress, `上传完成，正在保存文件记录...`);

                    // 2. 保存文件记录（先入库，避免校验失败导致“看不到文件”）
                    const record = {
                        id: Date.now() + i,
                        name: file.name,
                        size: file.size,
                        cid: cid,
                        date: new Date().toLocaleString(),
                        hash: fileHash,
                        verified: effectiveMethod === 'none' ? undefined : false,
                        verify_status: effectiveMethod === 'none' ? 'pending' : 'verifying',
                        uploadedAt: Date.now()
                    };

                    // 添加当前选中文件夹的ID到记录中
                    if (App.selectedFolder) {
                        record.folder_id = App.selectedFolder.id;
                    } else {
                        record.folder_id = 'default';
                    }

                    const saveRes = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=save_file`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': pwd
                        },
                        body: JSON.stringify(record)
                    });

                    if (saveRes.status === 401) {
                        localStorage.removeItem('cc_pwd');
                        throw new Error("密码已失效");
                    }

                    if (!saveRes.ok) {
                        throw new Error(`保存记录失败: HTTP ${saveRes.status}`);
                    }

                    const saveJson = await saveRes.json();
                    if (!saveJson.success) {
                        throw new Error(saveJson.error || '保存记录失败');
                    }

                    const updateVerify = async (patch) => {
                        try {
                            await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=update_file`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'x-auth-token': pwd
                                },
                                body: JSON.stringify({ fileId: record.id, patch })
                            });
                        } catch (e) {
                            console.error('更新校验状态失败:', e);
                        }
                    };

                    const triggerPropagate = () => {
                        try {
                            void App.secureFetch(`${CONFIG.API_DB_PROXY}?action=propagate_file`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'x-auth-token': pwd
                                },
                                body: JSON.stringify({ cid })
                            }).catch((e) => console.error('传播网关失败:', e));
                        } catch (e) {
                            console.error('传播网关失败:', e);
                        }
                    };

                    triggerPropagate();

                    if (effectiveMethod === 'none') {
                        await updateVerify({ verify_status: 'pending', verify_message: '已入库，等待网关可用' });
                        successCount++;
                        UI.toast(`第 ${fileIndex}/${files.length} 个文件已入库：${file.name}`, "success");
                        continue;
                    }

                    // 3. 后端验证（文件已入库，后端将自动进行验证）
                    const verifyProgress = overallProgress + Math.round((1 / files.length) * 100);
                    App.updateUploadProgress(verifyProgress, `文件已上传并入库，后端正在验证：${file.name}`);

                    // 通知后端进行文件验证
                    try {
                        await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=verify_file`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-auth-token': pwd
                            },
                            body: JSON.stringify({ fileId: record.id, cid, hash: fileHash })
                        });
                    } catch (e) {
                        console.error('通知后端验证失败:', e);
                        // 后端验证失败不影响前端流程，文件已入库
                    }

                    // 直接标记为上传成功，后端会处理验证
                    await updateVerify({ 
                        verified: false, 
                        verify_status: 'verifying', 
                        verify_message: '后端正在验证文件完整性...' 
                    });
                    successCount++;
                    UI.toast(`第 ${fileIndex}/${files.length} 个文件上传成功！后端正在验证完整性`, "success");
                    
                } catch (fileError) {
                    console.error(`文件 ${fileIndex}/${files.length} 上传失败:`, fileError);
                    UI.toast(`第 ${fileIndex}/${files.length} 个文件 ${file.name} 上传失败：${fileError.message}`, "error");
                    failCount++;
                    // 继续上传其他文件
                }
            }

            App.updateUploadProgress(100, `上传流程结束：成功 ${successCount}，失败 ${failCount}`);
            UI.toast(`成功上传 ${successCount}/${files.length} 个文件！🎉`, successCount > 0 ? "success" : "warning");

            btn.disabled = false;
            btn.innerText = originalText;
            App.isUploading = false;

            if (successCount > 0) {
                App.uploadFiles = [];
                document.getElementById('fileInput').value = '';

                setTimeout(async () => {
                    await App.loadFiles();
                    location.reload();
                }, 1500);
            }

        } catch (e) {
            console.error("上传错误:", e);
            await App.handleUploadError(e, retryCount, btn, originalText);
        }
    },

    /**
     * 上传文件到 Crust
     */
    uploadToCrust: (file, token) => {
        return new Promise((resolve, reject) => {
            if (file.size > App.MAX_FILE_SIZE) {
                reject(new Error(`文件过大，最大支持 ${App.MAX_FILE_SIZE_TEXT}`));
                return;
            }

            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);

            xhr.open('POST', CONFIG.CRUST_UPLOAD_API, true);
            xhr.setRequestHeader('Authorization', token);
            xhr.timeout = CONFIG.UPLOAD.TIMEOUT;

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    App.updateUploadProgress(percent, "正在直连上传...");
                }
            };

            xhr.onload = async () => {
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        const cid = data.Hash;

                        if (!cid) {
                            throw new Error("上传成功但未返回 CID");
                        }

                        resolve(cid);
                    } catch (e) {
                        reject(new Error(`${e.message}`));
                    }
                } else {
                    if (xhr.status === 413 || /payload too large|entity too large/i.test(xhr.responseText || '')) {
                        reject(new Error(`文件过大，最大支持 ${App.MAX_FILE_SIZE_TEXT}`));
                        return;
                    }

                    const responsePreview = (xhr.responseText || '').slice(0, 300);
                    reject(new Error(`上传失败 (${xhr.status}): ${responsePreview}`));
                }
            };

            xhr.onerror = () => {
                reject(new Error("网络错误：无法连接到 Crust 网关"));
            };

            xhr.ontimeout = () => {
                reject(new Error("上传超时，请检查网络连接或稍后重试"));
            };

            xhr.send(formData);
        });
    },

    /**
     * 处理上传错误
     */
    handleUploadError: async (error, retryCount, btn, originalText) => {
        const maxRetries = 2;

        if (retryCount < maxRetries) {
            const retryMsg = `上传失败，正在进行第 ${retryCount + 1} 次重试 (${retryCount + 1}/${maxRetries})...`;
            console.log(retryMsg);
            UI.toast(retryMsg, "warning");

            setTimeout(async () => {
                try {
                    await App.startUpload(retryCount + 1);
                } catch (retryError) {
                    console.error("重试失败:", retryError);
                    UI.toast(retryError.message, "error");
                    btn.disabled = false;
                    btn.innerText = originalText;
                    App.isUploading = false;
                }
            }, 2000);
        } else {
            UI.toast(`上传失败（已重试 ${maxRetries} 次）：${error.message}`, "error");
            btn.disabled = false;
            btn.innerText = originalText;
            App.isUploading = false;
        }
    },

    /**
     * 检查文件验证状态
     */
    checkFileVerificationStatus: async () => {
        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) return;

        try {
            const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=check_verification_status`, {
                headers: { 'x-auth-token': pwd }
            });

            if (!res.ok) {
                console.error('检查验证状态失败:', res.status);
                return;
            }

            const data = await res.json();
            if (data.success && data.failedFiles) {
                for (const file of data.failedFiles) {
                    await App.retryFailedUpload(file);
                }
            }
        } catch (e) {
            console.error('检查验证状态出错:', e);
        }
    },

    /**
     * 重试失败的上传
     */
    retryFailedUpload: async (file) => {
        if (App.isUploading) {
            console.log('已有上传任务在进行中，稍后重试');
            return;
        }

        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            console.log('请先登录');
            return;
        }

        try {
            UI.toast(`检测到验证失败的文件，正在重新上传：${file.name}`, "info");
            App.isUploading = true;

            // 获取上传授权
            const tokenRes = await App.secureFetch(CONFIG.API_GET_TOKEN, {
                headers: { 'x-auth-token': pwd },
                cache: 'no-store'
            });

            if (!tokenRes.ok) {
                throw new Error(`无法获取上传凭证`);
            }

            const tokenData = await tokenRes.json();
            const realToken = tokenData.token;

            if (!realToken) {
                throw new Error("后端未返回有效的 Token");
            }

            // 格式化 Token
            const formattedToken = realToken.startsWith('Basic ') || realToken.startsWith('Bearer ') 
                ? realToken 
                : 'Basic ' + realToken;

            // 创建一个模拟的文件对象（从后端获取文件数据）
            const fileDataRes = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=get_file_data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': pwd
                },
                body: JSON.stringify({ fileId: file.id })
            });

            if (!fileDataRes.ok) {
                throw new Error(`无法获取文件数据`);
            }

            const fileData = await fileDataRes.json();
            if (!fileData.success || !fileData.fileContent) {
                throw new Error(`文件数据获取失败`);
            }

            // 创建 Blob 对象
            const blob = new Blob([fileData.fileContent], { type: fileData.mimeType || 'application/octet-stream' });
            const retryFile = new File([blob], file.name, { type: fileData.mimeType || 'application/octet-stream' });

            // 上传到 Crust
            UI.toast(`正在重新上传文件：${file.name}`, "info");
            const newCid = await App.uploadToCrust(retryFile, formattedToken);

            // 更新文件记录
            const updateRes = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=update_file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': pwd
                },
                body: JSON.stringify({ 
                    fileId: file.id, 
                    patch: {
                        cid: newCid,
                        verified: false,
                        verify_status: 'verifying',
                        verify_message: '后端正在验证文件完整性...',
                        uploadedAt: Date.now()
                    }
                })
            });

            if (!updateRes.ok) {
                throw new Error(`更新文件记录失败`);
            }

            // 通知后端重新验证
            await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=verify_file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': pwd
                },
                body: JSON.stringify({ fileId: file.id, cid: newCid })
            });

            UI.toast(`文件重新上传成功：${file.name}`, "success");
            App.isUploading = false;

            // 刷新文件列表
            setTimeout(async () => {
                await App.loadFiles();
            }, 1000);

        } catch (e) {
            console.error(`文件 ${file.name} 重新上传失败:`, e);
            UI.toast(`文件 ${file.name} 重新上传失败：${e.message}`, "error");
            App.isUploading = false;
        }
    },

    /**
     * 初始化验证状态检查
     */
    initVerificationChecker: () => {
        // 每30秒检查一次验证状态
        setInterval(() => {
            App.checkFileVerificationStatus();
        }, 30000);

        // 初始检查
        setTimeout(() => {
            App.checkFileVerificationStatus();
        }, 5000);
    },

    /**
     * 验证 CID 格式
     */
    validateCid: (cid) => {
        if (!cid || typeof cid !== 'string') {
            return { valid: false, error: 'CID 不能为空' };
        }

        const cleanCid = cid.trim().replace(/^ipfs:\/\//i, '');
        const v0Pattern = /^Qm[a-zA-Z0-9]{44}$/;
        const v1Pattern = /^b[a-zA-Z0-9]{58}$/;
        const genericPattern = /^[a-zA-Z0-9]{44,59}$/;

        if (!v0Pattern.test(cleanCid) && !v1Pattern.test(cleanCid) && !genericPattern.test(cleanCid)) {
            return { valid: false, error: 'CID 格式不正确' };
        }

        return { valid: true, cid: cleanCid };
    },

    /**
     * 从 IPFS 网关获取文件名
     */
    fetchCidFileName: async (cid) => {
        const gateways = [
            'https://ipfs.io/ipfs/',
            'https://cloudflare-ipfs.com/ipfs/',
            'https://dweb.link/ipfs/',
            'https://cf-ipfs.com/ipfs/'
        ];

        for (const gateway of gateways) {
            try {
                const url = `${gateway}${cid}`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const response = await fetch(url, {
                    method: 'HEAD',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const contentDisposition = response.headers.get('Content-Disposition');
                    if (contentDisposition) {
                        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                        if (filenameMatch && filenameMatch[1]) {
                            const filename = filenameMatch[1].replace(/['"]/g, '');
                            if (filename && filename !== 'download') {
                                return filename;
                            }
                        }
                    }

                    const urlObj = new URL(url);
                    const pathname = urlObj.pathname;
                    const pathParts = pathname.split('/');
                    if (pathParts.length > 1) {
                        const potentialName = pathParts[pathParts.length - 1];
                        if (potentialName && potentialName !== cid) {
                            return potentialName;
                        }
                    }
                }
            } catch (e) {
                console.warn(`网关 ${gateway} 获取文件名失败:`, e);
                continue;
            }
        }

        return `ipfs-${cid.substring(0, 8)}...`;
    },

    /**
     * 获取文件大小（通过 HEAD 请求）
     */
    fetchCidFileSize: async (cid) => {
        const gateways = [
            'https://ipfs.io/ipfs/',
            'https://cloudflare-ipfs.com/ipfs/',
            'https://dweb.link/ipfs/'
        ];

        for (const gateway of gateways) {
            try {
                const url = `${gateway}${cid}`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const response = await fetch(url, {
                    method: 'HEAD',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const contentLength = response.headers.get('Content-Length');
                    if (contentLength) {
                        return parseInt(contentLength, 10);
                    }
                }
            } catch (e) {
                console.warn(`网关 ${gateway} 获取文件大小失败:`, e);
                continue;
            }
        }

        return 0;
    },

    /**
     * 添加 CID 文件到列表
     */
    addCidFile: async (cid, fileName = '', fileSize = 0) => {
        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            UI.toast('请先登录', 'error');
            return;
        }

        const validation = App.validateCid(cid);
        if (!validation.valid) {
            UI.toast(validation.error, 'error');
            return;
        }

        const cleanCid = validation.cid;

        const existingFile = App.allFiles.find(f => f.cid === cleanCid);
        if (existingFile) {
            UI.toast('该 CID 已存在于文件列表中', 'error');
            return;
        }

        UI.toast('正在添加文件...', 'info');

        try {
            let finalFileName = fileName.trim();
            if (!finalFileName) {
                UI.toast('正在获取文件信息...', 'info');
                finalFileName = await App.fetchCidFileName(cleanCid);
            }

            let finalFileSize = fileSize;
            if (finalFileSize === 0) {
                finalFileSize = await App.fetchCidFileSize(cleanCid);
            }

            const fileData = {
                id: Date.now(),
                cid: cleanCid,
                name: finalFileName,
                size: finalFileSize,
                uploadedAt: Date.now(),
                verified: true,
                verify_status: 'ok',
                folder_id: App.selectedFolder || 'default'
            };

            const res = await App.secureFetch(CONFIG.API_DB_PROXY, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': pwd
                },
                body: JSON.stringify({
                    action: 'add_file',
                    file: fileData
                })
            });

            if (!res.ok) {
                const message = await App.readErrorMessage(res);
                throw new Error(message || '添加文件失败');
            }

            const json = await res.json();
            if (!json.success) {
                throw new Error(json.error || '添加文件失败');
            }

            UI.toast(`成功添加文件: ${finalFileName}`, 'success');
            await App.loadFiles();

            return true;
        } catch (e) {
            console.error('添加 CID 文件失败:', e);
            UI.toast(`添加失败: ${e.message}`, 'error');
            return false;
        }
    },

    /**
     * 批量导入 CID
     */
    batchImportCids: async (cidList, autoFetchInfo = true) => {
        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            UI.toast('请先登录', 'error');
            return;
        }

        if (!cidList || cidList.length === 0) {
            UI.toast('没有有效的 CID', 'error');
            return;
        }

        UI.toast(`开始导入 ${cidList.length} 个文件...`, 'info');

        let successCount = 0;
        let failCount = 0;
        let duplicateCount = 0;

        for (const cid of cidList) {
            try {
                const validation = App.validateCid(cid);
                if (!validation.valid) {
                    failCount++;
                    continue;
                }

                const cleanCid = validation.cid;

                const existingFile = App.allFiles.find(f => f.cid === cleanCid);
                if (existingFile) {
                    duplicateCount++;
                    continue;
                }

                let finalFileName = '';
                let finalFileSize = 0;

                if (autoFetchInfo) {
                    try {
                        finalFileName = await App.fetchCidFileName(cleanCid);
                        finalFileSize = await App.fetchCidFileSize(cleanCid);
                    } catch (e) {
                        console.warn(`获取 ${cleanCid} 信息失败:`, e);
                        finalFileName = `ipfs-${cleanCid.substring(0, 8)}...`;
                    }
                }

                const fileData = {
                    id: Date.now() + Math.random(),
                    cid: cleanCid,
                    name: finalFileName || `ipfs-${cleanCid.substring(0, 8)}...`,
                    size: finalFileSize,
                    uploadedAt: Date.now(),
                    verified: true,
                    verify_status: 'ok',
                    folder_id: App.selectedFolder || 'default'
                };

                const res = await App.secureFetch(CONFIG.API_DB_PROXY, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': pwd
                    },
                    body: JSON.stringify({
                        action: 'add_file',
                        file: fileData
                    })
                });

                if (!res.ok) {
                    failCount++;
                    continue;
                }

                const json = await res.json();
                if (json.success) {
                    successCount++;
                } else {
                    failCount++;
                }

                // 添加延迟，避免请求过快
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (e) {
                console.error(`导入 ${cid} 失败:`, e);
                failCount++;
            }
        }

        await App.loadFiles();

        const message = `导入完成！成功: ${successCount}, 失败: ${failCount}, 重复: ${duplicateCount}`;
        UI.toast(message, successCount > 0 ? 'success' : 'error');

        return { successCount, failCount, duplicateCount };
    },

    /**
     * 复制 CID 到剪贴板
     */
    copyCidToClipboard: async (cid, fileName = '') => {
        try {
            await navigator.clipboard.writeText(cid);
            const msg = fileName ? `已复制 ${fileName} 的 CID` : 'CID 已复制到剪贴板';
            UI.toast(msg, 'success');
            return true;
        } catch (e) {
            console.error('复制失败:', e);
            
            // 降级方案：使用传统方法
            const textArea = document.createElement('textarea');
            textArea.value = cid;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                UI.toast('CID 已复制到剪贴板', 'success');
                document.body.removeChild(textArea);
                return true;
            } catch (e) {
                document.body.removeChild(textArea);
                UI.toast('复制失败，请手动复制', 'error');
                return false;
            }
        }
    },

    /**
     * 生成分享链接
     */
    generateShareLink: async (fileId, duration = 7) => {
        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            UI.toast('请先登录', 'error');
            return null;
        }

        try {
            UI.toast('正在生成分享链接...', 'info');

            const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=create_share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': pwd
                },
                body: JSON.stringify({
                    fileId: fileId,
                    duration: duration * 24 * 60 * 60 * 1000 // 转换为毫秒
                })
            });

            if (!res.ok) {
                const message = await App.readErrorMessage(res);
                throw new Error(message || '生成分享链接失败');
            }

            const json = await res.json();
            if (!json.success) {
                throw new Error(json.error || '生成分享链接失败');
            }

            const shareLink = `${window.location.origin}/share.html?id=${json.shareId}`;
            
            // 复制到剪贴板
            await navigator.clipboard.writeText(shareLink);
            
            UI.toast('分享链接已生成并复制到剪贴板', 'success');
            
            return shareLink;
        } catch (e) {
            console.error('生成分享链接失败:', e);
            UI.toast(`生成分享链接失败: ${e.message}`, 'error');
            return null;
        }
    },

    /**
     * 获取分享统计信息
     */
    getShareStats: async (shareId) => {
        const pwd = localStorage.getItem('cc_pwd');
        if (!pwd) {
            return null;
        }

        try {
            const res = await App.secureFetch(`${CONFIG.API_DB_PROXY}?action=get_share_stats&shareId=${shareId}`, {
                method: 'GET',
                headers: { 'x-auth-token': pwd }
            });

            if (!res.ok) {
                return null;
            }

            const json = await res.json();
            if (json.success) {
                return json.data;
            }
            
            return null;
        } catch (e) {
            console.error('获取分享统计失败:', e);
            return null;
        }
    }
};

// 暴露给全局
window.App = App;

// DOM 加载完成后初始化应用
window.addEventListener('DOMContentLoaded', App.init);
