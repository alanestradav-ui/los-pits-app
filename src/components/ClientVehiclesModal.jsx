import React, { useState, useMemo } from "react";
import { Car, Search, X, Check, ArrowRight } from "lucide-react";

export default function ClientVehiclesModal({
  isOpen = false,
  clienteNombre = "",
  vehicles = [],
  onSelectVehicle,
  onClose
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredVehicles = useMemo(() => {
    if (!searchTerm.trim()) return vehicles;
    const q = searchTerm.toLowerCase().trim();
    return vehicles.filter(v => {
      const placa = String(v.placa || "").toLowerCase();
      const marca = String(v.marca || "").toLowerCase();
      const linea = String(v.linea || "").toLowerCase();
      const color = String(v.color || "").toLowerCase();
      return placa.includes(q) || marca.includes(q) || linea.includes(q) || color.includes(q);
    });
  }, [vehicles, searchTerm]);

  if (!isOpen || !vehicles || vehicles.length === 0) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modalContent}>
        {/* HEADER */}
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={styles.iconCircle}>
              <Car size={22} color="#eab308" />
            </div>
            <div>
              <h3 style={styles.title}>Seleccionar Vehículo del Cliente</h3>
              <p style={styles.subTitle}>
                <strong>{clienteNombre || "El cliente"}</strong> tiene <strong>{vehicles.length} vehículos</strong> registrados. Elige el que ingresa:
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div style={styles.searchWrapper}>
          <Search size={16} color="#9ca3af" />
          <input
            type="text"
            placeholder="Filtrar por placa, marca o línea (ej. Toyota, P-123...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
            autoFocus
          />
        </div>

        {/* VEHICLE LIST */}
        <div style={styles.vehicleList}>
          {filteredVehicles.length === 0 ? (
            <div style={styles.emptySearch}>
              <p style={{ margin: 0, color: "#9ca3af" }}>No se encontraron vehículos con "{searchTerm}".</p>
            </div>
          ) : (
            filteredVehicles.map((v, idx) => (
              <div 
                key={v.placa || idx} 
                onClick={() => {
                  if (typeof onSelectVehicle === "function") {
                    onSelectVehicle(v);
                  }
                }}
                style={styles.vehicleCard}
              >
                <div style={styles.cardLeft}>
                  <div style={styles.plateBadge}>
                    {v.placa || "SIN PLACA"}
                  </div>
                  <div style={styles.vehicleDetails}>
                    <h4 style={styles.vehicleTitle}>
                      {v.marca || "Vehículo"} {v.linea || ""} {v.modelo ? `(${v.modelo})` : ""}
                    </h4>
                    <span style={styles.vehicleMeta}>
                      {v.color ? `Color: ${v.color}` : ""} {v.chasis ? `• Chasis: ${v.chasis}` : ""}
                    </span>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn btn-primary"
                  style={styles.selectBtn}
                >
                  <span>Seleccionar</span> <ArrowRight size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div style={styles.footer}>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-ghost" 
            style={{ width: "100%", fontSize: "0.85rem" }}
          >
            Ingresar otro vehículo diferente / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: "16px"
  },
  modalContent: {
    backgroundColor: "#1e222d",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "560px",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
    overflow: "hidden"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
  },
  iconCircle: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#fff"
  },
  subTitle: {
    margin: "2px 0 0 0",
    fontSize: "0.8rem",
    color: "#9ca3af"
  },
  closeBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#9ca3af",
    cursor: "pointer",
    padding: "4px"
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 16px",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)"
  },
  searchInput: {
    background: "transparent",
    border: "none",
    color: "#fff",
    outline: "none",
    width: "100%",
    fontSize: "0.85rem"
  },
  vehicleList: {
    padding: "14px 16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    flex: 1,
    maxHeight: "360px"
  },
  vehicleCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "10px",
    padding: "12px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  cardLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  plateBadge: {
    backgroundColor: "#eab308",
    color: "#111827",
    fontWeight: "800",
    fontSize: "0.85rem",
    padding: "6px 10px",
    borderRadius: "6px",
    letterSpacing: "0.5px"
  },
  vehicleDetails: {
    display: "flex",
    flexDirection: "column"
  },
  vehicleTitle: {
    margin: 0,
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "#fff"
  },
  vehicleMeta: {
    fontSize: "0.75rem",
    color: "#9ca3af",
    marginTop: "2px"
  },
  selectBtn: {
    fontSize: "0.78rem",
    padding: "6px 12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: "700"
  },
  emptySearch: {
    padding: "30px 20px",
    textAlign: "center"
  },
  footer: {
    padding: "12px 16px",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(0, 0, 0, 0.2)"
  }
};
