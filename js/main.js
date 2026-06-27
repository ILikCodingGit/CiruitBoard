import { Game } from './game.js';

async function loadJSON(path) 
{
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Failed to load ${path}`);
  return r.json();
}

async function main() {
  const canvas = document.getElementById('game');

  const statusEl = document.getElementById('loading-status');
  const files = ['weapons', 'passives', 'enemies', 'buildings', 'packs', 'waves', 'evolutions'];
  const data = {};

  for (const f of files) {
    if (statusEl) statusEl.textContent = `Loading ${f}...`;
    data[f] = await loadJSON(`data/${f}.json`);
  }

  document.getElementById('loading').style.display = 'none';
  canvas.style.display = 'block';

  new Game(canvas, data);
}

main().catch(err => {
  console.error(err);
  const el = document.getElementById('loading');
  if (el) el.innerHTML = `<p style="color:#ff4444">Failed to load: ${err.message}</p>`;
});
