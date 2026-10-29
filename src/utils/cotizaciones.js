// Utilidades para presupuestos: líneas cotizadas, totales y registro de lo NO autorizado por el cliente

export const TIPOS_LINEA = [
  { key: "labor", etiqueta: "Mano de obra", icono: "🔧" },
  { key: "parts", etiqueta: "Repuesto", icono: "⚙️" },
  { key: "services", etiqueta: "Servicio", icono: "🧰" },
  { key: "insumos", etiqueta: "Insumo", icono: "🧴" },
  { key: "tools", etiqueta: "Herramienta", icono: "🛠️" }
];

const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

/** Monto de una línea según su tipo */
export const montoLinea = (tipo, item = {}) => {
  if (tipo === "parts" || tipo === "insumos") return num(item.qty || 1) * num(item.salePrice);
  if (tipo === "tools") return num(item.qty || 1) * num(item.price);
  return num(item.price);
};

/** Lista plana de todas las líneas del presupuesto */
export const lineasDePresupuesto = (presupuesto = {}) => {
  const out = [];
  TIPOS_LINEA.forEach(({ key, etiqueta, icono }) => {
    (presupuesto?.[key] || []).forEach((item, idx) => {
      out.push({
        id: `${key}-${idx}`,
        tipo: key,
        etiqueta,
        icono,
        idx,
        desc: item?.desc || item?.name || item?.nombre || "(sin descripción)",
        qty: key === "parts" || key === "insumos" || key === "tools" ? num(item?.qty || 1) : null,
        monto: montoLinea(key, item),
        item
      });
    });
  });
  return out;
};

/** Subtotal, descuento y total de un presupuesto (misma lógica que al guardar el presupuesto) */
export const totalesPresupuesto = (presupuesto = {}) => {
  const subtotal = lineasDePresupuesto(presupuesto).reduce((s, l) => s + l.monto, 0);
  let descuento = 0;
  if (presupuesto?.discountType === "fixed") {
    descuento = Math.min(subtotal, num(presupuesto?.discountFixed));
  } else {
    descuento = subtotal * (num(presupuesto?.discount) / 100);
  }
  return { subtotal, descuento, total: Math.max(0, subtotal - descuento) };
};

/** Presupuesto que conserva solo las líneas indicadas (ids "tipo-idx") */
export const filtrarPresupuesto = (presupuesto = {}, idsConservar = new Set()) => {
  const nuevo = { ...presupuesto };
  TIPOS_LINEA.forEach(({ key }) => {
    if (Array.isArray(presupuesto?.[key])) {
      nuevo[key] = presupuesto[key].filter((_, idx) => idsConservar.has(`${key}-${idx}`));
    }
  });
  // Un descuento fijo no puede ser mayor que lo que queda
  if (nuevo.discountType === "fixed") {
    const sub = lineasDePresupuesto(nuevo).reduce((s, l) => s + l.monto, 0);
    nuevo.discountFixed = Math.min(num(nuevo.discountFixed), sub);
  }
  return nuevo;
};

/** Crea el registro histórico de lo cotizado y no autorizado */
export const crearRegistroNoAutorizado = ({ tipo, lineas, motivo = "", usuario = "", cobroDiagnostico = 0, totalCotizado = 0 }) => ({
  id: `noaut_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  tipo, // "total" (no autorizó la reparación) | "parcial"
  fecha: new Date().toISOString(),
  usuario,
  motivo: (motivo || "").trim(),
  cobroDiagnostico: num(cobroDiagnostico),
  totalCotizado: num(totalCotizado),
  totalNoAutorizado: lineas.reduce((s, l) => s + l.monto, 0),
  lineas: lineas.map(l => ({
    tipo: l.tipo,
    etiqueta: l.etiqueta,
    desc: l.desc,
    qty: l.qty,
    monto: l.monto
  }))
});

/** Registros de una orden (siempre arreglo) */
export const registrosNoAutorizados = (orden) =>
  Array.isArray(orden?.cotizacionesNoAutorizadas) ? orden.cotizacionesNoAutorizadas : [];
