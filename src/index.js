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

      // Copy relevant headers from the R2 object
      object.writeHttpMetadata(headers);

      // Determine file extension to set appropriate content type
      const fileExtension = path.split('.').pop().toLowerCase();
      if (MIME_TYPES[fileExtension]) {
        headers.set('content-type', MIME_TYPES[fileExtension]);
      } else {
        // Default content type for unknown files
        headers.set('content-type', 'application/octet-stream');
      }

      // Set content disposition to force download for executable and database files
      const dangerousExtensions = ['exe', 'dll', 'lib', 'db', 'sqlite'];
      if (dangerousExtensions.includes(fileExtension)) {
        headers.set('content-disposition', 'attachment');
      }

      headers.set('etag', object.httpEtag);
      headers.set('accept-ranges', 'bytes');

      // Improved cache control based on file type
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(fileExtension)) {
        // Cache images for 1 year (31536000 seconds = 1 year)
        headers.set('cache-control', 'public, max-age=31536000, immutable');
      } else if (['css', 'js', 'woff', 'woff2', 'ttf', 'eot'].includes(fileExtension)) {
        // Cache static assets for 1 year with revalidation
        headers.set('cache-control', 'public, max-age=31536000, immutable');
      } else {
        // Cache other files for 1 month with revalidation
        headers.set('cache-control', 'public, max-age=2592000, stale-while-revalidate=604800');
      }

      // Handle range requests for partial content (useful for videos, large files)
      const rangeHeader = request.headers.get('range');
      if (rangeHeader) {
        // Parse range header
        const range = rangeHeader;
        const totalSize = object.size;

        const ranges = range.replace('bytes=', '').split('-');
        const start = parseInt(ranges[0], 10);
        const end = ranges[1] ? parseInt(ranges[1], 10) : totalSize - 1;

        // Validate range request
        if (isNaN(start) || (ranges[1] && isNaN(end)) || start >= totalSize) {
          return new Response('Range Not Satisfiable', {
            status: 416,
            headers: { 'Content-Range': `bytes */${totalSize}` }
          });
        }

        const rangeStart = Math.max(0, start);
        const rangeEnd = Math.min(end, totalSize - 1);

        // Get the range from R2 object
        const rangeResponse = await object.slice(rangeStart, rangeEnd + 1);

        headers.set('content-range', `bytes ${rangeStart}-${rangeEnd}/${totalSize}`);
        headers.set('content-length', `${rangeEnd - rangeStart + 1}`);

        return new Response(rangeResponse.body, {
          status: 206,
          headers,
        });
      }

      // For full object requests, stream the response directly
      headers.set('content-length', `${object.size}`);

      // Create a streaming response for better performance with large files
      return new Response(object.body, {
        headers,
      });
    } catch (error) {
      console.error(`R2 Error: ${error.message}`);
      return new Response(`Error accessing R2: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};