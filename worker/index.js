/**
 * Cloudflare Worker — sirve la SPA (React/Vite) desde Static Assets y deja
 * preparado un espacio para una API en /api/*.
 *
 * Cómo funciona el enrutamiento:
 *  - Los archivos estáticos (/, /assets/*, /favicon.svg…) los entrega el binding
 *    ASSETS directamente, sin pasar por este Worker.
 *  - Las rutas que no son un archivo (ej. /vehiculos) llegan aquí; las que no
 *    empiezan con /api/ se delegan a ASSETS, que con not_found_handling =
 *    "single-page-application" devuelve index.html (200) para el ruteo de React.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- API (opcional, para crecer hacia sincronización con D1/KV) ---------
    if (url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/health" && request.method === "GET") {
        return Response.json({ ok: true, service: "registro-vehiculos", ts: Date.now() });
      }
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    // --- Frontend (SPA) -----------------------------------------------------
    return env.ASSETS.fetch(request);
  },
};
