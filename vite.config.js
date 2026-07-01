import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuración de Vite para Journey Experience Intelligence.
// "base: './'" es importante si vas a desplegar en GitHub Pages dentro de un
// subdirectorio (ej. usuario.github.io/journey-davivi/) en lugar de un dominio raíz.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
