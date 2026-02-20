/**
 * 测试 CrustShare 完整上传流程
 * 
 * 使用方法：
 * npx tsx test-upload.ts
 */

// 模拟 CONFIG 对象
const CONFIG = {
  CRUST: {
    UPLOAD_API: 'https://gw.crustfiles.app/api/v0/add?pin=true',
    ORDER_API: 'https://gw.crustfiles.app/crust/api/v1/files',
    DEFAULT_STORAGE_MONTHS: 12,
  },
  UPLOAD: {
    TIMEOUT: 30 * 60 * 1000,
  },
};

// 你的 Token
const TOKEN = 'c3Vic3RyYXRlLWNUS2JmTnc2RGh3SDFFUVRTWGllSGdYbmtENDVrRG5rUHlHOXpOUEpBMXE4SzNDNXQ6MHg0YzRiNjNhOTYyY2M5MzQxOTJhMmNhMTQ3MTNjNmY0M2ZiOGQzOGY3NzEwNWUzNTcxN2U4M2E3MTc2OWY3NzU1MzFmZGU4MTFiYzIyNWY1OTA4OTZlYjRmNTQwZjUyZWZkZWY0MTc3Y2NhNGU5NzhlMDJmZDM4ZTgwZjIwMWM4NQ==';

/**
 * 创建存储订单
 */
async function createStorageOrder(
  cid: string,
  size: number,
  token: string,
  months: number = 12
): Promise<{ success: boolean; message?: string }> {
  try {
    const orderUrl = `${CONFIG.CRUST.ORDER_API}/${cid}/order`;
    
    console.log(`\n[Crust] 创建存储订单...`);
    console.log(`  CID: ${cid}`);
    console.log(`  大小: ${size} bytes`);
    console.log(`  时长: ${months} 个月`);
    
    const response = await fetch(orderUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cid,
        size,
        months,
      }),
    });

    if (response.ok) {
      console.log(`[Crust] ✅ 存储订单创建成功！`);
      return { success: true, message: '存储订单创建成功' };
    } else {
      const errorText = await response.text().catch(() => '');
      console.log(`[Crust] ❌ 存储订单创建失败: ${response.status}`);
      return { 
        success: false, 
        message: `存储订单创建失败: ${response.status}` 
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.log(`[Crust] ❌ 存储订单创建异常: ${message}`);
    return { success: false, message };
  }
}

/**
 * 上传文件到 Crust
 */
async function uploadToCrust(
  file: File | Blob,
  fileName: string,
  token: string,
  createOrder: boolean = true
): Promise<{ cid: string; size: number; hash?: string; orderCreated?: boolean }> {
  const formData = new FormData();
  formData.append('file', file, fileName);
  
  console.log(`  上传中...`);
  
  const response = await fetch(CONFIG.CRUST.UPLOAD_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`上传失败: ${response.status}`);
  }
  
  const data = await response.json();
  const result = {
    cid: data.Hash || data.cid,
    size: data.Size || file.size,
    hash: data.Hash,
  };
  
  // 创建存储订单
  let orderCreated = false;
  if (createOrder) {
    const orderResult = await createStorageOrder(result.cid, result.size, token);
    orderCreated = orderResult.success;
  }
  
  return { ...result, orderCreated };
}

/**
 * 验证文件
 */
async function verifyFile(cid: string, token: string): Promise<void> {
  console.log('\n验证文件...');
  
  // 检查 Pin 状态
  const pinRes = await fetch(`https://gw.crustfiles.app/api/v0/pin/ls?arg=${cid}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (pinRes.ok) {
    const pinData = await pinRes.json();
    const pinned = pinData.Keys && pinData.Keys[cid];
    console.log(`  Pin 状态: ${pinned ? '✅ 已 Pin' : '❌ 未 Pin'}`);
  }
  
  // 尝试读取文件
  const catRes = await fetch(`https://gw.crustfiles.app/api/v0/cat?arg=${cid}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (catRes.ok) {
    const text = await catRes.text();
    console.log(`  文件读取: ✅ 成功`);
    console.log(`  内容预览: ${text.substring(0, 50)}...`);
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('      CrustShare 完整上传流程测试');
  console.log('══════════════════════════════════════════════════════════════\n');
  
  // 创建测试文件
  const content = 'CrustShare Test - ' + new Date().toISOString() + '\n这是测试文件内容，用于验证完整上传流程。';
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], `crustshare-test-${Date.now()}.txt`, { type: 'text/plain' });
  
  console.log(`测试文件:`);
  console.log(`  名称: ${file.name}`);
  console.log(`  大小: ${file.size} bytes`);
  
  try {
    // 上传文件（包含创建存储订单）
    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('步骤 1: 上传文件并创建存储订单');
    console.log('─────────────────────────────────────────────────────────────');
    
    const result = await uploadToCrust(blob, file.name, TOKEN, true);
    
    console.log('\n上传结果:');
    console.log(`  CID: ${result.cid}`);
    console.log(`  大小: ${result.size} bytes`);
    console.log(`  存储订单: ${result.orderCreated ? '✅ 已创建' : '❌ 未创建'}`);
    
    // 验证文件
    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('步骤 2: 验证文件');
    console.log('─────────────────────────────────────────────────────────────');
    
    await verifyFile(result.cid, TOKEN);
    
    // 总结
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('                        测试总结');
    console.log('══════════════════════════════════════════════════════════════\n');
    
    console.log('文件信息:');
    console.log(`  CID: ${result.cid}`);
    console.log(`  文件名: ${file.name}`);
    console.log(`  大小: ${result.size} bytes`);
    console.log('');
    console.log('状态:');
    console.log(`  上传: ✅ 成功`);
    console.log(`  存储订单: ${result.orderCreated ? '✅ 已创建' : '❌ 未创建'}`);
    console.log('');
    
    if (result.orderCreated) {
      console.log('🎉 成功！文件已上传并创建存储订单，将被永久存储。');
    } else {
      console.log('⚠️ 文件已上传但存储订单未创建，文件可能无法永久保存。');
    }
    
    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('代码修改说明:');
    console.log('');
    console.log('1. lib/config.ts - 添加了 ORDER_API 端点');
    console.log('2. lib/api.ts - uploadApi.uploadToCrust 方法现在会:');
    console.log('   - 上传文件到 IPFS');
    console.log('   - 自动调用 createStorageOrder 创建存储订单');
    console.log('   - 返回 orderCreated 状态');
    console.log('─────────────────────────────────────────────────────────────');
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\n❌ 测试失败:', message);
  }
}

main();
