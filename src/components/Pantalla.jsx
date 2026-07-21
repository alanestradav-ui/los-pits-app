import React, { useState, useEffect, useRef } from "react";
import { 
  Wrench, 
  Car, 
  User, 
  Clock, 
  CheckCircle, 
  Search, 
  Play, 
  Pause, 
  Tv, 
  Monitor, 
  LayoutGrid, 
  Columns, 
  Palette, 
  AlertCircle,
  ShieldAlert,
  HelpCircle
} from "lucide-react";

// Mapeo inteligente de colores de vehículos a códigos hexadecimales
const getColorHex = (colorName) => {
  if (!colorName) return null;
  const name = colorName.toLowerCase().trim();
  
  if (name.includes("rojo")) return "#ef4444";
  if (name.includes("azul")) return "#3b82f6";
  if (name.includes("verde")) return "#10b981";
  if (name.includes("blanco")) return "#ffffff";
  if (name.includes("negro")) return "#1e293b"; // Gris muy oscuro para destacar en fondo negro
  if (name.includes("gris")) return "#6b7280";
  if (name.includes("amarillo")) return "#eab308";
  if (name.includes("plata") || name.includes("silver") || name.includes("plateado")) return "#cbd5e1";
  if (name.includes("dorado") || name.includes("oro")) return "#fbbf24";
  if (name.includes("cafe") || name.includes("café") || name.includes("marrón") || name.includes("marron")) return "#78350f";
  if (name.includes("naranja")) return "#f97316";
  if (name.includes("morado") || name.includes("púrpura") || name.includes("purpura")) return "#a855f7";
  if (name.includes("beige") || name.includes("arena")) return "#f5f5dc";
  
  return null; // Si no coincide, retornamos null para mostrar un degradado neutro
};

// Retorna el estilo CSS para badges según el estado del Taller
const getTallerStatusConfig = (estado) => {
  switch (estado) {
    case "En recepción":
      return { label: "Recepción", color: "#60a5fa", glow: "rgba(96, 165, 250, 0.2)" };
    case "En proceso de diagnóstico y presupuesto":
      return { label: "Diagnóstico", color: "#f59e0b", glow: "rgba(245, 158, 11, 0.2)" };
    case "En espera de autorización":
      return { label: "En Espera", color: "#a855f7", glow: "rgba(168, 85, 247, 0.2)" };
    case "En proceso de reparación":
      return { label: "Reparación", color: "#3b82f6", glow: "rgba(59, 130, 246, 0.3)" };
    case "En período de prueba y control de calidad":
      return { label: "Calidad", color: "#06b6d4", glow: "rgba(6, 182, 212, 0.2)" };
    case "En proceso de lavado":
      return { label: "Lavado", color: "#6366f1", glow: "rgba(99, 102, 241, 0.2)" };
    case "Listo para entrega":
      return { label: "¡LISTO!", color: "#10b981", glow: "rgba(16, 185, 129, 0.4)", pulse: true };
    default:
      return { label: estado, color: "#9ca3af", glow: "rgba(156, 163, 175, 0.2)" };
  }
};

// Retorna el estilo CSS para badges según el estado del Carwash
const getCarwashStatusConfig = (estado) => {
  switch (estado) {
    case "En proceso":
      return { label: "En Lavado", color: "#f59e0b", glow: "rgba(245, 158, 11, 0.2)" };
    case "Listo para entrega":
      return { label: "¡LISTO!", color: "#10b981", glow: "rgba(16, 185, 129, 0.4)", pulse: true };
    default:
      return { label: estado, color: "#9ca3af", glow: "rgba(156, 163, 175, 0.2)" };
  }
};

export default function Pantalla({ ordenes = [], carwash = [], usuarioActual, usuarios = [] }) {
  const [viewMode, setViewMode] = useState("split"); // 'split' | 'taller' | 'carwash'
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotationIntervalSeconds, setRotationIntervalSeconds] = useState(15);
  
  const rotationTimerRef = useRef(null);

  // Lógica para auto-rotar las vistas de pantalla
  useEffect(() => {
    if (autoRotate) {
      rotationTimerRef.current = setInterval(() => {
        setViewMode((current) => {
          if (current === "split") return "taller";
          if (current === "taller") return "carwash";
          return "split";
        });
      }, rotationIntervalSeconds * 1000);
    } else {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
      }
    }

    return () => {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
      }
    };
  }, [autoRotate, rotationIntervalSeconds]);

  // Filtrar órdenes de taller activas (que no estén en estado "Entregado")
  const activeTaller = ordenes.filter(o => o && o.estado !== "Entregado");

  // Filtrar servicios de carwash activos (que no estén en estado "Entregado")
  const activeCarwash = carwash.filter(c => c && c.estado !== "Entregado");

  // Función de filtro de búsqueda
  const filterBySearch = (item, isTaller = true) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    
    if (isTaller) {
      const placa = (item.placa || "").toLowerCase();
      const marca = (item.marca || "").toLowerCase();
      const linea = (item.linea || "").toLowerCase();
      const cliente = (item.cliente || "").toLowerCase();
      const mecanico = (item.mecanico || "").toLowerCase();
      
      return placa.includes(query) || 
             marca.includes(query) || 
             linea.includes(query) || 
             cliente.includes(query) ||
             mecanico.includes(query);
    } else {
      const v = item.vehiculo || {};
      const placa = (v.placa || item.placa || "").toLowerCase();
      const marca = (v.marca || item.marca || "").toLowerCase();
      const linea = (v.linea || item.linea || "").toLowerCase();
      const cliente = (item.cliente || "").toLowerCase();
      const lavador = (item.lavador || "").toLowerCase();
      
      return placa.includes(query) || 
             marca.includes(query) || 
             linea.includes(query) || 
             cliente.includes(query) ||
             lavador.includes(query);
    }
  };

  const filteredTaller = activeTaller.filter(o => filterBySearch(o, true));
  const filteredCarwash = activeCarwash.filter(c => filterBySearch(c, false));

  // Renderizador de Placa Realista
  const renderPlacaGraphic = (placaText) => {
    const cleanPlaca = (placaText || "SIN PLACA").toUpperCase().trim();
    return (
      <div className="placa-container" style={styles.placaGraphic}>
        <div style={styles.placaBorder}>
          <span style={styles.placaPais}>GUATEMALA</span>
          <span style={styles.placaNum}>{cleanPlaca}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* HEADER CONTROL BAR */}
      <div className="glass-panel" style={styles.controlHeader}>
        <div style={styles.titleSection}>
          <div style={styles.liveIndicator}>
            <span className="live-dot" style={styles.liveDot}></span>
            <span style={styles.liveText}>PANEL DE MONITOREO</span>
          </div>
          <p style={styles.subtitle}>Estado de vehículos en proceso en tiempo real</p>
        </div>

        {/* Search Field */}
        <div style={styles.searchContainer}>
          <Search size={18} color="var(--text-muted)" style={{ marginLeft: "12px" }} />
          <input
            type="text"
            placeholder="Buscar por placa, marca, línea, cliente o encargado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* View Mode & Auto-Rotate Controls */}
        <div style={styles.actionsContainer}>
          {/* Layout Controls */}
          <div style={styles.buttonGroup}>
            <button 
              onClick={() => { setViewMode("split"); setAutoRotate(false); }}
              style={{ ...styles.actionBtn, ...(viewMode === "split" ? styles.actionBtnActive : {}) }}
              title="Vista Dividida (Taller y Carwash)"
            >
              <Columns size={16} />
              <span style={styles.btnLabel}>Dividida</span>
            </button>
            <button 
              onClick={() => { setViewMode("taller"); setAutoRotate(false); }}
              style={{ ...styles.actionBtn, ...(viewMode === "taller" ? styles.actionBtnActive : {}) }}
              title="Vista Taller Completa"
            >
              <Wrench size={16} />
              <span style={styles.btnLabel}>Taller</span>
            </button>
            <button 
              onClick={() => { setViewMode("carwash"); setAutoRotate(false); }}
              style={{ ...styles.actionBtn, ...(viewMode === "carwash" ? styles.actionBtnActive : {}) }}
              title="Vista Carwash Completa"
            >
              <Car size={16} />
              <span style={styles.btnLabel}>Carwash</span>
            </button>
          </div>

          <div style={styles.divider} />

          {/* Auto Rotation Controls */}
          <div style={styles.rotationControl}>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              style={{ 
                ...styles.rotateBtn, 
                ...(autoRotate ? styles.rotateBtnActive : {}) 
              }}
              title={autoRotate ? "Pausar Rotación" : "Iniciar Rotación Automática"}
            >
              {autoRotate ? <Pause size={16} /> : <Play size={16} />}
              <span style={{ fontSize: "0.85rem", fontWeight: "700" }}>
                {autoRotate ? "Rotando" : "Auto-Rotar"}
              </span>
            </button>
            
            {autoRotate && (
              <select
                value={rotationIntervalSeconds}
                onChange={(e) => setRotationIntervalSeconds(Number(e.target.value))}
                style={styles.rotateSelect}
              >
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={45}>45s</option>
                <option value={60}>60s</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* VIEWS PRESENTATION */}
      <div style={styles.contentArea}>
        
        {/* ==================== 1. VISTA DIVIDIDA (LADO A LADO) ==================== */}
        {viewMode === "split" && (
          <div style={styles.splitLayout}>
            {/* COLUMN LEFT: TALLER */}
            <div className="glass-panel" style={styles.columnCard}>
              <div style={{ ...styles.columnHeader, borderBottom: "2px solid var(--color-primary)" }}>
                <div style={styles.columnHeaderTitle}>
                  <Wrench size={22} color="var(--color-primary)" />
                  <h2>Taller Mecánico</h2>
                </div>
                <span className="badge" style={{ backgroundColor: "var(--color-primary-glow)", color: "var(--color-primary)", fontWeight: "bold" }}>
                  {filteredTaller.length} activos
                </span>
              </div>
              
              <div style={styles.cardsScrollContainer}>
                {filteredTaller.length === 0 ? (
                  <div style={styles.emptyState}>
                    <Monitor size={48} color="rgba(255,255,255,0.1)" />
                    <p>No hay vehículos activos en Taller</p>
                  </div>
                ) : (
                  filteredTaller.map((item) => (
                    <TallerCard key={item.id} item={item} />
                  ))
                )}
              </div>
            </div>

            {/* COLUMN RIGHT: CARWASH */}
            <div className="glass-panel" style={styles.columnCard}>
              <div style={{ ...styles.columnHeader, borderBottom: "2px solid var(--color-secondary)" }}>
                <div style={styles.columnHeaderTitle}>
                  <Car size={22} color="var(--color-secondary)" />
                  <h2>Carwash & Lavado</h2>
                </div>
                <span className="badge" style={{ backgroundColor: "var(--color-secondary-glow)", color: "var(--color-secondary)", fontWeight: "bold" }}>
                  {filteredCarwash.length} activos
                </span>
              </div>

              <div style={styles.cardsScrollContainer}>
                {filteredCarwash.length === 0 ? (
                  <div style={styles.emptyState}>
                    <Monitor size={48} color="rgba(255,255,255,0.1)" />
                    <p>No hay vehículos activos en Carwash</p>
                  </div>
                ) : (
                  filteredCarwash.map((item) => (
                    <CarwashCard key={item.id} item={item} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. VISTA TALLER FULLSCREEN (KANBAN COLUMNS) ==================== */}
        {viewMode === "taller" && (
          <div style={styles.fullscreenViewContainer}>
            <div style={styles.fullscreenHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Wrench size={28} color="var(--color-primary)" />
                <h1 style={{ fontSize: "1.8rem", letterSpacing: "1px" }}>TALLER MECÁNICO - VEHÍCULOS ACTIVOS</h1>
              </div>
              <span className="badge glow-primary" style={{ backgroundColor: "var(--color-primary-glow)", color: "#fff", fontSize: "1rem", padding: "6px 16px", fontWeight: "bold" }}>
                Total: {filteredTaller.length} vehículos
              </span>
            </div>

            <div style={styles.kanbanLayout}>
              {/* COL 1: RECEPCIÓN Y DIAGNÓSTICO */}
              <div className="glass-panel" style={styles.kanbanColumn}>
                <div style={{ ...styles.kanbanColumnHeader, borderBottom: "3px solid #f59e0b" }}>
                  <h3>1. Recepción & Diagnóstico</h3>
                  <span style={styles.countBadge}>{filteredTaller.filter(o => ["En recepción", "En proceso de diagnóstico y presupuesto", "En espera de autorización"].includes(o.estado)).length}</span>
                </div>
                <div style={styles.kanbanScrollContainer}>
                  {filteredTaller.filter(o => ["En recepción", "En proceso de diagnóstico y presupuesto", "En espera de autorización"].includes(o.estado)).map(item => (
                    <TallerCard key={item.id} item={item} isFullscreen={true} />
                  ))}
                  {filteredTaller.filter(o => ["En recepción", "En proceso de diagnóstico y presupuesto", "En espera de autorización"].includes(o.estado)).length === 0 && (
                    <div style={styles.emptyKanban}>Sin vehículos en esta etapa</div>
                  )}
                </div>
              </div>

              {/* COL 2: EN REPARACIÓN / PRUEBAS */}
              <div className="glass-panel" style={styles.kanbanColumn}>
                <div style={{ ...styles.kanbanColumnHeader, borderBottom: "3px solid var(--color-primary)" }}>
                  <h3>2. Reparación & Calidad</h3>
                  <span style={styles.countBadge}>{filteredTaller.filter(o => ["En proceso de reparación", "En período de prueba y control de calidad", "En proceso de lavado"].includes(o.estado)).length}</span>
                </div>
                <div style={styles.kanbanScrollContainer}>
                  {filteredTaller.filter(o => ["En proceso de reparación", "En período de prueba y control de calidad", "En proceso de lavado"].includes(o.estado)).map(item => (
                    <TallerCard key={item.id} item={item} isFullscreen={true} />
                  ))}
                  {filteredTaller.filter(o => ["En proceso de reparación", "En período de prueba y control de calidad", "En proceso de lavado"].includes(o.estado)).length === 0 && (
                    <div style={styles.emptyKanban}>Sin vehículos en esta etapa</div>
                  )}
                </div>
              </div>

              {/* COL 3: LISTO PARA ENTREGA */}
              <div className="glass-panel" style={styles.kanbanColumn}>
                <div style={{ ...styles.kanbanColumnHeader, borderBottom: "3px solid var(--color-success)" }}>
                  <h3>3. Listos para Entrega</h3>
                  <span style={{ ...styles.countBadge, backgroundColor: "var(--color-success-glow)", color: "var(--color-success)" }}>
                    {filteredTaller.filter(o => o.estado === "Listo para entrega").length}
                  </span>
                </div>
                <div style={styles.kanbanScrollContainer}>
                  {filteredTaller.filter(o => o.estado === "Listo para entrega").map(item => (
                    <TallerCard key={item.id} item={item} isFullscreen={true} />
                  ))}
                  {filteredTaller.filter(o => o.estado === "Listo para entrega").length === 0 && (
                    <div style={styles.emptyKanban}>Sin vehículos listos</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 3. VISTA CARWASH FULLSCREEN (2 COLUMNS) ==================== */}
        {viewMode === "carwash" && (
          <div style={styles.fullscreenViewContainer}>
            <div style={styles.fullscreenHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Car size={28} color="var(--color-secondary)" />
                <h1 style={{ fontSize: "1.8rem", letterSpacing: "1px" }}>CARWASH - SERVICIOS ACTIVOS</h1>
              </div>
              <span className="badge glow-secondary" style={{ backgroundColor: "var(--color-secondary-glow)", color: "#fff", fontSize: "1rem", padding: "6px 16px", fontWeight: "bold" }}>
                Total: {filteredCarwash.length} vehículos
              </span>
            </div>

            <div style={styles.kanbanLayout}>
              {/* COL 1: EN PROCESO DE LAVADO */}
              <div className="glass-panel" style={{ ...styles.kanbanColumn, flex: 1 }}>
                <div style={{ ...styles.kanbanColumnHeader, borderBottom: "3px solid var(--color-warning)" }}>
                  <h3>1. En Proceso de Lavado / Detallado</h3>
                  <span style={styles.countBadge}>{filteredCarwash.filter(c => c.estado === "En proceso").length}</span>
                </div>
                <div style={styles.kanbanScrollContainer}>
                  {filteredCarwash.filter(c => c.estado === "En proceso").map(item => (
                    <CarwashCard key={item.id} item={item} isFullscreen={true} />
                  ))}
                  {filteredCarwash.filter(c => c.estado === "En proceso").length === 0 && (
                    <div style={styles.emptyKanban}>Sin servicios en lavado actualmente</div>
                  )}
                </div>
              </div>

              {/* COL 2: LISTO PARA ENTREGA */}
              <div className="glass-panel" style={{ ...styles.kanbanColumn, flex: 1 }}>
                <div style={{ ...styles.kanbanColumnHeader, borderBottom: "3px solid var(--color-success)" }}>
                  <h3>2. Terminados / Listos para Entrega</h3>
                  <span style={{ ...styles.countBadge, backgroundColor: "var(--color-success-glow)", color: "var(--color-success)" }}>
                    {filteredCarwash.filter(c => c.estado === "Listo para entrega").length}
                  </span>
                </div>
                <div style={styles.kanbanScrollContainer}>
                  {filteredCarwash.filter(c => c.estado === "Listo para entrega").map(item => (
                    <CarwashCard key={item.id} item={item} isFullscreen={true} />
                  ))}
                  {filteredCarwash.filter(c => c.estado === "Listo para entrega").length === 0 && (
                    <div style={styles.emptyKanban}>Sin servicios listos</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EMBEDDED ANIMATION STYLE */}
      <style>{`
        .live-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #ef4444;
          box-shadow: 0 0 10px #ef4444;
          animation: pulse-live 1.5s infinite ease-in-out;
        }
        @keyframes pulse-live {
          0% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 14px #ef4444; }
          100% { transform: scale(0.9); opacity: 0.5; }
        }
        .status-badge-pulse {
          animation: status-pulse-green 2s infinite ease-in-out;
        }
        @keyframes status-pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 10px 4px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .monitor-card {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .monitor-card:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3), 0 0 1px 1px rgba(255,255,255,0.08);
        }
        .placa-container {
          background: linear-gradient(180deg, #ffffff 0%, #e2e8f0 100%);
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.9), 0 3px 6px rgba(0,0,0,0.25);
        }
      `}</style>
    </div>
  );
}

// ==================== NESTED CARD COMPONENT: TALLER CARD ====================
function TallerCard({ item, isFullscreen = false }) {
  const statusCfg = getTallerStatusConfig(item.estado);
  const colorHex = getColorHex(item.color);
  
  // Extraer año de item.anio o item.vehiculo
  let anioDisplay = item.anio ? String(item.anio).trim() : "";
  if (!anioDisplay && typeof item.vehiculo === "object") {
    anioDisplay = item.vehiculo.anio ? String(item.vehiculo.anio).trim() : "";
  }

  // Motivo de trabajo formateado
  const trabajoDesc = item.trabajo || item.motivoIngreso || "Servicio general de taller";

  return (
    <div className="glass-panel monitor-card" style={{ ...styles.card, ...(isFullscreen ? styles.fullscreenCard : {}) }}>
      {/* Top Header: Placa y Status */}
      <div style={styles.cardHeader}>
        <div className="placa-wrapper" style={styles.placaWrapper}>
          {/* Dibujar placa metálica */}
          <div className="placa-container" style={styles.placaPlate}>
            <div style={styles.placaPlateInner}>
              <span style={styles.placaPlateText}>{(item.placa || "SIN PLACA").toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Badge del estado */}
        <span 
          className={`badge ${statusCfg.pulse ? "status-badge-pulse" : ""}`}
          style={{ 
            backgroundColor: statusCfg.glow, 
            color: statusCfg.color, 
            border: `1px solid ${statusCfg.color}40`,
            fontWeight: "800",
            fontSize: "0.78rem",
            padding: "4px 10px",
            borderRadius: "6px",
            letterSpacing: "0.5px"
          }}
        >
          {statusCfg.label.toUpperCase()}
        </span>
      </div>

      {/* Vehicle Info: Brand and Line */}
      <div style={styles.vehicleTitleRow}>
        <h3 style={styles.vehicleName}>
          {item.marca} {item.linea} {anioDisplay && <span style={styles.vehicleYear}>({anioDisplay})</span>}
        </h3>
      </div>

      {/* Color Badge */}
      <div style={styles.colorIndicatorRow}>
        {colorHex ? (
          <span 
            style={{ 
              ...styles.colorDot, 
              backgroundColor: colorHex,
              border: colorHex === "#ffffff" ? "1px solid #9ca3af" : "none",
              boxShadow: colorHex !== "#ffffff" ? `0 0 6px ${colorHex}80` : "none"
            }} 
          />
        ) : (
          <div style={{ ...styles.colorDot, background: "linear-gradient(45deg, red, orange, yellow, green, blue, purple)" }} />
        )}
        <span style={styles.colorText}>{item.color || "Color no especificado"}</span>
      </div>

      {/* Divider */}
      <div style={styles.cardDivider} />

      {/* Job Details */}
      <div style={styles.cardDetailItem}>
        <div style={styles.detailIconLabel}>
          <Palette size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <span style={styles.detailLabel}>Trabajo:</span>
        </div>
        <p style={styles.detailValueTrabajo}>{trabajoDesc}</p>
      </div>

      {/* Assigned Technician */}
      <div style={{ ...styles.cardDetailItem, marginTop: "8px" }}>
        <div style={styles.detailIconLabel}>
          <User size={14} color="var(--text-muted)" />
          <span style={styles.detailLabel}>Técnico:</span>
        </div>
        <div style={styles.technicianBadge}>
          <Wrench size={12} color="var(--color-primary)" />
          <strong style={styles.technicianName}>
            {item.mecanico ? item.mecanico : "Sin mecánico asignado"}
          </strong>
        </div>
      </div>
    </div>
  );
}

// ==================== NESTED CARD COMPONENT: CARWASH CARD ====================
function CarwashCard({ item, isFullscreen = false }) {
  const statusCfg = getCarwashStatusConfig(item.estado);
  const veh = item.vehiculo || {};
  const colorHex = getColorHex(veh.color || item.color);

  // Lógica para formatear trabajo de carwash
  let trabajoDesc = item.tipo || "Lavado General";
  if (item.trabajoAdicionalNombre) {
    trabajoDesc += ` + ${item.trabajoAdicionalNombre}`;
  }

  return (
    <div className="glass-panel monitor-card" style={{ ...styles.card, ...(isFullscreen ? styles.fullscreenCard : {}) }}>
      {/* Top Header: Placa y Status */}
      <div style={styles.cardHeader}>
        <div className="placa-wrapper" style={styles.placaWrapper}>
          <div className="placa-container" style={{ ...styles.placaPlate, borderColor: "var(--color-secondary)" }}>
            <div style={{ ...styles.placaPlateInner, borderLeft: "4px solid var(--color-secondary)" }}>
              <span style={styles.placaPlateText}>{(veh.placa || item.placa || "SIN PLACA").toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Badge del estado */}
        <span 
          className={`badge ${statusCfg.pulse ? "status-badge-pulse" : ""}`}
          style={{ 
            backgroundColor: statusCfg.glow, 
            color: statusCfg.color, 
            border: `1px solid ${statusCfg.color}40`,
            fontWeight: "800",
            fontSize: "0.78rem",
            padding: "4px 10px",
            borderRadius: "6px",
            letterSpacing: "0.5px"
          }}
        >
          {statusCfg.label.toUpperCase()}
        </span>
      </div>

      {/* Vehicle Info: Brand and Line */}
      <div style={styles.vehicleTitleRow}>
        <h3 style={styles.vehicleName}>
          {veh.marca || item.marca || "Vehículo"} {veh.linea || item.linea || ""}
          {item.anio && <span style={styles.vehicleYear}> ({item.anio})</span>}
        </h3>
      </div>

      {/* Color Badge */}
      <div style={styles.colorIndicatorRow}>
        {colorHex ? (
          <span 
            style={{ 
              ...styles.colorDot, 
              backgroundColor: colorHex,
              border: colorHex === "#ffffff" ? "1px solid #9ca3af" : "none",
              boxShadow: colorHex !== "#ffffff" ? `0 0 6px ${colorHex}80` : "none"
            }} 
          />
        ) : (
          <div style={{ ...styles.colorDot, background: "linear-gradient(45deg, red, orange, yellow, green, blue, purple)" }} />
        )}
        <span style={styles.colorText}>{veh.color || item.color || "Color no especificado"}</span>
      </div>

      {/* Divider */}
      <div style={styles.cardDivider} />

      {/* Job Details */}
      <div style={styles.cardDetailItem}>
        <div style={styles.detailIconLabel}>
          <Palette size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <span style={styles.detailLabel}>Servicio:</span>
        </div>
        <p style={styles.detailValueTrabajo}>{trabajoDesc}</p>
      </div>

      {/* Assigned Technician */}
      <div style={{ ...styles.cardDetailItem, marginTop: "8px" }}>
        <div style={styles.detailIconLabel}>
          <User size={14} color="var(--text-muted)" />
          <span style={styles.detailLabel}>Lavador:</span>
        </div>
        <div style={{ ...styles.technicianBadge, borderColor: "var(--color-secondary)30" }}>
          <Car size={12} color="var(--color-secondary)" />
          <strong style={styles.technicianName}>
            {item.lavador ? item.lavador : "Sin lavador asignado"}
          </strong>
        </div>
      </div>
    </div>
  );
}

// ==================== CSS STYLES (VANILLA JS OBJECTS) ====================
const styles = {
  container: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    height: "100%",
    width: "100%",
    overflow: "hidden",
  },
  controlHeader: {
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    borderRadius: "16px",
    background: "rgba(16, 20, 28, 0.8)",
  },
  titleSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  liveIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  liveDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: "#ef4444",
  },
  liveText: {
    fontFamily: "var(--font-display)",
    fontSize: "1.1rem",
    fontWeight: "900",
    color: "#fff",
    letterSpacing: "1.5px",
  },
  subtitle: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    marginTop: "2px",
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    background: "rgba(10, 12, 16, 0.6)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "10px",
    flex: 1,
    maxWidth: "450px",
    minWidth: "250px",
    height: "42px",
    transition: "all 0.3s ease",
  },
  searchInput: {
    border: "none",
    background: "transparent",
    color: "#fff",
    padding: "8px 12px",
    fontSize: "0.88rem",
    width: "100%",
    outline: "none",
  },
  actionsContainer: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  buttonGroup: {
    display: "flex",
    borderRadius: "10px",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(10, 12, 16, 0.4)",
    padding: "3px",
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "0.85rem",
    fontWeight: "700",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  actionBtnActive: {
    background: "linear-gradient(135deg, var(--color-primary), #1d4ed8)",
    color: "#fff",
    boxShadow: "0 4px 10px rgba(59, 130, 246, 0.2)",
  },
  btnLabel: {
    display: "inline-block",
  },
  divider: {
    width: "1px",
    height: "28px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  rotationControl: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  rotateBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 255, 255, 0.03)",
    color: "var(--text-main)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  rotateBtnActive: {
    background: "rgba(16, 185, 129, 0.15)",
    borderColor: "var(--color-success)",
    color: "var(--color-success)",
    boxShadow: "0 0 10px rgba(16, 185, 129, 0.2)",
  },
  rotateSelect: {
    background: "rgba(10, 12, 16, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    color: "#fff",
    padding: "6px 8px",
    fontSize: "0.85rem",
    fontWeight: "600",
    outline: "none",
    cursor: "pointer",
  },
  contentArea: {
    flex: 1,
    overflow: "hidden",
    width: "100%",
  },
  splitLayout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    height: "100%",
    width: "100%",
  },
  columnCard: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
    padding: "20px",
    background: "rgba(16, 20, 28, 0.6)",
  },
  columnHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "16px",
    marginBottom: "16px",
  },
  columnHeaderTitle: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  cardsScrollContainer: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    paddingRight: "6px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "60px 20px",
    color: "var(--text-muted)",
    textAlign: "center",
  },
  card: {
    padding: "16px",
    background: "rgba(25, 30, 44, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  placaWrapper: {
    display: "flex",
  },
  placaPlate: {
    backgroundColor: "#ffffff",
    border: "2px solid var(--color-primary)",
    borderRadius: "6px",
    padding: "2px 8px",
    minWidth: "110px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placaPlateInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    borderLeft: "4px solid var(--color-primary)",
    paddingLeft: "6px",
  },
  placaPlateText: {
    fontFamily: "var(--font-display)",
    fontWeight: "900",
    fontSize: "0.95rem",
    color: "#0a0c10",
    letterSpacing: "1px",
    lineHeight: "1",
  },
  vehicleTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  vehicleName: {
    fontSize: "1.05rem",
    fontWeight: "800",
    color: "#fff",
  },
  vehicleYear: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    fontWeight: "400",
  },
  colorIndicatorRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  colorDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    display: "inline-block",
  },
  colorText: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    textTransform: "capitalize",
    fontWeight: "600",
  },
  cardDivider: {
    height: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    margin: "4px 0 10px 0",
  },
  cardDetailItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  detailIconLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  detailLabel: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  detailValueTrabajo: {
    fontSize: "0.85rem",
    color: "#e2e8f0",
    lineHeight: "1.4",
    paddingLeft: "20px",
    fontWeight: "500",
  },
  technicianBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "8px",
    alignSelf: "flex-start",
    marginLeft: "20px",
  },
  technicianName: {
    fontSize: "0.8rem",
    color: "#fff",
    fontWeight: "700",
  },

  // FULLSCREEN / KANBAN STYLES
  fullscreenViewContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    height: "100%",
    width: "100%",
  },
  fullscreenHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 8px",
  },
  kanbanLayout: {
    display: "flex",
    gap: "20px",
    flex: 1,
    height: "100%",
    overflow: "hidden",
  },
  kanbanColumn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "16px",
    height: "100%",
    backgroundColor: "rgba(16, 20, 28, 0.6)",
    overflow: "hidden",
  },
  kanbanColumnHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "12px",
    marginBottom: "16px",
  },
  countBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    color: "#f59e0b",
    fontSize: "0.8rem",
    fontWeight: "800",
    padding: "2px 8px",
    borderRadius: "12px",
  },
  kanbanScrollContainer: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    paddingRight: "4px",
  },
  emptyKanban: {
    padding: "30px 10px",
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.2)",
    fontSize: "0.85rem",
    border: "1px dashed rgba(255, 255, 255, 0.05)",
    borderRadius: "10px",
  },
  fullscreenCard: {
    padding: "18px",
    background: "rgba(30, 41, 59, 0.45)",
    border: "1px solid rgba(255,255,255,0.06)",
  }
};
