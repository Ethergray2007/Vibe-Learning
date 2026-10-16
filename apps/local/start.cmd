@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 Node.js。请安装 Node.js 24 LTS 后重新打开。https://nodejs.org/
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<24) process.exit(1)"
if errorlevel 1 (
  echo 需要 Node.js 24 或更新版本。请更新后重试。
  pause
  exit /b 1
)
if not exist dist\index.html (
  echo 界面尚未构建。请在本目录运行 npm ci 和 npm run build。
  pause
  exit /b 1
)
node server.mjs %*
if errorlevel 1 pause
