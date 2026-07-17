import React, { useState } from "react";
import { 
  ShoppingBag, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Coins, 
  TrendingUp, 
  Search,
  CheckCircle
} from "lucide-react";
import { formatMoney } from "../utils/storage";

export default function Accesorios({ 
  accesoriosInventory = [], 
  setAccesoriosInventory, 
  usuarioActual,
  cuentasPorPagar = [],
  setCuentasPorPagar
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [presentation, setPresentation] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [minStock, setMinStock] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formaPago, setFormaPago] = useState("efectivo");
  const [proveedor, setProveedor] = useState("");

  const isAdmin = usuarioActual?.rol === "admin";
  const isCajero = usuarioActual?.rol === "cajero";
  const isManager = isAdmin || isCajero;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !quantity || !purchasePrice || !salePrice) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    const qty = parseInt(quantity);
    const purchase = parseFloat(purchasePrice);
    const sale = parseFloat(salePrice);
    const minS = minStock === "" ? 5 : parseInt(minStock);

    if (isNaN(qty) || qty < 0) {
      alert("La cantidad debe ser un número entero mayor o igual a 0.");
      return;
    }
    if (isNaN(purchase) || purchase < 0) {
      alert("El precio de compra debe ser un número válido mayor o igual a 0.");
      return;
    }
    if (isNaN(sale) || sale < 0) {
      alert("El precio de venta debe ser un número válido mayor o igual a 0.");
      return;
    }
    if (isNaN(minS) || minS < 0) {
      alert("El stock mínimo debe ser un número entero mayor o igual a 0.");
      return;
    }

    if (editingId) {
      // Edit
      setAccesoriosInventory(
        (accesoriosInventory || []).map((item) => {
          if (!item) return item;
          return item.id === editingId
            ? { ...item, code: code.toUpperCase().trim(), name: name.trim(), brand: brand.trim(), presentation: presentation.trim(), quantity: qty, purchasePrice: purchase, salePrice: sale, minStock: minS }
            : item;
        })
      );
      setEditingId(null);
    } else {
      // Add new
      const exists = (accesoriosInventory || []).some(item => item && String(item.code || "").toUpperCase().trim() === code.toUpperCase().trim());
      if (exists) {
        alert("Ya existe un accesorio con este código en el inventario.");
        return;
      }

      const nuevo = {
        id: Date.now(),
        code: code.toUpperCase().trim(),
        name: name.trim(),
        brand: brand.trim(),
        presentation: presentation.trim(),
        quantity: qty,
        purchasePrice: purchase,
        salePrice: sale,
        minStock: minS,
        acquisitionMode: formaPago,
        proveedor: (formaPago === "credito" || formaPago === "consignacion") ? proveedor.trim() : ""
      };
      setAccesoriosInventory([nuevo, ...accesoriosInventory]);

      if (formaPago === "credito") {
        if (setCuentasPorPagar) {
          const totalCosto = qty * purchase;
          const nuevaCuenta = {
            id: Date.now(),
            proveedor: proveedor.trim() || brand.trim() || "Proveedor de Accesorios",
            concepto: `Compra de accesorio: ${name.trim()} (${qty} uds) - Código: ${code.toUpperCase().trim()}`,
            total: totalCosto,
            saldo: totalCosto,
            fecha: new Date().toISOString(),
            estado: "Pendiente",
            pagos: []
          };
          setCuentasPorPagar([nuevaCuenta, ...cuentasPorPagar]);
        }
      }
    }

    setCode("");
    setName("");
    setBrand("");
    setPresentation("");
    setQuantity("");
    setPurchasePrice("");
    setSalePrice("");
    setMinStock("");
    setFormaPago("efectivo");
    setProveedor("");
  };

  const iniciarEdicion = (item) => {
    setEditingId(item.id);
    setCode(item.code);
    setName(item.name);
    setBrand(item.brand || "");
    setPresentation(item.presentation || "");
    setQuantity(item.quantity.toString());
    setPurchasePrice(item.purchasePrice.toString());
    setSalePrice(item.salePrice.toString());
    setMinStock(item.minStock !== undefined ? item.minStock.toString() : "5");
  };

  const eliminarItem = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este accesorio del inventario?")) {
      setAccesoriosInventory(accesoriosInventory.filter((item) => item.id !== id));
    }
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setCode("");
    setName("");
    setBrand("");
    setPresentation("");
    setQuantity("");
    setPurchasePrice("");
    setSalePrice("");
    setMinStock("");
  };

  // Calculations for Valuation Dashboard
  const totalItemsCount = (accesoriosInventory || []).length;
  const valuationCost = (accesoriosInventory || []).reduce((sum, item) => sum + (item ? Number(item.quantity || 0) * Number(item.purchasePrice || 0) : 0), 0);
  const valuationRetail = (accesoriosInventory || []).reduce((sum, item) => sum + (item ? Number(item.quantity || 0) * Number(item.salePrice || 0) : 0), 0);
  const potentialProfit = valuationRetail - valuationCost;

  const filteredInventory = (accesoriosInventory || []).filter((item) => {
    if (!item) return false;
    const query = String(searchQuery || "").toLowerCase();
    return (
      String(item.code || "").toLowerCase().includes(query) ||
      String(item.name || "").toLowerCase().includes(query) ||
      (item.brand && String(item.brand).toLowerCase().includes(query)) ||
      (item.presentation && String(item.presentation).toLowerCase().includes(query))
    );
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Inventario de Accesorios</h1>
          <p>Control de stock y carga de accesorios a la venta para el POS, Taller y Carwash.</p>
        </div>
      </div>

      {/* Valuation Metrics Panels */}
      <div style={styles.metricsRow}>
        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.iconBg, backgroundColor: "var(--color-primary-glow)" }}>
            <ShoppingBag size={20} color="var(--color-primary)" />
          </div>
          <div style={styles.metricInfo}>
            <span style={styles.metricLabel}>Accesorios Registrados</span>
            <span style={styles.metricValue}>{totalItemsCount}</span>
          </div>
        </div>

        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.iconBg, backgroundColor: "var(--color-warning-glow)" }}>
            <Coins size={20} color="var(--color-warning)" />
          </div>
          <div style={styles.metricInfo}>
            <span style={styles.metricLabel}>Valorización a Costo</span>
            <span style={{ ...styles.metricValue, color: "var(--color-warning)" }}>{formatMoney(valuationCost)}</span>
          </div>
        </div>

        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.iconBg, backgroundColor: "var(--color-success-glow)" }}>
            <TrendingUp size={20} color="var(--color-success)" />
          </div>
          <div style={styles.metricInfo}>
            <span style={styles.metricLabel}>Valorización a Venta</span>
            <span style={{ ...styles.metricValue, color: "var(--color-success)" }}>{formatMoney(valuationRetail)}</span>
          </div>
        </div>

        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.iconBg, backgroundColor: "rgba(6, 182, 212, 0.15)" }}>
            <TrendingUp size={20} color="#06b6d4" />
          </div>
          <div style={styles.metricInfo}>
            <span style={styles.metricLabel}>Margen Estimado</span>
            <span style={{ ...styles.metricValue, color: "#06b6d4" }}>{formatMoney(potentialProfit)}</span>
          </div>
        </div>
      </div>

      <div className={isManager ? "responsive-inventory-grid" : ""} style={!isManager ? styles.workerGrid : undefined}>
        
        {/* Left Form: CRUD (Admin/Cajero Only) */}
        {isManager && (
          <div className="glass-panel" style={styles.formCard}>
            <div style={styles.formHeader}>
              <Plus size={20} color="var(--color-secondary)" />
              <h3 style={styles.formTitle}>
                {editingId ? "Editar Accesorio" : "Agregar Nuevo Accesorio"}
              </h3>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Código *</label>
                  <input
                    placeholder="Ej. AC-01"
                    className="input-field"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={!!editingId}
                    style={{ textTransform: "uppercase" }}
                    required
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Marca</label>
                  <input
                    placeholder="Ej. Michelin, ArmorAll"
                    className="input-field"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Stock / Cantidad *</label>
                  <input
                    type="number"
                    placeholder="Cantidad"
                    className="input-field"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre del Accesorio *</label>
                <input
                  placeholder="Ej. Aromatizante de Pino, Cubre timón de cuero"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Presentación</label>
                  <input
                    placeholder="Ej. Unidad, Galón, Caja"
                    className="input-field"
                    value={presentation}
                    onChange={(e) => setPresentation(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Stock Mínimo (Alerta)</label>
                  <input
                    type="number"
                    placeholder="5"
                    className="input-field"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Precio Compra (Q) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="input-field"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    min="0"
                    required
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Precio Venta (Q) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="input-field"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Payment details for credit purchase (only on creation) */}
              {!editingId && (
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Forma de Adquisición</label>
                    <select
                      className="select-field"
                      value={formaPago}
                      onChange={(e) => setFormaPago(e.target.value)}
                    >
                      <option value="efectivo">Efectivo / Caja</option>
                      <option value="credito">Crédito (Cuenta por Pagar)</option>
                      <option value="consignacion">Consignación</option>
                    </select>
                  </div>
                  {(formaPago === "credito" || formaPago === "consignacion") && (
                    <div style={{ ...styles.inputGroup, flex: 1.5 }}>
                      <label style={styles.label}>Proveedor *</label>
                      <input
                        placeholder="Ej. Distribuidora El Sol"
                        className="input-field"
                        value={proveedor}
                        onChange={(e) => setProveedor(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelarEdicion}
                    className="btn"
                    style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{ flex: editingId ? 2 : 1 }}
                >
                  {editingId ? "Actualizar Accesorio" : "Registrar Accesorio"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Right List: Table */}
        <div style={styles.listColumn}>
          {/* Search bar */}
          <div className="glass-panel" style={styles.searchCard}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar accesorio por código, nombre, marca..."
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="glass-panel" style={{ padding: "20px", border: "1px solid rgba(255,255,255,0.04)" }}>
            {filteredInventory.length === 0 ? (
              <div style={styles.emptyState}>
                <ShoppingBag size={48} color="var(--text-muted)" style={{ marginBottom: "16px", opacity: 0.3 }} />
                <h3>No hay accesorios registrados</h3>
                <p>Usa el formulario para añadir tu primer accesorio en venta.</p>
              </div>
            ) : (
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Código</th>
                      <th style={styles.th}>Nombre</th>
                      <th style={styles.th}>Marca</th>
                      <th style={styles.th}>Presentación</th>
                      <th style={{ ...styles.th, textAlign: "right" }}>Stock</th>
                      <th style={{ ...styles.th, textAlign: "right" }}>P. Compra</th>
                      <th style={{ ...styles.th, textAlign: "right" }}>P. Venta</th>
                      {isManager && <th style={{ ...styles.th, textAlign: "center" }}>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => {
                      const isLowStock = item.quantity <= (item.minStock !== undefined ? item.minStock : 5);
                      const isOut = item.quantity === 0;
                      
                      return (
                        <tr key={item.id} style={styles.tr}>
                          <td style={{ ...styles.td, fontWeight: "bold", fontFamily: "var(--font-display)", color: "var(--color-secondary)" }}>
                            {item.code}
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <span style={{ fontWeight: "600", color: "#fff" }}>{item.name}</span>
                                {item.acquisitionMode === "consignacion" && (
                                  <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(168, 85, 247, 0.15)", color: "var(--color-secondary)", border: "1px solid rgba(168, 85, 247, 0.2)", fontWeight: "bold" }}>
                                    Consignación
                                  </span>
                                )}
                                {item.acquisitionMode === "credito" && (
                                  <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(234, 179, 8, 0.12)", color: "var(--color-warning)", border: "1px solid rgba(234, 179, 8, 0.2)", fontWeight: "bold" }}>
                                    Crédito
                                  </span>
                                )}
                              </div>
                              {isLowStock && (
                                <span style={{
                                  fontSize: "0.68rem",
                                  color: isOut ? "var(--color-danger)" : "var(--color-warning)",
                                  fontWeight: "bold",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  marginTop: "4px"
                                }}>
                                  <AlertTriangle size={10} />
                                  {isOut ? "Agotado (Cargar Stock)" : "Stock Bajo"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={styles.td}>{item.brand || "N/A"}</td>
                          <td style={styles.td}>{item.presentation || "Unidad"}</td>
                          <td style={{ 
                            ...styles.td, 
                            textAlign: "right", 
                            fontWeight: "bold",
                            color: isOut ? "var(--color-danger)" : isLowStock ? "var(--color-warning)" : "#fff"
                          }}>
                            {item.quantity} uds
                          </td>
                          <td style={{ ...styles.td, textAlign: "right" }}>{formatMoney(item.purchasePrice)}</td>
                          <td style={{ ...styles.td, textAlign: "right", fontWeight: "600", color: "var(--color-success)" }}>{formatMoney(item.salePrice)}</td>
                          {isManager && (
                            <td style={styles.td}>
                              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                <button
                                  onClick={() => iniciarEdicion(item)}
                                  className="btn-action"
                                  title="Editar"
                                  style={{ padding: "6px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", cursor: "pointer", color: "var(--text-muted)" }}
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => eliminarItem(item.id)}
                                  className="btn-action btn-danger"
                                  title="Eliminar"
                                  style={{ padding: "6px", backgroundColor: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: "6px", cursor: "pointer", color: "var(--color-danger)" }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
    textAlign: "left",
  },
  title: {
    fontSize: "2.2rem",
    fontWeight: "800",
    marginBottom: "5px",
    background: "linear-gradient(135deg, #fff 60%, var(--color-secondary) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    width: "100%",
  },
  metricCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "20px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  iconBg: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  metricInfo: {
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
  },
  metricLabel: {
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "var(--text-muted)",
  },
  metricValue: {
    fontSize: "1.25rem",
    fontWeight: "800",
    color: "#fff",
    marginTop: "2px",
  },
  workerGrid: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  formCard: {
    padding: "24px",
    textAlign: "left",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  formHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
  },
  formTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "var(--text-muted)",
  },
  listColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    width: "100%",
  },
  searchCard: {
    display: "flex",
    alignItems: "center",
    padding: "4px 16px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  searchIcon: {
    color: "var(--text-muted)",
    marginRight: "12px",
  },
  searchInput: {
    width: "100%",
    padding: "12px 0",
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: "0.95rem",
    outline: "none",
  },
  tableResponsive: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    padding: "12px 16px",
    fontSize: "0.8rem",
    fontWeight: "700",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    borderBottom: "2px solid rgba(255, 255, 255, 0.08)",
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    transition: "background-color 0.2s ease",
  },
  td: {
    padding: "14px 16px",
    fontSize: "0.9rem",
    color: "var(--text-main)",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    color: "var(--text-muted)",
  }
};
