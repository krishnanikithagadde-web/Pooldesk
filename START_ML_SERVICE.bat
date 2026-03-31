@echo off
REM PoolDesk ML Service Startup Script for Windows
REM This script starts the FastAPI ML recommendation service

echo.
echo 🚀 Starting PoolDesk ML Recommendation Service...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    echo You can download it from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✓ Using Python:
python --version

echo.
echo 📦 Installing Python dependencies...
cd server\ml
python -m pip install -r requirements.txt

echo.
echo 🔍 Checking for model files...
if not exist "pickup_kmeans_model.pkl" (
    echo ⚠️  Warning: pickup_kmeans_model.pkl not found
)

if not exist "hybrid_logistic_model.pkl" (
    echo ⚠️  Warning: hybrid_logistic_model.pkl not found
)

echo.
echo 🌐 Starting FastAPI server on http://localhost:8000
echo Press Ctrl+C to stop
echo.

REM Start the service
python -m uvicorn app:app --reload --port 8000

pause
