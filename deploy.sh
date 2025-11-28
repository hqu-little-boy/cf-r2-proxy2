#!/bin/bash

# Deployment script for Cloudflare R2 Proxy Worker
# This script helps deploy the worker after configuration

echo "Cloudflare R2 Proxy Worker Deployment Script"
echo "=============================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: Wrangler CLI is not installed."
    echo "Please install it using: npm install -g wrangler"
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "You are not logged in to Cloudflare."
    echo "Running: wrangler login"
    wrangler login
    if [ $? -ne 0 ]; then
        echo "Login failed. Exiting."
        exit 1
    fi
fi

echo "Checking configuration files..."

# Check if wrangler.toml exists
if [ ! -f "wrangler.toml" ]; then
    echo "Error: wrangler.toml not found!"
    echo "Please make sure you're in the correct directory and wrangler.toml exists."
    exit 1
fi

# Check if important configuration values are set
ACCOUNT_ID=$(grep -E "^account_id" wrangler.toml | cut -d'"' -f2)
BUCKET_NAME=$(grep -E "^bucket_name" wrangler.toml | cut -d'"' -f2)
KV_ID=$(grep -E "^id" wrangler.toml | head -n1 | cut -d'"' -f2)

echo "Configuration check:"
echo "  Account ID: $ACCOUNT_ID"
echo "  R2 Bucket: $BUCKET_NAME"
echo "  KV Namespace ID: $KV_ID"

if [[ "$ACCOUNT_ID" == *"your-"* ]] || [[ "$BUCKET_NAME" == *"your-"* ]] || [[ "$KV_ID" == *"your-"* ]]; then
    echo ""
    echo "Warning: Some configuration values still contain placeholder values (your-...)"
    echo "Please update wrangler.toml with your actual Cloudflare account details before deploying."
    echo ""
    echo "You need to set:"
    echo "  - account_id in wrangler.toml"
    echo "  - bucket_name in wrangler.toml"
    echo "  - id and preview_id for the KV namespace in wrangler.toml"
    echo ""
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

echo ""
echo "Deploying the worker..."
echo ""

wrangler deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "Your R2 Proxy Worker is now deployed."
    echo ""
    echo "Usage examples:"
    echo "  Public access: https://<your-worker>.<your-subdomain>.workers.dev/path/to/file"
    echo "  Protected access: https://<your-worker>.<your-subdomain>.workers.dev/protected/path/to/file?secret=your-secret-key"
    echo ""
else
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi