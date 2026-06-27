import { Projectile } from './Projectile.js';

export class Building {
  constructor(data, x, y) {
    this.data = { ...data };
    this.x = x; this.y = y;
    this.powered = !data.powerConsumption;
    this.placedAt = Date.now();
    this.storedPower = 0;
    this.empUntil = 0;
    this.attackCooldown = 0;
    this.hp = data.hp || Infinity;
    this.phase = Math.random() * Math.PI * 2;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update(dt, enemies, projectiles) {
    this.pulsePhase += dt * 1.5;
    if (!this.powered || Date.now() < this.empUntil) return;
    if (!this.data.isDefensive) return;

    this.attackCooldown -= dt;
    if (this.attackCooldown > 0) return;

    let range = this.data.attackRange || 180;
    let target = null, best = Infinity;

    for (const e of enemies) {
      const dx = e.x - this.x, dy = e.y - this.y;
      const d = dx * dx + dy * dy;
      if (d < range * range && d < best) { best = d; target = e; }
    }

    if (!target) return;
    this.attackCooldown = 1 / (this.data.attackRate || 1);

    const dx = target.x - this.x, dy = target.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = this.data.projectileSpeed || 400;
    projectiles.push(new Projectile({
      x: this.x, y: this.y,
      vx: (dx / len) * spd, vy: (dy / len) * spd,
      damage: this.data.attackDamage || 10,
      speed: spd,
      size: 5,
      color: this.data.projectileColor || '#00ff88',
      pierce: 1,
      fromBuilding: true
    }));
  }

  draw(ctx) {
    const { color, size, isWire, isWall, isDefensive, isCapacitor, isBooster } = this.data;
    const s = size || 24;
    const half = s / 2;
    const pulse = this.powered ? 1 + 0.08 * Math.sin(this.pulsePhase) : 0.5;
    const alpha = this.powered ? 1 : 0.4;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = this.powered ? 15 * pulse : 4;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    if (isWire) {
      ctx.fillStyle = 'rgba(0,204,102,0.15)';
      ctx.fillRect(this.x - half, this.y - half, s, s);
      ctx.strokeRect(this.x - half, this.y - half, s, s);
      ctx.beginPath();
      ctx.moveTo(this.x - half, this.y);
      ctx.lineTo(this.x + half, this.y);
      ctx.moveTo(this.x, this.y - half);
      ctx.lineTo(this.x, this.y + half);
      ctx.stroke();
    } else if (isWall) {
      ctx.fillStyle = 'rgba(0,136,68,0.6)';
      ctx.fillRect(this.x - half, this.y - half, s, s);
      ctx.strokeRect(this.x - half, this.y - half, s, s);
    } else if (isDefensive) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, half * pulse, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
      ctx.fill();
      const lineEnd = half + 6;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + lineEnd, this.y);
      ctx.stroke();
    } else if (isCapacitor) {
      ctx.fillStyle = 'rgba(255,255,0,0.1)';
      ctx.fillRect(this.x - half, this.y - half, s, s);
      ctx.strokeRect(this.x - half, this.y - half, s, s);
      const fill = (this.storedPower / (this.data.storage || 1));
      ctx.fillStyle = color;
      ctx.fillRect(this.x - half + 4, this.y + half - 4 - (s - 8) * fill, s - 8, (s - 8) * fill);
    } else if (isBooster) {
      for (let r = 1; r <= 3; r++) {
        ctx.globalAlpha = alpha * (0.3 / r);
        ctx.beginPath();
        ctx.arc(this.x, this.y, half * r * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(0,255,136,0.12)';
      ctx.fillRect(this.x - half, this.y - half, s, s);
      ctx.strokeRect(this.x - half, this.y - half, s, s);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
