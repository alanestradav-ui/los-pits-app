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
  DollarSign
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

export default function VehicleHistory({ ordenes = [], carwash = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlaca, setSelectedPlaca] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState({});

  // 1. Group and compile history by Plate (placa)
  const vehiclesMap = {};

  // Process Workshop Orders
  ordenes.forEach(o => {
    const placaClean = (o.placa || "").toUpperCase().trim();
    if (!placaClean || placaClean === "N/A" || placaClean === "SIN PLACA") return;
    
    if (!vehiclesMap[placaClean]) {
      vehiclesMap[placaClean] = {
        placa: placaClean,
        marca: o.marca || "N/A",
        linea: o.linea || "N/A",
        anio: o.anio || "N/A",
        chasis: o.chasis || "N/A",
        cliente: o.cliente || "N/A",
        telefono: o.telefono || "",
        vehiculoDesc: o.vehiculo || `${o.marca || ""} ${o.linea || ""}`,
        history: []
      };
    }

    // Keep the most complete data
    if (o.marca && o.marca !== "N/A") vehiclesMap[placaClean].marca = o.marca;
    if (o.linea && o.linea !== "N/A") vehiclesMap[placaClean].linea = o.linea;
    if (o.anio && o.anio !== "N/A") vehiclesMap[placaClean].anio = o.anio;
    if (o.chasis && o.chasis !== "N/A") vehiclesMap[placaClean].chasis = o.chasis;
    if (o.cliente && o.cliente !== "N/A") vehiclesMap[placaClean].cliente = o.cliente;
    if (o.telefono) vehiclesMap[placaClean].telefono = o.telefono;

    vehiclesMap[placaClean].history.push({
      id: o.id,
      tipo: "Taller",
      fecha: o.fecha,
      estado: o.estado,
      total: o.total,
      mecanico: o.mecanico || "Sin asignar",
      trabajo: o.trabajo || o.motivoIngreso || "Servicio general de taller",
      kilometraje: o.kilometraje || "N/A",
      combustible: o.combustible !== undefined ? o.combustible : 0,
      luces: o.luces || [],
      presupuesto: o.presupuesto || null,
      fotos: o.fotos || [],
      checklist: o.checklist || null
    });
  });

  // Process Carwash entries
  carwash.forEach(c => {
    const placaClean = (c.vehiculo?.placa || "").toUpperCase().trim();
    if (!placaClean || placaClean === "N/A") return;

    if (!vehiclesMap[placaClean]) {
      vehiclesMap[placaClean] = {
        placa: placaClean,
        marca: c.vehiculo?.marca || "N/A",
        linea: c.vehiculo?.linea || "N/A",
        anio: "N/A",
        chasis: "N/A",
        cliente: c.cliente || "N/A",
        telefono: c.telefono || "",
        vehiculoDesc: `${c.vehiculo?.marca || ""} ${c.vehiculo?.linea || ""}`,
        history: []
      };
    }

    if (c.cliente && c.cliente !== "N/A") vehiclesMap[placaClean].cliente = c.cliente;
    if (c.telefono) vehiclesMap[placaClean].telefono = c.telefono;

    vehiclesMap[placaClean].history.push({
      id: c.id,
      tipo: "Carwash",
      fecha: c.fecha,
      estado: c.estado,
      total: c.precio,
      lavador: c.lavador || "Sin asignar",
      tipoLavado: c.tipo,
      fotos: c.fotos || []
    });
  });

  // Convert map to array and sort history entries chronologically for each vehicle
  const vehiclesList = Object.values(vehiclesMap).map(vehicle => {
    vehicle.history.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    // Determine the last service date
    vehicle.lastServiceDate = vehicle.history[0]?.fecha || "";
    vehicle.totalServices = vehicle.history.length;
    return vehicle;
  });

  // 2. Filter list by query
  const filteredVehicles = vehiclesList.filter(v => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      v.placa.toLowerCase().includes(query) ||
      v.marca.toLowerCase().includes(query) ||
      v.linea.toLowerCase().includes(query) ||
      v.cliente.toLowerCase().includes(query) ||
      v.chasis.toLowerCase().includes(query)
    );
  });

  const selectedVehicle = selectedPlaca ? vehiclesMap[selectedPlaca] : null;

  const toggleOrderExpand = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

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

                              {/* Toggle Details Button */}
                              <button
                                onClick={() => toggleOrderExpand(item.id)}
                                style={styles.toggleBtn}
                                type="button"
                              >
                                {isExpanded ? (
                                  <>Ocultar Detalles <ChevronUp size={14} /></>
                                ) : (
                                  <>Ver Diagnóstico y Detalle de Presupuesto <ChevronDown size={14} /></>
                                )}
                              </button>

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
