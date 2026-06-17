import React, { useState } from "react";
import { 
  Coffee, 
  ShoppingCart, 
  Plus, 
  Edit,
  Trash2, 
  Coins, 
  TrendingUp, 
  Warehouse, 
  User, 
  CheckCircle, 
  Search, 
  AlertTriangle 
} from "lucide-react";
import { formatMoney } from "../utils/storage";

export default function Cafeteria({ 
  cafeteriaInventory, 
  setCafeteriaInventory, 
  cafeteriaSales, 
  setCafeteriaSales, 
  usuarioActual,
  cuentasPorCobrar,
  setCuentasPorCobrar
}) {
  const [activeSubTab, setActiveSubTab] = useState("pos"); // 'pos' or 'inventory'
  
  // POS States
  const [cart, setCart] = useState([]);
  const [cliente, setCliente] = useState("Cliente General");
  const [posSearchQuery, setPosSearchQuery] = useState("");
  const [nit, setNit] = useState("");
  const [nombreFacturacion, setNombreFacturacion] = useState("");

  // Checkout split payment states
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [checkoutNit, setCheckoutNit] = useState("");
  const [checkoutNombreFacturacion, setCheckoutNombreFacturacion] = useState("");
  const [checkoutPayments, setCheckoutPayments] = useState({
    efectivo: "",
    transferencia: "",
    cheque: "",
    tarjeta: "",
    credito: ""
  });
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState([]);

  // Inventory CRUD States
  const [itemName, setItemName] = useState("");
  const [presentation, setPresentation] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [minStock, setMinStock] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [invSearchQuery, setInvSearchQuery] = useState("");

  const isAdmin = usuarioActual?.rol === "admin";
  const isCajero = usuarioActual?.rol === "cajero";
  const isManager = isAdmin || isCajero;

  // --- POS OPERATIONS ---
  const addToCart = (product) => {
    if (product.quantity <= 0) {
      alert("Este producto no tiene stock disponible.");
      return;
    }

    const existingCartItem = cart.find(item => item.id === product.id);
    if (existingCartItem) {
      if (existingCartItem.qty >= product.quantity) {
        alert(`No puedes agregar más de este producto. Stock disponible: ${product.quantity}`);
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateCartQty = (id, newQty) => {
    const product = cafeteriaInventory.find(p => p.id === id);
    if (!product) return;

    if (newQty <= 0) {
      setCart(cart.filter(item => item.id !== id));
      return;
    }

    if (newQty > product.quantity) {
      alert(`Stock insuficiente. Stock disponible: ${product.quantity}`);
      return;
    }

    setCart(cart.map(item => 
      item.id === id ? { ...item, qty: newQty } : item
    ));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const registrarVenta = (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert("El carrito está vacío.");
      return;
    }

    // 1. Double check stocks
    let stockError = false;
    cart.forEach(cartItem => {
      const invItem = cafeteriaInventory.find(p => p.id === cartItem.id);
      if (!invItem || invItem.quantity < cartItem.qty) {
        alert(`Stock insuficiente para ${cartItem.name}. Stock disponible: ${invItem ? invItem.quantity : 0}`);
        stockError = true;
      }
    });

    if (stockError) return;

    const totalSale = cart.reduce((sum, item) => sum + (item.qty * item.salePrice), 0);

    // Open Checkout payment modal!
    setCheckoutOrder({
      id: Date.now(),
      cliente: cliente.trim() || "Cliente General",
      items: cart,
      total: totalSale
    });
    setCheckoutNit(nit || "C/F");
    setCheckoutNombreFacturacion(nombreFacturacion || cliente || "Cliente General");
    setCheckoutPayments({ efectivo: "", transferencia: "", cheque: "", tarjeta: "", credito: "" });
    setSelectedPaymentMethods([]);
  };

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (!checkoutOrder) return;

    // Validate split payments
    let totalPaid = 0;
    const paymentMethodsSelected = selectedPaymentMethods;

    if (paymentMethodsSelected.length === 0) {
      alert("Por favor selecciona al menos un método de pago.");
      return;
    }

    const breakdown = { efectivo: 0, transferencia: 0, cheque: 0, tarjeta: 0, credito: 0 };

    if (paymentMethodsSelected.length === 1) {
      const method = paymentMethodsSelected[0];
      breakdown[method] = checkoutOrder.total;
      totalPaid = checkoutOrder.total;
    } else {
      let invalidAmount = false;
      paymentMethodsSelected.forEach(method => {
        const amt = parseFloat(checkoutPayments[method] || 0);
        if (isNaN(amt) || amt < 0) {
          invalidAmount = true;
        }
        breakdown[method] = amt;
        totalPaid += amt;
      });
      if (invalidAmount) {
        alert("Ingresa montos válidos mayores a 0 en los métodos seleccionados.");
        return;
      }
      if (Math.abs(totalPaid - checkoutOrder.total) > 0.01) {
        alert(`La suma de los pagos (${formatMoney(totalPaid)}) debe ser igual al total a cobrar (${formatMoney(checkoutOrder.total)}).`);
        return;
      }
    }

    // Register Account Receivable if credit > 0
    const creditAmount = breakdown.credito;
    if (creditAmount > 0) {
      if (cuentasPorCobrar && setCuentasPorCobrar) {
        const newCuenta = {
          id: Date.now(),
          cliente: checkoutOrder.cliente || "Cliente General",
          nit: checkoutNit.trim() || "C/F",
          concepto: `Cafetería Ticket #${checkoutOrder.id}`,
          total: creditAmount,
          saldo: creditAmount,
          fecha: new Date().toISOString(),
          estado: "Pendiente",
          pagos: []
        };
        setCuentasPorCobrar([newCuenta, ...cuentasPorCobrar]);
      }
    }

    // Deduct stock from inventory
    setCafeteriaInventory((prevInventory) => {
      return prevInventory.map(invItem => {
        const cartItem = checkoutOrder.items.find(c => c.id === invItem.id);
        if (cartItem) {
          return { ...invItem, quantity: Math.max(0, invItem.quantity - cartItem.qty) };
        }
        return invItem;
      });
    });

    // Save sale
    const nuevaVenta = {
      id: checkoutOrder.id,
      cliente: checkoutOrder.cliente,
      items: checkoutOrder.items.map(item => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        salePrice: item.salePrice,
        purchasePrice: item.purchasePrice,
        presentation: item.presentation
      })),
      total: checkoutOrder.total,
      fecha: new Date().toISOString(),
      tipo: "Cafetería",
      nit: checkoutNit.trim() || "C/F",
      nombreFacturacion: checkoutNombreFacturacion.trim() || checkoutOrder.cliente || "Cliente General",
      formaPago: breakdown,
      formaPagoDesc: paymentMethodsSelected.map(m => `${m.toUpperCase()} (Q${breakdown[m].toFixed(2)})`).join(", ")
    };

    setCafeteriaSales([nuevaVenta, ...cafeteriaSales]);
    setCart([]);
    setCliente("Cliente General");
    setNit("");
    setNombreFacturacion("");
    setCheckoutOrder(null);
    alert("Venta de cafetería cobrada con éxito.");
  };

  // --- INVENTORY CRUD OPERATIONS ---
  const handleInventorySubmit = (e) => {
    e.preventDefault();
    if (!itemName.trim() || !quantity || !purchasePrice || !salePrice) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    const qty = parseInt(quantity);
    const purchase = parseFloat(purchasePrice);
    const sale = parseFloat(salePrice);
    const minS = minStock === "" ? 5 : parseInt(minStock);

    if (isNaN(qty) || qty < 0) {
      alert("La cantidad debe ser mayor o igual a 0.");
      return;
    }
    if (isNaN(purchase) || purchase < 0) {
      alert("El precio de compra debe ser mayor o igual a 0.");
      return;
    }
    if (isNaN(sale) || sale < 0) {
      alert("El precio de venta debe ser mayor o igual a 0.");
      return;
    }
    if (isNaN(minS) || minS < 0) {
      alert("El stock mínimo debe ser un número entero mayor o igual a 0.");
      return;
    }

    if (editingId) {
      // Edit
      setCafeteriaInventory(
        cafeteriaInventory.map((item) =>
          item.id === editingId
            ? { ...item, name: itemName.trim(), presentation: presentation.trim(), quantity: qty, purchasePrice: purchase, salePrice: sale, minStock: minS }
            : item
        )
      );
      setEditingId(null);
    } else {
      // Add
      const exists = cafeteriaInventory.some(item => item.name.toLowerCase().trim() === itemName.toLowerCase().trim());
      if (exists) {
        alert("Ya existe un producto con este nombre en la cafetería.");
        return;
      }

      const nuevo = {
        id: Date.now(),
        name: itemName.trim(),
        presentation: presentation.trim(),
        quantity: qty,
        purchasePrice: purchase,
        salePrice: sale,
        minStock: minS
      };
      setCafeteriaInventory([nuevo, ...cafeteriaInventory]);
    }

    setItemName("");
    setPresentation("");
    setQuantity("");
    setPurchasePrice("");
    setSalePrice("");
    setMinStock("");
  };

  const iniciarEdicion = (item) => {
    setEditingId(item.id);
    setItemName(item.name);
    setPresentation(item.presentation || "");
    setQuantity(item.quantity.toString());
    setPurchasePrice(item.purchasePrice.toString());
    setSalePrice(item.salePrice.toString());
    setMinStock(item.minStock !== undefined ? item.minStock.toString() : "5");
  };

  const eliminarItem = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este producto de cafetería?")) {
      setCafeteriaInventory(cafeteriaInventory.filter(item => item.id !== id));
    }
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setItemName("");
    setPresentation("");
    setQuantity("");
    setPurchasePrice("");
    setSalePrice("");
    setMinStock("");
  };

  // --- CALCULATIONS ---
  const filteredPOSProducts = cafeteriaInventory.filter(p => {
    return p.name.toLowerCase().includes(posSearchQuery.toLowerCase()) ||
           (p.presentation && p.presentation.toLowerCase().includes(posSearchQuery.toLowerCase()));
  });

  const filteredInvProducts = cafeteriaInventory.filter(p => {
    return p.name.toLowerCase().includes(invSearchQuery.toLowerCase()) ||
           (p.presentation && p.presentation.toLowerCase().includes(invSearchQuery.toLowerCase()));
  });

  const totalInvItems = cafeteriaInventory.length;
  const valuationCost = cafeteriaInventory.reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0);
  const valuationRetail = cafeteriaInventory.reduce((sum, p) => sum + (p.quantity * p.salePrice), 0);
  const profitMargin = valuationRetail - valuationCost;

  const cartTotal = cart.reduce((sum, item) => sum + (item.qty * item.salePrice), 0);

  const filteredTotalStock = filteredInvProducts.reduce((sum, p) => sum + p.quantity, 0);
  const filteredTotalCost = filteredInvProducts.reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0);
  const filteredTotalSale = filteredInvProducts.reduce((sum, p) => sum + (p.quantity * p.salePrice), 0);

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Módulo de Cafetería</h1>
          <p>Gestión de ventas y control de inventario de alimentos y bebidas.</p>
        </div>
      </div>

      {/* Subnavigation Tabs */}
      <div style={styles.subTabs}>
        <button 
          onClick={() => setActiveSubTab("pos")}
          style={{ ...styles.subTabBtn, ...(activeSubTab === "pos" ? styles.subTabActive : {}) }}
        >
          <ShoppingCart size={16} /> Punto de Venta (POS)
        </button>
        {isManager && (
          <button 
            onClick={() => setActiveSubTab("inventory")}
            style={{ ...styles.subTabBtn, ...(activeSubTab === "inventory" ? styles.subTabActive : {}) }}
          >
            <Warehouse size={16} /> Inventario Cafetería
          </button>
        )}
      </div>

      {/* RENDER POS SUBTAB */}
      {activeSubTab === "pos" && (
        <div className="responsive-pos-grid">
          {/* Left: Product Selector Grid */}
          <div style={styles.posLeft}>
            {/* Search */}
            <div className="glass-panel" style={styles.searchCard}>
              <Search size={18} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar alimentos o bebidas..."
                style={styles.searchInput}
                value={posSearchQuery}
                onChange={(e) => setPosSearchQuery(e.target.value)}
              />
            </div>

            {/* Products Grid */}
            {filteredPOSProducts.length === 0 ? (
              <div className="glass-panel" style={styles.emptyState}>
                <Coffee size={48} color="var(--text-muted)" style={{ marginBottom: "16px", opacity: 0.4 }} />
                <h3>No hay productos disponibles</h3>
                <p>Carga stock en la pestaña de Inventario.</p>
              </div>
            ) : (
              <div style={styles.posProductsGrid}>
                {filteredPOSProducts.map((p) => {
                  const isOutOfStock = p.quantity <= 0;
                  const currentMinStock = p.minStock !== undefined ? p.minStock : 5;
                  const isLowStock = p.quantity > 0 && p.quantity <= currentMinStock;
                  
                  return (
                    <div 
                      key={p.id}
                      className="glass-panel"
                      onClick={() => !isOutOfStock && addToCart(p)}
                      style={{ 
                        ...styles.productCard,
                        opacity: isOutOfStock ? 0.5 : 1,
                        cursor: isOutOfStock ? "not-allowed" : "pointer",
                        borderLeft: isOutOfStock ? "3px solid var(--color-danger)" : (isLowStock ? "3px solid var(--color-warning)" : "1px solid var(--border-glass)")
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={styles.productName}>{p.name}</span>
                          {p.presentation && (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              📦 {p.presentation}
                            </span>
                          )}
                        </div>
                        <span style={styles.productPrice}>{formatMoney(p.salePrice)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: "10px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <span>Stock disponible:</span>
                        <strong style={{ color: isOutOfStock ? "var(--color-danger)" : (isLowStock ? "var(--color-warning)" : "#fff") }}>
                          {isOutOfStock ? "Agotado" : `${p.quantity} uds`}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Checkout Shopping Cart */}
          <div className="glass-panel" style={styles.posRight}>
            <div style={styles.cartHeader}>
              <ShoppingCart size={18} color="var(--color-secondary)" />
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Detalle del Pedido</h3>
            </div>

            <form onSubmit={registrarVenta} style={styles.cartForm}>
              <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Cliente / Mesa</label>
                  <div style={styles.inputWrapper}>
                    <User size={16} style={styles.inputIcon} />
                    <input
                      placeholder="Ej. Mesa 3 / Nombre Cliente"
                      className="input-field"
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      style={{ ...styles.input, paddingLeft: "42px" }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>NIT (Opcional)</label>
                    <input
                      placeholder="Ej. 1234567-8"
                      className="input-field"
                      value={nit}
                      onChange={(e) => setNit(e.target.value)}
                    />
                  </div>
                  <div style={{ ...styles.inputGroup, flex: 1.5 }}>
                    <label style={styles.label}>Nombre Factura (Opcional)</label>
                    <input
                      placeholder="Nombre para factura"
                      className="input-field"
                      value={nombreFacturacion}
                      onChange={(e) => setNombreFacturacion(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Cart List */}
              <div style={styles.cartList}>
                {cart.length === 0 ? (
                  <div style={styles.emptyCart}>
                    <Coffee size={32} color="var(--text-muted)" style={{ marginBottom: "10px", opacity: 0.3 }} />
                    <p>Haz clic en los productos para agregarlos al pedido.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} style={styles.cartItem}>
                      <div style={{ flex: 1.5, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#fff" }}>
                          {item.name} {item.presentation ? `(${item.presentation})` : ""}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>c/u {formatMoney(item.salePrice)}</span>
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button 
                          type="button" 
                          onClick={() => updateCartQty(item.id, item.qty - 1)}
                          style={styles.cartQtyBtn}
                        >
                          -
                        </button>
                        <span style={{ fontSize: "0.85rem", fontWeight: "bold", minWidth: "20px", textAlign: "center" }}>
                          {item.qty}
                        </span>
                        <button 
                          type="button" 
                          onClick={() => updateCartQty(item.id, item.qty + 1)}
                          style={styles.cartQtyBtn}
                        >
                          +
                        </button>
                      </div>

                      <div style={{ flex: 0.8, textAlign: "right", fontWeight: "bold", fontSize: "0.85rem", color: "#fff" }}>
                        {formatMoney(item.qty * item.salePrice)}
                      </div>

                      <button 
                        type="button" 
                        onClick={() => removeFromCart(item.id)}
                        style={styles.cartRemoveBtn}
                        title="Eliminar del carrito"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer Summary */}
              <div style={styles.cartSummary}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", fontSize: "1.1rem", color: "#fff", marginBottom: "15px" }}>
                  <span>Total Pedido:</span>
                  <span style={{ color: "var(--color-secondary)" }}>{formatMoney(cartTotal)}</span>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-secondary" 
                  style={{ width: "100%", height: "46px" }}
                  disabled={cart.length === 0}
                >
                  <CheckCircle size={18} />
                  Registrar y Cobrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENDER INVENTORY SUBTAB (Admin/Cajero Only) */}
      {activeSubTab === "inventory" && isManager && (
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          
          {/* Inventory Metrics Row */}
          <div style={styles.metricsRow}>
            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-secondary-glow)" }}>
                <Coffee size={20} color="var(--color-secondary)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Productos Cafetería</span>
                <span style={styles.metricValue}>{totalInvItems}</span>
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
                <span style={{ ...styles.metricValue, color: "#06b6d4" }}>{formatMoney(profitMargin)}</span>
              </div>
            </div>
          </div>

          {/* Grid CRUD */}
          <div className="responsive-cafeteria-manager-grid">
            {/* Left Form: CRUD */}
            <div className="glass-panel" style={styles.formCard}>
              <div style={styles.formHeader}>
                <Plus size={20} color="var(--color-secondary)" />
                <h3 style={styles.formTitle}>
                  {editingId ? "Editar Producto" : "Agregar Producto Cafetería"}
                </h3>
              </div>

              <form onSubmit={handleInventorySubmit} style={styles.form}>
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ ...styles.inputGroup, flex: 2 }}>
                    <label style={styles.label}>Nombre del Producto *</label>
                    <input
                      placeholder="Ej. Coca Cola 350ml / Sandwich"
                      className="input-field"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Presentación / Tamaño</label>
                    <input
                      placeholder="Ej. 350ml, Unidad, Combo"
                      className="input-field"
                      value={presentation}
                      onChange={(e) => setPresentation(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Stock Inicial *</label>
                    <input
                      type="number"
                      placeholder="Ej. 24"
                      className="input-field"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="0"
                      required
                    />
                  </div>
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
                    <label style={styles.label}>Mín. Alerta</label>
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

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  {editingId && (
                    <button type="button" className="btn btn-ghost" onClick={cancelarEdicion} style={{ flex: 1 }}>
                      Cancelar
                    </button>
                  )}
                  <button type="submit" className="btn btn-secondary" style={{ flex: 2 }}>
                    {editingId ? "Actualizar Producto" : "Registrar Producto"}
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Table */}
            <div style={styles.listColumn}>
              <div className="glass-panel" style={styles.searchCard}>
                <Search size={18} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar productos de cafetería por nombre..."
                  style={styles.searchInput}
                  value={invSearchQuery}
                  onChange={(e) => setInvSearchQuery(e.target.value)}
                />
              </div>

              <div className="glass-panel" style={{ padding: "20px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
                {filteredInvProducts.length === 0 ? (
                  <div style={styles.emptyState}>
                    <Coffee size={48} color="var(--text-muted)" style={{ marginBottom: "16px", opacity: 0.4 }} />
                    <h3>No hay productos registrados</h3>
                    <p>Usa el buscador o agrega en el formulario lateral.</p>
                  </div>
                ) : (
                  <div style={styles.tableResponsive}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Descripción</th>
                          <th style={styles.th}>Presentación</th>
                          <th style={styles.th}>Stock</th>
                          <th style={styles.th}>P. Compra</th>
                          <th style={styles.th}>P. Venta</th>
                          <th style={styles.th} style={{ textAlign: "right", paddingRight: "16px" }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvProducts.map((p) => {
                          const currentMinStock = p.minStock !== undefined ? p.minStock : 5;
                          const isLowStock = p.quantity <= currentMinStock;
                          return (
                            <tr 
                              key={p.id} 
                              style={{ 
                                ...styles.tr,
                                backgroundColor: isLowStock ? "rgba(239, 68, 68, 0.02)" : "transparent",
                                borderLeft: isLowStock ? "3px solid var(--color-danger)" : "none"
                              }}
                            >
                              <td style={styles.td}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <span style={{ color: "#fff", fontWeight: "600" }}>{p.name}</span>
                                  {isLowStock && (
                                    <span style={{ color: "var(--color-danger)", fontSize: "0.72rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                                      <AlertTriangle size={12} /> Stock bajo (Mínimo: {currentMinStock})
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={styles.td}>
                                {p.presentation || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>-</span>}
                              </td>
                              <td style={{ ...styles.td, fontWeight: "700", color: isLowStock ? "var(--color-danger)" : "#fff" }}>
                                {p.quantity} uds
                              </td>
                              <td style={{ ...styles.td, color: "var(--text-muted)" }}>
                                {formatMoney(p.purchasePrice)}
                              </td>
                              <td style={{ ...styles.td, color: "var(--color-secondary)", fontWeight: "700" }}>
                                {formatMoney(p.salePrice)}
                              </td>
                              <td style={styles.td}>
                                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                  <button 
                                    onClick={() => iniciarEdicion(p)}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)" }}
                                    title="Editar"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={() => eliminarItem(p.id)}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)" }}
                                    title="Eliminar"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ ...styles.tr, borderTop: "2px solid rgba(255, 255, 255, 0.15)", borderBottom: "none", backgroundColor: "rgba(255, 255, 255, 0.02)" }}>
                          <td style={{ ...styles.td, fontWeight: "800", color: "#fff" }}>TOTALES</td>
                          <td style={styles.td}>-</td>
                          <td style={{ ...styles.td, fontWeight: "800", color: "#fff" }}>{filteredTotalStock} uds</td>
                          <td style={{ ...styles.td, fontWeight: "800", color: "var(--color-warning)" }}>{formatMoney(filteredTotalCost)}</td>
                          <td style={{ ...styles.td, fontWeight: "800", color: "var(--color-secondary)" }}>{formatMoney(filteredTotalSale)}</td>
                          <td style={styles.td}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 🔐 COBRO Y FACTURACIÓN: MODAL DE PAGO DIVIDIDO */}
      {checkoutOrder && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={{ ...styles.modalContent, maxWidth: "500px" }}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <Coins size={22} color="var(--color-primary)" /> Cobro y Facturación
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Cafetería POS | Cliente: {checkoutOrder.cliente} | Items: {checkoutOrder.items.length}
              </p>
            </div>

            <form onSubmit={handleCheckoutSubmit} style={styles.form}>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>NIT Facturación</label>
                  <input
                    className="input-field"
                    value={checkoutNit}
                    onChange={(e) => setCheckoutNit(e.target.value)}
                    required
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 2 }}>
                  <label style={styles.label}>Nombre Facturación</label>
                  <input
                    className="input-field"
                    value={checkoutNombreFacturacion}
                    onChange={(e) => setCheckoutNombreFacturacion(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                padding: "15px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                margin: "10px 0"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: "600" }}>Total a Cobrar:</span>
                  <span style={{ color: "var(--color-primary)", fontSize: "1.2rem", fontWeight: "900" }}>{formatMoney(checkoutOrder.total)}</span>
                </div>
                
                {/* Payment Methods Checkboxes */}
                <label style={{ ...styles.label, marginBottom: "8px" }}>Seleccionar Método(s) de Pago:</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {["efectivo", "transferencia", "cheque", "tarjeta", "credito"].map((method) => {
                    const isChecked = selectedPaymentMethods.includes(method);
                    return (
                      <label key={method} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        color: isChecked ? "#fff" : "var(--text-muted)",
                        fontWeight: isChecked ? "bold" : "normal",
                        backgroundColor: isChecked ? "rgba(59, 130, 246, 0.1)" : "rgba(255,255,255,0.02)",
                        padding: "8px",
                        borderRadius: "6px",
                        border: `1px solid ${isChecked ? "var(--color-primary)" : "rgba(255,255,255,0.05)"}`
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedPaymentMethods(selectedPaymentMethods.filter(m => m !== method));
                              setCheckoutPayments({ ...checkoutPayments, [method]: "" });
                            } else {
                              setSelectedPaymentMethods([...selectedPaymentMethods, method]);
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        />
                        {method.toUpperCase()}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Payment Inputs if multiple methods selected */}
              {selectedPaymentMethods.length > 1 && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Desglose de Montos:</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {selectedPaymentMethods.map((method) => (
                      <div key={method} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ width: "110px", fontSize: "0.82rem", fontWeight: "bold", textTransform: "uppercase" }}>{method}:</span>
                        <input
                          type="number"
                          placeholder="Monto Q"
                          className="input-field"
                          value={checkoutPayments[method] || ""}
                          onChange={(e) => setCheckoutPayments({ ...checkoutPayments, [method]: e.target.value })}
                          min="0"
                          step="any"
                          required
                          style={{ flex: 1 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total validation and feedback */}
              {(() => {
                let sumPaid = 0;
                if (selectedPaymentMethods.length === 1) {
                  sumPaid = checkoutOrder.total;
                } else {
                  selectedPaymentMethods.forEach(method => {
                    sumPaid += parseFloat(checkoutPayments[method] || 0);
                  });
                }
                const diff = checkoutOrder.total - sumPaid;
                const isMatch = Math.abs(diff) < 0.01;
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Monto asignado:</span>
                    <strong style={{ color: isMatch ? "var(--color-success)" : "var(--color-danger)" }}>
                      {formatMoney(sumPaid)} ({isMatch ? "Coincide" : `Falta ${formatMoney(diff)}`})
                    </strong>
                  </div>
                );
              })()}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setCheckoutOrder(null)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={
                  (() => {
                    let sumPaid = 0;
                    if (selectedPaymentMethods.length === 1) {
                      sumPaid = checkoutOrder.total;
                    } else {
                      selectedPaymentMethods.forEach(method => {
                        sumPaid += parseFloat(checkoutPayments[method] || 0);
                      });
                    }
                    return Math.abs(sumPaid - checkoutOrder.total) > 0.01;
                  })()
                }>
                  Confirmar Venta
                </button>
              </div>
            </form>
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
  subTabs: {
    display: "flex",
    gap: "10px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    paddingBottom: "10px",
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
  posLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  posProductsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "16px",
  },
  productCard: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    minHeight: "95px",
    textAlign: "left",
    border: "1px solid rgba(255,255,255,0.04)",
  },
  productName: {
    fontSize: "0.9rem",
    fontWeight: "700",
    color: "#fff",
    maxWidth: "80%",
  },
  productPrice: {
    fontSize: "0.9rem",
    fontWeight: "800",
    color: "var(--color-secondary)",
  },
  posRight: {
    padding: "24px",
    textAlign: "left",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  cartHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "20px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    paddingBottom: "12px",
  },
  cartForm: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  cartList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxHeight: "320px",
    overflowY: "auto",
    paddingRight: "4px",
    margin: "10px 0",
    minHeight: "100px",
  },
  emptyCart: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "150px",
    color: "var(--text-muted)",
    fontSize: "0.8rem",
    textAlign: "center",
  },
  cartItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 10px",
    borderRadius: "8px",
    backgroundColor: "rgba(255,255,255,0.01)",
    border: "1px solid rgba(255,255,255,0.03)",
  },
  cartQtyBtn: {
    width: "20px",
    height: "20px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cartRemoveBtn: {
    background: "none",
    border: "none",
    color: "var(--color-danger)",
    cursor: "pointer",
    padding: "4px",
    marginLeft: "10px",
  },
  cartSummary: {
    borderTop: "1px solid rgba(255,255,255,0.05)",
    paddingTop: "15px",
    marginTop: "10px",
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
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    color: "rgba(255, 255, 255, 0.4)",
  },
  input: {
    paddingLeft: "42px",
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
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(5px)",
    zIndex: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: "500px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    padding: "24px",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
    overflowY: "auto",
  },
  modalHeader: {
    marginBottom: "20px",
    textAlign: "left",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    paddingBottom: "12px",
  },
};
