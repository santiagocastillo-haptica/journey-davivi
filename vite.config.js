import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuración de Vite para Journey Experience Intelligence.
// "base" debe coincidir con el nombre del repositorio cuando se despliega en
// GitHub Pages, porque la app vive en usuario.github.io/journey-davivi/
// y no en la raíz del dominio. Si cambias el nombre del repo, actualiza esto.
export default defineConfig({
  plugins: [react()],
  base: "/journey-davivi/",
});
