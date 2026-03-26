#!/bin/bash

# Deployment script for Sushii Mini App
# This script will deploy the latest changes to production server

set -e # Exit on any error

echo "Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "Error: This doesn't appear to be the project root directory"
  exit 1
fi

# Build the application
echo "Building the application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Error: Build failed"
  exit 1
fi

# Copy build files to server
echo "Copying files to production server..."
scp -r build/* root@sushi-house-39.ru:/var/www/sushii/

# Clear the product cache on the server
echo "Clearing product cache on server..."
ssh root@sushi-house-39.ru "rm -rf /root/miniapp-sushii/data/products/*"

# Restart Docker containers
echo "Restarting Docker containers..."
ssh root@sushi-house-39.ru "cd /root/miniapp-sushii && docker-compose down && docker-compose up -d"

echo "Deployment completed successfully!"
echo "Please verify the application is working correctly at https://sushi-house-39.ru"