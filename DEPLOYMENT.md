# Production Deployment Guide

This guide covers production deployment of SQL Browser with Docker, SSL, and best practices.

## Prerequisites

- Docker & Docker Compose installed
- Domain name pointing to your server
- SQL Server instance accessible from deployment server
- Turso account (recommended) or local database setup

## Pre-Deployment Checklist

- [ ] Server meets minimum requirements (2GB RAM, 2 CPU cores)
- [ ] Domain DNS configured
- [ ] Firewall configured (ports 80, 443, SQL Server port)
- [ ] SSL certificate ready or Let's Encrypt available
- [ ] Backup strategy planned
- [ ] SQL Server connection credentials ready

## Step 1: Server Preparation

### Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Install Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Step 2: Clone and Configure

### Clone Repository

```bash
git clone <your-repo-url> sql-browser
cd sql-browser
```

### Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
NODE_ENV=production
PORT=3001
BACKEND_URL=https://your-domain.com

# Generate secure keys
JWT_SECRET=<generate-with-openssl-rand-hex-32>
JWT_EXPIRY=8h

# Turso configuration (recommended for production)
TURSO_DB_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=<your-turso-auth-token>

# Encryption key (generate with openssl rand -hex 32)
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# CORS - Set to your frontend domain
CORS_ORIGIN=https://your-domain.com
```

Generate secrets:
```bash
# JWT Secret
openssl rand -hex 32

# Encryption Key
openssl rand -hex 32
```

### Configure Frontend

```bash
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
PUBLIC_API_URL=https://your-domain.com
PUBLIC_APP_NAME=SQL Browser
PUBLIC_APP_VERSION=1.0.0
```

## Step 3: Metadata Database Setup

SQL Browser supports three metadata database options:
1. **Turso Cloud** - Recommended for cloud deployments
2. **Local SQLite** - Recommended for development
3. **MySQL** - Recommended for on-premise/offline deployments

### Option A: Turso Cloud (Default)

#### Install Turso CLI

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

#### Create Database

```bash
# Sign up / Login
turso auth signup
# or
turso auth login

# Create database
turso db create sql-browser-meta

# Get connection details
turso db show sql-browser-meta --url
turso db tokens create sql-browser-meta

# Update backend/.env with these values
```

#### Configure Environment

```env
DB_TYPE=turso
TURSO_DB_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=<your-turso-auth-token>
```

#### Initialize Database Schema

```bash
cd backend
npm install
npm run db:setup
npm run db:seed
```

### Option B: Local SQLite

Best for: Development, testing, single-server deployments

```env
DB_TYPE=turso
TURSO_DB_URL=file:./local.db
# No auth token needed
```

```bash
cd backend
npm install
npm run db:setup
npm run db:seed
```

### Option C: MySQL (On-Premise/Offline)

Best for: Enterprise environments, air-gapped networks, existing MySQL infrastructure

#### 1. Install and Configure MySQL

```bash
# Install MySQL Server
sudo apt install mysql-server -y

# Secure installation
sudo mysql_secure_installation
```

#### 2. Create Database and User

```sql
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE sql_browser_metadata CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user
CREATE USER 'sqlbrowser'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON sql_browser_metadata.* TO 'sqlbrowser'@'localhost';
FLUSH PRIVILEGES;

# For remote access (if needed)
CREATE USER 'sqlbrowser'@'%' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON sql_browser_metadata.* TO 'sqlbrowser'@'%';
FLUSH PRIVILEGES;
```

#### 3. Configure Environment

```env
DB_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=sqlbrowser
MYSQL_PASSWORD=secure_password_here
MYSQL_DATABASE=sql_browser_metadata
```

#### 4. Initialize Database Schema

```bash
cd backend
npm install
npm run db:setup
npm run db:seed
```

#### 5. MySQL Production Best Practices

**Enable SSL/TLS:**
```bash
mysql_ssl_rsa_setup --datadir=/var/lib/mysql
```

```sql
ALTER USER 'sqlbrowser'@'%' REQUIRE SSL;
```

**Optimize MySQL Configuration** (`/etc/mysql/my.cnf`):
```ini
[mysqld]
max_connections=150
innodb_buffer_pool_size=1G
innodb_log_file_size=256M
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
```

**Set up Automated Backups:**
```bash
# Create backup script
cat > /usr/local/bin/backup-sqlbrowser-db.sh << 'EOF'
#!/bin/bash
mysqldump -u sqlbrowser -p'secure_password_here' sql_browser_metadata > /backups/sql_browser_metadata_$(date +%Y%m%d_%H%M%S).sql
find /backups -name "sql_browser_metadata_*.sql" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-sqlbrowser-db.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-sqlbrowser-db.sh" | crontab -
```

**⚠️ IMPORTANT**: After seeding, immediately change the default admin password!

## Step 4: SSL Certificate Setup

### Option A: Let's Encrypt (Recommended)

```bash
cd /path/to/sql-browser
./scripts/setup-ssl.sh your-domain.com
```

This script will:
- Install certbot
- Obtain SSL certificate
- Configure NGINX
- Set up auto-renewal

### Option B: Custom Certificate

Place your certificate files:
```bash
cp your-certificate.crt docker/nginx/ssl/certificate.crt
cp your-private-key.key docker/nginx/ssl/certificate.key
```

Update `docker/nginx/conf.d/default.conf`:
- Uncomment HTTPS server block
- Update `server_name` to your domain
- Enable HTTP to HTTPS redirect

## Step 5: Deploy with Docker Compose

### Build and Start Services

```bash
docker-compose up -d --build
```

### Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Test health endpoint
curl http://localhost/health
```

### Access Application

Navigate to: `https://your-domain.com`

Login with admin credentials and **change the password immediately**.

## Step 6: Post-Deployment

### Change Default Passwords

1. Login as `admin` (Admin123!)
2. Navigate to profile/settings
3. Change password
4. Repeat for all default users or delete them

### Add SQL Server Connections

1. Go to Admin > Connections
2. Add your production SQL Server connections
3. Test each connection
4. Assign appropriate permissions

### Create Production Users

1. Go to Admin > Users
2. Create users for your team
3. Assign appropriate roles (VIEWER, ANALYST, DEVELOPER)
4. Disable or delete sample users (viewer, analyst)

### Configure Monitoring

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Monitor resource usage
docker stats
```

## Security Best Practices

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 2. Regular Updates

```bash
# Update Docker images
docker-compose pull
docker-compose up -d

# Update system
sudo apt update && sudo apt upgrade -y
```

### 3. Backup Strategy

#### Turso Database Backup

```bash
# Backup using Turso CLI
turso db shell sql-browser-meta ".backup backup.db"

# Schedule automated backups (crontab)
0 2 * * * cd /path/to/backups && turso db shell sql-browser-meta ".backup backup-$(date +\%Y\%m\%d).db"
```

#### MySQL Database Backup

```bash
# Manual backup
mysqldump -u sqlbrowser -p sql_browser_metadata > backup_$(date +%Y%m%d).sql

# Restore from backup
mysql -u sqlbrowser -p sql_browser_metadata < backup_20250324.sql

# Automated backup (already configured in Step 3 if using MySQL)
# Backups stored in /backups/ with 30-day retention
```

#### Application Backup

```bash
# Backup configuration
tar -czf sql-browser-config-$(date +%Y%m%d).tar.gz backend/.env frontend/.env docker/nginx/ssl/

# Backup logs
tar -czf sql-browser-logs-$(date +%Y%m%d).tar.gz backend/logs/
```

### 4. SSL Certificate Renewal

Let's Encrypt certificates expire every 90 days. Set up auto-renewal:

```bash
# Add to crontab
crontab -e

# Add this line
0 0 1 * * certbot renew --quiet && docker-compose restart nginx
```

### 5. Query History Cleanup

Set up automatic cleanup of old query history (90+ days):

```bash
# Add to crontab
0 3 * * 0 docker-compose exec backend node -e "require('./src/models/QueryHistory.js').QueryHistoryModel.deleteOlderThan(90)"
```

## Scaling Considerations

### Horizontal Scaling

To scale the application:

1. **Backend**: Add multiple backend containers
2. **Frontend**: Add multiple frontend containers
3. **NGINX**: Use as load balancer

Update `docker-compose.yml`:

```yaml
backend:
  deploy:
    replicas: 3

frontend:
  deploy:
    replicas: 2
```

### Database Scaling

**For Turso:**
- Automatic scaling included
- Built-in replication to edge locations
- Monitor query performance in Turso dashboard

**For MySQL:**
- Set up MySQL replication (master-slave or master-master)
- Use read replicas for query-heavy workloads
- Consider MySQL Group Replication or Galera Cluster for HA
- Monitor query performance with slow query log
- Implement connection pooling (already configured - 10 connections by default)

### Connection Pooling

Backend uses connection pooling by default. Adjust in `backend/src/services/SqlService.js`:

```javascript
pool: {
  max: 20,  // Increase for more connections
  min: 5,
  idleTimeoutMillis: 30000
}
```

## Monitoring and Maintenance

### Health Checks

```bash
# Application health
curl https://your-domain.com/health

# Docker health
docker-compose ps

# Resource usage
docker stats
```

### Log Rotation

Configure log rotation in `/etc/logrotate.d/sql-browser`:

```
/path/to/sql-browser/backend/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 nodejs nodejs
    sharedscripts
}
```

### Performance Monitoring

Monitor these metrics:
- Query execution times
- API response times
- Database connection pool usage
- Memory and CPU usage
- Error rates

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Rebuild containers
docker-compose down
docker-compose up -d --build
```

### Database connection issues

**For Turso:**
```bash
# Test Turso connection
turso db shell sql-browser-meta "SELECT 1"

# Check backend logs
docker-compose logs backend
```

**For MySQL:**
```bash
# Test MySQL connection
mysql -h localhost -u sqlbrowser -p sql_browser_metadata -e "SELECT 1"

# Check MySQL is running
sudo systemctl status mysql

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log

# Verify user permissions
mysql -u root -p -e "SHOW GRANTS FOR 'sqlbrowser'@'localhost'"

# Check connection pool status
mysql -u root -p -e "SHOW PROCESSLIST"

# Common fixes:
# 1. Firewall: sudo ufw allow 3306
# 2. Bind address: Check bind-address in /etc/mysql/mysql.conf.d/mysqld.cnf
# 3. Restart MySQL: sudo systemctl restart mysql
```

### SSL certificate issues

```bash
# Verify certificate
openssl x509 -in docker/nginx/ssl/certificate.crt -text -noout

# Test SSL
curl -vI https://your-domain.com
```

### High memory usage

```bash
# Check container stats
docker stats

# Restart specific service
docker-compose restart backend
```

## Rollback Procedure

If deployment fails:

```bash
# Stop current deployment
docker-compose down

# Restore previous configuration
git checkout <previous-commit>

# Restore database backup
turso db restore sql-browser-meta backup.db

# Redeploy
docker-compose up -d
```

## Support and Updates

- Check for updates: `git pull origin main`
- Review changelog before updating
- Test updates in staging environment first
- Keep backups before major updates

## Disaster Recovery

1. **Regular Backups**: Automate database and config backups
2. **Documentation**: Document all configuration changes
3. **Testing**: Test restore procedures regularly
4. **Monitoring**: Set up alerts for critical failures

## Production Checklist

- [ ] All default passwords changed
- [ ] SSL certificate configured and tested
- [ ] Firewall configured
- [ ] Backups automated
- [ ] Log rotation configured
- [ ] Monitoring set up
- [ ] Team users created
- [ ] SQL Server connections tested
- [ ] Documentation updated
- [ ] Emergency contacts documented
- [ ] Rollback procedure tested

## Recommended Server Specs

| Users | CPU | RAM | Storage |
|-------|-----|-----|---------|
| 1-10 | 2 cores | 2GB | 20GB |
| 10-50 | 4 cores | 4GB | 50GB |
| 50-100 | 8 cores | 8GB | 100GB |
| 100+ | 16+ cores | 16GB+ | 200GB+ |

## Contact and Support

For production support issues:
- Review logs first
- Check GitHub issues
- Contact: [your-support-email]
