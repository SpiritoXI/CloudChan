/**
 * Crust API 测试脚本
 * 测试 Developer Profile Access Token 是否能正常工作
 */

const CRUST_UPLOAD_API = 'https://gw.crustfiles.app/api/v0/add?pin=true';
const CRUST_ORDER_API = 'https://gw.crustfiles.app/crust/api/v1/files';

async function testCrustAPI() {
  console.log('========================================');
  console.log('Crust API 测试开始');
  console.log('========================================\n');

  const token = process.env.CRUST_ACCESS_TOKEN;
  if (!token) {
    console.error('❌ 请设置 CRUST_ACCESS_TOKEN 环境变量');
    process.exit(1);
  }

  console.log('📦 测试 1: 上传测试文件...');
  
  const testContent = `Hello Crust! Test upload at ${new Date().toISOString()}`;
  const testFile = new Blob([testContent], { type: 'text/plain' });
  
  const formData = new FormData();
  formData.append('file', testFile, 'test-hello.txt');

  try {
    const uploadResponse = await fetch(CRUST_UPLOAD_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    console.log(`上传响应状态: ${uploadResponse.status}`);
    
    const responseText = await uploadResponse.text();
    console.log(`上传响应内容: ${responseText}`);

    if (!uploadResponse.ok) {
      console.error('❌ 上传失败!');
      console.error(`状态码: ${uploadResponse.status}`);
      console.error(`响应: ${responseText}`);
      return;
    }

    const uploadResult = JSON.parse(responseText);
    const cid = uploadResult.Hash || uploadResult.cid;
    const size = uploadResult.Size || testFile.size;

    console.log(`✅ 上传成功!`);
    console.log(`   CID: ${cid}`);
    console.log(`   大小: ${size} bytes`);

    console.log('\n📦 测试 2: 创建存储订单...');
    
    const orderResponse = await fetch(`${CRUST_ORDER_API}/${cid}/order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cid,
        size,
        months: 1200,
      }),
    });

    console.log(`订单响应状态: ${orderResponse.status}`);
    const orderText = await orderResponse.text();
    console.log(`订单响应内容: ${orderText}`);

    if (orderResponse.ok) {
      console.log('✅ 存储订单创建成功!');
    } else {
      console.log('⚠️ 存储订单创建可能失败，但文件已上传');
    }

    console.log('\n📦 测试 3: 通过 IPFS 网关验证文件...');
    
    const gateways = [
      'https://ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://dweb.link/ipfs/',
      'https://crustwebsites.net/ipfs/',
    ];

    for (const gateway of gateways) {
      try {
        console.log(`   尝试 ${gateway}${cid}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${gateway}${cid}`, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`   ✅ 可通过 ${gateway} 访问`);
        } else {
          console.log(`   ⚠️ ${gateway} 返回状态 ${response.status}`);
        }
      } catch (err) {
        console.log(`   ❌ ${gateway} 访问失败: ${err.message}`);
      }
    }

    console.log('\n📦 测试 4: 下载并验证文件内容...');
    
    try {
      const downloadResponse = await fetch(`https://ipfs.io/ipfs/${cid}`);
      if (downloadResponse.ok) {
        const content = await downloadResponse.text();
        if (content === testContent) {
          console.log('✅ 文件内容验证成功! 内容完全匹配');
        } else {
          console.log('⚠️ 文件内容不匹配');
        }
      }
    } catch (err) {
      console.log(`❌ 下载验证失败: ${err.message}`);
    }

    console.log('\n========================================');
    console.log('测试完成!');
    console.log(`文件 CID: ${cid}`);
    console.log(`访问链接: https://ipfs.io/ipfs/${cid}`);
    console.log('========================================');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

testCrustAPI();
