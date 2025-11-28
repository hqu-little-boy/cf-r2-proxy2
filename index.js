/**
 * Cloudflare Worker to proxy R2 storage access and prevent direct link abuse
 *
 * Features:
 * - Authentication via secret key
 * - Rate limiting to prevent abuse
 * - MIME type detection
 * - Content disposition control
 * - Content security policies
 */

export async function handleRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.substring(1); // Remove leading slash

    // Security headers
    const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'no-referrer',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    };

    // Extract the object key from the path (format: /key or /protected/key?secret=xxx)
    const pathParts = path.split('/');
    if (pathParts.length < 1 || pathParts[0] === '') {
        return new Response('R2 Proxy Worker - Use /protected/key or /public/key to access R2 objects', {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
                ...securityHeaders
            }
        });
    }

    // Handle protected vs public access
    let objectKey;
    let isProtected = pathParts[0] === 'protected';
    let accessType = isProtected ? 'protected' : 'public';

    if (isProtected) {
        // Protected access: requires secret key
        objectKey = pathParts.slice(1).join('/');
        const providedSecret = url.searchParams.get('secret');
        const requiredSecret = env.PROXY_SECRET || 'your-secret-key';

        if (!providedSecret || providedSecret !== requiredSecret) {
            return new Response('Unauthorized: Invalid or missing secret key', {
                status: 401,
                headers: {
                    'Content-Type': 'text/plain',
                    ...securityHeaders
                }
            });
        }

        // Check rate limit for protected access
        const rateLimitResult = await checkRateLimit(env, request.headers.get('cf-connecting-ip'), accessType);
        if (!rateLimitResult.allowed) {
            return new Response(`Rate limited: ${rateLimitResult.retryAfter} seconds remaining`, {
                status: 429,
                headers: {
                    'Content-Type': 'text/plain',
                    'Retry-After': rateLimitResult.retryAfter,
                    ...securityHeaders
                }
            });
        }
    } else {
        // Public access: no secret required, but may have different rate limits
        objectKey = pathParts.join('/');

        // Check rate limit for public access
        const rateLimitResult = await checkRateLimit(env, request.headers.get('cf-connecting-ip'), accessType);
        if (!rateLimitResult.allowed) {
            return new Response(`Rate limited: ${rateLimitResult.retryAfter} seconds remaining`, {
                status: 429,
                headers: {
                    'Content-Type': 'text/plain',
                    'Retry-After': rateLimitResult.retryAfter,
                    ...securityHeaders
                }
            });
        }
    }

    try {
        // Validate object key for security (prevent directory traversal)
        if (objectKey.includes('../') || objectKey.includes('..\\')) {
            return new Response('Invalid object key', {
                status: 400,
                headers: {
                    'Content-Type': 'text/plain',
                    ...securityHeaders
                }
            });
        }

        // Get the object from R2
        const object = await env.R2_BUCKET.getObject(objectKey);

        if (object === null) {
            return new Response('Object not found', {
                status: 404,
                headers: {
                    'Content-Type': 'text/plain',
                    ...securityHeaders
                }
            });
        }

        // Set appropriate headers
        const headers = new Headers();

        // Determine content type based on file extension if not provided by R2
        let contentType = object.httpMetadata?.contentType;
        if (!contentType) {
            contentType = getContentType(objectKey);
        }
        headers.set('Content-Type', contentType);
        headers.set('Content-Length', object.size);

        // Set content disposition based on security level
        if (isProtected) {
            // For protected files, force download to prevent inline rendering of sensitive content
            headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(objectKey.split('/').pop())}"`);
        } else {
            // For public files, allow inline display but with security
            headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(objectKey.split('/').pop())}"`);
        }

        // Add security headers
        Object.entries(securityHeaders).forEach(([key, value]) => {
            headers.set(key, value);
        });

        // Add Content Security Policy header
        headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");

        // Return the object with appropriate headers
        return new Response(object.body, {
            status: 200,
            headers
        });
    } catch (error) {
        console.error('R2 Error:', error);
        return new Response('Internal Server Error', {
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
                ...securityHeaders
            }
        });
    }
}

/**
 * Determine content type based on file extension
 */
function getContentType(objectKey) {
    const extension = objectKey.toLowerCase().split('.').pop();
    const mimeTypes = {
        'txt': 'text/plain',
        'html': 'text/html',
        'htm': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'xml': 'application/xml',
        'pdf': 'application/pdf',
        'zip': 'application/zip',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'ico': 'image/x-icon',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'flac': 'audio/flac',
        'aac': 'audio/aac',
        'csv': 'text/csv',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };

    return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Check rate limits for a given IP address
 */
async function checkRateLimit(env, ip, accessType) {
    if (!ip) {
        return { allowed: true }; // If no IP, allow (though this shouldn't happen)
    }

    // Create a unique key for the IP and access type
    const rateLimitKey = `rate_limit:${accessType}:${ip}`;
    const windowKey = `window:${accessType}:${ip}`;

    try {
        // Get current count and window start time
        const count = await env.RATE_LIMIT_KV.get(rateLimitKey) || '0';
        const windowStart = await env.RATE_LIMIT_KV.get(windowKey) || '0';

        const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
        const windowSize = parseInt(env.RATE_LIMIT_WINDOW || '900'); // Default 15 min
        const maxRequests = parseInt(env.MAX_REQUESTS_PER_WINDOW || '100'); // Default 100 requests

        // Check if we're still in the same window
        if (currentTime - parseInt(windowStart) > windowSize) {
            // Reset the window
            await env.RATE_LIMIT_KV.put(rateLimitKey, '1', { expirationTtl: windowSize });
            await env.RATE_LIMIT_KV.put(windowKey, currentTime.toString(), { expirationTtl: windowSize });
            return { allowed: true };
        } else {
            // Still in the same window
            const currentCount = parseInt(count);

            if (currentCount >= maxRequests) {
                // Rate limit exceeded
                const remainingTime = windowSize - (currentTime - parseInt(windowStart));
                return {
                    allowed: false,
                    retryAfter: remainingTime
                };
            } else {
                // Increment the count
                await env.RATE_LIMIT_KV.put(rateLimitKey, (currentCount + 1).toString(), {
                    expirationTtl: windowSize
                });
                return { allowed: true };
            }
        }
    } catch (error) {
        console.error('Rate limit error:', error);
        // If rate limiting fails, still allow access but log the error
        return { allowed: true };
    }
}

/**
 * Get client IP from request headers
 */
function getClientIP(request) {
    // Cloudflare-specific header
    const cfConnectingIp = request.headers.get('CF-Connecting-IP');
    if (cfConnectingIp) return cfConnectingIp;

    // Fallback headers that might contain the real client IP
    const xForwardedFor = request.headers.get('X-Forwarded-For');
    if (xForwardedFor) return xForwardedFor.split(',')[0].trim();

    const xRealIp = request.headers.get('X-Real-IP');
    if (xRealIp) return xRealIp;

    // As a last resort, return empty string indicating we couldn't determine IP
    return '';
}

export default {
    async fetch(request, env) {
        return await handleRequest(request, env);
    }
};