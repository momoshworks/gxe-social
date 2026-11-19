@echo off
title GXE Social Web App
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================================
echo   🚀 تشغيل منصة GXE Social محلياً
echo ========================================================
call npx vite --open
pause