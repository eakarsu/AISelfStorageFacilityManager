#!/bin/bash

echo "============================================="
echo "  AI Self-Storage Facility Manager"
echo "  Starting Application..."
echo "============================================="

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

SERVER_PORT=${SERVER_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Kill any processes on the ports we need
echo ""
echo "🔧 Cleaning up ports $SERVER_PORT and $FRONTEND_PORT..."

kill_port() {
  local port=$1
  local pids=$(lsof -ti:$port 2>/dev/null)
  if [ ! -z "$pids" ]; then
    echo "   Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null
    sleep 1
  fi
}

kill_port $SERVER_PORT
kill_port $FRONTEND_PORT

echo "   Ports cleared."

# Check if PostgreSQL is running
echo ""
echo "🐘 Checking PostgreSQL..."
if ! pg_isready -q 2>/dev/null; then
  echo "   Starting PostgreSQL..."
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null
  sleep 2
fi
echo "   PostgreSQL is ready."

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install --silent 2>/dev/null

if [ ! -d "client/node_modules" ]; then
  echo "   Installing client dependencies..."
  cd client && npm install --silent 2>/dev/null && cd ..
fi

# Seed the database
echo ""
echo "🌱 Seeding database..."
node server/seed.js

# Start the application with hot reload
echo ""
echo "============================================="
echo "  ✅ Application Starting!"
echo "  Server:   http://localhost:$SERVER_PORT"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "  Login: admin@storagepro.com / admin123"
echo "============================================="
echo ""

# Start both server (with nodemon for reload) and client
npx concurrently \
  --names "SERVER,CLIENT" \
  --prefix-colors "blue,green" \
  "npx nodemon --watch server server/index.js" \
  "cd client && PORT=$FRONTEND_PORT BROWSER=none npx react-scripts start"
