import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distIndex = path.join(__dirname, 'dist', 'index.html');

const newHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IRC Hispano Client</title>
    <link rel="stylesheet" href="/Irc_hispano/assets/index-25f2ccf6.css">
    <style>
      body { margin: 0; padding: 0; }
      #loading {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 40px;
        border-radius: 10px;
        box-shadow: 0 0 20px rgba(0,0,0,0.2);
        text-align: center;
        font-family: sans-serif;
        z-index: 10000;
        transition: opacity 0.3s;
      }
      #loading.hidden {
        opacity: 0;
        pointer-events: none;
      }
      #loading h2 { margin: 0 0 20px 0; }
      #loading p { margin: 0; color: #666; }
      #loading.error { background: #ffcccc; }
      #loading.error p { color: red; }
    </style>
  </head>
  <body>
    <div id="loading">
      <h2>Cargando Chat Hispano...</h2>
      <p id="status">Inicializando...</p>
    </div>
    <div id="root"></div>
    
    <script>
      window.__hideLoading = function() {
        const loading = document.getElementById('loading');
        if (loading) {
          loading.classList.add('hidden');
          setTimeout(() => loading.remove(), 500);
        }
      };
      
      window.__showError = function(msg) {
        const loading = document.getElementById('loading');
        const status = document.getElementById('status');
        if (loading) {
          loading.classList.add('error');
          status.textContent = '❌ ' + msg;
        }
        console.error(msg);
      };
      
      const status = document.getElementById('status');
      status.textContent = 'Cargando módulos...';
      
      setTimeout(() => {
        if (document.getElementById('loading') && !document.getElementById('loading').classList.contains('hidden')) {
          window.__showError('Timeout: No se pudo cargar la aplicación');
        }
      }, 10000);
    </script>
    <script type="module" crossorigin src="/Irc_hispano/assets/index-bacd1da8.js"><\/script>
  </body>
</html>`;

fs.writeFileSync(distIndex, newHtml, 'utf-8');
console.log('✓ Fixed dist/index.html');


