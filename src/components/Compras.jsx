import React, { useState } from "react";
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Search, 
  Coins, 
  Briefcase, 
  Calendar, 
  Wrench, 
  Package, 
  Filter, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { formatMoney } from "../utils/storage";

export default function Compras({
  compras = [],
  setCompras,
  toolsInventory = [],
  setToolsInventory,
  workshopInventory = [],
  setWorkshopInventory,
  carwashInventory = [],
  setCarwashInventory,
  cafeteriaInventory = [],
  setCafeteriaInventory,
  cuentasPorPagar = [],
  setCuentasPorPagar,
  usuarioActual
}) {
  // Form states
  const [concepto, setConcepto] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [total, setTotal] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [modulo, setModulo] = useState("general"); // "taller", "carwash", "parqueo", "cafeteria", "tienda", "general"
  const [tipoGasto, setTipoGasto] = useState("gasto"); // "gasto", "herramienta", "insumo"
  const [formaPago, setFormaPago] = useState("efectivo"); // "efectivo", "transferencia", "cheque", "tarjeta", "credito"
  const [cargarInventario, setCargarInventario] = useState(false);

  // Inventory-specific inputs (based on selected type)
  const [targetInventory, setTargetInventory] = useState("taller"); // "taller", "carwash", "cafeteria"
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemBrand, setItemBrand] = useState("");
  const [itemPresentation, setItemPresentation] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemSalePrice, setItemSalePrice] = useState("");
  const [itemMinStock, setItemMinStock] = useState("5");
  const [toolCondition, setToolCondition] = useState("Nueva");
  const [toolLocation, setToolLocation] = useState("");
  const [toolAssignedTo, setToolAssignedTo] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModulo, setFilterModulo] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");

  const isAdmin = usuarioActual?.rol === "admin";
  const isCajero = usuarioActual?.rol === "cajero";
  const isManager = isAdmin || isCajero;

  const handleTipoGastoChange = (type) => {
    setTipoGasto(type);
    setCargarInventario(false);
    setItemName("");
    setItemCode("");
    setItemBrand("");
    setItemPresentation("");
    setItemQuantity("1");
    setItemSalePrice("");
    setItemMinStock("5");
  };

  const handleCargarInventarioToggle = (checked) => {
    setCargarInventario(checked);
    if (checked) {
      setItemName(concepto);
      setItemBrand(proveedor);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!concepto.trim() || !proveedor.trim() || !total || !fecha) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }

    const totalVal = parseFloat(total);
    if (isNaN(totalVal) || totalVal <= 0) {
      alert("El total debe ser un número positivo.");
      return;
    }

    // 1. Validate inventory fields if checked
    let qty = 1;
    let salePriceVal = 0;
    let minStockVal = 5;
    let purchasePriceVal = totalVal;

    if (cargarInventario) {
      qty = parseInt(itemQuantity) || 1;
      if (qty <= 0) {
        alert("La cantidad para el inventario debe ser mayor a 0.");
        return;
      }
      purchasePriceVal = totalVal / qty;

      if (tipoGasto === "insumo") {
        if (targetInventory === "taller") {
          if (!itemCode.trim() || !itemName.trim()) {
            alert("El código y nombre del repuesto son obligatorios para Bodega Taller.");
            return;
          }
          salePriceVal = parseFloat(itemSalePrice) || 0;
          minStockVal = parseInt(itemMinStock) || 5;
          if (salePriceVal < 0) {
            alert("El precio de venta no puede ser negativo.");
            return;
          }
        } else if (targetInventory === "carwash") {
          if (!itemName.trim()) {
            alert("El nombre del insumo es obligatorio para Carwash.");
            return;
          }
        } else if (targetInventory === "cafeteria") {
          if (!itemName.trim()) {
            alert("El nombre del insumo es obligatorio para Cafetería.");
            return;
          }
          salePriceVal = parseFloat(itemSalePrice) || 0;
          minStockVal = parseInt(itemMinStock) || 5;
        }
      } else if (tipoGasto === "herramienta") {
        if (!itemName.trim()) {
          alert("El nombre de la herramienta es obligatorio.");
          return;
        }
      }
    }

    // 2. Add purchase record
    const purchaseId = Date.now();
    const newPurchase = {
      id: purchaseId,
      concepto: concepto.trim(),
      proveedor: proveedor.trim(),
      total: totalVal,
      fecha: fecha,
      modulo: modulo,
      tipoGasto: tipoGasto,
      formaPago: formaPago,
      cargarInventario: cargarInventario,
      detallesInventario: cargarInventario ? {
        tipo: tipoGasto,
        cantidad: qty,
        codigo: itemCode.trim(),
        nombre: itemName.trim(),
        marca: itemBrand.trim(),
        presentacion: itemPresentation.trim(),
        precioCompra: purchasePriceVal,
        precioVenta: salePriceVal,
        minStock: minStockVal,
        inventarioDestino: tipoGasto === "insumo" ? targetInventory : "herramientas"
      } : null,
      registradoPor: usuarioActual?.user || "admin"
    };

    // 3. Process Accounts Payable if "Crédito"
    if (formaPago === "credito" && setCuentasPorPagar) {
      const newPayable = {
        id: Date.now() + 10,
        proveedor: proveedor.trim(),
        concepto: `Compra: ${concepto.trim()} (${tipoGasto === "gasto" ? "Gasto Gral." : tipoGasto === "herramienta" ? "Herramienta" : "Insumo"})`,
        total: totalVal,
        saldo: totalVal,
        fecha: new Date(fecha).toISOString(),
        estado: "Pendiente",
        pagos: []
      };
      setCuentasPorPagar([newPayable, ...cuentasPorPagar]);
    }

    // 4. Load into corresponding inventory
    if (cargarInventario) {
      if (tipoGasto === "herramienta" && setToolsInventory) {
        const newTool = {
          id: Date.now() + 1,
          code: itemCode.toUpperCase().trim() || `HERR-${Date.now().toString().slice(-4)}`,
          name: itemName.trim(),
          brand: itemBrand.trim() || proveedor.trim(),
          quantity: qty,
          purchasePrice: purchasePriceVal,
          condition: toolCondition,
          location: toolLocation.trim(),
          assignedTo: toolAssignedTo.trim() || "General",
          fechaIngreso: fecha
        };
        setToolsInventory([newTool, ...toolsInventory]);
      } else if (tipoGasto === "insumo") {
        if (targetInventory === "taller" && setWorkshopInventory) {
          const existingItem = workshopInventory.find(item => item && String(item.code || "").toUpperCase().trim() === itemCode.toUpperCase().trim());
          if (existingItem) {
            setWorkshopInventory(
              workshopInventory.map(item => item.id === existingItem.id 
                ? { ...item, quantity: item.quantity + qty, purchasePrice: purchasePriceVal } 
                : item
              )
            );
          } else {
            const newItem = {
              id: Date.now() + 2,
              code: itemCode.toUpperCase().trim(),
              name: itemName.trim(),
              brand: itemBrand.trim(),
              presentation: itemPresentation.trim(),
              quantity: qty,
              purchasePrice: purchasePriceVal,
              salePrice: salePriceVal,
              minStock: minStockVal
            };
            setWorkshopInventory([newItem, ...workshopInventory]);
          }
        } else if (targetInventory === "carwash" && setCarwashInventory) {
          const existingItem = carwashInventory.find(item => item && String(item.name || "").toLowerCase().trim() === itemName.toLowerCase().trim());
          if (existingItem) {
            setCarwashInventory(
              carwashInventory.map(item => item.id === existingItem.id 
                ? { ...item, quantity: item.quantity + qty, purchasePrice: purchasePriceVal } 
                : item
              )
            );
          } else {
            const newItem = {
              id: Date.now() + 3,
              name: itemName.trim(),
              quantity: qty,
              purchasePrice: purchasePriceVal
            };
            setCarwashInventory([newItem, ...carwashInventory]);
          }
        } else if (targetInventory === "cafeteria" && setCafeteriaInventory) {
          const existingItem = cafeteriaInventory.find(item => item && String(item.name || "").toLowerCase().trim() === itemName.toLowerCase().trim());
          if (existingItem) {
            setCafeteriaInventory(
              cafeteriaInventory.map(item => item.id === existingItem.id 
                ? { ...item, quantity: item.quantity + qty, purchasePrice: purchasePriceVal } 
                : item
              )
            );
          } else {
            const newItem = {
              id: Date.now() + 4,
              name: itemName.trim(),
              presentation: itemPresentation.trim(),
              quantity: qty,
              purchasePrice: purchasePriceVal,
              salePrice: salePriceVal,
              minStock: minStockVal
            };
            setCafeteriaInventory([newItem, ...cafeteriaInventory]);
          }
        }
      }
    }

    setCompras([newPurchase, ...compras]);

    // Reset Form
    setConcepto("");
    setProveedor("");
    setTotal("");
    setModulo("general");
    setTipoGasto("gasto");
    setFormaPago("efectivo");
    setCargarInventario(false);
    setTargetInventory("taller");
    setItemCode("");
    setItemName("");
    setItemBrand("");
    setItemPresentation("");
    setItemQuantity("1");
    setItemSalePrice("");
    setItemMinStock("5");
    setToolCondition("Nueva");
    setToolLocation("");
    setToolAssignedTo("");

    alert("¡Compra registrada con éxito!");
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar esta compra de los registros? Esto no deshará la carga automática de inventario.")) {
      setCompras(compras.filter(c => c.id !== id));
    }
  };

  // Calculations for Metrics
  const totalSpent = compras.reduce((sum, c) => sum + (c.total || 0), 0);
  
  const spentByModule = compras.reduce((acc, c) => {
    const mod = c.modulo || "general";
    acc[mod] = (acc[mod] || 0) + (c.total || 0);
    return acc;
  }, {});

  const spentByType = compras.reduce((acc, c) => {
    const type = c.tipoGasto || "gasto";
    acc[type] = (acc[type] || 0) + (c.total || 0);
    return acc;
  }, {});

  // Filters
  const filteredCompras = compras.filter(c => {
    if (!c) return false;
    const matchesSearch = 
      String(c.concepto || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(c.proveedor || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = filterModulo === "all" || c.modulo === filterModulo;
    const matchesType = filterTipo === "all" || c.tipoGasto === filterTipo;
    return matchesSearch && matchesModule && matchesType;
  });

  const getModuleLabel = (mod) => {
    switch (mod) {
      case "taller": return "🔧 Taller";
      case "carwash": return "🧼 Carwash";
      case "parqueo": return "🚗 Parqueo";
      case "cafeteria": return "☕ Cafetería";
      case "tienda": return "🛒 Tienda POS";
      default: return "💼 General";
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "herramienta": return "🛠️ Herramienta";
      case "insumo": return "📦 Insumo / Repuesto";
      default: return "🧾 Gasto General";
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Compras y Gastos</h1>
          <p>Control de compras del negocio, asignación de gastos y reabastecimiento de inventarios.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={styles.metricsRow}>
        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.iconBg, backgroundColor: "var(--color-primary-glow)" }}>
            <Wallet size={20} color="var(--color-primary)" />
          </div>
          <div style={styles.metricInfo}>
            <span style={styles.metricLabel}>Total Comprado (Egresos)</span>
            <span style={styles.metricValue}>{formatMoney(totalSpent)}</span>
          </div>
        </div>

        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.iconBg, backgroundColor: "var(--color-success-glow)" }}>
            <Package size={20} color="var(--color-success)" />
          </div>
          <div style={styles.metricInfo}>
            <span style={styles.metricLabel}>Insumos y Repuestos</span>
            <span style={{ ...styles.metricValue, color: "var(--color-success)" }}>
              {formatMoney(spentByType.insumo || 0)}
            </span>
          </div>
        </div>

        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.iconBg, backgroundColor: "var(--color-warning-glow)" }}>
            <Wrench size={20} color="var(--color-warning)" />
          </div>
          <div style={styles.metricInfo}>
            <span style={styles.metricLabel}>Herramientas Adquiridas</span>
            <span style={{ ...styles.metricValue, color: "var(--color-warning)" }}>
              {formatMoney(spentByType.herramienta || 0)}
            </span>
          </div>
        </div>

        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.iconBg, backgroundColor: "rgba(239, 68, 68, 0.15)" }}>
            <Briefcase size={20} color="#f87171" />
          </div>
          <div style={styles.metricInfo}>
            <span style={styles.metricLabel}>Gastos Generales</span>
            <span style={{ ...styles.metricValue, color: "#f87171" }}>
              {formatMoney(spentByType.gasto || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="responsive-inventory-grid">
        
        {/* Registration Form */}
        <div className="glass-panel" style={styles.formCard}>
          <div style={styles.formHeader}>
            <Plus size={20} color="var(--color-primary)" />
            <h3 style={styles.formTitle}>Registrar Compra / Gasto</h3>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Concepto / Descripción *</label>
              <input
                placeholder="Ej. Compra de aceites 10W30, Taladro de banco..."
                className="input-field"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Proveedor *</label>
              <input
                placeholder="Ej. Repuestos El Amigo S.A."
                className="input-field"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Total Compra (Q) *</label>
                <input
                  type="number"
                  placeholder="Total facturado"
                  className="input-field"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  min="0"
                  step="any"
                  required
                />
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Fecha *</label>
                <input
                  type="date"
                  className="input-field"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Forma de Pago</label>
                <select
                  className="select-field"
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value)}
                  style={styles.select}
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="transferencia">📱 Transferencia</option>
                  <option value="cheque">🏦 Cheque</option>
                  <option value="tarjeta">💳 Tarjeta</option>
                  <option value="credito">📋 Crédito (Cuentas por Pagar)</option>
                </select>
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Asignar a Módulo</label>
                <select
                  className="select-field"
                  value={modulo}
                  onChange={(e) => setModulo(e.target.value)}
                  style={styles.select}
                >
                  <option value="general">💼 Administración / Gral</option>
                  <option value="taller">🔧 Taller Mecánico</option>
                  <option value="carwash">🧼 Carwash</option>
                  <option value="parqueo">🚗 Parqueo</option>
                  <option value="cafeteria">☕ Cafetería</option>
                  <option value="tienda">🛒 Tienda POS</option>
                </select>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Tipo de Gasto</label>
              <div style={{ display: "flex", gap: "15px", marginTop: "5px" }}>
                {[
                  { value: "gasto", label: "🧾 Gasto General" },
                  { value: "herramienta", label: "🛠️ Herramienta" },
                  { value: "insumo", label: "📦 Insumo / Repuesto" }
                ].map(opt => (
                  <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem", color: "#fff" }}>
                    <input
                      type="radio"
                      name="tipoGasto"
                      value={opt.value}
                      checked={tipoGasto === opt.value}
                      onChange={() => handleTipoGastoChange(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Inventory integration section */}
            {tipoGasto !== "gasto" && (
              <div style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px dashed rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
                padding: "15px",
                marginTop: "10px",
                textAlign: "left"
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "700", fontSize: "0.9rem", color: "var(--color-primary)" }}>
                  <input
                    type="checkbox"
                    checked={cargarInventario}
                    onChange={(e) => handleCargarInventarioToggle(e.target.checked)}
                  />
                  📥 ¿Cargar automáticamente a Inventario?
                </label>

                {cargarInventario && (
                  <div style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {tipoGasto === "insumo" && (
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Inventario de Destino *</label>
                        <select
                          className="select-field"
                          value={targetInventory}
                          onChange={(e) => setTargetInventory(e.target.value)}
                          style={styles.select}
                        >
                          <option value="taller">🔧 Bodega Taller (Repuestos)</option>
                          <option value="carwash">🧼 Carwash (Insumos/Shampoo)</option>
                          <option value="cafeteria">☕ Cafetería (Alimentos/Bebidas)</option>
                        </select>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "10px" }}>
                      {((tipoGasto === "insumo" && targetInventory === "taller") || tipoGasto === "herramienta") && (
                        <div style={{ ...styles.inputGroup, flex: 1 }}>
                          <label style={styles.label}>Código del Item *</label>
                          <input
                            placeholder="Ej. ROT-05"
                            className="input-field"
                            value={itemCode}
                            onChange={(e) => setItemCode(e.target.value)}
                            style={{ textTransform: "uppercase" }}
                          />
                        </div>
                      )}
                      <div style={{ ...styles.inputGroup, flex: 2 }}>
                        <label style={styles.label}>Nombre del Item *</label>
                        <input
                          placeholder="Nombre descriptivo"
                          className="input-field"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <div style={{ ...styles.inputGroup, flex: 1 }}>
                        <label style={styles.label}>Cantidad a Cargar *</label>
                        <input
                          type="number"
                          className="input-field"
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(e.target.value)}
                          min="1"
                        />
                      </div>
                      <div style={{ ...styles.inputGroup, flex: 1.5 }}>
                        <label style={styles.label}>Costo Unitario Calculado</label>
                        <input
                          className="input-field"
                          value={formatMoney(total ? parseFloat(total) / (parseInt(itemQuantity) || 1) : 0)}
                          disabled
                        />
                      </div>
                    </div>

                    {/* Additional fields for specific inventories */}
                    {tipoGasto === "insumo" && (
                      <div style={{ display: "flex", gap: "10px" }}>
                        <div style={{ ...styles.inputGroup, flex: 1 }}>
                          <label style={styles.label}>Marca / Fabricante</label>
                          <input
                            placeholder="Ej. Toyota, Bosch"
                            className="input-field"
                            value={itemBrand}
                            onChange={(e) => setItemBrand(e.target.value)}
                          />
                        </div>
                        {targetInventory !== "carwash" && (
                          <div style={{ ...styles.inputGroup, flex: 1 }}>
                            <label style={styles.label}>Presentación / Tamaño</label>
                            <input
                              placeholder="Ej. Caja, Galón, Unidad"
                              className="input-field"
                              value={itemPresentation}
                              onChange={(e) => setItemPresentation(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {tipoGasto === "insumo" && targetInventory !== "carwash" && (
                      <div style={{ display: "flex", gap: "10px" }}>
                        <div style={{ ...styles.inputGroup, flex: 1 }}>
                          <label style={styles.label}>Precio Venta (Q) *</label>
                          <input
                            type="number"
                            placeholder="Precio venta al público"
                            className="input-field"
                            value={itemSalePrice}
                            onChange={(e) => setItemSalePrice(e.target.value)}
                            min="0"
                            step="any"
                          />
                        </div>
                        <div style={{ ...styles.inputGroup, flex: 1 }}>
                          <label style={styles.label}>Stock Mínimo (Alerta)</label>
                          <input
                            type="number"
                            className="input-field"
                            value={itemMinStock}
                            onChange={(e) => setItemMinStock(e.target.value)}
                            min="0"
                          />
                        </div>
                      </div>
                    )}

                    {tipoGasto === "herramienta" && (
                      <>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <div style={{ ...styles.inputGroup, flex: 1 }}>
                            <label style={styles.label}>Estado Inicial</label>
                            <select
                              className="select-field"
                              value={toolCondition}
                              onChange={(e) => setToolCondition(e.target.value)}
                              style={styles.select}
                            >
                              <option value="Nueva">Nueva</option>
                              <option value="Excelente">Excelente</option>
                              <option value="Bueno">Bueno</option>
                              <option value="Regular">Regular</option>
                              <option value="Malo">Malo</option>
                            </select>
                          </div>
                          <div style={{ ...styles.inputGroup, flex: 1.5 }}>
                            <label style={styles.label}>Ubicación física</label>
                            <input
                              placeholder="Ej. Estante A, Caja de llaves"
                              className="input-field"
                              value={toolLocation}
                              onChange={(e) => setToolLocation(e.target.value)}
                            />
                          </div>
                        </div>
                        <div style={styles.inputGroup}>
                          <label style={styles.label}>Asignar a (Colaborador)</label>
                          <input
                            placeholder="Nombre del mecánico o encargado"
                            className="input-field"
                            value={toolAssignedTo}
                            onChange={(e) => setToolAssignedTo(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: "15px", width: "100%" }}>
              <Plus size={16} /> Registrar Compra
            </button>
          </form>
        </div>

        {/* Purchases List */}
        <div style={styles.listColumn}>
          {/* Filters card */}
          <div className="glass-panel" style={{ padding: "20px", display: "flex", flexWrap: "wrap", gap: "15px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
            <div style={{ ...styles.searchCard, flex: "2 1 250px", marginBottom: 0 }}>
              <Search size={18} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por concepto o proveedor..."
                style={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div style={{ ...styles.inputGroup, flex: "1 1 140px", marginBottom: 0 }}>
              <select
                className="select-field"
                value={filterModulo}
                onChange={(e) => setFilterModulo(e.target.value)}
                style={{ ...styles.select, width: "100%" }}
              >
                <option value="all">📁 Todos los Módulos</option>
                <option value="general">💼 General / Admin</option>
                <option value="taller">🔧 Taller</option>
                <option value="carwash">🧼 Carwash</option>
                <option value="parqueo">🚗 Parqueo</option>
                <option value="cafeteria">☕ Cafetería</option>
                <option value="tienda">🛒 Tienda POS</option>
              </select>
            </div>

            <div style={{ ...styles.inputGroup, flex: "1 1 140px", marginBottom: 0 }}>
              <select
                className="select-field"
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                style={{ ...styles.select, width: "100%" }}
              >
                <option value="all">📂 Todos los Gastos</option>
                <option value="gasto">🧾 Gastos Generales</option>
                <option value="herramienta">🛠️ Herramientas</option>
                <option value="insumo">📦 Insumos / Repuestos</option>
              </select>
            </div>
          </div>

          {/* List panel */}
          <div className="glass-panel" style={{ padding: "20px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
            {filteredCompras.length === 0 ? (
              <div style={styles.emptyState}>
                <Wallet size={48} color="var(--text-muted)" style={{ marginBottom: "16px", opacity: 0.4 }} />
                <h3>No hay compras registradas</h3>
                <p>Usa los filtros o registra una compra en el formulario lateral.</p>
              </div>
            ) : (
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Concepto / Descripción</th>
                      <th style={styles.th}>Proveedor</th>
                      <th style={styles.th}>Módulo</th>
                      <th style={styles.th}>Gasto</th>
                      <th style={styles.th}>Pago</th>
                      <th style={styles.th}>Inventario</th>
                      <th style={{ ...styles.th, textAlign: "right" }}>Total</th>
                      <th style={{ ...styles.th, width: "50px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompras.map(compra => (
                      <tr key={compra.id} style={styles.tr}>
                        <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Calendar size={12} /> {compra.fecha}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ color: "#fff", fontWeight: "600" }}>{compra.concepto}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ color: "var(--text-main)" }}>{compra.proveedor}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            fontSize: "0.75rem",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontWeight: "700",
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                            color: "#fff"
                          }}>
                            {getModuleLabel(compra.modulo)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ fontSize: "0.82rem", color: compra.tipoGasto === "insumo" ? "var(--color-success)" : compra.tipoGasto === "herramienta" ? "var(--color-warning)" : "#f87171" }}>
                            {getTypeLabel(compra.tipoGasto)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ fontSize: "0.82rem", color: compra.formaPago === "credito" ? "var(--color-danger)" : "#fff", fontWeight: compra.formaPago === "credito" ? "bold" : "normal" }}>
                            {compra.formaPago === "credito" ? "📋 Crédito" : compra.formaPago === "tarjeta" ? "💳 Tarjeta" : compra.formaPago === "transferencia" ? "📱 Transf." : "💵 Efectivo"}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {compra.cargarInventario ? (
                            <span style={{ color: "var(--color-success)", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.82rem", fontWeight: "700" }}>
                              <CheckCircle2 size={12} /> Cargado ({compra.detallesInventario?.cantidad} uds)
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>No</span>
                          )}
                        </td>
                        <td style={{ ...styles.td, fontWeight: "800", color: "#fff", textAlign: "right" }}>
                          {formatMoney(compra.total)}
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => handleDelete(compra.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)" }}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ ...styles.tr, borderTop: "2px solid rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                      <td style={{ ...styles.td, fontWeight: "800", color: "#fff" }}>TOTAL EGRESOS</td>
                      <td style={styles.td}></td>
                      <td style={styles.td}></td>
                      <td style={styles.td}></td>
                      <td style={styles.td}></td>
                      <td style={styles.td}></td>
                      <td style={styles.td}></td>
                      <td style={{ ...styles.td, fontWeight: "800", color: "var(--color-danger)", textAlign: "right" }}>
                        {formatMoney(filteredCompras.reduce((sum, c) => sum + (c.total || 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
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
    gap: "16px",
    padding: "20px 24px",
    borderRadius: "18px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  iconBg: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  metricInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    textAlign: "left",
  },
  metricLabel: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  metricValue: {
    fontSize: "1.4rem",
    fontWeight: "800",
    color: "#fff",
    marginTop: "2px",
  },
  formCard: {
    padding: "24px",
    borderRadius: "18px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    alignSelf: "flex-start",
  },
  formHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  formTitle: {
    fontSize: "1.15rem",
    fontWeight: "800",
    color: "#fff",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "6px",
    width: "100%",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "var(--text-muted)",
  },
  select: {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(20, 24, 33, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "10px",
    color: "#fff",
    cursor: "pointer",
  },
  listColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  searchCard: {
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    marginBottom: "5px",
  },
  searchIcon: {
    color: "var(--text-muted)",
    marginRight: "10px",
  },
  searchInput: {
    flex: 1,
    padding: "12px 0",
    background: "none",
    border: "none",
    outline: "none",
    color: "#fff",
    fontSize: "0.9rem",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    color: "var(--text-muted)",
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
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  },
  td: {
    padding: "16px",
    fontSize: "0.9rem",
    color: "var(--text-main)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
  },
  tr: {
    transition: "background-color 0.2s ease",
  },
};
