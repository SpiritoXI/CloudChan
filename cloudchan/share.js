/**
 * CloudChan 分享页面脚本
 * 用于处理分享链接的访问、验证和文件下载
 * @version 2.2.2
 */

// 配置
const CONFIG = {
    version: '2.2.2',
    apiBase: '/api',
    ipfsGateway: 'https://ipfs.io/ipfs/',
    fallbackGateway: 'https://dweb.link/ipfs/'
};

// DOM 元素
const elements = {
    loading: document.getElementById('shareLoading'),
    error: document.getElementById('shareError'),
    errorTitle: document.getElementById('shareErrorTitle'),
    errorMessage: document.getElementById('shareErrorMessage'),
    content: document.getElementById('shareContent'),
    expiry: document.getElementById('shareExpiry'),
    fileName: document.getElementById('shareFileName'),
    fileSize: document.getElementById('shareFileSize'),
    cid: document.getElementById('shareCid'),
    downloadBtn: document.getElementById('downloadBtn'),
    copyCidBtn: document.getElementById('copyCidBtn')
};

/**
 * 页面初始化
 */
document.addEventListener('DOMContentLoaded', () => {
    loadShareInfo();
    bindEvents();
});

/**
 * 绑定事件
 */
function bindEvents() {
    if (elements.downloadBtn) {
        elements.downloadBtn.addEventListener('click', downloadFile);
    }

    if (elements.copyCidBtn) {
        elements.copyCidBtn.addEventListener('click', copyCidToClipboard);
    }
}

/**
 * 加载分享信息
 */
async function loadShareInfo() {
    const shareId = getShareIdFromUrl();

    if (!shareId) {
        showError('无效的分享链接', '分享 ID 不存在');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.apiBase}/share/${shareId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                showError('分享已失效', '该分享链接已被删除或不存在');
            } else if (response.status === 410) {
                showError('分享已过期', '该分享链接已超过有效期');
            } else {
                showError('加载失败', `服务器返回错误: ${response.status}`);
            }
            return;
        }

        const data = await response.json();

        if (!data.success || !data.data) {
            showError('加载失败', '无法解析分享信息');
            return;
        }

        const file = data.data;

        // 显示分享信息
        showShareInfo(file);
    } catch (error) {
        console.error('加载分享信息失败:', error);
        showError('网络错误', '无法连接到服务器，请检查网络连接');
    }
}

/**
 * 获取分享 ID
 */
function getShareIdFromUrl() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);

    // 路径格式: /share/:id
    const shareIndex = pathParts.indexOf('share');

    if (shareIndex !== -1 && shareIndex + 1 < pathParts.length) {
        return pathParts[shareIndex + 1];
    }

    return null;
}

/**
 * 显示分享信息
 */
function showShareInfo(file) {
    if (!elements.loading || !elements.content || !elements.error) return;

    // 隐藏加载状态
    elements.loading.style.display = 'none';
    elements.error.style.display = 'none';

    // 填充信息
    if (elements.expiry) {
        const expiryDate = new Date(file.expiry);
        elements.expiry.textContent = `有效期至: ${expiryDate.toLocaleString('zh-CN')}`;
    }

    if (elements.fileName) {
        elements.fileName.textContent = file.name || '未命名文件';
    }

    if (elements.fileSize) {
        elements.fileSize.textContent = formatFileSize(file.size || 0);
    }

    if (elements.cid) {
        elements.cid.textContent = file.cid || '-';
        elements.cid.title = file.cid || '-';
    }

    // 存储文件信息
    window.sharedFile = file;

    // 显示内容
    elements.content.style.display = 'block';
}

/**
 * 显示错误
 */
function showError(title, message) {
    if (!elements.loading || !elements.error) return;

    elements.loading.style.display = 'none';
    elements.content.style.display = 'none';

    if (elements.errorTitle) {
        elements.errorTitle.textContent = title;
    }

    if (elements.errorMessage) {
        elements.errorMessage.textContent = message;
    }

    elements.error.style.display = 'block';
}

/**
 * 下载文件
 */
async function downloadFile() {
    const file = window.sharedFile;

    if (!file || !file.cid) {
        alert('文件信息不存在');
        return;
    }

    try {
        // 尝试从主网关下载
        const gatewayUrl = `${CONFIG.ipfsGateway}${file.cid}`;

        // 显示下载提示
        showToast('正在准备下载...', 'info');

        // 创建下载链接
        const link = document.createElement('a');
        link.href = gatewayUrl;
        link.download = file.name || file.cid;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('下载已开始', 'success');
    } catch (error) {
        console.error('下载失败:', error);

        // 尝试备用网关
        try {
            const fallbackUrl = `${CONFIG.fallbackGateway}${file.cid}`;
            const link = document.createElement('a');
            link.href = fallbackUrl;
            link.download = file.name || file.cid;
            link.target = '_blank';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('已切换到备用网关下载', 'success');
        } catch (e) {
            console.error('备用网关下载失败:', e);
            alert('下载失败，请稍后重试');
        }
    }
}

/**
 * 复制 CID 到剪贴板
 */
async function copyCidToClipboard() {
    const file = window.sharedFile;

    if (!file || !file.cid) {
        alert('文件信息不存在');
        return;
    }

    try {
        await navigator.clipboard.writeText(file.cid);
        showToast('CID 已复制到剪贴板', 'success');
    } catch (error) {
        console.error('复制失败:', error);

        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = file.cid;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('CID 已复制到剪贴板', 'success');
        } catch (e) {
            document.body.removeChild(textarea);
            alert('复制失败，请手动复制');
        }
    }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 显示提示
 */
function showToast(message, type = 'info') {
    // 创建 toast 容器
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // 创建 toast 元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;

    // 添加样式
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        background: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
    `;

    // 根据类型设置颜色
    if (type === 'success') {
        toast.style.borderLeft = '4px solid #6bcf7f';
    } else if (type === 'error') {
        toast.style.borderLeft = '4px solid #ff6b6b';
    } else {
        toast.style.borderLeft = '4px solid #667eea';
    }

    // 添加到容器
    container.appendChild(toast);

    // 3秒后自动消失
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
