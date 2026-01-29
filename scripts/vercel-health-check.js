#!/usr/bin/env node

/**
 * Vercel 部署健康检查脚本
 * 用于诊断 Vercel 部署后的环境变量和 API 状态
 */

const https = require('https');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

// 检查 URL 可访问性
async function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const { hostname, pathname, search } = new URL(url);
      const options = {
        hostname,
        path: pathname + search,
        method: 'GET',
        timeout: 5000,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          resolve({
            success: true,
            statusCode: res.statusCode,
            data: data,
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Request timeout',
        });
      });

      req.end();
    } catch (error) {
      resolve({
        success: false,
        error: error.message,
      });
    }
  });
}

// 测试登录 API
async function testLoginAPI(baseUrl) {
  logInfo('测试登录 API...');
  const url = `${baseUrl}/api/auth/login`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin: '123456' }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      logSuccess(`登录 API 正常工作，PIN 码验证成功`);
      return true;
    } else {
      logError(`登录 API 返回错误: ${data.error || response.statusText}`);
      return false;
    }
  } catch (error) {
    logError(`登录 API 请求失败: ${error.message}`);
    return false;
  }
}

// 主检查函数
async function healthCheck(vercelUrl) {
  if (!vercelUrl) {
    logError('请提供 Vercel 部署 URL');
    process.exit(1);
  }

  // 移除末尾斜杠
  vercelUrl = vercelUrl.replace(/\/$/, '');

  log('\n=================================================');
  log('Vercel 部署健康检查', 'blue');
  log('=================================================\n');

  logInfo(`目标 URL: ${vercelUrl}\n`);

  // 1. 检查首页
  logInfo('1. 检查首页...');
  const homeCheck = await checkUrl(vercelUrl);
  if (homeCheck.success && homeCheck.statusCode === 200) {
    logSuccess('首页可访问');
  } else {
    logError(`首页无法访问 (${homeCheck.error || `Status: ${homeCheck.statusCode}`})`);
  }

  // 2. 检查登录 API
  const loginCheck = await testLoginAPI(vercelUrl);

  // 3. 诊断建议
  log('\n=================================================');
  log('诊断建议', 'blue');
  log('=================================================\n');

  if (!homeCheck.success) {
    logError('应用可能未正确部署');
    logInfo('建议:');
    logInfo('  1. 检查 Vercel Dashboard 中的部署状态');
    logInfo('  2. 查看构建日志排查错误');
  }

  if (!loginCheck) {
    logError('登录功能异常');
    logInfo('可能的原因:');
    logInfo('  1. 环境变量 PIN_CODE 未设置');
    logInfo('  2. 环境变量设置后未重新部署');
    logInfo('\n解决步骤:');
    logInfo('  1. 进入 Vercel Dashboard → Project Settings → Environment Variables');
    logInfo('  2. 添加 PIN_CODE 环境变量（如：123456）');
    logInfo('  3. 确保勾选 Production, Preview, Development 环境');
    logInfo('  4. 进入 Deployments → Redeploy');
  } else {
    logSuccess('所有检查通过！应用运行正常。');
  }

  log('\n=================================================\n');
}

// 从命令行参数获取 URL
const vercelUrl = process.argv[2] || process.env.VERCEL_URL;

if (!vercelUrl) {
  logError('使用方法: node scripts/vercel-health-check.js <your-vercel-url>');
  logInfo('示例: node scripts/vercel-health-check.js https://crustshare.vercel.app');
  process.exit(1);
}

healthCheck(vercelUrl);
