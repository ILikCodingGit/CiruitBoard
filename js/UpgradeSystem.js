export class UpgradeSystem {
  constructor(weaponDefs, passiveDefs, packDefs) {
    this.weaponDefs = weaponDefs;
    this.passiveDefs = passiveDefs;
    this.packDefs = packDefs;
  }

  generateChoices(player, count = 3) {
    const choices = [];
    const pool = [];

    for (const w of this.weaponDefs) {
      pool.push({ type: 'weapon', data: w });
    }
    for (const p of this.passiveDefs) {
      pool.push({ type: 'passive', data: p });
    }
    for (const pk of this.packDefs) {
      pool.push({ type: 'pack', data: pk });
    }

    const shuffled = pool.sort(() => Math.random() - 0.5);
    const seen = new Set();

    for (const item of shuffled) {
      if (choices.length >= count) break;
      const key = `${item.type}:${item.data.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const existing = item.type === 'weapon'
        ? player.weapons.find(w => w.data.id === item.data.id)
        : null;

      choices.push({
        type: item.type,
        data: item.data,
        label: existing ? `[LV${existing.level + 1}] ${item.data.name}` : item.data.name,
        description: existing ? `Upgrade: +20% damage, +10% fire rate` : (item.data.description || '')
      });
    }

    return choices;
  }
}
