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
  vehiculosVenta = []
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [breakevenPeriod, setBreakevenPeriod] = useState("mes");

  // Calculations for billing overview (only "Entregado")
  const billedTaller = ordenes.filter(o => o.estado === "Entregado");
  const billedCarwash = carwash.filter(c => c.estado === "Entregado");

  const totalTallerRevenue = billedTaller.reduce((sum, o) => sum + o.total, 0);
  const totalCarwashRevenue = billedCarwash.reduce((sum, c) => sum + c.precio, 0);
  const totalParkingRevenue = parkingHistory.reduce((sum, p) => sum + p.total, 0);
  const totalCafeteriaRevenue = cafeteriaSales.reduce((sum, s) => sum + s.total, 0);
  const totalGrandRevenue = totalTallerRevenue + totalCarwashRevenue + totalParkingRevenue + totalCafeteriaRevenue;

  const totalCafeteriaCost = cafeteriaSales.reduce((sum, sale) => {
    const saleCost = sale.items ? sale.items.reduce((itemSum, item) => itemSum + (item.qty * (item.purchasePrice || 0)), 0) : 0;
    return sum + saleCost;
  }, 0);
  const totalCafeteriaMargin = totalCafeteriaRevenue - totalCafeteriaCost;

  // Pending Billing Estimates (excluding "Entregado")
  const pendingTaller = ordenes.filter(o => o.estado !== "Entregado");
  const pendingCarwash = carwash.filter(c => c.estado !== "Entregado");

  const totalPendingTaller = pendingTaller.reduce((sum, o) => sum + o.total, 0);
  const totalPendingCarwash = pendingCarwash.reduce((sum, c) => sum + c.precio, 0);
  const totalPendingGrand = totalPendingTaller + totalPendingCarwash;

  // Commissions Calculations per worker
  const getMechanicCommissions = (name) => {
    // Calculated from ready or delivered orders
    const workerOrders = ordenes.filter(o => o.mecanico.toLowerCase() === name.toLowerCase());
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
      if (isAssigned) {
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
      .filter(o => o.estado === "Entregado" && o.cajero && o.cajero.toLowerCase() === name.toLowerCase() && o.cajeroComisionApplies !== false)
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
      
      if (isAssigned) {
        if (v.estado === "Vendido") {
          cobradas += commAmt;
        } else {
          pendientes += commAmt;
        }
      }
    });
    
    return { cobradas, pendientes, total: cobradas + pendientes };
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
    ...parkingHistory.map(p => ({
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
    ...cafeteriaSales.map(s => ({
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
    ...(tiendaSales || []).map(t => ({
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

      {/* RENDER ACTIVE TAB */}
      
      {/* 1. BALANCE GENERAL TAB */}
      {activeTab === "overview" && (
        <div style={styles.tabContent}>
          {/* Main revenue stats */}
          <div style={styles.revenueRow}>
            {/* Box 1: Billed */}
            <div className="glass-panel" style={{ ...styles.revenueCard, borderColor: "rgba(16, 185, 129, 0.2)" }}>
              <div style={styles.cardGlowGreen} />
              <div style={styles.revHeader}>
                <Coins size={24} color="var(--color-success)" />
                <span style={styles.revLabel}>Total Entregado (En Caja)</span>
              </div>
              <span style={{ ...styles.revAmount, color: "var(--color-success)", fontFamily: "var(--font-display)" }}>
                {formatMoney(totalGrandRevenue)}
              </span>
              <p style={styles.revSub}>Total acumulado de trabajos facturados y entregados.</p>
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
          </div>
        </div>
      )}

      {/* 2. COMMISSIONS TAB */}
      {activeTab === "commissions" && (
        <div style={styles.tabContent}>
          <div className="glass-panel" style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Comisiones por Colaborador</h2>
            <p style={{ marginBottom: "24px" }}>Control detallado del dinero devengado por cada mecánico y lavador, ideal para cálculo de nómina diaria o semanal.</p>

             <h3 style={{ ...styles.subtitle, color: "var(--color-primary)", borderBottom: "1px solid rgba(59, 130, 246, 0.2)", paddingBottom: "8px", marginBottom: "16px" }}>
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
                      </tr>
                    );
                  })}
                  {!(usuarios || []).some(u => getVehicleCommissions(u.user).total > 0) && (
                    <tr style={styles.tr}>
                      <td colSpan="4" style={{ ...styles.td, textAlign: "center", color: "var(--text-muted)", padding: "16px" }}>
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
};
