# Cloudflare R2 Proxy Worker

A Cloudflare Worker that acts as a proxy for Cloudflare R2 storage to prevent direct link access and potential bandwidth abuse.

## Features

- **Authentication**: Access protected files with a secret key
- **Rate Limiting**: Prevents abuse by limiting requests per IP
- **MIME Type Detection**: Automatically detects content types
- **Security Headers**: Includes essential security headers
- **Content Disposition Control**: Forcing download for protected files

## Prerequisites

- [Node.js](https://nodejs.org/) installed
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installed: `npm install -g wrangler`
- Cloudflare account with R2 storage and KV namespaces enabled

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

1. Create R2 bucket in your Cloudflare account
2. Create a KV namespace for rate limiting:
   ```bash
   wrangler kv:namespace create "RATE_LIMIT_KV"
   ```
   Note the namespace ID returned

3. Update `wrangler.toml` with your values:
   - `account_id`: Your Cloudflare Account ID
   - `bucket_name`: Your R2 bucket name
   - `id`: The KV namespace ID from step 2
   - `preview_id`: A preview KV namespace ID (same as above or create a separate one)

4. Set your secret key in `wrangler.toml`:
   ```toml
   PROXY_SECRET = "your-very-secure-secret-key-here"
   ```

### 3. Deploy the Worker

```bash
wrangler deploy
```

## Usage

### Public Access

Access any file in your R2 bucket publicly:

```
https://your-worker.your-subdomain.workers.dev/my-folder/my-file.pdf
```

Note: Public access has rate limiting applied.

### Protected Access

Access protected files with authentication:

```
https://your-worker.your-subdomain.workers.dev/protected/my-folder/my-file.pdf?secret=your-secret-key
```

Protected files will be force-downloaded to prevent inline rendering.

### File Validation

The worker prevents directory traversal attacks by validating the object key.

## Configuration

You can adjust these environment variables in `wrangler.toml`:

- `RATE_LIMIT_WINDOW`: Time window in seconds for rate limiting (default: 900 = 15 minutes)
- `MAX_REQUESTS_PER_WINDOW`: Maximum requests per time window per IP (default: 100)
- `PROXY_SECRET`: Secret key required for protected access

## Security Features

1. **Authentication**: Protected files require a secret key
2. **Rate Limiting**: Limits requests per IP address
3. **Input Validation**: Prevents directory traversal
4. **Security Headers**: Includes common security headers
5. **Content-Disposition**: Forces download for protected files

## Examples

### Accessing a public image:

```
https://r2-proxy.your-domain.workers.dev/images/photo.jpg
```

### Accessing a protected document:

```
https://r2-proxy.your-domain.workers.dev/protected/documents/contract.pdf?secret=your-secret-key
```

## Development

To run the worker locally:

```bash
wrangler dev
```

## Troubleshooting

- If you get 404 errors, ensure the file exists in your R2 bucket
- If you get 401 errors for protected files, verify your secret key
- If you get rate limit errors, wait for the window to reset or adjust the rate limit settings