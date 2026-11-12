import { Container, Graphics, Sprite, Texture, type Renderer } from 'pixi.js';
import { balance } from '../balance';
import type { IslandMap, Terrain } from './generate';
import { tileToWorld } from './iso';

const { tileWidth: TW, tileHeight: TH } = balance.map;

/** Altura visual (px) de cada tipo de terreno, para dar volumen. */
const LIFT: Record<Terrain, number> = {
  deepWater: 0, water: 0, sand: 2, grass: 4, forest: 7, mountain: 12, peak: 18,
};

/** Resolución de las texturas de tiles: alta para que se vean nítidas con zoom. */
const TEXTURE_RESOLUTION = Math.min(balance.camera.maxZoom * 1.5, 4);

function shade(hex: string, f: number): number {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.min(255, Math.max(0, Math.round(v * f)));
  return (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255);
}

export function liftOf(t: Terrain) {
  return LIFT[t];
}

/**
 * Crea una textura por tipo de terreno (rombo + caras laterales).
 * El origen (0,0) es el vértice superior del rombo a nivel del mar.
 * Se dibuja 1px más grande para evitar rendijas entre tiles.
 */
function makeTileTextures(renderer: Renderer): Record<Terrain, Texture> {
  const colors = balance.colors as Record<Terrain, string>;
  const out = {} as Record<Terrain, Texture>;
  const w = TW / 2 + 0.5, h = TH / 2 + 0.5;
  for (const t of Object.keys(LIFT) as Terrain[]) {
    const lift = LIFT[t];
    const base = colors[t];
    const top = -lift;
    const g = new Graphics();
    if (lift > 0) {
      g.poly([-w, top + h, 0, top + 2 * h, 0, 2 * h, -w, h]).fill(shade(base, 0.72));
      g.poly([0, top + 2 * h, w, top + h, w, h, 0, 2 * h]).fill(shade(base, 0.58));
    }
    g.poly([0, top - 0.5, w, top + h, 0, top + 2 * h, -w, top + h]).fill(base);
    out[t] = renderer.generateTexture({ target: g, resolution: TEXTURE_RESOLUTION, antialias: true });
    g.destroy();
  }
  return out;
}

/** Dibuja la isla con un Sprite por tile (se agrupan en pocas llamadas a la GPU). */
export function renderIsland(map: IslandMap, renderer: Renderer): Container {
  const layer = new Container();
  const textures = makeTileTextures(renderer);

  // orden de profundidad: x + y
  for (let sum = 0; sum < map.width + map.height - 1; sum++) {
    for (let x = 0; x < map.width; x++) {
      const y = sum - x;
      if (y < 0 || y >= map.height) continue;
      const t = map.terrain[y * map.width + x];
      const tex = textures[t];
      const s = new Sprite(tex);
      // el ancla coloca el vértice superior (a nivel del mar) en la posición del tile
      s.anchor.set(0.5, (LIFT[t] + 0.5) / tex.height);
      const p = tileToWorld(x, y);
      s.position.set(p.x, p.y);
      // pequeña variación de brillo para que no se vea plano
      const j = 235 + (Math.abs((x * 73856093) ^ (y * 19349663)) % 21);
      s.tint = (j << 16) | (j << 8) | j;
      s.cullable = true;
      layer.addChild(s);
    }
  }
  return layer;
}

/** Rombo para resaltar el tile tocado. */
export function makeHighlight(): Graphics {
  const h = new Graphics();
  h.poly([0, 0, TW / 2, TH / 2, 0, TH, -TW / 2, TH / 2])
    .fill({ color: 0xffffff, alpha: 0.25 })
    .stroke({ color: 0xffffff, width: 2, alpha: 0.9 });
  h.visible = false;
  return h;
}
