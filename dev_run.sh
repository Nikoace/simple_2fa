#!/bin/bash
set -euo pipefail

WITH_BACKEND=0

for arg in "$@"; do
    case "$arg" in
        --with-backend)
            WITH_BACKEND=1
            ;;
        -h|--help)
            cat <<'USAGE'
Usage: ./dev_run.sh [--with-backend]

Options:
  --with-backend   Also start legacy FastAPI backend on port 8000.
  -h, --help       Show this help message.
USAGE
            exit 0
            ;;
        *)
            echo "Unknown argument: $arg"
            echo "Use --help to see available options."
            exit 1
            ;;
    esac
done

cleanup() {
    echo "Stopping servers..."
    jobs -p | xargs -r kill
}

trap cleanup EXIT

echo "🚀 Starting Simple 2FA in development mode..."

if [ "$WITH_BACKEND" -eq 1 ]; then
    echo "Starting legacy FastAPI Backend on http://localhost:8000..."
    (
        cd backend
        ../.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ) &
fi

echo "Starting React Frontend on http://localhost:5173..."
(
    cd frontend_react
    bun run dev
) &

echo "Frontend server is running."
if [ "$WITH_BACKEND" -eq 1 ]; then
    echo "Legacy backend server is running (optional mode)."
fi

echo "Press Ctrl+C to stop."
wait
