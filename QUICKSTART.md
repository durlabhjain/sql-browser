# SQL Browser - Quick Start Guide

Get SQL Browser up and running in under 5 minutes.

## Prerequisites

- Node.js 20+ LTS
- SQL Server instance (2016+)
- (Optional) Docker & Docker Compose for production deployment

## Development Setup

### 1. Quick Setup (Recommended)

Run the automated setup script:

```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

This script will:
- Install all dependencies
- Create environment files with generated secrets
- Set up the local database
- Seed default users

### 2. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 3. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

Login with default credentials:
- **Admin**: username: `admin`, password: `Admin123!`
- **Analyst**: username: `analyst`, password: `Analyst123!`
- **Viewer**: username: `viewer`, password: `Viewer123!`

**⚠️ IMPORTANT**: Change these passwords immediately in production!

## Manual Setup (Alternative)

If you prefer manual setup:

### Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set:
- `JWT_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `ENCRYPTION_KEY` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `TURSO_DB_URL=file:./local.db` (for local development)

Install and setup:
```bash
npm install
npm run db:setup
npm run db:seed
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Adding Your First SQL Server Connection

1. Login as `admin` (Admin123!)
2. Navigate to **Admin** > **Connections**
3. Click **Add Connection**
4. Fill in your SQL Server details:
   - Name: Your connection name
   - Server: SQL Server hostname or IP
   - Port: 1433 (default)
   - Database: Database name
   - Username: SQL Server username
   - Password: SQL Server password
   - Encrypt: true (recommended)
5. Click **Save**
6. Test the connection
7. Navigate to **Query** to start querying

## First Query

1. Go to **Query** page
2. Select your connection from the dropdown
3. Enter a SQL query (e.g., `SELECT TOP 10 * FROM YourTable`)
4. Click **Execute** or press `Ctrl+Enter`
5. View results with smooth virtual scrolling

## Role-Based Access

| Role | Permissions | Max Rows | Timeout |
|------|-------------|----------|---------|
| **VIEWER** | SELECT only | 1,000 | 30s |
| **ANALYST** | SELECT, INSERT, UPDATE | 5,000 | 60s |
| **DEVELOPER** | SELECT, DML | 10,000 | 120s |
| **ADMIN** | All (including DDL) + User Management | 50,000 | 300s |

## Production Deployment

### Docker Compose

```bash
# Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit .env files with production values
# Set up Turso cloud database (see Turso Setup below)

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### Turso Cloud Database Setup

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create account
turso auth signup

# Create database
turso db create sql-browser-meta

# Get database URL
turso db show sql-browser-meta --url

# Create auth token
turso db tokens create sql-browser-meta

# Update backend/.env with these values
```

### SSL Certificate Setup

```bash
./scripts/setup-ssl.sh your-domain.com
```

## Troubleshooting

### Cannot connect to SQL Server

**Solution**:
- Check firewall rules
- Verify SQL Server allows remote connections
- Test connection with SQL Server Management Studio first
- Ensure SQL Server authentication is enabled

### Frontend can't reach backend

**Solution**:
- Verify `PUBLIC_API_URL` in `frontend/.env`
- Check backend is running on correct port
- Check CORS settings in `backend/src/middleware/security.js`

### Database connection errors

**For local SQLite**:
- Ensure `TURSO_DB_URL=file:./local.db` in backend/.env
- Run `npm run db:setup` from backend directory

**For Turso cloud**:
- Verify `TURSO_DB_URL` and `TURSO_AUTH_TOKEN` are correct
- Test connection: `turso db show sql-browser-meta`

## Next Steps

- [ ] Change default passwords
- [ ] Add your SQL Server connections
- [ ] Create users for your team
- [ ] Configure role-based permissions
- [ ] Set up SSL for production
- [ ] Configure backup strategy for Turso database

## Support

- Documentation: See README.md
- Issues: Open a GitHub issue
- Security: Report security issues privately

## License

MIT License - See LICENSE file
