#!/usr/bin/env node

/**
 * 密码哈希和密钥生成工具
 * 运行: node scripts/generate-config.js
 */

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function sha256Hash(input) {
  return crypto.createHash('sha256').update(input).toString('hex');
}

function generateJwtSecret() {
  return crypto.randomBytes(32).toString('base64');
}

async function askQuestion(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function generateConfig() {
  console.log('\n🔐 CrustShare 配置生成工具\n');
  console.log('此工具将帮助您生成安全配置：');
  console.log('  - 用户密码哈希');
  console.log('  - 管理员密码哈希');
  console.log('  - JWT 密钥\n');

  try {
    // 获取用户密码
    const userPassword = await askQuestion('请输入用户密码（留空使用默认 "crustshare"）: ');
    const userPasswordHash = userPassword
      ? sha256Hash(userPassword)
      : sha256Hash('crustshare');

    // 获取管理员密码
    const adminPassword = await askQuestion('请输入管理员密码（留空使用默认 "admin"）: ');
    const adminPasswordHash = adminPassword
      ? sha256Hash(adminPassword)
      : sha256Hash('admin');

    // 生成 JWT 密钥
    const jwtSecret = generateJwtSecret();

    console.log('\n✅ 配置生成完成！\n');
    console.log('请在 .env 文件中添加以下配置：\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`# 密码配置`);
    console.log(`PASSWORD_HASH=${userPasswordHash}`);
    console.log(`ADMIN_PASSWORD_HASH=${adminPasswordHash}`);
    console.log(`\n# JWT 配置`);
    console.log(`CRUST_JWT_SECRET=${jwtSecret}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  请妥善保管这些配置，不要提交到版本控制系统\n');

    // 可选：获取 Upstash 配置
    const useRedis = await askQuestion('是否配置 Upstash Redis？(y/n) [n]: ');
    if (useRedis.toLowerCase() === 'y') {
      console.log('\n请访问 https://upstash.com/ 创建 Redis 数据库，然后将以下配置添加到 .env：');
      console.log('UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io');
      console.log('UPSTASH_REDIS_REST_TOKEN=your-redis-token\n');
    }
  } catch (error) {
    console.error('❌ 生成失败:', error.message);
  } finally {
    rl.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  generateConfig();
}

// 导出函数供其他模块使用
module.exports = { sha256Hash, generateJwtSecret };
