import React, { useEffect, useMemo, useState } from "react";
import { Badge, Campo, Card, Vacio } from "./components/ui.jsx";
import Dashboard from "./components/Dashboard.jsx";
import {
  STORAGE_KEY,
  categoriasGasto,
  tiposDocumento,
  tiposVehiculo,
  vehiculoVacio,
  gastoVacio,
  documentoVacio,
  crearId,
  dinero,
  numero,
  fechaCL,
  estadoFecha,
  diasHasta,
  normalizarPatente,
  patenteValida,
  leerDatos,
} from "./lib/data.js";

export default function App() {
  const [vehiculos, setVehiculos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [tab, setTab] = useState("resumen");
  const [vehiculoFiltro, setVehiculoFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [rango, setRango] = useState("mes");
  const [gastoCategoriaFiltro, setGastoCategoriaFiltro] = useState("todas");

  const [vehiculoForm, setVehiculoForm] = useState(vehiculoVacio);
  const [gastoForm, setGastoForm] = useState(gastoVacio);
  const [documentoForm, setDocumentoForm] = useState(documentoVacio);
  const [editandoVehiculoId, setEditandoVehiculoId] = useState(null);

  // Carga inicial (con migración del formato antiguo).
  useEffect(() => {
    const data = leerDatos();
    setVehiculos(data.vehiculos);
    setGastos(data.gastos);
    setDocumentos(data.documentos);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ vehiculos, gastos, documentos })
    );
  }, [vehiculos, gastos, documentos]);

  const vehiculoSeleccionado =
    vehiculoFiltro === "todos" ? null : vehiculos.find((v) => v.id === vehiculoFiltro);

  const vehiculosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return vehiculos;
    return vehiculos.filter((v) =>
      `${v.patente} ${v.marca} ${v.modelo} ${v.anio}`.toLowerCase().includes(q)
    );
  }, [vehiculos, busqueda]);

  const gastosFiltrados = useMemo(
    () =>
      gastos.filter((g) => vehiculoFiltro === "todos" || g.vehiculoId === vehiculoFiltro),
    [gastos, vehiculoFiltro]
  );

  const gastosTabla = useMemo(
    () =>
      gastosFiltrados.filter(
        (g) => gastoCategoriaFiltro === "todas" || g.categoria === gastoCategoriaFiltro
      ),
    [gastosFiltrados, gastoCategoriaFiltro]
  );

  const documentosFiltrados = useMemo(
    () =>
      documentos.filter(
        (d) => vehiculoFiltro === "todos" || d.vehiculoId === vehiculoFiltro
      ),
    [documentos, vehiculoFiltro]
  );

  const alertas = useMemo(() => {
    const resultado = [];
    vehiculos.forEach((v) => {
      const fechas = [
        ["Mantención por fecha", v.proximaMantencionFecha],
        ["Revisión técnica", v.revisionTecnica],
        ["Permiso de circulación", v.permisoCirculacion],
        ["SOAP", v.soap],
        ["Seguro", v.seguro],
      ];
      fechas.forEach(([titulo, fecha]) => {
        const estado = estadoFecha(fecha);
        if (estado.tipo === "peligro" || estado.tipo === "alerta") {
          resultado.push({ id: `${v.id}-${titulo}`, vehiculo: v, titulo, fecha, estado });
        }
      });
      const kmActual = Number(v.kilometraje || 0);
      const kmProxima = Number(v.proximaMantencionKm || 0);
      if (kmActual && kmProxima && kmProxima - kmActual <= 1000) {
        const diferencia = kmProxima - kmActual;
        resultado.push({
          id: `${v.id}-mantencion-km`,
          vehiculo: v,
          titulo: "Mantención por kilometraje",
          fecha: "",
          estado:
            diferencia < 0
              ? { texto: `Pasada por ${numero(Math.abs(diferencia))} km`, tipo: "peligro" }
              : { texto: `Faltan ${numero(diferencia)} km`, tipo: "alerta" },
        });
      }
    });
    documentos.forEach((d) => {
      const v = vehiculos.find((x) => x.id === d.vehiculoId);
      if (!v) return;
      const estado = estadoFecha(d.vencimiento);
      if (estado.tipo === "peligro" || estado.tipo === "alerta") {
        resultado.push({ id: d.id, vehiculo: v, titulo: d.tipo, fecha: d.vencimiento, estado });
      }
    });
    return resultado.sort(
      (a, b) => (diasHasta(a.fecha) ?? 9999) - (diasHasta(b.fecha) ?? 9999)
    );
  }, [vehiculos, documentos]);

  const patenteOk = !vehiculoForm.patente || patenteValida(vehiculoForm.patente);

  function limpiarFormularios() {
    setVehiculoForm(vehiculoVacio);
    setGastoForm({
      ...gastoVacio,
      vehiculoId: vehiculoFiltro === "todos" ? "" : vehiculoFiltro,
      fecha: new Date().toISOString().slice(0, 10),
    });
    setDocumentoForm({
      ...documentoVacio,
      vehiculoId: vehiculoFiltro === "todos" ? "" : vehiculoFiltro,
    });
    setEditandoVehiculoId(null);
  }

  function guardarVehiculo(e) {
    e.preventDefault();
    if (!vehiculoForm.patente.trim()) return;
    const data = { ...vehiculoForm, patente: normalizarPatente(vehiculoForm.patente) };
    if (editandoVehiculoId) {
      setVehiculos((prev) =>
        prev.map((v) => (v.id === editandoVehiculoId ? { ...data, id: editandoVehiculoId } : v))
      );
    } else {
      const nuevo = { ...data, id: crearId() };
      setVehiculos((prev) => [...prev, nuevo]);
      setVehiculoFiltro(nuevo.id);
    }
    limpiarFormularios();
  }

  function editarVehiculo(v) {
    setVehiculoForm(v);
    setEditandoVehiculoId(v.id);
    setTab("vehiculos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function eliminarVehiculo(id) {
    if (!confirm("¿Eliminar este vehículo y todos sus gastos y documentos asociados?")) return;
    setVehiculos((prev) => prev.filter((v) => v.id !== id));
    setGastos((prev) => prev.filter((g) => g.vehiculoId !== id));
    setDocumentos((prev) => prev.filter((d) => d.vehiculoId !== id));
    if (vehiculoFiltro === id) setVehiculoFiltro("todos");
  }

  function guardarGasto(e) {
    e.preventDefault();
    if (!gastoForm.vehiculoId || !gastoForm.monto) return;
    setGastos((prev) => [{ ...gastoForm, id: crearId() }, ...prev]);
    setGastoForm({
      ...gastoVacio,
      vehiculoId: gastoForm.vehiculoId,
      categoria: gastoForm.categoria,
      fecha: new Date().toISOString().slice(0, 10),
    });
  }

  function eliminarGasto(id) {
    setGastos((prev) => prev.filter((g) => g.id !== id));
  }

  function archivoADataUrl(file) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("El archivo supera 3 MB. Usa una versión más liviana (los datos se guardan en el navegador).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setDocumentoForm((prev) => ({ ...prev, fileName: file.name, fileData: reader.result }));
    reader.readAsDataURL(file);
  }

  function guardarDocumento(e) {
    e.preventDefault();
    if (!documentoForm.vehiculoId || !documentoForm.tipo) return;
    setDocumentos((prev) => [
      {
        ...documentoForm,
        id: crearId(),
        nombre: documentoForm.nombre || documentoForm.fileName || documentoForm.tipo,
      },
      ...prev,
    ]);
    setDocumentoForm({ ...documentoVacio, vehiculoId: documentoForm.vehiculoId });
  }

  function eliminarDocumento(id) {
    setDocumentos((prev) => prev.filter((d) => d.id !== id));
  }

  function exportarDatos() {
    const blob = new Blob([JSON.stringify({ vehiculos, gastos, documentos }, null, 2)], {
      type: "application/json",
    });
    descargar(blob, `registro-vehiculos-${new Date().toISOString().slice(0, 10)}.json`);
  }

  function importarDatos(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        setVehiculos(data.vehiculos || []);
        setGastos(data.gastos || []);
        setDocumentos(data.documentos || []);
        setVehiculoFiltro("todos");
      } catch {
        alert("No se pudo importar. El archivo debe ser un respaldo JSON de esta aplicación.");
      }
    };
    reader.readAsText(file);
  }

  function descargarCSV() {
    const filas = [
      ["fecha", "patente", "marca", "modelo", "categoria", "monto", "kilometraje", "proveedor", "notas"],
      ...gastosFiltrados.map((g) => {
        const v = vehiculos.find((x) => x.id === g.vehiculoId) || {};
        return [g.fecha, v.patente || "", v.marca || "", v.modelo || "", g.categoria, g.monto, g.kilometraje, g.proveedor, g.notas];
      }),
    ];
    const csv = filas
      .map((fila) => fila.map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    descargar(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), `gastos-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  function irACategoria(categoria) {
    setGastoCategoriaFiltro(categoria);
    setTab("gastos");
  }

  const tabs = [
    ["resumen", "Dashboard"],
    ["vehiculos", "Vehículos"],
    ["gastos", "Gastos"],
    ["documentos", "Documentos"],
    ["alertas", "Alertas"],
  ];

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-brand">
          <span className="logo" aria-hidden="true">
            <svg viewBox="0 0 64 64" width="40" height="40">
              <path d="M14 44 A18 18 0 0 1 50 44" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="5" strokeLinecap="round" />
              <path d="M14 44 A18 18 0 0 1 25 28" fill="none" stroke="#f5a524" strokeWidth="5" strokeLinecap="round" />
              <line x1="32" y1="44" x2="42" y2="32" stroke="#f5a524" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="32" cy="44" r="3.5" fill="#f5a524" />
            </svg>
          </span>
          <div>
            <p className="eyebrow">Garaje</p>
            <h1>Tus autos, gastos y vencimientos en un tablero</h1>
            <p className="hero-text">
              Patentes, kilometraje, mantenciones, pólizas, revisión técnica, SOAP, TAG,
              bencina y carga eléctrica. Todo guardado en tu navegador.
            </p>
          </div>
        </div>
        <div className="hero-actions">
          <button className="btn btn-light" onClick={exportarDatos}>Exportar respaldo</button>
          <label className="btn btn-light file-label">
            Importar respaldo
            <input type="file" accept="application/json" onChange={(e) => importarDatos(e.target.files?.[0])} />
          </label>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <Card>
            <Campo label="Buscar">
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Patente, marca o modelo" />
            </Campo>
            <Campo label="Vehículo">
              <select value={vehiculoFiltro} onChange={(e) => setVehiculoFiltro(e.target.value)}>
                <option value="todos">Todos los vehículos</option>
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>{v.patente} · {v.marca} {v.modelo}</option>
                ))}
              </select>
            </Campo>
            <nav className="tabs">
              {tabs.map(([id, label]) => (
                <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
                  {label}
                  {id === "alertas" && alertas.length > 0 && <span>{alertas.length}</span>}
                </button>
              ))}
            </nav>
          </Card>

          <Card className={`mini-alert ${alertas.length ? "warn" : "ok"}`}>
            <p>Alertas activas</p>
            <strong>{alertas.length}</strong>
            <small>{alertas.length ? "Vencimientos o mantenciones próximas." : "Sin pendientes por ahora."}</small>
          </Card>
        </aside>

        <main>
          {tab === "resumen" && (
            <Dashboard
              gastos={gastosFiltrados}
              vehiculos={vehiculos}
              vehiculoSeleccionado={vehiculoSeleccionado}
              alertas={alertas}
              rango={rango}
              setRango={setRango}
              onDescargarCSV={descargarCSV}
              irACategoria={irACategoria}
            />
          )}

          {tab === "vehiculos" && (
            <div className="page">
              <div className="page-title">
                <h2>Vehículos</h2>
                <p>Registra patentes, kilometraje y fechas clave.</p>
              </div>

              <Card>
                <form className="form-grid" onSubmit={guardarVehiculo}>
                  <Campo label="Patente" hint={!patenteOk ? "Formato esperado: ABCD12 o AB1234" : undefined}>
                    <input
                      required
                      className={!patenteOk ? "input-error" : ""}
                      value={vehiculoForm.patente}
                      onChange={(e) => setVehiculoForm({ ...vehiculoForm, patente: e.target.value })}
                      placeholder="Ej: BBCJ12"
                    />
                  </Campo>
                  <Campo label="Marca"><input value={vehiculoForm.marca} onChange={(e) => setVehiculoForm({ ...vehiculoForm, marca: e.target.value })} placeholder="BYD" /></Campo>
                  <Campo label="Modelo"><input value={vehiculoForm.modelo} onChange={(e) => setVehiculoForm({ ...vehiculoForm, modelo: e.target.value })} placeholder="Song Pro" /></Campo>
                  <Campo label="Año"><input type="number" value={vehiculoForm.anio} onChange={(e) => setVehiculoForm({ ...vehiculoForm, anio: e.target.value })} placeholder="2026" /></Campo>
                  <Campo label="Kilometraje actual"><input type="number" value={vehiculoForm.kilometraje} onChange={(e) => setVehiculoForm({ ...vehiculoForm, kilometraje: e.target.value })} /></Campo>
                  <Campo label="Tipo">
                    <select value={vehiculoForm.tipo} onChange={(e) => setVehiculoForm({ ...vehiculoForm, tipo: e.target.value })}>
                      {tiposVehiculo.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Próxima mantención (km)"><input type="number" value={vehiculoForm.proximaMantencionKm} onChange={(e) => setVehiculoForm({ ...vehiculoForm, proximaMantencionKm: e.target.value })} /></Campo>
                  <Campo label="Próxima mantención (fecha)"><input type="date" value={vehiculoForm.proximaMantencionFecha} onChange={(e) => setVehiculoForm({ ...vehiculoForm, proximaMantencionFecha: e.target.value })} /></Campo>
                  <Campo label="Revisión técnica"><input type="date" value={vehiculoForm.revisionTecnica} onChange={(e) => setVehiculoForm({ ...vehiculoForm, revisionTecnica: e.target.value })} /></Campo>
                  <Campo label="Permiso de circulación"><input type="date" value={vehiculoForm.permisoCirculacion} onChange={(e) => setVehiculoForm({ ...vehiculoForm, permisoCirculacion: e.target.value })} /></Campo>
                  <Campo label="SOAP"><input type="date" value={vehiculoForm.soap} onChange={(e) => setVehiculoForm({ ...vehiculoForm, soap: e.target.value })} /></Campo>
                  <Campo label="Seguro"><input type="date" value={vehiculoForm.seguro} onChange={(e) => setVehiculoForm({ ...vehiculoForm, seguro: e.target.value })} /></Campo>
                  <Campo label="Notas"><textarea value={vehiculoForm.notas} onChange={(e) => setVehiculoForm({ ...vehiculoForm, notas: e.target.value })} placeholder="Concesionario, garantía, datos del seguro, etc." /></Campo>
                  <div className="form-actions">
                    <button className="btn btn-primary" type="submit">{editandoVehiculoId ? "Guardar cambios" : "Agregar vehículo"}</button>
                    {editandoVehiculoId && <button type="button" className="btn" onClick={limpiarFormularios}>Cancelar</button>}
                  </div>
                </form>
              </Card>

              {vehiculosFiltrados.length === 0 ? (
                <Card><Vacio titulo="Aún no hay vehículos">Agrega tu primer auto con el formulario de arriba.</Vacio></Card>
              ) : (
                <div className="cards-grid">
                  {vehiculosFiltrados.map((v) => {
                    const revision = estadoFecha(v.revisionTecnica);
                    const seguro = estadoFecha(v.seguro);
                    const faltanKm = Number(v.proximaMantencionKm || 0) - Number(v.kilometraje || 0);
                    return (
                      <Card key={v.id}>
                        <div className="vehicle-head">
                          <div>
                            <h3>{v.patente}</h3>
                            <p>{v.marca} {v.modelo} {v.anio}</p>
                          </div>
                          <div className="row-actions">
                            <button className="btn btn-small" onClick={() => editarVehiculo(v)}>Editar</button>
                            <button className="btn btn-danger btn-small" onClick={() => eliminarVehiculo(v.id)}>Eliminar</button>
                          </div>
                        </div>
                        <div className="detail-grid">
                          <div><span>Kilometraje</span><strong>{numero(v.kilometraje)} km</strong></div>
                          <div><span>Tipo</span><strong>{v.tipo}</strong></div>
                          <div><span>Próx. mantención</span><strong>{v.proximaMantencionKm ? `${numero(v.proximaMantencionKm)} km` : "—"}</strong></div>
                          <div><span>Faltan</span><strong>{v.proximaMantencionKm && v.kilometraje ? `${numero(faltanKm)} km` : "—"}</strong></div>
                          <div><span>Revisión técnica</span><Badge tipo={revision.tipo}>{revision.texto}</Badge></div>
                          <div><span>Seguro</span><Badge tipo={seguro.tipo}>{seguro.texto}</Badge></div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "gastos" && (
            <div className="page">
              <div className="page-title">
                <h2>Gastos</h2>
                <p>Registra TAG, bencina, carga eléctrica, mantenciones y otros costos.</p>
              </div>

              <Card>
                <form className="form-grid" onSubmit={guardarGasto}>
                  <Campo label="Vehículo">
                    <select required value={gastoForm.vehiculoId} onChange={(e) => setGastoForm({ ...gastoForm, vehiculoId: e.target.value })}>
                      <option value="">Seleccionar</option>
                      {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.patente} · {v.marca} {v.modelo}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Fecha"><input type="date" value={gastoForm.fecha} onChange={(e) => setGastoForm({ ...gastoForm, fecha: e.target.value })} /></Campo>
                  <Campo label="Categoría">
                    <select value={gastoForm.categoria} onChange={(e) => setGastoForm({ ...gastoForm, categoria: e.target.value })}>
                      {categoriasGasto.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Monto CLP"><input required type="number" value={gastoForm.monto} onChange={(e) => setGastoForm({ ...gastoForm, monto: e.target.value })} placeholder="45000" /></Campo>
                  <Campo label="Kilometraje" hint="Mejora el costo por km"><input type="number" value={gastoForm.kilometraje} onChange={(e) => setGastoForm({ ...gastoForm, kilometraje: e.target.value })} /></Campo>
                  <Campo label="Proveedor"><input value={gastoForm.proveedor} onChange={(e) => setGastoForm({ ...gastoForm, proveedor: e.target.value })} placeholder="Copec, Enel X, autopista…" /></Campo>
                  <Campo label="Notas"><input value={gastoForm.notas} onChange={(e) => setGastoForm({ ...gastoForm, notas: e.target.value })} /></Campo>
                  <div className="form-actions"><button className="btn btn-primary" type="submit">Agregar gasto</button></div>
                </form>
              </Card>

              <Card>
                <div className="card-head">
                  <h3>Historial de gastos</h3>
                  <div className="card-head-actions">
                    <select className="filtro-categoria" value={gastoCategoriaFiltro} onChange={(e) => setGastoCategoriaFiltro(e.target.value)}>
                      <option value="todas">Todas las categorías</option>
                      {categoriasGasto.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <button className="btn btn-small" onClick={descargarCSV}>Descargar CSV</button>
                  </div>
                </div>
                {gastosTabla.length === 0 ? (
                  <Vacio titulo="Sin gastos para mostrar">Agrega un gasto o cambia el filtro de categoría.</Vacio>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Fecha</th><th>Vehículo</th><th>Categoría</th><th>Monto</th><th>Km</th><th>Proveedor</th><th>Notas</th><th></th></tr>
                      </thead>
                      <tbody>
                        {gastosTabla.map((g) => {
                          const v = vehiculos.find((x) => x.id === g.vehiculoId);
                          return (
                            <tr key={g.id}>
                              <td>{fechaCL(g.fecha)}</td>
                              <td>{v ? v.patente : "—"}</td>
                              <td><Badge>{g.categoria}</Badge></td>
                              <td><strong>{dinero(g.monto)}</strong></td>
                              <td>{g.kilometraje ? `${numero(g.kilometraje)} km` : "—"}</td>
                              <td>{g.proveedor || "—"}</td>
                              <td>{g.notas || "—"}</td>
                              <td><button className="btn btn-small btn-danger" onClick={() => eliminarGasto(g.id)}>Eliminar</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === "documentos" && (
            <div className="page">
              <div className="page-title">
                <h2>Documentos</h2>
                <p>Guarda pólizas, SOAP, revisión técnica, permisos y facturas (máx. 3 MB).</p>
              </div>

              <Card>
                <form className="form-grid" onSubmit={guardarDocumento}>
                  <Campo label="Vehículo">
                    <select required value={documentoForm.vehiculoId} onChange={(e) => setDocumentoForm({ ...documentoForm, vehiculoId: e.target.value })}>
                      <option value="">Seleccionar</option>
                      {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.patente} · {v.marca} {v.modelo}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Tipo">
                    <select value={documentoForm.tipo} onChange={(e) => setDocumentoForm({ ...documentoForm, tipo: e.target.value })}>
                      {tiposDocumento.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Nombre"><input value={documentoForm.nombre} onChange={(e) => setDocumentoForm({ ...documentoForm, nombre: e.target.value })} placeholder="Seguro Consorcio 2026" /></Campo>
                  <Campo label="Vencimiento"><input type="date" value={documentoForm.vencimiento} onChange={(e) => setDocumentoForm({ ...documentoForm, vencimiento: e.target.value })} /></Campo>
                  <Campo label="Archivo">
                    <input type="file" accept="application/pdf,image/*" onChange={(e) => archivoADataUrl(e.target.files?.[0])} />
                    {documentoForm.fileName && <small>Archivo: {documentoForm.fileName}</small>}
                  </Campo>
                  <Campo label="Notas"><input value={documentoForm.notas} onChange={(e) => setDocumentoForm({ ...documentoForm, notas: e.target.value })} /></Campo>
                  <div className="form-actions"><button className="btn btn-primary" type="submit">Agregar documento</button></div>
                </form>
              </Card>

              {documentosFiltrados.length === 0 ? (
                <Card><Vacio titulo="Sin documentos">Sube tu primera póliza, SOAP o factura.</Vacio></Card>
              ) : (
                <div className="cards-grid">
                  {documentosFiltrados.map((d) => {
                    const v = vehiculos.find((x) => x.id === d.vehiculoId);
                    const estado = estadoFecha(d.vencimiento);
                    return (
                      <Card key={d.id}>
                        <div className="vehicle-head">
                          <div>
                            <Badge>{d.tipo}</Badge>
                            <h3>{d.nombre || d.fileName || d.tipo}</h3>
                            <p>{v ? `${v.patente} · ${v.marca} ${v.modelo}` : "Sin vehículo"}</p>
                          </div>
                          <button className="btn btn-danger btn-small" onClick={() => eliminarDocumento(d.id)}>Eliminar</button>
                        </div>
                        <div className="doc-meta">
                          <Badge tipo={estado.tipo}>{estado.texto}</Badge>
                          <span>Vence: {fechaCL(d.vencimiento)}</span>
                        </div>
                        {d.fileData && <a className="btn btn-primary" href={d.fileData} download={d.fileName || d.nombre}>Descargar archivo</a>}
                        {d.notas && <p className="notes">{d.notas}</p>}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "alertas" && (
            <div className="page">
              <div className="page-title">
                <h2>Alertas</h2>
                <p>Vencimientos y mantenciones próximas, ordenadas por urgencia.</p>
              </div>
              <Card>
                {alertas.length === 0 ? (
                  <Vacio titulo="Todo al día">
                    No tienes alertas críticas. Completa las fechas de cada vehículo para activar recordatorios.
                  </Vacio>
                ) : (
                  <div className="list">
                    {alertas.map((a) => (
                      <div className="list-row" key={a.id}>
                        <div>
                          <strong>{a.titulo}</strong>
                          <p>{a.vehiculo.patente} · {a.vehiculo.marca} {a.vehiculo.modelo} {a.fecha && `· ${fechaCL(a.fecha)}`}</p>
                        </div>
                        <Badge tipo={a.estado.tipo}>{a.estado.texto}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </main>
      </div>

      <footer>
        <p>
          Los datos se guardan localmente en este navegador. Exporta un respaldo con frecuencia.
          Para uso multiusuario y sincronización entre dispositivos puedes conectar Cloudflare D1
          o KV mediante una función (ver README).
        </p>
      </footer>
    </div>
  );
}
