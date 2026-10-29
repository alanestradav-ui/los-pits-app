import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Wrench, Droplets, Wallet, CalendarPlus, ChevronRight, X, BarChart3, CarFront, CheckCircle2, CalendarClock, Clock } from "lucide-react";
import { formatMoney } from "../../utils/storage";
import { placaDe, vehiculoTexto, dejarEncargoMovil } from "../../utils/movil";

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const esDeHoy = (fecha) => {
  if (!fecha) return false;
  const d = new Date(fecha);
  if (isNaN(d)) return false;
  const h = new Date();
  return d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth() && d.getDate() === h.getDate();
};
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s-]/g, "");

const COLOR_ESTADO = {
  "En recepción": "#94a3b8",
  "En proceso de diagnóstico y presupuesto": "#a78bfa",
  "En espera de autorización": "#f59e0b",
  "En proceso de reparación": "#60a5fa",
  "Listo para entrega": "#10b981"
};
const estadoCorto = (e) => ({
  "En proceso de diagnóstico y presupuesto": "Diagnóstico",
  "En espera de autorización": "Esperando autorización",
  "En proceso de reparación": "En reparación",
  "En período de prueba y control de calidad": "Control de calidad",
  "Revisión antes de entrega": "Revisión final"
}[e] || e);

export default function InicioMovil({
  ordenes = [], carwash = [], citas = [], clientes = [], vehiculos = [],
  usuario, puede, onNavegar, verMontos, nombreTaller
}) {
  const [busqueda, setBusqueda] = useState("");
  const [hojaCobrar, setHojaCobrar] = useState(false);

  const listaOrdenes = Array.isArray(ordenes) ? ordenes.filter(o => o && !o.deleted && !o._deleted) : [];
  const listaLavados = Array.isArray(carwash) ? carwash.filter(c => c && !c.deleted && !c._deleted) : [];
  const listaCitas = Array.isArray(citas) ? citas : [];

  const activas = listaOrdenes.filter(o => o.estado !== "Entregado");
  const listas = activas.filter(o => o.estado === "Listo para entrega");
  const lavadosActivos = listaLavados.filter(c => c.estado !== "Entregado");
  const lavadosListos = lavadosActivos.filter(c => c.estado === "Listo para entrega");
  const citasHoy = listaCitas.filter(c => c.fechaCita === hoyISO() && c.estado !== "cancelada");
  const ventasHoy =
    listaOrdenes.filter(o => o.estado === "Entregado" && esDeHoy(o.fecha)).reduce((s, o) => s + (parseFloat(o.total) || 0), 0) +
    listaLavados.filter(c => c.estado === "Entregado" && esDeHoy(c.fecha)).reduce((s, c) => s + (parseFloat(c.precio) || 0), 0);

  // 🔎 Buscador global: placa, cliente o teléfono
  const resultados = useMemo(() => {
    const q = norm(busqueda);
    if (q.length < 2) return [];
    const out = [];
    const vistos = new Set();
    const agregar = (r) => { if (!vistos.has(r.key) && out.length < 12) { vistos.add(r.key); out.push(r); } };
    listaOrdenes
      .filter(o => norm(placaDe(o)).includes(q) || norm(o.cliente).includes(q) || norm(o.telefono).includes(q))
      .sort((a, b) => (a.estado === "Entregado") - (b.estado === "Entregado"))
      .forEach(o => agregar({
        key: `o-${o.id}`, tipo: o.estado === "Entregado" ? "historial" : "taller",
        titulo: `${placaDe(o) || "Sin placa"} · ${vehiculoTexto(o)}`, sub: `${o.cliente || ""} · ${o.estado === "Entregado" ? "Taller (entregado)" : estadoCorto(o.estado)}`,
        placa: placaDe(o), texto: placaDe(o) || o.cliente
      }));
    listaLavados
      .filter(c => c.estado !== "Entregado" && (norm(placaDe(c)).includes(q) || norm(c.cliente).includes(q) || norm(c.telefono).includes(q)))
      .forEach(c => agregar({
        key: `c-${c.id}`, tipo: "carwash", titulo: `${placaDe(c) || "Sin placa"} · Lavado`, sub: `${c.cliente || ""} · ${c.estado}`,
        placa: placaDe(c), texto: placaDe(c) || c.cliente
      }));
    (Array.isArray(vehiculos) ? vehiculos : [])
      .filter(v => norm(v.placa).includes(q))
      .forEach(v => agregar({
        key: `v-${v.placa}`, tipo: "historial", titulo: `${String(v.placa || "").toUpperCase()} · ${[v.marca, v.linea, v.anio].filter(Boolean).join(" ")}`,
        sub: "Vehículo registrado", placa: v.placa, texto: v.placa
      }));
    (Array.isArray(clientes) ? clientes : [])
      .filter(c => norm(c.nombre).includes(q) || norm(c.telefono).includes(q))
      .forEach(c => agregar({
        key: `cl-${c.telefono || c.nombre}`, tipo: "clientes", titulo: c.nombre || "Cliente", sub: `Cliente · ${c.telefono || ""}`, texto: c.telefono || c.nombre
      }));
    return out;
  }, [busqueda, listaOrdenes, listaLavados, vehiculos, clientes]);

  const abrirResultado = (r) => {
    let destino = r.tipo;
    if (destino === "historial" && !puede("historial")) destino = puede("taller") ? "taller" : null;
    if (destino === "clientes") destino = puede("clientesVehiculos") ? "clientesVehiculos" : (puede("historial") ? "historial" : null);
    if (destino === "taller" && !puede("taller")) destino = null;
    if (destino === "carwash" && !puede("carwash")) destino = null;
    if (!destino) { alert("No tienes permiso para abrir ese módulo."); return; }
    dejarEncargoMovil(`buscar_${destino}`, r.texto || "");
    onNavegar(destino);
  };

  const irConEncargo = (destino, encargo, valor = "1") => {
    dejarEncargoMovil(encargo, valor);
    onNavegar(destino);
  };

  const acciones = [
    puede("taller") && { id: "accion-nueva-orden", label: "Nueva orden", Icon: Wrench, color: "#3b82f6", onClick: () => irConEncargo("taller", "nueva_orden") },
    puede("carwash") && { id: "accion-nuevo-lavado", label: "Nuevo lavado", Icon: Droplets, color: "#06b6d4", onClick: () => irConEncargo("carwash", "nuevo_lavado") },
    (puede("taller") || puede("carwash")) && verMontos && { id: "accion-cobrar", label: "Cobrar", Icon: Wallet, color: "#10b981", badge: listas.length + lavadosListos.length, onClick: () => setHojaCobrar(true) },
    puede("citas") && { id: "accion-agendar-cita", label: "Agendar cita", Icon: CalendarPlus, color: "#a855f7", onClick: () => irConEncargo("citas", "nueva_cita") }
  ].filter(Boolean);

  const chips = [
    puede("taller") && { label: "En taller", valor: activas.length, Icon: CarFront, color: "#60a5fa", onClick: () => onNavegar("taller") },
    puede("taller") && { label: "Listos", valor: listas.length, Icon: CheckCircle2, color: "#10b981", onClick: () => onNavegar("taller") },
    puede("carwash") && { label: "Lavados", valor: lavadosActivos.length, Icon: Droplets, color: "#22d3ee", onClick: () => onNavegar("carwash") },
    puede("citas") && { label: "Citas hoy", valor: citasHoy.length, Icon: CalendarClock, color: "#c084fc", onClick: () => onNavegar("citas") }
  ].filter(Boolean);

  const saludo = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  })();
  const nombre = String(usuario?.nombreCompleto || usuario?.nombre || usuario?.user || "").split(" ")[0];

  return (
    <div className="inicio-movil animate-fade-in">
      <header style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
          {new Date().toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h1 style={{ margin: "2px 0 0", fontSize: "1.45rem", fontWeight: 800, color: "#fff" }}>
          {saludo}{nombre ? `, ${nombre.charAt(0).toUpperCase() + nombre.slice(1)}` : ""} 👋
        </h1>
        {nombreTaller && <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{nombreTaller}</div>}
      </header>

      {/* Buscador global */}
      <div className="inicio-buscador">
        <Search size={20} color="var(--text-muted)" />
        <input
          id="inicio-buscar"
          type="search"
          inputMode="search"
          placeholder="Buscar placa, cliente o teléfono"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoComplete="off"
        />
        {busqueda && (
          <button type="button" onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda" style={{ background: "none", border: "none", color: "var(--text-muted)", padding: 4 }}>
            <X size={18} />
          </button>
        )}
      </div>
      {busqueda.trim().length >= 2 && (
        <div className="inicio-resultados">
          {resultados.length === 0 && <div style={{ padding: "14px", color: "var(--text-muted)", fontSize: "0.88rem" }}>Sin resultados para “{busqueda}”.</div>}
          {resultados.map(r => (
            <button key={r.key} type="button" className="inicio-resultado" onClick={() => abrirResultado(r)}>
              <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                <span style={{ display: "block", color: "#fff", fontWeight: 700, fontSize: "0.92rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.titulo}</span>
                <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sub}</span>
              </span>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>
          ))}
        </div>
      )}

      {/* Acciones rápidas */}
      {acciones.length > 0 && (
        <div className="inicio-acciones">
          {acciones.map(a => (
            <button key={a.id} id={a.id} type="button" className="inicio-accion" onClick={a.onClick} style={{ "--accion-color": a.color }}>
              <span className="inicio-accion-icono"><a.Icon size={26} />{a.badge > 0 && <span className="barra-inferior-badge">{a.badge}</span>}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Resumen del día */}
      {(chips.length > 0 || verMontos) && (
        <div className="inicio-chips">
          {verMontos && (
            <div className="inicio-chip inicio-chip-ventas">
              <span style={{ fontSize: "0.72rem", color: "#a7f3d0", fontWeight: 700 }}>VENTAS DE HOY</span>
              <strong style={{ fontSize: "1.25rem", color: "#fff" }}>{formatMoney(ventasHoy)}</strong>
            </div>
          )}
          {chips.map(c => (
            <button key={c.label} type="button" className="inicio-chip" onClick={c.onClick}>
              <c.Icon size={18} color={c.color} />
              <strong style={{ fontSize: "1.3rem", color: "#fff", lineHeight: 1 }}>{c.valor}</strong>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Vehículos en proceso */}
      {puede("taller") && (
        <section style={{ marginTop: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#fff" }}>Vehículos en proceso</h2>
            <button type="button" onClick={() => onNavegar("taller")} style={{ background: "none", border: "none", color: "var(--color-primary)", fontWeight: 700, fontSize: "0.85rem" }}>Ver todos</button>
          </div>
          {activas.length === 0 && <div className="inicio-vacio">No hay vehículos en el taller en este momento.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {activas.slice(0, 8).map(o => {
              const color = COLOR_ESTADO[o.estado] || "#60a5fa";
              return (
                <button key={o.id} type="button" className="inicio-orden" onClick={() => { dejarEncargoMovil("buscar_taller", placaDe(o) || o.cliente || ""); onNavegar("taller"); }}>
                  <span className="inicio-orden-placa">{placaDe(o) || "—"}</span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <span style={{ display: "block", color: "#fff", fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{vehiculoTexto(o) || o.trabajo || "Vehículo"}</span>
                    <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.76rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {o.cliente}{o.mecanico ? ` · 🔧 ${o.mecanico}` : ""}
                    </span>
                    <span className="inicio-estado" style={{ color, background: `${color}1f` }}>{estadoCorto(o.estado)}</span>
                  </span>
                  {verMontos && o.total > 0 && <strong style={{ color: "#fff", fontSize: "0.85rem", whiteSpace: "nowrap" }}>{formatMoney(o.total)}</strong>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Citas de hoy */}
      {puede("citas") && citasHoy.length > 0 && (
        <section style={{ marginTop: "18px" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 800, color: "#fff" }}>Citas de hoy</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {citasHoy.slice(0, 5).map(c => (
              <button key={c.id} type="button" className="inicio-orden" onClick={() => onNavegar("citas")}>
                <span className="inicio-orden-placa" style={{ background: "rgba(168,85,247,0.15)", color: "#d8b4fe" }}><Clock size={14} /> {c.horaCita || "--:--"}</span>
                <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <span style={{ display: "block", color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>{c.clienteNombre || "Cliente"}</span>
                  <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.76rem" }}>{[c.servicio, c.vehiculoPlaca].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {puede("dashboard") && (
        <button id="inicio-ver-estadisticas" type="button" className="btn btn-secondary" onClick={() => onNavegar("dashboard")} style={{ width: "100%", minHeight: "48px", marginTop: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <BarChart3 size={18} /> Ver estadísticas completas
        </button>
      )}

      {/* Hoja: pendientes de cobro */}
      {hojaCobrar && createPortal(
        <div className="hoja-movil-fondo" onClick={() => setHojaCobrar(false)}>
          <div className="hoja-movil" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Pendientes de cobro">
            <div className="hoja-movil-asa" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>Listos para cobrar</h2>
              <button type="button" onClick={() => setHojaCobrar(false)} className="menu-mas-cerrar" aria-label="Cerrar"><X size={20} /></button>
            </div>
            {listas.length + lavadosListos.length === 0 && <div className="inicio-vacio">No hay vehículos listos para entrega.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
              {puede("taller") && listas.map(o => (
                <button key={`o-${o.id}`} type="button" className="inicio-orden" onClick={() => { setHojaCobrar(false); dejarEncargoMovil("buscar_taller", placaDe(o) || o.cliente || ""); onNavegar("taller"); }}>
                  <span className="inicio-orden-placa">{placaDe(o) || "—"}</span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <span style={{ display: "block", color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>🔧 {o.cliente}</span>
                    <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.76rem" }}>Taller · {vehiculoTexto(o)}</span>
                  </span>
                  <strong style={{ color: "#34d399", whiteSpace: "nowrap" }}>{formatMoney(o.total || 0)}</strong>
                </button>
              ))}
              {puede("carwash") && lavadosListos.map(c => (
                <button key={`c-${c.id}`} type="button" className="inicio-orden" onClick={() => { setHojaCobrar(false); dejarEncargoMovil("buscar_carwash", placaDe(c) || c.cliente || ""); onNavegar("carwash"); }}>
                  <span className="inicio-orden-placa">{placaDe(c) || "—"}</span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <span style={{ display: "block", color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>🧼 {c.cliente}</span>
                    <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.76rem" }}>Carwash · {c.tipo || ""}</span>
                  </span>
                  <strong style={{ color: "#34d399", whiteSpace: "nowrap" }}>{formatMoney(c.precio || 0)}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
