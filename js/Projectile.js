export class Projectile {
  constructor({ x, y, vx, vy, damage, speed, size, color, pierce, splash, fromBuilding }) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.damage = damage;
    this.speed = speed;
    this.size = size || 5;
    this.color = color || '#00ffff';
    this.pierce = pierce || 1;
    this.splash = splash || 0;
    this.fromBuilding = fromBuilding || false;
    this.hit = new Set();
    this.dead = false;
    this.life = 0;
    this.maxLife = 3;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life += dt;
    if (this.life > this.maxLife) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
