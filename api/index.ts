import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleApiRequest } from '../src/server/apiMiddleware.ts';

/**
 * Vercel Serverless Function entry point for all /api/* routes.
 * Compatible with Vercel's Node.js runtime and fullstack SPA routing.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const reqAny = req as any;
  const forwardedUri = (req.headers['x-forwarded-uri'] || req.headers['x-now-route-matches']) as string | undefined;
  const matchedPath = req.headers['x-matched-path'] as string | undefined;
  const query = reqAny.query || {};
  
  let targetUrl = req.url || '';

  try {
    const parsed = new URL(targetUrl, 'http://localhost');
    const routeParam = parsed.searchParams.get('__route__') || parsed.searchParams.get('path') || query.__route__;
    const routeArray = query.route;
    
    if (routeParam) {
      parsed.searchParams.delete('__route__');
      parsed.searchParams.delete('path');
      const cleanRoute = String(routeParam).startsWith('/') ? String(routeParam) : `/${String(routeParam)}`;
      const remainingQuery = parsed.searchParams.toString();
      targetUrl = `/api${cleanRoute}${remainingQuery ? `?${remainingQuery}` : ''}`;
    } else if (Array.isArray(routeArray) && routeArray.length > 0) {
      targetUrl = `/api/${routeArray.join('/')}`;
    } else if (typeof routeArray === 'string' && routeArray) {
      targetUrl = `/api/${routeArray}`;
    } else if (targetUrl.startsWith('/api/') && targetUrl.length > 5) {
      // Direct path like /api/transactions
    } else if (forwardedUri && forwardedUri.startsWith('/api/') && forwardedUri.length > 5) {
      targetUrl = forwardedUri;
    } else if (matchedPath && matchedPath.startsWith('/api/') && matchedPath.length > 5) {
      targetUrl = matchedPath;
    } else if (!targetUrl.startsWith('/api')) {
      targetUrl = `/api${targetUrl.startsWith('/') ? '' : '/'}${targetUrl}`;
    }
  } catch {
    if (!targetUrl.startsWith('/api')) {
      targetUrl = `/api${targetUrl.startsWith('/') ? '' : '/'}${targetUrl}`;
    }
  }

  req.url = targetUrl;

  // Set CORS headers for Vercel deployment if accessed across domains
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  return handleApiRequest(req, res);
}
