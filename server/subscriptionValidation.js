const http = require('http');

const subscriptions = [];

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/subscriptions/validate') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { userId, planId, receipt } = JSON.parse(body);
          const record = {
            userId,
            plan: planId,
            receipt,
            status: 'active',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          };
          subscriptions.push(record);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(record));
        } catch (e) {
          res.writeHead(400);
          res.end();
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });
}

module.exports = { createServer, subscriptions };
