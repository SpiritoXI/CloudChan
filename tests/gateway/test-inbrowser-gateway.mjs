/**
 * 测试 inbrowser.link 网关可用性
 */

const TEST_CID = 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy';

const INBROWSER_GATEWAY = {
  name: 'Inbrowser Link',
  url: 'https://inbrowser.link/ipfs/',
  icon: '🌐',
  priority: 5,
  region: 'INTL'
};

async function testGateway(gateway, testCid = TEST_CID) {
  const testUrl = `${gateway.url}${testCid}`;
  const timeout = 15000;

  console.log(`\n🔍 测试网关: ${gateway.name}`);
  console.log(`   URL: ${gateway.url}`);
  console.log(`   测试地址: ${testUrl}`);

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'CrustShare-Gateway-Test/1.0'
      }
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    console.log(`   状态码: ${response.status}`);
    console.log(`   延迟: ${latency}ms`);

    const corsEnabled = response.headers.has('access-control-allow-origin');
    const rangeSupport = response.headers.has('accept-ranges');

    console.log(`   CORS支持: ${corsEnabled ? '✅' : '❌'}`);
    console.log(`   Range支持: ${rangeSupport ? '✅' : '❌'}`);

    const available = response.ok || response.status === 200 || response.status === 204;

    if (available) {
      console.log(`   ✅ 网关可用`);
    } else {
      console.log(`   ❌ 网关不可用 (HTTP ${response.status})`);
    }

    return { available, latency, corsEnabled, rangeSupport };

  } catch (error) {
    const latency = Date.now() - startTime;
    console.log(`   ❌ 测试失败: ${error.message}`);
    return { available: false, latency, error: error.message };
  }
}

async function testGetRequest(gateway, testCid = TEST_CID) {
  const testUrl = `${gateway.url}${testCid}`;

  console.log(`\n📥 测试 GET 请求获取内容...`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(testUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const content = await response.text();
      console.log(`   ✅ GET 请求成功`);
      console.log(`   内容长度: ${content.length} 字节`);
      return { success: true, contentLength: content.length };
    } else {
      console.log(`   ❌ GET 请求失败: HTTP ${response.status}`);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.log(`   ❌ GET 请求错误: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 Inbrowser.link 网关测试工具');
  console.log('='.repeat(60));
  console.log(`测试 CID: ${TEST_CID}`);
  console.log(`测试时间: ${new Date().toLocaleString()}`);

  const headResult = await testGateway(INBROWSER_GATEWAY);

  let getResult = null;
  if (headResult.available) {
    getResult = await testGetRequest(INBROWSER_GATEWAY);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60));
  console.log(`网关名称: ${INBROWSER_GATEWAY.name}`);
  console.log(`网关地址: ${INBROWSER_GATEWAY.url}`);
  console.log(`HEAD 请求: ${headResult.available ? '✅ 可用' : '❌ 不可用'}`);
  if (headResult.available) {
    console.log(`延迟: ${headResult.latency}ms`);
    console.log(`CORS: ${headResult.corsEnabled ? '✅ 支持' : '❌ 不支持'}`);
    console.log(`Range: ${headResult.rangeSupport ? '✅ 支持' : '❌ 不支持'}`);
  }
  if (getResult) {
    console.log(`GET 请求: ${getResult.success ? '✅ 成功' : '❌ 失败'}`);
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
