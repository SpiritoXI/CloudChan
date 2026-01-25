const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const postcss = require('postcss');
const cssnano = require('cssnano');

// 资源目录（根站点模式：静态文件位于 cloudchan/）
const cloudchanDir = path.join(__dirname, 'cloudchan');
const jsFiles = ['config.js', 'ui.js', 'app.js'].map(file => path.join(cloudchanDir, file));
const cssFile = path.join(cloudchanDir, 'style.css');

// 输出目录
const outputDir = path.join(cloudchanDir, 'dist');
const outputJsMap = new Map(
    jsFiles.map(file => [file, path.join(outputDir, `${path.basename(file, '.js')}.min.js`)])
);
const outputCss = path.join(outputDir, 'style.min.css');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 压缩 JavaScript（逐文件压缩，保留 ES Module 语义）
async function compressJs() {
    console.log('开始压缩 JavaScript...');
    
    try {
        let originalTotal = 0;
        let compressedTotal = 0;

        for (const inputFile of jsFiles) {
            const source = fs.readFileSync(inputFile, 'utf8');
            const result = await minify(source, {
                module: true,
                compress: {
                    drop_console: false,
                    drop_debugger: true
                },
                mangle: true,
                format: {
                    beautify: false,
                    comments: false
                }
            });

            if (result.error) {
                throw result.error;
            }

            const outFile = outputJsMap.get(inputFile);
            fs.writeFileSync(outFile, result.code);

            originalTotal += Buffer.byteLength(source);
            compressedTotal += Buffer.byteLength(result.code);
        }

        const savings = originalTotal > 0
            ? ((originalTotal - compressedTotal) / originalTotal * 100).toFixed(2)
            : '0.00';

        console.log(`✓ JavaScript 压缩完成：${(originalTotal / 1024).toFixed(2)}KB → ${(compressedTotal / 1024).toFixed(2)}KB（节省 ${savings}%）`);
        
    } catch (error) {
        console.error('✗ JavaScript 压缩失败：', error);
        process.exit(1);
    }
}

// 压缩 CSS
async function compressCss() {
    console.log('开始压缩 CSS...');
    
    try {
        // 读取CSS文件内容
        const cssContent = fs.readFileSync(cssFile, 'utf8');
        
        // 压缩CSS
        const result = await postcss([
            cssnano({
                preset: 'default'
            })
        ]).process(cssContent, {
            from: cssFile
        });
        
        // 写入压缩后的CSS文件
        fs.writeFileSync(outputCss, result.css);
        
        // 计算压缩前后的大小
        const originalSize = Buffer.byteLength(cssContent);
        const compressedSize = Buffer.byteLength(result.css);
        const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
        
        console.log(`✓ CSS 压缩完成：${(originalSize / 1024).toFixed(2)}KB → ${(compressedSize / 1024).toFixed(2)}KB（节省 ${savings}%）`);
        
    } catch (error) {
        console.error('✗ CSS 压缩失败：', error);
        process.exit(1);
    }
}

// 更新 HTML 引用：切换到 dist/ 下的压缩资源
function updateHtml() {
    console.log('更新 HTML 引用...');
    
    const htmlFiles = [
        path.join(cloudchanDir, 'index.html'),
        path.join(cloudchanDir, 'login.html')
    ];
    
    htmlFiles.forEach(file => {
        try {
            let content = fs.readFileSync(file, 'utf8');
            
            // 替换JavaScript引用（保持 ES Module）
            content = content.replace(/<script\s+type="module"\s+src="\.\/ui\.js(\?v=[^"]+)?"><\/script>/g, '<script type="module" src="./dist/ui.min.js$1"></script>');
            content = content.replace(/<script\s+type="module"\s+src="\.\/config\.js(\?v=[^"]+)?"><\/script>/g, '<script type="module" src="./dist/config.min.js$1"></script>');
            content = content.replace(/<script\s+type="module"\s+src="\.\/app\.js(\?v=[^"]+)?"><\/script>/g, '<script type="module" src="./dist/app.min.js$1"></script>');
            
            // 替换CSS引用
            content = content.replace(/<link\s+rel="stylesheet"\s+href="style\.css(\?v=[^"]+)?">/g, '<link rel="stylesheet" href="dist/style.min.css$1">');
            
            fs.writeFileSync(file, content);
            console.log(`✓ 已更新 ${path.basename(file)}`);
            
        } catch (error) {
            console.error(`✗ 更新失败 ${path.basename(file)}：`, error);
        }
    });
}

// 恢复 HTML 引用：从 dist/ 压缩资源切回原始资源
function restoreHtml() {
    console.log('恢复 HTML 引用到原始资源...');
    
    const htmlFiles = [
        path.join(cloudchanDir, 'index.html'),
        path.join(cloudchanDir, 'login.html')
    ];
    
    htmlFiles.forEach(file => {
        try {
            let content = fs.readFileSync(file, 'utf8');
            
            // 恢复JavaScript引用
            content = content.replace(/<script\s+type="module"\s+src="\.\/dist\/ui\.min\.js(\?v=[^"]+)?"><\/script>/g, '<script type="module" src="./ui.js$1"></script>');
            content = content.replace(/<script\s+type="module"\s+src="\.\/dist\/config\.min\.js(\?v=[^"]+)?"><\/script>/g, '<script type="module" src="./config.js$1"></script>');
            content = content.replace(/<script\s+type="module"\s+src="\.\/dist\/app\.min\.js(\?v=[^"]+)?"><\/script>/g, '<script type="module" src="./app.js$1"></script>');
            
            // 恢复CSS引用
            content = content.replace(/<link\s+rel="stylesheet"\s+href="dist\/style\.min\.css(\?v=[^"]+)?">/g, '<link rel="stylesheet" href="style.css$1">');
            
            fs.writeFileSync(file, content);
            console.log(`✓ 已恢复 ${path.basename(file)}`);
            
        } catch (error) {
            console.error(`✗ 恢复失败 ${path.basename(file)}：`, error);
        }
    });
}

// 主入口
async function main() {
    console.log('开始执行资源压缩...');
    
    // 检查命令行参数
    const args = process.argv.slice(2);
    if (args.includes('--restore')) {
        restoreHtml();
        console.log('\n✓ 已恢复为原始引用');
        return;
    }
    
    await compressJs();
    await compressCss();
    updateHtml();
    
    console.log('\n✓ 所有资源已压缩并更新引用！');
}

// 执行
main().catch(error => {
    console.error('✗ 资源压缩失败：', error);
    process.exit(1);
});
