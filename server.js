const http = require('http');
const fs = require('fs');
const path = require('path');

const host = '0.0.0.0';
const port = Number(process.env.PORT) || 8080;
const staticRoot = path.join(__dirname, 'src');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function resolveRequestPath(urlPath) {
  if (urlPath === '/') {
    return path.join(staticRoot, 'index.html');
  }

  const safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[\\/])+/, '');
  return path.join(staticRoot, safePath);
}

function sendFile(filePath, response, method) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not Found');
        return;
      }

      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Internal Server Error');
      return;
    }

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
  });
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

  if (!normalizedPath.startsWith(staticRoot)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  sendFile(normalizedPath, response, request.method);
});

server.listen(port, host, () => {
  console.log(`Kawaseee listening on http://${host}:${port}`);
});
