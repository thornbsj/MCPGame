const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 清理构建目录
console.log('Cleaning build directory...');
if (fs.existsSync('build')) {
  fs.rmSync('build', { recursive: true });
}

// 创建构建目录
fs.mkdirSync('build');

// 编译TypeScript
console.log('Compiling TypeScript...');
execSync('npx tsc', { stdio: 'inherit' });

// 使用pkg打包
console.log('Packaging with pkg...');
execSync('npx pkg . --out-path build/', { stdio: 'inherit' });

// 复制配置文件
console.log('Copying config files...');
if (fs.existsSync('config')) {
  // 创建目标config目录
  const targetConfigDir = path.join('build', 'config');
  if (!fs.existsSync(targetConfigDir)) {
    fs.mkdirSync(targetConfigDir, { recursive: true });
  }
  
  // 复制所有配置文件
  const files = fs.readdirSync('config');
  files.forEach(file => {
    const source = path.join('config', file);
    const target = path.join(targetConfigDir, file);
    fs.copyFileSync(source, target);
  });
}

console.log('Build completed! Executables are in the build/ directory.');