import { Enemy } from './Enemy.js';

export class WaveManager {
  constructor(waveDefs, enemyDefs) {
    this.waveDefs = waveDefs;
    this.enemyDefs = enemyDefs;
    this.elapsed = 0;
    this.pending = [];
    this.nextWaveIdx = 0;
    this.spawnTimer = 0;
  }

  update(dt, enemies, canvasW, canvasH, playerX, playerY) {
    this.elapsed += dt;

    while (this.nextWaveIdx < this.waveDefs.length &&
           this.waveDefs[this.nextWaveIdx].time <= this.elapsed) {
      const w = this.waveDefs[this.nextWaveIdx++];
      const def = this.enemyDefs.find(e => e.id === w.enemy);
      if (def) {
        for (let i = 0; i < (w.count || 1); i++) {
          this.pending.push({ def, delay: i * (w.interval || 1) });
        }
      }
    }

    this.pending = this.pending.filter(p => {
      p.delay -= dt;
      if (p.delay <= 0) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 600 + Math.random() * 200;
        const x = playerX + Math.cos(angle) * dist;
        const y = playerY + Math.sin(angle) * dist;
        enemies.push(new Enemy(p.def, x, y, this.enemyDefs));
        return false;
      }
      return true;
    });

    if (Math.random() < dt * (0.5 + this.elapsed * 0.002)) {
      const def = this.enemyDefs[Math.floor(Math.random() * Math.min(3, this.enemyDefs.length))];
      const angle = Math.random() * Math.PI * 2;
      const dist = 600 + Math.random() * 200;
      enemies.push(new Enemy(def, playerX + Math.cos(angle) * dist, playerY + Math.sin(angle) * dist, this.enemyDefs));
    }
  }
}
