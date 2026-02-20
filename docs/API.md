# CrustShare API 文档

本文档详细说明 CrustShare 的核心 API 接口。

## 目录

- [上传 API](#上传-api)
- [存储订单 API](#存储订单-api)
- [网关 API](#网关-api)
- [分享 API](#分享-api)

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
  retryCount?: number,
  createOrder?: boolean
): Promise<{
  cid: string;
  size: number;
  hash?: string;
  orderCreated?: boolean;
}>
```

**参数**

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `file` | `File` | ✅ | - | 要上传的文件 |
| `token` | `string` | ✅ | - | Crust Access Token |
| `onProgress` | `(progress: number) => void` | ✅ | - | 进度回调函数 (0-100) |
| `retryCount` | `number` | ❌ | 3 | 重试次数 |
| `createOrder` | `boolean` | ❌ | true | 是否自动创建存储订单 |

**返回值**

```typescript
{
  cid: string;        // 文件 CID
  size: number;       // 文件大小（字节）
  hash?: string;      // IPFS Hash
  orderCreated?: boolean;  // 存储订单是否创建成功
}
```

**示例**

```typescript
import { uploadApi } from '@/lib/api';

const result = await uploadApi.uploadToCrust(
  file,
  accessToken,
  (progress) => console.log(`上传进度: ${progress}%`),
  3,    // 重试次数
  true  // 自动创建存储订单
);

console.log(`文件 CID: ${result.cid}`);
console.log(`存储订单: ${result.orderCreated ? '已创建' : '未创建'}`);
```

---

## 存储订单 API

### createStorageOrder

为已上传的文件创建存储订单，实现永久存储。

**函数签名**

```typescript
async function createStorageOrder(
  cid: string,
  size: number,
  token: string,
  months?: number
): Promise<{
  success: boolean;
  message?: string;
}>
```

**参数**

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `cid` | `string` | ✅ | - | 文件 CID |
| `size` | `number` | ✅ | - | 文件大小（字节）|
| `token` | `string` | ✅ | - | Crust Access Token |
| `months` | `number` | ❌ | 1200 | 存储月数 |

**返回值**

```typescript
{
  success: boolean;   // 是否成功
  message?: string;   // 结果消息
}
```

**示例**

```typescript
const result = await uploadApi.createStorageOrder(
  'QmXxx...',  // CID
  1024,        // 文件大小
  accessToken,
  1200         // 永久存储
);

if (result.success) {
  console.log('存储订单创建成功，文件将永久保存！');
}
```

---

## 网关 API

### 可用网关列表

CrustShare 支持以下 IPFS 网关：

| 网关 | 地址 | 说明 |
|------|------|------|
| Crust Gateway | `https://gw.crustfiles.app` | 官方网关，推荐 |
| IPFS.io | `https://ipfs.io` | 官方公共网关 |
| Cloudflare | `https://cloudflare-ipfs.com` | Cloudflare CDN |
| Pinata | `https://gateway.pinata.cloud` | Pinata 网关 |
| DWeb | `https://dweb.link` | Protocol Labs |

### fetchFromGateway

从指定网关获取文件。

**函数签名**

```typescript
async function fetchFromGateway(
  cid: string,
  gateway?: string
): Promise<Response>
```

**示例**

```typescript
// 使用默认网关
const response = await fetchFromGateway('QmXxx...');

// 指定网关
const response = await fetchFromGateway('QmXxx...', 'https://ipfs.io');
```

### 测试网关延迟

```typescript
import { gatewayApi } from '@/lib/api';

// 测试单个网关
const latency = await gatewayApi.testGateway('https://gw.crustfiles.app');

// 获取最优网关
const bestGateway = await gatewayApi.getBestGateway();
```

---

## 分享 API

### createShare

创建文件分享链接。

**函数签名**

```typescript
async function createShare(
  cid: string,
  options?: {
    password?: string;
    expiresIn?: number;  // 过期时间（小时）
  }
): Promise<{
  shareUrl: string;
  shareId: string;
}>
```

**示例**

```typescript
const share = await api.createShare('QmXxx...', {
  password: 'myPassword123',  // 可选密码保护
  expiresIn: 24 * 7           // 7天后过期
});

console.log(`分享链接: ${share.shareUrl}`);
```

### verifySharePassword

验证分享密码。

**函数签名**

```typescript
async function verifySharePassword(
  cid: string,
  password: string
): Promise<boolean>
```

---

## 状态管理 API

### 使用 Zustand Store

```typescript
import { useFileStore, useGatewayStore, useSettingsStore } from '@/lib/stores';

// 文件管理
const { files, addFile, removeFile, updateFile } = useFileStore();

// 网关管理
const { gateways, activeGateway, setGateway, addGateway } = useGatewayStore();

// 设置管理
const { settings, updateSettings } = useSettingsStore();
```

---

## 错误处理

### 错误类型

| 错误码 | 说明 |
|--------|------|
| `UPLOAD_FAILED` | 上传失败 |
| `INVALID_TOKEN` | 无效的 Access Token |
| `ORDER_FAILED` | 存储订单创建失败 |
| `NETWORK_ERROR` | 网络错误 |
| `FILE_NOT_FOUND` | 文件不存在 |

### 错误处理示例

```typescript
try {
  const result = await uploadApi.uploadToCrust(file, token, onProgress);
  console.log('上传成功:', result.cid);
} catch (error) {
  if (error.code === 'INVALID_TOKEN') {
    console.error('Access Token 无效，请重新获取');
  } else if (error.code === 'NETWORK_ERROR') {
    console.error('网络错误，请检查网络连接');
  } else {
    console.error('上传失败:', error.message);
  }
}
```

---

## 配置选项

### Crust 配置

```typescript
// lib/config.ts
export const CRUST = {
  UPLOAD_API: 'https://gw.crustfiles.app/api/v0/add?pin=true',
  ORDER_API: 'https://gw.crustfiles.app/crust/api/v1/files',
  DEFAULT_STORAGE_MONTHS: 1200,
};
```

### 上传配置

```typescript
export const UPLOAD = {
  MAX_FILE_SIZE: 100 * 1024 * 1024,  // 100MB
  TIMEOUT: 30 * 60 * 1000,           // 30分钟
  RETRY_COUNT: 3,                     // 重试次数
  RETRY_DELAY: 1000,                  // 重试延迟（毫秒）
};
```

---

## 相关链接

- [Crust Network 官方文档](https://wiki.crust.network/)
- [IPFS 文档](https://docs.ipfs.tech/)
- [crustfiles.io](https://crustfiles.io)
