@echo off
setlocal enabledelayedexpansion
title Murabha Cloud - Java Spring Boot Edition Launcher

echo ===============================================================================
echo        Murabha Cloud - Enterprise Platform Launcher (Spring Boot)
echo ===============================================================================
echo.

REM 1. Check Java installation
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Java is not found on your system!
    echo Please install OpenJDK 17 LTS or higher and try again.
    echo.
    pause
    exit /b 1
)

REM 2. Check Node.js installation (for frontend)
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please install Node.js 20 LTS from https://nodejs.org/ for the web UI.
    echo.
    pause
    exit /b 1
)

echo [INFO] Preparing Local Environment...
echo [INFO] Spring Boot API will run on: http://localhost:3008
echo [INFO] Swagger API Docs available:  http://localhost:3008/swagger-ui.html
echo [INFO] Frontend Web UI will run on: http://localhost:2436
echo.
echo -------------------------------------------------------------------------------
echo Default Credentials:
echo   Username: admin
echo   Password: Admin@2026!
echo -------------------------------------------------------------------------------
echo.

REM 3. Launch Spring Boot Backend in a separate window
echo [INFO] Starting Java Spring Boot Backend in background window...
start "Murabha Cloud - Spring Boot API (Port 3008)" cmd /k "cd /d %~dp0backend-java && mvnw.cmd spring-boot:run"

REM 4. Launch Frontend in a separate window
echo [INFO] Starting Frontend Web Service in background window...
start "Murabha Cloud - Frontend UI (Port 2436)" cmd /k "cd /d %~dp0 && npm run dev:frontend"

echo.
echo [SUCCESS] Both servers are starting up!
echo Waiting for servers to initialize before opening your browser...
timeout /t 6 /nobreak >nul

REM 5. Open Default Browser
echo [INFO] Opening Murabha Cloud in your default browser...
start http://localhost:2436

echo.
echo ===============================================================================
echo [ACTIVE] Murabha Cloud (Spring Boot Edition) is running locally!
echo To stop the servers, simply close the opened Backend and Frontend windows.
echo ===============================================================================
echo.
pause