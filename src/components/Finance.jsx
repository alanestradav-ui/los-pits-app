import React, { useState } from "react";
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
  Coffee
} from "lucide-react";
import { formatMoney, formatDate } from "../utils/storage";
import { jsPDF } from "jspdf";

export default function Finance({ 
  ordenes, 
  carwash, 
  mecanicos, 
  lavadores, 
  parkingHistory = [], 
  cafeteriaSales = [],
  tiendaSales = [],
  usuarios = [],
  fixedCosts = [],
  vehiculosVenta = [],
  cuentasPorCobrar = [],
  cuentasPorPagar = [],
  dashboardPeriod,
  setDashboardPeriod,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [breakevenPeriod, setBreakevenPeriod] = useState("mes");

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

  // Commissions Calculations per worker
  const getMechanicCommissions = (name) => {
    // Calculated from ready or delivered orders
    const workerOrders = ordenes.filter(o => 
      (o.mecanico || "").toLowerCase() === name.toLowerCase() &&
      isWithinCommDates(o.fecha, o.id)
    );
    const cobradas = workerOrders.filter(o => o.estado === "Entregado").reduce((sum, o) => sum + o.comision, 0);
    const pendientes = workerOrders.filter(o => o.estado !== "Entregado").reduce((sum, o) => sum + o.comision, 0);
    return { cobradas, pendientes, total: cobradas + pendientes };
  };

  const getWasherCommissions = (name) => {
    let cobradas = 0;
    let pendientes = 0;

    carwash.forEach(c => {
      const list = c.lavadores && c.lavadores.length > 0
        ? c.lavadores 
        : (c.lavador ? c.lavador.split(", ").map(item => item.trim()).filter(Boolean) : []);
      
      const isAssigned = list.some(l => l.toLowerCase() === name.toLowerCase());
      if (isAssigned && isWithinCommDates(c.fecha, c.id)) {
        const washerUser = (usuarios || []).find(u => u.user.toLowerCase() === name.toLowerCase());
        const splitComision = washerUser && washerUser.comisionCarwash !== undefined 
          ? parseFloat(washerUser.comisionCarwash) 
          : (list.length > 0 ? (c.comision / list.length) : 0);
        if (c.estado === "Entregado") {
          cobradas += splitComision;
        } else {
          pendientes += splitComision;
        }
      }
    });

    return { cobradas, pendientes, total: cobradas + pendientes };
  };

  const getCashierCommissions = (name) => {
    const cashierUser = (usuarios || []).find(u => u.user.toLowerCase() === name.toLowerCase());
    const pctTaller = cashierUser && cashierUser.comisionTaller !== undefined 
      ? cashierUser.comisionTaller / 100 
      : 0.10; // default 10%
    
    const cobradas = ordenes
      .filter(o => o.estado === "Entregado" && o.cajero && o.cajero.toLowerCase() === name.toLowerCase() && o.cajeroComisionApplies !== false && isWithinCommDates(o.fecha, o.id))
      .reduce((sum, o) => {
        const totalLabor = o.presupuesto?.labor?.reduce((lSum, item) => lSum + (parseFloat(item.price) || 0), 0) || o.total || 0;
        return sum + (totalLabor * pctTaller);
      }, 0);
      
    return { cobradas, pendientes: 0, total: cobradas };
  };

  const getVehicleCommissions = (name) => {
    let cobradas = 0;
    let pendientes = 0;
    
    (vehiculosVenta || []).forEach(v => {
      let commAmt = 0;
      let isAssigned = false;
      
      if (v.vendedoresAsignados && v.vendedoresAsignados.length > 0) {
        if (v.vendedoresAsignados.some(s => s.toLowerCase() === name.toLowerCase())) {
          isAssigned = true;
          commAmt = parseFloat(v.comisionTotalCalculada || 0) / v.vendedoresAsignados.length;
        }
      } else if (v.vendedorAsignado && v.vendedorAsignado.toLowerCase() === name.toLowerCase()) {
        isAssigned = true;
        commAmt = parseFloat(v.comisionTotalCalculada || 0);
      }
      
      if (isAssigned && isWithinCommDates(v.fechaVenta, v.id)) {
        if (v.estado === "Vendido") {
          cobradas += commAmt;
        } else {
          pendientes += commAmt;
        }
      }
    });
    
    return { cobradas, pendientes, total: cobradas + pendientes };
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
          const washerUser = (usuarios || []).find(u => u.user.toLowerCase() === lowerName);
          const splitComision = washerUser && washerUser.comisionCarwash !== undefined 
            ? parseFloat(washerUser.comisionCarwash) 
            : (lavadoresList.length > 0 ? (c.comision / lavadoresList.length) : 0);
          
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
        o.cajeroComisionApplies !== false &&
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
      tipo: "Carwash",
      titulo: c.cliente || `Lavado ${c.tipo}`,
      subtitulo: c.vehiculo ? `${c.vehiculo.marca} ${c.vehiculo.linea} (${c.vehiculo.placa})` : "",
      asignado: c.lavador,
      fecha: c.fecha,
      comision: c.comision,
      total: c.precio,
      formaPagoDesc: c.formaPagoDesc
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
          {/* Main revenue stats */}
          <div style={styles.revenueRow}>
            {/* Box 1: Caja (Efectivo) */}
            <div className="glass-panel" style={{ ...styles.revenueCard, borderColor: "rgba(16, 185, 129, 0.2)" }}>
              <div style={styles.cardGlowGreen} />
              <div style={styles.revHeader}>
                <Coins size={24} color="var(--color-success)" />
                <span style={styles.revLabel}>Recaudado en Caja (Efectivo)</span>
              </div>
              <span style={{ ...styles.revAmount, color: "var(--color-success)", fontFamily: "var(--font-display)" }}>
                {formatMoney(cashRevenueTotal)}
              </span>
              <p style={styles.revSub}>Total acumulado cobrado en efectivo físico.</p>
            </div>

            {/* Box 2: Bancos (Otros Métodos) */}
            <div className="glass-panel" style={{ ...styles.revenueCard, borderColor: "rgba(59, 130, 246, 0.2)" }}>
              <div style={styles.cardGlowBlue} />
              <div style={styles.revHeader}>
                <TrendingUp size={24} color="var(--color-primary)" />
                <span style={styles.revLabel}>Recaudado en Bancos</span>
              </div>
              <span style={{ ...styles.revAmount, color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>
                {formatMoney(bankRevenueTotal)}
              </span>
              <p style={styles.revSub}>Tarjetas, transferencias y cheques depositados.</p>
            </div>

            {/* Box 2: Pending */}
            <div className="glass-panel" style={{ ...styles.revenueCard, borderColor: "rgba(245, 158, 11, 0.2)" }}>
              <div style={styles.cardGlowOrange} />
              <div style={styles.revHeader}>
                <Calendar size={24} color="var(--color-warning)" />
                <span style={styles.revLabel}>Flujo Pendiente (Activo / Listo)</span>
              </div>
              <span style={{ ...styles.revAmount, color: "var(--color-warning)", fontFamily: "var(--font-display)" }}>
                {formatMoney(totalPendingGrand)}
              </span>
              <p style={styles.revSub}>Estimación del valor de los vehículos actualmente en taller o carwash.</p>
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
                <div style={{ ...styles.iconBg, backgroundColor: "var(--color-secondary-glow)" }}>
                  <Coins size={20} color="var(--color-secondary)" />
                </div>
                <h3>Tienda POS</h3>
              </div>
              <div style={styles.breakdownDetails}>
                <div style={styles.breakdownRow}>
                  <span>Total Entregado:</span>
                  <span style={styles.breakdownVal}>{formatMoney(totalTiendaRevenue)}</span>
                </div>
                <div style={styles.breakdownRow}>
                  <span>Margen (100%):</span>
                  <span style={{ ...styles.breakdownVal, color: "var(--color-success)" }}>{formatMoney(totalTiendaRevenue)}</span>
                </div>
                <div style={styles.breakdownRowDivider} />
                <div style={styles.breakdownRow}>
                  <strong style={{ color: "#fff" }}>Total General:</strong>
                  <strong style={{ color: "var(--color-secondary)" }}>{formatMoney(totalTiendaRevenue)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. COMMISSIONS TAB */}
      {activeTab === "commissions" && (
        <div style={styles.tabContent}>
          <div className="glass-panel" style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Comisiones por Colaborador</h2>
            <p style={{ marginBottom: "20px" }}>Control detallado del dinero devengado por cada mecánico, lavador, cajero y vendedor.</p>

            {/* Date Filters Row */}
            <div style={styles.filterRow} className="hide-print">
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Fecha Inicio:</label>
                <input
                  type="date"
                  value={commStart}
                  onChange={(e) => setCommStart(e.target.value)}
                  style={styles.dateInput}
                />
              </div>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Fecha Fin:</label>
                <input
                  type="date"
                  value={commEnd}
                  onChange={(e) => setCommEnd(e.target.value)}
                  style={styles.dateInput}
                />
              </div>
            </div>

             <h3 style={{ ...styles.subtitle, color: "var(--color-primary)", borderBottom: "1px solid rgba(59, 130, 246, 0.2)", paddingBottom: "8px", marginBottom: "16px", marginTop: "16px" }}>
              🔧 Mecánicos (Comisión porcentual)
            </h3>
            
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre del Mecánico</th>
                    <th style={styles.th}>Comisiones Cobradas</th>
                    <th style={styles.th}>Comisiones Pendientes</th>
                    <th style={styles.th}>Total Acumulado</th>
                    <th style={{ ...styles.th, textAlign: "right" }} className="hide-print">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {mecanicos.map((m, i) => {
                    const comms = getMechanicCommissions(m);
                    return (
                      <tr key={i} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: "700", color: "#fff" }}>{m}</td>
                        <td style={{ ...styles.td, color: "var(--color-success)" }}>{formatMoney(comms.cobradas)}</td>
                        <td style={{ ...styles.td, color: "var(--color-warning)" }}>{formatMoney(comms.pendientes)}</td>
                        <td style={{ ...styles.td, fontWeight: "700", color: "#fff" }}>{formatMoney(comms.total)}</td>
                        <td style={{ ...styles.td, textAlign: "right" }} className="hide-print">
                          <button
                            onClick={() => generarReporteColaborador(m, "mecanico")}
                            style={styles.generateReportBtn}
                          >
                            Generar Reporte
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h3 style={{ ...styles.subtitle, color: "var(--color-secondary)", borderBottom: "1px solid rgba(168, 85, 247, 0.2)", paddingBottom: "8px", marginTop: "32px", marginBottom: "16px" }}>
              🧼 Lavadores (Comisión fija por servicio)
            </h3>

            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre del Lavador</th>
                    <th style={styles.th}>Comisiones Cobradas</th>
                    <th style={styles.th}>Comisiones Pendientes</th>
                    <th style={styles.th}>Total Acumulado</th>
                    <th style={{ ...styles.th, textAlign: "right" }} className="hide-print">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {lavadores.map((l, i) => {
                    const comms = getWasherCommissions(l);
                    return (
                      <tr key={i} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: "700", color: "#fff" }}>{l}</td>
                        <td style={{ ...styles.td, color: "var(--color-success)" }}>{formatMoney(comms.cobradas)}</td>
                        <td style={{ ...styles.td, color: "var(--color-warning)" }}>{formatMoney(comms.pendientes)}</td>
                        <td style={{ ...styles.td, fontWeight: "700", color: "#fff" }}>{formatMoney(comms.total)}</td>
                        <td style={{ ...styles.td, textAlign: "right" }} className="hide-print">
                          <button
                            onClick={() => generarReporteColaborador(l, "lavador")}
                            style={styles.generateReportBtn}
                          >
                            Generar Reporte
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h3 style={{ ...styles.subtitle, color: "var(--color-primary)", borderBottom: "1px solid rgba(59, 130, 246, 0.2)", paddingBottom: "8px", marginTop: "32px", marginBottom: "16px" }}>
              💵 Cajeros (Comisión sobre mano de obra en taller)
            </h3>

            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre del Cajero</th>
                    <th style={styles.th}>Comisión Taller</th>
                    <th style={styles.th}>Salario Base</th>
                    <th style={styles.th}>Total Nómina</th>
                    <th style={{ ...styles.th, textAlign: "right" }} className="hide-print">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {(usuarios || []).filter(u => u.rol === "cajero").map((c, i) => {
                    const comms = getCashierCommissions(c.user);
                    const salario = parseFloat(c.salarioBase) || 0;
                    return (
                      <tr key={i} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: "700", color: "#fff" }}>{c.user}</td>
                        <td style={{ ...styles.td, color: "var(--color-success)" }}>{formatMoney(comms.cobradas)}</td>
                        <td style={{ ...styles.td, color: "#fff" }}>{formatMoney(salario)}</td>
                        <td style={{ ...styles.td, fontWeight: "700", color: "var(--color-primary)" }}>{formatMoney(comms.cobradas + salario)}</td>
                        <td style={{ ...styles.td, textAlign: "right" }} className="hide-print">
                          <button
                            onClick={() => generarReporteColaborador(c.user, "cajero")}
                            style={styles.generateReportBtn}
                          >
                            Generar Reporte
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h3 style={{ ...styles.subtitle, color: "var(--color-secondary)", borderBottom: "1px solid rgba(168, 85, 247, 0.2)", paddingBottom: "8px", marginTop: "32px", marginBottom: "16px" }}>
              🚗 Comisiones por Venta de Vehículos (Porcentaje o Monto Fijo)
            </h3>

            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre del Colaborador</th>
                    <th style={styles.th}>Comisiones Cobradas (Vendido)</th>
                    <th style={styles.th}>Comisiones Pendientes (Disponible)</th>
                    <th style={styles.th}>Total Acumulado</th>
                    <th style={{ ...styles.th, textAlign: "right" }} className="hide-print">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {(usuarios || []).map((u, i) => {
                    const comms = getVehicleCommissions(u.user);
                    if (comms.total === 0) return null;
                    return (
                      <tr key={i} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: "700", color: "#fff" }}>{u.user}</td>
                        <td style={{ ...styles.td, color: "var(--color-success)" }}>{formatMoney(comms.cobradas)}</td>
                        <td style={{ ...styles.td, color: "var(--color-warning)" }}>{formatMoney(comms.pendientes)}</td>
                        <td style={{ ...styles.td, fontWeight: "700", color: "#fff" }}>{formatMoney(comms.total)}</td>
                        <td style={{ ...styles.td, textAlign: "right" }} className="hide-print">
                          <button
                            onClick={() => generarReporteColaborador(u.user, "vendedor")}
                            style={styles.generateReportBtn}
                          >
                            Generar Reporte
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!(usuarios || []).some(u => getVehicleCommissions(u.user).total > 0) && (
                    <tr style={styles.tr}>
                      <td colSpan="5" style={{ ...styles.td, textAlign: "center", color: "var(--text-muted)", padding: "16px" }}>
                        No hay comisiones de venta asignadas a colaboradores.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
        const revCarwash = periodCarwash.reduce((sum, c) => sum + c.precio, 0);
        const revParking = periodParking.reduce((sum, p) => sum + p.total, 0);
        const revCafeteria = periodCafeteria.reduce((sum, cf) => sum + cf.total, 0);
        const revTienda = periodTienda.reduce((sum, t) => sum + t.total, 0);
        
        const totalRev = revTaller + revCarwash + revParking + revCafeteria + revTienda;

        // Calculate Fixed Costs
        const overheadMonthly = (fixedCosts || []).reduce((sum, c) => sum + (c.amount || 0), 0);
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

        const progressPercent = Math.min((totalRev / (periodFixed || 1)) * 100, 100);
        const balance = totalRev - periodFixed;
        const reachedBE = totalRev >= periodFixed;

        return (
          <div style={styles.tabContent}>
            {/* Period Selector Card */}
            <div className="glass-panel text-left" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: "700" }}>Punto de Equilibrio Financiero</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>Analiza los ingresos vs. egresos fijos del taller y planilla.</p>
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
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Progreso del Periodo ({periodName})
                </span>
                <h1 style={{ fontSize: "3.2rem", fontWeight: "900", color: reachedBE ? "#10b981" : "#ef4444", marginTop: "8px", fontFamily: "var(--font-display)" }}>
                  {progressPercent.toFixed(1)}%
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "6px" }}>
                  {reachedBE 
                    ? `🟢 Has superado el punto de equilibrio por ${formatMoney(balance)}` 
                    : `🔴 Faltan ${formatMoney(Math.abs(balance))} para cubrir costos fijos`
                  }
                </p>
              </div>

              {/* Progress Bar */}
              <div style={{ width: "100%", maxWidth: "600px" }}>
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
                  <span>Recaudado: {formatMoney(totalRev)}</span>
                  <span>Meta: {formatMoney(periodFixed)}</span>
                </div>
              </div>
            </div>

            {/* Income & Cost Details Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "25px" }}>
              {/* Cost Card */}
              <div className="glass-panel" style={{ padding: "24px", textAlign: "left" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "16px", color: "#ef4444", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444" }}></span> Costos Fijos ({periodName})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>Gastos Administrativos / Fijos:</span>
                    <strong style={{ color: "#fff" }}>{formatMoney(periodOverhead)}</strong>
                  </div>
                  {fixedCosts.map(c => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-muted)", paddingLeft: "12px" }}>
                      <span>• {c.name}:</span>
                      <span>{formatMoney(c.amount * scale)}</span>
                    </div>
                  ))}
                  <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.04)", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>Planilla Base (Colaboradores):</span>
                    <strong style={{ color: "#fff" }}>{formatMoney(periodSalaries)}</strong>
                  </div>
                  {usuarios.map((u, index) => (
                    <div key={index} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-muted)", paddingLeft: "12px" }}>
                      <span>• {u.user} ({u.rol}):</span>
                      <span>{formatMoney((u.salarioBase || 0) * scale)}</span>
                    </div>
                  ))}
                  <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "6px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem", fontWeight: "800", color: "#fff" }}>
                    <span>Total Costos Fijos:</span>
                    <span style={{ color: "#ef4444" }}>{formatMoney(periodFixed)}</span>
                  </div>
                </div>
              </div>

              {/* Revenue Card */}
              <div className="glass-panel" style={{ padding: "24px", textAlign: "left" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "16px", color: "#10b981", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981" }}></span> Ingresos Reales ({periodName})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>🔧 Taller Mecánico:</span>
                    <strong style={{ color: "#fff" }}>{formatMoney(revTaller)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-muted)", paddingLeft: "12px" }}>
                    <span>• {periodTaller.length} Vehículos entregados</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>🧼 Carwash & Lavados:</span>
                    <strong style={{ color: "#fff" }}>{formatMoney(revCarwash)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-muted)", paddingLeft: "12px" }}>
                    <span>• {periodCarwash.length} Servicios entregados</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>🅿️ Estacionamiento:</span>
                    <strong style={{ color: "#fff" }}>{formatMoney(revParking)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>☕ Cafetería Ventas:</span>
                    <strong style={{ color: "#fff" }}>{formatMoney(revCafeteria)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>🛒 Tienda Ventas:</span>
                    <strong style={{ color: "#fff" }}>{formatMoney(revTienda)}</strong>
                  </div>
                  <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "6px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem", fontWeight: "800", color: "#fff" }}>
                    <span>Total Ingresos:</span>
                    <span style={{ color: "#10b981" }}>{formatMoney(totalRev)}</span>
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
                  </tr>
                </thead>
                <tbody>
                  {allTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ ...styles.td, textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
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
