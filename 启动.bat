@echo off
chcp 65001 >nul
setlocal
set JAVA_HOME=D:\App\jdk21
set PATH=%JAVA_HOME%\bin;%PATH%
cd /d "%~dp0"

echo [1/3] 检查 PostgreSQL :5432 ...
netstat -ano | findstr ":5432" | findstr LISTENING >nul 2>&1
if errorlevel 1 (
  echo     没在跑，调用 D:\App\PostgreSQL\_autostart.bat 启动
  call "D:\App\PostgreSQL\_autostart.bat"
  timeout /t 4 /nobreak >nul
  netstat -ano | findstr ":5432" | findstr LISTENING >nul 2>&1
  if errorlevel 1 (
    echo     启动失败，看 D:\App\PostgreSQL\logs\pg.log
    pause
    exit /b 1
  )
)
echo     数据库在跑。

echo [2/3] 启动后端 Spring Boot :8080 ...
netstat -ano | findstr ":8080" | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
  echo     8080 已在监听，跳过。
) else (
  if not exist "server\target\xiancha-server-1.0.0.jar" (
    echo     jar 不存在，先运行 server\build.mvn.ps1 打包
    pause
    exit /b 1
  )
  start "xiancha-backend" cmd /c ""%JAVA_HOME%\bin\java.exe" -jar "%~dp0server\target\xiancha-server-1.0.0.jar" > "%~dp0server\run.log" 2>&1"
  echo     已拉起，日志 server\run.log
)

echo [3/3] 启动前端 Nuxt :3000 ...
netstat -ano | findstr ":3000" | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
  echo     3000 已在监听，跳过。
) else (
  cd /d "%~dp0web"
  start "xiancha-web" cmd /c "node "C:\Users\21971\AppData\Local\nodejs\node_modules\npm\bin\npm-cli.js" run dev"
  echo     已拉起。
)

echo 等后端起来（最多 40 秒）...
set /a n=0
:waitbe
timeout /t 2 /nobreak >nul
netsh winhttp show proxy >nul 2>&1
netstat -ano | findstr ":8080" | findstr LISTENING >nul 2>&1
if not errorlevel 1 goto beok
set /a n+=1
if %n% lss 20 goto waitbe
:beok

echo.
echo 打开 http://127.0.0.1:3000/
start "" http://127.0.0.1:3000/
echo 后端接口自检：http://127.0.0.1:8080/api/stats
echo 关闭服务：双击 停止.bat
echo.
pause