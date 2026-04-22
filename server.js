const http = require('http');
const fs = require('fs');
const path = require('path');

const host = '0.0.0.0';
const port = Number(process.env.PORT) || 8080;
const staticRoot = path.join(__dirname, 'src');
const rootFallbackFiles = new Set(['/sitemap.xml', '/robots.txt', '/BingSiteAuth.xml']);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function resolveRequestPath(urlPath) {
  if (urlPath === '/') {
    return path.join(staticRoot, 'index.html');
  }

  const safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[\\/])+/, '');
  return path.join(staticRoot, safePath);
}

function resolveRootFallbackPath(urlPath) {
  if (!rootFallbackFiles.has(urlPath)) {
    return null;
  }

  const safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[\\/])+/, '');
  return path.join(__dirname, safePath);
}

function sendResponse(filePath, content, response, method) {
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=300'
  });

  if (method === 'HEAD') {
    response.end();
    return;
  }

  response.end(content);
}

function sendFileWithFallback(filePath, fallbackPath, response, method) {
  fs.readFile(filePath, (error, content) => {
    if (!error) {
      sendResponse(filePath, content, response, method);
      return;
    }

    if (error.code === 'ENOENT' && fallbackPath) {
      fs.readFile(fallbackPath, (fallbackError, fallbackContent) => {
        if (fallbackError) {
          if (fallbackError.code === 'ENOENT') {
            response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            response.end('Not Found');
            return;
          }

          response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Internal Server Error');
          return;
        }

        sendResponse(fallbackPath, fallbackContent, response, method);
      });
      return;
    }

    if (error.code === 'ENOENT') {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not Found');
      return;
    }

    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Internal Server Error');
  });
}

function sendFile(filePath, response, method) {
  sendFileWithFallback(filePath, null, response, method);
}

const server = http.createServer((request, response) => {
  if (!request.url || (request.method !== 'GET' && request.method !== 'HEAD')) {
    response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Method Not Allowed');
    return;
  }

  const requestPath = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;
  const filePath = resolveRequestPath(requestPath);
  const normalizedPath = path.normalize(filePath);
  const fallbackPath = resolveRootFallbackPath(requestPath);
  const normalizedFallbackPath = fallbackPath ? path.normalize(fallbackPath) : null;

  if (!normalizedPath.startsWith(staticRoot)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  if (normalizedFallbackPath && !normalizedFallbackPath.startsWith(__dirname)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  sendFileWithFallback(normalizedPath, normalizedFallbackPath, response, request.method);
});

server.listen(port, host, () => {
  console.log(`Kawaseee listening on http://localhost:${port} (bound to ${host}:${port})`);
});
