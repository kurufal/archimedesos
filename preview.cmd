@echo off
setlocal
set "PATH=%LOCALAPPDATA%\ArchimedesOS\preview-runtime;%PATH%;%USERPROFILE%\.bun\bin;%LOCALAPPDATA%\hermes\node"
where bun >nul 2>nul || (echo Bun was not found. Install Bun from https://bun.sh and retry. & exit /b 1)
where node >nul 2>nul || (echo Node.js was not found. Install Node.js 22 and retry. & exit /b 1)
pushd "%~dp0apps\web" || exit /b 1
call bun install --frozen-lockfile
if errorlevel 1 exit /b 1
call bun run dev %*
exit /b %errorlevel%