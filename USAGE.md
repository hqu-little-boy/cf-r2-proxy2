# Cloudflare R2 Proxy Setup

This project provides a Cloudflare Worker that acts as a proxy for R2 storage.

## Quick Start

1. Follow the deployment instructions in [部署文档.md](部署文档.md) to deploy the worker
2. Configure the R2 binding as described in [CONFIGURATION.md](CONFIGURATION.md)

## Files Overview

- `src/index.js` - Main worker code that handles proxying requests to R2
- `wrangler.toml` - Configuration file for the Cloudflare Worker
- `package.json` - Project dependencies and scripts
- `部署文档.md` - Chinese deployment documentation
- `CONFIGURATION.md` - Post-deployment configuration instructions
- `README.md` - Project overview

## Using the Proxy

After successful deployment and configuration:
- Access your worker at: `https://your-worker.your-subdomain.workers.dev/`
- Access files in your R2 bucket at: `https://your-worker.your-subdomain.workers.dev/path/to/file`

## Support

For support, please refer to the documentation files included in this repository.