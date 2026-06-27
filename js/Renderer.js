export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.traceTimer = 0;
    this.traces = [];
    this.initTraces();
  }

  initTraces() {
    for (let i = 0; i < 20; i++) {
      this.traces.push(this.makeTrace());
    }
  }

  makeTrace() {
    return {
      x: Math.random() * 4000 - 2000,
      y: Math.random() * 4000 - 2000,
      len: 60 + Math.random() * 200,
      horiz: Math.random() > 0.5,
      progress: Math.random(),
      speed: 0.2 + Math.random() * 0.5,
      alpha: 0.3 + Math.random() * 0.4,
      color: Math.random() > 0.5 ? '#00ff88' : '#00ffff'
    };
  }

  drawBackground(camX, camY) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-camX + W / 2, -camY + H / 2);

    const GRID = 48;
    const left = camX - W / 2 - GRID;
    const top = camY - H / 2 - GRID;
    const right = camX + W / 2 + GRID;
    const bottom = camY + H / 2 + GRID;

    ctx.strokeStyle = 'rgba(0,80,40,0.35)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = Math.floor(left / GRID) * GRID; x < right; x += GRID) {
      ctx.moveTo(x, top); ctx.lineTo(x, bottom);
    }
    for (let y = Math.floor(top / GRID) * GRID; y < bottom; y += GRID) {
      ctx.moveTo(left, y); ctx.lineTo(right, y);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,255,136,0.2)';
    for (let x = Math.floor(left / GRID) * GRID; x < right; x += GRID) {
      for (let y = Math.floor(top / GRID) * GRID; y < bottom; y += GRID) {
        if ((x + y) % (GRID * 4) === 0) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    for (const t of this.traces) {
      ctx.save();
      ctx.globalAlpha = t.alpha * t.progress * (1 - t.progress) * 4;
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 6;
      ctx.shadowColor = t.color;
      const p = t.progress * t.len;
      ctx.beginPath();
      if (t.horiz) {
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x + p, t.y);
      } else {
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x, t.y + p);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  updateTraces(dt) {
    for (const t of this.traces) {
      t.progress += dt * t.speed;
      if (t.progress > 1) Object.assign(t, this.makeTrace(), { progress: 0 });
    }
  }
}
