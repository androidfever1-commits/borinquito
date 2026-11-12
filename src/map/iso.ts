import { balance } from '../balance';

const { tileWidth: TW, tileHeight: TH } = balance.map;

/** Coordenadas de tile → posición en el mundo (vértice superior del rombo). */
export function tileToWorld(x: number, y: number) {
  return { x: (x - y) * (TW / 2), y: (x + y) * (TH / 2) };
}

/** Posición en el mundo → tile (ignora la altura). */
export function worldToTile(wx: number, wy: number) {
  const a = wx / (TW / 2);
  const b = wy / (TH / 2);
  return { x: Math.floor((a + b) / 2), y: Math.floor((b - a) / 2) };
}
