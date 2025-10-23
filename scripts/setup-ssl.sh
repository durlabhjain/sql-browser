#!/bin/bash

# SSL Certificate Setup Script for SQL Browser
# Usage: ./setup-ssl.sh your-domain.com

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./setup-ssl.sh your-domain.com"
    exit 1
fi

echo "Setting up SSL for domain: $DOMAIN"

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update
        sudo apt-get install -y certbot
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install certbot
    else
        echo "Please install certbot manually"
        exit 1
    fi
fi

# Stop nginx if running
docker-compose stop nginx || true

# Get certificate
echo "Obtaining SSL certificate from Let's Encrypt..."
sudo certbot certonly --standalone \
    -d $DOMAIN \
    --non-interactive \
    --agree-tos \
    --email admin@$DOMAIN \
    --preferred-challenges http

# Copy certificates to nginx ssl directory
echo "Copying certificates..."
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./docker/nginx/ssl/certificate.crt
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./docker/nginx/ssl/certificate.key

# Update nginx configuration
echo "Updating nginx configuration..."
sed -i "s/your-domain.com/$DOMAIN/g" ./docker/nginx/conf.d/default.conf

# Uncomment HTTPS server block
sed -i 's/# server {/server {/g' ./docker/nginx/conf.d/default.conf
sed -i 's/#     /    /g' ./docker/nginx/conf.d/default.conf

# Comment out HTTP to HTTPS redirect
sed -i 's/    # return 301/    return 301/g' ./docker/nginx/conf.d/default.conf

# Restart nginx
docker-compose up -d nginx

echo "SSL setup complete!"
echo "Your site should now be accessible at https://$DOMAIN"
echo ""
echo "To auto-renew certificates, add this to crontab:"
echo "0 0 1 * * certbot renew --quiet && docker-compose restart nginx"
