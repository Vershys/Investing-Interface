@echo off
setlocal
title Bastion - Update and Start
where node >nul 2>&1
if errorlevel 1 goto neednode
where git >nul 2>&1
if errorlevel 1 goto needgit
set "BASTION_INSTALL=%LOCALAPPDATA%\Bastion\app"
if exist "%BASTION_INSTALL%\.git" goto launch
if exist "%BASTION_INSTALL%" goto occupied
echo Installing Bastion. Your existing downloaded folder is left untouched.
git clone --branch main --single-branch https://github.com/Vershys/Investing-Interface.git "%BASTION_INSTALL%"
if errorlevel 1 goto failed
:launch
cd /d "%BASTION_INSTALL%"
node scripts/update-and-start.mjs
if errorlevel 1 goto failed
exit /b 0
:neednode
echo Install Node.js 22.13 or newer, then open this file again.
goto failed
:needgit
echo Install Git for Windows from https://git-scm.com/downloads/win then reopen this file.
goto failed
:occupied
echo Setup found an incomplete installation at "%BASTION_INSTALL%".
echo Rename that folder to keep a backup, then run this launcher again.
goto failed
:failed
echo.
echo Bastion stopped. Read the message above or send ChatGPT a screenshot.
pause
exit /b 1
