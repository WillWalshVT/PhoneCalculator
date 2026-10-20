// The app runs immediately; offline installation happens independently.
try {
  await import('./app.js');
  if ('serviceWorker' in navigator && isSecureContext) {
    const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    const notify = () => window.dispatchEvent(new Event('phasor-offline-change'));
    const watch = worker => worker?.addEventListener('statechange', notify);
    watch(registration.installing);
    registration.addEventListener('updatefound', () => watch(registration.installing));
    navigator.serviceWorker.addEventListener('controllerchange', notify);
    await navigator.serviceWorker.ready;
    notify();
    try { await navigator.storage?.persist?.(); } catch {}
  }
} catch (error) {
  const status = document.querySelector('#boot-status');
  if (status) status.textContent = 'Unable to open Phasor. Connect to the internet and try again.';
  const retry = document.querySelector('#retry');
  if (retry) retry.hidden = false;
  console.error(error);
}
