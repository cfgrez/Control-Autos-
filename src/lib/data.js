// ---------------------------------------------------------------------------
// Constantes de dominio
// ---------------------------------------------------------------------------

export const STORAGE_KEY = "registro_vehiculos_cl_v2";
export const STORAGE_KEY_LEGACY = "registro_vehiculos_chile_netlify_v1";

export const categoriasGasto = [
  "Bencina",
  "Diésel",
  "Electricidad",
  "TAG",
  "Mantención",
  "Repuestos",
  "Seguro",
  "Permiso de circulación",
  "Revisión técnica",
  "Lavado",
  "Estacionamiento",
  "Otros",
];

// Color por categoría para gráficos y badges.
export const colorCategoria = {
  Bencina: "#f5a524",
  Diésel: "#a16207",
  Electricidad: "#06b6d4",
  TAG: "#8b5cf6",
  Mantención: "#3b82f6",
  Repuestos: "#0ea5e9",
  Seguro: "#ec4899",
  "Permiso de circulación": "#14b8a6",
  "Revisión técnica": "#84cc16",
  Lavado: "#22c55e",
  Estacionamiento: "#f97316",
  Otros: "#94a3b8",
};

// Energéticos: cubren toda la flota. Un híbrido enchufable usa bencina y
// electricidad; un diésel solo diésel; un eléctrico solo electricidad. Al sumar
// las tres, el costo por km funciona para cualquier tipo de motorización.
export const categoriasEnergia = ["Bencina", "Diésel", "Electricidad"];

export const tiposDocumento = [
  "Póliza de seguro",
  "SOAP",
  "Revisión técnica",
  "Permiso de circulación",
  "Factura mantención",
  "Contrato",
  "Otro",
];

export const tiposVehiculo = [
  "Gasolina",
  "Diésel",
  "Híbrido",
  "Eléctrico",
  "Híbrido enchufable",
];

export const vehiculoVacio = {
  id: "",
  patente: "",
  marca: "",
  modelo: "",
  anio: "",
  kilometraje: "",
  tipo: "Gasolina",
  proximaMantencionKm: "",
  proximaMantencionFecha: "",
  revisionTecnica: "",
  permisoCirculacion: "",
  soap: "",
  seguro: "",
  notas: "",
};

export const gastoVacio = {
  id: "",
  vehiculoId: "",
  fecha: new Date().toISOString().slice(0, 10),
  categoria: "Bencina",
  monto: "",
  kilometraje: "",
  proveedor: "",
  notas: "",
};

export const documentoVacio = {
  id: "",
  vehiculoId: "",
  tipo: "Póliza de seguro",
  nombre: "",
  vencimiento: "",
  fileName: "",
  fileData: "",
  notas: "",
};

// Rangos de tiempo del dashboard
export const rangos = [
  { id: "mes", label: "Este mes" },
  { id: "3meses", label: "3 meses" },
  { id: "anio", label: "Este año" },
  { id: "todo", label: "Todo" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function crearId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function dinero(valor) {
  const numero = Number(valor || 0);
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(numero);
}

// Formato compacto para ejes de gráficos: $1,2M / $45k
export function dineroCompacto(valor) {
  const n = Number(valor || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

export function numero(valor) {
  return Number(valor || 0).toLocaleString("es-CL");
}

export function fechaCL(fecha) {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  return `${d}-${m}-${y}`;
}

export function nombreMes(claveMes) {
  // claveMes = "2026-06"
  const [y, m] = claveMes.split("-");
  const fecha = new Date(Number(y), Number(m) - 1, 1);
  return fecha.toLocaleDateString("es-CL", { month: "short", year: "2-digit" });
}

export function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(`${fecha}T00:00:00`);
  return Math.ceil((objetivo - hoy) / 86400000);
}

export function estadoFecha(fecha) {
  const dias = diasHasta(fecha);
  if (dias === null) return { texto: "Sin fecha", tipo: "neutro" };
  if (dias < 0) return { texto: `Vencido hace ${Math.abs(dias)} d`, tipo: "peligro" };
  if (dias <= 30) return { texto: `Vence en ${dias} d`, tipo: "alerta" };
  return { texto: `OK · ${dias} d`, tipo: "ok" };
}

// Valida y normaliza patentes chilenas (formato moderno LLLL·NN y antiguo LL·NNNN).
export function normalizarPatente(patente) {
  return (patente || "").toUpperCase().replace(/[\s.-]/g, "").trim();
}

export function patenteValida(patente) {
  const p = normalizarPatente(patente);
  if (!p) return false;
  const moderna = /^[A-Z]{4}\d{2}$/; // BBBB12
  const antigua = /^[A-Z]{2}\d{4}$/; // AB1234
  return moderna.test(p) || antigua.test(p);
}

// Clave de mes "YYYY-MM" a partir de "YYYY-MM-DD"
export function claveMes(fechaISO) {
  return (fechaISO || "").slice(0, 7);
}

// Devuelve la fecha límite (inclusive desde) según el rango elegido.
export function fechaDesde(rango) {
  const hoy = new Date();
  if (rango === "mes") return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  if (rango === "3meses") return new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
  if (rango === "anio") return new Date(hoy.getFullYear(), 0, 1);
  return null; // "todo"
}

export function leerDatos() {
  const fuente =
    localStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY_LEGACY);
  if (!fuente) return { vehiculos: [], gastos: [], documentos: [] };
  try {
    const data = JSON.parse(fuente);
    return {
      vehiculos: data.vehiculos || [],
      gastos: data.gastos || [],
      documentos: data.documentos || [],
    };
  } catch {
    return { vehiculos: [], gastos: [], documentos: [] };
  }
}
