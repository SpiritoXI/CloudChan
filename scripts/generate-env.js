#!/usr/bin/env node
/**
 * Cloudflare Pages 部署时自动生成 .env.local 文件
 * 从 Cloudflare Pages 环境变量读取配置并写入 .env.local
 */

const fs = require('fs');
const path = require('path');

// 需要的环境变量列表
const requiredEnvVars = [
  'UPSTASH_URL',
  'UPSTASH_TOKEN',
  'ADMIN_PASSWORD',
  'CRUST_TOKEN'
];

// 可选的环境变量（有默认值）
const optionalEnvVars = [
  { name: 'NEXT_PUBLIC_APP_VERSION', default: process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7) || 'unknown' },
  { name: 'NEXT_PUBLIC_BUILD_TIME', default: new Date().toISOString() }
];

function generateEnvFile() {
  console.log('🚀 开始生成 .env.local 文件...');

  const envContent = [];
  let missingVars = [];

  // 检查必需的环境变量
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      envContent.push(`${varName}=${value}`);
      console.log(`✅ ${varName}: 已配置`);
    } else {
      missingVars.push(varName);
      console.log(`⚠️  ${varName}: 未设置`);
    }
  });

  // 添加可选的环境变量
  optionalEnvVars.forEach(({ name, default: defaultValue }) => {
    const value = process.env[name] || defaultValue;
    if (value) {
      envContent.push(`${name}=${value}`);
    }
  });

  // 如果有缺失的必需变量，发出警告
  if (missingVars.length > 0) {
    console.warn('\n⚠️  警告: 以下环境变量未设置，可能导致功能异常:');
    missingVars.forEach(varName => console.warn(`   - ${varName}`));
    console.warn('\n请在 Cloudflare Pages Dashboard 的 Environment variables 中设置这些变量。\n');
  }

  // 写入 .env.local 文件
  const envPath = path.join(process.cwd(), '.env.local');
  const content = `# 自动生成于 ${new Date().toISOString()}
# Cloudflare Pages 环境变量导出
# 请勿将此文件提交到版本控制

${envContent.join('\n')}
`;

  try {
    fs.writeFileSync(envPath, content, 'utf8');
    console.log(`\n✅ .env.local 文件已生成: ${envPath}`);
    console.log(`📄 文件内容预览:`);
    console.log('─'.repeat(50));
    console.log(content);
    console.log('─'.repeat(50));
    return true;
  } catch (error) {
    console.error('❌ 生成 .env.local 文件失败:', error.message);
    process.exit(1);
  }
}

// 执行生成
if (require.main === module) {
  generateEnvFile();
}

module.exports = { generateEnvFile };
