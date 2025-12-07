/**
 * Cloudflare Worker to proxy R2 storage requests
 * This prevents direct R2 access and potential abuse
 */

// Define MIME types for different file extensions
const MIME_TYPES = {
  // Images
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'svg': 'image/svg+xml',
  'webp': 'image/webp',
  'ico': 'image/x-icon',

  // Documents
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'txt': 'text/plain',
  'html': 'text/html',
  'css': 'text/css',
  'js': 'application/javascript',
  'json': 'application/json',
  'xml': 'application/xml',

  // Video
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'ogg': 'video/ogg',
  'mov': 'video/quicktime',
  'avi': 'video/x-msvideo',
  'mkv': 'video/x-matroska',

  // Audio
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'flac': 'audio/flac',
  'aac': 'audio/aac',
  'ogg': 'audio/ogg',
  'm4a': 'audio/mp4',

  // Archives
  'zip': 'application/zip',
  'csv': 'text/csv',
  'tar': 'application/x-tar',
  'gz': 'application/gzip',
  'rar': 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',

  // Databases
  'sqlite': 'application/x-sqlite3',
  'db': 'application/octet-stream',

  // Executables
  'exe': 'application/x-msdownload',
  'dll': 'application/x-msdownload',
  'lib': 'application/octet-stream',

  // Other common types
  'bin': 'application/octet-stream',
  'dat': 'application/octet-stream',
  'log': 'text/plain',
  'rtf': 'application/rtf',
  'odt': 'application/vnd.oasis.opendocument.text',
  'ods': 'application/vnd.oasis.opendocument.spreadsheet',
  'odp': 'application/vnd.oasis.opendocument.presentation',
};

export default {
  async fetch(request, env, ctx) {
    // Check if R2 binding is available
    if (!env.R2_BUCKET) {
      return new Response('R2 binding not configured. Please check your worker settings.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Extract the path from the request URL
    const url = new URL(request.url);
    const path = url.pathname.substring(1); // Remove leading slash

    // If path is empty, return a simple message
    if (!path) {
      return new Response('R2 Proxy Worker is running. Access your R2 files via /path/to/file', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    try {
      // Get the object from R2
      const object = await env.R2_BUCKET.get(path);

      if (object === null) {
        return new Response('Object Not Found', { status: 404 });
      }

      // Create headers for the response
      const headers = new Headers();

      // Only set essential headers to reduce overhead
      headers.set('content-type', object.httpMetadata?.contentType || 'application/octet-stream');
      headers.set('etag', object.httpEtag);
      headers.set('accept-ranges', 'bytes');

      // Set cache control - using a moderate cache time
      headers.set('cache-control', 'public, max-age=604800'); // Cache for 1 week

      // Include file size information
      const fileSize = object.size;
      headers.set('x-content-size', `${fileSize}`);
      headers.set('x-content-size-human', `${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

      // Handle range requests for partial content (useful for large files)
      const rangeHeader = request.headers.get('range');
      if (rangeHeader) {
        // Parse range header
        const range = rangeHeader;
        const totalSize = object.size;

        const ranges = range.replace('bytes=', '').split('-');
        let start = parseInt(ranges[0], 10);
        let end = ranges[1] ? parseInt(ranges[1], 10) : totalSize - 1;

        // Validate range request
        if (isNaN(start) || (ranges[1] && isNaN(end)) || start >= totalSize) {
          return new Response('Range Not Satisfiable', {
            status: 416,
            headers: { 'Content-Range': `bytes */${totalSize}` }
          });
        }

        // Bound the range to the total size
        start = Math.max(0, start);
        end = Math.min(end, totalSize - 1);

        // Get the range from R2 object
        const rangeResponse = await object.slice(start, end + 1);

        headers.set('content-range', `bytes ${start}-${end}/${totalSize}`);
        headers.set('content-length', `${end - start + 1}`);

        // For range requests, return the partial content
        return new Response(rangeResponse.body, {
          status: 206,
          headers,
        });
      }

      // For full object requests, set content-length
      headers.set('content-length', `${object.size}`);

      // For very large files, add a custom header to suggest client behavior
      if (fileSize > 50 * 1024 * 1024) { // Over 50MB
        headers.set('x-warning', 'Large file: use download manager with resume capability');
      }

      // Create a streaming response
      return new Response(object.body, {
        headers,
      });
    } catch (error) {
      console.error(`R2 Error: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);

      // Return a more user-friendly error with more details
      const errorMessage = `Error accessing R2: ${error.message}`;

      // If it's a timeout-related error, provide specific guidance
      if (error.message.includes('time') || error.message.includes('Timeout')) {
        return new Response('Download timeout - for large files, please use range requests (Resume capability) in your download client.', {
          status: 504, // Gateway Timeout
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      return new Response(errorMessage, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};