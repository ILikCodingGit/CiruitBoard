import { Player } from './Player.js';
import { Enemy } from './Enemy.js';
import { Building } from './Building.js';
import { Projectile } from './Projectile.js';
import { PowerNetwork } from './PowerNetwork.js';
import { WaveManager } from './WaveManager.js';
import { UpgradeSystem } from './UpgradeSystem.js';
import { Renderer } from './Renderer.js';
import { SaveManager } from './SaveManager.js';

export class Game {
  constructor(canvas, data) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = data;

    this.renderer = new Renderer(canvas);
    this.save = new SaveManager();
    this.powerNetwork = new PowerNetwork();
    this.upgradeSystem = new UpgradeSystem(data.weapons, data.passives, data.packs);

    this.player = new Player(0, 0, data.weapons);
    this.enemies = [];
    this.projectiles = [];
    this.buildings = [];
    this.xpOrbs = [];
    this.particles = [];

    this.waveManager = new WaveManager(data.waves, data.enemies);

    this.keys = {};
    this.mouse = { x: 0, y: 0 };
    this.mouseWorld = { x: 0, y: 0 };
    this.mouseDown = false;

    this.camX = 0; this.camY = 0;

    this.score = 0;
    this.killCount = 0;
    this.gameTime = 0;

    this.xp = 0;
    this.level = 1;
    this.xpToLevel = 10;

    this.state = 'playing';
    this.upgradeChoices = [];

    this.buildMode = false;
    this.hand = [];
    this.selectedCard = 0;

    this.toasts = []; // { title, body, color, life, maxLife }

    this.lastTime = null;

    this.resize();
    this.bindEvents();
    requestAnimationFrame(t => this.loop(t));
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  bindEvents() {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (k === 'b' || k === 'tab') { e.preventDefault(); this.toggleBuildMode(); }
      if (this.buildMode) {
        if (k === 'q') this.selectedCard = Math.max(0, this.selectedCard - 1);
        if (k === 'e') this.selectedCard = Math.min(this.hand.length - 1, this.selectedCard + 1);
        const n = parseInt(k);
        if (n >= 1 && n <= 9) this.selectedCard = Math.min(n - 1, this.hand.length - 1);
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    this.canvas.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      this.updateMouseWorld();
    });
    this.canvas.addEventListener('mousedown', e => {
      if (e.button === 0) {
        this.mouseDown = true;
        if (this.buildMode) this.placeBuilding();
        if (this.state === 'upgrade') this.pickUpgrade(e);
        if (this.state === 'gameover') this.restart();
      }
    });
    this.canvas.addEventListener('mouseup', e => { if (e.button === 0) this.mouseDown = false; });
    window.addEventListener('resize', () => this.resize());
  }

  updateMouseWorld() {
    const W = this.canvas.width, H = this.canvas.height;
    this.mouseWorld.x = this.mouse.x - W / 2 + this.camX;
    this.mouseWorld.y = this.mouse.y - H / 2 + this.camY;
  }

  toggleBuildMode() {
    this.buildMode = !this.buildMode;
    if (!this.buildMode) this.selectedCard = 0;
  }

  placeBuilding() {
    if (!this.hand.length) return;
    const card = this.hand[this.selectedCard];
    if (!card) return;
    const def = this.data.buildings.find(b => b.id === card);
    if (!def) return;
    const GRID = 48;
    const gx = Math.round(this.mouseWorld.x / GRID) * GRID;
    const gy = Math.round(this.mouseWorld.y / GRID) * GRID;
    const occupied = this.buildings.some(b => b.x === gx && b.y === gy);
    if (!occupied) {
      this.buildings.push(new Building(def, gx, gy));
      this.hand.splice(this.selectedCard, 1);
      this.selectedCard = Math.min(this.selectedCard, this.hand.length - 1);
      this.powerNetwork.rebuild(this.buildings);
      this.showToast(`🔧 ${def.name} placed`, def.description || '', def.color || '#00ff88');
    }
  }

  gainXP(amount) {
    this.xp += amount;
    this.score += amount;
    while (this.xp >= this.xpToLevel) {
      this.xp -= this.xpToLevel;
      this.xpToLevel = Math.floor(this.xpToLevel * 1.3);
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.state = 'upgrade';
    this.upgradeChoices = this.upgradeSystem.generateChoices(this.player, 3);
  }

  pickUpgrade(e) {
    const W = this.canvas.width, H = this.canvas.height;
    const cardW = 240, cardH = 160, gap = 20;
    const total = this.upgradeChoices.length;
    const startX = W / 2 - (total * (cardW + gap) - gap) / 2;
    const y = H / 2 - cardH / 2;

    for (let i = 0; i < total; i++) {
      const x = startX + i * (cardW + gap);
      if (e.clientX >= x && e.clientX <= x + cardW && e.clientY >= y && e.clientY <= y + cardH) {
        this.applyUpgrade(this.upgradeChoices[i]);
        this.state = 'playing';
        break;
      }
    }
  }

  showToast(title, body, color = '#00ffcc') {
    this.toasts.push({ title, body, color, life: 3.5, maxLife: 3.5 });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  applyUpgrade(choice) {
    if (choice.type === 'weapon') {
      const existing = this.player.weapons.find(w => w.data.id === choice.data.id);
      this.player.addWeapon(choice.data.id);
      if (existing) {
        this.showToast(`↑ ${choice.data.name} LV${existing.level}`, 'Upgraded: +20% damage, +10% fire rate', '#00ffff');
      } else {
        this.showToast(`⚡ ${choice.data.name}`, choice.data.description || 'New weapon acquired.', '#00ffff');
      }
    } else if (choice.type === 'passive') {
      this.player.applyPassive(choice.data);
      this.showToast(`▲ ${choice.data.name}`, choice.data.description || 'Passive applied.', '#88ff00');
    } else if (choice.type === 'pack') {
      for (const card of choice.data.cards) this.hand.push(card);
      const cardNames = choice.data.cards
        .map(id => { const d = this.data.buildings.find(b => b.id === id); return d ? d.name : id; })
        .join(', ');
      this.showToast(`📦 ${choice.data.name}`, `Added to hand: ${cardNames}`, '#ffaa00');
    }
  }

  spawnParticle(x, y, color) {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 80;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.5 + Math.random() * 0.4,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (this.state === 'playing') this.update(dt);
    this.render();
    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    this.gameTime += dt;
    this.renderer.updateTraces(dt);

    this.player.update(dt, this.keys, this.mouseWorld, this.projectiles);
    this.camX = this.player.x;
    this.camY = this.player.y;
    this.updateMouseWorld();

    this.waveManager.update(dt, this.enemies, this.canvas.width, this.canvas.height, this.player.x, this.player.y);

    for (const b of this.buildings) b.update(dt, this.enemies, this.projectiles);

    for (const e of this.enemies) {
      e.update(dt, this.player, this.buildings, this.projectiles, null);

      const dx = e.x - this.player.x, dy = e.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.player.radius + (e.data.size || 10)) {
        this.player.takeDamage(e.data.damage * dt * 2);
      }

      if (e.data.special === 'emp' && dist < (e.data.empRadius || 150)) {
        this.powerNetwork.applyEMP(e.x, e.y, e.data.empRadius || 150);
      }

      for (const b of this.buildings) {
        if (b.data.isWall) {
          const bx = b.x, by = b.y, s = b.data.size || 24;
          if (Math.abs(e.x - bx) < s && Math.abs(e.y - by) < s) {
            b.hp -= e.data.damage * dt * 2;
            if (b.hp <= 0) { b.dead = true; }
          }
        }
      }
    }

    for (const p of this.projectiles) {
      p.update(dt);
      for (const e of this.enemies) {
        if (e.dead || p.dead || p.hit.has(e)) continue;
        const dx = p.x - e.x, dy = p.y - e.y;
        if (dx * dx + dy * dy < (e.data.size || 10) ** 2) {
          e.takeDamage(p.damage);
          p.hit.add(e);
          if (p.hit.size >= p.pierce) p.dead = true;
          if (e.dead) {
            this.killCount++;
            this.score += 10;
            this.gainXP(e.data.xp || 1);
            this.spawnParticle(e.x, e.y, e.data.color);
            const children = e.getSpawnChildren();
            for (const c of children) {
              this.enemies.push(new Enemy(c.def, c.x, c.y, this.data.enemies));
            }
          }
          if (p.splash > 0) {
            for (const oe of this.enemies) {
              if (oe === e || oe.dead) continue;
              const sx = oe.x - p.x, sy = oe.y - p.y;
              if (sx * sx + sy * sy < p.splash * p.splash) oe.takeDamage(p.damage * 0.5);
            }
          }
        }
      }
    }

    for (const pt of this.particles) {
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.life -= dt;
    }

    this.enemies = this.enemies.filter(e => !e.dead);
    this.projectiles = this.projectiles.filter(p => !p.dead);
    this.buildings = this.buildings.filter(b => !b.dead);
    this.particles = this.particles.filter(p => p.life > 0);
    this.toasts = this.toasts.filter(t => t.life > 0);
    for (const t of this.toasts) t.life -= dt;

    if (this.player.dead) {
      this.state = 'gameover';
      this.save.updateHighScore(this.score);
    }
  }

  render() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;

    this.renderer.drawBackground(this.camX, this.camY);

    ctx.save();
    ctx.translate(W / 2 - this.camX, H / 2 - this.camY);

    for (const b of this.buildings) b.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    for (const p of this.projectiles) p.draw(ctx);

    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = pt.life / pt.maxLife;
      ctx.fillStyle = pt.color;
      ctx.shadowBlur = 8; ctx.shadowColor = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.buildMode) {
      const GRID = 48;
      const gx = Math.round(this.mouseWorld.x / GRID) * GRID;
      const gy = Math.round(this.mouseWorld.y / GRID) * GRID;
      const card = this.hand[this.selectedCard];
      const def = card && this.data.buildings.find(b => b.id === card);
      if (def) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10; ctx.shadowColor = def.color;
        ctx.strokeRect(gx - 24, gy - 24, 48, 48);
        ctx.restore();
      }
    }

    this.player.draw(ctx);
    ctx.restore();

    this.drawHUD();
    this.drawToasts();

    if (this.state === 'upgrade') this.drawUpgradeScreen();
    if (this.state === 'gameover') this.drawGameOver();
  }

  drawToasts() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const toastW = 320, toastH = 56, toastX = W - toastW - 16;
    let toastY = this.canvas.height - 80;

    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      const fade = Math.min(1, t.life / 0.4) * Math.min(1, (t.maxLife - t.life + 0.4) / 0.4);

      ctx.save();
      ctx.globalAlpha = fade;

      // Slide in from right
      const slideX = toastX + (1 - Math.min(1, (t.maxLife - t.life) / 0.25)) * 80;

      ctx.fillStyle = 'rgba(0,0,0,0.88)';
      ctx.shadowBlur = 16;
      ctx.shadowColor = t.color;
      ctx.fillRect(slideX, toastY, toastW, toastH);

      // Left accent bar
      ctx.fillStyle = t.color;
      ctx.fillRect(slideX, toastY, 4, toastH);

      // Title
      ctx.fillStyle = t.color;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      ctx.shadowBlur = 8;
      ctx.fillText(t.title, slideX + 14, toastY + 20);

      // Body
      ctx.fillStyle = 'rgba(200,255,230,0.75)';
      ctx.font = '11px monospace';
      ctx.shadowBlur = 0;
      // Truncate long bodies
      let body = t.body;
      if (ctx.measureText(body).width > toastW - 24) {
        while (body.length > 0 && ctx.measureText(body + '…').width > toastW - 24) body = body.slice(0, -1);
        body += '…';
      }
      ctx.fillText(body, slideX + 14, toastY + 38);

      ctx.restore();
      toastY -= toastH + 6;
    }
  }

  drawHUD() {
    const ctx = this.ctx;
    const W = this.canvas.width;

    ctx.save();
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#00ffcc';
    ctx.shadowBlur = 8; ctx.shadowColor = '#00ffcc';

    const mins = Math.floor(this.gameTime / 60);
    const secs = Math.floor(this.gameTime % 60).toString().padStart(2, '0');
    ctx.textAlign = 'center';
    ctx.fillText(`${mins}:${secs}`, W / 2, 24);

    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${this.score}`, 14, 24);
    ctx.fillText(`KILLS: ${this.killCount}`, 14, 44);
    ctx.fillText(`LV ${this.level}`, 14, 64);

    const xpBarW = 200, xpBarH = 6;
    const xpX = W / 2 - xpBarW / 2;
    ctx.fillStyle = '#113322';
    ctx.fillRect(xpX, 30, xpBarW, xpBarH);
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.fillRect(xpX, 30, xpBarW * (this.xp / this.xpToLevel), xpBarH);

    const hpBarW = 180, hpBarH = 10;
    const hpX = W / 2 - hpBarW / 2;
    ctx.fillStyle = '#220000';
    ctx.fillRect(hpX, 44, hpBarW, hpBarH);
    ctx.fillStyle = '#ff2244';
    ctx.shadowColor = '#ff2244';
    ctx.fillRect(hpX, 44, hpBarW * (this.player.hp / this.player.maxHp), hpBarH);
    ctx.strokeStyle = '#ff6688';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpX, 44, hpBarW, hpBarH);

    ctx.fillStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.textAlign = 'right';
    const highScore = this.save.load().highScore;
    ctx.fillText(`BEST: ${highScore}`, W - 14, 24);
    ctx.fillText(`ENEMIES: ${this.enemies.length}`, W - 14, 44);

    const netStats = this.powerNetwork.networks.reduce((s, n) => ({
      prod: s.prod + n.production, con: s.con + n.consumption
    }), { prod: 0, con: 0 });
    ctx.fillText(`PWR: ${netStats.prod}/${netStats.con}`, W - 14, 64);

    if (this.buildMode) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffff00';
      ctx.shadowColor = '#ffff00';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('[ BUILD MODE — B to exit ]', W / 2, this.canvas.height - 80);

      const cardW = 100, cardH = 36, cardGap = 8;
      const startX = W / 2 - (this.hand.length * (cardW + cardGap) - cardGap) / 2;
      const cardY = this.canvas.height - 60;

      for (let i = 0; i < this.hand.length; i++) {
        const card = this.hand[i];
        const def = this.data.buildings.find(b => b.id === card);
        const cx = startX + i * (cardW + cardGap);
        ctx.fillStyle = i === this.selectedCard ? 'rgba(0,255,200,0.25)' : 'rgba(0,50,30,0.7)';
        ctx.fillRect(cx, cardY, cardW, cardH);
        ctx.strokeStyle = i === this.selectedCard ? '#00ffcc' : (def ? def.color : '#fff');
        ctx.lineWidth = i === this.selectedCard ? 2 : 1;
        ctx.strokeRect(cx, cardY, cardW, cardH);
        ctx.fillStyle = def ? def.color : '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(def ? def.name : card, cx + cardW / 2, cardY + cardH / 2 + 4);
      }

      if (!this.hand.length) {
        ctx.fillStyle = '#ff4444';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('No cards in hand', W / 2, this.canvas.height - 40);
      } else {
        // Show description of selected card above hand
        const selCard = this.hand[this.selectedCard];
        const selDef = selCard && this.data.buildings.find(b => b.id === selCard);
        if (selDef) {
          const tipW = 360, tipH = 42;
          const tipX = W / 2 - tipW / 2;
          const tipY = this.canvas.height - 110;
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(tipX, tipY, tipW, tipH);
          ctx.strokeStyle = selDef.color;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(tipX, tipY, tipW, tipH);
          ctx.fillStyle = selDef.color;
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.shadowBlur = 8; ctx.shadowColor = selDef.color;
          ctx.fillText(selDef.name, W / 2, tipY + 16);
          ctx.fillStyle = 'rgba(200,255,230,0.8)';
          ctx.font = '11px monospace';
          ctx.shadowBlur = 0;
          ctx.fillText(selDef.description || '', W / 2, tipY + 32);
        }
      }
    } else {
      ctx.fillStyle = 'rgba(0,255,136,0.5)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`[B] Build (${this.hand.length} cards)`, W - 14, this.canvas.height - 14);
    }

    ctx.restore();
  }

  drawUpgradeScreen() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 20; ctx.shadowColor = '#00ffcc';
    ctx.fillText('LEVEL UP — CHOOSE UPGRADE', W / 2, H / 2 - 120);

    const cardW = 240, cardH = 160, gap = 20;
    const total = this.upgradeChoices.length;
    const startX = W / 2 - (total * (cardW + gap) - gap) / 2;
    const y = H / 2 - cardH / 2;

    for (let i = 0; i < total; i++) {
      const c = this.upgradeChoices[i];
      const x = startX + i * (cardW + gap);
      const hover = this.mouse.x >= x && this.mouse.x <= x + cardW &&
                    this.mouse.y >= y && this.mouse.y <= y + cardH;

      const typeColor = c.type === 'weapon' ? '#00ffff' :
                        c.type === 'passive' ? '#88ff00' : '#ffaa00';

      ctx.fillStyle = hover ? 'rgba(0,40,30,0.95)' : 'rgba(0,20,15,0.9)';
      ctx.shadowBlur = hover ? 30 : 10;
      ctx.shadowColor = typeColor;
      ctx.fillRect(x, y, cardW, cardH);
      ctx.strokeStyle = typeColor;
      ctx.lineWidth = hover ? 2.5 : 1.5;
      ctx.strokeRect(x, y, cardW, cardH);

      ctx.fillStyle = typeColor;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(c.type.toUpperCase(), x + 12, y + 22);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px monospace';
      const words = c.label.split(' ');
      let line = '', lineY = y + 48;
      for (const w of words) {
        const test = line + w + ' ';
        if (ctx.measureText(test).width > cardW - 24 && line) {
          ctx.fillText(line, x + 12, lineY);
          line = w + ' '; lineY += 20;
        } else line = test;
      }
      ctx.fillText(line, x + 12, lineY);

      ctx.fillStyle = 'rgba(200,255,220,0.65)';
      ctx.font = '12px monospace';
      const descWords = c.description.split(' ');
      let dline = '', dlineY = y + 96;
      for (const w of descWords) {
        const test = dline + w + ' ';
        if (ctx.measureText(test).width > cardW - 24 && dline) {
          ctx.fillText(dline, x + 12, dlineY);
          dline = w + ' '; dlineY += 16;
        } else dline = test;
      }
      ctx.fillText(dline, x + 12, dlineY);
    }

    ctx.restore && ctx.restore();
  }

  drawGameOver() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ff2244';
    ctx.shadowColor = '#ff2244';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('SYSTEM CRASHED', W / 2, H / 2 - 60);
    ctx.fillStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.font = '22px monospace';
    ctx.fillText(`Score: ${this.score}  |  Kills: ${this.killCount}  |  Time: ${Math.floor(this.gameTime)}s`, W / 2, H / 2);
    ctx.fillText(`Level: ${this.level}`, W / 2, H / 2 + 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText('Click to restart', W / 2, H / 2 + 90);
  }

  restart() {
    const data = this.data;
    Object.assign(this, new Game(this.canvas, data));
  }
}
