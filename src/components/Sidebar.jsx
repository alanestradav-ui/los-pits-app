import React, { useState, useEffect, useRef } from "react";
import { 
  Gauge, 
  Wrench, 
  Car, 
  TrendingUp, 
  LogOut, 
  UserCircle2, 
  Coins,
  CircleParking,
  Warehouse,
  Coffee,
  Settings,
  ShoppingCart,
  ShoppingBag,
  History,
  Store,
  Receipt,
  Users,
  Wallet,
  Tv,
  GripVertical,
  RotateCcw,
  Gift,
  Gem,
  Award,
  Sparkles,
  Smartphone,
  CalendarClock
} from "lucide-react";
import { testSupabaseConnection } from "../utils/supabase";

export default function Sidebar({ usuarioActual, currentTab, setCurrentTab, onLogout, isOpen, setIsOpen, realtimeStatus, handleForceSyncMobile, activeTenantId = "lospits", onTenantChange }) {
  const rol = usuarioActual?.rol?.toLowerCase()?.trim();
  
  // Define menu items based on role permissions
  const menuItems = [
    { 
      id: "dashboard", 
      label: "Dashboard", 
      icon: Gauge, 
      roles: ["admin", "cajero"] 
    },
    { 
      id: "citas", 
      label: "Citas & Agenda", 
      icon: CalendarClock, 
      roles: ["admin", "cajero", "mecanico", "lavador", "jefe de taller"] 
    },
    { 
      id: "taller", 
      label: "Taller Mecánico", 
      icon: Wrench, 
      roles: ["admin", "cajero", "mecanico"] 
    },
    { 
      id: "carwash", 
      label: "Carwash", 
      icon: Car, 
      roles: ["admin", "cajero", "lavador"] 
    },
    { 
      id: "pantalla", 
      label: "Pantalla Monitor", 
      icon: Tv, 
      roles: ["admin", "cajero", "mecanico", "lavador", "jefe de taller"] 
    },
    { 
      id: "parqueo", 
      label: "Parqueo", 
      icon: CircleParking, 
      roles: ["admin", "cajero"] 
    },
    { 
      id: "bodega", 
      label: "Bodega Taller", 
      icon: Warehouse, 
      roles: ["admin", "cajero"] 
    },
    { 
      id: "cafeteria", 
      label: "Cafetería", 
      icon: Coffee, 
      roles: ["admin", "cajero"] 
    },
    {
      id: "tienda",
      label: "Tienda POS",
      icon: Store,
      roles: ["admin", "cajero"]
    },
    {
      id: "repuestosFaltantes",
      label: "Repuestos Faltantes",
      icon: ShoppingCart,
      roles: ["admin", "cajero", "jefe de taller"]
    },
    {
      id: "cuentas",
      label: "Cuentas por Pagar / Cobrar",
      icon: Receipt,
      roles: ["admin", "cajero"]
    },
    {
      id: "compras",
      label: "Compras Generales",
      icon: Wallet,
      roles: ["admin", "cajero"]
    },
    {
      id: "vehiculosVenta",
      label: "Vehículos en Venta",
      icon: Car,
      roles: ["admin", "cajero"]
    },
    {
      id: "clientesVehiculos",
      label: "Clientes / Vehículos",
      icon: Users,
      roles: ["admin", "cajero"]
    },
    {
      id: "recompensas",
      label: "Recompensas Pits",
      icon: Gift,
      roles: ["admin", "cajero"]
    },
    {
      id: "portal",
      label: "Portal Cliente & Wallet",
      icon: Smartphone,
      roles: ["admin", "cajero", "mecanico", "lavador", "jefe de taller"]
    },
    {
      id: "accesorios",
      label: "Accesorios POS",
      icon: ShoppingBag,
      roles: ["admin", "cajero"]
    },
    {
      id: "historial",
      label: "Historial Vehículos",
      icon: History,
      roles: ["admin", "cajero", "mecanico", "jefe de taller"]
    },
    {
      id: "cotizacionesVendedores",
      label: "Cotizar Repuestos",
      icon: ShoppingBag,
      roles: ["admin", "cajero", "jefe de taller", "jefe", "vendedor", "vendedor_repuestos"]
    },
    { 
      id: "finanzas", 
      label: "Finanzas & Reportes", 
      icon: TrendingUp, 
      roles: ["admin"] 
    },
    { 
      id: "configuracion", 
      label: "Configuración", 
      icon: Settings, 
      roles: ["admin"] 
    },
    {
      id: "saasAdmin",
      label: "👑 Panel SaaS Maestro",
      icon: Sparkles,
      roles: ["admin"]
    }
  ];

  const [orderedItems, setOrderedItems] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isReorderingActive, setIsReorderingActive] = useState(false);

  const pressTimer = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const isLongPressing = useRef(false);
  const justReordered = useRef(false);

  const storageKey = `sidebar_modules_order_${usuarioActual?.user || usuarioActual?.id || "default"}`;

  // Sync menu list with permissions and saved order
  useEffect(() => {
    const visible = menuItems.filter(item => {
      // 1. Primary master super-admin ("admin") retains full access
      if (usuarioActual?.user?.toLowerCase()?.trim() === "admin") return true;

      // 2. STRICT EXCLUSIVE ENFORCEMENT: Only show modules explicitly checked in the user's permissions array!
      if (Array.isArray(usuarioActual?.permissions)) {
        return usuarioActual.permissions.includes(item.id);
      }

      // 3. No fallback defaults: If permissions array is missing, hide module
      return false;
    });

    try {
      const savedOrderStr = localStorage.getItem(storageKey) || localStorage.getItem("sidebar_modules_order");
      if (savedOrderStr) {
        const savedOrder = JSON.parse(savedOrderStr);
        const visibleIds = new Set(visible.map(v => v.id));
        const sorted = [...visible].sort((a, b) => {
          const idxA = savedOrder.indexOf(a.id);
          const idxB = savedOrder.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        }).filter(item => visibleIds.has(item.id));
        setOrderedItems(sorted);
      } else {
        setOrderedItems(visible);
      }
    } catch (e) {
      setOrderedItems(visible);
    }
  }, [usuarioActual, rol, storageKey]);

  // Swaps items and saves array state to localStorage
  const reorderItems = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const nextItems = [...orderedItems];
    const [moved] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, moved);
    setOrderedItems(nextItems);
    
    try {
      const orderIds = nextItems.map(item => item.id);
      localStorage.setItem(storageKey, JSON.stringify(orderIds));
      localStorage.setItem("sidebar_modules_order", JSON.stringify(orderIds));
    } catch (e) {
      console.error(e);
    }
  };

  const resetOrder = () => {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem("sidebar_modules_order");
    } catch (e) {}
    const visible = menuItems.filter(item => {
      if (rol === "admin") return true;
      if (item.id === "finanzas" || item.id === "configuracion") {
        if (rol === "admin" || rol === "cajero") return true;
      }
      if (usuarioActual?.permissions) {
        return usuarioActual.permissions.includes(item.id);
      }
      return item.roles.includes(rol);
    });
    setOrderedItems(visible);
  };

  // --- Press and Hold Handlers (Mouse + Touch) ---
  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const startPressTimer = (index, clientX, clientY) => {
    clearPressTimer();
    isLongPressing.current = false;
    startPos.current = { x: clientX, y: clientY };

    pressTimer.current = setTimeout(() => {
      isLongPressing.current = true;
      setDraggedIndex(index);
      setIsReorderingActive(true);

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch (e) {}
      }
    }, 300); // 300ms press-and-hold duration
  };

  const handleMouseDown = (e, index) => {
    if (e.button !== 0) return; // Only main left click
    startPressTimer(index, e.clientX, e.clientY);
  };

  const handleTouchStart = (e, index) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startPressTimer(index, touch.clientX, touch.clientY);
  };

  const handlePointerMove = (clientX, clientY, e) => {
    if (pressTimer.current && !isReorderingActive) {
      const dx = clientX - startPos.current.x;
      const dy = clientY - startPos.current.y;
      if (Math.hypot(dx, dy) > 10) {
        clearPressTimer();
      }
    }

    if (isReorderingActive && draggedIndex !== null) {
      if (e && e.cancelable) e.preventDefault();

      const elementUnderPointer = document.elementFromPoint(clientX, clientY);
      if (!elementUnderPointer) return;

      const menuItem = elementUnderPointer.closest("[data-index]");
      if (menuItem) {
        const targetIndex = parseInt(menuItem.getAttribute("data-index"), 10);
        if (!isNaN(targetIndex) && targetIndex !== draggedIndex) {
          reorderItems(draggedIndex, targetIndex);
          setDraggedIndex(targetIndex);
        }
      }
    }
  };

  const handleMouseMove = (e) => {
    handlePointerMove(e.clientX, e.clientY, e);
  };

  const handleTouchMove = (e) => {
    if (e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, e);
    }
  };

  const handlePressEnd = () => {
    clearPressTimer();
    if (isLongPressing.current || isReorderingActive) {
      justReordered.current = true;
      setTimeout(() => {
        justReordered.current = false;
      }, 150);
    }
    setDraggedIndex(null);
    setIsReorderingActive(false);
    isLongPressing.current = false;
  };

  // HTML5 Drag and drop handlers (Desktop fallback)
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    setIsReorderingActive(true);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setIsReorderingActive(false);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    reorderItems(draggedIndex, index);
    setDraggedIndex(index);
  };

  // Determine badge colors for user roles
  const getRoleBadgeStyle = (userRole) => {
    switch (userRole) {
      case "admin":
        return { backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#f87171", borderColor: "rgba(239, 68, 68, 0.3)" };
      case "cajero":
        return { backgroundColor: "rgba(6, 182, 212, 0.15)", color: "#22d3ee", borderColor: "rgba(6, 182, 212, 0.3)" };
      case "mecanico":
        return { backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", borderColor: "rgba(245, 158, 11, 0.3)" };
      case "lavador":
        return { backgroundColor: "rgba(168, 85, 247, 0.15)", color: "#c084fc", borderColor: "rgba(168, 85, 247, 0.3)" };
      case "jefe de taller":
        return { backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.3)" };
      default:
        return {};
    }
  };

  return (
    <>
      <aside style={styles.sidebar} className={`app-sidebar ${isOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div style={styles.brand}>
          <div style={styles.brandIconContainer}>
            <Wrench size={22} color="#fff" />
          </div>
          <div style={styles.brandText}>
            <span style={styles.brandTitle}>LOS PITS</span>
            <span style={styles.brandSubtitle}>AUTO CENTER</span>
          </div>
        </div>

        {/* Active Workshop Badge & Quick Switcher */}
        <div style={{
          margin: "8px 12px 10px 12px",
          padding: "10px 12px",
          borderRadius: "10px",
          backgroundColor: (activeTenantId || "lospits") === "pruebas" ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)",
          border: (activeTenantId || "lospits") === "pruebas" ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(59, 130, 246, 0.4)",
          display: "flex",
          flexDirection: "column",
          gap: "6px"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: (activeTenantId || "lospits") === "pruebas" ? "#fbbf24" : "#60a5fa" }}>
              {(activeTenantId || "lospits") === "pruebas" ? "🧪 TALLER DE PRUEBAS" : "🏢 TALLER OFICIAL"}
            </span>
            <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: (activeTenantId || "lospits") === "pruebas" ? "#d97706" : "#2563eb", color: "#fff", fontWeight: "700" }}>
              {(activeTenantId || "lospits").toUpperCase()}
            </span>
          </div>
          {onTenantChange && (
            <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
              <button
                type="button"
                onClick={() => onTenantChange("lospits")}
                style={{
                  flex: 1,
                  padding: "5px 6px",
                  fontSize: "0.7rem",
                  borderRadius: "5px",
                  border: (activeTenantId || "lospits") === "lospits" ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: (activeTenantId || "lospits") === "lospits" ? "#2563eb" : "rgba(0,0,0,0.25)",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                🏢 Los Pits
              </button>
              <button
                type="button"
                onClick={() => onTenantChange("pruebas")}
                style={{
                  flex: 1,
                  padding: "5px 6px",
                  fontSize: "0.7rem",
                  borderRadius: "5px",
                  border: (activeTenantId || "lospits") === "pruebas" ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: (activeTenantId || "lospits") === "pruebas" ? "#d97706" : "rgba(0,0,0,0.25)",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                🧪 Pruebas
              </button>
            </div>
          )}
        </div>

        {/* Cloud Connection Semáforo Status */}
        <div className="cloud-status-container" style={{ ...styles.cloudStatusContainer, flexDirection: "column", gap: "6px" }}>
          {realtimeStatus === "connected" && (
            <div className="cloud-status-badge badge-connected" style={{ ...styles.cloudStatusBadge, ...styles.badgeConnected, backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <span className="cloud-status-dot dot-connected" style={{ ...styles.cloudStatusDot, ...styles.dotConnected, backgroundColor: "#10b981" }}></span>
              <span>🟢 Nube Conectada</span>
            </div>
          )}
          {realtimeStatus === "connecting" && (
            <div className="cloud-status-badge badge-connecting" style={{ ...styles.cloudStatusBadge, ...styles.badgeConnecting, backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
              <span className="cloud-status-dot dot-connecting" style={{ ...styles.cloudStatusDot, ...styles.dotConnecting, backgroundColor: "#f59e0b" }}></span>
              <span>🟡 Conectando con Nube...</span>
            </div>
          )}
          {(realtimeStatus === "disconnected" || realtimeStatus === "error") && (
            <div className="cloud-status-badge badge-disconnected" style={{ ...styles.cloudStatusBadge, ...styles.badgeDisconnected, backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
              <span className="cloud-status-dot dot-disconnected" style={{ ...styles.cloudStatusDot, ...styles.dotDisconnected, backgroundColor: "#ef4444" }}></span>
              <span>🔴 Modo Offline (Local)</span>
            </div>
          )}

          {handleForceSyncMobile && (
            <button
              type="button"
              onClick={() => {
                if (handleForceSyncMobile) handleForceSyncMobile(true);
              }}
              style={{
                width: "100%",
                padding: "6px 10px",
                fontSize: "0.75rem",
                fontWeight: "700",
                borderRadius: "6px",
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                color: "#60a5fa",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                marginTop: "4px"
              }}
            >
              🔄 Reintentar Sincronización
            </button>
          )}
        </div>

        {/* Profile Card */}
        <div className="glass-panel" style={styles.profileCard}>
          <div style={styles.profileAvatar}>
            <UserCircle2 size={38} color="var(--text-muted)" />
          </div>
          <div style={styles.profileInfo}>
            <h4 style={styles.profileName}>{usuarioActual?.user}</h4>
            <span 
              className="badge" 
              style={{ ...styles.profileRoleBadge, ...getRoleBadgeStyle(rol) }}
            >
              {rol?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 6px 8px 6px", borderBottom: "1px solid rgba(255, 255, 255, 0.04)", marginBottom: "8px" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: "800", letterSpacing: "1px", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Módulos {isReorderingActive && <span style={{ color: "var(--color-primary)", textTransform: "none", fontSize: "0.68rem" }}>(Arrastrando...)</span>}
          </span>
          <button 
            type="button"
            onClick={resetOrder}
            title="Restablecer orden predeterminado"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.7rem",
              padding: "2px 6px",
              borderRadius: "4px",
              transition: "all 0.2s"
            }}
            className="btn-reset-order"
          >
            <RotateCcw size={12} />
            <span>Restablecer</span>
          </button>
        </div>

        <nav style={styles.nav}>
          <ul style={styles.menuList}>
            {orderedItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const isItemBeingDragged = draggedIndex === index;
              
              return (
                <li 
                  key={item.id}
                  data-index={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onMouseDown={(e) => handleMouseDown(e, index)}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onMouseMove={handleMouseMove}
                  onTouchMove={handleTouchMove}
                  onMouseUp={handlePressEnd}
                  onTouchEnd={handlePressEnd}
                  onMouseLeave={clearPressTimer}
                  style={{
                    cursor: isItemBeingDragged ? "grabbing" : "grab",
                    userSelect: "none",
                    touchAction: isReorderingActive ? "none" : "pan-y",
                    borderRadius: "10px",
                    transition: isItemBeingDragged ? "none" : "transform 0.15s ease, background-color 0.15s ease",
                    transform: isItemBeingDragged ? "scale(1.03)" : "none",
                    zIndex: isItemBeingDragged ? 10 : 1,
                    opacity: isItemBeingDragged ? 0.9 : 1
                  }}
                  className={isItemBeingDragged ? "module-item-dragging" : ""}
                >
                  <button
                    onClick={() => {
                      if (!isReorderingActive && !isLongPressing.current && !justReordered.current) {
                        setCurrentTab(item.id);
                      }
                    }}
                    style={{
                      ...styles.menuItem,
                      ...(isActive ? styles.menuItemActive : {}),
                      ...(isItemBeingDragged ? {
                        border: "1px dashed var(--color-primary)",
                        background: "rgba(59, 130, 246, 0.18)",
                        boxShadow: "0 8px 24px rgba(59, 130, 246, 0.3)"
                      } : {})
                    }}
                    className="menu-button-item"
                  >
                    <GripVertical 
                      size={15} 
                      className="drag-grip-icon"
                      style={{
                        marginRight: "6px",
                        color: isItemBeingDragged ? "var(--color-primary)" : "var(--text-muted)",
                        opacity: isItemBeingDragged ? 1 : 0.4,
                        flexShrink: 0
                      }} 
                    />
                    <Icon 
                      size={19} 
                      style={{
                        marginRight: "10px",
                        color: isActive ? "var(--color-primary)" : "var(--text-muted)",
                        filter: isActive ? "drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))" : "none",
                        flexShrink: 0
                      }} 
                    />
                    <span style={isActive ? styles.menuItemTextActive : styles.menuItemText}>
                      {item.label}
                    </span>
                    {isActive && <div style={styles.activeIndicator} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout Action */}
        <div style={styles.footer}>
          <button onClick={onLogout} style={styles.logoutBtn} className="btn-ghost-logout">
            <LogOut size={18} style={{ marginRight: "10px" }} />
            Cerrar Sesión
          </button>
        </div>

        {/* Embedded CSS for sidebar buttons */}
        <style>{`
          @keyframes pulse-dot-blue {
            0% {
              transform: scale(0.9);
              box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
            }
            70% {
              transform: scale(1.1);
              box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
            }
            100% {
              transform: scale(0.9);
              box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
            }
          }
          @keyframes pulse-dot-green {
            0% {
              transform: scale(0.9);
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            }
            70% {
              transform: scale(1.1);
              box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
            }
            100% {
              transform: scale(0.9);
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
            }
          }
          .dot-connecting {
            animation: pulse-dot-blue 1.5s infinite ease-in-out;
          }
          .dot-connected {
            animation: pulse-dot-green 2.5s infinite ease-in-out;
          }
          .menu-button-item {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .menu-button-item:hover {
            background: rgba(255, 255, 255, 0.04);
            transform: translateX(3px);
          }
          .menu-button-item:hover .drag-grip-icon {
            opacity: 0.9 !important;
            color: var(--color-primary);
          }
          .btn-reset-order:hover {
            color: #fff !important;
            background: rgba(255, 255, 255, 0.08) !important;
          }
          .module-item-dragging {
            animation: pulse-drag-border 1.2s infinite ease-in-out;
          }
          @keyframes pulse-drag-border {
            0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
            50% { box-shadow: 0 0 12px 3px rgba(59, 130, 246, 0.6); }
            100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          }
          .btn-ghost-logout {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 12px;
            border: 1px solid rgba(239, 68, 68, 0.15);
            background: rgba(239, 68, 68, 0.02);
            color: #f87171;
            border-radius: 10px;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .btn-ghost-logout:hover {
            background: rgba(239, 68, 68, 0.1);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
          }
          
          /* Custom thin scrollbar for sidebar nav */
          aside nav::-webkit-scrollbar {
            width: 4px;
          }
          aside nav::-webkit-scrollbar-track {
            background: transparent;
          }
          aside nav::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.08);
            border-radius: 4px;
          }
          aside nav::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.18);
          }
        `}</style>
      </aside>

      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="mobile-sidebar-backdrop"
        />
      )}
    </>
  );
}

const styles = {
  sidebar: {
    width: "280px",
    backgroundColor: "var(--bg-surface)",
    borderRight: "1px solid var(--border-glass)",
    display: "flex",
    flexDirection: "column",
    padding: "24px 18px",
    height: "100vh",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  cloudStatusContainer: {
    marginBottom: "16px",
    padding: "0 6px",
  },
  cloudStatusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontWeight: "600",
    border: "1px solid",
    transition: "all 0.3s ease",
  },
  badgeConnected: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.2)",
    color: "#34d399",
  },
  badgeConnecting: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderColor: "rgba(59, 130, 246, 0.2)",
    color: "#60a5fa",
  },
  badgeDisconnected: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.2)",
    color: "#fbbf24",
  },
  badgeError: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.2)",
    color: "#f87171",
  },
  cloudStatusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    display: "inline-block",
  },
  dotConnected: {
    backgroundColor: "#10b981",
    boxShadow: "0 0 8px #10b981",
  },
  dotConnecting: {
    backgroundColor: "#3b82f6",
    boxShadow: "0 0 8px #3b82f6",
  },
  dotDisconnected: {
    backgroundColor: "#f59e0b",
    boxShadow: "0 0 8px #f59e0b",
  },
  dotError: {
    backgroundColor: "#ef4444",
    boxShadow: "0 0 8px #ef4444",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
    padding: "0 6px",
  },
  brandIconContainer: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, var(--color-primary), #1e40af)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
  },
  brandText: {
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
  },
  brandTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: "900",
    fontSize: "1.2rem",
    letterSpacing: "2px",
    color: "#fff",
  },
  brandSubtitle: {
    fontSize: "0.65rem",
    fontWeight: "700",
    letterSpacing: "1.5px",
    color: "var(--text-muted)",
  },
  profileCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "14px",
    marginBottom: "20px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  profileAvatar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  profileInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    overflow: "hidden",
  },
  profileName: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "#fff",
    marginBottom: "4px",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    width: "100%",
  },
  profileRoleBadge: {
    fontSize: "0.65rem",
    padding: "2px 8px",
    fontWeight: "800",
    borderRadius: "6px",
  },
  nav: {
    flex: 1,
    overflowY: "auto",
    minHeight: 0,
    paddingRight: "4px",
    marginRight: "-4px",
  },
  menuList: {
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  menuItem: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "10px 14px",
    background: "transparent",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    textAlign: "left",
  },
  menuItemActive: {
    background: "rgba(59, 130, 246, 0.06)",
    border: "1px solid rgba(59, 130, 246, 0.15)",
  },
  menuItemText: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "var(--text-muted)",
  },
  menuItemTextActive: {
    fontSize: "0.9rem",
    fontWeight: "700",
    color: "#fff",
  },
  activeIndicator: {
    position: "absolute",
    right: 0,
    top: "25%",
    height: "50%",
    width: "4px",
    backgroundColor: "var(--color-primary)",
    borderRadius: "4px",
    boxShadow: "0 0 10px var(--color-primary)",
  },
  footer: {
    marginTop: "auto",
    paddingTop: "16px",
  },
};
