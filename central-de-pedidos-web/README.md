# Central de Pedidos — sitio web

Esta carpeta es un proyecto de Next.js listo para desplegar en Vercel. Hace exactamente lo mismo que veníamos armando a mano en el chat, pero como sitio web:

- **`/`** — el dashboard (igual al que ya conocés: General + 8 locales + Histórico, todo editable)
- **`/generar`** — subís los 8 Excel de Waitry + elegís mes/año, y genera y guarda el reporte
- **`/login`** — pantalla de contraseña para entrar

Los datos se guardan en **Vercel Blob Storage** (un único archivo que va acumulando todos los meses, igual que hoy).

---

## Paso 1 — Subir el proyecto a GitHub (sin usar la terminal)

1. Entrá a [github.com](https://github.com) e iniciá sesión (o creá una cuenta gratis si no tenés).
2. Arriba a la derecha, tocá el **+** → **New repository**.
3. Ponele un nombre, por ejemplo `central-de-pedidos`. Dejalo **Private**. Creá el repositorio (no hace falta tildar ningún checkbox extra).
4. Adentro del repo vacío, vas a ver un link que dice **"uploading an existing file"** — tocalo.
5. Arrastrá **todo el contenido de esta carpeta** (todos los archivos y subcarpetas: `app`, `lib`, `content`, `public`, `package.json`, etc.) a la zona de carga.
   - **Importante:** no hace falta subir `node_modules` ni `.next` — esta carpeta ya viene sin esos (se generan solos en Vercel).
6. Abajo, escribí un mensaje como "Primera versión" y tocá **Commit changes**.

## Paso 2 — Conectar con Vercel

1. Entrá a [vercel.com](https://vercel.com) e iniciá sesión con la misma cuenta de GitHub.
2. Tocá **Add New...** → **Project**.
3. Elegí el repositorio `central-de-pedidos` que acabás de crear → **Import**.
4. Dejá la configuración por defecto (Vercel detecta que es Next.js solo) y por ahora **no** toques "Deploy" todavía — primero seguimos con el paso 3.

## Paso 3 — Crear el almacenamiento (Blob)

1. Dentro del proyecto en Vercel, andá a la pestaña **Storage**.
2. Tocá **Create Database** → elegí **Blob** → seguí los pasos para crearlo y conectarlo a este proyecto.
3. Esto agrega automáticamente la variable `BLOB_READ_WRITE_TOKEN` — no hay que hacer nada más ahí.

## Paso 4 — Configurar la contraseña del sitio

1. Andá a **Settings** → **Environment Variables**.
2. Agregá una variable:
   - Name: `SITE_PASSWORD`
   - Value: la contraseña que quieras usar para entrar al sitio
3. Guardala (para todos los entornos: Production, Preview, Development).

## Paso 5 — Deploy

1. Andá a la pestaña **Deployments** y tocá **Redeploy** (o si es la primera vez, tocá **Deploy**).
2. Cuando termine (1-2 minutos), Vercel te da una URL tipo `central-de-pedidos.vercel.app`.
3. Entrá, te va a pedir la contraseña que configuraste, y después vas a ver la pantalla de "Todavía no cargaste ningún mes" — tocá **Cargar el primer mes** y subí los 8 Excel de cualquier mes que ya tengas para probar.

---

## Cómo actualizar el sitio más adelante

Cualquier cambio que quieras (un ajuste que yo te arme en el chat, por ejemplo) se sube reemplazando los archivos en GitHub del mismo modo que el Paso 1 ("Add file" → "Upload files" sobre los archivos que cambiaron) — Vercel vuelve a desplegar solo apenas detecta el cambio.

## Notas importantes

- **La contraseña es simple a propósito** (una sola clave compartida, no un sistema de usuarios). Alcanza para uso interno del equipo, pero no es seguridad de nivel bancario — no subas ahí información ultra sensible sin tenerlo en cuenta.
- **Todos los meses viven en un solo archivo** dentro de Blob Storage — por eso el dashboard sigue funcionando exactamente igual (comparación vs. mes anterior, histórico, etc.), simplemente ahora vive en la nube en vez de en tu compu.
- Si subís un mes que ya existía (mismo mes/año), **lo reemplaza** — no se duplica.
- El botón "☁ Guardar cambios en el sitio" dentro del dashboard es el que persiste tus ediciones manuales al servidor. El botón "⬇ Descargar copia (.html)" sigue estando para tener un respaldo local si querés.
