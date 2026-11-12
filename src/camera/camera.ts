import type { Application } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import gsap from 'gsap';
import { balance } from '../balance';

export interface WorldBounds { minX: number; minY: number; maxX: number; maxY: number }

type PointCb = (worldX: number, worldY: number) => void;

export interface Camera {
  viewport: Viewport;
  onTap(cb: PointCb): void;
  onDoubleTap(cb: PointCb): void;
}

/**
 * Cámara táctil:
 *  - arrastrar con un dedo (con inercia)
 *  - pellizcar para acercar/alejar
 *  - doble toque: acerca al punto; si ya está cerca, aleja
 *  - rueda del ratón en computadora
 */
export function createCamera(app: Application, bounds: WorldBounds): Camera {
  const cfg = balance.camera;
  const viewport = new Viewport({
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    worldWidth: bounds.maxX - bounds.minX,
    worldHeight: bounds.maxY - bounds.minY,
    events: app.renderer.events,
    passiveWheel: false,
  });

  viewport
    .drag()
    .pinch()
    .wheel({ smooth: 5 })
    .decelerate({ friction: cfg.friction })
    .clampZoom({ minScale: cfg.minZoom, maxScale: cfg.maxZoom })
    .clamp({ left: bounds.minX, right: bounds.maxX, top: bounds.minY, bottom: bounds.maxY, underflow: 'center' });

  viewport.setZoom(cfg.startZoom, true);
  viewport.moveCenter((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2);

  const tapCbs: PointCb[] = [];
  const dblCbs: PointCb[] = [];
  let lastTap = { t: 0, x: 0, y: 0 };
  let tween: gsap.core.Tween | null = null;

  const killTween = () => { tween?.kill(); tween = null; };
  viewport.on('drag-start', killTween);
  viewport.on('pinch-start', killTween);
  viewport.on('wheel-start', killTween);

  viewport.on('clicked', (e) => {
    const now = performance.now();
    const dist = Math.hypot(e.screen.x - lastTap.x, e.screen.y - lastTap.y);
    const isDouble = now - lastTap.t < cfg.doubleTapMs && dist < cfg.doubleTapMaxDistancePx;
    if (isDouble) {
      lastTap = { t: 0, x: 0, y: 0 };
      zoomTo(e.world.x, e.world.y);
      dblCbs.forEach((cb) => cb(e.world.x, e.world.y));
    } else {
      lastTap = { t: now, x: e.screen.x, y: e.screen.y };
      tapCbs.forEach((cb) => cb(e.world.x, e.world.y));
    }
  });

  function zoomTo(wx: number, wy: number) {
    killTween();
    viewport.plugins.get('decelerate')?.reset();
    const zoomIn = viewport.scale.x < cfg.doubleTapZoom * 0.95;
    const s = { z: viewport.scale.x, cx: viewport.center.x, cy: viewport.center.y };
    tween = gsap.to(s, {
      z: zoomIn ? cfg.doubleTapZoom : cfg.startZoom,
      cx: zoomIn ? wx : s.cx,
      cy: zoomIn ? wy : s.cy,
      duration: cfg.doubleTapAnimSeconds,
      ease: 'power2.out',
      onUpdate: () => {
        viewport.setZoom(s.z, true);
        viewport.moveCenter(s.cx, s.cy);
        viewport.plugins.get('clamp')?.update();
      },
      onComplete: () => { tween = null; },
    });
  }

  window.addEventListener('resize', () => viewport.resize(window.innerWidth, window.innerHeight));

  return {
    viewport,
    onTap: (cb) => tapCbs.push(cb),
    onDoubleTap: (cb) => dblCbs.push(cb),
  };
}
