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
      }
      #loading p {
        margin: 10px 0;
        color: #333;
      }
      #loading.error {
        background: #ffcccc;
        color: red;
      }
    </style>
  </head>
  <body>
    <div id="loading">
      <h2>Cargando Chat Hispano...</h2>
      <p id="status">Inicializando...</p>
    </div>
    <div id="root"></div>
    
    <script>
      const status = document.getElementById('status');
      const loading = document.getElementById('loading');
      
      function setStatus(msg) {
        console.log(msg);
        status.textContent = msg;
      }
      
      setStatus('JavaScript funcionando...');
      
      window.addEventListener('error', (event) => {
        loading.classList.add('error');
        setStatus('❌ Error: ' + event.message);
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        loading.classList.add('error');
        setStatus('❌ Error: ' + event.reason);
      });
      
      setStatus('Cargando módulos...');
    </script>
    <script type="module" crossorigin src="/Irc_hispano/assets/index-bacd1da8.js"><\/script>
  </body>
</html>`;

fs.writeFileSync(distIndex, newHtml, 'utf-8');
console.log('✓ Fixed dist/index.html');

