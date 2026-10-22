import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Package, Plus, Trash2, Edit, X, Save, Wrench, Cog, FlaskConical, Search } from "lucide-react";
import { formatMoney } from "../utils/storage";

// 📦 PAQUETES DE SERVICIO
// Un paquete agrupa mano de obra, repuestos e insumos recurrentes (ej. "Servicio Menor 5,000 km").
// Al seleccionarlo en el presupuesto de una orden, todas sus líneas se agregan automáticamente.

const nuevoId = () => `paq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const paqueteVacio = () => ({
  id: nuevoId(),
  nombre: "",
  descripcion: "",
  labor: [],
  parts: [],
  insumos: []
});

// Totales de un paquete (venta y costo)
export const getTotalesPaquete = (p) => {
  const labor = (p?.labor || []).reduce((s, i) => s + num(i.price), 0);
  const parts = (p?.parts || []).reduce((s, i) => s + num(i.qty) * num(i.salePrice), 0);
  const insumos = (p?.insumos || []).reduce((s, i) => s + num(i.qty) * num(i.salePrice), 0);
  const costo = (p?.parts || []).reduce((s, i) => s + num(i.qty) * num(i.purchasePrice), 0) +
    (p?.insumos || []).reduce((s, i) => s + num(i.qty) * num(i.purchasePrice), 0);
  return { labor, parts, insumos, total: labor + parts + insumos, costo };
};

// Busca el artículo en inventario (por código o nombre) para usar precios y datos actualizados
const buscarEnInventario = (item, workshopInventory = [], accesoriosInventory = []) => {
  const lista = [
    ...(workshopInventory || []).map(i => ({ ...i, isAccessory: false })),
    ...(accesoriosInventory || []).map(i => ({ ...i, isAccessory: true }))
  ];
  const code = String(item.code || "").trim().toLowerCase();
  const name = String(item.desc || "").trim().toLowerCase();
  return lista.find(i => code && String(i.code || "").trim().toLowerCase() === code) ||
    lista.find(i => name && String(i.name || "").trim().toLowerCase() === name) || null;
};

/**
 * Agrega todas las líneas del paquete al presupuesto actual.
 * Los repuestos vinculados a inventario toman el precio vigente del inventario.
 */
export const aplicarPaqueteAPresupuesto = (budget, paquete, workshopInventory = [], accesoriosInventory = []) => {
  const base = budget || { labor: [], parts: [], services: [], discount: 0 };
  const etiqueta = paquete?.nombre ? paquete.nombre.trim() : "";
  const labor = (paquete?.labor || []).map(l => ({
    desc: l.desc,
    price: num(l.price),
    comisiona: l.comisiona !== false,
    paquete: etiqueta
  }));
  const parts = (paquete?.parts || []).map(p => {
    const inv = buscarEnInventario(p, workshopInventory, accesoriosInventory);
    const salePrice = inv && num(inv.salePrice) > 0 ? num(inv.salePrice) : num(p.salePrice);
    const purchasePrice = inv && num(inv.purchasePrice) > 0 ? num(inv.purchasePrice) : num(p.purchasePrice);
    return {
      desc: inv ? (inv.name || p.desc) : p.desc,
      qty: Math.max(1, parseInt(p.qty) || 1),
      purchasePrice,
      salePrice,
      price: salePrice,
      code: inv ? (inv.code || "") : (p.code || ""),
      brand: inv ? (inv.brand || "") : (p.brand || ""),
      presentation: inv ? (inv.presentation || "") : (p.presentation || ""),
      isAccessory: inv ? inv.isAccessory : (p.isAccessory === true),
      paquete: etiqueta
    };
  });
  const insumos = (paquete?.insumos || []).map(i => ({
    desc: i.desc,
    qty: Math.max(1, parseInt(i.qty) || 1),
    purchasePrice: num(i.purchasePrice),
    salePrice: num(i.salePrice),
    paquete: etiqueta
  }));
  return {
    ...base,
    labor: [...(base.labor || []), ...labor],
    parts: [...(base.parts || []), ...parts],
    insumos: [...(base.insumos || []), ...insumos]
  };
};

// Crea un borrador de paquete a partir de un presupuesto existente
export const paqueteDesdePresupuesto = (budget, nombre = "") => ({
  ...paqueteVacio(),
  nombre,
  labor: (budget?.labor || []).map(l => ({ desc: l.desc || "", price: num(l.price), comisiona: l.comisiona !== false })),
  parts: (budget?.parts || []).map(p => ({
    desc: p.desc || "", qty: parseInt(p.qty) || 1, purchasePrice: num(p.purchasePrice), salePrice: num(p.salePrice ?? p.price),
    code: p.code || "", brand: p.brand || "", presentation: p.presentation || "", isAccessory: p.isAccessory === true
  })),
  insumos: (budget?.insumos || []).map(i => ({ desc: i.desc || "", qty: parseInt(i.qty) || 1, purchasePrice: num(i.purchasePrice), salePrice: num(i.salePrice) }))
});

export default function ServicePackagesManager({
  paquetes = [],
  setPaquetes,
  workshopInventory = [],
  accesoriosInventory = [],
  onClose,
  initialDraft = null,
  usuarioActual
}) {
  const [editing, setEditing] = useState(initialDraft ? { ...initialDraft } : null);
  const [busqueda, setBusqueda] = useState("");

  const activos = useMemo(
    () => (Array.isArray(paquetes) ? paquetes : []).filter(p => p && !p.eliminado),
    [paquetes]
  );
  const filtrados = activos.filter(p => {
    const q = busqueda.trim().toLowerCase();
    return !q || String(p.nombre || "").toLowerCase().includes(q) || String(p.descripcion || "").toLowerCase().includes(q);
  });

  const inventarioNombres = useMemo(() => {
    const set = new Set();
    [...(workshopInventory || []), ...(accesoriosInventory || [])].forEach(i => { if (i && i.name) set.add(i.name); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [workshopInventory, accesoriosInventory]);

  const guardar = () => {
    if (!editing) return;
    const nombre = String(editing.nombre || "").trim();
    if (!nombre) {
      alert("Escribe un nombre para el paquete de servicio.");
      return;
    }
    const limpio = {
      ...editing,
      nombre,
      descripcion: String(editing.descripcion || "").trim(),
      labor: (editing.labor || []).filter(l => String(l.desc || "").trim()).map(l => ({ ...l, desc: l.desc.trim(), price: num(l.price), comisiona: l.comisiona !== false })),
      parts: (editing.parts || []).filter(p => String(p.desc || "").trim()).map(p => ({ ...p, desc: p.desc.trim(), qty: Math.max(1, parseInt(p.qty) || 1), purchasePrice: num(p.purchasePrice), salePrice: num(p.salePrice) })),
      insumos: (editing.insumos || []).filter(i => String(i.desc || "").trim()).map(i => ({ ...i, desc: i.desc.trim(), qty: Math.max(1, parseInt(i.qty) || 1), purchasePrice: num(i.purchasePrice), salePrice: num(i.salePrice) })),
      actualizadoPor: usuarioActual?.user || "",
      updatedAt: new Date().toISOString()
    };
    if (limpio.labor.length + limpio.parts.length + limpio.insumos.length === 0) {
      alert("Agrega al menos una mano de obra, repuesto o insumo al paquete.");
      return;
    }
    setPaquetes(prev => {
      const lista = Array.isArray(prev) ? prev : [];
      const existe = lista.some(p => p && p.id === limpio.id);
      return existe ? lista.map(p => (p && p.id === limpio.id ? limpio : p)) : [{ ...limpio, creadoEn: new Date().toISOString() }, ...lista];
    });
    setEditing(null);
  };

  const eliminar = (p) => {
    if (!window.confirm(`¿Eliminar el paquete "${p.nombre}"?`)) return;
    // Borrado lógico para que no reaparezca al sincronizar con la nube
    setPaquetes(prev => (Array.isArray(prev) ? prev : []).map(x => (x && x.id === p.id ? { ...x, eliminado: true, updatedAt: new Date().toISOString() } : x)));
  };

  const setLinea = (tipo, idx, campo, valor) => {
    setEditing(prev => {
      const lista = [...(prev[tipo] || [])];
      let fila = { ...lista[idx], [campo]: valor };
      // Al escribir un repuesto que existe en inventario se completan sus datos y precios
      if (tipo === "parts" && campo === "desc") {
        const inv = buscarEnInventario({ desc: valor }, workshopInventory, accesoriosInventory);
        if (inv) {
          fila = {
            ...fila,
            code: inv.code || "",
            brand: inv.brand || "",
            presentation: inv.presentation || "",
            isAccessory: inv.isAccessory,
            purchasePrice: num(inv.purchasePrice),
            salePrice: num(inv.salePrice)
          };
        }
      }
      lista[idx] = fila;
      return { ...prev, [tipo]: lista };
    });
  };

  const agregarLinea = (tipo) => {
    const filaNueva = tipo === "labor"
      ? { desc: "", price: "", comisiona: true }
      : { desc: "", qty: 1, purchasePrice: "", salePrice: "" };
    setEditing(prev => ({ ...prev, [tipo]: [...(prev[tipo] || []), filaNueva] }));
  };

  const quitarLinea = (tipo, idx) => {
    setEditing(prev => ({ ...prev, [tipo]: (prev[tipo] || []).filter((_, i) => i !== idx) }));
  };

  const totalesEdit = editing ? getTotalesPaquete(editing) : null;

  const seccion = (tipo, titulo, Icono, color) => (
    <div className="paq-seccion" style={{ ...s.section, borderColor: `${color}40` }}>
      <div style={s.sectionHead}>
        <span style={{ ...s.sectionTitle, color }}><Icono size={16} /> {titulo}</span>
        <button type="button" onClick={() => agregarLinea(tipo)} style={{ ...s.addBtn, color, borderColor: `${color}66` }}>
          <Plus size={14} /> Agregar
        </button>
      </div>
      {(editing[tipo] || []).length === 0 && <div style={s.empty}>Sin líneas. Usa "Agregar".</div>}
      {(editing[tipo] || []).map((fila, idx) => (
        <div key={idx} className="paq-fila" style={s.row}>
          <input
            className="input-field"
            placeholder={tipo === "labor" ? "Descripción de mano de obra" : tipo === "parts" ? "Repuesto (escribe para buscar en inventario)" : "Insumo"}
            value={fila.desc}
            list={tipo === "parts" ? "paquetes-inventario" : undefined}
            onChange={(e) => setLinea(tipo, idx, "desc", e.target.value)}
            style={{ ...s.input, flex: 3, minWidth: "180px" }}
          />
          {tipo !== "labor" && (
            <input className="input-field" type="number" min="1" placeholder="Cant." value={fila.qty}
              onChange={(e) => setLinea(tipo, idx, "qty", e.target.value)} style={{ ...s.input, width: "70px" }} title="Cantidad" />
          )}
          {tipo !== "labor" && (
            <input className="input-field" type="number" min="0" step="any" placeholder="Costo Q" value={fila.purchasePrice}
              onChange={(e) => setLinea(tipo, idx, "purchasePrice", e.target.value)} style={{ ...s.input, width: "95px" }} title="Precio de compra (costo)" />
          )}
          <input className="input-field" type="number" min="0" step="any" placeholder={tipo === "labor" ? "Precio Q" : "Venta Q"}
            value={tipo === "labor" ? fila.price : fila.salePrice}
            onChange={(e) => setLinea(tipo, idx, tipo === "labor" ? "price" : "salePrice", e.target.value)}
            style={{ ...s.input, width: "95px" }} title="Precio de venta" />
          {tipo === "labor" && (
            <label style={s.chk} title="Genera comisión al técnico">
              <input type="checkbox" checked={fila.comisiona !== false} onChange={(e) => setLinea(tipo, idx, "comisiona", e.target.checked)} />
              Comisión
            </label>
          )}
          <button type="button" onClick={() => quitarLinea(tipo, idx)} style={s.delBtn} title="Quitar línea"><X size={14} /></button>
        </div>
      ))}
    </div>
  );

  return createPortal(
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="glass-panel" style={s.modal}>
        <div style={s.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={s.headerIcon}><Package size={22} /></div>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>Paquetes de Servicio</h2>
              <p style={{ fontSize: "0.8rem", margin: 0 }}>Mano de obra, repuestos e insumos que se cargan juntos al elegir el servicio</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={s.closeBtn} title="Cerrar"><X size={22} /></button>
        </div>

        <datalist id="paquetes-inventario">
          {inventarioNombres.map(n => <option key={n} value={n} />)}
        </datalist>

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: "200px" }}>
                <label style={s.label}>Nombre del paquete *</label>
                <input id="paquete-nombre" className="input-field" placeholder="Ej. Servicio Menor 5,000 km" value={editing.nombre}
                  onChange={(e) => setEditing({ ...editing, nombre: e.target.value })} />
              </div>
              <div style={{ flex: 3, minWidth: "200px" }}>
                <label style={s.label}>Descripción (opcional)</label>
                <input className="input-field" placeholder="Ej. Cambio de aceite, filtros y revisión general" value={editing.descripcion}
                  onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })} />
              </div>
            </div>

            {seccion("labor", "Mano de Obra", Wrench, "#60a5fa")}
            {seccion("parts", "Repuestos", Cog, "#c084fc")}
            {seccion("insumos", "Insumos", FlaskConical, "#fbbf24")}

            <div style={s.footer}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Total del paquete: <strong style={{ color: "#fff", fontSize: "1.05rem" }}>{formatMoney(totalesEdit.total)}</strong>
                <span style={{ marginLeft: "10px" }}>Costo: {formatMoney(totalesEdit.costo)}</span>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
                <button type="button" id="paquete-guardar" className="btn btn-primary" onClick={guardar}><Save size={16} /> Guardar Paquete</button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
                <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input className="input-field" placeholder="Buscar paquete..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ paddingLeft: "36px" }} />
              </div>
              <button type="button" id="paquete-nuevo" className="btn btn-primary" onClick={() => setEditing(paqueteVacio())}>
                <Plus size={16} /> Nuevo Paquete
              </button>
            </div>

            {filtrados.length === 0 ? (
              <div style={{ ...s.empty, padding: "30px" }}>
                {activos.length === 0 ? "Aún no hay paquetes. Crea el primero con \"Nuevo Paquete\"." : "No hay paquetes que coincidan con la búsqueda."}
              </div>
            ) : (
              <div style={s.grid}>
                {filtrados.map(p => {
                  const t = getTotalesPaquete(p);
                  return (
                    <div key={p.id} style={s.card}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.98rem" }}>{p.nombre}</div>
                          {p.descripcion && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{p.descripcion}</div>}
                        </div>
                        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                          <button type="button" onClick={() => setEditing({ ...p })} style={s.iconBtn} title="Editar"><Edit size={15} /></button>
                          <button type="button" onClick={() => eliminar(p)} style={{ ...s.iconBtn, color: "#f87171" }} title="Eliminar"><Trash2 size={15} /></button>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "0.72rem" }}>
                        <span style={{ ...s.pill, color: "#60a5fa" }}>🛠️ {(p.labor || []).length} MO</span>
                        <span style={{ ...s.pill, color: "#c084fc" }}>⚙️ {(p.parts || []).length} repuestos</span>
                        <span style={{ ...s.pill, color: "#fbbf24" }}>🧪 {(p.insumos || []).length} insumos</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Total: <strong style={{ color: "var(--color-success)" }}>{formatMoney(t.total)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

const s = {
  overlay: {
    position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100000, padding: "16px", overflowY: "auto"
  },
  modal: {
    width: "100%", maxWidth: "860px", maxHeight: "92vh", overflowY: "auto", padding: "22px", borderRadius: "16px",
    margin: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.6)", background: "rgba(16, 19, 26, 0.97)"
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  headerIcon: { width: "42px", height: "42px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(168,85,247,0.25))", color: "#93c5fd", flexShrink: 0 },
  closeBtn: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px" },
  label: { fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 600 },
  section: { border: "1px solid", borderRadius: "12px", padding: "12px", background: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: "8px" },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" },
  sectionTitle: { display: "flex", alignItems: "center", gap: "6px", fontWeight: 800, fontSize: "0.9rem" },
  addBtn: { display: "flex", alignItems: "center", gap: "4px", background: "transparent", border: "1px solid", borderRadius: "8px", padding: "4px 10px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" },
  row: { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" },
  input: { padding: "8px 10px", fontSize: "0.85rem" },
  chk: { display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "#34d399", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  delBtn: { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171", borderRadius: "8px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  empty: { fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "8px" },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" },
  iconBtn: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", borderRadius: "8px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  pill: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "999px", padding: "2px 8px", fontWeight: 700 }
};
