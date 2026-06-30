# Journey Experience Intelligence — Háptica × Davivienda

Herramienta interna para explorar el Journey del Ciclo de Vida del Colombiano,
con insights, dashboard filtrable y asistente IA. Conectada a Firestore para
que los cambios (estados, iniciativas, comentarios) se compartan entre todo
el equipo en tiempo real.

## Cómo correr el proyecto localmente

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Corre el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Esto abre la app en `http://localhost:5173` con recarga automática al guardar cambios.

## Cómo generar la build de producción

```bash
npm run build
```

Esto genera una carpeta `dist/` con el HTML, CSS y JS ya compilados y
optimizados — listos para subir a cualquier servicio de hosting estático.

## Desplegar en GitHub Pages

1. Sube este proyecto a un repositorio de GitHub (sin la carpeta `node_modules`,
   ya excluida por `.gitignore`).
2. Corre `npm run build` para generar `dist/`.
3. Sube el contenido de `dist/` a una rama `gh-pages`, o usa GitHub Actions
   para automatizar el build + deploy en cada push. Si quieres, puedo darte
   el archivo de workflow de GitHub Actions para que esto sea automático.

## Estructura del proyecto

```
journey-davivi/
├── index.html              ← punto de entrada que Vite usa
├── vite.config.js          ← configuración de Vite
├── package.json
└── src/
    ├── main.jsx             ← monta la app de React en el DOM
    ├── firebase.js          ← configuración e inicialización de Firestore
    └── JourneyExperienceApp.jsx   ← toda la aplicación (datos, vistas, lógica)
```

## Base de datos (Firestore)

El proyecto de Firebase es `journey-davivi`. La app guarda y lee el `estado`
y las `iniciativas` de cada insight en la colección `insights` de Firestore
— todo lo demás (nombres, descripciones, evidencias de investigación) vive
fijo dentro de `JourneyExperienceApp.jsx`.

### Reglas de seguridad

El archivo `firestore.rules` (en la raíz de este proyecto) contiene las reglas
a pegar en Firebase Console → Firestore Database → pestaña Reglas. Permiten
lectura libre (sin login) y escritura solo si el documento incluye un PIN
fijo, definido como `ACCESS_PIN` en `src/JourneyExperienceApp.jsx`.

Esto existe porque el repositorio es público en GitHub: sin esta validación,
cualquier persona podría copiar el `projectId` del código y escribir
directamente a la base de datos sin pasar por la aplicación. El PIN no es
una contraseña de usuario — nadie lo ingresa en la interfaz, la app lo
envía automáticamente en cada escritura.

**Si necesitas rotar el PIN** (por ejemplo, si sospechas que se filtró):
1. Genera uno nuevo: `python3 -c "import secrets; print(secrets.token_hex(16))"`
2. Reemplázalo en `ACCESS_PIN` dentro de `src/JourneyExperienceApp.jsx`
3. Reemplázalo también en `firestore.rules` y vuelve a publicar las reglas
   en Firebase Console (ambos valores deben coincidir exactamente)
