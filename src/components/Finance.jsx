import React, { useState } from "react";
import { createPortal } from "react-dom";
import { 
  TrendingUp, 
  Coins, 
  Wrench, 
  Car, 
  Printer, 
  DollarSign, 
  Calendar, 
  Users,
  CircleParking,
  Coffee,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShoppingBag
} from "lucide-react";
import { formatMoney, formatDate } from "../utils/storage";
import { jsPDF } from "jspdf";

export default function Finance({ 
  ordenes = [], 
  setOrdenes,
  carwash = [], 
  setCarwash,
  mecanicos = [], 
  lavadores = [], 
  parkingHistory = [], 
  cafeteriaSales = [],
  tiendaSales = [],
  usuarios = [],
  fixedCosts = [],
  vehiculosVenta = [],
  setVehiculosVenta,
  cuentasPorCobrar = [],
  cuentasPorPagar = [],
  carwashConsumption = [],
  compras = [],
  setCompras,
  payrollHistory = [],
  setPayrollHistory,
  carwashPresets = [],
  dashboardPeriod,
  setDashboardPeriod,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [breakevenPeriod, setBreakevenPeriod] = useState("mes");
  const [payrollPeriodMode, setPayrollPeriodMode] = useState("q1"); // 'q1', 'q2', 'mes', 'custom'
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth());
  const [commSubTab, setCommSubTab] = useState("planilla"); // 'planilla' or 'historial'
  const [selectedPayrollUser, setSelectedPayrollUser] = useState(null);
  const [customSueldoBaseInput, setCustomSueldoBaseInput] = useState("");
  const [selectedCommKeys, setSelectedCommKeys] = useState([]);
  const [editingBilledOrderFromFinance, setEditingBilledOrderFromFinance] = useState(null);
  const [editingBilledCarwashFromFinance, setEditingBilledCarwashFromFinance] = useState(null);

  const userRolLower = String(usuarioActual?.rol || "").toLowerCase().trim();
  const isAdmin = !usuarioActual || !usuarioActual.rol || userRolLower.includes("admin") || userRolLower.includes("gerente") || userRolLower.includes("jefe");
  const isManager = isAdmin || userRolLower.includes("cajero") || userRolLower.includes("finanzas");

  const guardarBilledOrderEditFinance = (updatedObj) => {
    if (!updatedObj) return;
    setOrdenes(prev => (prev || []).map(o => o.id === updatedObj.id ? updatedObj : o));
    setEditingBilledOrderFromFinance(null);
    alert("¡Orden facturada actualizada con éxito en Finanzas!");
  };

  const guardarBilledCarwashEditFinance = (updatedObj) => {
    if (!updatedObj) return;
    setCarwash(prev => (prev || []).map(c => c.id === updatedObj.id ? updatedObj : c));
    setEditingBilledCarwashFromFinance(null);
    alert("¡Lavado facturado actualizado con éxito en Finanzas!");
  };

  const openPayrollModal = (u) => {
    const salarioMensual = parseFloat(u.salarioBase) || 0;
    const sueldoPeriodo = payrollPeriodMode === "mes" ? salarioMensual : (salarioMensual / 2);
    const { items } = getPayrollUnpaidItems(u.user, u.rol || "Colaborador");
    const allKeys = items.map(i => `${i.type}_${i.orderId}`);
    setSelectedCommKeys(allKeys);
    setCustomSueldoBaseInput(sueldoPeriodo.toString());
    setSelectedPayrollUser({ user: u.user, rol: u.rol || "Colaborador", salarioBase: u.salarioBase || 0 });
  };

  // Default date ranges for commissions
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  };

  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const [commStart, setCommStart] = useState(getFirstDayOfMonth());
  const [commEnd, setCommEnd] = useState(getTodayDate());

  const getPayrollDateRangeInfo = () => {
    const yr = payrollYear;
    const mo = payrollMonth;
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const monthName = monthNames[mo] || "";
    let startDate, endDate, periodLabel;

    if (payrollPeriodMode === "q1") {
      startDate = new Date(yr, mo, 1, 0, 0, 0, 0);
      endDate = new Date(yr, mo, 15, 23, 59, 59, 999);
      periodLabel = `1ra Quincena de ${monthName} ${yr} (1 al 15 de ${monthName})`;
    } else if (payrollPeriodMode === "q2") {
      startDate = new Date(yr, mo, 16, 0, 0, 0, 0);
      const lastDay = new Date(yr, mo + 1, 0).getDate();
      endDate = new Date(yr, mo, lastDay, 23, 59, 59, 999);
      periodLabel = `2da Quincena de ${monthName} ${yr} (16 al ${lastDay} de ${monthName})`;
    } else if (payrollPeriodMode === "mes") {
      startDate = new Date(yr, mo, 1, 0, 0, 0, 0);
      const lastDay = new Date(yr, mo + 1, 0).getDate();
      endDate = new Date(yr, mo, lastDay, 23, 59, 59, 999);
      periodLabel = `Mes Completo de ${monthName} ${yr}`;
    } else {
      startDate = commStart ? new Date(`${commStart}T00:00:00`) : new Date(yr, mo, 1);
      endDate = commEnd ? new Date(`${commEnd}T23:59:59`) : new Date();
      periodLabel = `Período Personalizado (${commStart || "Inicio"} a ${commEnd || "Fin"})`;
    }
    return { startDate, endDate, periodLabel };
  };

  const isWithinCommDates = (dateVal, fallbackId) => {
    let d = null;
    if (dateVal) {
      d = new Date(dateVal);
    } else if (fallbackId) {
      d = new Date(fallbackId);
    }
    if (!d || isNaN(d.getTime())) return true;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    
    return dateStr >= commStart && dateStr <= commEnd;
  };

  const getItemDate = (item, dateField) => {
    if (!item || !item[dateField]) return null;
    const val = item[dateField];
    if (typeof val === "number") return new Date(val);
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
    return null;
  };

  const getPeriodBoundaries = () => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (dashboardPeriod) {
      case "dia": {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      }
      case "semana": {
        const dayOfWeek = now.getDay();
        const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday, 0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case "mes": {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
      case "ano": {
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      }
      case "personalizado": {
        if (customStartDate) {
          const [yr, mo, dy] = customStartDate.split("-").map(Number);
          start = new Date(yr, mo - 1, dy, 0, 0, 0, 0);
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        }
        if (customEndDate) {
          const [yr, mo, dy] = customEndDate.split("-").map(Number);
          end = new Date(yr, mo - 1, dy, 23, 59, 59, 999);
        } else {
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }
        break;
      }
      default: {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
    }
    return { start, end };
  };

  const filterByPeriod = (list, dateField = "fecha") => {
    if (!list) return [];
    const { start, end } = getPeriodBoundaries();
    return list.filter(item => {
      const itemDate = getItemDate(item, dateField);
      if (!itemDate) return false;
      return itemDate >= start && itemDate <= end;
    });
  };

  const periodLabels = {
    dia: "Día Actual",
    semana: "Semana Actual",
    mes: "Mes Actual",
    ano: "Año Actual",
    personalizado: "Personalizado"
  };
  const currentPeriodLabel = dashboardPeriod === "personalizado" 
    ? `${customStartDate || "Hoy"} a ${customEndDate || "Hoy"}` 
    : (periodLabels[dashboardPeriod] || "Mes");

  // Calculations for billing overview (only "Entregado" and within period)
  const billedTaller = filterByPeriod(ordenes.filter(o => o.estado === "Entregado"), "fecha");
  const billedCarwash = filterByPeriod(carwash.filter(c => c.estado === "Entregado"), "fecha");
  const filteredParking = filterByPeriod(parkingHistory, "horaSalida");
  const filteredCafeteria = filterByPeriod(cafeteriaSales, "fecha");
  const filteredTienda = filterByPeriod(tiendaSales, "fecha");

  const totalTallerRevenue = billedTaller.reduce((sum, o) => sum + o.total, 0);
  const totalCarwashRevenue = billedCarwash.reduce((sum, c) => sum + c.precio, 0);
  const totalParkingRevenue = filteredParking.reduce((sum, p) => sum + p.total, 0);
  const totalCafeteriaRevenue = filteredCafeteria.reduce((sum, s) => sum + s.total, 0);
  const totalTiendaRevenue = (filteredTienda || []).reduce((sum, t) => sum + t.total, 0);
  const totalGrandRevenue = totalTallerRevenue + totalCarwashRevenue + totalParkingRevenue + totalCafeteriaRevenue + totalTiendaRevenue;

  const totalCafeteriaCost = filteredCafeteria.reduce((sum, sale) => {
    const saleCost = sale.items ? sale.items.reduce((itemSum, item) => itemSum + (item.qty * (item.purchasePrice || 0)), 0) : 0;
    return sum + saleCost;
  }, 0);
  const totalCafeteriaMargin = totalCafeteriaRevenue - totalCafeteriaCost;

  // Split revenues: cash (efectivo) vs banks (tarjeta, transferencia, cheque)
  let cashRevenueTotal = 0;
  let bankRevenueTotal = 0;

  billedTaller.forEach(o => {
    if (o.formaPago) {
      cashRevenueTotal += parseFloat(o.formaPago.efectivo || 0);
      bankRevenueTotal += parseFloat(o.formaPago.tarjeta || 0) + parseFloat(o.formaPago.transferencia || 0) + parseFloat(o.formaPago.cheque || 0);
    } else {
      cashRevenueTotal += o.total;
    }
  });

  billedCarwash.forEach(c => {
    if (c.tallerOrderId) return; // Exclude linked carwashes to avoid double-counting
    if (c.formaPago) {
      cashRevenueTotal += parseFloat(c.formaPago.efectivo || 0);
      bankRevenueTotal += parseFloat(c.formaPago.tarjeta || 0) + parseFloat(c.formaPago.transferencia || 0) + parseFloat(c.formaPago.cheque || 0);
    } else {
      cashRevenueTotal += c.precio;
    }
  });

  filteredParking.forEach(p => {
    if (p.formaPago) {
      cashRevenueTotal += parseFloat(p.formaPago.efectivo || 0);
      bankRevenueTotal += parseFloat(p.formaPago.tarjeta || 0) + parseFloat(p.formaPago.transferencia || 0) + parseFloat(p.formaPago.cheque || 0);
    } else {
      cashRevenueTotal += p.total;
    }
  });

  filteredCafeteria.forEach(s => {
    if (s.formaPago) {
      cashRevenueTotal += parseFloat(s.formaPago.efectivo || 0);
      bankRevenueTotal += parseFloat(s.formaPago.tarjeta || 0) + parseFloat(s.formaPago.transferencia || 0) + parseFloat(s.formaPago.cheque || 0);
    } else {
      cashRevenueTotal += s.total;
    }
  });

  (filteredTienda || []).forEach(t => {
    if (t.formaPago) {
      cashRevenueTotal += parseFloat(t.formaPago.efectivo || 0);
      bankRevenueTotal += parseFloat(t.formaPago.tarjeta || 0) + parseFloat(t.formaPago.transferencia || 0) + parseFloat(t.formaPago.cheque || 0);
    } else {
      cashRevenueTotal += t.total;
    }
  });

  // Pending Billing Estimates (excluding "Entregado")
  const pendingTaller = ordenes.filter(o => o.estado !== "Entregado");
  const pendingCarwash = carwash.filter(c => c.estado !== "Entregado");

  const totalPendingTaller = pendingTaller.reduce((sum, o) => sum + o.total, 0);
  const totalPendingCarwash = pendingCarwash.reduce((sum, c) => sum + c.precio, 0);
  const totalPendingGrand = totalPendingTaller + totalPendingCarwash;

  // --- DIRECT / VARIABLE COSTS CALCULATION (FOR PERIOD) ---
  const totalTallerPartsCost = billedTaller.reduce((sum, o) => {
    if (o.presupuesto && Array.isArray(o.presupuesto.parts)) {
      return sum + o.presupuesto.parts.reduce((pSum, part) => {
        const qty = parseFloat(part.qty) || 1;
        const purchase = parseFloat(part.purchasePrice) || parseFloat(part.unitCost) || (parseFloat(part.price) * 0.7);
        return pSum + (qty * purchase);
      }, 0);
    }
    return sum;
  }, 0);

  const totalCafeteriaItemCost = filteredCafeteria.reduce((sum, s) => {
    if (s.items && Array.isArray(s.items)) {
      return sum + s.items.reduce((iSum, item) => {
        const qty = parseFloat(item.qty) || 1;
        const purchase = parseFloat(item.purchasePrice) || (parseFloat(item.price) * 0.6);
        return iSum + (qty * purchase);
      }, 0);
    }
    return sum;
  }, 0);

  const totalTiendaItemCost = (filteredTienda || []).reduce((sum, s) => {
    if (s.items && Array.isArray(s.items)) {
      return sum + s.items.reduce((iSum, item) => {
        const qty = parseFloat(item.qty) || 1;
        const purchase = parseFloat(item.purchasePrice) || (parseFloat(item.price) * 0.6);
        return iSum + (qty * purchase);
      }, 0);
    }
    return sum;
  }, 0);

  const totalCarwashSuppliesCost = (filterByPeriod(carwashConsumption || [], "fecha")).reduce((sum, c) => sum + (parseFloat(c.cost) || 0), 0);

  // General Registered Purchases & Operational Expenses in period
  const filteredCompras = filterByPeriod(compras || [], "fecha");
  const totalGeneralPurchasesPeriod = filteredCompras.reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);

  // Short-term Accounts Payable (Liabilities)
  const totalPendingAccountsPayable = (cuentasPorPagar || []).filter(p => p.estado === "Pendiente").reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);

  // Period commissions paid on delivered orders
  const periodMechanicComms = billedTaller.reduce((sum, o) => sum + (parseFloat(o.comision) || 0), 0);
  const periodWasherComms = billedCarwash.reduce((sum, c) => {
    const isWorkshopWash = c.tallerOrderId || String(c.tipo || "").toLowerCase().trim() === "lavado de taller";
    const matchedPreset = (carwashPresets || []).find(p => p.tipo && String(p.tipo).toLowerCase().trim() === String(c.tipo).toLowerCase().trim());
    const totalComm = isWorkshopWash ? 5.0 : (matchedPreset && matchedPreset.comision !== undefined ? parseFloat(matchedPreset.comision) : (parseFloat(c.comision) || 5.0));
    return sum + totalComm;
  }, 0);
  const periodCashierComms = billedTaller.reduce((sum, o) => {
    if (!o.cajero || !o.cajeroComisionApplies) return sum;
    const cashierUser = (usuarios || []).find(u => u.user.toLowerCase() === o.cajero.toLowerCase());
    const pct = cashierUser ? (cashierUser.comisionTaller / 100) : 0.10;
    const totalLabor = o.presupuesto?.labor?.reduce((lSum, item) => lSum + (parseFloat(item.price) || 0), 0) || o.total || 0;
    return sum + (totalLabor * pct);
  }, 0);

  const totalCommissionsPaidPeriod = periodMechanicComms + periodWasherComms + periodCashierComms;
  const totalVariableCostsPeriod = totalTallerPartsCost + totalCafeteriaItemCost + totalTiendaItemCost + totalCarwashSuppliesCost + totalCommissionsPaidPeriod;

  const totalContributionMarginPeriod = totalGrandRevenue - totalVariableCostsPeriod;
  const contributionMarginRatioPeriod = totalGrandRevenue > 0 ? (totalContributionMarginPeriod / totalGrandRevenue) : 0;

  // Fixed Monthly Costs
  const overheadMonthly = (fixedCosts || []).reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const salariesMonthly = (usuarios || []).reduce((sum, u) => sum + (parseFloat(u.salarioBase) || 0), 0);
  const totalMonthlyFixed = overheadMonthly + salariesMonthly;

  let periodScaleFactor = 1;
  if (dashboardPeriod === "dia") periodScaleFactor = 1 / 30;
  else if (dashboardPeriod === "semana") periodScaleFactor = 7 / 30;
  else if (dashboardPeriod === "mes") periodScaleFactor = 1;
  else if (dashboardPeriod === "ano") periodScaleFactor = 12;
  else if (dashboardPeriod === "personalizado") {
    if (customStartDate && customEndDate) {
      const diffMs = new Date(customEndDate) - new Date(customStartDate);
      const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
      periodScaleFactor = diffDays / 30;
    }
  }

  const periodFixedCosts = totalMonthlyFixed * periodScaleFactor;
  // Net Profit considering Direct Costs, Registered General Purchases, and Fixed Costs
  const netProfitPeriod = totalContributionMarginPeriod - totalGeneralPurchasesPeriod - periodFixedCosts;
  const isProfitablePeriod = netProfitPeriod >= 0;

  // Commissions Calculations per worker
  const getMechanicCommissions = (name) => {
    const workerOrders = (ordenes || []).filter(o => 
      (o.mecanico || "").toLowerCase().trim() === name.toLowerCase().trim() &&
      isWithinCommDates(o.fecha, o.id)
    );
    const cobradas = workerOrders.filter(o => o.comisionPagada === true).reduce((sum, o) => sum + (parseFloat(o.comision) || 0), 0);
    const pendientes = workerOrders.filter(o => o.comisionPagada !== true && o.estado === "Entregado").reduce((sum, o) => sum + (parseFloat(o.comision) || 0), 0);
    return { cobradas, pendientes, total: cobradas + pendientes };
  };

  const getWasherCommissions = (name) => {
    let cobradas = 0;
    let pendientes = 0;

    (carwash || []).forEach(c => {
      const list = c.lavadores && c.lavadores.length > 0
        ? c.lavadores 
        : (c.lavador ? c.lavador.split(", ").map(item => item.trim()).filter(Boolean) : []);
      
      const isAssigned = list.some(l => l.toLowerCase().trim() === name.toLowerCase().trim());
      if (isAssigned && isWithinCommDates(c.fecha, c.id)) {
        const isWorkshopWash = c.tallerOrderId || String(c.tipo || "").toLowerCase().trim() === "lavado de taller";
        const matchedPreset = (carwashPresets || []).find(p => p.tipo && String(p.tipo).toLowerCase().trim() === String(c.tipo).toLowerCase().trim());
        const totalComm = isWorkshopWash ? 5.0 : (matchedPreset && matchedPreset.comision !== undefined ? parseFloat(matchedPreset.comision) : (parseFloat(c.comision) || 5.0));
        const splitComision = list.length > 0 ? (totalComm / list.length) : totalComm;
        
        if (c.comisionPagada === true) {
          cobradas += splitComision;
        } else if (c.estado === "Entregado") {
          pendientes += splitComision;
        }
      }
    });

    return { cobradas, pendientes, total: cobradas + pendientes };
  };

  const getCashierCommissions = (name) => {
    const cashierUser = (usuarios || []).find(u => u.user.toLowerCase().trim() === name.toLowerCase().trim());
    const pctTaller = cashierUser && cashierUser.comisionTaller !== undefined 
      ? cashierUser.comisionTaller / 100 
      : 0.10;
    
    let cobradas = 0;
    let pendientes = 0;

    (ordenes || [])
      .filter(o => o.estado === "Entregado" && o.cajero && o.cajero.toLowerCase().trim() === name.toLowerCase().trim() && o.cajeroComisionApplies === true && isWithinCommDates(o.fecha, o.id))
      .forEach(o => {
        const totalLabor = o.presupuesto?.labor?.reduce((lSum, item) => lSum + (parseFloat(item.price) || 0), 0) || o.total || 0;
        const commAmt = totalLabor * pctTaller;
        if (o.cajeroComisionPagada === true) {
          cobradas += commAmt;
        } else {
          pendientes += commAmt;
        }
      });
      
    return { cobradas, pendientes, total: cobradas + pendientes };
  };

  const getVehicleCommissions = (name) => {
    let cobradas = 0;
    let pendientes = 0;
    
    (vehiculosVenta || []).forEach(v => {
      let commAmt = 0;
      let isAssigned = false;
      
      if (v.vendedoresAsignados && v.vendedoresAsignados.length > 0) {
        if (v.vendedoresAsignados.some(s => s.toLowerCase().trim() === name.toLowerCase().trim())) {
          isAssigned = true;
          commAmt = parseFloat(v.comisionTotalCalculada || 0) / v.vendedoresAsignados.length;
        }
      } else if (v.vendedorAsignado && v.vendedorAsignado.toLowerCase().trim() === name.toLowerCase().trim()) {
        isAssigned = true;
        commAmt = parseFloat(v.comisionTotalCalculada || 0);
      }
      
      if (isAssigned && isWithinCommDates(v.fechaVenta, v.id)) {
        if (v.comisionPagada === true) {
          cobradas += commAmt;
        } else if (v.estado === "Vendido") {
          pendientes += commAmt;
        }
      }
    });
    
    return { cobradas, pendientes, total: cobradas + pendientes };
  };

  const getPayrollUnpaidItems = (userName, userRol) => {
    const { startDate, endDate } = getPayrollDateRangeInfo();
    const lower = (userName || "").toLowerCase().trim();
    const items = [];
    let totalComs = 0;

    // Mechanics
    if (userRol === "mecanico" || userRol === "jefe de taller" || userRol === "admin" || userRol === "mecánico") {
      (ordenes || []).forEach(o => {
        if (o.estado === "Entregado" && o.comisionPagada !== true && (o.mecanico || "").toLowerCase().trim() === lower) {
          const d = o.fecha ? new Date(o.fecha) : new Date(o.id);
          if (d >= startDate && d <= endDate) {
            const amt = parseFloat(o.comision) || 0;
            totalComs += amt;
            items.push({
              type: "taller",
              orderId: o.id,
              titulo: `Orden Taller #${o.id}`,
              subtitulo: `${o.cliente || "Cliente"} - ${o.marca || ""} ${o.linea || ""} (${o.placa || ""})`,
              fecha: o.fecha,
              comision: amt
            });
          }
        }
      });
    }

    // Washers
    if (userRol === "lavador" || userRol === "admin") {
      (carwash || []).forEach(c => {
        const lavList = c.lavadores && c.lavadores.length > 0 ? c.lavadores : (c.lavador ? c.lavador.split(", ").map(i => i.trim()).filter(Boolean) : []);
        const isAssigned = lavList.some(l => l.toLowerCase().trim() === lower);
        if (c.estado === "Entregado" && c.comisionPagada !== true && isAssigned) {
          const d = c.fecha ? new Date(c.fecha) : new Date(c.id);
          if (d >= startDate && d <= endDate) {
            const isWorkshopWash = c.tallerOrderId || String(c.tipo || "").toLowerCase().trim() === "lavado de taller";
            const matchedPreset = (carwashPresets || []).find(p => p.tipo && String(p.tipo).toLowerCase().trim() === String(c.tipo).toLowerCase().trim());
            const totalComm = isWorkshopWash ? 5.0 : (matchedPreset && matchedPreset.comision !== undefined ? parseFloat(matchedPreset.comision) : (parseFloat(c.comision) || 5.0));
            const splitComm = lavList.length > 0 ? (totalComm / lavList.length) : totalComm;

            totalComs += splitComm;
            items.push({
              type: "carwash",
              orderId: c.id,
              titulo: `Carwash (${c.tipo})`,
              subtitulo: `${c.cliente || "Cliente"} - ${c.vehiculo?.marca || ""} ${c.vehiculo?.linea || ""} (${c.vehiculo?.placa || ""})`,
              fecha: c.fecha,
              comision: splitComm
            });
          }
        }
      });
    }

    // Cashiers
    if (userRol === "cajero" || userRol === "admin") {
      const cashierUser = (usuarios || []).find(u => u.user.toLowerCase().trim() === lower);
      const pctTaller = cashierUser && cashierUser.comisionTaller !== undefined ? cashierUser.comisionTaller / 100 : 0.10;

      (ordenes || []).forEach(o => {
        if (o.estado === "Entregado" && o.cajeroComisionPagada !== true && o.cajero && o.cajero.toLowerCase().trim() === lower && o.cajeroComisionApplies === true) {
          const d = o.fecha ? new Date(o.fecha) : new Date(o.id);
          if (d >= startDate && d <= endDate) {
            const totalLabor = o.presupuesto?.labor?.reduce((lSum, item) => lSum + (parseFloat(item.price) || 0), 0) || o.total || 0;
            const amt = totalLabor * pctTaller;
            totalComs += amt;
            items.push({
              type: "cajero",
              orderId: o.id,
              titulo: `Comisión Cajero (Orden #${o.id})`,
              subtitulo: `Cliente: ${o.cliente || "Cliente"} - Labor: ${formatMoney(totalLabor)}`,
              fecha: o.fecha,
              comision: amt
            });
          }
        }
      });
    }

    // Sales
    if (userRol === "vendedor" || userRol === "admin") {
      (vehiculosVenta || []).forEach(v => {
        let isAssigned = false;
        let commAmt = 0;
        if (v.vendedoresAsignados && v.vendedoresAsignados.length > 0) {
          if (v.vendedoresAsignados.some(s => s.toLowerCase().trim() === lower)) {
            isAssigned = true;
            commAmt = parseFloat(v.comisionTotalCalculada || 0) / v.vendedoresAsignados.length;
          }
        } else if (v.vendedorAsignado && v.vendedorAsignado.toLowerCase().trim() === lower) {
          isAssigned = true;
          commAmt = parseFloat(v.comisionTotalCalculada || 0);
        }

        if (v.estado === "Vendido" && v.comisionPagada !== true && isAssigned) {
          const d = new Date(v.fechaVenta || v.fecha || v.id);
          if (d >= startDate && d <= endDate) {
            totalComs += commAmt;
            items.push({
              type: "vehiculo",
              orderId: v.id,
              titulo: `Venta Vehículo ${v.marca} ${v.linea}`,
              subtitulo: `Placa: ${v.placa || "N/A"}`,
              fecha: v.fechaVenta || v.fecha,
              comision: commAmt
            });
          }
        }
      });
    }

    return { items, totalComs };
  };

  const handleExecutePayrollPayment = (userObj, baseSalaryOverride, items, totalComm) => {
    const { periodLabel } = getPayrollDateRangeInfo();
    const baseSal = parseFloat(baseSalaryOverride) || 0;
    const totalPaid = baseSal + totalComm;
    const payrollId = Date.now();

    // Mark orders as comisionPagada = true
    const orderIds = items.filter(i => i.type === "taller").map(i => i.orderId);
    if (orderIds.length > 0 && setOrdenes) {
      setOrdenes(prev => (prev || []).map(o => orderIds.includes(o.id) ? { ...o, comisionPagada: true, fechaPagoComision: new Date().toISOString(), payrollId } : o));
    }

    // Mark carwash as comisionPagada = true
    const carwashIds = items.filter(i => i.type === "carwash").map(i => i.orderId);
    if (carwashIds.length > 0 && setCarwash) {
      setCarwash(prev => (prev || []).map(c => carwashIds.includes(c.id) ? { ...c, comisionPagada: true, fechaPagoComision: new Date().toISOString(), payrollId } : c));
    }

    // Mark cajero commissions on orders as cajeroComisionPagada = true
    const cajeroOrderIds = items.filter(i => i.type === "cajero").map(i => i.orderId);
    if (cajeroOrderIds.length > 0 && setOrdenes) {
      setOrdenes(prev => (prev || []).map(o => cajeroOrderIds.includes(o.id) ? { ...o, cajeroComisionPagada: true, fechaPagoComision: new Date().toISOString(), payrollId } : o));
    }

    // Mark vehicle sales as comisionPagada = true
    const vehiculoIds = items.filter(i => i.type === "vehiculo").map(i => i.orderId);
    if (vehiculoIds.length > 0 && setVehiculosVenta) {
      setVehiculosVenta(prev => (prev || []).map(v => vehiculoIds.includes(v.id) ? { ...v, comisionPagada: true, fechaPagoComision: new Date().toISOString(), payrollId } : v));
    }

    // Add expense entry in compras/egresos so finance P&L reflects the cash expense
    if (setCompras) {
      const newExpense = {
        id: payrollId,
        fecha: new Date().toISOString(),
        proveedor: `Nómina - ${userObj.user}`,
        categoria: "Nómina / Planilla",
        total: totalPaid,
        descripcion: `Pago de Nómina (${periodLabel}) - Sueldo Base: Q${baseSal.toFixed(2)} + Comisiones: Q${totalComm.toFixed(2)}`,
        formaPago: { efectivo: totalPaid, tarjeta: 0, transferencia: 0, cheque: 0 },
        estado: "Pagado"
      };
      setCompras(prev => [newExpense, ...(prev || [])]);
    }

    // Record in payroll history
    const record = {
      id: payrollId,
      colaborador: userObj.user,
      rol: userObj.rol || "Colaborador",
      periodo: periodLabel,
      fechaPago: new Date().toISOString(),
      sueldoBase: baseSal,
      totalComisiones: totalComm,
      totalPagado: totalPaid,
      detallesComisiones: items,
      registradoPor: "Gerencia"
    };

    if (setPayrollHistory) {
      setPayrollHistory(prev => [record, ...(prev || [])]);
    }

    alert(`¡Nómina y Comisiones aplicadas con éxito!\n\nSe liquidó Q${totalPaid.toFixed(2)} a ${userObj.user}.\nLas comisiones fueron descontadas de la lista por pagar y registradas como egreso.`);
    setSelectedPayrollUser(null);
  };

  const imprimirReciboNominaPrint = (rec) => {
    const printWin = window.open("", "_blank");
    if (!printWin) {
      alert("Por favor permite las ventanas emergentes (popups) para ver e imprimir el recibo.");
      return;
    }

    const itemsHtml = (rec.detallesComisiones || []).map((item, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px;">${idx + 1}</td>
        <td style="padding: 8px;"><strong>${item.titulo}</strong><br/><small style="color: #6b7280;">${item.subtitulo}</small></td>
        <td style="padding: 8px;">${item.fecha ? formatDate(item.fecha) : "-"}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold;">Q${item.comision.toFixed(2)}</td>
      </tr>
    `).join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo de Nómina y Comisiones - ${rec.colaborador}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1f2937; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #1e3a8a; font-size: 22px; }
            .header p { margin: 4px 0 0 0; color: #6b7280; font-size: 13px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
            .info-item { font-size: 14px; }
            .info-item strong { color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
            th { background: #f1f5f9; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; color: #334155; }
            .summary { background: #eff6ff; padding: 15px; border-radius: 8px; border: 1px solid #bfdbfe; margin-bottom: 30px; }
            .summary-row { display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 6px; }
            .summary-row.total { font-size: 18px; font-weight: bold; color: #1e40af; border-top: 2px solid #93c5fd; padding-top: 8px; margin-top: 8px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; text-align: center; }
            .sig-line { border-top: 1px solid #64748b; padding-top: 6px; font-size: 13px; color: #475569; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏁 LOS PITS - COMPROBANTE DE NÓMINA Y COMISIONES</h1>
            <p>Registro de Pago y Liquidación Quincenal / Mensual</p>
          </div>

          <div class="info-grid">
            <div class="info-item"><strong>Colaborador:</strong> ${rec.colaborador}</div>
            <div class="info-item"><strong>Puesto / Rol:</strong> ${(rec.rol || "").toUpperCase()}</div>
            <div class="info-item"><strong>Período Pagado:</strong> ${rec.periodo}</div>
            <div class="info-item"><strong>Fecha de Pago:</strong> ${formatDate(rec.fechaPago)}</div>
            <div class="info-item"><strong>Correlativo / ID:</strong> #NOM-${rec.id.toString().slice(-6)}</div>
            <div class="info-item"><strong>Autorizado Por:</strong> ${rec.registradoPor || "Gerencia"}</div>
          </div>

          <h3>📋 Desglose de Comisiones Liquidadas</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Servicio / Trabajo Realizado</th>
                <th>Fecha</th>
                <th style="text-align: right;">Comisión</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml.length > 0 ? itemsHtml : '<tr><td colSpan="4" style="text-align:center; padding: 12px; color: #9ca3af;">Sin comisiones adicionales en este período</td></tr>'}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row">
              <span>Sueldo Base (${rec.periodo.includes("1ra") || rec.periodo.includes("2da") ? "Quincenal" : "Mensual"}):</span>
              <strong>Q${rec.sueldoBase.toFixed(2)}</strong>
            </div>
            <div class="summary-row">
              <span>Total Comisiones Liquidadas:</span>
              <strong>Q${rec.totalComisiones.toFixed(2)}</strong>
            </div>
            <div class="summary-row total">
              <span>TOTAL LÍQUIDO A RECIBIR:</span>
              <span>Q${rec.totalPagado.toFixed(2)}</span>
            </div>
          </div>

          <div class="signatures">
            <div>
              <div style="height: 40px;"></div>
              <div class="sig-line">Firma del Colaborador (Recibí Conforme)<br/><small style="font-weight:normal; color:#64748b;">${rec.colaborador}</small></div>
            </div>
            <div>
              <div style="height: 40px;"></div>
              <div class="sig-line">Firma de Gerencia / Administración<br/><small style="font-weight:normal; color:#64748b;">Los Pits App</small></div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const getCollaboratorCommissionDetails = (name, role) => {
    const list = [];
    let totalCobradas = 0;
    let totalPendientes = 0;

    const lowerName = name.toLowerCase();

    if (role === "mecanico") {
      const workerOrders = ordenes.filter(o => 
        (o.mecanico || "").toLowerCase() === lowerName &&
        isWithinCommDates(o.fecha, o.id)
      );
      workerOrders.forEach(o => {
        const isDelivered = o.estado === "Entregado";
        if (isDelivered) {
          totalCobradas += o.comision;
        } else {
          totalPendientes += o.comision;
        }
        list.push({
          placa: o.placa || "N/A",
          marca: o.marca || "N/A",
          linea: o.linea || "N/A",
          color: o.color || "N/A",
          fecha: o.fecha ? formatDate(o.fecha) : "Sin fecha",
          totalServicio: o.total,
          comision: o.comision,
          estado: o.estado,
          tipo: "Taller"
        });
      });
    } else if (role === "lavador") {
      carwash.forEach(c => {
        const lavadoresList = c.lavadores && c.lavadores.length > 0
          ? c.lavadores 
          : (c.lavador ? c.lavador.split(", ").map(item => item.trim()).filter(Boolean) : []);
        
        const isAssigned = lavadoresList.some(l => l.toLowerCase() === lowerName);
        if (isAssigned && isWithinCommDates(c.fecha, c.id)) {
          const isWorkshopWash = c.tallerOrderId || String(c.tipo || "").toLowerCase().trim() === "lavado de taller";
          const matchedPreset = (carwashPresets || []).find(p => p.tipo && String(p.tipo).toLowerCase().trim() === String(c.tipo).toLowerCase().trim());
          const totalComm = isWorkshopWash ? 5.0 : (matchedPreset && matchedPreset.comision !== undefined ? parseFloat(matchedPreset.comision) : (parseFloat(c.comision) || 5.0));
          const splitComision = lavadoresList.length > 0 ? (totalComm / lavadoresList.length) : totalComm;
          
          if (c.estado === "Entregado") {
            totalCobradas += splitComision;
          } else {
            totalPendientes += splitComision;
          }
          list.push({
            placa: c.vehiculo?.placa || "N/A",
            marca: c.vehiculo?.marca || "N/A",
            linea: c.vehiculo?.linea || "N/A",
            color: c.vehiculo?.color || "N/A",
            fecha: c.fecha ? formatDate(c.fecha) : "Sin fecha",
            totalServicio: c.precio,
            comision: splitComision,
            estado: c.estado,
            tipo: `Carwash - ${c.tipo}`
          });
        }
      });
    } else if (role === "cajero") {
      const cashierUser = (usuarios || []).find(u => u.user.toLowerCase() === lowerName);
      const pctTaller = cashierUser && cashierUser.comisionTaller !== undefined 
        ? cashierUser.comisionTaller / 100 
        : 0.10; // default 10%
      
      const cashierOrders = ordenes.filter(o => 
        o.estado === "Entregado" && 
        o.cajero && 
        o.cajero.toLowerCase() === lowerName && 
        o.cajeroComisionApplies === true &&
        isWithinCommDates(o.fecha, o.id)
      );

      cashierOrders.forEach(o => {
        const totalLabor = o.presupuesto?.labor?.reduce((lSum, item) => lSum + (parseFloat(item.price) || 0), 0) || o.total || 0;
        const commAmt = totalLabor * pctTaller;
        totalCobradas += commAmt;
        list.push({
          placa: o.placa || "N/A",
          marca: o.marca || "N/A",
          linea: o.linea || "N/A",
          color: o.color || "N/A",
          fecha: o.fecha ? formatDate(o.fecha) : "Sin fecha",
          totalServicio: o.total,
          comision: commAmt,
          estado: o.estado,
          tipo: "Taller (Caja)"
        });
      });
    } else if (role === "vendedor") {
      (vehiculosVenta || []).forEach(v => {
        let commAmt = 0;
        let isAssigned = false;
        
        if (v.vendedoresAsignados && v.vendedoresAsignados.length > 0) {
          if (v.vendedoresAsignados.some(s => s.toLowerCase() === lowerName)) {
            isAssigned = true;
            commAmt = parseFloat(v.comisionTotalCalculada || 0) / v.vendedoresAsignados.length;
          }
        } else if (v.vendedorAsignado && v.vendedorAsignado.toLowerCase() === lowerName) {
          isAssigned = true;
          commAmt = parseFloat(v.comisionTotalCalculada || 0);
        }
        
        if (isAssigned && isWithinCommDates(v.fechaVenta, v.id)) {
          if (v.estado === "Vendido") {
            totalCobradas += commAmt;
          } else {
            totalPendientes += commAmt;
          }
          list.push({
            placa: v.placa || "N/A",
            marca: v.marca || "N/A",
            linea: v.linea || "N/A",
            color: v.color || "N/A",
            fecha: v.fechaVenta ? formatDate(v.fechaVenta) : (v.fechaIngreso ? formatDate(v.fechaIngreso) : "Sin fecha"),
            totalServicio: v.precioVenta || v.precio || 0,
            comision: commAmt,
            estado: v.estado,
            tipo: "Venta de Vehículo"
          });
        }
      });
    }

    return { list, totalCobradas, totalPendientes, total: totalCobradas + totalPendientes };
  };

  const generarReporteColaborador = (colaboradorName, role) => {
    const data = getCollaboratorCommissionDetails(colaboradorName, role);
    const pdf = new jsPDF();

    const primaryColor = [20, 24, 33];
    const accentColor = [245, 158, 11];
    const successColor = [16, 185, 129];
    const mutedColor = [100, 116, 139];

    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(0, 0, 210, 40, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("LOS PITS AUTO CENTER", 15, 18);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("Reporte Detallado de Comisiones", 15, 26);
    pdf.text(`Generado: ${new Date().toLocaleDateString()}`, 160, 26);

    pdf.setFillColor(245, 247, 250);
    pdf.rect(15, 50, 180, 25, "F");
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(15, 50, 180, 25, "S");

    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("Colaborador:", 20, 60);
    pdf.setFont("helvetica", "normal");
    pdf.text(colaboradorName, 50, 60);

    pdf.setFont("helvetica", "bold");
    pdf.text("Rol/Puesto:", 20, 68);
    pdf.setFont("helvetica", "normal");
    const roleLabels = {
      mecanico: "Mecánico",
      lavador: "Lavador",
      cajero: "Cajero",
      vendedor: "Vendedor"
    };
    pdf.text(roleLabels[role] || role, 50, 68);

    pdf.setFont("helvetica", "bold");
    pdf.text("Período:", 115, 60);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${formatDate(commStart)} al ${formatDate(commEnd)}`, 135, 60);

    let y = 90;
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(15, y, 180, 8, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("Tipo / Serv.", 18, y + 6);
    pdf.text("Vehículo", 45, y + 6);
    pdf.text("Placa", 95, y + 6);
    pdf.text("Color", 115, y + 6);
    pdf.text("Entregado", 135, y + 6);
    pdf.text("Total", 165, y + 6, { align: "right" });
    pdf.text("Comisión", 192, y + 6, { align: "right" });

    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);

    if (data.list.length === 0) {
      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.text("No se encontraron transacciones en este período para el colaborador.", 20, y + 10);
      y += 15;
    } else {
      data.list.forEach((item, index) => {
        if (y > 260) {
          pdf.addPage();
          y = 20;
          pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          pdf.rect(15, y, 180, 8, "F");
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.text("Tipo / Serv.", 18, y + 6);
          pdf.text("Vehículo", 45, y + 6);
          pdf.text("Placa", 95, y + 6);
          pdf.text("Color", 115, y + 6);
          pdf.text("Entregado", 135, y + 6);
          pdf.text("Total", 165, y + 6, { align: "right" });
          pdf.text("Comisión", 192, y + 6, { align: "right" });
          y += 8;
          pdf.setFont("helvetica", "normal");
        }

        if (index % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(15, y, 180, 8, "F");
        }

        pdf.setDrawColor(241, 245, 249);
        pdf.line(15, y + 8, 195, y + 8);

        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        
        const typeStr = item.tipo.length > 15 ? item.tipo.substring(0, 15) : item.tipo;
        const vehicleStr = `${item.marca} ${item.linea}`;
        const truncateVehicle = vehicleStr.length > 25 ? vehicleStr.substring(0, 25) : vehicleStr;

        pdf.text(typeStr, 18, y + 6);
        pdf.text(truncateVehicle, 45, y + 6);
        pdf.text(item.placa, 95, y + 6);
        pdf.text(item.color.substring(0, 10), 115, y + 6);
        pdf.text(item.fecha, 135, y + 6);
        pdf.text(formatMoney(item.totalServicio), 165, y + 6, { align: "right" });
        pdf.text(formatMoney(item.comision), 192, y + 6, { align: "right" });

        y += 8;
      });
    }

    y += 10;

    if (y > 230) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFillColor(245, 247, 250);
    pdf.rect(120, y, 75, 30, "F");
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(120, y, 75, 30, "S");

    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("Resumen de Comisiones:", 125, y + 8);

    pdf.setFont("helvetica", "normal");
    pdf.text("Cobradas (Entregados):", 125, y + 15);
    pdf.text(formatMoney(data.totalCobradas), 190, y + 15, { align: "right" });

    pdf.text("Pendientes (Activos):", 125, y + 21);
    pdf.text(formatMoney(data.totalPendientes), 190, y + 21, { align: "right" });

    pdf.setDrawColor(203, 213, 225);
    pdf.line(125, y + 23, 190, y + 23);

    pdf.setFont("helvetica", "bold");
    pdf.text("Total General:", 125, y + 27);
    pdf.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    pdf.text(formatMoney(data.total), 190, y + 27, { align: "right" });

    pdf.save(`Reporte_Comisiones_${colaboradorName.replace(/\s+/g, "_")}_${commStart}_${commEnd}.pdf`);
  };

  const printReport = () => {
    window.print();
  };

  const filterByBreakevenPeriod = (list, dateField = "fecha") => {
    if (!list) return [];
    const now = new Date();
    return list.filter(item => {
      if (!item[dateField]) return false;
      const d = new Date(item[dateField]);
      if (d.getFullYear() !== now.getFullYear()) return false;
      
      const currentMonth = now.getMonth();
      const itemMonth = d.getMonth();
      
      switch (breakevenPeriod) {
        case "mes":
          return itemMonth === currentMonth;
        case "trimestre": {
          const currentQuarter = Math.floor(currentMonth / 3);
          const itemQuarter = Math.floor(itemMonth / 3);
          return currentQuarter === itemQuarter;
        }
        case "semestre": {
          const currentSemester = currentMonth < 6 ? 0 : 1;
          const itemSemester = itemMonth < 6 ? 0 : 1;
          return currentSemester === itemSemester;
        }
        case "ano":
          return true;
        default:
          return true;
      }
    });
  };

  // Combined and chronologically sorted list of transactions
  const allTransactions = [
    ...billedTaller.map(o => ({
      id: o.id,
      rawId: o.id,
      rawType: "taller",
      tipo: "Taller",
      titulo: o.cliente,
      subtitulo: o.vehiculo,
      asignado: o.mecanico,
      fecha: o.fecha,
      comision: o.comision,
      total: o.total,
      formaPagoDesc: o.formaPagoDesc
    })),
    ...billedCarwash.map(c => ({
      id: c.id,
      rawId: c.id,
      rawType: "carwash",
      tipo: "Carwash",
      titulo: c.cliente || `Lavado ${c.tipo}`,
      subtitulo: c.vehiculo ? `${c.vehiculo.marca} ${c.vehiculo.linea} (${c.vehiculo.placa})${c.tallerOrderId ? " [Taller]" : ""}` : "",
      asignado: c.lavador,
      fecha: c.fecha,
      comision: c.comision,
      total: c.tallerOrderId ? 0 : c.precio,
      formaPagoDesc: c.tallerOrderId ? "Facturado en Taller" : c.formaPagoDesc
    })),
    ...filteredParking.map(p => ({
      id: p.id,
      tipo: "Parqueo",
      titulo: `Placa ${p.placa}`,
      subtitulo: `${[p.marca, p.linea].filter(Boolean).join(" ") || "Vehículo"} (Estadía: ${p.minutos} min)`,
      asignado: "-",
      fecha: p.horaSalida,
      comision: 0,
      total: p.total,
      formaPagoDesc: p.formaPagoDesc
    })),
    ...filteredCafeteria.map(s => ({
      id: s.id,
      tipo: "Cafeteria",
      titulo: s.cliente,
      subtitulo: s.items ? s.items.map(i => `${i.name} (x${i.qty})`).join(", ") : "",
      asignado: "-",
      fecha: s.fecha,
      comision: 0,
      total: s.total,
      formaPagoDesc: s.formaPagoDesc
    })),
    ...(filteredTienda || []).map(t => ({
      id: t.id,
      tipo: "Tienda",
      titulo: t.cliente || "Venta de Tienda",
      subtitulo: t.items ? t.items.map(i => `${i.name} (x${i.qty})`).join(", ") : "",
      asignado: "-",
      fecha: t.fecha,
      comision: 0,
      total: t.total,
      formaPagoDesc: t.formaPagoDesc
    }))
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const getBadgeStyle = (tipo) => {
    switch (tipo) {
      case "Taller":
        return { borderColor: "rgba(59, 130, 246, 0.3)", color: "var(--color-primary)" };
      case "Carwash":
        return { borderColor: "rgba(16, 185, 129, 0.3)", color: "var(--color-success)" };
      case "Parqueo":
        return { borderColor: "rgba(139, 92, 246, 0.3)", color: "#8b5cf6" };
      case "Cafeteria":
        return { borderColor: "rgba(236, 72, 153, 0.3)", color: "#ec4899" };
      case "Tienda":
        return { borderColor: "rgba(245, 158, 11, 0.3)", color: "var(--color-secondary)" };
      default:
        return {};
    }
  };

  const getBadgeIcon = (tipo) => {
    switch (tipo) {
      case "Taller": return "🔧 Taller";
      case "Carwash": return "🧼 Carwash";
      case "Parqueo": return "🅿️ Parqueo";
      case "Cafeteria": return "☕ Cafetería";
      case "Tienda": return "🛒 Tienda";
      default: return tipo;
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in print-area">
      {/* Module Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Finanzas & Reportes</h1>
          <p>Análisis de recaudación, balances de caja y comisiones de colaboradores.</p>
        </div>
        <button className="btn btn-ghost hide-print" onClick={printReport} style={styles.printBtn}>
          <Printer size={18} />
          Imprimir Reporte de Caja
        </button>
      </div>

      {/* Internal Navigation Tabs (Hidden during print) */}
      <div style={styles.internalTabs} className="hide-print">
        <button 
          onClick={() => setActiveTab("overview")} 
          style={{...styles.tabBtn, ...(activeTab === "overview" ? styles.tabBtnActive : {})}}
        >
          <TrendingUp size={16} /> Balance General
        </button>
        <button 
          onClick={() => setActiveTab("commissions")} 
          style={{...styles.tabBtn, ...(activeTab === "commissions" ? styles.tabBtnActive : {})}}
        >
          <Users size={16} /> Comisiones y Nómina
        </button>
        <button 
          onClick={() => setActiveTab("breakeven")} 
          style={{...styles.tabBtn, ...(activeTab === "breakeven" ? styles.tabBtnActive : {})}}
        >
          <TrendingUp size={16} /> Punto de Equilibrio
        </button>
        <button 
          onClick={() => setActiveTab("receipts")} 
          style={{...styles.tabBtn, ...(activeTab === "receipts" ? styles.tabBtnActive : {})}}
        >
          <Coins size={16} /> Historial Facturado
        </button>
      </div>

      {/* Period Selector Controls (Shared with Dashboard) */}
      <div style={styles.filterBarRow} className="hide-print">
        <div style={styles.periodFilterBar}>
          <div style={styles.inputGroupSelect}>
            <label style={styles.filterLabel}>Rango del Reporte</label>
            <select
              value={dashboardPeriod}
              onChange={(e) => setDashboardPeriod(e.target.value)}
              style={styles.periodSelect}
            >
              <option value="dia">📅 Día Actual (Hoy)</option>
              <option value="semana">📅 Semana Actual (Lun-Dom)</option>
              <option value="mes">📅 Mes Actual (1-Fin)</option>
              <option value="ano">📅 Año Actual (Ene-Dic)</option>
              <option value="personalizado">🔍 Rango Personalizado</option>
            </select>
          </div>

          {dashboardPeriod === "personalizado" && (
            <>
              <div style={styles.inputGroupDate}>
                <label style={styles.filterLabel}>Desde</label>
                <input
                  type="date"
                  value={customStartDate || ""}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={styles.datePicker}
                />
              </div>
              <div style={styles.inputGroupDate}>
                <label style={styles.filterLabel}>Hasta</label>
                <input
                  type="date"
                  value={customEndDate || ""}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={styles.datePicker}
                />
              </div>
            </>
          )}
        </div>
        <div style={styles.selectedPeriodText}>
          Mostrando ingresos de: <strong style={{ color: "var(--color-success)" }}>{currentPeriodLabel}</strong>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      
      {/* 1. BALANCE GENERAL TAB */}
      {activeTab === "overview" && (
        <div style={styles.tabContent}>
          {/* Main Financial KPI Overview Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", marginBottom: "25px" }}>
            {/* Box 1: Facturación Bruta */}
            <div className="glass-panel" style={{ ...styles.revenueCard, borderColor: "rgba(59, 130, 246, 0.2)" }}>
              <div style={styles.cardGlowBlue} />
              <div style={styles.revHeader}>
                <DollarSign size={24} color="var(--color-primary)" />
                <span style={styles.revLabel}>Recaudación Bruta Total</span>
              </div>
              <span style={{ ...styles.revAmount, color: "#fff", fontFamily: "var(--font-display)" }}>
                {formatMoney(totalGrandRevenue)}
              </span>
              <p style={styles.revSub}>Caja (Efectivo): {formatMoney(cashRevenueTotal)} • Bancos: {formatMoney(bankRevenueTotal)}</p>
            </div>

            {/* Box 2: Costos Directos y Comisiones */}
            <div className="glass-panel" style={{ ...styles.revenueCard, borderColor: "rgba(239, 68, 68, 0.2)" }}>
              <div style={{ ...styles.cardGlowOrange, background: "radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)" }} />
              <div style={styles.revHeader}>
                <TrendingDown size={24} color="#f87171" />
                <span style={styles.revLabel}>Costos Directos y Comisiones</span>
              </div>
              <span style={{ ...styles.revAmount, color: "#f87171", fontFamily: "var(--font-display)" }}>
                {formatMoney(totalVariableCostsPeriod)}
              </span>
              <p style={styles.revSub}>Repuestos, insumos y comisiones pagadas a colaboradores.</p>
            </div>

            {/* Box 3: Utilidad Bruta (Margen) */}
            <div className="glass-panel" style={{ ...styles.revenueCard, borderColor: "rgba(16, 185, 129, 0.2)" }}>
              <div style={styles.cardGlowGreen} />
              <div style={styles.revHeader}>
                <TrendingUp size={24} color="#34d399" />
                <span style={styles.revLabel}>Utilidad Bruta (Margen)</span>
              </div>
              <span style={{ ...styles.revAmount, color: "#34d399", fontFamily: "var(--font-display)" }}>
                {formatMoney(totalContributionMarginPeriod)}
              </span>
              <p style={styles.revSub}>Margen de contribución real: {(contributionMarginRatioPeriod * 100).toFixed(1)}% de las ventas.</p>
            </div>

            {/* Box 4: Utilidad Neta Operativa */}
            <div className="glass-panel" style={{ ...styles.revenueCard, borderColor: isProfitablePeriod ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)" }}>
              <div style={{ ...styles.cardGlowGreen, background: isProfitablePeriod ? "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)" : "radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)" }} />
              <div style={styles.revHeader}>
                {isProfitablePeriod ? <CheckCircle2 size={24} color="#34d399" /> : <XCircle size={24} color="#f87171" />}
                <span style={styles.revLabel}>Utilidad Neta Operativa</span>
              </div>
              <span style={{ ...styles.revAmount, color: isProfitablePeriod ? "#34d399" : "#f87171", fontFamily: "var(--font-display)" }}>
                {formatMoney(netProfitPeriod)}
              </span>
              <p style={styles.revSub}>
                {isProfitablePeriod ? `🟢 Superávit tras cubrir ${formatMoney(periodFixedCosts)} de costos fijos.` : `🔴 Déficit tras restar ${formatMoney(periodFixedCosts)} de costos fijos.`}
              </p>
            </div>
          </div>

          {/* Breakdown by Service Types */}
          <div style={styles.breakdownContainer}>
            {/* Taller card */}
            <div className="glass-panel" style={styles.breakdownCard}>
              <div style={styles.breakdownCardHeader}>
                <div style={{ ...styles.iconBg, backgroundColor: "var(--color-primary-glow)" }}>
                  <Wrench size={20} color="var(--color-primary)" />
                </div>
                <h3>Taller Mecánico</h3>
              </div>
              <div style={styles.breakdownDetails}>
                <div style={styles.breakdownRow}>
                  <span>Total Entregado:</span>
                  <span style={styles.breakdownVal}>{formatMoney(totalTallerRevenue)}</span>
                </div>
                <div style={styles.breakdownRow}>
                  <span>Total Pendiente:</span>
                  <span style={styles.breakdownValMut}>{formatMoney(totalPendingTaller)}</span>
                </div>
                <div style={styles.breakdownRowDivider} />
                <div style={styles.breakdownRow}>
                  <strong style={{ color: "#fff" }}>Total General:</strong>
                  <strong style={{ color: "var(--color-primary)" }}>{formatMoney(totalTallerRevenue + totalPendingTaller)}</strong>
                </div>
              </div>
            </div>

            {/* Carwash card */}
            <div className="glass-panel" style={styles.breakdownCard}>
              <div style={styles.breakdownCardHeader}>
                <div style={{ ...styles.iconBg, backgroundColor: "var(--color-secondary-glow)" }}>
                  <Car size={20} color="var(--color-secondary)" />
                </div>
                <h3>Carwash & Lavado</h3>
              </div>
              <div style={styles.breakdownDetails}>
                <div style={styles.breakdownRow}>
                  <span>Total Entregado:</span>
                  <span style={styles.breakdownVal}>{formatMoney(totalCarwashRevenue)}</span>
                </div>
                <div style={styles.breakdownRow}>
                  <span>Total Pendiente:</span>
                  <span style={styles.breakdownValMut}>{formatMoney(totalPendingCarwash)}</span>
                </div>
                <div style={styles.breakdownRowDivider} />
                <div style={styles.breakdownRow}>
                  <strong style={{ color: "#fff" }}>Total General:</strong>
                  <strong style={{ color: "var(--color-secondary)" }}>{formatMoney(totalCarwashRevenue + totalPendingCarwash)}</strong>
                </div>
              </div>
            </div>

            {/* Parqueo card */}
            <div className="glass-panel" style={styles.breakdownCard}>
              <div style={styles.breakdownCardHeader}>
                <div style={{ ...styles.iconBg, backgroundColor: "rgba(139, 92, 246, 0.15)" }}>
                  <CircleParking size={20} color="#8b5cf6" />
                </div>
                <h3>Control de Parqueo</h3>
              </div>
              <div style={styles.breakdownDetails}>
                <div style={styles.breakdownRow}>
                  <span>Total Entregado:</span>
                  <span style={styles.breakdownVal}>{formatMoney(totalParkingRevenue)}</span>
                </div>
                <div style={styles.breakdownRow}>
                  <span>Margen (100%):</span>
                  <span style={{ ...styles.breakdownVal, color: "var(--color-success)" }}>{formatMoney(totalParkingRevenue)}</span>
                </div>
                <div style={styles.breakdownRowDivider} />
                <div style={styles.breakdownRow}>
                  <strong style={{ color: "#fff" }}>Total General:</strong>
                  <strong style={{ color: "#8b5cf6" }}>{formatMoney(totalParkingRevenue)}</strong>
                </div>
              </div>
            </div>

            {/* Cafetería card */}
            <div className="glass-panel" style={styles.breakdownCard}>
              <div style={styles.breakdownCardHeader}>
                <div style={{ ...styles.iconBg, backgroundColor: "rgba(236, 72, 153, 0.15)" }}>
                  <Coffee size={20} color="#ec4899" />
                </div>
                <h3>Cafetería POS</h3>
              </div>
              <div style={styles.breakdownDetails}>
                <div style={styles.breakdownRow}>
                  <span>Total Entregado:</span>
                  <span style={styles.breakdownVal}>{formatMoney(totalCafeteriaRevenue)}</span>
                </div>
                <div style={styles.breakdownRow}>
                  <span>Margen Ganancia:</span>
                  <span style={{ ...styles.breakdownVal, color: "var(--color-success)" }}>{formatMoney(totalCafeteriaMargin)}</span>
                </div>
                <div style={styles.breakdownRowDivider} />
                <div style={styles.breakdownRow}>
                  <strong style={{ color: "#fff" }}>Total General:</strong>
                  <strong style={{ color: "#ec4899" }}>{formatMoney(totalCafeteriaRevenue)}</strong>
                </div>
              </div>
            </div>

            {/* Tienda POS card */}
            <div className="glass-panel" style={styles.breakdownCard}>
              <div style={styles.breakdownCardHeader}>
                <div style={{ ...styles.iconBg, backgroundColor: "rgba(245, 158, 11, 0.15)" }}>
                  <ShoppingBag size={20} color="var(--color-secondary)" />
                </div>
                <h3>Tienda POS</h3>
              </div>
              <div style={styles.breakdownDetails}>
                <div style={styles.breakdownRow}>
                  <span>Total Ventas:</span>
                  <span style={styles.breakdownVal}>{formatMoney(totalTiendaRevenue)}</span>
                </div>
                <div style={styles.breakdownRow}>
                  <span>Costo Mercadería (COGS):</span>
                  <span style={styles.breakdownValMut}>{formatMoney(totalTiendaItemCost)}</span>
                </div>
                <div style={styles.breakdownRowDivider} />
                <div style={styles.breakdownRow}>
                  <strong style={{ color: "#fff" }}>Utilidad Bruta:</strong>
                  <strong style={{ color: "var(--color-success)" }}>{formatMoney(totalTiendaRevenue - totalTiendaItemCost)}</strong>
                </div>
              </div>
            </div>

            {/* Compras Generales & Gastos Registrados card */}
            <div className="glass-panel" style={styles.breakdownCard}>
              <div style={styles.breakdownCardHeader}>
                <div style={{ ...styles.iconBg, backgroundColor: "rgba(239, 68, 68, 0.15)" }}>
                  <TrendingDown size={20} color="#f87171" />
                </div>
                <h3>Compras y Gastos Registrados</h3>
              </div>
              <div style={styles.breakdownDetails}>
                <div style={styles.breakdownRow}>
                  <span>Egresos del Período:</span>
                  <span style={{ ...styles.breakdownVal, color: "#f87171" }}>{formatMoney(totalGeneralPurchasesPeriod)}</span>
                </div>
                <div style={styles.breakdownRow}>
                  <span>Total Registros:</span>
                  <span style={styles.breakdownValMut}>{filteredCompras.length} compras/gastos</span>
                </div>
                <div style={styles.breakdownRowDivider} />
                <div style={styles.breakdownRow}>
                  <strong style={{ color: "#fff" }}>Total Egresos Registrados:</strong>
                  <strong style={{ color: "#f87171" }}>{formatMoney(totalGeneralPurchasesPeriod)}</strong>
                </div>
              </div>
            </div>

            {/* Cuentas por Pagar (Pasivo Pendiente) card */}
            <div className="glass-panel" style={styles.breakdownCard}>
              <div style={styles.breakdownCardHeader}>
                <div style={{ ...styles.iconBg, backgroundColor: "rgba(245, 158, 11, 0.15)" }}>
                  <AlertTriangle size={20} color="var(--color-warning)" />
                </div>
                <h3>Cuentas por Pagar (Pasivo)</h3>
              </div>
              <div style={styles.breakdownDetails}>
                <div style={styles.breakdownRow}>
                  <span>Pendiente a Proveedores:</span>
                  <span style={{ ...styles.breakdownVal, color: "var(--color-warning)" }}>{formatMoney(totalPendingAccountsPayable)}</span>
                </div>
                <div style={styles.breakdownRow}>
                  <span>Facturas Pendientes:</span>
                  <span style={styles.breakdownValMut}>{(cuentasPorPagar || []).filter(p => p.estado === "Pendiente").length} cuentas</span>
                </div>
                <div style={styles.breakdownRowDivider} />
                <div style={styles.breakdownRow}>
                  <strong style={{ color: "#fff" }}>Total Pasivos Pendientes:</strong>
                  <strong style={{ color: "var(--color-warning)" }}>{formatMoney(totalPendingAccountsPayable)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. COMMISSIONS AND PAYROLL TAB */}
      {activeTab === "commissions" && (
        <div style={styles.tabContent}>
          {/* Main Card */}
          <div className="glass-panel" style={styles.sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
              <div>
                <h2 style={styles.sectionTitle}>Módulo de Nómina & Liquidador de Comisiones Quincenales</h2>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.88rem" }}>
                  Gestiona el pago de salario base quincenal/mensual y liquida comisiones acumuladas descontándolas automáticamente de pendientes.
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setCommSubTab("planilla")}
                  className="btn"
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.85rem",
                    backgroundColor: commSubTab === "planilla" ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
                    color: "#fff",
                    borderRadius: "6px",
                    fontWeight: "600"
                  }}
                >
                  💼 Planilla y Liquidación
                </button>
                <button
                  onClick={() => setCommSubTab("historial")}
                  className="btn"
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.85rem",
                    backgroundColor: commSubTab === "historial" ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
                    color: "#fff",
                    borderRadius: "6px",
                    fontWeight: "600"
                  }}
                >
                  📜 Historial de Recibos Pagados ({(payrollHistory || []).length})
                </button>
              </div>
            </div>

            {commSubTab === "planilla" && (
              <>
                {/* Period Selector Card */}
                <div style={{
                  backgroundColor: "rgba(0, 0, 0, 0.25)",
                  padding: "16px 20px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  marginBottom: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                      📅 Período de Nómina y Comisiones:
                    </span>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {[
                        { id: "q1", label: "1ra Quincena (1-15)" },
                        { id: "q2", label: "2da Quincena (16-Fin)" },
                        { id: "mes", label: "Mes Completo" },
                        { id: "custom", label: "Personalizado" }
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => setPayrollPeriodMode(p.id)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "0.8rem",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: "600",
                            backgroundColor: payrollPeriodMode === p.id ? "var(--color-primary)" : "rgba(255,255,255,0.06)",
                            color: "#fff"
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                    {payrollPeriodMode !== "custom" && (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Mes:</label>
                          <select
                            className="input-field"
                            value={payrollMonth}
                            onChange={(e) => setPayrollMonth(Number(e.target.value))}
                            style={{ padding: "4px 8px", fontSize: "0.85rem", height: "32px", width: "130px" }}
                          >
                            {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, idx) => (
                              <option key={idx} value={idx}>{m}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Año:</label>
                          <select
                            className="input-field"
                            value={payrollYear}
                            onChange={(e) => setPayrollYear(Number(e.target.value))}
                            style={{ padding: "4px 8px", fontSize: "0.85rem", height: "32px", width: "90px" }}
                          >
                            {[2024, 2025, 2026, 2027, 2028].map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {payrollPeriodMode === "custom" && (
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Desde:</label>
                          <input
                            type="date"
                            className="input-field"
                            value={commStart}
                            onChange={(e) => setCommStart(e.target.value)}
                            style={{ padding: "4px 8px", fontSize: "0.85rem", height: "32px" }}
                          />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Hasta:</label>
                          <input
                            type="date"
                            className="input-field"
                            value={commEnd}
                            onChange={(e) => setCommEnd(e.target.value)}
                            style={{ padding: "4px 8px", fontSize: "0.85rem", height: "32px" }}
                          />
                        </div>
                      </div>
                    )}

                    <div style={{ marginLeft: "auto", fontSize: "0.85rem", color: "var(--color-primary)", fontWeight: "700" }}>
                      📌 Período Seleccionado: {getPayrollDateRangeInfo().periodLabel}
                    </div>
                  </div>
                </div>

                {/* Table 1: Collaborators List */}
                <h3 style={{ ...styles.subtitle, color: "var(--color-primary)", borderBottom: "1px solid rgba(59, 130, 246, 0.2)", paddingBottom: "8px", marginBottom: "16px" }}>
                  👥 Planilla de Empleados & Comisiones Pendientes del Período
                </h3>

                <div style={styles.tableResponsive}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Colaborador / Empleado</th>
                        <th style={styles.th}>Rol / Puesto</th>
                        <th style={styles.th}>Sueldo Base Período</th>
                        <th style={styles.th}>Comisiones Pendientes Período</th>
                        <th style={styles.th}>Total Liquído A Pagar</th>
                        <th style={{ ...styles.th, textAlign: "right" }} className="hide-print">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(usuarios || []).map((u, i) => {
                        const { items, totalComs } = getPayrollUnpaidItems(u.user, u.rol);
                        const salarioMensual = parseFloat(u.salarioBase) || 0;
                        const sueldoPeriodo = payrollPeriodMode === "mes" ? salarioMensual : (salarioMensual / 2);
                        const totalLiquido = sueldoPeriodo + totalComs;

                        return (
                          <tr key={i} style={styles.tr}>
                            <td style={{ ...styles.td, fontWeight: "700", color: "#fff" }}>
                              {u.user}
                            </td>
                            <td style={styles.td}>
                              <span className="badge" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", textTransform: "capitalize" }}>
                                {u.rol || "Colaborador"}
                              </span>
                            </td>
                            <td style={{ ...styles.td, color: "#fff" }}>
                              {formatMoney(sueldoPeriodo)}
                            </td>
                            <td style={{ ...styles.td, color: totalComs > 0 ? "var(--color-warning)" : "var(--text-muted)", fontWeight: totalComs > 0 ? "bold" : "normal" }}>
                              {formatMoney(totalComs)}
                              {items.length > 0 && (
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                                  ({items.length} trabajos)
                                </span>
                              )}
                            </td>
                            <td style={{ ...styles.td, fontWeight: "800", color: "var(--color-primary)", fontSize: "0.95rem" }}>
                              {formatMoney(totalLiquido)}
                            </td>
                            <td style={{ ...styles.td, textAlign: "right" }} className="hide-print">
                              <button
                                onClick={() => openPayrollModal(u)}
                                style={{
                                  ...styles.generateReportBtn,
                                  backgroundColor: totalComs > 0 || sueldoPeriodo > 0 ? "var(--color-primary)" : "rgba(255,255,255,0.1)"
                                }}
                              >
                                💼 Liquidar Nómina / Desglose
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {commSubTab === "historial" && (
              <>
                <h3 style={{ ...styles.subtitle, color: "var(--color-secondary)", borderBottom: "1px solid rgba(168, 85, 247, 0.2)", paddingBottom: "8px", marginBottom: "16px" }}>
                  📜 Historial de Recibos y Nóminas Pagadas
                </h3>

                <div style={styles.tableResponsive}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Recibo #</th>
                        <th style={styles.th}>Colaborador</th>
                        <th style={styles.th}>Período Liquidado</th>
                        <th style={styles.th}>Fecha Pago</th>
                        <th style={styles.th}>Sueldo Base</th>
                        <th style={styles.th}>Comisiones</th>
                        <th style={styles.th}>Total Pagado</th>
                        <th style={{ ...styles.th, textAlign: "right" }} className="hide-print">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(payrollHistory || []).length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ ...styles.td, textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                            No hay recibos de nómina liquidados registrados aún.
                          </td>
                        </tr>
                      ) : (
                        (payrollHistory || []).map((rec) => (
                          <tr key={rec.id} style={styles.tr}>
                            <td style={{ ...styles.td, fontWeight: "700", color: "var(--color-primary)" }}>
                              #NOM-{rec.id.toString().slice(-6)}
                            </td>
                            <td style={{ ...styles.td, fontWeight: "700", color: "#fff" }}>
                              {rec.colaborador}
                            </td>
                            <td style={{ ...styles.td, fontSize: "0.82rem" }}>
                              {rec.periodo}
                            </td>
                            <td style={styles.td}>
                              {formatDate(rec.fechaPago)}
                            </td>
                            <td style={styles.td}>
                              {formatMoney(rec.sueldoBase || 0)}
                            </td>
                            <td style={{ ...styles.td, color: "var(--color-success)" }}>
                              {formatMoney(rec.totalComisiones || 0)}
                            </td>
                            <td style={{ ...styles.td, fontWeight: "800", color: "#fff" }}>
                              {formatMoney(rec.totalPagado || 0)}
                            </td>
                            <td style={{ ...styles.td, textAlign: "right" }} className="hide-print">
                              <button
                                onClick={() => imprimirReciboNominaPrint(rec)}
                                className="btn btn-secondary"
                                style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                              >
                                🖨️ Re-imprimir Recibo
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* PAYROLL LIQUIDATION MODAL */}
          {selectedPayrollUser && createPortal(
            (() => {
              const { items } = getPayrollUnpaidItems(selectedPayrollUser.user, selectedPayrollUser.rol);
              const selectedItems = items.filter(i => selectedCommKeys.includes(`${i.type}_${i.orderId}`));
              const totalSelectedComms = selectedItems.reduce((sum, i) => sum + i.comision, 0);
              const baseSal = parseFloat(customSueldoBaseInput) || 0;
              const totalLiquido = baseSal + totalSelectedComms;
              const { periodLabel } = getPayrollDateRangeInfo();

              const allItemKeys = items.map(i => `${i.type}_${i.orderId}`);
              const isAllSelected = items.length > 0 && selectedCommKeys.length === items.length;

              const toggleAll = () => {
                if (isAllSelected) {
                  setSelectedCommKeys([]);
                } else {
                  setSelectedCommKeys(allItemKeys);
                }
              };

              const toggleKey = (key) => {
                setSelectedCommKeys(prev => 
                  prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                );
              };

              return (
                <div style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 99999,
                  padding: "20px"
                }}>
                  <div className="glass-panel" style={{
                    padding: "30px",
                    borderRadius: "16px",
                    width: "100%",
                    maxWidth: "720px",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    textAlign: "left",
                    boxShadow: "0 25px 50px rgba(0,0,0,0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    margin: "auto"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px" }}>
                      <div>
                        <h3 style={{ fontSize: "1.3rem", fontWeight: "800", margin: 0, color: "#fff" }}>
                          💼 Liquidación de Nómina & Comisiones
                        </h3>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--color-primary)", fontWeight: "600" }}>
                          Colaborador: {selectedPayrollUser.user} ({selectedPayrollUser.rol.toUpperCase()})
                        </p>
                      </div>
                      <button 
                        onClick={() => setSelectedPayrollUser(null)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                      >
                        <XCircle size={22} />
                      </button>
                    </div>

                    <div style={{ backgroundColor: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "12px 16px", borderRadius: "10px", marginBottom: "20px" }}>
                      <div style={{ fontSize: "0.85rem", color: "#fff", fontWeight: "700" }}>
                        📌 Período a Liquidar: <span style={{ color: "var(--color-primary)" }}>{periodLabel}</span>
                      </div>
                    </div>

                    {/* Base Salary Field */}
                    <div style={{ display: "flex", gap: "16px", marginBottom: "20px", alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                          Sueldo Base del Período (Q):
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="input-field"
                          value={customSueldoBaseInput}
                          onChange={(e) => setCustomSueldoBaseInput(e.target.value)}
                          placeholder="0.00"
                          style={{ fontSize: "1rem", fontWeight: "700" }}
                        />
                      </div>
                      <div style={{ flex: 1, textAlign: "right" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Comisiones Seleccionadas:</span>
                        <span style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--color-warning)" }}>{formatMoney(totalSelectedComms)}</span>
                        {items.length > selectedItems.length && (
                          <span style={{ fontSize: "0.75rem", color: "#f87171", display: "block" }}>
                            ({items.length - selectedItems.length} pendientes se mantendrán por pagar)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unpaid Commissions Items List */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff", margin: 0 }}>
                        📋 Comisiones del Período ({selectedItems.length} de {items.length} seleccionadas):
                      </h4>
                      {items.length > 0 && (
                        <button
                          type="button"
                          onClick={toggleAll}
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "#fff",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            cursor: "pointer",
                            fontWeight: "600"
                          }}
                        >
                          {isAllSelected ? "Deseleccionar Todas" : "Seleccionar Todas"}
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", marginBottom: "24px" }}>
                      {items.length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                          No hay comisiones pendientes de pago en este período de fechas.
                        </div>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.2)" }}>
                              <th style={{ padding: "8px 12px", width: "40px", textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={isAllSelected}
                                  onChange={toggleAll}
                                  style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--color-primary)" }}
                                />
                              </th>
                              <th style={{ padding: "8px 12px", color: "var(--text-muted)", textAlign: "left" }}>Trabajo / Servicio</th>
                              <th style={{ padding: "8px 12px", color: "var(--text-muted)", textAlign: "left" }}>Fecha</th>
                              <th style={{ padding: "8px 12px", color: "var(--text-muted)", textAlign: "right" }}>Comisión</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => {
                              const key = `${item.type}_${item.orderId}`;
                              const isSelected = selectedCommKeys.includes(key);

                              return (
                                <tr 
                                  key={idx} 
                                  onClick={() => toggleKey(key)}
                                  style={{ 
                                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                                    backgroundColor: isSelected ? "rgba(59, 130, 246, 0.05)" : "transparent",
                                    cursor: "pointer"
                                  }}
                                >
                                  <td style={{ padding: "8px 12px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleKey(key)}
                                      style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--color-primary)" }}
                                    />
                                  </td>
                                  <td style={{ padding: "8px 12px" }}>
                                    <div style={{ fontWeight: "700", color: isSelected ? "#fff" : "var(--text-muted)" }}>{item.titulo}</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.subtitulo}</div>
                                  </td>
                                  <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>
                                    {item.fecha ? formatDate(item.fecha) : "-"}
                                  </td>
                                  <td style={{ padding: "8px 12px", textAlign: "right", color: isSelected ? "var(--color-success)" : "var(--text-muted)", fontWeight: "700" }}>
                                    {formatMoney(item.comision)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Total Liquido Summary Box */}
                    <div style={{
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      padding: "16px",
                      borderRadius: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "24px"
                    }}>
                      <div>
                        <span style={{ fontSize: "0.8rem", color: "#34d399", fontWeight: "700", textTransform: "uppercase" }}>TOTAL LÍQUIDO A APLICAR</span>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          Sueldo Base (Q{baseSal.toFixed(2)}) + Comisiones Seleccionadas (Q{totalSelectedComms.toFixed(2)})
                        </div>
                      </div>
                      <span style={{ fontSize: "1.8rem", fontWeight: "900", color: "#34d399" }}>
                        {formatMoney(totalLiquido)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedPayrollUser(null)}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => imprimirReciboNominaPrint({
                          id: Date.now(),
                          colaborador: selectedPayrollUser.user,
                          rol: selectedPayrollUser.rol,
                          periodo: periodLabel,
                          fechaPago: new Date().toISOString(),
                          sueldoBase: baseSal,
                          totalComisiones: totalSelectedComms,
                          totalPagado: totalLiquido,
                          detallesComisiones: selectedItems,
                          registradoPor: "Gerencia"
                        })}
                        className="btn"
                        style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
                      >
                        🖨️ Pre-Ver Recibo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecutePayrollPayment(selectedPayrollUser, customSueldoBaseInput, selectedItems, totalSelectedComms)}
                        className="btn btn-primary"
                        style={{ flex: 1.5, backgroundColor: "var(--color-success)", borderColor: "var(--color-success)", fontWeight: "800" }}
                      >
                        ✅ Aplicar Pago ({selectedItems.length} Comisiones)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })(),
            document.body
          )}
        </div>
      )}

      {/* 4. PUNTO DE EQUILIBRIO TAB */}
      {activeTab === "breakeven" && (() => {
        // Filter transactions in breakeven period
        const periodTaller = filterByBreakevenPeriod(billedTaller, "fecha");
        const periodCarwash = filterByBreakevenPeriod(billedCarwash, "fecha");
        const periodParking = filterByBreakevenPeriod(parkingHistory, "horaSalida");
        const periodCafeteria = filterByBreakevenPeriod(cafeteriaSales, "fecha");
        const periodTienda = filterByBreakevenPeriod(tiendaSales, "fecha");

        const revTaller = periodTaller.reduce((sum, o) => sum + o.total, 0);
        const revCarwash = periodCarwash.reduce((sum, c) => sum + (c.tallerOrderId ? 0 : c.precio), 0);
        const revParking = periodParking.reduce((sum, p) => sum + p.total, 0);
        const revCafeteria = periodCafeteria.reduce((sum, cf) => sum + cf.total, 0);
        const revTienda = periodTienda.reduce((sum, t) => sum + t.total, 0);
        
        const totalRev = revTaller + revCarwash + revParking + revCafeteria + revTienda;

        // Direct / Variable costs calculation
        const partsCost = periodTaller.reduce((sum, o) => {
          if (o.presupuesto && Array.isArray(o.presupuesto.parts)) {
            return sum + o.presupuesto.parts.reduce((pSum, part) => {
              const qty = parseFloat(part.qty) || 1;
              const purchase = parseFloat(part.purchasePrice) || parseFloat(part.unitCost) || (parseFloat(part.price) * 0.7);
              return pSum + (qty * purchase);
            }, 0);
          }
          return sum;
        }, 0);

        const cafeteriaCost = periodCafeteria.reduce((sum, s) => {
          if (s.items && Array.isArray(s.items)) {
            return sum + s.items.reduce((iSum, item) => iSum + ((parseFloat(item.qty) || 1) * (parseFloat(item.purchasePrice) || (parseFloat(item.price) * 0.6))), 0);
          }
          return sum;
        }, 0);

        const tiendaCost = (periodTienda || []).reduce((sum, s) => {
          if (s.items && Array.isArray(s.items)) {
            return sum + s.items.reduce((iSum, item) => iSum + ((parseFloat(item.qty) || 1) * (parseFloat(item.purchasePrice) || (parseFloat(item.price) * 0.6))), 0);
          }
          return sum;
        }, 0);

        const carwashSuppliesBE = (filterByBreakevenPeriod(carwashConsumption || [], "fecha")).reduce((sum, c) => sum + (parseFloat(c.cost) || 0), 0);
        const comprasBE = (filterByBreakevenPeriod(compras || [], "fecha")).reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);

        const commsPaid = periodTaller.reduce((sum, o) => sum + (parseFloat(o.comision) || 0), 0) +
                          periodCarwash.reduce((sum, c) => sum + (parseFloat(c.comision) || 0), 0);

        const totalVariableCosts = partsCost + cafeteriaCost + tiendaCost + carwashSuppliesBE + commsPaid;
        const totalContributionMargin = totalRev - totalVariableCosts;
        const marginRatio = totalRev > 0 ? (totalContributionMargin / totalRev) : 0;

        // Fixed Costs calculation
        const overheadMonthly = (fixedCosts || []).reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
        const salariesMonthly = (usuarios || []).reduce((sum, u) => sum + (parseFloat(u.salarioBase) || 0), 0);
        const totalMonthlyFixed = overheadMonthly + salariesMonthly;

        let scale = 1;
        let periodName = "Mensual";
        if (breakevenPeriod === "trimestre") {
          scale = 3;
          periodName = "Trimestral";
        } else if (breakevenPeriod === "semestre") {
          scale = 6;
          periodName = "Semestral";
        } else if (breakevenPeriod === "ano") {
          scale = 12;
          periodName = "Anual";
        }

        const periodFixed = totalMonthlyFixed * scale;
        const periodOverhead = overheadMonthly * scale;
        const periodSalaries = salariesMonthly * scale;

        // Net Operating Result & BE Cobertura
        const netProfit = totalContributionMargin - comprasBE - periodFixed;
        const reachedBE = totalContributionMargin >= (periodFixed + comprasBE);
        const progressPercent = (periodFixed + comprasBE) > 0 ? Math.min((Math.max(0, totalContributionMargin) / (periodFixed + comprasBE)) * 100, 100) : 0;
        const requiredGrossSales = marginRatio > 0 ? ((periodFixed + comprasBE) / marginRatio) : (periodFixed + comprasBE);

        return (
          <div style={styles.tabContent}>
            {/* Period Selector Card */}
            <div className="glass-panel text-left" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: "700" }}>Punto de Equilibrio Financiero</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Mide si la <strong>Utilidad Bruta (Margen de Contribución)</strong> cubre los <strong>Costos Fijos Operativos y Compras Generales</strong>.
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { id: "mes", label: "Mensual" },
                  { id: "trimestre", label: "Trimestral" },
                  { id: "semestre", label: "Semestral" },
                  { id: "ano", label: "Anual" }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setBreakevenPeriod(p.id)}
                    className="btn"
                    style={{
                      padding: "8px 16px",
                      fontSize: "0.85rem",
                      backgroundColor: breakevenPeriod === p.id ? "var(--color-primary)" : "rgba(255, 255, 255, 0.05)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "600",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Break-even Graphic Panel */}
            <div className="glass-panel" style={{ padding: "30px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
              <div style={{
                position: "absolute",
                top: "-40px",
                right: "-40px",
                width: "150px",
                height: "150px",
                borderRadius: "50%",
                background: reachedBE 
                  ? "radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)" 
                  : "radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%)",
                filter: "blur(20px)"
              }} />

              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Cobertura de Costos y Egresos por Utilidad Bruta ({periodName})
                </span>
                <h1 style={{ fontSize: "3.2rem", fontWeight: "900", color: reachedBE ? "#10b981" : "#ef4444", marginTop: "8px", fontFamily: "var(--font-display)" }}>
                  {progressPercent.toFixed(1)}%
                </h1>
                <p style={{ color: reachedBE ? "#34d399" : "#f87171", fontSize: "0.95rem", fontWeight: "600", marginTop: "6px" }}>
                  {reachedBE 
                    ? `🟢 ¡Punto de Equilibrio Alcanzado! Tu Utilidad Bruta (${formatMoney(totalContributionMargin)}) cubre los ${formatMoney(periodFixed + comprasBE)} de costos fijos y compras, generando una Utilidad Neta de ${formatMoney(netProfit)}.` 
                    : `🔴 En Faltante de Equilibrio. Tu Utilidad Bruta (${formatMoney(totalContributionMargin)}) no cubre los ${formatMoney(periodFixed + comprasBE)} de egresos totales. Faltan ${formatMoney(Math.abs(netProfit))} de Utilidad Bruta para el equilibrio.`
                  }
                </p>
              </div>

              {/* Progress Bar */}
              <div style={{ width: "100%", maxWidth: "650px" }}>
                <div style={{ height: "14px", width: "100%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "7px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{
                    height: "100%",
                    width: `${progressPercent}%`,
                    backgroundColor: reachedBE ? "#10b981" : "#ef4444",
                    boxShadow: reachedBE ? "0 0 10px rgba(16, 185, 129, 0.5)" : "0 0 10px rgba(239, 68, 68, 0.5)",
                    transition: "width 0.5s ease-out"
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  <span>Utilidad Bruta Generada: <strong>{formatMoney(totalContributionMargin)}</strong></span>
                  <span>Egresos & Costos Fijos Meta: <strong>{formatMoney(periodFixed + comprasBE)}</strong></span>
                </div>
              </div>

              {/* Target Sales Box */}
              <div style={{
                width: "100%",
                maxWidth: "650px",
                padding: "14px 18px",
                borderRadius: "10px",
                background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "0.88rem",
                textAlign: "left"
              }}>
                <TrendingUp size={24} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                <div>
                  <span style={{ color: "#fff", fontWeight: "700" }}>Ventas Brutas Totales Requeridas: </span>
                  <span style={{ color: "var(--color-primary)", fontWeight: "800" }}>{formatMoney(requiredGrossSales)}</span>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Con tu margen de utilidad bruta actual del <strong>{(marginRatio * 100).toFixed(1)}%</strong>, necesitas facturar <strong>{formatMoney(requiredGrossSales)}</strong> en ventas para cubrir todos tus egresos y costos de {formatMoney(periodFixed + comprasBE)}.
                  </p>
                </div>
              </div>
            </div>

            {/* Income & Cost Details Breakdown (P&L Financial Statement) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
              {/* Card 1: Ingresos Brutos */}
              <div className="glass-panel" style={{ padding: "20px", textAlign: "left" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "14px", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <DollarSign size={18} /> (1) Ingresos Brutos ({periodName})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>🔧 Taller Mecánico:</span>
                    <strong>{formatMoney(revTaller)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>🧼 Carwash & Lavados:</span>
                    <strong>{formatMoney(revCarwash)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>🅿️ Estacionamiento:</span>
                    <strong>{formatMoney(revParking)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>☕ Cafetería:</span>
                    <strong>{formatMoney(revCafeteria)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>🛒 Tienda POS:</span>
                    <strong>{formatMoney(revTienda)}</strong>
                  </div>
                  <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", color: "#fff" }}>
                    <span>Total Ingresos Brutos (V):</span>
                    <span style={{ color: "var(--color-primary)" }}>{formatMoney(totalRev)}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Costos Directos / Variables */}
              <div className="glass-panel" style={{ padding: "20px", textAlign: "left" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "14px", color: "#f87171", display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingDown size={18} /> (2) Costos Variables ({periodName})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Costo Repuestos Taller:</span>
                    <strong>{formatMoney(partsCost)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Costo Mercadería Cafetería:</span>
                    <strong>{formatMoney(cafeteriaCost)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Costo Mercadería Tienda:</span>
                    <strong>{formatMoney(tiendaCost)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Insumos Carwash:</span>
                    <strong>{formatMoney(carwashSuppliesBE)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Comisiones de Personal:</span>
                    <strong>{formatMoney(commsPaid)}</strong>
                  </div>
                  <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", color: "#fff" }}>
                    <span>Total Costos Variables (CV):</span>
                    <span style={{ color: "#f87171" }}>{formatMoney(totalVariableCosts)}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Utilidad Bruta & Costos Fijos */}
              <div className="glass-panel" style={{ padding: "20px", textAlign: "left" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "14px", color: "#34d399", display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUp size={18} /> (3) Margen, Compras y Ganancia Neta
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700" }}>
                    <span>Utilidad Bruta (MC = V - CV):</span>
                    <span style={{ color: "#34d399" }}>{formatMoney(totalContributionMargin)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    <span>Margen de Ganancia %:</span>
                    <span>{(marginRatio * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>(-) Compras/Gastos Registrados:</span>
                    <strong style={{ color: "#f87171" }}>{formatMoney(comprasBE)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>(-) Costos Fijos (Planilla/Overhead):</span>
                    <strong style={{ color: "#ef4444" }}>{formatMoney(periodFixed)}</strong>
                  </div>
                  <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800" }}>
                    <span>(=) Utilidad Neta Final:</span>
                    <span style={{ color: netProfit >= 0 ? "#34d399" : "#f87171" }}>{formatMoney(netProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. RECEIPTS HISTORIAL TAB */}
      {activeTab === "receipts" && (
        <div style={styles.tabContent}>
          <div className="glass-panel" style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Historial de Servicios Facturados (Cerrados)</h2>
            <p style={{ marginBottom: "24px" }}>Listado cronológico de todos los cobros recibidos y liquidados en caja con sus formas de pago.</p>

            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Tipo Servicio</th>
                    <th style={styles.th}>Cliente / Servicio</th>
                    <th style={styles.th}>Asignado a</th>
                    <th style={styles.th}>Fecha Entregado</th>
                    <th style={styles.th}>Método de Pago</th>
                    <th style={styles.th}>Comisión</th>
                    <th style={styles.th}>Total Entregado</th>
                    {isManager && <th style={styles.th}>Acción Admin</th>}
                  </tr>
                </thead>
                <tbody>
                  {allTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={isManager ? 8 : 7} style={{ ...styles.td, textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                        No hay servicios entregados registrados en el historial de caja.
                      </td>
                    </tr>
                  ) : (
                    allTransactions.map((tx) => (
                      <tr key={tx.id} style={styles.tr}>
                        <td style={styles.td}>
                          <span className="badge badge-paid" style={{ ...getBadgeStyle(tx.tipo), borderWidth: "1px", borderStyle: "solid" }}>
                            {getBadgeIcon(tx.tipo)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: "700", color: "#fff" }}>{tx.titulo}</div>
                          {tx.subtitulo && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{tx.subtitulo}</div>}
                        </td>
                        <td style={styles.td}>{tx.asignado}</td>
                        <td style={styles.td}>{formatDate(tx.fecha)}</td>
                        <td style={styles.td}>
                          <span style={{ fontSize: "0.82rem", color: "var(--color-primary)", fontWeight: "600" }}>
                            {tx.formaPagoDesc || "EFECTIVO"}
                          </span>
                        </td>
                        <td style={{ ...styles.td, color: tx.comision > 0 ? "var(--color-success)" : "var(--text-muted)" }}>
                          {tx.comision > 0 ? formatMoney(tx.comision) : "-"}
                        </td>
                        <td style={{ ...styles.td, fontWeight: "700", color: "#fff" }}>{formatMoney(tx.total)}</td>
                        {isManager && (
                          <td style={styles.td}>
                            {(tx.rawType === "taller" || tx.rawType === "carwash") && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (tx.rawType === "taller") {
                                    const ord = (ordenes || []).find(o => String(o.id) === String(tx.rawId));
                                    if (ord) setEditingBilledOrderFromFinance({ ...ord });
                                  } else if (tx.rawType === "carwash") {
                                    const cw = (carwash || []).find(c => String(c.id) === String(tx.rawId));
                                    if (cw) setEditingBilledCarwashFromFinance({ ...cw });
                                  }
                                }}
                                className="btn btn-secondary"
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "0.75rem",
                                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                                  borderColor: "rgba(245, 158, 11, 0.4)",
                                  color: "#fde047",
                                  fontWeight: "700"
                                }}
                              >
                                ✏️ Editar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Printable Area Styling CSS */}
      <style>{`
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
          }
          #root {
            display: block !important;
          }
          aside {
            display: none !important;
          }
          .hide-print {
            display: none !important;
          }
          .glass-panel {
            background: none !important;
            border: 1px solid #ddd !important;
            color: #000 !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
          }
          .print-area {
            width: 100% !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th {
            background-color: #f3f4f6 !important;
            color: #000 !important;
            border: 1px solid #ddd !important;
          }
          td {
            border: 1px solid #ddd !important;
            color: #000 !important;
          }
          h1, h2, h3, h4, span, strong, td, th {
            color: #000 !important;
          }
        }
      `}</style>

      {/* ADMIN EDIT BILLED ORDER MODAL FROM FINANCE */}
      {editingBilledOrderFromFinance && createPortal(
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: "20px"
        }}>
          <div className="glass-panel" style={{
            padding: "30px",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "680px",
            maxHeight: "90vh",
            overflowY: "auto",
            textAlign: "left",
            boxShadow: "0 25px 50px rgba(0,0,0,0.7)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            margin: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "800", margin: 0, color: "#fff" }}>
                  ✏️ Editar Orden Taller Facturada (Finanzas)
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--color-primary)", fontWeight: "600" }}>
                  Orden Taller #{editingBilledOrderFromFinance.id} - Edición de Administrador
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingBilledOrderFromFinance(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.4rem" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              guardarBilledOrderEditFinance(editingBilledOrderFromFinance);
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Nombre del Cliente:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBilledOrderFromFinance.cliente || ""}
                    onChange={(e) => setEditingBilledOrderFromFinance({ ...editingBilledOrderFromFinance, cliente: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Teléfono:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBilledOrderFromFinance.telefono || ""}
                    onChange={(e) => setEditingBilledOrderFromFinance({ ...editingBilledOrderFromFinance, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>NIT:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBilledOrderFromFinance.nit || "C/F"}
                    onChange={(e) => setEditingBilledOrderFromFinance({ ...editingBilledOrderFromFinance, nit: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Nombre Facturación:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBilledOrderFromFinance.nombreFacturacion || ""}
                    onChange={(e) => setEditingBilledOrderFromFinance({ ...editingBilledOrderFromFinance, nombreFacturacion: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Placa:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBilledOrderFromFinance.placa || ""}
                    onChange={(e) => setEditingBilledOrderFromFinance({ ...editingBilledOrderFromFinance, placa: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Marca:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBilledOrderFromFinance.marca || ""}
                    onChange={(e) => setEditingBilledOrderFromFinance({ ...editingBilledOrderFromFinance, marca: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Línea / Modelo:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBilledOrderFromFinance.linea || ""}
                    onChange={(e) => setEditingBilledOrderFromFinance({ ...editingBilledOrderFromFinance, linea: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Mecánico Asignado:</label>
                  <select
                    className="select-field"
                    value={editingBilledOrderFromFinance.mecanico || ""}
                    onChange={(e) => setEditingBilledOrderFromFinance({ ...editingBilledOrderFromFinance, mecanico: e.target.value })}
                  >
                    <option value="">Sin mecánico</option>
                    {mecanicos.map((m, idx) => (
                      <option key={idx} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Total Cobrado (Q):</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input-field"
                    value={editingBilledOrderFromFinance.total || 0}
                    onChange={(e) => setEditingBilledOrderFromFinance({ ...editingBilledOrderFromFinance, total: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Comisión (Q):</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input-field"
                    value={editingBilledOrderFromFinance.comision || 0}
                    onChange={(e) => setEditingBilledOrderFromFinance({ ...editingBilledOrderFromFinance, comision: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Motivo de Ingreso / Descripción:</label>
                <textarea
                  className="input-field"
                  rows="2"
                  value={editingBilledOrderFromFinance.motivoIngreso || editingBilledOrderFromFinance.trabajo || ""}
                  onChange={(e) => setEditingBilledOrderFromFinance({ ...editingBilledOrderFromFinance, motivoIngreso: e.target.value, trabajo: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setEditingBilledOrderFromFinance(null)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: "var(--color-success)", borderColor: "var(--color-success)", fontWeight: "800" }}
                >
                  💾 Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ADMIN EDIT BILLED CARWASH MODAL FROM FINANCE */}
      {editingBilledCarwashFromFinance && createPortal(
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: "20px"
        }}>
          <div className="glass-panel" style={{
            padding: "30px",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "650px",
            maxHeight: "90vh",
            overflowY: "auto",
            textAlign: "left",
            boxShadow: "0 25px 50px rgba(0,0,0,0.7)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            margin: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "800", margin: 0, color: "#fff" }}>
                  ✏️ Editar Servicio Carwash Facturado (Finanzas)
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--color-primary)", fontWeight: "600" }}>
                  Carwash #{editingBilledCarwashFromFinance.id} - Edición de Administrador
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingBilledCarwashFromFinance(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.4rem" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              guardarBilledCarwashEditFinance(editingBilledCarwashFromFinance);
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Nombre del Cliente:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBilledCarwashFromFinance.cliente || ""}
                    onChange={(e) => setEditingBilledCarwashFromFinance({ ...editingBilledCarwashFromFinance, cliente: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Teléfono:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBilledCarwashFromFinance.telefono || ""}
                    onChange={(e) => setEditingBilledCarwashFromFinance({ ...editingBilledCarwashFromFinance, telefono: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Placa:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBilledCarwashFromFinance.vehiculo?.placa || ""}
                    onChange={(e) => setEditingBilledCarwashFromFinance({
                      ...editingBilledCarwashFromFinance,
                      vehiculo: { ...(editingBilledCarwashFromFinance.vehiculo || {}), placa: e.target.value.toUpperCase() }
                    })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Marca:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBilledCarwashFromFinance.vehiculo?.marca || ""}
                    onChange={(e) => setEditingBilledCarwashFromFinance({
                      ...editingBilledCarwashFromFinance,
                      vehiculo: { ...(editingBilledCarwashFromFinance.vehiculo || {}), marca: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Línea / Modelo:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBilledCarwashFromFinance.vehiculo?.linea || ""}
                    onChange={(e) => setEditingBilledCarwashFromFinance({
                      ...editingBilledCarwashFromFinance,
                      vehiculo: { ...(editingBilledCarwashFromFinance.vehiculo || {}), linea: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Tipo de Lavado:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBilledCarwashFromFinance.tipo || ""}
                    onChange={(e) => setEditingBilledCarwashFromFinance({ ...editingBilledCarwashFromFinance, tipo: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Precio Cobrado (Q):</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input-field"
                    value={editingBilledCarwashFromFinance.precio || 0}
                    onChange={(e) => setEditingBilledCarwashFromFinance({ ...editingBilledCarwashFromFinance, precio: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Comisión Lavadores (Q):</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input-field"
                    value={editingBilledCarwashFromFinance.comision || 0}
                    onChange={(e) => setEditingBilledCarwashFromFinance({ ...editingBilledCarwashFromFinance, comision: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Lavador(es) Asignado(s):</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej. Luis, Carlos"
                  value={editingBilledCarwashFromFinance.lavador || ""}
                  onChange={(e) => setEditingBilledCarwashFromFinance({
                    ...editingBilledCarwashFromFinance,
                    lavador: e.target.value,
                    lavadores: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                  })}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setEditingBilledCarwashFromFinance(null)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: "var(--color-success)", borderColor: "var(--color-success)", fontWeight: "800" }}
                >
                  💾 Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    display: "flex",
    flexDirection: "column",
    gap: "30px",
    width: "100%",
    overflowY: "auto",
    height: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    textAlign: "left",
  },
  title: {
    fontSize: "2.2rem",
    fontWeight: "800",
    marginBottom: "5px",
    background: "linear-gradient(135deg, #fff 60%, var(--color-success) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  printBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  internalTabs: {
    display: "flex",
    gap: "10px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    paddingBottom: "10px",
  },
  tabBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    background: "transparent",
    border: "none",
    borderRadius: "8px",
    color: "var(--text-muted)",
    fontWeight: "600",
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "var(--transition-smooth)",
  },
  tabBtnActive: {
    color: "#fff",
    background: "rgba(255, 255, 255, 0.05)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
  },
  tabContent: {
    display: "flex",
    flexDirection: "column",
    gap: "30px",
    width: "100%",
  },
  revenueRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
  },
  revenueCard: {
    position: "relative",
    padding: "30px",
    textAlign: "left",
    overflow: "hidden",
  },
  cardGlowGreen: {
    position: "absolute",
    top: "-30px",
    left: "-30px",
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)",
    filter: "blur(20px)",
  },
  cardGlowOrange: {
    position: "absolute",
    top: "-30px",
    left: "-30px",
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)",
    filter: "blur(20px)",
  },
  cardGlowBlue: {
    position: "absolute",
    top: "-30px",
    left: "-30px",
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)",
    filter: "blur(20px)",
  },
  revHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },
  revLabel: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "var(--text-muted)",
  },
  revAmount: {
    fontSize: "2.6rem",
    fontWeight: "900",
    marginBottom: "8px",
    display: "block",
  },
  revSub: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  },
  breakdownContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "30px",
  },
  breakdownCard: {
    padding: "24px",
    textAlign: "left",
  },
  breakdownCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },
  iconBg: {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  breakdownDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  breakdownRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.95rem",
    color: "var(--text-muted)",
  },
  breakdownVal: {
    fontWeight: "700",
    color: "#fff",
  },
  breakdownValMut: {
    fontWeight: "600",
  },
  breakdownRowDivider: {
    height: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    margin: "4px 0",
  },
  sectionCard: {
    padding: "30px",
    textAlign: "left",
  },
  sectionTitle: {
    fontSize: "1.4rem",
    fontWeight: "800",
    marginBottom: "8px",
  },
  tableResponsive: {
    width: "100%",
    overflowX: "auto",
    marginTop: "16px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    padding: "16px",
    fontSize: "0.85rem",
    fontWeight: "700",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    borderBottom: "2px solid rgba(255, 255, 255, 0.08)",
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    transition: "background-color 0.2s ease",
    ":hover": {
      backgroundColor: "rgba(255, 255, 255, 0.01)",
    },
  },
  td: {
    padding: "16px",
    fontSize: "0.95rem",
    color: "var(--text-muted)",
  },
  filterRow: {
    display: "flex",
    gap: "20px",
    marginBottom: "24px",
    flexWrap: "wrap",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.05)"
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  filterLabel: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    fontWeight: "600"
  },
  dateInput: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(20, 24, 33, 0.8)",
    color: "#fff",
    fontSize: "0.85rem",
    outline: "none",
    width: "150px"
  },
  generateReportBtn: {
    padding: "6px 12px",
    fontSize: "0.8rem",
    fontWeight: "600",
    borderRadius: "6px",
    cursor: "pointer",
    border: "none",
    backgroundColor: "var(--color-primary)",
    color: "#fff",
    transition: "all 0.2s ease"
  },
  filterBarRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    padding: "12px 18px",
    borderRadius: "14px",
    border: "1px solid rgba(255, 255, 255, 0.03)",
    marginBottom: "15px",
  },
  periodFilterBar: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  inputGroupSelect: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
  },
  inputGroupDate: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
  },
  periodSelect: {
    padding: "8px 12px",
    background: "rgba(20, 24, 33, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    outline: "none",
  },
  datePicker: {
    padding: "8px 12px",
    background: "rgba(20, 24, 33, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "0.85rem",
    cursor: "pointer",
    outline: "none",
  },
  selectedPeriodText: {
    fontSize: "0.88rem",
    color: "var(--text-muted)",
  }
};
