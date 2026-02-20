/**
 * 测试推荐的 IPFS 网关
 */

const TEST_CID = 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy';

const GATEWAYS_TO_TEST = [
  { name: 'IPFS.io Gateway', url: 'https://gateway.ipfs.io/ipfs/', icon: '🌐', priority: 14, region: 'INTL' },
  { name: 'Hardbin', url: 'https://hardbin.com/ipfs/', icon: '📦', priority: 15, region: 'INTL' },
  { name: 'Fleek', url: 'https://ipfs.fleek.co/ipfs/', icon: '⚡', priority: 16, region: 'INTL' },
  { name: 'IPFS.io', url: 'https://ipfs.io/ipfs/', icon: '🧊', priority: 17, region: 'INTL' }
];

async function testGateway(gateway, testCid = TEST_CID) {
  const testUrl = `${gateway.url}${testCid}`;
  const timeout = 15000;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 测试: ${gateway.name}`);
  console.log(`   URL: ${gateway.url}`);

  const results = { gateway: gateway.name, url: gateway.url, tests: {} };

  console.log(`\n   📡 HEAD 请求测试...`);
  const headStart = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'Accept': '*/*' }
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - headStart;

    const corsEnabled = response.headers.has('access-control-allow-origin');
    const rangeSupport = response.headers.has('accept-ranges');

    results.tests.head = { success: response.ok, status: response.status, latency, corsEnabled, rangeSupport };

    console.log(`      状态: ${response.ok ? '✅' : '❌'} HTTP ${response.status}`);
    console.log(`      延迟: ${latency}ms`);
    console.log(`      CORS: ${corsEnabled ? '✅' : '❌'}`);
    console.log(`      Range: ${rangeSupport ? '✅' : '❌'}`);

  } catch (error) {
    const latency = Date.now() - headStart;
    results.tests.head = { success: false, error: error.message, latency };
    console.log(`      ❌ 失败: ${error.message} (${latency}ms)`);
  }

  let score = 0;
  if (results.tests.head?.success) score += 50;
  if (results.tests.head?.corsEnabled) score += 20;
  if (results.tests.head?.rangeSupport) score += 15;
  if (results.tests.head?.latency < 3000) score += 15;

  results.score = Math.max(0, score);
  results.recommended = score >= 60;

  console.log(`\n   📊 综合评分: ${score}/100 ${results.recommended ? '✅ 推荐' : '❌ 不推荐'}`);

  return results;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🧪 推荐 IPFS 网关批量测试');
  console.log('='.repeat(70));
  console.log(`测试 CID: ${TEST_CID}`);
  console.log(`测试时间: ${new Date().toLocaleString()}`);

  const allResults = [];

  for (const gateway of GATEWAYS_TO_TEST) {
    const result = await testGateway(gateway);
    allResults.push(result);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📋 测试总结报告');
  console.log('='.repeat(70));

  allResults.sort((a, b) => b.score - a.score);

  console.log('\n🏆 排名结果:');
  allResults.forEach((result, index) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
    console.log(`\n${medal} #${rank} ${result.gateway}`);
    console.log(`   评分: ${result.score}/100 ${result.recommended ? '✅' : '❌'}`);
    console.log(`   URL: ${result.url}`);
    if (result.tests.head) {
      console.log(`   HEAD: ${result.tests.head.success ? '✅' : '❌'} ${result.tests.head.latency}ms`);
    }
  });

  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
