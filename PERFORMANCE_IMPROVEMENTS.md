# Performance Improvements & Large File Solutions for Cloudflare R2 Proxy

This document outlines the performance improvements made to enhance download speeds in the Cloudflare R2 proxy worker and explains how to download large files within the Cloudflare Workers platform constraints.

## Understanding Cloudflare Workers Limitations

**Cloudflare Workers have a hard timeout limit of 30 seconds for HTTP requests.** This affects how large files can be downloaded through the proxy. However, there's a solution using range requests (byte-range downloads).

## Key Improvements Made

### 1. Streaming Optimization
- **Direct Body Streaming**: The response now streams directly from the R2 object body without intermediate buffering
- **Immediate Response**: Data starts being sent to the client immediately instead of waiting for the entire file to be retrieved
- **Better Memory Usage**: Large files are handled more efficiently without loading everything into memory at once

### 2. Enhanced Cache Headers
- **Type-Specific Caching**: Different file types now have optimized cache strategies:
  - Images (jpg, png, gif, etc.): 1 year cache with immutable flag
  - Static assets (css, js, fonts): 1 year cache with immutable flag
  - Other files: 1 month cache with revalidation
- **Reduced Repeated Requests**: Proper cache headers reduce unnecessary downloads of the same content
- **Bandwidth Savings**: Cached files don't need to be re-downloaded from R2

### 3. Improved Range Request Handling
- **Better Validation**: More robust range request validation prevents errors
- **Accurate Headers**: Correct content-range and content-length headers for partial content
- **Optimized for Large Files**: Now supports resumable downloads using HTTP range requests
- **Proper Error Handling**: Returns 416 status for invalid range requests
- **Added `accept-ranges: bytes` header**: Tells clients that range requests are supported

### 4. Size Information Headers
- **File Size Headers**: The response now includes `x-content-size` and `x-content-size-human` headers
- **Helps clients make download decisions**

## Solution for Large File Downloads (155MB APK)

Your 155MB APK file can now be downloaded through the proxy using **range requests**, which allow the file to be downloaded in smaller chunks. This works by:

1. The client (like aria2c) makes requests for specific byte ranges of the file
2. Each range request is smaller and completes in under 30 seconds
3. The client assembles the chunks into the complete file

## How to Download Large Files

### For aria2c users (like your example):
```bash
aria2c https://download-test.21645851.xyz/setup/BiliBiliLiveRobot-0.1.1.apk -x16 -j16
```

This command should now work because aria2c automatically uses range requests when it detects the server supports them (with the `accept-ranges: bytes` header).

### Alternative command-line approaches:
```bash
# With wget - the -c flag enables continue capability (range requests)
wget -c https://download-test.21645851.xyz/setup/BiliBiliLiveRobot-0.1.1.apk

# With curl - the -C flag enables continue capability
curl -C - -O https://download-test.21645851.xyz/setup/BiliBiliLiveRobot-0.1.1.apk
```

## Deployment Instructions

1. Replace the existing `src/index.js` with the updated version
2. Update your deployment using `npm run deploy` or `wrangler deploy`
3. The improvements will be active immediately after deployment

## Testing Recommendations

- Test with aria2c, wget -c, or curl -C to verify range request support
- Check that `accept-ranges: bytes` header is present in responses
- Verify that file size information headers are included
- Monitor download progress with tools that show range request usage