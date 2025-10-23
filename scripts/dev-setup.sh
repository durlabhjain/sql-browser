#!/bin/bash

# Development Setup Script for SQL Browser

set -e

echo "========================================"
echo "SQL Browser - Development Setup"
echo "========================================"
echo ""

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "Error: Node.js 20+ is required. Current version: $(node -v)"
    exit 1
fi
echo "✓ Node.js $(node -v) detected"
echo ""

# Backend setup
echo "Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
    echo "Creating backend .env file..."
    cp .env.example .env

    # Generate JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i "s/your-super-secret-jwt-key-min-32-chars-change-in-production/$JWT_SECRET/" .env

    # Generate encryption key
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i "s/your-64-character-hex-encryption-key-change-in-production/$ENCRYPTION_KEY/" .env

    echo "✓ Backend .env created with generated secrets"
else
    echo "✓ Backend .env already exists"
fi

echo "Installing backend dependencies..."
npm install
echo "✓ Backend dependencies installed"
echo ""

# Create logs directory
mkdir -p logs
echo "✓ Logs directory created"
echo ""

# Frontend setup
echo "Setting up frontend..."
cd ../frontend

if [ ! -f ".env" ]; then
    echo "Creating frontend .env file..."
    cp .env.example .env
    echo "✓ Frontend .env created"
else
    echo "✓ Frontend .env already exists"
fi

echo "Installing frontend dependencies..."
npm install
echo "✓ Frontend dependencies installed"
echo ""

cd ..

# Turso setup
echo "========================================"
echo "Database Setup (Turso)"
echo "========================================"
echo ""
echo "Choose your database option:"
echo "1. Use local SQLite (recommended for development)"
echo "2. Use Turso cloud database"
read -p "Enter choice (1 or 2): " DB_CHOICE

if [ "$DB_CHOICE" = "1" ]; then
    echo "Configuring local SQLite..."
    cd backend
    sed -i 's|TURSO_DB_URL=.*|TURSO_DB_URL=file:./local.db|' .env
    sed -i 's|TURSO_AUTH_TOKEN=.*|# TURSO_AUTH_TOKEN not needed for local|' .env

    echo "Setting up database schema..."
    npm run db:setup

    echo "Seeding database with default users..."
    npm run db:seed

    cd ..
    echo "✓ Local database setup complete"
elif [ "$DB_CHOICE" = "2" ]; then
    echo ""
    echo "To use Turso cloud database:"
    echo "1. Install Turso CLI: curl -sSfL https://get.tur.so/install.sh | bash"
    echo "2. Create account: turso auth signup"
    echo "3. Create database: turso db create sql-browser-meta"
    echo "4. Get database URL: turso db show sql-browser-meta --url"
    echo "5. Create auth token: turso db tokens create sql-browser-meta"
    echo "6. Update backend/.env with TURSO_DB_URL and TURSO_AUTH_TOKEN"
    echo "7. Run: cd backend && npm run db:setup && npm run db:seed"
    echo ""
    echo "Press Enter to continue..."
    read
else
    echo "Invalid choice"
    exit 1
fi

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "To start the development servers:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Access the application at: http://localhost:5173"
echo ""
echo "Default credentials:"
echo "  Admin:    username: admin,    password: Admin123!"
echo "  Analyst:  username: analyst,  password: Analyst123!"
echo "  Viewer:   username: viewer,   password: Viewer123!"
echo ""
echo "⚠️  Change these passwords in production!"
echo ""
