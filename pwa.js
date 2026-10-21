'use strict';
(() => {
  const status = document.getElementById('pwa-status');
  const update = document.getElementById('update-app');
  const install = document.getElementById('install');
  let installEvent, reloading = false;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installEvent = event; install.hidden = false;
  });
  install.addEventListener('click', async () => {
    if (!installEvent) return;
    await installEvent.prompt(); await installEvent.userChoice;
    installEvent = null; install.hidden = true;
  });
  window.addEventListener('appinstalled', () => { install.hidden = true; });
  if (!('serviceWorker' in navigator) || !window.isSecureContext || location.protocol === 'file:') {
    status.textContent = 'オフラインで あそぶには、こうかいした HTTPSの URLで ひらいてね。'; return;
  }
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloading) { reloading = true; location.reload(); }
  });
  navigator.serviceWorker.register('./sw.js').then(registration => {
    function offerUpdate() {
      if (!registration.waiting || !navigator.serviceWorker.controller) return;
      update.hidden = false;
      update.onclick = () => { if (registration.waiting) registration.waiting.postMessage('ACTIVATE_UPDATE'); };
    }
    offerUpdate();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (worker) worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') offerUpdate();
        if (worker.state === 'redundant' && !navigator.serviceWorker.controller) status.textContent = 'ほぞんできませんでした。つうしんを たしかめて ひらきなおしてね。';
      });
    });
    return navigator.serviceWorker.ready;
  }).then(() => {
    status.textContent = 'オフラインで あそべるよ ✓';
  }).catch(() => { status.textContent = 'オフラインの じゅんびが できませんでした。つうしんを たしかめて ひらきなおしてね。'; });
})();
