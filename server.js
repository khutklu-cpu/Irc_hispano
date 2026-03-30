import net from 'net';
import http from 'http';
import url from 'url';

const port = process.env.PORT || 3001;
const ircServer = 'irc.irc-hispano.org';
const ircPort = 6667;

const connections = new Map();

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/irc') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.connection.destroy();
      }
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);

        if (data.action === 'connect') {
          const clientId = Math.random().toString(36);
          const ircSocket = net.createConnection(ircPort, ircServer, () => {
            console.log(`[${clientId}] Conectado a ${ircServer}:${ircPort}`);
            
            ircSocket.write(`NICK ${data.nickname}\r\n`);
            ircSocket.write(`USER ${data.username || data.nickname} 0 * :${data.realname || data.nickname}\r\n`);
          });

          const responses = [];
          ircSocket.on('data', (chunk) => {
            const lines = chunk.toString().split('\r\n');
            lines.forEach(line => {
              if (line.length > 0) {
                responses.push(line);
              }
            });
          });

          ircSocket.on('error', (error) => {
            console.error(`[${clientId}] Error:`, error.message);
          });

          connections.set(clientId, ircSocket);

          setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              clientId,
              data: responses.slice(0, 50)
            }));
          }, 1000);
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(port, () => {
  console.log(`Servidor IRC proxy en puerto ${port}`);
});

