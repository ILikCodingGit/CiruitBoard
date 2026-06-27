import { Projectile } from './Projectile.js';

export class Weapon {
  constructor(data) {
    this.data = { ...data };
    this.cooldown = 0;
    this.level = 1;
  }

  upgrade() {
    this.level++;
    this.data.damage = Math.round(this.data.damage * 1.2);
    this.data.fireRate = +(this.data.fireRate * 1.1).toFixed(2);
    if (this.data.pierce) this.data.pierce = Math.min(this.data.pierce + 1, 8);
  }

  tryFire(dt, ox, oy, tx, ty, stats, projectiles) {
    const rate = this.data.fireRate * (1 + (stats.fireRate || 0));
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    this.cooldown = 1 / rate;

    const dx = tx - ox, dy = ty - oy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = this.data.projectileSpeed;
    const dmg = Math.round(this.data.damage * (1 + (stats.damage || 0)));

    projectiles.push(new Projectile({
      x: ox, y: oy,
      vx: (dx / len) * spd,
      vy: (dy / len) * spd,
      damage: dmg,
      speed: spd,
      size: this.data.projectileSize || 5,
      color: this.data.color || '#00ffff',
      pierce: this.data.pierce || 1,
      splash: this.data.splash || 0
    }));
  }
}
