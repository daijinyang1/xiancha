@echo off
chcp 65001 >nul
echo 停止 8080 后端 ...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do taskkill /F /PID %%a
echo 停止 3000 前端 ...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a
echo 完成。（PostgreSQL 是系统服务，不停，它开机自启）