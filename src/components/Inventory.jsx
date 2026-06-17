import React, { useState } from "react";
import { 
  Warehouse, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Coins, 
  TrendingUp, 
  Search,
  ShoppingCart,
  ClipboardList,
  CheckCircle
} from "lucide-react";
import { formatMoney } from "../utils/storage";

export default function Inventory({ 
  workshopInventory, 
  setWorkshopInventory, 
  usuarioActual,
  ordenes = [],
  cuentasPorPagar = [],
  setCuentasPorPagar
}) {
  const [activeSubTab, setActiveSubTab] = useState("inventario");
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
      setWorkshopInventory(
        workshopInventory.map((item) =>
          item.id === editingId
            ? { ...item, code: code.toUpperCase().trim(), name: name.trim(), brand: brand.trim(), presentation: presentation.trim(), quantity: qty, purchasePrice: purchase, salePrice: sale, minStock: minS }
            : item
        )
      );
      setEditingId(null);
    } else {
      // Add
      const exists = workshopInventory.some(item => item.code.toUpperCase().trim() === code.toUpperCase().trim());
      if (exists) {
        alert("Ya existe un repuesto con este código en la bodega.");
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
        minStock: minS
      };
      setWorkshopInventory([nuevo, ...workshopInventory]);

      if (formaPago === "credito") {
        if (setCuentasPorPagar) {
          const totalCosto = qty * purchase;
          const nuevaCuenta = {
            id: Date.now(),
            proveedor: proveedor.trim() || brand.trim() || "Proveedor de Repuestos",
            concepto: `Compra de repuesto: ${name.trim()} (${qty} uds) - Código: ${code.toUpperCase().trim()}`,
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
    if (window.confirm("¿Seguro que deseas eliminar este repuesto de la bodega?")) {
      setWorkshopInventory(workshopInventory.filter((item) => item.id !== id));
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
  const totalItemsCount = workshopInventory.length;
  const valuationCost = workshopInventory.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
  const valuationRetail = workshopInventory.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0);
  const potentialProfit = valuationRetail - valuationCost;

  const filteredInventory = workshopInventory.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.code.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query) ||
      (item.brand && item.brand.toLowerCase().includes(query)) ||
      (item.presentation && item.presentation.toLowerCase().includes(query))
    );
  });

  const filteredTotalStock = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
  const filteredTotalCost = filteredInventory.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
  const filteredTotalSale = filteredInventory.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0);

  // Lógica de cálculo de repuestos faltantes (Repuestos por Adquirir)
  const AUTHORIZED_STATUSES = [
    "En proceso de reparación",
    "En período de prueba y control de calidad",
    "En proceso de lavado",
    "Listo para entrega"
  ];

  // 1. Filtrar las órdenes con presupuesto autorizado (autorizado y no entregado)
  const activeAuthorizedOrders = (ordenes || []).filter(o => 
    (o.diagnosticoAutorizado || AUTHORIZED_STATUSES.includes(o.estado)) && 
    o.estado !== "Entregado"
  );

  // 2. Crear una copia del stock en bodega para descontar conforme se asigna (running stock)
  const stockReservado = {};
  (workshopInventory || []).forEach(invItem => {
    const key = invItem.code.toUpperCase().trim() || invItem.name.toLowerCase().trim();
    stockReservado[key] = invItem.quantity;
  });

  // 3. Compilar lista de repuestos faltantes
  const repuestosFaltantes = [];
  let totalFaltantesQty = 0;
  let inversionCompraEstimada = 0;

  activeAuthorizedOrders.forEach(o => {
    if (o.presupuesto && o.presupuesto.parts && o.presupuesto.parts.length > 0) {
      o.presupuesto.parts.forEach(part => {
        const invItem = (workshopInventory || []).find(inv => 
          (part.code && inv.code.toUpperCase().trim() === part.code.toUpperCase().trim()) || 
          inv.name.toLowerCase().trim() === part.desc.toLowerCase().trim()
        );

        const key = invItem ? (invItem.code.toUpperCase().trim() || invItem.name.toLowerCase().trim()) : part.desc.toLowerCase().trim();
        const stockDisponible = key in stockReservado ? stockReservado[key] : (invItem ? invItem.quantity : 0);
        const requerido = part.qty;
        
        if (requerido > stockDisponible) {
          const faltanteQty = requerido - stockDisponible;
          const purchasePriceEst = invItem ? invItem.purchasePrice : (part.purchasePrice || 0);
          
          repuestosFaltantes.push({
            id: `${o.id}-${part.code || part.desc}-${Date.now()}-${Math.random()}`,
            ordenId: o.id,
            cliente: o.cliente,
            telefono: o.telefono || "",
            placa: o.placa || (o.vehiculo && o.vehiculo.match(/\(([^)]+)\)/)?.[1]) || "N/A",
            vehiculoDesc: o.marca ? `${o.marca} ${o.linea || ""}` : (o.vehiculo && o.vehiculo.split("(")[0]) || "N/A",
            partCode: part.code || "S/C",
            partName: part.desc,
            partBrand: part.brand || (invItem ? invItem.brand : ""),
            partPresentation: part.presentation || (invItem ? invItem.presentation : ""),
            requerido: requerido,
            stockBodega: invItem ? invItem.quantity : 0,
            faltante: faltanteQty,
            purchasePrice: purchasePriceEst,
            totalCostoFaltante: faltanteQty * purchasePriceEst
          });

          totalFaltantesQty += faltanteQty;
          inversionCompraEstimada += faltanteQty * purchasePriceEst;
          stockReservado[key] = 0;
        } else {
          stockReservado[key] = stockDisponible - requerido;
        }
      });
    }
  });

  const filteredFaltantes = repuestosFaltantes.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      item.partCode.toLowerCase().includes(query) ||
      item.partName.toLowerCase().includes(query) ||
      item.partBrand.toLowerCase().includes(query) ||
      item.placa.toLowerCase().includes(query) ||
      item.vehiculoDesc.toLowerCase().includes(query) ||
      item.cliente.toLowerCase().includes(query)
    );
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Bodega e Inventario</h1>
          <p>Control de stock de repuestos e insumos del taller mecánico.</p>
        </div>
      </div>

      {/* Subnavigation Tabs */}
      <div style={styles.subTabs}>
        <button 
          onClick={() => setActiveSubTab("inventario")}
          style={{ ...styles.subTabBtn, ...(activeSubTab === "inventario" ? styles.subTabActive : {}) }}
        >
          <Warehouse size={16} /> Inventario General
        </button>
        {isManager && (
          <button 
            onClick={() => setActiveSubTab("adquirir")}
            style={{ ...styles.subTabBtn, ...(activeSubTab === "adquirir" ? styles.subTabActive : {}) }}
          >
            <ShoppingCart size={16} /> Repuestos por Adquirir (Faltantes)
          </button>
        )}
      </div>

      {/* RENDER INVENTARIO SUBTAB */}
      {activeSubTab === "inventario" && (
        <>
          {/* Valuation Metrics Panels */}
          <div style={styles.metricsRow}>
            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-primary-glow)" }}>
                <Warehouse size={20} color="var(--color-primary)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Repuestos Registrados</span>
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
                <span style={styles.metricLabel}>Margen de Ganancia Estimado</span>
                <span style={{ ...styles.metricValue, color: "#06b6d4" }}>{formatMoney(potentialProfit)}</span>
              </div>
            </div>
          </div>

          <div className={isManager ? "responsive-inventory-grid" : ""} style={!isManager ? styles.workerGrid : undefined}>
            
            {/* Left Form: CRUD (Admin/Cajero Only) */}
            {isManager && (
              <div className="glass-panel" style={styles.formCard}>
                <div style={styles.formHeader}>
                  <Plus size={20} color="var(--color-primary)" />
                  <h3 style={styles.formTitle}>
                    {editingId ? "Editar Repuesto" : "Agregar Nuevo Repuesto"}
                  </h3>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Código *</label>
                      <input
                        placeholder="Ej. PA-01"
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
                        placeholder="Ej. Bosch, NGK"
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

                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...styles.inputGroup, flex: 2 }}>
                      <label style={styles.label}>Nombre del Repuesto / Insumo *</label>
                      <input
                        placeholder="Ej. Pastillas de freno delanteras Bosch"
                        className="input-field"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Presentación / Tamaño</label>
                      <input
                        placeholder="Ej. Galón, Juego, 12mm"
                        className="input-field"
                        value={presentation}
                        onChange={(e) => setPresentation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Precio Compra (Q) *</label>
                      <input
                        type="number"
                        placeholder="Costo"
                        className="input-field"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        min="0"
                        step="any"
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Precio Venta (Q) *</label>
                      <input
                        type="number"
                        placeholder="Venta"
                        className="input-field"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        min="0"
                        step="any"
                        required
                      />
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.label}>Mín. Alerta (Stock)</label>
                      <input
                        type="number"
                        placeholder="Mínimo (Def: 5)"
                        className="input-field"
                        value={minStock}
                        onChange={(e) => setMinStock(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>

                  {!editingId && (
                    <div style={{ display: "flex", gap: "10px" }}>
                      <div style={{ ...styles.inputGroup, flex: 1 }}>
                        <label style={styles.label}>Forma de Pago</label>
                        <select
                          className="select-field"
                          value={formaPago}
                          onChange={(e) => setFormaPago(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            background: "rgba(20, 24, 33, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "10px",
                            color: "#fff"
                          }}
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="cheque">Cheque</option>
                          <option value="tarjeta">Tarjeta</option>
                          <option value="credito">Crédito (Cuentas por Pagar)</option>
                        </select>
                      </div>
                      {formaPago === "credito" && (
                        <div style={{ ...styles.inputGroup, flex: 1.5 }}>
                          <label style={styles.label}>Proveedor del Repuesto</label>
                          <input
                            placeholder="Nombre del proveedor o distribuidora"
                            className="input-field"
                            value={proveedor}
                            onChange={(e) => setProveedor(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    {editingId && (
                      <button type="button" className="btn btn-ghost" onClick={cancelarEdicion} style={{ flex: 1 }}>
                        Cancelar
                      </button>
                    )}
                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                      {editingId ? "Actualizar Repuesto" : "Registrar Repuesto"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Right List: Grid / Table of Items */}
            <div style={styles.listColumn}>
              {/* Search Box */}
              <div className="glass-panel" style={styles.searchCard}>
                <Search size={18} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar repuestos por código o descripción..."
                  style={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Table */}
              <div className="glass-panel" style={{ padding: "20px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
                {filteredInventory.length === 0 ? (
                  <div style={styles.emptyState}>
                    <Warehouse size={48} color="var(--text-muted)" style={{ marginBottom: "16px", opacity: 0.4 }} />
                    <h3>No hay repuestos registrados</h3>
                    <p>Usa el buscador o agrega repuestos en el formulario lateral.</p>
                  </div>
                ) : (
                  <div style={styles.tableResponsive}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Código</th>
                          <th style={styles.th}>Descripción</th>
                          <th style={styles.th}>Stock</th>
                          <th style={styles.th}>Presentación</th>
                          <th style={styles.th}>P. Compra</th>
                          <th style={styles.th}>P. Venta</th>
                          {isManager && <th style={{ ...styles.th, textAlign: "right", paddingRight: "16px" }}>Acciones</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventory.map((item) => {
                          const currentMinStock = item.minStock !== undefined ? item.minStock : 5;
                          const isLowStock = item.quantity <= currentMinStock;
                          return (
                            <tr 
                              key={item.id} 
                              style={{ 
                                ...styles.tr,
                                backgroundColor: isLowStock ? "rgba(239, 68, 68, 0.02)" : "transparent",
                                borderLeft: isLowStock ? "3px solid var(--color-danger)" : "none"
                              }}
                            >
                              <td style={{ ...styles.td, fontFamily: "var(--font-display)", fontWeight: "700", color: "#fff" }}>
                                {item.code}
                              </td>
                              <td style={styles.td}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <span style={{ color: "#fff", fontWeight: "600" }}>{item.name}</span>
                                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                    {item.brand && (
                                      <span style={{ color: "var(--color-primary)", fontSize: "0.75rem", fontWeight: "bold" }}>
                                        🏷️ {item.brand}
                                      </span>
                                    )}
                                    {isLowStock && (
                                      <span style={{ color: "var(--color-danger)", fontSize: "0.72rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                                        <AlertTriangle size={12} /> Stock bajo (Mínimo: {currentMinStock})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td style={{ ...styles.td, fontWeight: "700", color: isLowStock ? "var(--color-danger)" : "#fff" }}>
                                {item.quantity} uds
                              </td>
                              <td style={styles.td}>
                                {item.presentation || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>-</span>}
                              </td>
                              <td style={{ ...styles.td, color: "var(--text-muted)" }}>
                                {formatMoney(item.purchasePrice)}
                              </td>
                              <td style={{ ...styles.td, color: "var(--color-primary)", fontWeight: "700" }}>
                                {formatMoney(item.salePrice)}
                              </td>
                              {isManager && (
                                <td style={styles.td}>
                                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                    <button 
                                      onClick={() => iniciarEdicion(item)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)" }}
                                      title="Editar"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button 
                                      onClick={() => eliminarItem(item.id)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)" }}
                                      title="Eliminar"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ ...styles.tr, borderTop: "2px solid rgba(255, 255, 255, 0.15)", borderBottom: "none", backgroundColor: "rgba(255, 255, 255, 0.02)" }}>
                          <td style={{ ...styles.td, fontWeight: "800", color: "#fff" }}>TOTALES</td>
                          <td style={{ ...styles.td, fontWeight: "800", color: "#fff" }}>-</td>
                          <td style={{ ...styles.td, fontWeight: "800", color: "#fff" }}>{filteredTotalStock} uds</td>
                          <td style={styles.td}>-</td>
                          <td style={{ ...styles.td, fontWeight: "800", color: "var(--color-warning)" }}>{formatMoney(filteredTotalCost)}</td>
                          <td style={{ ...styles.td, fontWeight: "800", color: "var(--color-primary)" }}>{formatMoney(filteredTotalSale)}</td>
                          {isManager && <td style={styles.td}></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* RENDER ADQUIRIR (REPUESTOS FALTANTES) SUBTAB */}
      {activeSubTab === "adquirir" && isManager && (
        <>
          {/* Metrics for missing parts */}
          <div style={styles.metricsRow}>
            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-primary-glow)" }}>
                <ClipboardList size={20} color="var(--color-primary)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Trabajos Autorizados Activos</span>
                <span style={styles.metricValue}>{activeAuthorizedOrders.length}</span>
              </div>
            </div>

            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-warning-glow)" }}>
                <AlertTriangle size={20} color="var(--color-warning)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Repuestos Faltantes Totales</span>
                <span style={{ ...styles.metricValue, color: "var(--color-warning)" }}>{totalFaltantesQty} uds</span>
              </div>
            </div>

            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-success-glow)" }}>
                <Coins size={20} color="var(--color-success)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Inversión Estimada Compra</span>
                <span style={{ ...styles.metricValue, color: "var(--color-success)" }}>{formatMoney(inversionCompraEstimada)}</span>
              </div>
            </div>
          </div>

          <div style={styles.workerGrid}>
            <div style={styles.listColumn}>
              {/* Search Box */}
              <div className="glass-panel" style={styles.searchCard}>
                <Search size={18} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Filtrar por código, repuesto, cliente o placa..."
                  style={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Table of missing parts */}
              <div className="glass-panel" style={{ padding: "20px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
                {filteredFaltantes.length === 0 ? (
                  <div style={styles.emptyState}>
                    <CheckCircle size={48} color="var(--color-success)" style={{ marginBottom: "16px", opacity: 0.6 }} />
                    <h3>¡Todo en orden!</h3>
                    <p>No hay repuestos faltantes para los presupuestos autorizados vigentes.</p>
                  </div>
                ) : (
                  <div style={styles.tableResponsive}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Código</th>
                          <th style={styles.th}>Repuesto / Insumo</th>
                          <th style={styles.th}>Vehículo</th>
                          <th style={styles.th}>Cliente</th>
                          <th style={styles.th}>Requerido</th>
                          <th style={styles.th}>En Bodega</th>
                          <th style={styles.th}>Faltan</th>
                          <th style={styles.th}>Costo Unit.</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>Costo Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFaltantes.map((item) => (
                          <tr key={item.id} style={styles.tr}>
                            <td style={{ ...styles.td, fontFamily: "var(--font-display)", fontWeight: "700", color: "var(--color-primary)" }}>
                              {item.partCode}
                            </td>
                            <td style={styles.td}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ color: "#fff", fontWeight: "600" }}>{item.partName}</span>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                  {item.partBrand && <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>🏷️ {item.partBrand}</span>}
                                  {item.partPresentation && <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>📦 {item.partPresentation}</span>}
                                </div>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ color: "#fff", fontWeight: "500" }}>{item.vehiculoDesc}</span>
                                <span style={{ color: "var(--color-secondary)", fontSize: "0.75rem", fontWeight: "700" }}>🚘 {item.placa}</span>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ color: "var(--text-main)" }}>{item.cliente}</span>
                                {item.telefono && <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>📞 {item.telefono}</span>}
                              </div>
                            </td>
                            <td style={{ ...styles.td, color: "#fff", fontWeight: "600" }}>
                              {item.requerido} uds
                            </td>
                            <td style={{ ...styles.td, color: "var(--text-muted)" }}>
                              {item.stockBodega} uds
                            </td>
                            <td style={{ ...styles.td, color: "var(--color-danger)", fontWeight: "700", fontSize: "1rem" }}>
                              {item.faltante} uds
                            </td>
                            <td style={{ ...styles.td, color: "var(--text-muted)" }}>
                              {formatMoney(item.purchasePrice)}
                            </td>
                            <td style={{ ...styles.td, color: "var(--color-warning)", fontWeight: "700", textAlign: "right" }}>
                              {formatMoney(item.totalCostoFaltante)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
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
  submitBtn: {
    width: "100%",
    marginTop: "10px",
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
  },
  subTabs: {
    display: "flex",
    gap: "10px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    paddingBottom: "10px",
    width: "100%",
  },
  subTabBtn: {
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
  subTabActive: {
    color: "#fff",
    background: "rgba(255, 255, 255, 0.05)",
  },
};
