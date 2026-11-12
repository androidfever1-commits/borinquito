# Borinquito

City builder para celular inspirado en Puerto Rico.

**Tecnología:** Vite + TypeScript + PixiJS 8 + pixi-viewport + GSAP + Howler.js

## Probar en el celular
Cada `push` a `main` se publica solo en GitHub Pages (ver `.github/workflows/deploy.yml`).

## Desarrollo local
```bash
npm install
npm run dev      # abre en la red local (--host) para probar desde el celular
npm run build    # compila a dist/
```

## Estructura
- `src/data/balance.json`: todos los números del juego (economía, edificios, mapa, cámara, colores)
- `src/map/generate.ts`: genera la isla (determinista por `seed`)
- `src/map/render.ts`: dibuja los tiles isométricos como sprites
- `src/camera/camera.ts`: arrastrar con inercia, pellizcar, doble toque, rueda del ratón
- `src/audio/sfx.ts`: sonidos de prueba con Howler

Agrega `?debug` a la URL para exponer `window.__vp` y `window.__app` en la consola.
