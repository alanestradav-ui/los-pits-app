import React, { useState } from "react";
import { 
  Wrench, 
  Car, 
  CheckCircle2, 
  Coins, 
  Hourglass, 
  TrendingUp, 
  ArrowUpRight,
  AlertTriangle
} from "lucide-react";
import { formatMoney } from "../utils/storage";

export default function Dashboard({ 
  ordenes, 
  carwash, 
  parkingHistory = [], 
  cafeteriaSales = [], 
  tiendaSales = [], 
  workshopInventory = [],
  cafeteriaInventory = [],
  carwashInventory = [],
  setCurrentTab, 
  dashboardPeriod 
}) {
  // Stat calculations
  const activeTaller = ordenes.filter(o => o.estado !== "Listo para entrega" && o.estado !== "Entregado").length;
  const activeCarwash = carwash.filter(c => c.estado === "En proceso").length;
  const totalActive = activeTaller + activeCarwash;

  const readyTaller = ordenes.filter(o => o.estado === "Listo para entrega").length;
  const readyCarwash = carwash.filter(c => c.estado === "Listo para entrega").length;
  const totalReady = readyTaller + readyCarwash;

  const [showLowStockDetails, setShowLowStockDetails] = useState(false);
  const lowStockItems = [];

  (workshopInventory || []).forEach(item => {
    const minS = item.minStock !== undefined ? item.minStock : 5;
    if (item.quantity <= minS) {
      lowStockItems.push({
        id: `taller-${item.id}`,
        seccion: "Taller (Bodega)",
        codigo: item.code || "-",
        nombre: item.name,
        stock: item.quantity,
        minimo: minS
      });
    }
  });

  (cafeteriaInventory || []).forEach(item => {
    const minS = item.minStock !== undefined ? item.minStock : 5;
    if (item.quantity <= minS) {
      lowStockItems.push({
        id: `cafeteria-${item.id}`,
        seccion: "Cafetería",
        codigo: "-",
        nombre: item.name,
        stock: item.quantity,
        minimo: minS
      });
    }
  });

  (carwashInventory || []).forEach(item => {
    const minS = item.minStock !== undefined ? item.minStock : 5;
    if (item.quantity <= minS) {
      lowStockItems.push({
        id: `carwash-${item.id}`,
        seccion: "Carwash (Insumos)",
        codigo: "-",
        nombre: item.name,
        stock: item.quantity,
        minimo: minS
      });
    }
  });

  const filterByPeriod = (list, dateField = "fecha") => {
    if (!list) return [];
    if (!dashboardPeriod) return list;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return list.filter(item => {
      if (!item[dateField]) return false;
      const d = new Date(item[dateField]);

      switch (dashboardPeriod) {
        case "dia": {
          return d.getFullYear() === now.getFullYear() &&
                 d.getMonth() === now.getMonth() &&
                 d.getDate() === now.getDate();
        }
        case "semana": {
          // Current week Mon-Sun
          const dayOfWeek = now.getDay();
          const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const monday = new Date(today);
          monday.setDate(today.getDate() - distanceToMonday);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);
          
          return d >= monday && d <= sunday;
        }
        case "quincena": {
          // 1st-15th or 16th-end of month
          const currentDay = now.getDate();
          const startOfFirstQuincena = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfFirstQuincena = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999);
          const startOfSecondQuincena = new Date(now.getFullYear(), now.getMonth(), 16);
          const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          const endOfSecondQuincena = new Date(nextMonthFirst - 1);

          if (currentDay <= 15) {
            return d >= startOfFirstQuincena && d <= endOfFirstQuincena;
          } else {
            return d >= startOfSecondQuincena && d <= endOfSecondQuincena;
          }
        }
        case "mes": {
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }
        case "trimestre": {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const itemQuarter = Math.floor(d.getMonth() / 3);
          return d.getFullYear() === now.getFullYear() && currentQuarter === itemQuarter;
        }
        case "semestre": {
          const currentSemester = now.getMonth() < 6 ? 0 : 1;
          const itemSemester = d.getMonth() < 6 ? 0 : 1;
          return d.getFullYear() === now.getFullYear() && currentSemester === itemSemester;
        }
        case "ano": {
          return d.getFullYear() === now.getFullYear();
        }
        default:
          return true;
      }
    });
  };

  const filteredOrders = filterByPeriod(ordenes.filter(o => o.estado === "Entregado"), "fecha");
  const filteredCarwash = filterByPeriod(carwash.filter(c => c.estado === "Entregado"), "fecha");
  const filteredParking = filterByPeriod(parkingHistory, "horaSalida");
  const filteredCafeteria = filterByPeriod(cafeteriaSales, "fecha");
  const filteredTienda = filterByPeriod(tiendaSales, "fecha");

  const totalRevenue = 
    filteredOrders.reduce((sum, o) => sum + o.total, 0) +
    filteredCarwash.reduce((sum, c) => sum + c.precio, 0) +
    filteredParking.reduce((sum, p) => sum + p.total, 0) +
    filteredCafeteria.reduce((sum, cf) => sum + cf.total, 0) +
    filteredTienda.reduce((sum, t) => sum + t.total, 0);

  // Split cash (efectivo) vs banks (tarjeta, transferencia, cheque)
  let cashRevenue = 0;
  let bankRevenue = 0;

  filteredOrders.forEach(o => {
    if (o.formaPago) {
      cashRevenue += parseFloat(o.formaPago.efectivo || 0);
      bankRevenue += parseFloat(o.formaPago.tarjeta || 0) + parseFloat(o.formaPago.transferencia || 0) + parseFloat(o.formaPago.cheque || 0);
    } else {
      cashRevenue += o.total;
    }
  });

  filteredCarwash.forEach(c => {
    if (c.formaPago) {
      cashRevenue += parseFloat(c.formaPago.efectivo || 0);
      bankRevenue += parseFloat(c.formaPago.tarjeta || 0) + parseFloat(c.formaPago.transferencia || 0) + parseFloat(c.formaPago.cheque || 0);
    } else {
      cashRevenue += c.precio;
    }
  });

  filteredParking.forEach(p => {
    if (p.formaPago) {
      cashRevenue += parseFloat(p.formaPago.efectivo || 0);
      bankRevenue += parseFloat(p.formaPago.tarjeta || 0) + parseFloat(p.formaPago.transferencia || 0) + parseFloat(p.formaPago.cheque || 0);
    } else {
      cashRevenue += p.total;
    }
  });

  filteredCafeteria.forEach(cf => {
    if (cf.formaPago) {
      cashRevenue += parseFloat(cf.formaPago.efectivo || 0);
      bankRevenue += parseFloat(cf.formaPago.tarjeta || 0) + parseFloat(cf.formaPago.transferencia || 0) + parseFloat(cf.formaPago.cheque || 0);
    } else {
      cashRevenue += cf.total;
    }
  });

  filteredTienda.forEach(t => {
    if (t.formaPago) {
      cashRevenue += parseFloat(t.formaPago.efectivo || 0);
      bankRevenue += parseFloat(t.formaPago.tarjeta || 0) + parseFloat(t.formaPago.transferencia || 0) + parseFloat(t.formaPago.cheque || 0);
    } else {
      cashRevenue += t.total;
    }
  });

  const pendingRevenueEstimate = 
    ordenes.reduce((sum, o) => sum + (o.estado !== "Entregado" ? o.total : 0), 0) +
    carwash.reduce((sum, c) => sum + (c.estado !== "Entregado" ? c.precio : 0), 0);

  const periodLabels = {
    dia: "Día",
    semana: "Semana",
    quincena: "Quincena",
    mes: "Mes",
    trimestre: "Trimestre",
    semestre: "Semestre",
    ano: "Año"
  };
  const currentPeriodLabel = periodLabels[dashboardPeriod] || "Mes";

  // Recent 5 activities
  const recentOrders = [...ordenes, ...carwash.map(c => ({...c, isWash: true}))]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Panel General</h1>
          <p>Bienvenido al centro de mando de Los Pits Auto Center.</p>
        </div>
        <div style={styles.timeBadge}>
          <div style={styles.pulseDot} />
          <span>Sistema en Línea</span>
        </div>
      </div>

      {/* Alertas de Stock Bajo */}
      {lowStockItems.length > 0 && (
        <div className="glass-panel" style={styles.alertBanner}>
          <div style={styles.alertBannerHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={styles.alertIconBg}>
                <AlertTriangle size={20} color="#f59e0b" />
              </div>
              <div style={{ textAlign: "left" }}>
                <h3 style={styles.alertBannerTitle}>Alertas de Stock Mínimo Bajo</h3>
                <p style={styles.alertBannerSub}>
                  Hay {lowStockItems.length} {lowStockItems.length === 1 ? "producto" : "productos"} que han alcanzado o están por debajo del límite mínimo establecido.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLowStockDetails(!showLowStockDetails)}
              style={styles.alertToggleBtn}
              type="button"
            >
              {showLowStockDetails ? "Ocultar Detalle" : "Ver Detalle"}
            </button>
          </div>

          {showLowStockDetails && (
            <div style={styles.alertTableWrapper} className="animate-fade-in">
              <table style={styles.alertTable}>
                <thead>
                  <tr>
                    <th style={styles.aTh}>Sección</th>
                    <th style={styles.aTh}>Código</th>
                    <th style={styles.aTh}>Producto</th>
                    <th style={{ ...styles.aTh, textAlign: "center" }}>Stock Actual</th>
                    <th style={{ ...styles.aTh, textAlign: "center" }}>Mínimo</th>
                    <th style={{ ...styles.aTh, textAlign: "right" }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.id} style={styles.aTr}>
                      <td style={{ ...styles.aTd, fontWeight: "700", color: "var(--color-primary)" }}>{item.seccion}</td>
                      <td style={{ ...styles.aTd, fontFamily: "var(--font-display)", color: "#fff" }}>{item.codigo}</td>
                      <td style={{ ...styles.aTd, color: "#fff", fontWeight: "600" }}>{item.nombre}</td>
                      <td style={{ ...styles.aTd, textAlign: "center", color: "var(--color-danger)", fontWeight: "800" }}>
                        {item.stock} uds
                      </td>
                      <td style={{ ...styles.aTd, textAlign: "center", color: "var(--text-muted)" }}>
                        {item.minimo} uds
                      </td>
                      <td style={{ ...styles.aTd, textAlign: "right" }}>
                        <span style={styles.alertBadge}>Reabastecer</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards Grid */}
      <div style={styles.statsGrid}>
        {/* Card 1 */}
        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconContainer, backgroundColor: "var(--color-warning-glow)" }}>
            <Hourglass size={24} color="var(--color-warning)" />
          </div>
          <div style={styles.statDetails}>
            <span style={styles.statLabel}>Trabajos Activos</span>
            <span style={{ ...styles.statVal, fontFamily: "var(--font-display)" }}>{totalActive}</span>
            <div style={styles.statSubText}>
              <span>🔧 {activeTaller} Mecánica</span> • <span>🧼 {activeCarwash} Lavado</span>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconContainer, backgroundColor: "var(--color-success-glow)" }}>
            <CheckCircle2 size={24} color="var(--color-success)" />
          </div>
          <div style={styles.statDetails}>
            <span style={styles.statLabel}>Listos para Entrega</span>
            <span style={{ ...styles.statVal, fontFamily: "var(--font-display)" }}>{totalReady}</span>
            <div style={styles.statSubText}>
              <span>🔧 {readyTaller} Taller</span> • <span>🧼 {readyCarwash} Carwash</span>
            </div>
          </div>
        </div>

        {/* Card 3: Caja (Efectivo) */}
        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconContainer, backgroundColor: "rgba(16, 185, 129, 0.15)" }}>
            <Coins size={24} color="#10b981" />
          </div>
          <div style={styles.statDetails}>
            <span style={styles.statLabel}>Caja (Efectivo) ({currentPeriodLabel})</span>
            <span style={{ ...styles.statVal, color: "#10b981", fontFamily: "var(--font-display)" }}>
              {formatMoney(cashRevenue)}
            </span>
            <span style={styles.statSubText}>Total cobrado en efectivo</span>
          </div>
        </div>

        {/* Card 3.5: Bancos */}
        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconContainer, backgroundColor: "rgba(59, 130, 246, 0.15)" }}>
            <TrendingUp size={24} color="var(--color-primary)" />
          </div>
          <div style={styles.statDetails}>
            <span style={styles.statLabel}>Bancos ({currentPeriodLabel})</span>
            <span style={{ ...styles.statVal, color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>
              {formatMoney(bankRevenue)}
            </span>
            <span style={styles.statSubText}>Tarjetas, transferencias, cheques</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconContainer, backgroundColor: "var(--color-primary-glow)" }}>
            <TrendingUp size={24} color="var(--color-primary)" />
          </div>
          <div style={styles.statDetails}>
            <span style={styles.statLabel}>Flujo en Proceso / Listo</span>
            <span style={{ ...styles.statVal, color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>
              {formatMoney(pendingRevenueEstimate)}
            </span>
            <span style={styles.statSubText}>Valor de trabajos pendientes</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="responsive-dashboard-grid">
        {/* Left Side: Recent Activity */}
        <div className="glass-panel" style={styles.activityPanel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>Últimos Trabajos Registrados</h2>
            <button 
              className="btn btn-ghost" 
              style={styles.panelHeaderBtn}
              onClick={() => setCurrentTab("taller")}
            >
              Ver Todos <ArrowUpRight size={16} />
            </button>
          </div>

          <div style={styles.activityList}>
            {recentOrders.length === 0 ? (
              <div style={styles.emptyState}>
                <Hourglass size={40} color="var(--text-muted)" style={{ marginBottom: "12px", opacity: 0.5 }} />
                <p>No hay órdenes registradas aún.</p>
              </div>
            ) : (
              recentOrders.map((item) => (
                <div key={item.id} style={styles.activityItem}>
                  <div style={{
                    ...styles.activityIcon,
                    backgroundColor: item.isWash ? "var(--color-secondary-glow)" : "var(--color-primary-glow)"
                  }}>
                    {item.isWash ? <Car size={18} color="var(--color-secondary)" /> : <Wrench size={18} color="var(--color-primary)" />}
                  </div>
                  <div style={styles.activityInfo}>
                    <div style={styles.activityRow}>
                      <span style={styles.activityName}>
                        {item.isWash ? `Lavado ${item.tipo}` : `${item.cliente} - ${item.vehiculo}`}
                      </span>
                      <span style={styles.activityPrice}>
                        {formatMoney(item.isWash ? item.precio : item.total)}
                      </span>
                    </div>
                    <div style={styles.activityRow}>
                      <span style={styles.activitySub}>
                        {item.isWash ? `Lavador: ${item.lavador}` : `Mecánico: ${item.mecanico}`}
                      </span>
                      <span className={`badge ${
                        item.estado === "Listo para entrega" ? "badge-ready" :
                        item.estado === "Entregado" ? "badge-paid" : "badge-process"
                      }`}>
                        {item.estado}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Quick Actions & Operations */}
        <div style={styles.rightColumn}>
          <div className="glass-panel" style={styles.quickActionsCard}>
            <h2 style={styles.panelTitle}>Acceso Directo</h2>
            <p style={{ marginBottom: "20px", fontSize: "0.85rem" }}>Ejecuta las operaciones más comunes de forma ágil:</p>
            
            <div style={styles.actionButtons}>
              <button 
                className="btn btn-primary" 
                style={styles.actionBtn}
                onClick={() => setCurrentTab("taller")}
              >
                <Wrench size={18} />
                Gestión de Taller
              </button>
              <button 
                className="btn btn-secondary" 
                style={styles.actionBtn}
                onClick={() => setCurrentTab("carwash")}
              >
                <Car size={18} />
                Gestión de Carwash
              </button>
              <button 
                className="btn btn-ghost" 
                style={{ ...styles.actionBtn, borderColor: "rgba(255,255,255,0.08)" }}
                onClick={() => setCurrentTab("finanzas")}
              >
                <Coins size={18} />
                Cierre de Caja y Reportes
              </button>
            </div>
          </div>

          {/* Mini Operational Capacity Panel */}
          <div className="glass-panel" style={styles.capacityCard}>
            <h2 style={styles.panelTitle}>Capacidad Operativa</h2>
            <div style={styles.progressContainer}>
              <div style={styles.progressLabelRow}>
                <span>Carga de Taller</span>
                <span>{activeTaller} Autos</span>
              </div>
              <div style={styles.progressBarBg}>
                <div style={{ 
                  ...styles.progressBarFill, 
                  backgroundColor: "var(--color-warning)", 
                  width: `${Math.min((activeTaller / 10) * 100, 100)}%` 
                }} />
              </div>
            </div>

            <div style={styles.progressContainer}>
              <div style={styles.progressLabelRow}>
                <span>Cola Carwash</span>
                <span>{activeCarwash} Trabajos</span>
              </div>
              <div style={styles.progressBarBg}>
                <div style={{ 
                  ...styles.progressBarFill, 
                  backgroundColor: "var(--color-secondary)", 
                  width: `${Math.min((activeCarwash / 10) * 100, 100)}%` 
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>
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
    background: "linear-gradient(135deg, #fff 60%, var(--color-primary) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  timeBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    border: "1px solid rgba(16, 185, 129, 0.2)",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "700",
    color: "#10b981",
  },
  pulseDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
    boxShadow: "0 0 10px #10b981",
    animation: "pulseGlow 1.5s infinite",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "20px",
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    padding: "24px",
    textAlign: "left",
  },
  iconContainer: {
    width: "50px",
    height: "50px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statDetails: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  statLabel: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "var(--text-muted)",
    marginBottom: "4px",
  },
  statVal: {
    fontSize: "1.8rem",
    fontWeight: "800",
    color: "#fff",
    lineHeight: 1.2,
    marginBottom: "4px",
  },
  statSubText: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  activityPanel: {
    padding: "24px",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  panelTitle: {
    fontSize: "1.2rem",
    fontWeight: "700",
  },
  panelHeaderBtn: {
    padding: "6px 12px",
    fontSize: "0.8rem",
    borderRadius: "8px",
  },
  activityList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 0",
    color: "var(--text-muted)",
  },
  activityItem: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "14px",
    borderRadius: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    transition: "var(--transition-smooth)",
    ":hover": {
      backgroundColor: "rgba(255, 255, 255, 0.04)",
    },
  },
  activityIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  activityInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  activityRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activityName: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "#fff",
  },
  activityPrice: {
    fontSize: "0.95rem",
    fontWeight: "800",
    color: "#fff",
  },
  activitySub: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  },
  rightColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "30px",
  },
  quickActionsCard: {
    padding: "24px",
    textAlign: "left",
  },
  actionButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  actionBtn: {
    width: "100%",
    justifyContent: "flex-start",
    padding: "14px 20px",
  },
  capacityCard: {
    padding: "24px",
    textAlign: "left",
  },
  progressContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "20px",
  },
  progressLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "var(--text-muted)",
  },
  progressBarBg: {
    width: "100%",
    height: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "4px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.5s ease-out",
  },
  alertBanner: {
    border: "1px solid rgba(245, 158, 11, 0.2)",
    background: "linear-gradient(135deg, rgba(20, 24, 33, 0.6) 0%, rgba(245, 158, 11, 0.03) 100%)",
    padding: "18px 24px",
    borderRadius: "12px",
    width: "100%",
  },
  alertBannerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
  alertIconBg: {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  alertBannerTitle: {
    fontSize: "1.05rem",
    fontWeight: "800",
    color: "#fff",
    margin: 0,
  },
  alertBannerSub: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    margin: "4px 0 0 0",
  },
  alertToggleBtn: {
    background: "none",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "#fff",
    padding: "6px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  alertTableWrapper: {
    width: "100%",
    overflowX: "auto",
    marginTop: "16px",
    paddingTop: "16px",
    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
  },
  alertTable: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  aTh: {
    padding: "8px 12px",
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  },
  aTr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
  },
  aTd: {
    padding: "10px 12px",
    fontSize: "0.82rem",
    color: "var(--text-main)",
  },
  alertBadge: {
    fontSize: "0.68rem",
    fontWeight: "800",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "var(--color-danger)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    textTransform: "uppercase",
  }
};
