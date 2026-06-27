import { Projectile } from './Projectile.js';

export class Enemy {
  constructor(data, x, y, allEnemyDefs) {
    this.data = data;
    this.allDefs = allEnemyDefs;
    this.x = x; this.y = y;
    this.hp = data.health;
    this.maxHp = data.health;
    this.dead = false;
    this.empUntil = 0;
    this.angle = 0;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(dt, player, buildings, projectiles, spawnFn) {
    if (Date.now() < this.empUntil) return;
    const dx = player.x - this.x, dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.x += (dx / len) * this.data.speed * dt;
    this.y += (dy / len) * this.data.speed * dt;
    this.angle = Math.atan2(dy, dx);
    this.phase += dt * 3;

    for (const b of buildings) {
      if (b.data.isWall && b.powered !== false) {
        const bx = b.x, by = b.y, s = b.data.size || 24;
        if (Math.abs(this.x - bx) < s && Math.abs(this.y - by) < s) {
          const ox = this.x - bx, oy = this.y - by;
          if (Math.abs(ox) > Math.abs(oy)) this.x = bx + Math.sign(ox) * s;
          else this.y = by + Math.sign(oy) * s;
        }
      }
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) this.die();
  }

  die() {
    this.dead = true;
  }

  getSpawnChildren() {
    if (this.data.onDeath && this.allDefs) {
      const def = this.allDefs.find(d => d.id === this.data.onDeath.spawn);
      if (def) return Array.from({ length: this.data.onDeath.count }, () => ({
        def, x: this.x + (Math.random() - 0.5) * 40, y: this.y + (Math.random() - 0.5) * 40
      }));
    }
    return [];
  }

  draw(ctx) {
    const { color, shape, size } = this.data;
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.translate(this.x, this.y);

    const s = size;
    if (shape === 'triangle') {
      ctx.rotate(this.angle);
      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(-s, -s * 0.7);
      ctx.lineTo(-s, s * 0.7);
      ctx.closePath();
    } 
    else if (shape === 'diamond') {
      ctx.rotate(this.phase * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0);
      ctx.closePath();
    } 
    else if (shape === 'square') {
      ctx.rotate(this.angle + this.phase * 0.3);
      ctx.beginPath();
      ctx.rect(-s, -s, s * 2, s * 2);
    } 
    else if (shape === 'hexagon') 
    {
      ctx.beginPath();

      for (let i = 0; i < 6; i++) 
      {
        const a = (i / 6) * Math.PI * 2;

        if (i === 0)
          ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s);
        else
          ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      }

      ctx.closePath();
    }
    else if (shape === 'star') {
      ctx.rotate(this.phase * 0.4);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) 
        {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? s : s * 0.4;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }

    ctx.closePath();

    } 
    else 
    {
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
    }

    ctx.fill();
    ctx.stroke();

    if (this.hp < this.maxHp) {
      ctx.resetTransform ? ctx.resetTransform() : ctx.setTransform(1, 0, 0, 1, 0, 0);
      const bw = s * 2.5, bh = 4;
      const bx = this.x - bw / 2, by = this.y - s - 10;
      ctx.fillStyle = '#330000';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#ff2244';
      ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), bh);
    }

    ctx.restore();
  }
}
