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
    this.dead = false;

    // Animation state
    this.t = Math.random() * Math.PI * 2; // global time offset
    this.spawnAge = 0;                     // seconds since placed (for spawn-in)
    this.firingFlash = 0;                  // 0-1 flash after shooting
    this.rotorAngle = 0;                   // turret barrel rotation
    this.orbAngle = 0;                     // generator orbiting dot
    this.pulseRing = 0;                    // expanding ring radius
    this.pulseRingAlpha = 0;
    this.storedFill = 0;                   // capacitor fill animation
    this.empFlash = 0;                     // EMP hit flash
    this.lastTarget = null;                // for turret aim
    this.wireFlowOffset = 0;              // animated dash offset on wires
    this.boostWave = 0;                   // signal booster wave
  }

  update(dt, enemies, projectiles) {
    this.t += dt;
    this.spawnAge += dt;
    if (this.firingFlash > 0) this.firingFlash -= dt * 4;
    if (this.empFlash > 0) this.empFlash -= dt * 3;
    this.orbAngle += dt * 1.4;
    this.wireFlowOffset = (this.wireFlowOffset + dt * 60) % 24;
    this.boostWave = (this.boostWave + dt * 0.8) % 1;
    this.storedFill += (((this.storedPower / (this.data.storage || 1)) - this.storedFill)) * dt * 4;

    const isEMPed = Date.now() < this.empUntil;
    if (isEMPed && this.empFlash <= 0) this.empFlash = 1;

    if (!this.powered || isEMPed) return;
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
    this.lastTarget = { x: target.x, y: target.y };
    this.firingFlash = 1;

    const dx = target.x - this.x, dy = target.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.rotorAngle = Math.atan2(dy, dx);
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
    const isEMPed = Date.now() < this.empUntil;

    // Spawn-in scale animation (pops in over 0.3s)
    const spawnScale = Math.min(1, this.spawnAge / 0.3);
    const easeScale = 1 + 0.15 * Math.sin(spawnScale * Math.PI); // overshoot bounce
    const scale = spawnScale < 1 ? spawnScale * easeScale : 1;

    const alpha = this.powered && !isEMPed ? 1 : 0.35;
    const glowMult = this.powered && !isEMPed ? 1 : 0.2;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    if (isEMPed) {
      // Purple EMP shimmer overlay
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 20);
    }

    if (isWire) {
      this._drawWire(ctx, half, color, glowMult);
    } else if (isWall) {
      this._drawWall(ctx, half, color, glowMult);
    } else if (isDefensive) {
      this._drawTurret(ctx, half, color, glowMult);
    } else if (isCapacitor) {
      this._drawCapacitor(ctx, half, color, glowMult);
    } else if (isBooster) {
      this._drawBooster(ctx, half, color, glowMult);
    } else {
      this._drawGenerator(ctx, half, color, glowMult);
    }

    ctx.restore();
  }

  _glow(ctx, color, blur, mult = 1) {
    ctx.shadowBlur = blur * mult;
    ctx.shadowColor = color;
  }

  _drawGenerator(ctx, half, color, gm) {
    const pulse = 0.85 + 0.15 * Math.sin(this.t * 2.5);

    // Outer rotating hex ring
    ctx.save();
    ctx.rotate(this.t * 0.6);
    this._glow(ctx, color, 14, gm);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha *= 0.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = half * 1.5;
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
              : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Core square
    ctx.globalAlpha = this.powered ? 1 : 0.35;
    this._glow(ctx, color, 20 * pulse, gm);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillRect(-half, -half, half * 2, half * 2);
    ctx.strokeRect(-half, -half, half * 2, half * 2);

    // Orbiting dot
    const ox = Math.cos(this.orbAngle) * (half * 0.55);
    const oy = Math.sin(this.orbAngle) * (half * 0.55);
    ctx.fillStyle = color;
    this._glow(ctx, '#ffffff', 12, gm);
    ctx.beginPath();
    ctx.arc(ox, oy, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Opposite dot
    ctx.beginPath();
    ctx.arc(-ox * 0.6, -oy * 0.6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Center lightning bolt icon
    ctx.fillStyle = color;
    ctx.font = `bold ${half}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, 1);
  }

  _drawWire(ctx, half, color, gm) {
    const s = half * 2;

    // Background cell
    ctx.fillStyle = 'rgba(0,40,20,0.4)';
    ctx.fillRect(-half, -half, s, s);

    // Animated flowing dashes
    this._glow(ctx, color, 8, gm);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -this.wireFlowOffset;

    ctx.beginPath();
    ctx.moveTo(-half, 0); ctx.lineTo(half, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -half); ctx.lineTo(0, half);
    ctx.stroke();

    ctx.setLineDash([]);

    // Corner dots
    ctx.fillStyle = color;
    ctx.globalAlpha *= 0.5;
    for (const [cx, cy] of [[-half, -half], [half, -half], [-half, half], [half, half]]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = this.powered ? 1 : 0.35;

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha *= 0.4;
    ctx.strokeRect(-half, -half, s, s);
  }

  _drawWall(ctx, half, color, gm) {
    const s = half * 2;
    const hpFrac = isFinite(this.hp) ? Math.max(0, this.hp / (this.data.hp || 1)) : 1;

    // Base fill — shifts red as damaged
    const r = Math.round(0 + (1 - hpFrac) * 80);
    ctx.fillStyle = `rgba(${r},60,30,0.65)`;
    ctx.fillRect(-half, -half, s, s);

    // Brick lines
    this._glow(ctx, color, 10, gm);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-half, -half, s, s);

    // Horizontal mortar lines
    ctx.globalAlpha *= 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-half, 0); ctx.lineTo(half, 0);
    ctx.stroke();
    // Offset vertical lines for brick look
    ctx.beginPath();
    ctx.moveTo(0, -half); ctx.lineTo(0, 0);
    ctx.moveTo(-half * 0.5, 0); ctx.lineTo(-half * 0.5, half);
    ctx.moveTo(half * 0.5, 0); ctx.lineTo(half * 0.5, half);
    ctx.stroke();
    ctx.globalAlpha = this.powered ? 1 : 0.35;

    // HP bar along bottom
    if (isFinite(this.hp)) {
      ctx.fillStyle = '#330000';
      ctx.fillRect(-half, half - 4, s, 4);
      ctx.fillStyle = hpFrac > 0.5 ? '#00ff88' : hpFrac > 0.25 ? '#ffaa00' : '#ff2244';
      ctx.fillRect(-half, half - 4, s * hpFrac, 4);
    }
  }

  _drawTurret(ctx, half, color, gm) {
    const isLaser = this.data.id === 'laser_tower' || this.data.id === 'railgun_tower';
    const flash = Math.max(0, this.firingFlash);

    // Base platform
    this._glow(ctx, color, 16 + flash * 20, gm);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Rotating range indicator (faint)
    ctx.save();
    ctx.rotate(this.t * 0.3);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha *= 0.15;
    ctx.beginPath();
    ctx.arc(0, 0, half * 1.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = this.powered ? 1 : 0.35;

    // Barrel pointing at last target
    ctx.save();
    ctx.rotate(this.rotorAngle);
    const barrelLen = half * 1.1;
    const barrelW = isLaser ? 3 : 5;
    ctx.fillStyle = flash > 0 ? '#ffffff' : color;
    this._glow(ctx, flash > 0 ? '#ffffff' : color, 10 + flash * 15, gm);
    ctx.fillRect(0, -barrelW / 2, barrelLen, barrelW);

    // Muzzle flash
    if (flash > 0.3) {
      ctx.globalAlpha *= flash;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(barrelLen, 0, barrelW * (flash * 1.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = this.powered ? 1 : 0.35;
    }
    ctx.restore();

    // Center hub
    ctx.fillStyle = flash > 0 ? '#ffffff' : color;
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing ring when powered
    if (this.powered) {
      if (this.pulseRingAlpha <= 0 && Math.random() < 0.02) {
        this.pulseRing = 0;
        this.pulseRingAlpha = 0.5;
      }
      if (this.pulseRingAlpha > 0) {
        this.pulseRing += 80 * (1 / 60);
        this.pulseRingAlpha -= 0.015;
        ctx.globalAlpha = this.pulseRingAlpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, this.pulseRing, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  _drawCapacitor(ctx, half, color, gm) {
    const s = half * 2;
    const fill = this.storedFill;

    // Outer casing
    this._glow(ctx, color, 12, gm);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillRect(-half, -half, s, s);
    ctx.strokeRect(-half, -half, s, s);

    // Inner energy fill (animated level)
    const innerH = (s - 8) * fill;
    const innerY = half - 4 - innerH;
    const energyColor = fill > 0.8 ? '#ffff00' : fill > 0.4 ? '#88ff00' : color;
    ctx.fillStyle = energyColor;
    this._glow(ctx, energyColor, 10 * fill, gm);
    ctx.fillRect(-half + 4, innerY, s - 8, innerH);

    // Scan line sweep inside
    if (fill > 0.05) {
      const scanY = half - 4 - (s - 8) * fill * ((this.t * 0.8) % 1);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.globalAlpha *= 0.3;
      ctx.beginPath();
      ctx.moveTo(-half + 4, scanY);
      ctx.lineTo(half - 4, scanY);
      ctx.stroke();
      ctx.globalAlpha = this.powered ? 1 : 0.35;
    }

    // Separator lines (capacitor plates look)
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha *= 0.4;
    for (let i = 1; i < 3; i++) {
      const ly = -half + (s / 3) * i;
      ctx.beginPath();
      ctx.moveTo(-half + 4, ly); ctx.lineTo(half - 4, ly);
      ctx.stroke();
    }
    ctx.globalAlpha = this.powered ? 1 : 0.35;

    // Top terminals
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha *= 0.8;
    ctx.beginPath();
    ctx.moveTo(-half * 0.35, -half - 4); ctx.lineTo(-half * 0.35, -half + 1);
    ctx.moveTo(half * 0.35, -half - 4); ctx.lineTo(half * 0.35, -half + 1);
    ctx.stroke();
  }

  _drawBooster(ctx, half, color, gm) {
    // Animated concentric rings expanding outward
    const waveCount = 3;
    for (let i = 0; i < waveCount; i++) {
      const phase = ((this.boostWave + i / waveCount) % 1);
      const r = half * 0.5 + phase * half * 2.5;
      const a = (1 - phase) * 0.4;
      ctx.globalAlpha = a;
      this._glow(ctx, color, 8, gm);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = this.powered ? 1 : 0.35;

    // Core diamond
    this._glow(ctx, color, 20, gm);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.5);
    ctx.lineTo(half * 0.5, 0);
    ctx.lineTo(0, half * 0.5);
    ctx.lineTo(-half * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    // Inner bright dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha *= 0.4;
    ctx.strokeRect(-half, -half, half * 2, half * 2);
  }
}
