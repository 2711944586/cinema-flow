@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

echo =======================================================
echo        CinemaFlow private screening archive
echo =======================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo [1/5] Checking local tools...
call npm -v >nul 2>&1
if errorlevel 1 (
    echo [Error] Node.js and npm are required.
    pause
    exit /b 1
)

call python --version >nul 2>&1
if errorlevel 1 (
    echo [Error] Python is required for the Flask API.
    pause
    exit /b 1
)

echo [2/5] Preparing frontend dependencies...
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo [Error] npm install failed.
        pause
        exit /b 1
    )
) else (
    echo node_modules found.
)

echo [3/5] Preparing API dependencies...
call python -m pip install -r "cinemaflow-api\requirements.txt"
if errorlevel 1 (
    echo [Error] Python dependency installation failed.
    pause
    exit /b 1
)

echo [4/5] Selecting open ports...
call :find_open_port 5000 BACKEND_PORT
call :find_open_port 4200 FRONTEND_PORT
echo API port: %BACKEND_PORT%
echo Web port: %FRONTEND_PORT%

(
echo {
echo   "/api": {
echo     "target": "http://127.0.0.1:%BACKEND_PORT%",
echo     "secure": false,
echo     "changeOrigin": true,
echo     "logLevel": "warn"
echo   }
echo }
) > ".runtime-proxy.conf.json"

echo [5/5] Starting CinemaFlow...
start "CinemaFlow API :%BACKEND_PORT%" powershell -NoExit -ExecutionPolicy Bypass -Command "$env:PORT='%BACKEND_PORT%'; Set-Location '%ROOT_DIR%cinemaflow-api'; python app.py"
timeout /t 3 /nobreak >nul
start "CinemaFlow Web :%FRONTEND_PORT%" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location '%ROOT_DIR%'; npm run start -- --port %FRONTEND_PORT% --proxy-config .runtime-proxy.conf.json --open"

echo.
echo Frontend: http://localhost:%FRONTEND_PORT%
echo API:      http://localhost:%BACKEND_PORT%/api/health
echo.
pause
exit /b 0

:find_open_port
for /f %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=%~1; while (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) { $p++ }; Write-Output $p"') do set "%~2=%%P"
exit /b 0
