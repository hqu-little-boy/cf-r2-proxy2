# Cloudflare R2 Proxy

A Cloudflare Worker that acts as a proxy for Cloudflare R2 storage to prevent direct access and potential abuse while providing public access to your stored files.

## Features

- Prevents direct R2 access to avoid unauthorized usage and costs
- Maintains public access to your files through the worker
- Supports multiple file types (images, documents, videos, audio, archives, etc.)
- Correctly handles MIME types for different file extensions
- Forces download for executable and database files for security
- Supports range requests for video/audio streaming
- Implements caching headers for better performance
- Provides error handling for missing files

## How It Works

This worker intercepts requests and fetches objects from R2 storage, returning them to the client. This way, your R2 bucket doesn't need to be publicly accessible, helping to prevent unauthorized direct access.

## Deployment

Follow the detailed deployment instructions in [部署文档.md](部署文档.md) to deploy this to your Cloudflare account.

## Post-Deployment Configuration

After deploying through the Cloudflare dashboard, you must configure the R2 binding:

1. Go to your worker's Settings
2. Find "R2 Bindings" section
3. Add a new binding with:
   - Variable name: `R2_BUCKET`
   - Bucket name: Your R2 bucket name
4. Save and deploy

See [CONFIGURATION.md](CONFIGURATION.md) for detailed post-deployment steps.

## Usage

After deployment and configuration, access your R2 files using:
`https://your-worker.your-subdomain.workers.dev/path/to/file`

For example, to access an image stored as `images/photo.jpg` in your R2 bucket, use:
`https://your-worker.your-subdomain.workers.dev/images/photo.jpg`

## Requirements

- Cloudflare account
- R2 storage bucket
- GitHub account (for dashboard deployment)