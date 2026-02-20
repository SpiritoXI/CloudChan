/**
 * 网关测试脚本
 * 测试多个 IPFS 网关的可用性和延迟
 */

const TEST_CID = 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy';

const GATEWAYS = [
  { name: 'Cloudflare-CN', url: 'https://cf-ipfs.com/ipfs/', region: 'CN' },
  { name: 'IPFSScan-CN', url: 'https://cdn.ipfsscan.io/ipfs/', region: 'CN' },
  { name: '4EVERLAND-CN', url: 'https://4everland.io/ipfs/', region: 'CN' },
  { name: 'IPFS.io', url: 'https://ipfs.io/ipfs/', region: 'INTL' },
  { name: 'Cloudflare', url: 'https://cloudflare-ipfs.com/ipfs/', region: 'INTL' },
  { name: 'Pinata', url: 'https://gateway.pinata.cloud/ipfs/', region: 'INTL' },
  { name: 'DWeb', url: 'https://dweb.link/ipfs/', region: 'INTL' },
];

async function testGateway(gateway, cid, timeout = 10000) {
  const url = `${gateway.url}${cid}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const startTime = performance.now();
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    const latency = Math.round(performance.now() - startTime);
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const rangeSupport = response.status === 206 || response.headers.has('content-range');
      const corsEnabled = response.headers.has('access-control-allow-origin');
      
      return { 
        success: true, 
        latency, 
        rangeSupport, 
        corsEnabled,
        available: true 
      };
    }
    
    return { success: false, latency, available: false };
  } catch (error) {
    return { success: false, latency: Infinity, available: false, error: error.message };
  }
}

async function runTests() {
  console.log('========================================');
  console.log('网关测试开始');
  console.log('========================================\n');

  const results = [];

  for (const gateway of GATEWAYS) {
    process.stdout.write(`测试 ${gateway.name}... `);
    
    const result = await testGateway(gateway, TEST_CID);
    results.push({ ...gateway, ...result });
    
    if (result.success) {
      console.log(`✅ ${result.latency}ms${result.rangeSupport ? ' [Range]' : ''}${result.corsEnabled ? ' [CORS]' : ''}`);
    } else {
      console.log(`❌ 不可用`);
    }
  }

  console.log('\n========================================');
  console.log('测试结果汇总');
  console.log('========================================\n');

  const available = results.filter(r => r.available);
  const sorted = available.sort((a, b) => a.latency - b.latency);

  console.log('可用网关 (按延迟排序):');
  sorted.forEach((g, i) => {
    console.log(`  ${i + 1}. ${g.name}: ${g.latency}ms [${g.region}]`);
  });

  console.log(`\n总计: ${available.length}/${results.length} 个网关可用`);
}

runTests();
