# 💾 CloudChan 智能缓存说明（网关测速与健康追踪）

本文档解释 CloudChan 在“选择下载通道/网关测速”时使用的缓存机制，帮助你理解为什么有时测速会很快（命中缓存），以及如何清理缓存。

## 1. 缓存分层

CloudChan 使用两层缓存（都存储在浏览器 localStorage）：

1) **短期：网关测速结果缓存（默认 10 分钟）**
- 用途：避免短时间内重复测速（例如连续下载多个文件或频繁打开网关弹窗）
- 数据：完整测速结果（可用性、延迟等）
- 配置位置：`cloudchan/config.js` → `CONFIG.GATEWAY_TEST`

2) **长期：网关健康追踪缓存（默认 30 天）**
- 用途：跨会话积累“成功/失败次数、连续失败、上次成功时间”等，用于排序与清理建议
- 数据：每个网关的健康统计与评分
- 配置位置：`cloudchan/config.js` → `CONFIG.GATEWAY_HEALTH`

## 2. 关键配置项（可按需调整）

在 [config.js](../../cloudchan/config.js) 中：

- `CONFIG.GATEWAY_TEST.CHECK_CACHE_KEY`：短期测速缓存键名
- `CONFIG.GATEWAY_TEST.CHECK_CACHE_EXPIRY`：短期测速缓存有效期（毫秒）
- `CONFIG.GATEWAY_HEALTH.HEALTH_CACHE_KEY`：健康追踪缓存键名
- `CONFIG.GATEWAY_HEALTH.HEALTH_CACHE_EXPIRY`：健康追踪缓存有效期（毫秒）

## 3. 什么时候会命中缓存？

通常在以下场景会命中“短期测速缓存”：
- 你刚测速过网关列表（打开过一次“选择下载通道”弹窗）
- 10 分钟内再次打开弹窗或对其他文件触发测速

命中缓存的效果：
- 弹窗结果几乎瞬间出现
- UI 通常会提示“使用缓存/缓存时间”

## 4. 为什么需要长期健康缓存？

短期缓存解决“重复测速浪费时间”的问题；长期健康缓存解决“网关质量不稳定”的问题：
- 网关可能间歇性不可用：健康追踪能识别长期不稳定的节点
- 会记录连续失败次数：连续失败到一定阈值后可提示清理
- 支持更合理的排序：在延迟之外，引入稳定性维度

## 5. 如何清理缓存？

推荐两种方式：

1) **在页面内点击“清理”入口**
- 根站点模式下：访问 `/clear-cache.html`
- 该页面会清除 localStorage、sessionStorage、Service Worker 与 Cache Storage

2) **手动清除 localStorage（高级）**
- 打开开发者工具（F12）→ Application → Local Storage
- 删除以 `cc_` 开头的缓存键（例如 `cc_gateway_check_result_v1`、`cc_gateway_health_v2` 等）

## 6. 常见问题

### Q1：我刚新增网关，为什么排序/可用性没变化？
A：可能命中了短期测速缓存。等待 10 分钟过期，或直接打开 `/clear-cache.html` 清缓存。

### Q2：清缓存后会发生什么？
A：网关弹窗会重新测速；健康追踪数据会重建（从 0 开始累计）。

