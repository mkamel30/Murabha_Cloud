@echo off
setlocal enabledelayedexpansion
title Murabha Cloud - Local Server Launcher

echo ===============================================================================
echo            Murabha Cloud - Enterprise Platform Launcher
echo ===============================================================================
echo.

REM 1. Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please install Node.js 20 LTS from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

REM 2. Check dependencies
if not exist "node_modules" (
    echo [INFO] First run detected. Installing dependencies across workspaces...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

echo [INFO] Preparing Local Environment...
echo [INFO] Backend will run on:  http://localhost:3007
echo [INFO] Frontend will run on: http://localhost:2436
echo.
echo -------------------------------------------------------------------------------
echo Default Credentials:
echo   Username: admin
echo   Password: Admin@2026!
echo -------------------------------------------------------------------------------
echo.

REM 3. Launch Backend in a separate window
echo [INFO] Starting Backend API Service in background window...
start "Murabha Cloud - Backend API (Port 3007)" cmd /k "cd /d %~dp0 && npm run dev:backend"

REM 4. Launch Frontend in a separate window
echo [INFO] Starting Frontend Web Service in background window...
start "Murabha Cloud - Frontend UI (Port 2436)" cmd /k "cd /d %~dp0 && npm run dev:frontend"

echo.
echo [SUCCESS] Both servers are starting up!
echo Waiting for servers to initialize before opening your browser...
timeout /t 5 /nobreak >nul

REM 5. Open Default Browser
echo [INFO] Opening Murabha Cloud in your default browser...
start http://localhost:2436

echo.
echo ===============================================================================
echo [ACTIVE] Murabha Cloud is running locally!
echo To stop the servers, simply close the opened Backend and Frontend windows.
echo ===============================================================================
echo.
pause