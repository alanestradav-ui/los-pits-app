// src/utils/workshopCalc.js
// Cálculos compartidos del taller: comisiones de mano de obra, garantías y trabajos externos.

const norm = (s) => String(s || "").toLowerCase().trim();

export const findUser = (usuarios, name) =>
  (usuarios || []).find(u => u && norm(u.user) === norm(name));

/**
 * ¿Esta línea de mano de obra genera comisión? Por defecto SÍ (casilla activada).
 */
export const laborComisiona = (item) => !item || item.comisiona !== false;

/**
 * Total de mano de obra que sí genera comisión (excluye líneas con la casilla desactivada).
 */
export const getCommissionableLabor = (presupuesto) =>
  ((presupuesto && presupuesto.labor) || []).reduce(
    (sum, item) => sum + (laborComisiona(item) ? (parseFloat(item?.price) || 0) : 0),
    0
  );

/**
 * Comisión del técnico asignado a una orden, respetando la configuración del colaborador
 * y la casilla de comisión de cada línea de mano de obra.
 * @param {number} defaultPct porcentaje por defecto como fracción (ej. 0.10)
 */
export const calcOrderCommission = (orderObj, usuarios, defaultPct = 0.10) => {
  if (!orderObj) return 0;
  const mechName = orderObj.mecanico;
  if (!mechName) return 0;
  const mechUser = findUser(usuarios, mechName);

  const comisionarLabor = mechUser ? (mechUser.comisionarLabor !== undefined ? mechUser.comisionarLabor : true) : true;
  const comisionarRepuestos = mechUser ? (mechUser.comisionarRepuestos !== undefined ? mechUser.comisionarRepuestos : false) : false;
  const pctLabor = mechUser && mechUser.comisionTaller !== undefined && mechUser.comisionTaller !== ""
    ? Number(mechUser.comisionTaller) / 100
    : (Number(defaultPct) || 0);
  const pctRepuestos = mechUser && mechUser.comisionRepuestos !== undefined ? Number(mechUser.comisionRepuestos) / 100 : 0;

  let laborComm = 0;
  let repuestosComm = 0;
  if (orderObj.presupuesto) {
    if (comisionarLabor) laborComm = getCommissionableLabor(orderObj.presupuesto) * pctLabor;
    if (comisionarRepuestos) {
      const util = (orderObj.presupuesto.parts || []).reduce((sum, part) => {
        return sum + Math.max(0, (Number(part?.salePrice || 0) - Number(part?.purchasePrice || 0)) * Number(part?.qty || 0));
      }, 0);
      repuestosComm = util * pctRepuestos;
    }
  } else if (comisionarLabor) {
    laborComm = Number(orderObj.total || 0) * pctLabor;
  }
  return Math.round((laborComm + repuestosComm) * 100) / 100;
};

const normRolCalc = (r) => String(r || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/**
 * Roles de supervisión (administrador / jefe de taller / gerente): comisionan sobre la
 * utilidad de repuestos de TODAS las órdenes entregadas, no solo las que tienen asignadas.
 */
export const isSupervisorRol = (rol) => {
  const r = normRolCalc(rol);
  return r === "admin" || r === "administrador" || r === "administradora" || r === "jefe de taller" || r === "jefe" || r === "gerente";
};

/** Utilidad (venta - costo) de los repuestos de una orden. */
export const getPartsProfit = (presupuesto) =>
  ((presupuesto && presupuesto.parts) || []).reduce((sum, part) =>
    sum + Math.max(0, (Number(part?.salePrice || 0) - Number(part?.purchasePrice || 0)) * Number(part?.qty || 0)), 0);

/**
 * Comisión de supervisión sobre repuestos para un usuario que NO es el técnico de la orden
 * (si es el técnico, ya va incluida en calcOrderCommission).
 */
export const calcSupervisorPartsCommission = (orderObj, userObj) => {
  if (!orderObj || !userObj || !orderObj.presupuesto) return 0;
  if (userObj.comisionarRepuestos !== true || !isSupervisorRol(userObj.rol)) return 0;
  if (norm(orderObj.mecanico) === norm(userObj.user)) return 0;
  const pct = (Number(userObj.comisionRepuestos) || 0) / 100;
  if (pct <= 0) return 0;
  return Math.round(getPartsProfit(orderObj.presupuesto) * pct * 100) / 100;
};

/** Comisión fija de Carwash (Q) configurada en el usuario, si está activada. */
export const getUserCarwashFixedCommission = (userObj) =>
  userObj && userObj.comisionarCarwash === true ? (Number(userObj.comisionCarwash) || 0) : 0;

/**
 * Monto de penalización por garantía de una orden.
 * order.garantia = { activa, tecnico, tipo: "monto"|"porcentaje", valor, base, monto }
 */
export const getWarrantyPenalty = (order) => {
  const g = order && order.garantia;
  if (!g || !g.activa) return 0;
  if (g.tipo === "porcentaje") {
    const base = parseFloat(g.base) || 0;
    return Math.round(base * ((parseFloat(g.valor) || 0) / 100) * 100) / 100;
  }
  return parseFloat(g.valor) || 0;
};

/**
 * Busca la última orden entregada (no garantía) del mismo vehículo para sugerir
 * técnico y la mano de obra pagada sobre ese vehículo.
 */
export const findPreviousOrderForPlate = (ordenes, placa, excludeId = null) => {
  const p = norm(placa).replace(/[\s-]/g, "");
  if (!p) return null;
  const list = (ordenes || []).filter(o => {
    if (!o || (excludeId && String(o.id) === String(excludeId))) return false;
    if (o.garantia && o.garantia.activa) return false;
    return norm(o.placa).replace(/[\s-]/g, "") === p && o.estado === "Entregado";
  });
  list.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  return list[0] || null;
};

/**
 * Trabajos externos (servicios de terceros) sin costo registrado.
 * Se revisan órdenes activas y entregadas en los últimos 45 días.
 */
export const getMissingExternalCosts = (ordenes) => {
  const out = [];
  const limit = Date.now() - 45 * 24 * 60 * 60 * 1000;
  (ordenes || []).forEach(o => {
    if (!o || !o.presupuesto || !Array.isArray(o.presupuesto.services)) return;
    if (o.estado === "Entregado") {
      const t = new Date(o.fecha || 0).getTime();
      if (!t || t < limit) return;
    }
    o.presupuesto.services.forEach((s, idx) => {
      if (!s || s.sinCosto) return;
      const cost = parseFloat(s.purchasePrice ?? s.cost ?? 0) || 0;
      if (cost > 0) return;
      if (!String(s.desc || "").trim() && !(parseFloat(s.price) > 0)) return;
      out.push({ order: o, idx, service: s });
    });
  });
  return out;
};

/**
 * Lista de todos los trabajos externos con su proveedor, costo y pagos/anticipos.
 */
export const getExternalJobs = (ordenes) => {
  const out = [];
  (ordenes || []).forEach(o => {
    if (!o || !o.presupuesto || !Array.isArray(o.presupuesto.services)) return;
    o.presupuesto.services.forEach((s, idx) => {
      if (!s) return;
      const costo = parseFloat(s.purchasePrice ?? s.cost ?? 0) || 0;
      const pagos = Array.isArray(s.pagos) ? s.pagos : [];
      const pagado = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
      out.push({
        order: o,
        idx,
        service: s,
        proveedor: String(s.proveedor || "").trim() || "Sin proveedor asignado",
        costo,
        pagado,
        saldo: Math.round((costo - pagado) * 100) / 100,
        pagos
      });
    });
  });
  return out;
};

/**
 * Convierte "YYYY-MM-DD" en fecha LOCAL (mediodía) para evitar que se corra un día
 * por la zona horaria. Otras fechas se interpretan normalmente.
 */
export const parseLocalDate = (val) => {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return new Date(val);
  const s = String(val);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};
