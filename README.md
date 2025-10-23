# SQL Browser - High-Performance SQL Server Query Interface

A modern, secure, web-based SQL query interface for SQL Server with VS Code-quality editing experience, virtual scrolling for large datasets, and enterprise-grade security.

## Features

- **VS Code-Quality Editor**: Monaco Editor with SQL syntax highlighting, IntelliSense, and multi-cursor support
- **High Performance**: Virtual scrolling for smooth rendering of 10,000+ row result sets
- **Secure by Design**:
  - Hidden connection strings (never exposed to frontend)
  - Role-based permissions (SELECT/DML/DDL)
  - JWT authentication with bcrypt password hashing
  - Query result size limits per role
- **Query Management**:
  - 90-day query history with full audit trail
  - Real-time query cancellation (<2s response)
  - Query execution tracking and logging
- **Modern Stack**: SvelteKit frontend + Express.js backend + Turso metadata DB

## Architecture

```
┌─────────────────┐
│  SvelteKit UI   │  ← Monaco Editor, Virtual Scrolling
│   (Frontend)    │
└────────┬────────┘
         │ HTTPS/JWT
┌────────▼────────┐
│   Express.js    │  ← Authentication, Authorization, Query Execution
│    (Backend)    │
└────┬───────┬────┘
     │       │
     ▼       ▼
┌─────────┐ ┌──────────────┐
│  Turso  │ │  SQL Server  │
│ (Meta)  │ │   (Target)   │
└─────────┘ └──────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+ LTS
- Docker & Docker Compose
- Turso CLI (for local development)
- SQL Server instance (2016+)

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd sql-browser

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

2. **Configure environment variables**:

Backend (`backend/.env`):
```env
# Server
NODE_ENV=production
PORT=3001
BACKEND_URL=http://localhost:3001

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=8h

# Turso Database
TURSO_DB_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Encryption (for connection strings)
ENCRYPTION_KEY=your-32-character-encryption-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Frontend (`frontend/.env`):
```env
PUBLIC_API_URL=http://localhost:3001
```

3. **Set up Turso database**:
```bash
cd backend
npm run db:setup
npm run db:seed
```

4. **Start development servers**:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Access the application at `http://localhost:5173`

Default admin credentials:
- Username: `admin`
- Password: `Admin123!` (change immediately)

## Production Deployment with Docker

1. **Configure production environment**:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with production values
```

2. **Start services**:
```bash
docker-compose up -d
```

3. **Access application**:
- HTTP: `http://your-domain.com`
- HTTPS: `https://your-domain.com` (after SSL setup)

4. **Set up SSL** (Let's Encrypt):
```bash
./scripts/setup-ssl.sh your-domain.com
```

## User Roles & Permissions

| Role | Query Types | Max Rows | Query Timeout |
|------|-------------|----------|---------------|
| **VIEWER** | SELECT only | 1,000 | 30s |
| **ANALYST** | SELECT, INSERT, UPDATE | 5,000 | 60s |
| **DEVELOPER** | SELECT, DML (INSERT/UPDATE/DELETE) | 10,000 | 120s |
| **ADMIN** | All (SELECT, DML, DDL) | 50,000 | 300s |

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Query Execution
- `POST /api/query/execute` - Execute SQL query
- `POST /api/query/cancel/:queryId` - Cancel running query
- `GET /api/query/history` - Get query history
- `GET /api/query/history/:id` - Get specific query details

### Admin
- `POST /api/admin/users` - Create user
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/connections` - Add SQL Server connection
- `GET /api/admin/connections` - List connections

## Security Features

1. **Authentication & Authorization**:
   - JWT-based authentication
   - bcrypt password hashing (10 rounds)
   - Role-based access control

2. **SQL Injection Prevention**:
   - Parameterized queries only
   - Input validation with Zod
   - Query pattern analysis

3. **Connection Security**:
   - Encrypted connection string storage (AES-256-GCM)
   - No connection details exposed to frontend
   - Connection pooling with timeouts

4. **Rate Limiting**:
   - 100 requests per 15 minutes per IP
   - Custom limits for query execution

5. **Audit Trail**:
   - All queries logged with user, timestamp, duration
   - Failed query attempts tracked
   - 90-day retention policy

## Performance Benchmarks

- Query result rendering: <1s for 500 rows
- Virtual scrolling: Smooth with 10,000+ rows
- Editor response time: <100ms
- Query cancellation: <2s response time

## Development

### Project Structure
```
sql-browser/
├── backend/
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── models/       # Database models
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utility functions
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── routes/       # SvelteKit routes
│   │   ├── lib/          # Components & utilities
│   │   └── app.html
│   ├── package.json
│   └── .env
├── docker/
│   └── nginx/            # NGINX configuration
├── docker-compose.yml
└── README.md
```

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Database Migrations
```bash
cd backend
npm run db:migrate
```

## Configuration

### SQL Server Connection Format
Connections are stored encrypted in Turso and never exposed to the frontend:

```json
{
  "name": "Production DB",
  "server": "sql-server.example.com",
  "port": 1433,
  "database": "MyDatabase",
  "user": "query_user",
  "password": "encrypted_password",
  "encrypt": true,
  "trustServerCertificate": false
}
```

### Adding New Roles
Edit `backend/src/config/roles.js` to add or modify role permissions.

## Troubleshooting

### Cannot connect to SQL Server
- Check firewall rules allow connections from application server
- Verify SQL Server authentication mode (SQL or Windows)
- Ensure user has appropriate permissions on target database

### Turso connection errors
- Verify `TURSO_DB_URL` and `TURSO_AUTH_TOKEN` are correct
- Check Turso service status at status.turso.tech
- Ensure database exists: `turso db list`

### Frontend cannot reach backend
- Verify `PUBLIC_API_URL` in frontend `.env`
- Check CORS configuration in `backend/src/middleware/security.js`
- Ensure backend is running and accessible

## License

MIT

## Support

For issues and feature requests, please open a GitHub issue.
