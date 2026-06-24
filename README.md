# Garaje — Registro de vehículos

Aplicación web (React + Vite) para llevar el control de tus vehículos: gastos,
documentos, kilometraje y vencimientos. Pensada para Chile (CLP, patentes, SOAP,
revisión técnica, permiso de circulación, TAG) y lista para desplegar en
**Cloudflare Pages**.

Los datos se guardan en el navegador con `localStorage`: funciona sin conexión y
sin servidor. Puedes exportar/importar un respaldo en JSON cuando quieras.

## Qué incluye

- **Dashboard** con rango de tiempo (mes / 3 meses / año / todo):
  - Medidor del gasto del mes en curso vs. tu promedio mensual.
  - KPIs: gasto del periodo, promedio mensual, costo por km y proyección anual.
  - Tendencia mensual (gráfico de área), distribución por categoría (dona) y
    comparación de gasto por vehículo.
- **Vehículos**: patente (con validación de formato chileno), marca, modelo, año,
  kilometraje, tipo (incluye eléctrico e híbrido) y fechas clave.
- **Gastos**: bencina, electricidad, TAG, mantención, seguro, permisos y más, con
  filtro por categoría y exportación a CSV.
- **Documentos**: pólizas, SOAP, revisión técnica, permisos y facturas (hasta 3 MB).
- **Alertas** automáticas de vencimientos y mantenciones próximas o vencidas.
- Respaldo **exportar / importar** en JSON.

## Correr en local

Requiere Node 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
npm run preview  # sirve dist/ localmente
```

## Desplegar en Cloudflare Pages

### Opción A — Conectar el repositorio de GitHub (recomendada)

1. Sube este proyecto a un repositorio de GitHub.
2. En el panel de Cloudflare ve a **Workers & Pages → Create → Pages → Connect to Git**.
3. Selecciona el repositorio y usa esta configuración de build:
   - **Framework preset:** `Vite` (o `None`).
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Variable de entorno** (opcional, si el build falla por la versión de Node):
     `NODE_VERSION = 20`
4. **Save and Deploy.** Cada push a la rama principal vuelve a desplegar solo.

El archivo `public/_redirects` ya incluye el fallback de SPA
(`/* /index.html 200`) para que las rutas funcionen, y `public/_headers` agrega
cache de assets y cabeceras de seguridad.

### Opción B — Desde la línea de comandos con Wrangler

```bash
npm install
npm run build
npx wrangler pages deploy dist --project-name=registro-vehiculos
```

La primera vez Wrangler te pedirá iniciar sesión en Cloudflare y crear el
proyecto. También puedes usar el atajo `npm run deploy`.

## Migración desde la versión de Netlify

La app lee automáticamente los datos guardados por la versión anterior
(clave `registro_vehiculos_chile_netlify_v1`) y los migra a la nueva clave
`registro_vehiculos_cl_v2`. No pierdes información al actualizar **en el mismo
dominio/navegador**. Si cambias de dominio, exporta el respaldo JSON desde la
versión vieja e impórtalo en la nueva.

## Siguiente paso: sincronizar entre dispositivos (opcional)

Hoy cada navegador guarda sus propios datos. Para compartirlos entre el celular
y el computador puedes agregar una **Cloudflare Pages Function** con base de
datos **D1** (SQL) o **KV** (clave-valor):

1. Crea una carpeta `functions/api/` con endpoints (p. ej. `data.js`) que lean y
   escriban en D1/KV.
2. Declara el binding en `wrangler.toml` (`[[d1_databases]]` o `[[kv_namespaces]]`).
3. Reemplaza las llamadas a `localStorage` en `src/App.jsx` por `fetch` a
   `/api/data`.

Mientras tanto, el respaldo JSON cumple esa función de forma manual.

## Estructura

```
public/
  _redirects        # fallback SPA para Cloudflare Pages
  _headers          # cache + cabeceras de seguridad
  favicon.svg
src/
  lib/data.js       # constantes, formato CLP, fechas, validaciones
  components/
    ui.jsx          # primitivos de UI (Card, Badge, Campo…)
    Dashboard.jsx   # dashboard con gráficos (recharts)
  App.jsx           # estado y vistas
  index.css         # sistema de diseño
wrangler.toml       # configuración de Cloudflare Pages
```
