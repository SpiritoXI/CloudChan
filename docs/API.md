# CrustShare API 文档

本文档详细说明 CrustShare 的核心 API 接口。

## 目录

- [概述](#概述)
- [上传 API](#上传-api)
- [文件管理 API](#文件管理-api)
- [网关 API](#网关-api)
- [分享 API](#分享-api)
- [下载 API](#下载-api)
- [传播检测 API](#传播检测-api)
- [错误处理](#错误处理)
- [配置选项](#配置选项)
- [类型定义](#类型定义)
- [相关链接](#相关链接)

---

## 概述

### 基础 URL

| 环境 | URL |
|------|-----|
| 生产环境 | `https://your-domain.com` |
| 开发环境 | `http://localhost:3000` |

### 认证

所有需要认证的 API 使用 Session Token：

```typescript
headers: {
  'x-auth-token': sessionStorage.getItem('auth_token')
}
```

### 响应格式

所有 API 响应均为 JSON 格式：

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### 导入方式

```typescript
import { 
  api, 
  uploadApi, 
  fileApi, 
  gatewayApi, 
  shareApi, 
  downloadApi, 
  propagationApi,
  tokenApi 
} from '@/lib/api';
```

---

## 上传 API

### uploadToCrust

上传文件到 Crust 网络（IPFS）。

**函数签名**

```typescript
async function uploadToCrust(
  file: File,
  token: string,
  onProgress: (progress: number) => void,
  retryCount?: number
): Promise<UploadResult>
```

**类型定义**

```typescript
interface UploadResult {
  cid: string;           // 文件 CID
  size: number;          // 文件大小（字节）
  hash?: string;         // IPFS Hash
  orderCreated?: boolean; // 存储订单是否创建成功
}
```

**参数**

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `file` | `File` | ✅ | - | 要上传的文件 |
| `token` | `string` | ✅ | - | 认证 Token |
| `onProgress` | `(progress: number) => void` | ✅ | - | 进度回调函数 (0-100) |
| `retryCount` | `number` | ❌ | 3 | 重试次数 |

**请求示例**

```typescript
import { uploadApi } from '@/lib/api';

const result = await uploadApi.uploadToCrust(
  file,
  '',  // token 由后端自动处理
  (progress) => console.log(`上传进度: ${progress}%`),
  3     // 重试次数
);

console.log(`文件 CID: ${result.cid}`);
console.log(`存储订单: ${result.orderCreated ? '已创建' : '未创建'}`);
```

**响应示例**

```json
{
  "cid": "QmXxx...xxx",
  "size": 1024000,
  "hash": "QmXxx...xxx",
  "orderCreated": true
}
```

### verifyFile

验证文件是否已上传到 IPFS 网络。

**函数签名**

```typescript
async function verifyFile(cid: string): Promise<VerifyResult>
```

**类型定义**

```typescript
interface VerifyResult {
  verified: boolean;
  status: 'ok' | 'failed' | 'pending';
  message?: string;
}
```

**请求示例**

```typescript
const result = await uploadApi.verifyFile('QmXxx...');
if (result.verified) {
  console.log('文件验证成功');
}
```

### getToken

获取认证 Token。

**函数签名**

```typescript
async function getToken(): Promise<string>
```

**请求示例**

```typescript
import { tokenApi } from '@/lib/api';

const token = await tokenApi.getToken();
```

---

## 文件管理 API

### 文件操作

#### loadFiles

加载所有文件列表。

```typescript
const files = await fileApi.loadFiles();
// 返回 FileRecord[]
```

#### saveFile

保存文件记录。

```typescript
await fileApi.saveFile(file: FileRecord);
```

#### updateFile

更新文件信息。

```typescript
await fileApi.updateFile(fileId: string | number, updates: Partial<FileRecord>);
```

#### deleteFile

删除单个文件。

```typescript
await fileApi.deleteFile(fileId: string | number);
```

#### deleteFiles

批量删除文件。

```typescript
const deletedCount = await fileApi.deleteFiles(fileIds: (string | number)[]);
```

#### renameFile

重命名文件。

```typescript
await fileApi.renameFile(fileId: string | number, newName: string);
```

#### moveFiles

移动文件到指定文件夹。

```typescript
const movedCount = await fileApi.moveFiles(fileIds: (string | number)[], folderId: string);
```

#### copyFiles

复制文件到指定文件夹。

```typescript
const copiedCount = await fileApi.copyFiles(fileIds: (string | number)[], folderId: string);
```

### CID 操作

#### addCid

添加 CID 到文件列表。

```typescript
const file = await fileApi.addCid(cid: string, name: string, size: number, folderId?: string);
```

#### validateCid

验证 CID 格式是否有效。

```typescript
const result = fileApi.validateCid(cid: string);
// 返回 { valid: boolean; error?: string }
```

#### fetchCidInfo

从 IPFS 网络获取 CID 信息。

```typescript
const info = await fileApi.fetchCidInfo(cid: string);
// 返回 { name: string; size: number; isDirectory: boolean; valid: boolean; error?: string }
```

### 文件夹操作

#### loadFolders

加载所有文件夹。

```typescript
const folders = await fileApi.loadFolders();
// 返回 Folder[]
```

#### createFolder

创建新文件夹。

```typescript
const folder = await fileApi.createFolder(name: string, parentId?: string | null);
```

#### renameFolder

重命名文件夹。

```typescript
await fileApi.renameFolder(folderId: string, newName: string);
```

#### deleteFolder

删除文件夹。

```typescript
await fileApi.deleteFolder(folderId: string);
```

### 统计操作

#### getDbStats

获取数据库统计信息。

```typescript
const stats = await fileApi.getDbStats();
// 返回 { files: { count: number }; folders: { count: number } }
```

#### checkVerificationStatus

检查文件验证状态。

```typescript
const failedFiles = await fileApi.checkVerificationStatus();
// 返回验证失败的文件列表
```

### 分享管理

#### loadShares

加载所有分享记录。

```typescript
const shares = await fileApi.loadShares();
```

#### deleteShare

删除分享记录。

```typescript
await fileApi.deleteShare(cid: string);
```

---

## 网关 API

### 网关测试

#### testGateway

测试单个网关的可用性和性能。

```typescript
const result = await gatewayApi.testGateway(gateway: Gateway, options?: {
  retries?: number;      // 重试次数，默认 2
  samples?: number;      // 采样次数，默认 3
  testCid?: string;      // 测试 CID
  signal?: AbortSignal;  // 取消信号
});
// 返回 { available: boolean; latency: number; reliability: number; healthScore: number; rangeSupport?: boolean; corsEnabled?: boolean }
```

#### testAllGateways

批量测试所有网关。

```typescript
const results = await gatewayApi.testAllGateways(gateways: Gateway[], options?: {
  onProgress?: (gateway: Gateway, result: Gateway) => void;
  priorityRegions?: string[];
  signal?: AbortSignal;
});
```

#### testAllGatewaysWithProgress

带进度回调的批量测试。

```typescript
const results = await gatewayApi.testAllGatewaysWithProgress(gateways: Gateway[], options?: {
  signal?: AbortSignal;
  onOverallProgress?: (progress: GatewayTestProgress) => void;
});
```

#### autoTestGateways

自动测试网关（带缓存）。

```typescript
const gateways = await gatewayApi.autoTestGateways(
  customGateways?: Gateway[],
  forceRefresh?: boolean,
  options?: {
    onProgress?: (gateway: Gateway, result: Gateway) => void;
    priorityRegions?: string[];
    signal?: AbortSignal;
  }
);
```

### 网关选择

#### getBestGatewayUrl

获取最优网关 URL。

```typescript
const { url, gateway } = await gatewayApi.getBestGatewayUrl(
  customGateways?: Gateway[],
  options?: {
    requireRangeSupport?: boolean;  // 是否需要 Range 支持
    requireCors?: boolean;          // 是否需要 CORS
    minHealthScore?: number;        // 最低健康分数
  }
);
```

#### getBestMediaGateway

获取最适合媒体播放的网关。

```typescript
const bestGateway = await gatewayApi.getBestMediaGateway(
  gateways: Gateway[],
  preferRangeSupport?: boolean  // 默认 true
);
```

#### multiGatewayDownload

多网关并发下载测试。

```typescript
const result = await gatewayApi.multiGatewayDownload(
  cid: string,
  gateways: Gateway[],
  onProgress?: (gateway: Gateway, status: 'testing' | 'success' | 'failed') => void
);
// 返回 { url: string; gateway: Gateway } | null
```

### 网关验证

#### validateGatewayUrl

验证网关 URL 格式。

```typescript
const isValid = gatewayApi.validateGatewayUrl(url: string);
```

#### checkGatewayConnectivity

检查网关连通性。

```typescript
const result = await gatewayApi.checkGatewayConnectivity(gateway: Gateway);
```

#### testGatewayMediaSupport

测试网关媒体支持。

```typescript
const result = await gatewayApi.testGatewayMediaSupport(gateway: Gateway);
```

### 网关缓存

#### getCachedResults

获取缓存的网关测试结果。

```typescript
const cached = gatewayApi.getCachedResults();
```

#### cacheResults

缓存网关测试结果。

```typescript
gatewayApi.cacheResults(gateways: Gateway[]);
```

#### clearGatewayCache

清除网关缓存。

```typescript
gatewayApi.clearGatewayCache();
```

### 健康度管理

#### loadHealthHistory / saveHealthHistory

加载/保存健康度历史。

```typescript
const history = gatewayApi.loadHealthHistory();
gatewayApi.saveHealthHistory(gateways: Gateway[]);
```

#### calculateHealthScore

计算网关健康分数。

```typescript
const score = gatewayApi.calculateHealthScore(gateway: Gateway, testResult: TestResult);
```

#### sortGateways / filterGateways

排序/过滤网关。

```typescript
const sorted = gatewayApi.sortGateways(gateways: Gateway[], sortField: GatewaySortField, sortOrder: GatewaySortOrder);
const filtered = gatewayApi.filterGateways(gateways: Gateway[], filter: GatewayFilter);
```

---

## 分享 API

### getShareInfo

获取分享信息。

```typescript
const shareInfo = await shareApi.getShareInfo(cid: string);
// 返回 { cid: string; filename?: string; size?: number; hasPassword: boolean; expiry?: string } | null
```

### createShare

创建分享链接。

```typescript
await shareApi.createShare({
  cid: string;
  filename?: string;
  size?: number;
  password?: string;    // 可选密码保护
  expiry?: string;      // 过期时间
});
```

### verifyPassword

验证分享密码。

```typescript
const result = await shareApi.verifyPassword(cid: string, password: string);
// 返回分享信息或 null
```

### deleteShare

删除分享。

```typescript
await shareApi.deleteShare(cid: string);
```

---

## 下载 API

### 基础下载

#### downloadWithGateway

使用指定网关下载文件。

```typescript
const task = await downloadApi.downloadWithGateway(
  cid: string,
  gateway: Gateway,
  options?: {
    maxRetries?: number;
    timeout?: number;
    onProgress?: (task: DownloadTask) => void;
    onStatusChange?: (task: DownloadTask) => void;
  }
);
```

#### downloadWithAutoSwitch

自动切换网关下载。

```typescript
const task = await downloadApi.downloadWithAutoSwitch(
  cid: string,
  filename: string,
  gateways: Gateway[],
  options?: {
    maxRetries?: number;
    maxGatewaySwitches?: number;
    timeout?: number;
    onProgress?: (task: DownloadTask) => void;
    onStatusChange?: (task: DownloadTask) => void;
    onGatewaySwitch?: (oldGateway: Gateway, newGateway: Gateway) => void;
    onComplete?: (task: DownloadTask) => void;
    onError?: (task: DownloadTask, error: Error) => void;
  }
);
```

### 下载队列

#### createDownloadQueue

创建下载队列管理器。

```typescript
const queue = downloadApi.createDownloadQueue({
  maxConcurrent: 3,      // 最大并发数
  maxRetries: 3,         // 最大重试次数
  maxGatewaySwitches: 3, // 最大网关切换次数
  timeout: 30000,        // 超时时间
  autoStart: true,       // 自动开始
});

// 添加下载任务
const taskId = queue.add(cid, filename, fileSize, gateways);

// 队列操作
queue.pause(taskId);      // 暂停
queue.resume(taskId, gateways);  // 恢复
queue.cancel(taskId);     // 取消
queue.cancelAll();        // 取消全部

// 获取状态
const tasks = queue.getAll();
const active = queue.getActive();
const pending = queue.getQueue();
```

### 下载历史

#### saveDownloadHistory / loadDownloadHistory

保存/加载下载历史。

```typescript
downloadApi.saveDownloadHistory(task: DownloadTask);
const history = downloadApi.loadDownloadHistory();
```

#### clearDownloadHistory

清除下载历史。

```typescript
downloadApi.clearDownloadHistory();
```

#### getDownloadStats

获取下载统计。

```typescript
const stats = downloadApi.getDownloadStats();
// 返回 DownloadStats
```

### 工具函数

#### saveDownloadBlob

保存下载的 Blob 为文件。

```typescript
downloadApi.saveDownloadBlob(task: DownloadTask);
```

#### formatSpeed / formatTime

格式化速度/时间。

```typescript
const speedText = downloadApi.formatSpeed(bytesPerSecond);
const timeText = downloadApi.formatTime(seconds);
```

---

## 传播检测 API

### propagateToGateway

向单个网关传播文件。

```typescript
const result = await propagationApi.propagateToGateway(
  gateway: Gateway,
  cid: string,
  options?: {
    timeout?: number;
    useRange?: boolean;
    rangeSize?: number;
  }
);
// 返回 { success: boolean; cached: boolean; latency: number; error?: string }
```

### propagateToGateways

向多个网关传播文件。

```typescript
const result = await propagationApi.propagateToGateways(
  cid: string,
  gateways: Gateway[],
  options?: {
    maxConcurrent?: number;
    timeout?: number;
    useRange?: boolean;
    onProgress?: (gateway: Gateway, status: 'pending' | 'success' | 'failed', result?: { cached: boolean; latency: number }) => void;
  }
);
// 返回 { success: Gateway[]; failed: Gateway[]; total: number; details: Map }
```

### smartPropagate

智能传播（选择最优网关）。

```typescript
const result = await propagationApi.smartPropagate(
  cid: string,
  gateways: Gateway[],
  options?: {
    maxGateways?: number;  // 默认 8
    timeout?: number;
    onProgress?: (...) => void;
  }
);
```

### backgroundPropagate

后台传播（非阻塞）。

```typescript
propagationApi.backgroundPropagate(
  cid: string,
  gateways: Gateway[],
  options?: {
    maxGateways?: number;
    timeout?: number;
    onComplete?: (result) => void;
  }
);
```

### aggressivePropagate

激进传播（多轮）。

```typescript
const result = await propagationApi.aggressivePropagate(
  cid: string,
  gateways: Gateway[],
  options?: {
    rounds?: number;           // 轮数，默认 3
    delayBetweenRounds?: number;  // 轮间延迟
    onRoundComplete?: (round, result) => void;
  }
);
```

---

## 错误处理

### ApiError

```typescript
import { ApiError } from '@/lib/api';

try {
  const result = await fileApi.loadFiles();
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message);
  }
}
```

### 错误类型

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `UPLOAD_FAILED` | 上传失败 | 检查网络连接，重试上传 |
| `INVALID_TOKEN` | 无效的认证 Token | 重新登录 |
| `NETWORK_ERROR` | 网络错误 | 检查网络连接 |
| `FILE_NOT_FOUND` | 文件不存在 | 检查 CID 是否正确 |
| `UNAUTHORIZED` | 未授权访问 | 检查认证信息 |
| `RATE_LIMITED` | 请求频率限制 | 稍后重试 |
| `FILE_TOO_LARGE` | 文件过大 | 压缩文件（最大 1GB） |

---

## 配置选项

### 应用配置

```typescript
// lib/config.ts
export const APP = {
  VERSION: '3.0.0',
  NAME: 'CrustShare',
  DESCRIPTION: '去中心化文件存储与分享平台',
} as const;
```

### Crust 配置

```typescript
export const CRUST = {
  UPLOAD_API: 'https://gw.crustfiles.app/api/v0/add?pin=true',
  ORDER_API: 'https://gw.crustfiles.app/crust/api/v1/files',
  TEST_CID: 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy',
  DEFAULT_STORAGE_MONTHS: 1200,  // 约100年
} as const;
```

### 上传配置

```typescript
export const UPLOAD = {
  MAX_SIZE: 1024 * 1024 * 1024,  // 1GB
  MAX_SIZE_TEXT: '1GB',
  TIMEOUT: 30 * 60 * 1000,       // 30分钟
  CHUNK_SIZE: 1024 * 1024,       // 1MB
} as const;
```

### 网关测试配置

```typescript
export const GATEWAY_TEST = {
  TIMEOUT: 10000,           // 10秒
  CONCURRENT_LIMIT: 8,      // 并发限制
  RETRY_TIMES: 1,           // 重试次数
  RETRY_DELAY: 1000,        // 重试延迟
  HIDE_UNAVAILABLE: false,  // 隐藏不可用网关
  CHECK_CACHE_KEY: 'cc_gateway_check_result_v3',
  CHECK_CACHE_EXPIRY: 10 * 60 * 1000,  // 10分钟
  CACHE_VERSION: '3.0',
} as const;
```

### 网关健康配置

```typescript
export const GATEWAY_HEALTH = {
  HEALTH_CACHE_KEY: 'cc_gateway_health_v3',
  HEALTH_CACHE_EXPIRY: 30 * 24 * 60 * 60 * 1000,  // 30天
  CLEANUP: {
    ENABLED: true,
    MAX_FAILURE_COUNT: 5,
    MAX_CONSECUTIVE_FAILURES: 3,
    MAX_UNUSED_DAYS: 30,
    MIN_HEALTH_SCORE: 10,
    AUTO_CLEANUP: false,
  },
  SCORING: {
    BASE_LATENCY_SCORE: 100,
    MAX_LATENCY: 10000,
    SUCCESS_BONUS: 5,
    FAILURE_PENALTY: 10,
    CN_REGION_BONUS: 15,
  },
} as const;
```

### 安全配置

```typescript
export const SECURITY = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000,  // 30分钟
  SESSION_DURATION: 24 * 60 * 60 * 1000,  // 24小时
  PASSWORD_MIN_LENGTH: 8,
} as const;
```

### 文件类型配置

```typescript
export const FILE_EXTENSIONS = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'avif'],
  VIDEO: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'],
  AUDIO: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'opus'],
  DOCUMENT: ['pdf', 'txt', 'md', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
  ARCHIVE: ['zip', 'rar', '7z', 'gz', 'tar'],
} as const;
```

---

## 类型定义

### 核心类型

```typescript
// 文件记录
interface FileRecord {
  id: string | number;
  cid: string;
  name: string;
  size: number;
  type?: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  verifyStatus?: VerifyStatus;
}

// 文件夹
interface Folder {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 网关
interface Gateway {
  name: string;
  url: string;
  icon?: string;
  priority?: number;
  region?: 'CN' | 'INTL';
  available?: boolean;
  latency?: number;
  reliability?: number;
  healthScore?: number;
  rangeSupport?: boolean;
  corsEnabled?: boolean;
  lastChecked?: number;
  failureCount?: number;
  consecutiveFailures?: number;
  lastSuccess?: number;
}

// 下载任务
interface DownloadTask {
  id: string;
  cid: string;
  filename: string;
  fileSize: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused' | 'cancelled';
  progress: number;
  downloadedBytes: number;
  speed: number;
  remainingTime: number;
  startTime: number;
  endTime?: number;
  gateway: Gateway;
  gatewayIndex: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  blob?: Blob;
}

// 分享信息
interface ShareInfo {
  cid: string;
  filename?: string;
  size?: number;
  hasPassword: boolean;
  expiry?: string;
}
```

---

## 相关链接

- [Crust Network 官方文档](https://wiki.crust.network/)
- [IPFS 文档](https://docs.ipfs.tech/)
- [crustfiles.io](https://crustfiles.io)
- [IPFS 网关列表](https://ipfs.github.io/public-gateway-checker/)
