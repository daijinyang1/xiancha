# 打包后端 jar。改了 Java 代码或 db/*.json 之后跑一次。
$ErrorActionPreference = 'Stop'
$env:JAVA_HOME = 'D:\App\jdk21'
$env:Path = "$env:JAVA_HOME\bin;D:\App\maven\bin;$env:Path"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pom = Join-Path $root 'pom.xml'
Write-Host "打包 $pom ..."
& 'D:\App\maven\bin\mvn.cmd' -B -f $pom -DskipTests package
if ($LASTEXITCODE -ne 0) { Write-Host '打包失败' -ForegroundColor Red; exit 1 }
$jar = Join-Path $root 'target\xiancha-server-1.0.0.jar'
Write-Host ("成功：{0} ({1:N0} 字节)" -f $jar, (Get-Item $jar).Length) -ForegroundColor Green
Write-Host '重启服务见项目根目录的 启动.bat / 停止.bat'