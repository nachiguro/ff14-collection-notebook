@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "DEFAULT_URL=http://127.0.0.1:4173"
set "APP_URL=%DEFAULT_URL%"

set "HAS_NODE="
if exist "%~dp0runtime\node.exe" set "HAS_NODE=1"
if exist "%~dp0node\node.exe" set "HAS_NODE=1"
if exist "%~dp0nodejs\node.exe" set "HAS_NODE=1"
if not defined HAS_NODE (
  where node >nul 2>nul
  if not errorlevel 1 set "HAS_NODE=1"
)
if not defined HAS_NODE (
  echo Node.js was not found.
  echo Install Node.js 20 or later, or place a portable node.exe at:
  echo %~dp0runtime\node.exe
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$app = (Resolve-Path '.').Path; try { $runtime = Join-Path $app '.ff14cn-server.json'; if (Test-Path $runtime) { $runtimeData = Get-Content $runtime -Raw | ConvertFrom-Json; $pidValue = $runtimeData.pid; if ($pidValue) { $target = Get-Process -Id $pidValue -ErrorAction SilentlyContinue; if ($target -and $target.ProcessName -eq 'node' -and $target.Path -and $target.Path.StartsWith($app, [StringComparison]::OrdinalIgnoreCase)) { Stop-Process -Id $pidValue -ErrorAction SilentlyContinue } } } } catch {}; Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($app, [StringComparison]::OrdinalIgnoreCase) } | Stop-Process -ErrorAction SilentlyContinue"

wscript.exe "%~dp0start-hidden.vbs"
timeout /t 2 /nobreak >nul

set "APP_URL=%DEFAULT_URL%"
for /f "usebackq delims=" %%U in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $p = Join-Path (Get-Location) '.ff14cn-server.json'; if (Test-Path $p) { (Get-Content $p -Raw | ConvertFrom-Json).url } } catch {}"`) do (
  if not "%%U"=="" set "APP_URL=%%U"
)

if not "%FF14CN_NO_OPEN%"=="1" start "" "%APP_URL%"
exit /b 0
