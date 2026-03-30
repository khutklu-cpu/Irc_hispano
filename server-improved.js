/**
 * Servidor Proxy IRC Mejorado
 * Con validación de seguridad y rate limiting
 */

import net from 'net';
import http from 'http';

const port = process.env.PORT || 3001;
const ircServer = 'irc.irc-hispano.org';
const ircPort = 6667;

// Rate limiting
const clientRateLimits = new Map();
const MAX_REQUESTS_PER_MINUTE = 60;

class IRCProxy {
  constructor() {
    this.connections = new Map();
  }

  /**
   * Validar nickname según RFC 2812
   */
  validateNickname(nickname) {
    const maxLength = 30;
    const pattern = /^[a-zA-Z0-9_\-\[\]{}`\\|]{1,30}$/;
    
    if (!nickname || nickname.length === 0) {
      return { valid: false, error: 'Nickname requerido' };
    }
    
    if (nickname.length > maxLength) {
      return { valid: false, error: `Máximo ${maxLength} caracteres` };
    }
    
    if (!pattern.test(nickname)) {
      return { valid: false, error: 'Caracteres inválidos en nickname' };
    }
    
    return { valid: true };
  }

  /**
   * Rate limiting por IP
   */
  checkRateLimit(ip) {
    if (!clientRateLimits.has(ip)) {
      clientRateLimits.set(ip, { count: 0, resetTime: Date.now() + 60000 });
    }

    const limit = clientRateLimits.get(ip);
    
    if (Date.now() > limit.resetTime) {
      limit.count = 0;
      limit.resetTime = Date.now() + 60000;
    }

    if (limit.count >= MAX_REQUESTS_PER_MINUTE) {
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Sanitizar mensaje
   */
  sanitizeMessage(message) {
    if (typeof message !== 'string') {
      return '';
    }

    return message
      .substring(0, 512)
      .replace(/[\r\n]+/g, ' ')
      .trim();
  }

  /**
   * Crear servidor HTTP
   */
  createServer() {
    const server = http.createServer((req, res) => this.handleRequest(req, res));
    return server;
  }

  /**
   * Manejar request HTTP
   */
  handleRequest(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!this.checkRateLimit(clientIp)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Demasiadas solicitudes. Espera un minuto.'
      }));
      return;
    }

    if (req.method === 'POST' && req.url === '/irc') {
      this.handleIRCRequest(req, res, clientIp);
    } else {
      res.writeHead(404);
      res.end();
    }
  }

  /**
   * Manejar request IRC
   */
  handleIRCRequest(req, res, clientIp) {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 10000) {
        req.socket.destroy();
      }
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);

        if (data.action === 'connect') {
          this.handleIRCConnect(data, res, clientIp);
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Acción inválida' }));
        }
      } catch (err) {
        console.error('Parse error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Solicitud inválida' }));
      }
    });

    req.on('error', err => {
      console.error('Request error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error interno del servidor' }));
    });
  }

  /**
   * Manejar conexión IRC
   */
  handleIRCConnect(data, res, clientIp) {
    const nicknameValidation = this.validateNickname(data.nickname);
    
    if (!nicknameValidation.valid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: nicknameValidation.error
      }));
      return;
    }

    const clientId = Math.random().toString(36).substring(7);
    const nickname = this.sanitizeMessage(data.nickname);
    const username = this.sanitizeMessage(data.username || nickname);
    const realname = this.sanitizeMessage(data.realname || nickname);

    const ircSocket = net.createConnection(ircPort, ircServer, () => {
      console.log(`[${clientId}] Conexión IRC establecida desde ${clientIp}`);
      
      ircSocket.write(`NICK ${nickname}\r\n`);
      ircSocket.write(`USER ${username} 0 * :${realname}\r\n`);
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
      console.error(`[${clientId}] IRC Error:`, error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'No se pudo conectar al servidor IRC'
      }));
    });

    this.connections.set(clientId, ircSocket);

    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        clientId,
        nickname,
        data: responses.slice(0, 50)
      }));

      // Limpiar después de 30 segundos
      setTimeout(() => {
        if (this.connections.has(clientId)) {
          ircSocket.end();
          this.connections.delete(clientId);
        }
      }, 30000);
    }, 1000);
  }

  /**
   * Iniciar servidor
   */
  start() {
    const server = this.createServer();

    server.listen(port, () => {
      console.log(`╔════════════════════════════════════════════════╗`);
      console.log(`║  IRC Hispano Proxy Server                      ║`);
      console.log(`║  Puerto: ${port.toString().padEnd(40)}║`);
      console.log(`║  Servidor IRC: ${ircServer.padEnd(32)}║`);
      console.log(`║  Mode: ${(process.env.NODE_ENV || 'development').padEnd(37)}║`);
      console.log(`╚════════════════════════════════════════════════╝`);
    });

    // Limpiar conexiones cada minuto
    setInterval(() => {
      this.connections.forEach((socket, clientId) => {
        if (socket.destroyed || socket.closed) {
          this.connections.delete(clientId);
        }
      });
    }, 60000);

    process.on('SIGINT', () => {
      console.log('\n\nCerrando servidor...');
      this.connections.forEach(socket => socket.end());
      server.close(() => {
        console.log('Servidor cerrado');
        process.exit(0);
      });
    });
  }
}

// Ejecutar
const proxy = new IRCProxy();
proxy.start();
