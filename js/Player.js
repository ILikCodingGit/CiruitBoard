import { Weapon } from './Weapon.js';

export class Player {
  constructor(x, y, weaponDefs) {
    this.x = x; this.y = y;
    this.radius = 14;
    this.hp = 100;
    this.maxHp = 100;
    this.dead = false;
    this.iframes = 0;

    this.stats = {
      moveSpeed: 160,
      damage: 0,
      fireRate: 0,
      pickupRadius: 60,
      hpRegen: 0,
      armor: 0
    };

    this.weaponDefs = weaponDefs;
    this.weapons = [new Weapon(weaponDefs.find(w => w.id === 'pulse_gun'))];
    this.passives = [];
    this.regenAccum = 0;

    this.angle = 0;
    this.pulsePhase = 0;
  }

  addWeapon(id) {
    const existing = this.weapons.find(w => w.data.id === id);
    if (existing) { existing.upgrade(); return; }
    const def = this.weaponDefs.find(w => w.id === id);
    if (def) this.weapons.push(new Weapon(def));
  }

  applyPassive(passive) {
    this.passives.push(passive);
    const v = passive.value;
    if (passive.type === 'add') {
      if (passive.stat === 'maxHp') { this.maxHp += v; this.hp = Math.min(this.hp + v, this.maxHp); }
      else this.stats[passive.stat] = (this.stats[passive.stat] || 0) + v;
    } else {
      this.stats[passive.stat] = (this.stats[passive.stat] || 0) + v;
    }
  }

  update(dt, keys, mouseWorld, projectiles) {
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    if (dx || dy) {
      const spd = this.stats.moveSpeed * (1 + (this.stats.moveSpeedMult || 0));
      this.x += (dx / len) * spd * dt;
      this.y += (dy / len) * spd * dt;
    }

    if (mouseWorld) {
      this.angle = Math.atan2(mouseWorld.y - this.y, mouseWorld.x - this.x);
    }

    if (this.iframes > 0) this.iframes -= dt;

    this.regenAccum += dt;
    if (this.regenAccum >= 1 && this.stats.hpRegen > 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.stats.hpRegen);
      this.regenAccum = 0;
    }

    for (const w of this.weapons) {
      if (mouseWorld) w.tryFire(dt, this.x, this.y, mouseWorld.x, mouseWorld.y, this.stats, projectiles);
    }

    this.pulsePhase += dt * 2;
  }

  takeDamage(amount) {
    if (this.iframes > 0) return;
    const reduced = amount * (1 - Math.min(0.75, this.stats.armor || 0));
    this.hp -= reduced;
    this.iframes = 0.5;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  draw(ctx) {
    const pulse = 0.85 + 0.15 * Math.sin(this.pulsePhase);
    ctx.save();
    ctx.shadowBlur = 30 * pulse;
    ctx.shadowColor = '#00ffff';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(0,255,255,0.15)';
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    const ex = this.x + Math.cos(this.angle) * (this.radius + 6);
    const ey = this.y + Math.sin(this.angle) * (this.radius + 6);
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  }
}
