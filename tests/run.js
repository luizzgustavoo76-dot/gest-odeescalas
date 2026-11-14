// Roda todos os testes automáticos: sobe um servidor local com o site e executa cada arquivo de teste.
// Uso: node tests/run.js   (precisa do pacote "playwright" e do Chromium: npx playwright install chromium)
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const raiz = path.join(__dirname, '..');
const tipos = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const arq = path.join(raiz, p);
  if (!arq.startsWith(raiz) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); res.end('nao encontrado'); return; }
  res.writeHead(200, { 'Content-Type': tipos[path.extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(arq).pipe(res);
});
const roda = (arq, BASE) =>
  new Promise((fim) => {
    // spawn assíncrono: o servidor acima precisa continuar respondendo enquanto o teste roda
    const p = spawn(process.execPath, [arq], { env: { ...process.env, BASE } });
    let saida = '';
    const junta = (d) => { saida += d; process.stdout.write(d); };
    p.stdout.on('data', junta); p.stderr.on('data', junta);
    const limite = setTimeout(() => p.kill(), 240000);
    p.on('close', (codigo) => { clearTimeout(limite); fim({ codigo, saida }); });
  });
srv.listen(0, async () => {
  const BASE = 'http://localhost:' + srv.address().port;
  const testes = fs.readdirSync(__dirname).filter((f) => f.endsWith('.js') && f !== 'run.js' && f !== 'supabase-simulado.js').sort();
  let ok = 0, falhas = 0;
  for (const t of testes) {
    console.log('\n=== ' + t + ' ===');
    const r = await roda(path.join(__dirname, t), BASE);
    const o = (r.saida.match(/^OK /gm) || []).length, f = (r.saida.match(/^FALHA/gm) || []).length;
    ok += o; falhas += f;
    if (r.codigo !== 0 || o === 0) { falhas++; console.log('>>> ' + t + ' terminou com erro'); }
  }
  console.log('\nTOTAL: ' + ok + ' verificacoes passaram, ' + falhas + ' falharam.');
  srv.close();
  process.exit(falhas ? 1 : 0);
});
