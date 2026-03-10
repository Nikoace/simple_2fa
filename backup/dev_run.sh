#!/bin/bash

# Function to clean up background processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $(jobs -p)
    exit
}

trap cleanup EXIT

echo "🚀 Starting Simple 2FA in development mode..."

# Start Backend
echo "Starting FastAPI Backend on http://localhost:8000..."
cd backend
../.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting React Frontend on http://localhost:5173..."
cd frontend_react
bun run dev &
FRONTEND_PID=$!
cd ..

echo "Both servers are running."
echo "Press Ctrl+C to stop both."

wait
