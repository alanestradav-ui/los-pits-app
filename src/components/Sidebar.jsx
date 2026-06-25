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
  History,
  Store,
  Receipt,
  Users
} from "lucide-react";

export default function Sidebar({ usuarioActual, currentTab, setCurrentTab, onLogout, isOpen, setIsOpen, realtimeStatus }) {
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
      id: "historial",
      label: "Historial Vehículos",
      icon: History,
      roles: ["admin", "cajero", "mecanico", "jefe de taller"]
    },
    { 
      id: "finanzas", 
      label: "Finanzas & Reportes", 
      icon: TrendingUp, 
      roles: ["admin", "cajero"] 
    },
    { 
      id: "configuracion", 
      label: "Configuración", 
      icon: Settings, 
      roles: ["admin", "cajero"] 
    }
  ];

  // Filter items matching user permissions
  const visibleItems = menuItems.filter(item => {
    if (rol === "admin") return true;
    if (item.id === "finanzas" || item.id === "configuracion") {
      if (rol === "admin" || rol === "cajero") return true;
    }
    if (usuarioActual?.permissions) {
      return usuarioActual.permissions.includes(item.id);
    }
    return item.roles.includes(rol);
  });

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

        {/* Cloud Connection Status */}
        <div className="cloud-status-container" style={styles.cloudStatusContainer}>
          {realtimeStatus === "connected" && (
            <div className="cloud-status-badge badge-connected" style={{ ...styles.cloudStatusBadge, ...styles.badgeConnected }}>
              <span className="cloud-status-dot dot-connected" style={{ ...styles.cloudStatusDot, ...styles.dotConnected }}></span>
              <span>Conectado a la Nube</span>
            </div>
          )}
          {realtimeStatus === "connecting" && (
            <div className="cloud-status-badge badge-connecting" style={{ ...styles.cloudStatusBadge, ...styles.badgeConnecting }}>
              <span className="cloud-status-dot dot-connecting" style={{ ...styles.cloudStatusDot, ...styles.dotConnecting }}></span>
              <span>Conectando a la Nube...</span>
            </div>
          )}
          {realtimeStatus === "disconnected" && (
            <div className="cloud-status-badge badge-disconnected" style={{ ...styles.cloudStatusBadge, ...styles.badgeDisconnected }}>
              <span className="cloud-status-dot dot-disconnected" style={{ ...styles.cloudStatusDot, ...styles.dotDisconnected }}></span>
              <span>Modo Local (Sin Nube)</span>
            </div>
          )}
          {realtimeStatus === "error" && (
            <div className="cloud-status-badge badge-error" style={{ ...styles.cloudStatusBadge, ...styles.badgeError }}>
              <span className="cloud-status-dot dot-error" style={{ ...styles.cloudStatusDot, ...styles.dotError }}></span>
              <span>Error de Conexión</span>
            </div>
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
        <nav style={styles.nav}>
          <ul style={styles.menuList}>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setCurrentTab(item.id)}
                    style={{
                      ...styles.menuItem,
                      ...(isActive ? styles.menuItemActive : {})
                    }}
                    className="menu-button-item"
                  >
                    <Icon 
                      size={20} 
                      style={{
                        marginRight: "12px",
                        color: isActive ? "var(--color-primary)" : "var(--text-muted)",
                        filter: isActive ? "drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))" : "none"
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
            background: rgba(255, 255, 255, 0.03);
            transform: translateX(4px);
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
