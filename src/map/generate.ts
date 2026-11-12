import { balance } from '../balance';

export type Terrain = 'deepWater' | 'water' | 'sand' | 'grass' | 'forest' | 'mountain' | 'peak';

export interface IslandMap {
  width: number;
  height: number;
  elevation: Float32Array;
  terrain: Terrain[];
}

/** PRNG determinista (mulberry32) para que la isla salga igual siempre. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruido de valor 2D suavizado con varias octavas. */
function makeNoise(seed: number) {
  const rand = mulberry32(seed);
  const size = 256;
  const perm = new Uint8Array(size * 2);
  const vals = new Float32Array(size);
  for (let i = 0; i < size; i++) { perm[i] = i; vals[i] = rand(); }
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < size; i++) perm[i + size] = perm[i];
  const lattice = (x: number, y: number) => vals[perm[(perm[x & 255] + y) & 511]];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const tx = smooth(x - xi), ty = smooth(y - yi);
    const a = lattice(xi, yi), b = lattice(xi + 1, yi);
    const c = lattice(xi, yi + 1), d = lattice(xi + 1, yi + 1);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
  return (x: number, y: number) => {
    let sum = 0, amp = 1, freq = 1, norm = 0;
    for (let o = 0; o < 4; o++) {
      sum += value(x * freq, y * freq) * amp;
      norm += amp; amp *= 0.5; freq *= 2;
    }
    return sum / norm;
  };
}

/**
 * Isla alargada de este a oeste (como Puerto Rico) con una cordillera central
 * y tres islitas: Mona (oeste), Culebra y Vieques (este).
 */
export function generateIsland(): IslandMap {
  const { width: W, height: H, seed, seaLevel, sandLevel, forestLevel, mountainLevel } = balance.map;
  const noise = makeNoise(seed);
  const elevation = new Float32Array(W * H);
  const terrain: Terrain[] = new Array(W * H);

  const islets = [
    { x: 0.05, y: 0.62, r: 2.2 },  // Mona
    { x: 0.935, y: 0.36, r: 2.0 }, // Culebra
    { x: 0.93, y: 0.72, r: 3.0 },  // Vieques
  ];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - W * 0.46) / (W * 0.37);
      const ny = (y - H * 0.5) / (H * 0.3);
      const d = Math.pow(Math.pow(Math.abs(nx), 4) + Math.pow(Math.abs(ny), 4), 0.25);
      const n = noise(x * 0.12, y * 0.12);
      let e = (1 - d) * 0.75 + (n - 0.5) * 0.5 + 0.2;
      // Cordillera Central: un poco al sur del centro, de este a oeste
      const ridge = Math.exp(-Math.pow((ny - 0.12) / 0.38, 2)) * Math.max(0, 1 - Math.abs(nx) * 1.1);
      if (d < 1.1) e += ridge * 0.3;

      for (const isl of islets) {
        const dist = Math.hypot(x - isl.x * W, (y - isl.y * H) * 1.3) / isl.r;
        if (dist < 1.4) e = Math.max(e, 0.42 * (1 - dist * 0.55) + (n - 0.5) * 0.1);
      }
      // borde del mapa siempre es mar
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (edge < 2) e = Math.min(e, 0.05);

      const i = y * W + x;
      elevation[i] = e;
      terrain[i] =
        e < seaLevel - 0.12 ? 'deepWater' :
        e < seaLevel ? 'water' :
        e < sandLevel ? 'sand' :
        e < forestLevel ? 'grass' :
        e < mountainLevel ? 'forest' :
        e < mountainLevel + 0.1 ? 'mountain' : 'peak';
    }
  }
  return { width: W, height: H, elevation, terrain };
}
