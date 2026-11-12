import { defineConfig } from 'vite';

// base relativa: funciona en GitHub Pages sin importar el nombre del repositorio
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
