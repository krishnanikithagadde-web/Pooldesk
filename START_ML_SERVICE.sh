#!/bin/bash

# PoolDesk ML Service Startup Script
# This script starts the FastAPI ML recommendation service

set -e

echo "🚀 Starting PoolDesk ML Recommendation Service..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Determine Python command
if command -v python3 &> /dev/null; then
    PYTHON="python3"
else
    PYTHON="python"
fi

echo "✓ Using Python: $($PYTHON --version)"
echo ""

# Check if requirements are installed
cd server/ml

if [ ! -d "venv" ] && [ ! -d "env" ]; then
    echo "📦 Installing Python dependencies..."
    $PYTHON -m pip install -r requirements.txt
    echo "✓ Dependencies installed"
else
    echo "✓ Python dependencies already installed"
fi

echo ""
echo "🔍 Checking for model files..."
if [ ! -f "pickup_kmeans_model.pkl" ]; then
    echo "⚠️  Warning: pickup_kmeans_model.pkl not found"
fi

if [ ! -f "hybrid_logistic_model.pkl" ]; then
    echo "⚠️  Warning: hybrid_logistic_model.pkl not found"
fi

echo ""
echo "🌐 Starting FastAPI server on http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""

# Start the service
$PYTHON -m uvicorn app:app --reload --port 8000
