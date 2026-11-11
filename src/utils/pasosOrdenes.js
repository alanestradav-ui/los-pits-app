// 🧭 Pasos (estados) configurables de las órdenes de Taller y Carwash.
// La configuración se guarda dentro de workshopBranding.pasosOrdenes, que ya se sincroniza en la nube.
//
// Pasos "obligatorios": la app depende de ellos (recepción, cobro y entrega), por eso
// no se pueden eliminar ni desactivar, pero sí se pueden reordenar los demás a su alrededor.

export const PASOS_TALLER_DEFECTO = [
  { nombre: "En recepción", obligatorio: true, descripcion: "Ingreso del vehículo al taller" },
  { nombre: "En proceso de diagnóstico y presupuesto", descripcion: "El técnico revisa y se arma el presupuesto" },
  { nombre: "En espera de autorización", descripcion: "Esperando que el cliente autorice" },
  { nombre: "En proceso de reparación", descripcion: "Trabajo en curso" },
  { nombre: "En período de prueba y control de calidad", descripcion: "Pruebas y control de calidad" },
  { nombre: "En proceso de lavado", descripcion: "El vehículo pasa al carwash" },
  { nombre: "Revisión antes de entrega", descripcion: "Checklist final antes de entregar" },
  { nombre: "Listo para entrega", obligatorio: true, descripcion: "Listo para cobrar y entregar" },
  { nombre: "Entregado", obligatorio: true, descripcion: "Orden cobrada y entregada (cierra la orden)" }
];

export const PASOS_CARWASH_DEFECTO = [
  { nombre: "En proceso", obligatorio: true, descripcion: "Ingreso / lavado en curso" },
  { nombre: "Listo para entrega", obligatorio: true, descripcion: "Listo para cobrar y entregar" },
  { nombre: "Entregado", obligatorio: true, descripcion: "Servicio cobrado y entregado (cierra la orden)" }
];

const DEFECTOS = { taller: PASOS_TALLER_DEFECTO, carwash: PASOS_CARWASH_DEFECTO };

const norm = (s) => String(s || "").trim().toLowerCase();

/** Lista completa de pasos configurados (activos e inactivos), siempre con los obligatorios presentes y en orden válido */
export const getPasosConfigurados = (branding, tipo = "taller") => {
  const defecto = DEFECTOS[tipo] || PASOS_TALLER_DEFECTO;
  const guardados = branding && branding.pasosOrdenes && Array.isArray(branding.pasosOrdenes[tipo])
    ? branding.pasosOrdenes[tipo]
    : null;

  let lista = (guardados && guardados.length > 0 ? guardados : defecto)
    .filter(p => p && String(p.nombre || "").trim())
    .map(p => {
      const base = defecto.find(d => norm(d.nombre) === norm(p.nombre));
      return {
        nombre: String(p.nombre).trim(),
        descripcion: p.descripcion !== undefined ? p.descripcion : (base?.descripcion || ""),
        obligatorio: !!base?.obligatorio,
        personalizado: !base,
        activo: base?.obligatorio ? true : p.activo !== false
      };
    });

  // Quitar duplicados por nombre
  const vistos = new Set();
  lista = lista.filter(p => {
    const k = norm(p.nombre);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });

  // Asegurar que existan los obligatorios
  defecto.filter(d => d.obligatorio).forEach(d => {
    if (!lista.some(p => norm(p.nombre) === norm(d.nombre))) {
      lista.push({ nombre: d.nombre, descripcion: d.descripcion, obligatorio: true, personalizado: false, activo: true });
    }
  });

  // El primer obligatorio va al inicio; "Listo para entrega" y "Entregado" siempre al final y en ese orden
  const primero = defecto[0].nombre;
  const finales = ["Listo para entrega", "Entregado"];
  const inicio = lista.filter(p => norm(p.nombre) === norm(primero));
  const medio = lista.filter(p => norm(p.nombre) !== norm(primero) && !finales.some(f => norm(f) === norm(p.nombre)));
  const fin = finales.map(f => lista.find(p => norm(p.nombre) === norm(f))).filter(Boolean);
  return [...inicio, ...medio, ...fin];
};

/** Solo los nombres de los pasos activos, en orden */
export const getPasosActivos = (branding, tipo = "taller") =>
  getPasosConfigurados(branding, tipo).filter(p => p.activo).map(p => p.nombre);

/** Siguiente paso activo a partir del estado actual (si el estado actual fue desactivado, busca el siguiente según el orden completo) */
export const getSiguientePaso = (branding, tipo, estadoActual) => {
  const todos = getPasosConfigurados(branding, tipo);
  const activos = todos.filter(p => p.activo).map(p => p.nombre);
  const idxActivo = activos.findIndex(n => norm(n) === norm(estadoActual));
  if (idxActivo !== -1) return idxActivo < activos.length - 1 ? activos[idxActivo + 1] : null;
  const idxTodos = todos.findIndex(p => norm(p.nombre) === norm(estadoActual));
  if (idxTodos === -1) return activos[1] || null; // estado desconocido: avanzar al segundo paso
  const sig = todos.slice(idxTodos + 1).find(p => p.activo);
  return sig ? sig.nombre : null;
};

/** Normaliza para guardar en la configuración */
export const serializarPasos = (lista) => (lista || []).map(p => ({
  nombre: String(p.nombre || "").trim(),
  descripcion: p.descripcion || "",
  activo: p.obligatorio ? true : p.activo !== false
})).filter(p => p.nombre);

