@echo off
chcp 65001 >nul
echo =======================================================
echo         🍿 CinemaFlow 内部电影库管理系统 - 启动程序
echo =======================================================
echo.
echo [1/3] 正在检查环境...
call npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 请先安装 Node.js 和 npm!
    pause
    exit /b
)

echo [2/3] 正在安装依赖包 (可能需要一些时间，请耐心等待)...
call npm install
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败，请检查网络或 npm 源。
    pause
    exit /b
)

echo [3/3] 依赖就绪，正在启动服务...
echo [提示] 启动成功后，浏览器会自动打开 http://localhost:4200
echo.
call npm run start -- --open

pause
