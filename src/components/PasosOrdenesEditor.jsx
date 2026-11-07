import React, { useState } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus, RotateCcw, Lock, Wrench, Car, Check } from "lucide-react";
import { getPasosConfigurados, serializarPasos, PASOS_TALLER_DEFECTO, PASOS_CARWASH_DEFECTO } from "../utils/pasosOrdenes";

// 🧭 Editor de pasos de las órdenes de Taller y Carwash (Configuración)
export default function PasosOrdenesEditor({ workshopBranding, setWorkshopBranding, ordenes = [], carwash = [] }) {
  const [nuevoNombre, setNuevoNombre] = useState({ taller: "", carwash: "" });
  const [nuevaPosicion, setNuevaPosicion] = useState({ taller: "", carwash: "" });
  const [guardadoToast, setGuardadoToast] = useState("");

  const guardar = (tipo, lista, mensaje = "Pasos actualizados") => {
    if (typeof setWorkshopBranding !== "function") return;
    setWorkshopBranding(prev => {
      const base = prev && typeof prev === "object" ? prev : {};
      return {
        ...base,
        pasosOrdenes: { ...(base.pasosOrdenes || {}), [tipo]: serializarPasos(lista) },
        pasosOrdenesUpdatedAt: new Date().toISOString()
      };
    });
    setGuardadoToast(mensaje);
    setTimeout(() => setGuardadoToast(""), 2500);
  };

  const contarEnPaso = (tipo, nombre) => {
    const lista = tipo === "taller" ? ordenes : carwash;
    return (Array.isArray(lista) ? lista : []).filter(o => o && o.estado === nombre).length;
  };

  const renderSeccion = (tipo) => {
    const pasos = getPasosConfigurados(workshopBranding, tipo);
    const esTaller = tipo === "taller";
    const primero = pasos[0]?.nombre;
    const finales = ["Listo para entrega", "Entregado"];
    // Posiciones válidas para insertar: después de cualquier paso excepto los finales
    const opcionesPosicion = pasos.filter(p => !finales.includes(p.nombre));
    const posDefecto = opcionesPosicion[opcionesPosicion.length - 1]?.nombre || primero;

    const mover = (idx, dir) => {
      const destino = idx + dir;
      const lista = [...pasos];
      const p = lista[idx];
      const q = lista[destino];
      if (!p || !q) return;
      // No se puede mover antes del primer paso ni después de "Listo para entrega" / "Entregado"
      if (p.nombre === primero || finales.includes(p.nombre) || q.nombre === primero || finales.includes(q.nombre)) return;
      lista[idx] = q;
      lista[destino] = p;
      guardar(tipo, lista, "Orden de pasos actualizado");
    };

    const alternar = (idx) => {
      const lista = pasos.map((p, i) => i === idx ? { ...p, activo: !p.activo } : p);
      guardar(tipo, lista, lista[idx].activo ? `Paso "${lista[idx].nombre}" activado` : `Paso "${lista[idx].nombre}" desactivado`);
    };

    const eliminar = (idx) => {
      const p = pasos[idx];
      const n = contarEnPaso(tipo, p.nombre);
      const aviso = n > 0 ? `\n\n⚠️ Hay ${n} orden(es) actualmente en este paso. Conservarán su estado y al avanzar pasarán al siguiente paso configurado.` : "";
      if (!window.confirm(`¿Eliminar el paso "${p.nombre}"?${aviso}`)) return;
      guardar(tipo, pasos.filter((_, i) => i !== idx), `Paso "${p.nombre}" eliminado`);
    };

    const renombrar = (idx, nombre) => {
      const lista = pasos.map((p, i) => i === idx ? { ...p, nombre } : p);
      guardar(tipo, lista, "Nombre del paso actualizado");
    };

    const agregar = (e) => {
      e.preventDefault();
      const nombre = String(nuevoNombre[tipo] || "").trim();
      if (!nombre) { alert("Escribe el nombre del nuevo paso."); return; }
      if (pasos.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) { alert("Ya existe un paso con ese nombre."); return; }
      const despuesDe = nuevaPosicion[tipo] || posDefecto;
      const idx = pasos.findIndex(p => p.nombre === despuesDe);
      const lista = [...pasos];
      lista.splice(idx >= 0 ? idx + 1 : lista.length - 2, 0, { nombre, descripcion: "", activo: true, personalizado: true });
      guardar(tipo, lista, `Paso "${nombre}" agregado`);
      setNuevoNombre(prev => ({ ...prev, [tipo]: "" }));
    };

    const restaurar = () => {
      if (!window.confirm(`¿Restaurar los pasos predeterminados de ${esTaller ? "Taller" : "Carwash"}? Se eliminarán los pasos personalizados.`)) return;
      guardar(tipo, (esTaller ? PASOS_TALLER_DEFECTO : PASOS_CARWASH_DEFECTO).map(p => ({ ...p, activo: true })), "Pasos predeterminados restaurados");
    };

    return (
      <div className="glass-panel" style={{ padding: "20px", borderRadius: "14px", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
            {esTaller ? <Wrench size={18} color="#60a5fa" /> : <Car size={18} color="#22d3ee" />}
            Pasos de órdenes de {esTaller ? "Taller" : "Carwash"}
          </h3>
          <button type="button" onClick={restaurar} className="btn btn-ghost" style={{ fontSize: "0.78rem", padding: "6px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
            <RotateCcw size={14} /> Restaurar predeterminados
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {pasos.map((p, idx) => {
            const fijoPosicion = p.nombre === primero || finales.includes(p.nombre);
            const n = contarEnPaso(tipo, p.nombre);
            return (
              <div key={`${p.nombre}_${idx}`} style={{
                display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap",
                padding: "10px 12px", borderRadius: "10px",
                background: p.activo ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)",
                border: `1px solid ${p.activo ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.06)"}`,
                opacity: p.activo ? 1 : 0.6
              }}>
                <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: p.activo ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)", color: "#93c5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 800, flexShrink: 0 }}>
                  {idx + 1}
                </span>
                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                  {p.personalizado ? (
                    <input
                      className="input-field"
                      defaultValue={p.nombre}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (!v) { e.target.value = p.nombre; return; }
                        if (v !== p.nombre) {
                          if (pasos.some((x, i) => i !== idx && x.nombre.toLowerCase() === v.toLowerCase())) { alert("Ya existe un paso con ese nombre."); e.target.value = p.nombre; return; }
                          renombrar(idx, v);
                        }
                      }}
                      style={{ padding: "6px 10px", fontSize: "0.85rem", height: "34px" }}
                      title="Nombre del paso personalizado"
                    />
                  ) : (
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      {p.nombre}
                      {p.obligatorio && <span title="Paso obligatorio del sistema" style={{ fontSize: "0.68rem", color: "#fbbf24", display: "inline-flex", alignItems: "center", gap: "3px" }}><Lock size={11} /> Obligatorio</span>}
                    </div>
                  )}
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {p.personalizado ? "Paso personalizado" : p.descripcion}
                    {n > 0 && <span style={{ color: "#60a5fa", fontWeight: 700 }}> · {n} orden(es) en este paso</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <button type="button" disabled={fijoPosicion || idx <= 1} onClick={() => mover(idx, -1)} className="btn btn-ghost" style={{ padding: "4px 8px" }} title="Subir">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" disabled={fijoPosicion || finales.includes(pasos[idx + 1]?.nombre)} onClick={() => mover(idx, 1)} className="btn btn-ghost" style={{ padding: "4px 8px" }} title="Bajar">
                    <ArrowDown size={14} />
                  </button>
                  {!p.obligatorio && (
                    <label title={p.activo ? "Desactivar paso" : "Activar paso"} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: p.activo ? "#34d399" : "var(--text-muted)", cursor: "pointer", padding: "0 4px" }}>
                      <input type="checkbox" checked={p.activo} onChange={() => alternar(idx)} /> {p.activo ? "Activo" : "Inactivo"}
                    </label>
                  )}
                  {!p.obligatorio && (
                    <button type="button" onClick={() => eliminar(idx)} className="btn btn-ghost" style={{ padding: "4px 8px", color: "#f87171" }} title="Eliminar paso">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={agregar} style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px", alignItems: "flex-end" }}>
          <div style={{ flex: "2 1 200px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Nuevo paso</label>
            <input
              className="input-field"
              placeholder={esTaller ? "Ej. Esperando repuestos" : "Ej. Encerado / Detallado"}
              value={nuevoNombre[tipo]}
              onChange={(e) => setNuevoNombre(prev => ({ ...prev, [tipo]: e.target.value }))}
            />
          </div>
          <div style={{ flex: "1 1 180px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Ubicar después de</label>
            <select className="input-field" value={nuevaPosicion[tipo] || posDefecto} onChange={(e) => setNuevaPosicion(prev => ({ ...prev, [tipo]: e.target.value }))}>
              {opcionesPosicion.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", height: "42px" }}>
            <Plus size={16} /> Agregar paso
          </button>
        </form>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} className="animate-fade-in">
      <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "14px", border: "1px solid rgba(59,130,246,0.3)" }}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>🧭 Pasos que siguen las órdenes</h3>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Elige qué pasos usa tu negocio, crea pasos nuevos, cámbialos de orden o elimínalos. El botón de avance de cada orden seguirá este orden.
          Los pasos marcados como <strong style={{ color: "#fbbf24" }}>Obligatorio</strong> son necesarios para recibir, cobrar y entregar, por eso no se pueden quitar.
          Los cambios se guardan automáticamente y se sincronizan en todos los dispositivos.
        </p>
        {guardadoToast && (
          <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "8px", background: "rgba(16,185,129,0.15)", border: "1px solid #10b981", color: "#10b981", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <Check size={16} /> {guardadoToast}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        {renderSeccion("taller")}
        {renderSeccion("carwash")}
      </div>
    </div>
  );
}
