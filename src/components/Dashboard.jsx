import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { Card, Badge, Vacio } from "./ui.jsx";
import {
  dinero,
  dineroCompacto,
  fechaCL,
  nombreMes,
  claveMes,
  fechaDesde,
  colorCategoria,
  categoriasCombustible,
  rangos,
} from "../lib/data.js";

// Medidor estilo tablero: aguja semicircular que compara el gasto del mes
// actual contra el promedio mensual del periodo. La firma visual de la app.
function Medidor({ valor, referencia, label }) {
  const max = Math.max(valor, referencia, 1) * 1.25;
  const ratio = Math.min(valor / max, 1);
  const angulo = -90 + ratio * 180; // de -90 (izq) a +90 (der)
  const refRatio = Math.min(referencia / max, 1);
  const refAngulo = -90 + refRatio * 180;

  const polar = (ang, r) => {
    const rad = ((ang - 90) * Math.PI) / 180;
    return [100 + r * Math.cos(rad), 100 + r * Math.sin(rad)];
  };
  const [ax, ay] = polar(angulo, 64);
  const [rx1, ry1] = polar(refAngulo, 52);
  const [rx2, ry2] = polar(refAngulo, 78);

  const sobre = valor > referencia && referencia > 0;

  return (
    <div className="medidor">
      <svg viewBox="0 0 200 120" className="medidor-svg">
        <path
          d="M 18 100 A 82 82 0 0 1 182 100"
          fill="none"
          stroke="var(--line)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 18 100 A 82 82 0 0 1 182 100"
          fill="none"
          stroke={sobre ? "var(--danger)" : "var(--accent)"}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${ratio * 257} 999`}
        />
        {referencia > 0 && (
          <line x1={rx1} y1={ry1} x2={rx2} y2={ry2} stroke="var(--muted)" strokeWidth="2.5" />
        )}
        <line x1="100" y1="100" x2={ax} y2={ay} stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="100" r="7" fill="var(--ink)" />
      </svg>
      <div className="medidor-info">
        <strong>{dinero(valor)}</strong>
        <span>{label}</span>
        {referencia > 0 && (
          <small className={sobre ? "txt-danger" : "txt-ok"}>
            {sobre ? "▲" : "▼"} {dinero(Math.abs(valor - referencia))} vs. promedio
          </small>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({
  gastos, // ya filtrados por vehículo
  vehiculos,
  vehiculoSeleccionado,
  alertas,
  rango,
  setRango,
  onDescargarCSV,
  irACategoria,
}) {
  const desde = fechaDesde(rango);

  const gastosRango = useMemo(() => {
    if (!desde) return gastos;
    const limite = desde.toISOString().slice(0, 10);
    return gastos.filter((g) => g.fecha >= limite);
  }, [gastos, desde]);

  const totalPeriodo = gastosRango.reduce((s, g) => s + Number(g.monto || 0), 0);

  // Meses distintos con datos (para promedio mensual realista).
  const mesesConDatos = useMemo(() => {
    const set = new Set(gastosRango.map((g) => claveMes(g.fecha)).filter(Boolean));
    return Math.max(set.size, 1);
  }, [gastosRango]);

  const promedioMensual = totalPeriodo / mesesConDatos;
  const proyeccionAnual = promedioMensual * 12;

  // Gasto del mes calendario actual (para el medidor).
  const totalMesActual = useMemo(() => {
    const mes = new Date().toISOString().slice(0, 7);
    return gastos
      .filter((g) => g.fecha?.startsWith(mes))
      .reduce((s, g) => s + Number(g.monto || 0), 0);
  }, [gastos]);

  // Serie mensual para la tendencia (6 o 12 meses según rango).
  const serieMensual = useMemo(() => {
    const n = rango === "anio" || rango === "todo" ? 12 : 6;
    const meses = [];
    const hoy = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      meses.push(d.toISOString().slice(0, 7));
    }
    const acumulado = Object.fromEntries(meses.map((m) => [m, 0]));
    gastos.forEach((g) => {
      const m = claveMes(g.fecha);
      if (m in acumulado) acumulado[m] += Number(g.monto || 0);
    });
    return meses.map((m) => ({ mes: nombreMes(m), total: acumulado[m] }));
  }, [gastos, rango]);

  // Distribución por categoría en el rango.
  const porCategoria = useMemo(() => {
    const mapa = {};
    gastosRango.forEach((g) => {
      mapa[g.categoria] = (mapa[g.categoria] || 0) + Number(g.monto || 0);
    });
    return Object.entries(mapa)
      .map(([categoria, total]) => ({ categoria, total }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [gastosRango]);

  // Comparación por vehículo (solo cuando se ven todos).
  const porVehiculo = useMemo(() => {
    if (vehiculoSeleccionado) return [];
    const mapa = {};
    gastosRango.forEach((g) => {
      mapa[g.vehiculoId] = (mapa[g.vehiculoId] || 0) + Number(g.monto || 0);
    });
    return Object.entries(mapa)
      .map(([id, total]) => {
        const v = vehiculos.find((x) => x.id === id);
        return { nombre: v ? v.patente : "—", total };
      })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [gastosRango, vehiculos, vehiculoSeleccionado]);

  // Costo por km estimado (combustible / recorrido). Solo tiene sentido para
  // un vehículo concreto: mezclar odómetros de varios autos da un recorrido falso.
  const costoPorKm = useMemo(() => {
    if (!vehiculoSeleccionado) return { motivo: "scope" };
    const lecturas = gastosRango
      .filter((g) => Number(g.kilometraje) > 0)
      .map((g) => Number(g.kilometraje));
    if (lecturas.length < 2) return { motivo: "datos" };
    const recorrido = Math.max(...lecturas) - Math.min(...lecturas);
    if (recorrido <= 0) return { motivo: "datos" };
    const gastoCombustible = gastosRango
      .filter((g) => categoriasCombustible.includes(g.categoria))
      .reduce((s, g) => s + Number(g.monto || 0), 0);
    if (gastoCombustible <= 0) return { motivo: "datos" };
    return { valor: gastoCombustible / recorrido, recorrido };
  }, [gastosRango, vehiculoSeleccionado]);

  const etiquetaRango = rangos.find((r) => r.id === rango)?.label ?? "";
  const alcance = vehiculoSeleccionado
    ? `${vehiculoSeleccionado.patente} · ${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo}`
    : "Todos los vehículos";

  const sinDatos = totalPeriodo === 0;

  return (
    <div className="page">
      <div className="page-title dash-title">
        <div>
          <h2>Dashboard</h2>
          <p>{alcance}</p>
        </div>
        <div className="rango-switch" role="tablist" aria-label="Rango de tiempo">
          {rangos.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={rango === r.id}
              className={rango === r.id ? "active" : ""}
              onClick={() => setRango(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel de instrumentos: medidor + KPIs */}
      <div className="dash-top">
        <Card className="panel-medidor">
          <p className="panel-label">Gasto del mes en curso</p>
          <Medidor valor={totalMesActual} referencia={promedioMensual} label="mes actual" />
        </Card>

        <div className="kpi-grid">
          <Card className="kpi">
            <p>Gasto del periodo</p>
            <strong>{dinero(totalPeriodo)}</strong>
            <small>{etiquetaRango.toLowerCase()}</small>
          </Card>
          <Card className="kpi">
            <p>Promedio mensual</p>
            <strong>{dinero(promedioMensual)}</strong>
            <small>{mesesConDatos} {mesesConDatos === 1 ? "mes" : "meses"} con datos</small>
          </Card>
          <Card className="kpi accent">
            <p>Costo por km</p>
            <strong>{costoPorKm.valor ? `${dinero(costoPorKm.valor)}/km` : "—"}</strong>
            <small>
              {costoPorKm.valor
                ? `combustible · ${costoPorKm.recorrido.toLocaleString("es-CL")} km`
                : costoPorKm.motivo === "scope"
                ? "elige un vehículo"
                : "registra el km en los gastos"}
            </small>
          </Card>
          <Card className="kpi">
            <p>Proyección anual</p>
            <strong>{dinero(proyeccionAnual)}</strong>
            <small>al ritmo actual</small>
          </Card>
        </div>
      </div>

      {sinDatos ? (
        <Card>
          <Vacio titulo="Sin gastos en este periodo">
            Registra tu primer gasto o cambia el rango de tiempo para ver el análisis.
          </Vacio>
        </Card>
      ) : (
        <>
          {/* Tendencia mensual */}
          <Card>
            <div className="card-head">
              <h3>Tendencia mensual</h3>
              <button className="btn btn-small" onClick={onDescargarCSV}>
                Descargar CSV
              </button>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={serieMensual} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={dineroCompacto}
                    tick={{ fontSize: 12, fill: "var(--muted)" }}
                    tickLine={false}
                    axisLine={false}
                    width={54}
                  />
                  <Tooltip
                    formatter={(v) => [dinero(v), "Gasto"]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--line)",
                      fontSize: 13,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    fill="url(#gTotal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="two-col">
            {/* Distribución por categoría */}
            <Card>
              <h3>Distribución por categoría</h3>
              <div className="cat-layout">
                <div className="donut">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={porCategoria}
                        dataKey="total"
                        nameKey="categoria"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {porCategoria.map((d) => (
                          <Cell key={d.categoria} fill={colorCategoria[d.categoria] || "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, n) => [dinero(v), n]}
                        contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", fontSize: 13 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center">
                    <small>Total</small>
                    <strong>{dineroCompacto(totalPeriodo)}</strong>
                  </div>
                </div>
                <ul className="leyenda">
                  {porCategoria.map((d) => {
                    const pct = totalPeriodo ? Math.round((d.total / totalPeriodo) * 100) : 0;
                    return (
                      <li key={d.categoria}>
                        <button onClick={() => irACategoria?.(d.categoria)}>
                          <span className="dot" style={{ background: colorCategoria[d.categoria] || "#94a3b8" }} />
                          <span className="leyenda-cat">{d.categoria}</span>
                          <span className="leyenda-val">{dinero(d.total)} · {pct}%</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>

            {/* Comparación por vehículo o próximos vencimientos */}
            {!vehiculoSeleccionado && porVehiculo.length > 1 ? (
              <Card>
                <h3>Gasto por vehículo</h3>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={Math.max(160, porVehiculo.length * 46)}>
                    <BarChart
                      data={porVehiculo}
                      layout="vertical"
                      margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                    >
                      <XAxis type="number" tickFormatter={dineroCompacto} tick={{ fontSize: 12, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="nombre" tick={{ fontSize: 12, fill: "var(--text)" }} tickLine={false} axisLine={false} width={70} />
                      <Tooltip
                        formatter={(v) => [dinero(v), "Gasto"]}
                        cursor={{ fill: "var(--bg)" }}
                        contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", fontSize: 13 }}
                      />
                      <Bar dataKey="total" fill="var(--accent)" radius={[0, 6, 6, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ) : (
              <Card>
                <h3>Próximos vencimientos</h3>
                {alertas.slice(0, 6).length === 0 ? (
                  <Vacio titulo="Todo al día">
                    No hay vencimientos próximos. Completa las fechas de cada vehículo para activar recordatorios.
                  </Vacio>
                ) : (
                  <div className="list">
                    {alertas.slice(0, 6).map((a) => (
                      <div className="list-row" key={a.id}>
                        <div>
                          <strong>{a.titulo}</strong>
                          <p>
                            {a.vehiculo.patente} · {a.vehiculo.marca} {a.vehiculo.modelo}
                            {a.fecha && ` · ${fechaCL(a.fecha)}`}
                          </p>
                        </div>
                        <Badge tipo={a.estado.tipo}>{a.estado.texto}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
