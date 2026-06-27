export class SaveManager {
  constructor() {
    this.key = 'circuit_survival';
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : this.defaults();
    } catch { return this.defaults(); }
  }

  save(data) {
    try { localStorage.setItem(this.key, JSON.stringify(data)); } catch {}
  }

  defaults() {
    return { highScore: 0, unlockedWeapons: ['pulse_gun'], settings: { sfx: true } };
  }

  updateHighScore(score) {
    const d = this.load();
    if (score > d.highScore) {
      d.highScore = score;
      this.save(d);
    }
  }
}
