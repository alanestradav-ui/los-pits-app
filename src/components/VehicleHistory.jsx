import React, { useState } from "react";
import { 
  Search, 
  Car, 
  Wrench, 
  Calendar, 
  User, 
  Gauge, 
  Fuel, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  History,
  Phone,
  Clock,
  CheckCircle2,
  DollarSign,
  Printer,
  PieChart,
  TrendingUp,
  X,
  ShieldCheck,
  FileCheck
} from "lucide-react";
import { formatMoney } from "../utils/storage";

const defaultChecklistItems = [
  { id: "wipers", label: "Limpiaparabrisas" },
  { id: "horn", label: "Bocina / Claxon" },
  { id: "ac", label: "Aire Acondicionado" },
  { id: "headlights", label: "Luces Principales" },
  { id: "brakelights", label: "Luces de Freno" },
  { id: "turnsignals", label: "Luces Direccionales" },
  { id: "tires", label: "Llantas / Neumáticos" },
  { id: "brakefluid", label: "Líquido de Frenos" },
  { id: "engineoil", label: "Aceite de Motor" },
  { id: "battery", label: "Batería / Bornes" },
  { id: "mirrors", label: "Retrovisores / Vidrios" },
  { id: "suspension", label: "Suspensión" }
];

export default function VehicleHistory({ ordenes = [], carwash = [], usuarioActual }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlaca, setSelectedPlaca] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [expandedFinancials, setExpandedFinancials] = useState({});
  const [historyFilter, setHistoryFilter] = useState("Todos"); // "Todos" | "Taller" | "Carwash"
  const [clientReportModal, setClientReportModal] = useState({ isOpen: false, item: null, vehicle: null });


  // Safe JSON Parser helper to prevent crash on stringified fields
  const safeParse = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (typeof parsed === 'string') return safeParse(parsed);
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  // Safe String Extractor helper to prevent React rendering object crashes
  const getString = (val, fallback = "N/A") => {
    if (!val) return fallback;
    if (typeof val === "string") return val.trim() || fallback;
    if (typeof val === "number") return String(val);
    if (typeof val === "object") {
      if (val.nombre) return String(val.nombre);
      if (val.name) return String(val.name);
      if (val.marca || val.linea) return `${val.marca || ""} ${val.linea || ""}`.trim();
    }
    return fallback;
  };

  // 1. Group and compile history by Plate (placa)
  const vehiclesMap = {};

  // Process Workshop Orders if filter matches Taller or Todos
  if (historyFilter === "Todos" || historyFilter === "Taller") {
    (ordenes || []).forEach(o => {
      if (!o) return;
      // Direct placa extraction, falling back to vehiculo string/object matching
      let placaClean = "";
      if (typeof o.placa === "string" && o.placa.trim()) {
        placaClean = o.placa.toUpperCase().trim();
      } else if (o.vehiculo && typeof o.vehiculo === "object" && o.vehiculo.placa) {
        placaClean = String(o.vehiculo.placa).toUpperCase().trim();
      } else if (typeof o.vehiculo === "string") {
        const match = o.vehiculo.match(/\(([^)]+)\)/);
        if (match) {
          placaClean = match[1].toUpperCase().trim();
        }
      }
      
      if (!placaClean || placaClean === "N/A" || placaClean === "SIN PLACA") return;
      
      // Clean vehicle description string
      let vehDesc = "";
      if (typeof o.vehiculo === "string") {
        vehDesc = o.vehiculo.replace(/\s*\([^)]+\)/g, "").trim();
      } else if (o.vehiculo && typeof o.vehiculo === "object") {
        vehDesc = `${o.vehiculo.marca || ""} ${o.vehiculo.linea || ""} (${o.vehiculo.anio || ""})`.trim();
      } else {
        vehDesc = `${getString(o.marca, "")} ${getString(o.linea, "")}`.trim();
      }
      if (!vehDesc || vehDesc === "()") vehDesc = "N/A";

      const marcaStr = typeof o.marca === "object" ? getString(o.marca) : getString(o.marca || o.vehiculo?.marca);
      const lineaStr = typeof o.linea === "object" ? getString(o.linea) : getString(o.linea || o.vehiculo?.linea);
      const anioStr = typeof o.anio === "object" ? getString(o.anio) : getString(o.anio || o.vehiculo?.anio);
      const chasisStr = typeof o.chasis === "object" ? getString(o.chasis) : getString(o.chasis || o.vehiculo?.chasis);
      const clienteStr = getString(o.cliente);

      if (!vehiclesMap[placaClean]) {
        vehiclesMap[placaClean] = {
          placa: placaClean,
          marca: marcaStr,
          linea: lineaStr,
          anio: anioStr,
          chasis: chasisStr,
          cliente: clienteStr,
          telefono: getString(o.telefono, ""),
          vehiculoDesc: vehDesc,
          history: []
        };
      }

      // Keep the most complete data
      if (marcaStr && marcaStr !== "N/A") vehiclesMap[placaClean].marca = marcaStr;
      if (lineaStr && lineaStr !== "N/A") vehiclesMap[placaClean].linea = lineaStr;
      if (anioStr && anioStr !== "N/A") vehiclesMap[placaClean].anio = anioStr;
      if (chasisStr && chasisStr !== "N/A") vehiclesMap[placaClean].chasis = chasisStr;
      if (clienteStr && clienteStr !== "N/A") vehiclesMap[placaClean].cliente = clienteStr;
      if (o.telefono) vehiclesMap[placaClean].telefono = getString(o.telefono, "");

      const parsedLuces = safeParse(o.luces);
      const parsedFotos = safeParse(o.fotos);

      vehiclesMap[placaClean].history.push({
        id: o.id,
        tipo: "Taller",
        fecha: getString(o.fecha, new Date().toISOString()),
        estado: getString(o.estado, "Registrado"),
        total: parseFloat(o.total) || 0,
        mecanico: getString(o.mecanico, "Sin asignar"),
        trabajo: getString(o.trabajo || o.motivoIngreso, "Servicio general de taller"),
        kilometraje: getString(o.kilometraje, "N/A"),
        combustible: o.combustible !== undefined ? o.combustible : 0,
        luces: Array.isArray(parsedLuces) ? parsedLuces : [],
        presupuesto: safeParse(o.presupuesto),
        fotos: Array.isArray(parsedFotos) ? parsedFotos : [],
        checklist: safeParse(o.checklist)
      });
    });
  }

  // Process Carwash entries if filter matches Carwash or Todos
  if (historyFilter === "Todos" || historyFilter === "Carwash") {
    (carwash || []).forEach(c => {
      if (!c) return;
      // Direct placa extraction, falling back to c.vehiculo string/object matching or c.placa
      let placaClean = "";
      if (c.vehiculo && typeof c.vehiculo === "object" && c.vehiculo.placa) {
        placaClean = String(c.vehiculo.placa).toUpperCase().trim();
      } else if (typeof c.vehiculo === "string") {
        const match = c.vehiculo.match(/\(([^)]+)\)/);
        if (match) placaClean = match[1].toUpperCase().trim();
      }
      if (!placaClean && typeof c.placa === "string" && c.placa.trim()) {
        placaClean = c.placa.toUpperCase().trim();
      }
      
      if (!placaClean || placaClean === "N/A" || placaClean === "SIN PLACA") return;

      // Clean vehicle description string
      let vehDesc = "";
      if (typeof c.vehiculo === "string") {
        vehDesc = c.vehiculo.replace(/\s*\([^)]+\)/g, "").trim();
      } else if (c.vehiculo && typeof c.vehiculo === "object") {
        vehDesc = `${c.vehiculo.marca || ""} ${c.vehiculo.linea || ""}`.trim();
      }
      if (!vehDesc) vehDesc = "N/A";

      const clienteStr = getString(c.cliente);

      if (!vehiclesMap[placaClean]) {
        vehiclesMap[placaClean] = {
          placa: placaClean,
          marca: getString(c.vehiculo?.marca),
          linea: getString(c.vehiculo?.linea),
          anio: "N/A",
          chasis: "N/A",
          cliente: clienteStr,
          telefono: getString(c.telefono, ""),
          vehiculoDesc: vehDesc,
          history: []
        };
      }

      if (clienteStr && clienteStr !== "N/A") vehiclesMap[placaClean].cliente = clienteStr;
      if (c.telefono) vehiclesMap[placaClean].telefono = getString(c.telefono, "");

      const parsedFotos = safeParse(c.fotos);

      vehiclesMap[placaClean].history.push({
        id: c.id,
        tipo: "Carwash",
        fecha: getString(c.fecha, new Date().toISOString()),
        estado: getString(c.estado, "Completado"),
        total: parseFloat(c.precio) || 0,
        lavador: getString(c.lavador, "Sin asignar"),
        tipoLavado: getString(c.tipo, "General"),
        fotos: Array.isArray(parsedFotos) ? parsedFotos : []
      });
    });
  }

  // Convert map to array, sort history entries chronologically for each vehicle
  // and only include vehicles that have at least one history entry under the current filter
  const vehiclesList = Object.values(vehiclesMap)
    .filter(v => v.history.length > 0)
    .map(vehicle => {
      vehicle.history.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      // Determine the last service date
      vehicle.lastServiceDate = vehicle.history[0]?.fecha || "";
      vehicle.totalServices = vehicle.history.length;
      return vehicle;
    });

  // 2. Filter list by query
  const filteredVehicles = vehiclesList.filter(v => {
    const query = (searchQuery || "").toLowerCase().trim();
    if (!query) return true;
    return (
      (v.placa || "").toLowerCase().includes(query) ||
      (v.marca || "").toLowerCase().includes(query) ||
      (v.linea || "").toLowerCase().includes(query) ||
      (v.cliente || "").toLowerCase().includes(query) ||
      (v.chasis || "").toLowerCase().includes(query)
    );
  });

  const selectedVehicle = selectedPlaca && vehiclesMap[selectedPlaca] && vehiclesMap[selectedPlaca].history.length > 0
    ? vehiclesMap[selectedPlaca]
    : null;

  const isStaff = !usuarioActual || ["admin", "cajero", "jefe de taller", "jefe", "administrador"].includes((usuarioActual.rol || "").toLowerCase().trim());

  const toggleOrderExpand = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const toggleFinancialsExpand = (orderId) => {
    setExpandedFinancials(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const calculateFinancials = (item) => {
    const totalVenta = parseFloat(item.total) || 0;
    let costoRepuestos = 0;
    let costoManoObra = 0;
    let costoServiciosExternos = 0;

    let ventaRepuestos = 0;
    let ventaManoObra = 0;
    let ventaServiciosExternos = 0;

    if (item.presupuesto) {
      const labor = item.presupuesto.labor || [];
      const parts = item.presupuesto.parts || [];
      const services = item.presupuesto.services || [];

      labor.forEach(l => {
        const p = parseFloat(l.price) || 0;
        const c = parseFloat(l.cost) || (parseFloat(item.comision) || (p * 0.15));
        ventaManoObra += p;
        costoManoObra += c;
      });

      parts.forEach(pt => {
        const qty = parseFloat(pt.qty) || 1;
        const p = (parseFloat(pt.price) || 0) * qty;
        const unitCost = pt.purchasePrice !== undefined ? parseFloat(pt.purchasePrice) : (pt.cost !== undefined ? parseFloat(pt.cost) : (parseFloat(pt.price) || 0) * 0.65);
        const c = unitCost * qty;
        ventaRepuestos += p;
        costoRepuestos += c;
      });

      services.forEach(s => {
        const p = parseFloat(s.price) || 0;
        const c = parseFloat(s.cost) || (p * 0.70);
        ventaServiciosExternos += p;
        costoServiciosExternos += c;
      });
    } else {
      costoManoObra = item.comision ? parseFloat(item.comision) : totalVenta * 0.10;
      costoRepuestos = item.tipo === "Carwash" ? totalVenta * 0.15 : totalVenta * 0.35;
    }

    const totalCostos = costoRepuestos + costoManoObra + costoServiciosExternos;
    const utilidadNeta = totalVenta - totalCostos;
    const margenPct = totalVenta > 0 ? (utilidadNeta / totalVenta) * 100 : 0;

    return {
      totalVenta,
      ventaRepuestos,
      ventaManoObra,
      ventaServiciosExternos,
      costoRepuestos,
      costoManoObra,
      costoServiciosExternos,
      totalCostos,
      utilidadNeta,
      margenPct
    };
  };

  const selectedVehicleFinancials = selectedVehicle ? selectedVehicle.history.reduce((acc, h) => {
    const fin = calculateFinancials(h);
    acc.totalVenta += fin.totalVenta;
    acc.costoRepuestos += fin.costoRepuestos;
    acc.costoManoObra += fin.costoManoObra;
    acc.costoServiciosExternos += fin.costoServiciosExternos;
    acc.totalCostos += fin.totalCostos;
    acc.utilidadNeta += fin.utilidadNeta;
    return acc;
  }, { totalVenta: 0, costoRepuestos: 0, costoManoObra: 0, costoServiciosExternos: 0, totalCostos: 0, utilidadNeta: 0 }) : null;

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Warning light translations helper
  const getWarningLightLabel = (lightId) => {
    const lights = {
      engine: "Check Engine ⚠️",
      oil: "Presión Aceite 🛢️",
      battery: "Batería 🔋",
      brakes: "Frenos 🛑",
      temp: "Temperatura 🌡️",
      abs: "ABS ⚠️",
      airbag: "Bolsa Aire 🎈",
      tpms: "Presión Llantas ⚙️",
      traction: "Tracción 🚗",
      steering: "Dir Asistida ☸️",
      brakewear: "Desgaste Pastilla ⭕",
      coolant: "Refrigerante 💧"
    };
    return lights[lightId] || lightId;
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Historial de Vehículos</h1>
          <p>Consulta el expediente completo y cronograma de servicios realizados a cada vehículo.</p>
        </div>

        {/* Filter Selector Tabs */}
        <div style={styles.filterTabsContainer}>
          <button 
            style={{
              ...styles.filterTabButton, 
              ...(historyFilter === "Todos" ? styles.filterTabActiveAll : {})
            }}
            onClick={() => { setHistoryFilter("Todos"); setSelectedPlaca(null); }}
            type="button"
          >
            <History size={16} /> Todos
          </button>
          <button 
            style={{
              ...styles.filterTabButton, 
              ...(historyFilter === "Taller" ? styles.filterTabActiveTaller : {})
            }}
            onClick={() => { setHistoryFilter("Taller"); setSelectedPlaca(null); }}
            type="button"
          >
            <Wrench size={16} /> Taller
          </button>
          <button 
            style={{
              ...styles.filterTabButton, 
              ...(historyFilter === "Carwash" ? styles.filterTabActiveCarwash : {})
            }}
            onClick={() => { setHistoryFilter("Carwash"); setSelectedPlaca(null); }}
            type="button"
          >
            <Car size={16} /> Carwash
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div style={styles.mainGrid}>
        
        {/* Left Side: Vehicle Selector */}
        <div className="glass-panel" style={styles.sidebarCard}>
          {/* Search Box */}
          <div style={styles.searchContainer}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por placa, marca, cliente..."
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Vehicle List */}
          <div style={styles.listContainer}>
            {filteredVehicles.length === 0 ? (
              <div style={styles.emptyState}>
                <Car size={32} color="var(--text-muted)" style={{ marginBottom: "12px", opacity: 0.5 }} />
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No se encontraron vehículos</span>
              </div>
            ) : (
              filteredVehicles.map(v => {
                const isActive = selectedPlaca === v.placa;
                return (
                  <button
                    key={v.placa}
                    onClick={() => { setSelectedPlaca(v.placa); setExpandedOrders({}); }}
                    style={{
                      ...styles.vehicleItem,
                      ...(isActive ? styles.vehicleItemActive : {})
                    }}
                    type="button"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                      <span style={{ ...styles.placaBadge, backgroundColor: isActive ? "var(--color-primary)" : "rgba(255,255,255,0.06)" }}>
                        {v.placa}
                      </span>
                      <span style={styles.servicesBadge}>{v.totalServices} {v.totalServices === 1 ? "serv." : "servs."}</span>
                    </div>
                    
                    <div style={{ textAlign: "left", marginTop: "8px" }}>
                      <strong style={{ color: "#fff", fontSize: "0.9rem", display: "block" }}>
                        {v.marca !== "N/A" ? `${v.marca} ${v.linea}` : v.vehiculoDesc}
                      </strong>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Propietario: {v.cliente}</span>
                    </div>

                    <div style={styles.lastServiceText}>
                      📅 Último: {formatDate(v.lastServiceDate).split(" ")[0]}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Historial Timeline Details */}
        <div style={styles.detailColumn}>
          {selectedVehicle ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Vehicle Profile Summary */}
              <div className="glass-panel animate-fade-in" style={styles.profileCard}>
                <div style={styles.profileHeader}>
                  <div style={styles.profileTitleWrapper}>
                    <div style={{ ...styles.iconBg, backgroundColor: "var(--color-primary-glow)" }}>
                      <Car size={22} color="var(--color-primary)" />
                    </div>
                    <div>
                      <h2 style={styles.profilePlaca}>{selectedVehicle.placa}</h2>
                      <p style={styles.profileSub}>
                        Expediente de {selectedVehicle.marca !== "N/A" ? `${selectedVehicle.marca} ${selectedVehicle.linea} (${selectedVehicle.anio})` : selectedVehicle.vehiculoDesc}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setClientReportModal({ isOpen: true, vehicle: selectedVehicle, item: null })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      backgroundColor: "var(--color-primary)",
                      color: "#fff",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)"
                    }}
                    type="button"
                  >
                    <Printer size={16} /> Reporte Cliente (Imprimir / PDF)
                  </button>
                </div>

                <div style={styles.infoGrid}>
                  <div style={styles.infoField}>
                    <span style={styles.infoLabel}>Chasis / VIN:</span>
                    <span style={{ ...styles.infoValue, color: "var(--color-secondary)", fontWeight: "bold" }}>
                      {selectedVehicle.chasis}
                    </span>
                  </div>
                  <div style={styles.infoField}>
                    <span style={styles.infoLabel}>Propietario:</span>
                    <span style={styles.infoValue}>{selectedVehicle.cliente}</span>
                  </div>
                  {selectedVehicle.telefono && (
                    <div style={styles.infoField}>
                      <span style={styles.infoLabel}>Teléfono:</span>
                      <span style={styles.infoValue}>📞 {selectedVehicle.telefono}</span>
                    </div>
                  )}
                  <div style={styles.infoField}>
                    <span style={styles.infoLabel}>Servicios Totales:</span>
                    <span style={styles.infoValue}>{selectedVehicle.totalServices} registrados</span>
                  </div>
                </div>

                {/* Staff Financial Breakdown Banner */}
                {isStaff && selectedVehicleFinancials && (
                  <div style={{
                    marginTop: "16px",
                    paddingTop: "14px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                    textAlign: "left"
                  }}>
                    <div style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>📊 Venta Acumulada</span>
                      <strong style={{ fontSize: "1.05rem", color: "#fff" }}>{formatMoney(selectedVehicleFinancials.totalVenta)}</strong>
                    </div>

                    <div style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>📉 Costos (Repuestos/M.O.)</span>
                      <strong style={{ fontSize: "1.05rem", color: "#f87171" }}>{formatMoney(selectedVehicleFinancials.totalCostos)}</strong>
                    </div>

                    <div style={{ backgroundColor: "rgba(16, 185, 129, 0.08)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-success)", fontWeight: "700", display: "block" }}>📈 Utilidad Neta Aportada</span>
                      <strong style={{ fontSize: "1.1rem", color: "var(--color-success)" }}>
                        {formatMoney(selectedVehicleFinancials.utilidadNeta)} 
                        <span style={{ fontSize: "0.75rem", fontWeight: "normal", marginLeft: "6px" }}>
                          ({selectedVehicleFinancials.totalVenta > 0 ? ((selectedVehicleFinancials.utilidadNeta / selectedVehicleFinancials.totalVenta) * 100).toFixed(1) : 0}%)
                        </span>
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline Header */}
              <div style={{ textAlign: "left" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                  <History size={18} color="var(--color-primary)" /> Línea de Tiempo de Servicios
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Servicios ordenados cronológicamente desde el más reciente.</p>
              </div>

              {/* Timeline Items */}
              <div style={styles.timeline}>
                {selectedVehicle.history.map((item, index) => {
                  const isTaller = item.tipo === "Taller";
                  const isExpanded = !!expandedOrders[item.id];
                  
                  return (
                    <div key={item.id} style={styles.timelineItem}>
                      {/* Timeline dot/icon */}
                      <div style={{
                        ...styles.timelineDot,
                        backgroundColor: isTaller ? "var(--color-primary-glow)" : "var(--color-secondary-glow)",
                        borderColor: isTaller ? "var(--color-primary)" : "var(--color-secondary)"
                      }}>
                        {isTaller ? <Wrench size={14} color="var(--color-primary)" /> : <Car size={14} color="var(--color-secondary)" />}
                      </div>

                      {/* Content Card */}
                      <div className="glass-panel" style={styles.timelineCard}>
                        {/* Header Row */}
                        <div style={styles.cardHeader}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={styles.cardDate}>📅 {formatDate(item.fecha)}</span>
                            <h4 style={styles.cardTitle}>
                              {isTaller ? item.trabajo : `Lavado de Vehículo (${item.tipoLavado})`}
                            </h4>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ 
                              ...styles.typeBadge, 
                              color: isTaller ? "var(--color-primary)" : "var(--color-secondary)",
                              backgroundColor: isTaller ? "var(--color-primary-glow)" : "var(--color-secondary-glow)"
                            }}>
                              {isTaller ? "🔧 TALLER" : "🧼 CARWASH"}
                            </span>
                            <span style={styles.cardPrice}>{formatMoney(item.total)}</span>
                          </div>
                        </div>

                        {/* Collapsible Content wrapper */}
                        <div style={styles.cardBody}>
                          {isTaller ? (
                            <>
                              <div style={styles.summaryDetails}>
                                <div style={styles.summaryField}>
                                  <User size={14} style={{ color: "var(--text-muted)" }} />
                                  <span>Mecánico: <strong>{item.mecanico}</strong></span>
                                </div>
                                <div style={styles.summaryField}>
                                  <Gauge size={14} style={{ color: "var(--text-muted)" }} />
                                  <span>Kilometraje: <strong>{item.kilometraje} km</strong></span>
                                </div>
                                <div style={styles.summaryField}>
                                  <Fuel size={14} style={{ color: "var(--text-muted)" }} />
                                  <span>Combustible: <strong>{item.combustible}%</strong></span>
                                </div>
                                <div style={styles.summaryField}>
                                  <Clock size={14} style={{ color: "var(--text-muted)" }} />
                                  <span>Estado: <strong style={{ color: item.estado === "Entregado" ? "var(--color-success)" : "var(--color-warning)" }}>{item.estado}</strong></span>
                                </div>
                              </div>

                              {/* Action Buttons Row */}
                              <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                                <button
                                  onClick={() => setClientReportModal({ isOpen: true, vehicle: selectedVehicle, item })}
                                  style={{
                                    backgroundColor: "rgba(99, 102, 241, 0.15)",
                                    color: "var(--color-primary)",
                                    border: "1px solid rgba(99, 102, 241, 0.3)",
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    fontSize: "0.78rem",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                  }}
                                  type="button"
                                >
                                  <Printer size={14} /> Reporte Cliente (PDF)
                                </button>

                                {isStaff && (
                                  <button
                                    onClick={() => toggleFinancialsExpand(item.id)}
                                    style={{
                                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                                      color: "var(--color-success)",
                                      border: "1px solid rgba(16, 185, 129, 0.3)",
                                      padding: "6px 12px",
                                      borderRadius: "6px",
                                      fontSize: "0.78rem",
                                      fontWeight: "700",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px"
                                    }}
                                    type="button"
                                  >
                                    <PieChart size={14} /> {expandedFinancials[item.id] ? "Ocultar Utilidad" : "Ver Utilidad y Gastos"}
                                  </button>
                                )}

                                <button
                                  onClick={() => toggleOrderExpand(item.id)}
                                  style={styles.toggleBtn}
                                  type="button"
                                >
                                  {isExpanded ? (
                                    <>Ocultar Presupuesto <ChevronUp size={14} /></>
                                  ) : (
                                    <>Ver Diagnóstico y Presupuesto <ChevronDown size={14} /></>
                                  )}
                                </button>
                              </div>

                              {/* Internal Financial Breakdown Panel for Staff */}
                              {isStaff && expandedFinancials[item.id] && (() => {
                                const fin = calculateFinancials(item);
                                return (
                                  <div style={{
                                    marginTop: "12px",
                                    padding: "14px",
                                    borderRadius: "8px",
                                    backgroundColor: "rgba(16, 185, 129, 0.04)",
                                    border: "1px solid rgba(16, 185, 129, 0.2)",
                                    textAlign: "left"
                                  }} className="animate-fade-in">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                      <span style={{ fontSize: "0.82rem", fontWeight: "800", color: "var(--color-success)", display: "flex", alignItems: "center", gap: "6px" }}>
                                        <TrendingUp size={16} /> Desglose Interno de Costos y Utilidad Neta
                                      </span>
                                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>Privado - Administración</span>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
                                      <div style={{ backgroundColor: "rgba(0,0,0,0.2)", padding: "8px 10px", borderRadius: "6px" }}>
                                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>💵 Precio al Cliente:</span>
                                        <strong style={{ fontSize: "0.95rem", color: "#fff" }}>{formatMoney(fin.totalVenta)}</strong>
                                      </div>

                                      <div style={{ backgroundColor: "rgba(0,0,0,0.2)", padding: "8px 10px", borderRadius: "6px" }}>
                                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>📦 Costo Repuestos:</span>
                                        <strong style={{ fontSize: "0.9rem", color: "#f87171" }}>{formatMoney(fin.costoRepuestos)}</strong>
                                      </div>

                                      <div style={{ backgroundColor: "rgba(0,0,0,0.2)", padding: "8px 10px", borderRadius: "6px" }}>
                                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>🛠️ Costo M.O. / Comisión:</span>
                                        <strong style={{ fontSize: "0.9rem", color: "#f87171" }}>{formatMoney(fin.costoManoObra)}</strong>
                                      </div>

                                      {fin.costoServiciosExternos > 0 && (
                                        <div style={{ backgroundColor: "rgba(0,0,0,0.2)", padding: "8px 10px", borderRadius: "6px" }}>
                                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>⚙️ Trabajos Subcontratados:</span>
                                          <strong style={{ fontSize: "0.9rem", color: "#f87171" }}>{formatMoney(fin.costoServiciosExternos)}</strong>
                                        </div>
                                      )}

                                      <div style={{ backgroundColor: "rgba(16, 185, 129, 0.12)", padding: "8px 10px", borderRadius: "6px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                                        <span style={{ fontSize: "0.72rem", color: "var(--color-success)", fontWeight: "700", display: "block" }}>💎 Utilidad de la Orden:</span>
                                        <strong style={{ fontSize: "1rem", color: "var(--color-success)" }}>
                                          {formatMoney(fin.utilidadNeta)} ({fin.margenPct.toFixed(1)}%)
                                        </strong>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Expanded budget & checklist details */}
                              {isExpanded && (
                                <div className="animate-fade-in" style={styles.expandedContent}>
                                  {/* Warning Lights checklist */}
                                  {item.luces && item.luces.length > 0 && (
                                    <div style={{ marginBottom: "16px", textAlign: "left" }}>
                                      <span style={styles.detailLabel}>🚨 Testigos/Luces Activas al Ingreso:</span>
                                      <div style={styles.lightsGrid}>
                                        {item.luces.map(l => (
                                          <span key={l} style={styles.lightBadge}>
                                            {getWarningLightLabel(l)}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Checklist de Recepción */}
                                  {item.checklist && Object.keys(item.checklist).length > 0 && (
                                    <div style={{ marginBottom: "20px", textAlign: "left" }}>
                                      <span style={styles.detailLabel}>📋 Checklist de Recepción:</span>
                                      <div style={styles.checklistHistoryGrid}>
                                        {Object.entries(item.checklist).map(([key, value]) => {
                                          const label = defaultChecklistItems.find(i => i.id === key)?.label || key;
                                          let status = "";
                                          let note = "";
                                          
                                          if (value && typeof value === "object") {
                                            status = value.status || "N/A";
                                            note = value.note || "";
                                          } else {
                                            status = value || "N/A";
                                          }

                                          let badgeColor = "rgba(255,255,255,0.06)";
                                          let textColor = "#fff";
                                          if (status === "Bueno" || status === "Funciona") {
                                            badgeColor = "rgba(16, 185, 129, 0.15)";
                                            textColor = "var(--color-success)";
                                          } else if (status === "Regular") {
                                            badgeColor = "rgba(245, 158, 11, 0.15)";
                                            textColor = "var(--color-warning)";
                                          } else if (status === "Malo" || status === "No Funciona") {
                                            badgeColor = "rgba(239, 68, 68, 0.15)";
                                            textColor = "#ef4444";
                                          }

                                          return (
                                            <div key={key} style={styles.checklistHistoryItem}>
                                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                                <span style={styles.checklistHistoryLabel}>{label}</span>
                                                <span style={{
                                                  ...styles.checklistStatusBadge,
                                                  backgroundColor: badgeColor,
                                                  color: textColor
                                                }}>
                                                  {status}
                                                </span>
                                              </div>
                                              {note && (
                                                <div style={styles.checklistHistoryNote}>
                                                  📝 {note}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Detailed Budget Table */}
                                  {item.presupuesto && (item.presupuesto.labor?.length > 0 || item.presupuesto.parts?.length > 0 || item.presupuesto.services?.length > 0) ? (
                                    <div style={{ textAlign: "left" }}>
                                      <span style={styles.detailLabel}>📋 Presupuesto Elaborado:</span>
                                      <div style={styles.tableWrapper}>
                                        <table style={styles.budgetTable}>
                                          <thead>
                                            <tr>
                                              <th style={styles.bTh}>Descripción / Ítem</th>
                                              <th style={styles.bTh}>Tipo</th>
                                              <th style={{ ...styles.bTh, textAlign: "right" }}>Precio</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {/* Labor */}
                                            {(item.presupuesto.labor || []).map((l, i) => (
                                              <tr key={`l-${i}`} style={styles.bTr}>
                                                <td style={styles.bTd}>🛠️ {l.desc}</td>
                                                <td style={styles.bTd}>Mano de Obra</td>
                                                <td style={{ ...styles.bTd, textAlign: "right", color: "#fff" }}>{formatMoney(l.price)}</td>
                                              </tr>
                                            ))}
                                            {/* Parts */}
                                            {(item.presupuesto.parts || []).map((p, i) => (
                                              <tr key={`p-${i}`} style={styles.bTr}>
                                                <td style={styles.bTd}>📦 {p.desc} {p.code ? `(${p.code})` : ""} x{p.qty}</td>
                                                <td style={styles.bTd}>Repuesto</td>
                                                <td style={{ ...styles.bTd, textAlign: "right", color: "#fff" }}>{formatMoney((p.price || 0) * (p.qty || 1))}</td>
                                              </tr>
                                            ))}
                                            {/* Services */}
                                            {(item.presupuesto.services || []).map((s, i) => (
                                              <tr key={`s-${i}`} style={styles.bTr}>
                                                <td style={styles.bTd}>⚙️ {s.desc}</td>
                                                <td style={styles.bTd}>Servicio Externo</td>
                                                <td style={{ ...styles.bTd, textAlign: "right", color: "#fff" }}>{formatMoney(s.price)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  ) : (
                                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "left", margin: "10px 0" }}>
                                      No se desglosó presupuesto detallado para este servicio.
                                    </p>
                                  )}
                                  
                                  {/* Photos */}
                                  {item.fotos && item.fotos.length > 0 && (
                                    <div style={{ marginTop: "16px", textAlign: "left" }}>
                                      <span style={styles.detailLabel}>📸 Fotos del Expediente:</span>
                                      <div style={styles.photosGrid}>
                                        {item.fotos.map((img, idx) => (
                                          <img key={idx} src={img} alt={`Ficha ${idx + 1}`} style={styles.photoThumb} />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            // Carwash details
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                              <div style={styles.summaryDetails}>
                                <div style={styles.summaryField}>
                                  <User size={14} style={{ color: "var(--text-muted)" }} />
                                  <span>Lavadores: <strong>{item.lavador || "Sin asignar"}</strong></span>
                                </div>
                                <div style={styles.summaryField}>
                                  <Clock size={14} style={{ color: "var(--text-muted)" }} />
                                  <span>Estado: <strong style={{ color: item.estado === "Entregado" ? "var(--color-success)" : "var(--color-warning)" }}>{item.estado}</strong></span>
                                </div>
                                <div style={styles.summaryField}>
                                  <FileText size={14} style={{ color: "var(--text-muted)" }} />
                                  <span>Tipo lavado: <strong>{item.tipoLavado}</strong></span>
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                <button
                                  onClick={() => setClientReportModal({ isOpen: true, vehicle: selectedVehicle, item })}
                                  style={{
                                    backgroundColor: "rgba(99, 102, 241, 0.15)",
                                    color: "var(--color-primary)",
                                    border: "1px solid rgba(99, 102, 241, 0.3)",
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    fontSize: "0.78rem",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                  }}
                                  type="button"
                                >
                                  <Printer size={14} /> Reporte Cliente
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={styles.emptyDetailCard}>
              <History size={64} color="var(--text-muted)" style={{ marginBottom: "16px", opacity: 0.3 }} />
              <h3>Historial del Expediente</h3>
              <p>Selecciona un vehículo de la lista para ver todo su historial de servicios, kilometrajes, diagnósticos y costos asociados.</p>
            </div>
          )}
        </div>

      </div>

      {/* CLIENT REPORT MODAL */}
      {clientReportModal.isOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(6px)",
          zIndex: 9999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#111827",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "850px",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            color: "#f3f4f6"
          }} className="client-report-paper">
            
            {/* Modal Actions Header (Hidden during print) */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "rgba(255,255,255,0.02)"
            }} className="no-print">
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <Printer size={18} color="var(--color-primary)" /> Vista / Reporte para Cliente
              </h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontWeight: "700",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                  type="button"
                >
                  <Printer size={16} /> Imprimir / Guardar PDF
                </button>
                <button
                  onClick={() => setClientReportModal({ isOpen: false, item: null, vehicle: null })}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Sheet Content */}
            <div style={{ padding: "30px", textAlign: "left" }}>
              
              {/* Header Branding */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid var(--color-primary)", paddingBottom: "16px", marginBottom: "20px" }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: "900", color: "#fff", letterSpacing: "1px" }}>
                    LOS PITS
                  </h1>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Centro Automotriz, Taller Mecánico & Carwash
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>INFORMACIÓN DE SERVICIO</span>
                  <strong style={{ fontSize: "1.1rem", color: "var(--color-primary)" }}>
                    {clientReportModal.item?.id ? `ORDEN #${String(clientReportModal.item.id).slice(-6)}` : "EXPEDIENTE DE HISTORIAL"}
                  </strong>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>
                    Fecha: {formatDate(clientReportModal.item?.fecha || clientReportModal.vehicle?.lastServiceDate)}
                  </span>
                </div>
              </div>

              {/* Vehicle & Client Info Boxes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                
                {/* Vehicle Box */}
                <div style={{ backgroundColor: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "var(--color-primary)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Car size={15} /> Datos del Vehículo
                  </h4>
                  <div style={{ fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "4px", color: "#e5e7eb" }}>
                    <div><strong>Placa:</strong> <span style={{ color: "var(--color-secondary)", fontWeight: "bold" }}>{clientReportModal.vehicle?.placa}</span></div>
                    <div><strong>Vehículo:</strong> {clientReportModal.vehicle?.marca} {clientReportModal.vehicle?.linea} ({clientReportModal.vehicle?.anio})</div>
                    <div><strong>Chasis / VIN:</strong> {clientReportModal.vehicle?.chasis}</div>
                    {clientReportModal.item?.kilometraje && (
                      <div><strong>Kilometraje:</strong> {clientReportModal.item.kilometraje} km</div>
                    )}
                  </div>
                </div>

                {/* Client Box */}
                <div style={{ backgroundColor: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "var(--color-primary)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                    <User size={15} /> Datos del Cliente
                  </h4>
                  <div style={{ fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "4px", color: "#e5e7eb" }}>
                    <div><strong>Nombre:</strong> {clientReportModal.vehicle?.cliente}</div>
                    {clientReportModal.vehicle?.telefono && (
                      <div><strong>Teléfono:</strong> {clientReportModal.vehicle.telefono}</div>
                    )}
                    {clientReportModal.item?.mecanico && (
                      <div><strong>Mecánico Encargado:</strong> {clientReportModal.item.mecanico}</div>
                    )}
                    {clientReportModal.item?.estado && (
                      <div><strong>Estado:</strong> {clientReportModal.item.estado}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Works & Items Table (NO COSTS, NO PROFIT, NO MARGINS) */}
              <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#fff", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                <FileCheck size={16} color="var(--color-primary)" /> Detalle de Trabajos Realizados y Repuestos Presentados
              </h4>

              {clientReportModal.item ? (
                /* Single Order Report Table */
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      <th style={{ padding: "10px", textAlign: "left", fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Descripción de Trabajo / Ítem</th>
                      <th style={{ padding: "10px", textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Tipo</th>
                      <th style={{ padding: "10px", textAlign: "right", fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Precio Presentado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientReportModal.item.presupuesto ? (
                      <>
                        {(clientReportModal.item.presupuesto.labor || []).map((l, i) => (
                          <tr key={`l-${i}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td style={{ padding: "10px", fontSize: "0.85rem", color: "#fff" }}>🛠️ {l.desc}</td>
                            <td style={{ padding: "10px", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>Mano de Obra</td>
                            <td style={{ padding: "10px", textAlign: "right", fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>{formatMoney(l.price)}</td>
                          </tr>
                        ))}
                        {(clientReportModal.item.presupuesto.parts || []).map((p, i) => (
                          <tr key={`p-${i}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td style={{ padding: "10px", fontSize: "0.85rem", color: "#fff" }}>📦 {p.desc} {p.code ? `(${p.code})` : ""} x{p.qty || 1}</td>
                            <td style={{ padding: "10px", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>Repuesto</td>
                            <td style={{ padding: "10px", textAlign: "right", fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>{formatMoney((p.price || 0) * (p.qty || 1))}</td>
                          </tr>
                        ))}
                        {(clientReportModal.item.presupuesto.services || []).map((s, i) => (
                          <tr key={`s-${i}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td style={{ padding: "10px", fontSize: "0.85rem", color: "#fff" }}>⚙️ {s.desc}</td>
                            <td style={{ padding: "10px", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>Servicio Técnico</td>
                            <td style={{ padding: "10px", textAlign: "right", fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>{formatMoney(s.price)}</td>
                          </tr>
                        ))}
                      </>
                    ) : (
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "10px", fontSize: "0.85rem", color: "#fff" }}>{clientReportModal.item.trabajo}</td>
                        <td style={{ padding: "10px", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>{clientReportModal.item.tipo}</td>
                        <td style={{ padding: "10px", textAlign: "right", fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>{formatMoney(clientReportModal.item.total)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid rgba(255,255,255,0.15)" }}>
                      <td colSpan={2} style={{ padding: "12px 10px", textAlign: "right", fontWeight: "800", fontSize: "0.95rem", color: "#fff" }}>TOTAL DEL SERVICIO:</td>
                      <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: "900", fontSize: "1.1rem", color: "var(--color-success)" }}>
                        {formatMoney(clientReportModal.item.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                /* Full Vehicle History Summary Table */
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      <th style={{ padding: "10px", textAlign: "left", fontSize: "0.78rem", color: "var(--text-muted)" }}>Fecha</th>
                      <th style={{ padding: "10px", textAlign: "left", fontSize: "0.78rem", color: "var(--text-muted)" }}>Servicio / Trabajo Realizado</th>
                      <th style={{ padding: "10px", textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)" }}>Atendido por</th>
                      <th style={{ padding: "10px", textAlign: "right", fontSize: "0.78rem", color: "var(--text-muted)" }}>Precio al Cliente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientReportModal.vehicle?.history.map((h, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "10px", fontSize: "0.82rem", color: "var(--text-muted)" }}>{formatDate(h.fecha).split(" ")[0]}</td>
                        <td style={{ padding: "10px", fontSize: "0.85rem", color: "#fff" }}>{h.trabajo || h.tipoLavado || "Servicio"}</td>
                        <td style={{ padding: "10px", textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)" }}>{h.mecanico || h.lavador || "Taller"}</td>
                        <td style={{ padding: "10px", textAlign: "right", fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>{formatMoney(h.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Footer Guarantee Notice */}
              <div style={{ marginTop: "30px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span>🛡️ Garantía de trabajo conforme y revisión aprobada.</span>
                  <br />
                  <span>Gracias por su preferencia en Centro Automotriz Los Pits.</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span>Firma de Conformidad: ______________________</span>
                </div>
              </div>

            </div>
          </div>
        </div>
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
    flexWrap: "wrap",
    gap: "16px",
    textAlign: "left",
  },
  filterTabsContainer: {
    display: "flex",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: "4px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  filterTabButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    fontSize: "0.85rem",
    fontWeight: "700",
    color: "var(--text-muted)",
    background: "none",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "var(--transition-smooth)",
  },
  filterTabActiveAll: {
    color: "#fff",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  filterTabActiveTaller: {
    color: "#fff",
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    boxShadow: "0 0 10px rgba(59, 130, 246, 0.1)",
  },
  filterTabActiveCarwash: {
    color: "#fff",
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    boxShadow: "0 0 10px rgba(168, 85, 247, 0.1)",
  },
  title: {
    fontSize: "2.2rem",
    fontWeight: "800",
    marginBottom: "5px",
    background: "linear-gradient(135deg, #fff 60%, var(--color-primary) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: "30px",
    alignItems: "start",
    width: "100%",
  },
  sidebarCard: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    height: "calc(100vh - 170px)",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  searchContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    color: "var(--text-muted)",
  },
  searchInput: {
    width: "100%",
    padding: "10px 10px 10px 38px",
    backgroundColor: "rgba(20, 24, 33, 0.6)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "0.85rem",
    outline: "none",
  },
  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    overflowY: "auto",
    flex: 1,
    paddingRight: "4px",
  },
  vehicleItem: {
    display: "flex",
    flexDirection: "column",
    padding: "14px",
    borderRadius: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    cursor: "pointer",
    transition: "var(--transition-smooth)",
  },
  vehicleItemActive: {
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderColor: "rgba(59, 130, 246, 0.25)",
  },
  placaBadge: {
    fontSize: "0.8rem",
    fontWeight: "800",
    padding: "2px 8px",
    borderRadius: "6px",
    color: "#fff",
    fontFamily: "var(--font-display)",
    letterSpacing: "0.5px",
  },
  servicesBadge: {
    fontSize: "0.72rem",
    color: "var(--color-primary)",
    fontWeight: "700",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    padding: "1px 6px",
    borderRadius: "4px",
  },
  lastServiceText: {
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    marginTop: "8px",
    textAlign: "left",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 10px",
  },
  detailColumn: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    height: "calc(100vh - 170px)",
    overflowY: "auto",
    paddingRight: "8px",
  },
  emptyDetailCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 30px",
    color: "var(--text-muted)",
    height: "100%",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  profileCard: {
    padding: "24px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    textAlign: "left",
  },
  profileHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "16px",
  },
  profileTitleWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  iconBg: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  profilePlaca: {
    fontSize: "1.5rem",
    fontWeight: "900",
    fontFamily: "var(--font-display)",
    letterSpacing: "1px",
    color: "#fff",
    lineHeight: "1.2",
  },
  profileSub: {
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    margin: "2px 0 0 0",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },
  infoField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  infoLabel: {
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: "700",
  },
  infoValue: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#fff",
  },
  timeline: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    paddingLeft: "24px",
    borderLeft: "2px solid rgba(255, 255, 255, 0.04)",
    textAlign: "left",
  },
  timelineItem: {
    position: "relative",
  },
  timelineDot: {
    position: "absolute",
    left: "-34px",
    top: "22px",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    borderWidth: "2px",
    borderStyle: "solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineCard: {
    padding: "20px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "14px",
  },
  cardDate: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: "1rem",
    fontWeight: "800",
    color: "#fff",
    marginTop: "2px",
  },
  typeBadge: {
    fontSize: "0.7rem",
    fontWeight: "800",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  cardPrice: {
    fontSize: "1.1rem",
    fontWeight: "800",
    color: "var(--color-success)",
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  summaryDetails: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.03)",
  },
  summaryField: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.8rem",
    color: "var(--text-main)",
  },
  toggleBtn: {
    background: "none",
    border: "none",
    color: "var(--color-primary)",
    fontSize: "0.82rem",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: 0,
    width: "fit-content",
    transition: "opacity 0.2s ease",
    ":hover": {
      opacity: 0.8
    }
  },
  expandedContent: {
    marginTop: "10px",
    paddingTop: "14px",
    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
  },
  detailLabel: {
    fontSize: "0.78rem",
    fontWeight: "700",
    color: "var(--text-muted)",
    display: "block",
    marginBottom: "8px",
    textTransform: "uppercase",
  },
  lightsGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  lightBadge: {
    fontSize: "0.72rem",
    padding: "3px 8px",
    borderRadius: "6px",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fff",
    fontWeight: "600",
  },
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    marginTop: "6px",
  },
  budgetTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  bTh: {
    padding: "10px 14px",
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  },
  bTr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
  },
  bTd: {
    padding: "10px 14px",
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  },
  photosGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "8px",
  },
  photoThumb: {
    width: "80px",
    height: "80px",
    borderRadius: "6px",
    objectFit: "cover",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  checklistHistoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "10px",
    marginTop: "8px",
  },
  checklistHistoryItem: {
    display: "flex",
    flexDirection: "column",
    padding: "10px 12px",
    borderRadius: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  checklistHistoryLabel: {
    fontSize: "0.82rem",
    fontWeight: "600",
    color: "#fff",
  },
  checklistStatusBadge: {
    fontSize: "0.7rem",
    fontWeight: "800",
    padding: "2px 6px",
    borderRadius: "4px",
    textTransform: "uppercase",
  },
  checklistHistoryNote: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    marginTop: "6px",
    paddingTop: "6px",
    borderTop: "1px solid rgba(255, 255, 255, 0.03)",
  }
};
