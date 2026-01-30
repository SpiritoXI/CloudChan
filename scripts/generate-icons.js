const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_IMAGE = path.join(__dirname, '../public/icons/source.png');
const OUTPUT_DIR = path.join(__dirname, '../public');

const ICONS = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
];

async function generateIcons() {
  try {
    // 检查源文件是否存在
    if (!fs.existsSync(SOURCE_IMAGE)) {
      console.error('错误: 源图片不存在!');
      console.error(`请先将图片保存到: ${SOURCE_IMAGE}`);
      process.exit(1);
    }

    console.log('正在生成图标...');

    // 生成各种尺寸的 PNG 图标
    for (const icon of ICONS) {
      const outputPath = path.join(OUTPUT_DIR, icon.name);
      await sharp(SOURCE_IMAGE)
        .resize(icon.size, icon.size, {
          fit: 'cover',
          position: 'center'
        })
        .png({ quality: 90 })
        .toFile(outputPath);
      console.log(`✓ 生成: ${icon.name} (${icon.size}x${icon.size})`);
    }

    // 生成 favicon.ico (包含多个尺寸)
    const icoPath = path.join(OUTPUT_DIR, 'favicon.ico');
    
    // 使用 sharp 生成多尺寸 ICO
    const sizes = [16, 32, 48];
    const buffers = [];
    
    for (const size of sizes) {
      const buffer = await sharp(SOURCE_IMAGE)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .png()
        .toBuffer();
      buffers.push({ size, buffer });
    }
    
    // 创建简单的 ICO 文件
    // 注意: 这里我们生成一个 32x32 的 PNG 作为 favicon.ico 的替代
    // 现代浏览器都支持 PNG 格式的 favicon
    await sharp(SOURCE_IMAGE)
      .resize(32, 32, { fit: 'cover', position: 'center' })
      .png()
      .toFile(icoPath);
    console.log(`✓ 生成: favicon.ico (32x32)`);

    // 复制一份到根目录作为 icon.png (Next.js App Router 默认)
    await sharp(SOURCE_IMAGE)
      .resize(192, 192, { fit: 'cover', position: 'center' })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'icon.png'));
    console.log(`✓ 生成: icon.png (192x192)`);

    console.log('\n✅ 所有图标生成完成!');
    console.log('\n生成的文件:');
    console.log('  - favicon.ico');
    console.log('  - favicon-16x16.png');
    console.log('  - favicon-32x32.png');
    console.log('  - favicon-48x48.png');
    console.log('  - apple-touch-icon.png (180x180)');
    console.log('  - icon.png (192x192)');
    console.log('  - icon-192x192.png');
    console.log('  - icon-512x512.png');

  } catch (error) {
    console.error('生成图标时出错:', error);
    process.exit(1);
  }
}

generateIcons();
