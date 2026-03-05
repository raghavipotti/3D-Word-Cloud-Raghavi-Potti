#!/usr/bin/env bash
#
# This setup script installs dependencies for both the Python backend and
# the React/TypeScript frontend, then runs them concurrently.  It is
# targeted at macOS or other Unix‑like environments.  Before running,
# ensure you have Node.js, npm and Python 3 installed on your system.

set -e

echo "Installing backend dependencies..."
python3 -m pip install --upgrade pip >/dev/null
pip3 install -r backend/requirements.txt

echo "Installing frontend dependencies..."
if ! command -v npm >/dev/null; then
  echo "npm is not installed. Please install Node.js and npm before running this script."
  exit 1
fi
pushd frontend >/dev/null
npm install
popd >/dev/null

# Install concurrently globally if not already present.  This tool allows
# running multiple commands in parallel with a single terminal command.
if ! command -v concurrently >/dev/null; then
  echo "Installing 'concurrently' globally..."
  npm install -g concurrently
fi

echo "Starting backend and frontend servers..."
concurrently \
  "uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload" \
  "npm --prefix frontend run dev"