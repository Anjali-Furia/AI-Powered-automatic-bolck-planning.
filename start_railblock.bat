@echo off
title RailBlock AI - Indian Railways Block Planning System
echo ====================================================================
echo     RailBlock AI - Smart Maintenance Block Planning System
echo     Problem Statement: Maximize Asset Availability for Indian Railways
echo ====================================================================
echo.

set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"

if exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
    echo [*] Detected Python Virtual Environment at backend\.venv
    set "PY_CMD=%BACKEND_DIR%\.venv\Scripts\python.exe"
) else (
    echo [!] Virtual environment not found, falling back to system python
    set "PY_CMD=python"
)

echo [1/2] Launching FastAPI Backend on http://localhost:8000 ...
start "RailBlock-Backend" cmd /k "cd /d "%BACKEND_DIR%" && "%PY_CMD%" -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Launching React Dashboard on http://localhost:5173 ...
start "RailBlock-Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo ====================================================================
echo  System is starting!
echo  - Frontend Dashboard: http://localhost:5173
echo  - Backend API Docs:   http://localhost:8000/docs
echo ====================================================================
echo.
pause
