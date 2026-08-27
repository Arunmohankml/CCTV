@echo off
title Smart AI CCTV Surveillance System - Launch Console
color 0b

echo =======================================================================
echo     SMART CCTV SURVEILLANCE - SIH HACKATHON PROTOTYPE
echo =======================================================================
echo.

:: Change directory to current script directory
cd /d "%~dp0"

echo [1/3] Launching FastAPI Backend Server (Port 8000)...
start "CCTV Backend (FastAPI + YOLOv8 + ANPR)" cmd /k "cd /d \"%~dp0backend\" && python app.py"

echo [2/3] Launching Vite React Frontend Server (Port 5173)...
start "CCTV Frontend (Vite React Dashboard)" cmd /k "cd /d \"%~dp0frontend\" && npm run dev"

echo.
echo [3/3] Waiting for servers to initialize...
timeout /t 4 /nobreak >nul

echo.
echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo =======================================================================
echo   System running successfully!
echo   * Frontend Dashboard : http://localhost:5173
echo   * Backend API / Docs : http://localhost:8000/docs
echo =======================================================================
echo.
echo Press any key to exit this launcher window (servers will remain active)...
pause >nul
