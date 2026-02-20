/**
 * 测试改进后的传播功能
 * 使用 GET 请求 + Range 头来真正触发网关缓存
 */

const CRUST_UPLOAD_API = 'https://gw.crustfiles.app/api/v0/add?pin=true';
const CRUST_ORDER_API = 'https://gw.crustfiles.app/crust/api/v1/files';

const GATEWAYS = [
  { name: 'IPFS.io', url: 'https://ipfs.io/ipfs/' },
  { name: 'Cloudflare', url: 'https://cloudflare-ipfs.com/ipfs/' },
  { name: 'Pinata', url: 'https://gateway.pinata.cloud/ipfs/' },
  { name: 'DWeb', url: 'https://dweb.link/ipfs/' },
  { name: '4EVERLAND', url: 'https://4everland.io/ipfs/' },
  { name: 'CF-IPFS', url: 'https://cf-ipfs.com/ipfs/' },
  { name: 'W3S', url: 'https://w3s.link/ipfs/' },
  { name: 'IPFS Scan', url: 'https://cdn.ipfsscan.io/ipfs/' },
];

async function propagateToGateway(gateway, cid, timeout = 15000) {
  const url = `${gateway.url}${cid}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const startTime = performance.now();
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Range': 'bytes=0-1023',
        'Cache-Control': 'no-cache',
      },
    });
    
    const latency = Math.round(performance.now() - startTime);
    clearTimeout(timeoutId);
    
    if (response.ok || response.status === 206) {
      const cached = response.headers.get('x-ipfs-cached') === 'true' || 
                     response.headers.get('x-cache-status') === 'HIT';
      
      if (response.body) {
        const reader = response.body.getReader();
        await reader.read();
        reader.cancel();
      }
      
      return { success: true, cached, latency };
    }
    
    return { success: false, cached: false, latency, error: `HTTP ${response.status}` };
  } catch (error) {
    return { success: false, cached: false, latency: Infinity, error: error.message };
  }
}

async function testPropagation() {
  console.log('========================================');
  console.log('改进后的传播功能测试');
  console.log('========================================\n');

  const token = process.env.CRUST_ACCESS_TOKEN;
  if (!token) {
    console.error('❌ 请设置 CRUST_ACCESS_TOKEN 环境变量');
    process.exit(1);
  }

  console.log('📦 步骤 1: 上传测试文件...');
  
  const testContent = `Propagation Test - ${new Date().toISOString()}\n这是一个测试文件，用于验证传播功能。`;
  const testFile = new Blob([testContent], { type: 'text/plain' });
  
  const formData = new FormData();
  formData.append('file', testFile, 'propagation-test.txt');

  let cid;
  
  try {
    const uploadResponse = await fetch(CRUST_UPLOAD_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      console.error('上传失败:', await uploadResponse.text());
      return;
    }

    const uploadResult = await uploadResponse.json();
    cid = uploadResult.Hash || uploadResult.cid;
    console.log(`✅ 上传成功! CID: ${cid}\n`);

    console.log('📦 步骤 2: 创建存储订单...');
    const orderResponse = await fetch(`${CRUST_ORDER_API}/${cid}/order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cid, size: testFile.size, months: 1200 }),
    });
    console.log(`订单状态: ${orderResponse.status}\n`);

  } catch (error) {
    console.error('上传过程出错:', error.message);
    return;
  }

  console.log('📦 步骤 3: 传播到多个网关 (使用 GET + Range)...');
  console.log('这会真正触发网关下载和缓存文件\n');

  const results = [];
  
  for (const gateway of GATEWAYS) {
    process.stdout.write(`  传播到 ${gateway.name}... `);
    
    const result = await propagateToGateway(gateway, cid);
    results.push({ gateway: gateway.name, ...result });
    
    if (result.success) {
      console.log(`✅ 成功 (${result.latency}ms)${result.cached ? ' [已缓存]' : ''}`);
    } else {
      console.log(`❌ 失败: ${result.error}`);
    }
  }

  console.log('\n========================================');
  console.log('传播结果统计');
  console.log('========================================');
  
  const successCount = results.filter(r => r.success).length;
  const cachedCount = results.filter(r => r.cached).length;
  
  console.log(`总网关数: ${results.length}`);
  console.log(`成功传播: ${successCount}`);
  console.log(`已缓存: ${cachedCount}`);
  console.log(`\n文件 CID: ${cid}`);
  console.log(`访问链接: https://ipfs.io/ipfs/${cid}`);
}

testPropagation();
