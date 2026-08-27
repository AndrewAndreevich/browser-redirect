const https = require('https');
const http = require('http');
const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 3000;        // публичный порт (http и https одновременно)
const HTTPS_INT = 3443;   // внутренний https
const HTTP_INT = 3080;    // внутренний http (редирект)
const page = path.join(__dirname, 'index.html');

const tls = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
};

https.createServer(tls, (req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] HTTPS ${req.url} | ${(req.headers['user-agent'] || '?').slice(0, 70)}`);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(page));
}).listen(HTTPS_INT, '127.0.0.1');

http.createServer((req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] HTTP->redirect ${req.url} | ${(req.headers['user-agent'] || '?').slice(0, 70)}`);
  const host = (req.headers.host || '').replace(/:\d+$/, '');
  res.writeHead(301, { Location: `https://${host}:${PORT}${req.url}` });
  res.end();
}).listen(HTTP_INT, '127.0.0.1');

// публичный порт: по первому байту (0x16 = TLS handshake) выбираем бэкенд
net.createServer(socket => {
  socket.once('data', chunk => {
    const target = chunk[0] === 0x16 ? HTTPS_INT : HTTP_INT;
    console.log(`[${new Date().toLocaleTimeString()}] conn from ${socket.remoteAddress} -> ${chunk[0] === 0x16 ? 'https' : 'http'}`);
    const proxy = net.connect(target, '127.0.0.1', () => {
      proxy.write(chunk);
      socket.pipe(proxy).pipe(socket);
    });
    proxy.on('error', () => socket.destroy());
  });
  socket.on('error', () => {});
}).listen(PORT, '0.0.0.0', () => {
  console.log('Server running (http+https on one port). Open on your phone (same Wi-Fi):');
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces) {
      if (i.family === 'IPv4' && !i.internal) {
        console.log(`  https://${i.address}:${PORT}`);
      }
    }
  }
});
