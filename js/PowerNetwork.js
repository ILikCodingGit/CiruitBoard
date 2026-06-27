export class PowerNetwork {
  constructor() {
    this.networks = [];
  }

  rebuild(buildings) {
    this.networks = [];
    const visited = new Set();
    const CELL = 48;

    const adj = (a, b) => {
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      return (dx <= CELL && dy === 0) || (dy <= CELL && dx === 0);
    };

    for (const b of buildings) {
      if (visited.has(b)) continue;
      const net = [];
      const queue = [b];
      while (queue.length) {
        const cur = queue.shift();
        if (visited.has(cur)) continue;
        visited.add(cur);
        net.push(cur);
        for (const other of buildings) {
          if (!visited.has(other) && adj(cur, other)) queue.push(other);
        }
      }
      const prod = net.reduce((s, b) => s + (b.data.powerOutput || 0), 0);
      const cap = net.filter(b => b.data.isCapacitor).reduce((s, b) => s + (b.data.storage || 0), 0);
      const stored = Math.min(cap, net.reduce((s, b) => s + (b.storedPower || 0), 0));
      const total = prod + stored;
      let remaining = total;

      const consumers = net
        .filter(b => (b.data.powerConsumption || 0) > 0)
        .sort((a, b) => a.placedAt - b.placedAt);

      for (const c of consumers) {
        if (remaining >= c.data.powerConsumption) {
          remaining -= c.data.powerConsumption;
          c.powered = true;
        } else {
          c.powered = false;
        }
      }

      const excess = Math.max(0, remaining);
      for (const b of net) {
        if (b.data.isCapacitor) {
          b.storedPower = Math.min(b.data.storage || 0, excess);
        }
        b.networkProd = prod;
      }

      for (const b of net) if (!b.data.powerConsumption) b.powered = true;

      this.networks.push({ buildings: net, production: prod, consumption: total - remaining });
    }
  }

  applyEMP(x, y, radius) {
    for (const net of this.networks) {
      for (const b of net.buildings) {
        const dx = b.x - x, dy = b.y - y;
        if (dx * dx + dy * dy < radius * radius) {
          b.empUntil = Date.now() + 3000;
          b.powered = false;
        }
      }
    }
  }
}
