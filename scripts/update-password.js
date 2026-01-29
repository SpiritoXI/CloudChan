#!/usr/bin/env node

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function sha256Hash(input) {
  return crypto.createHash('sha256').update(input).toString('hex');
}

function askQuestion(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function updatePasswordHash() {
  console.log('\n======================================');
  console.log('  CrustShare 密码哈希生成器');
  console.log('======================================\n');

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
    const jwtSecret = crypto.randomBytes(32).toString('base64');

    // 生成 Upstash Redis 密钥（可选）
    const useRedis = await askQuestion('是否配置 Upstash Redis？(y/n) [n]: ');

    console.log('\n======================================');
    console.log('  生成完成！');
    console.log('======================================\n');

    console.log('请复制以下配置到 .env 文件：\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`# 密码配置（SHA-256 哈希值）`);
    console.log(`# 用户密码: "${userPassword || 'crustshare'}"`);
    console.log(`PASSWORD_HASH=${userPasswordHash}`);
    console.log('');
    console.log(`# 管理员密码: "${adminPassword || 'admin'}"`);
    console.log(`ADMIN_PASSWORD_HASH=${adminPasswordHash}`);
    console.log('');
    console.log(`# JWT 配置`);
    console.log(`CRUST_JWT_SECRET=${jwtSecret}`);
    console.log('');

    if (useRedis.toLowerCase() === 'y') {
      console.log(`# Upstash Redis 配置`);
      console.log(`# 访问 https://console.upstash.com/ 获取配置`);
      console.log(`UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io`);
      console.log(`UPSTASH_REDIS_REST_TOKEN=your-redis-token`);
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 提供更新选项
    const updateNow = await askQuestion('是否立即更新 .env 文件？(y/n) [y]: ');

    if (updateNow.toLowerCase() !== 'n') {
      const fs = require('fs');

      try {
        // 读取现有 .env 文件
        let envContent = '';
        if (fs.existsSync('.env')) {
          envContent = fs.readFileSync('.env', 'utf8');
        }

        // 更新密码哈希
        envContent = envContent.replace(/PASSWORD_HASH=.*/g, `PASSWORD_HASH=${userPasswordHash}`);
        envContent = envContent.replace(/ADMIN_PASSWORD_HASH=.*/g, `ADMIN_PASSWORD_HASH=${adminPasswordHash}`);
        envContent = envContent.replace(/CRUST_JWT_SECRET=.*/g, `CRUST_JWT_SECRET=${jwtSecret}`);

        // 如果 .env 中没有这些变量，添加它们
        if (!envContent.includes('PASSWORD_HASH=')) {
          envContent += `\n# 密码配置（SHA-256 哈希值）\nPASSWORD_HASH=${userPasswordHash}\n`;
        }
        if (!envContent.includes('ADMIN_PASSWORD_HASH=')) {
          envContent += `ADMIN_PASSWORD_HASH=${adminPasswordHash}\n`;
        }
        if (!envContent.includes('CRUST_JWT_SECRET=')) {
          envContent += `# JWT 配置\nCRUST_JWT_SECRET=${jwtSecret}\n`;
        }

        // 写入文件
        fs.writeFileSync('.env', envContent);

        console.log('\n✅ .env 文件已更新！\n');
        console.log('请重启开发服务器以使更改生效：');
        console.log('  1. 停止服务器（Ctrl + C）');
        console.log('  2. 运行 pnpm dev\n');

      } catch (error) {
        console.error('\n❌ 更新 .env 文件失败:', error.message);
        console.log('\n请手动复制上面的配置到 .env 文件\n');
      }
    }

    console.log('⚠️  重要提示：');
    console.log('  1. 请妥善保管你的密码');
    console.log('  2. 不要将密码提交到版本控制系统');
    console.log('  3. 如果部署到 Vercel，请同步更新环境变量\n');

  } catch (error) {
    console.error('❌ 生成失败:', error.message);
  } finally {
    rl.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  updatePasswordHash();
}

// 导出函数供其他模块使用
module.exports = { sha256Hash };
