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
      headers.set('cache-control', 'public, max-age=31536000'); // Cache for 1 year

      // Handle range requests for partial content (useful for videos, large files)
      if (request.headers.get('range')) {
        const range = request.headers.get('range');

        // Parse range header
        const [start, end] = range.replace('bytes=', '').split('-').map(Number);
        const totalSize = object.size;

        // Get the range
        const rangeStart = isNaN(start) ? 0 : start;
        const rangeEnd = isNaN(end) ? Math.min(rangeStart + 999999, totalSize - 1) : end;

        const rangeResponse = await object.slice(rangeStart, rangeEnd + 1);
        const body = rangeResponse.body;

        headers.set('content-range', `bytes ${rangeStart}-${rangeEnd}/${totalSize}`);
        headers.set('content-length', `${rangeEnd - rangeStart + 1}`);

        return new Response(body, {
          status: 206,
          headers,
        });
      }

      // Return the full object
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