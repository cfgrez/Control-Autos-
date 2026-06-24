# Garaje — Registro de vehículos

Aplicación web (React + Vite) para llevar el control de tus vehículos: gastos,
documentos, kilometraje y vencimientos. Pensada para Chile (CLP, patentes, SOAP,
revisión técnica, permiso de circulación, TAG) y lista para desplegar en
**Cloudflare Workers**.

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

## Desplegar en Cloudflare Workers

Esta versión corre como **Worker** usando *Static Assets*: la SPA compilada se
sirve desde `./dist` mediante el binding `ASSETS`, y el archivo `worker/index.js`
maneja el ruteo. El fallback de SPA (`not_found_handling = "single-page-application"`
en `wrangler.toml`) hace que rutas como `/vehiculos` devuelvan `index.html`.

> **Importante:** crea el proyecto como **Worker**, no como Pages. El error que
> tuviste antes (`you've run a Workers-specific command in a Pages project`)
> ocurría porque el proyecto estaba creado como Pages pero se ejecutaba
> `wrangler deploy`. Ahora ese comando es el correcto.

### Opción A — Desde la consola (rápida)

No necesitas instalar Wrangler; `npx` baja la última versión.

```bash
npm install
npm run deploy        # hace build y luego: npx wrangler@latest deploy
```

La primera vez te pedirá iniciar sesión en Cloudflare y crear el Worker.

### Opción B — Conectar el repositorio de GitHub (Workers Builds)

1. Sube el proyecto a un repositorio de GitHub.
2. En Cloudflare ve a **Workers & Pages → Create → Workers → Import a repository**
   (o **Connect to Git**).
3. Configuración de build:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy` *(es el valor por defecto)*
   - **Variable de entorno** (opcional, si falla por Node): `NODE_VERSION = 20`
4. **Save and Deploy.** Cada push a la rama principal vuelve a desplegar solo.

### Probar el Worker en local

```bash
npm run cf-dev       # build + wrangler dev en http://localhost:8787
```

Sirve la app igual que en producción, incluido el endpoint de ejemplo
`GET /api/health`. Para el desarrollo del frontend con recarga en caliente sigue
usando `npm run dev` (Vite, en http://localhost:5173).

## Migración desde la versión de Netlify

La app lee automáticamente los datos guardados por la versión anterior
(clave `registro_vehiculos_chile_netlify_v1`) y los migra a la nueva clave
`registro_vehiculos_cl_v2`. No pierdes información al actualizar **en el mismo
dominio/navegador**. Si cambias de dominio, exporta el respaldo JSON desde la
versión vieja e impórtalo en la nueva.

## Siguiente paso: sincronizar entre dispositivos (opcional)

Hoy cada navegador guarda sus propios datos con `localStorage`. Como ya corres
sobre un Worker, agregar sincronización es directo:

1. En `worker/index.js` ya hay un router para `/api/*` (con un `/api/health` de
   ejemplo). Agrega ahí endpoints para leer y escribir datos.
2. Crea una base **D1** y declara el binding en `wrangler.toml` (la sección
   `[[d1_databases]]` está comentada y lista para usar):
   ```bash
   npx wrangler d1 create registro-vehiculos
   ```
3. En `src/App.jsx`, reemplaza las llamadas a `localStorage` por `fetch` a
   `/api/...`.

Mientras tanto, el respaldo JSON cumple esa función de forma manual.

## Estructura

```
worker/
  index.js          # Worker: sirve la SPA (ASSETS) y deja lista una API /api/*
wrangler.toml       # configuración del Worker + Static Assets (fallback SPA)
public/
  _headers          # cache de assets + cabeceras de seguridad
  favicon.svg
src/
  lib/data.js       # constantes, formato CLP, fechas, validaciones
  components/
    ui.jsx          # primitivos de UI (Card, Badge, Campo…)
    Dashboard.jsx   # dashboard con gráficos (recharts)
  App.jsx           # estado y vistas
  index.css         # sistema de diseño
```

## Notas sobre el costo por km

El indicador suma los energéticos del periodo (**bencina + diésel + electricidad**)
y los divide por el recorrido tomado de los kilometrajes registrados en los gastos.
Así funciona para cualquier motorización: un híbrido enchufable promedia bencina y
electricidad, un diésel usa solo diésel, y un 100% eléctrico solo electricidad. Para
que el cálculo sea fiable, registra el **kilometraje** al cargar bencina/diésel o al
cargar energía, y selecciona un vehículo (no aplica a "Todos", porque mezclaría
odómetros distintos).
