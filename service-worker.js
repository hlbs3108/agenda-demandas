/* =========================================================
   Service worker da Agenda de Demandas
   Guarda os arquivos do app no aparelho para abrir sem internet.

   IMPORTANTE: sempre que publicar uma versão nova do index.html,
   aumente o número abaixo (ex.: v1.0.1). Assim quem já instalou
   recebe o aviso "Nova versão disponível — Atualizar".
   ========================================================= */
const VERSAO = 'agenda-v1.2.0';

const ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

/* Instalação: baixa e guarda todos os arquivos */
self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(VERSAO).then(cache => cache.addAll(ARQUIVOS)));
});

/* Ativação: apaga caches de versões antigas */
self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(c => c !== VERSAO).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

/* O app pede para atualizar quando o usuário toca em "Atualizar" */
self.addEventListener('message', evento => {
  if (evento.data === 'ATUALIZAR') self.skipWaiting();
});

/* Ao tocar na notificação, abre (ou traz para frente) a agenda */
self.addEventListener('notificationclick', evento => {
  evento.notification.close();
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(janelas => {
      for (const j of janelas) if ('focus' in j) return j.focus();
      return self.clients.openWindow('./');
    })
  );
});

/* Busca: responde com o que está guardado (rápido e offline)
   e, em segundo plano, atualiza a cópia quando houver internet */
self.addEventListener('fetch', evento => {
  const req = evento.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  evento.respondWith((async () => {
    const cache = await caches.open(VERSAO);
    const ehPagina = req.mode === 'navigate';
    const chave = ehPagina ? './index.html' : req;
    const guardado = await cache.match(chave, { ignoreSearch: true });

    const daRede = fetch(req)
      .then(resp => { if (resp && resp.ok && resp.type === 'basic') cache.put(chave, resp.clone()); return resp; })
      .catch(() => null);

    if (guardado) { evento.waitUntil(daRede); return guardado; }
    const resp = await daRede;
    if (resp) return resp;
    if (ehPagina) { const pag = await cache.match('./index.html'); if (pag) return pag; }
    return new Response('Sem conexão', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
