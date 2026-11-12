import { Application, CullerPlugin, extensions } from 'pixi.js';
import { balance } from './balance';
import { generateIsland } from './map/generate';
import { renderIsland, makeHighlight, liftOf } from './map/render';
import { tileToWorld, worldToTile } from './map/iso';
import { createCamera } from './camera/camera';
import { sfx } from './audio/sfx';

const TERRAIN_NAMES: Record<string, string> = {
  deepWater: 'Mar profundo', water: 'Mar', sand: 'Playa', grass: 'Llano',
  forest: 'Bosque', mountain: 'Montaña', peak: 'Cumbre',
};

// no dibujar lo que está fuera de la pantalla
extensions.add(CullerPlugin);

async function main() {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: balance.colors.deepWater,
    antialias: false, // las texturas ya vienen suavizadas; ahorra GPU en celulares
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  document.getElementById('app')!.appendChild(app.canvas);

  const map = generateIsland();
  const { tileWidth: TW, tileHeight: TH } = balance.map;
  const margin = TW * 4;
  const bounds = {
    minX: -map.height * (TW / 2) - margin,
    maxX: map.width * (TW / 2) + margin,
    minY: -margin,
    maxY: (map.width + map.height) * (TH / 2) + margin,
  };

  const camera = createCamera(app, bounds);
  app.stage.addChild(camera.viewport);
  if (import.meta.env.DEV || location.search.includes('debug')) Object.assign(window, { __vp: camera.viewport, __app: app });
  camera.viewport.addChild(renderIsland(map, app.renderer));

  const highlight = makeHighlight();
  camera.viewport.addChild(highlight);

  const info = document.getElementById('info')!;
  info.textContent = `$${balance.economy.startingMoney.toLocaleString('es-PR')}`;

  camera.onTap((wx, wy) => {
    const t = pickTile(wx, wy);
    if (!t) {
      highlight.visible = false;
      return;
    }
    const terrain = map.terrain[t.y * map.width + t.x];
    const p = tileToWorld(t.x, t.y);
    highlight.position.set(p.x, p.y - liftOf(terrain));
    highlight.visible = true;
    info.textContent = `${TERRAIN_NAMES[terrain]} (${t.x}, ${t.y})`;
    sfx.tap.play();
  });
  /** Busca el tile tocado teniendo en cuenta la altura (el de más al frente gana). */
  function pickTile(wx: number, wy: number) {
    let best: { x: number; y: number } | null = null;
    for (let lift = 0; lift <= 20; lift++) {
      const t = worldToTile(wx, wy + lift);
      if (t.x < 0 || t.y < 0 || t.x >= map.width || t.y >= map.height) continue;
      const l = liftOf(map.terrain[t.y * map.width + t.x]);
      if (l !== lift) continue;
      if (!best || t.x + t.y > best.x + best.y) best = t;
    }
    return best ?? (() => {
      const t = worldToTile(wx, wy);
      return t.x >= 0 && t.y >= 0 && t.x < map.width && t.y < map.height ? t : null;
    })();
  }

  camera.onDoubleTap(() => sfx.zoom.play());
}

main();
