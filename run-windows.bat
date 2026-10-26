@echo off
title Rift Runner - Development Launcher
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies for Rift Runner...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm start
