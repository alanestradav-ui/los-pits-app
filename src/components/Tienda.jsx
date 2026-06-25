import React, { useState } from "react";
import { 
  Store, 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Coins, 
  User, 
  FileText, 
  CheckCircle,
  AlertTriangle 
} from "lucide-react";
import { formatMoney } from "../utils/storage";

export default function Tienda({
  workshopInventory = [],
  setWorkshopInventory,
  cafeteriaInventory = [],
  setCafeteriaInventory,
  carwashInventory = [],
  setCarwashInventory,
  tiendaSales = [],
  setTiendaSales,
  cuentasPorCobrar = [],
  setCuentasPorCobrar,
  usuarioActual
}) {
  // Navigation & POS states
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'taller', 'cafeteria', 'carwash'
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  
  // Client info
  const [cliente, setCliente] = useState("Cliente General");
  const [nit, setNit] = useState("");
  const [nombreFacturacion, setNombreFacturacion] = useState("");

  // Checkout modal states
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

  // Compile all inventories into a single list
  const getCatalog = () => {
    const catalog = [];

    // Taller parts
    workshopInventory.forEach(item => {
      catalog.push({
        id: `taller-${item.id}`,
        originalId: item.id,
        source: "taller",
        code: item.code || "PA-N/A",
        name: item.name,
        brand: item.brand || "",
        stock: item.quantity,
        purchasePrice: item.purchasePrice,
        salePrice: item.salePrice,
        presentation: item.presentation || "Unidad"
      });
    });

    // Cafeteria items
    cafeteriaInventory.forEach(item => {
      catalog.push({
        id: `cafeteria-${item.id}`,
        originalId: item.id,
        source: "cafeteria",
        code: "CF-N/A",
        name: item.name,
        brand: "",
        stock: item.quantity,
        purchasePrice: item.purchasePrice,
        salePrice: item.salePrice,
        presentation: item.presentation || "Porción"
      });
    });

    // Carwash supplies (scaled sale price since they don't have default sale prices)
    carwashInventory.forEach(item => {
      catalog.push({
        id: `carwash-${item.id}`,
        originalId: item.id,
        source: "carwash",
        code: "CW-N/A",
        name: item.name,
        brand: "",
        stock: item.quantity,
        purchasePrice: item.purchasePrice,
        salePrice: Math.round(item.purchasePrice * 1.25 * 100) / 100, // 25% margin
        presentation: item.presentation || "Unidad"
      });
    });

    return catalog;
  };

  const catalog = getCatalog();

  // Filter catalog by selected tab and search query
  const filteredCatalog = catalog.filter(item => {
    const matchesTab = activeTab === "all" || item.source === activeTab;
    const matchesSearch = 
      (item.name || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
      (item.code || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
      (item.brand || "").toLowerCase().includes((searchQuery || "").toLowerCase());
    return matchesTab && matchesSearch;
  });

  // --- CART OPERATIONS ---
  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert("Este producto no tiene stock disponible en bodega.");
      return;
    }

    const existingCartItem = cart.find(item => item.id === product.id);
    if (existingCartItem) {
      if (existingCartItem.qty >= product.stock) {
        alert(`No puedes agregar más. Stock disponible: ${product.stock} unidades.`);
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
    const item = catalog.find(p => p.id === id);
    if (!item) return;

    if (newQty <= 0) {
      setCart(cart.filter(c => c.id !== id));
      return;
    }

    if (newQty > item.stock) {
      alert(`Stock insuficiente en bodega. Stock disponible: ${item.stock} unidades.`);
      return;
    }

    setCart(cart.map(c => 
      c.id === id ? { ...c, qty: newQty } : c
    ));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.qty * item.salePrice), 0);

  const startCheckout = (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert("El carrito de compras está vacío.");
      return;
    }

    // Double check inventory levels
    let stockError = false;
    cart.forEach(cartItem => {
      const liveItem = catalog.find(item => item.id === cartItem.id);
      if (!liveItem || liveItem.stock < cartItem.qty) {
        alert(`Stock insuficiente para ${cartItem.name}. Stock disponible: ${liveItem ? liveItem.stock : 0}`);
        stockError = true;
      }
    });
    if (stockError) return;

    // Open Split Payment Modal
    setCheckoutOrder({
      id: Date.now(),
      cliente: cliente.trim() || "Cliente General",
      items: cart,
      total: cartTotal
    });
    setCheckoutNit(nit || "C/F");
    setCheckoutNombreFacturacion(nombreFacturacion || cliente || "Cliente General");
    setCheckoutPayments({ efectivo: "", transferencia: "", cheque: "", tarjeta: "", credito: "" });
    setSelectedPaymentMethods([]);
  };

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (!checkoutOrder) return;

    // Validate payments
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

    // Register Accounts Receivable if credit > 0
    const creditAmount = breakdown.credito;
    if (creditAmount > 0) {
      if (cuentasPorCobrar && setCuentasPorCobrar) {
        const newCuenta = {
          id: Date.now(),
          cliente: checkoutOrder.cliente || "Cliente General",
          nit: checkoutNit.trim() || "C/F",
          concepto: `Tienda Ticket #${checkoutOrder.id}`,
          total: creditAmount,
          saldo: creditAmount,
          fecha: new Date().toISOString(),
          estado: "Pendiente",
          pagos: []
        };
        setCuentasPorCobrar([newCuenta, ...cuentasPorCobrar]);
      }
    }

    // Deduct stock from inventories based on item sources
    checkoutOrder.items.forEach(cartItem => {
      if (cartItem.source === "taller") {
        setWorkshopInventory(prev => prev.map(invItem => 
          invItem.id === cartItem.originalId 
            ? { ...invItem, quantity: Math.max(0, invItem.quantity - cartItem.qty) }
            : invItem
        ));
      } else if (cartItem.source === "cafeteria") {
        setCafeteriaInventory(prev => prev.map(invItem => 
          invItem.id === cartItem.originalId 
            ? { ...invItem, quantity: Math.max(0, invItem.quantity - cartItem.qty) }
            : invItem
        ));
      } else if (cartItem.source === "carwash") {
        setCarwashInventory(prev => prev.map(invItem => 
          invItem.id === cartItem.originalId 
            ? { ...invItem, quantity: Math.max(0, invItem.quantity - cartItem.qty) }
            : invItem
        ));
      }
    });

    // Record sale
    const newTiendaSale = {
      id: checkoutOrder.id,
      cliente: checkoutOrder.cliente,
      items: checkoutOrder.items.map(i => ({
        id: i.originalId,
        source: i.source,
        name: i.name,
        qty: i.qty,
        salePrice: i.salePrice,
        purchasePrice: i.purchasePrice,
        presentation: i.presentation
      })),
      total: checkoutOrder.total,
      fecha: new Date().toISOString(),
      tipo: "Tienda",
      nit: checkoutNit.trim() || "C/F",
      nombreFacturacion: checkoutNombreFacturacion.trim() || checkoutOrder.cliente || "Cliente General",
      formaPago: breakdown,
      formaPagoDesc: paymentMethodsSelected.map(m => `${m.toUpperCase()} (Q${breakdown[m].toFixed(2)})`).join(", ")
    };

    setTiendaSales([newTiendaSale, ...tiendaSales]);
    setCart([]);
    setCliente("Cliente General");
    setNit("");
    setNombreFacturacion("");
    setCheckoutOrder(null);
    alert("Venta de tienda realizada con éxito.");
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Tienda POS Integrada</h1>
          <p>Realiza ventas combinadas con acceso unificado a las bodegas de Taller, Cafetería y Carwash.</p>
        </div>
      </div>

      {/* POS Content Grid */}
      <div className="responsive-pos-grid">
        {/* Left: Product Catalog */}
        <div style={styles.posLeft}>
          {/* Catalog Controls */}
          <div className="glass-panel" style={styles.catalogHeader}>
            <div style={styles.searchCard}>
              <Search size={18} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por código, marca o nombre de producto..."
                style={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div style={styles.catalogTabs}>
              {[
                { id: "all", label: "Todos" },
                { id: "taller", label: "🔧 Repuestos Taller" },
                { id: "cafeteria", label: "☕ Cafetería" },
                { id: "carwash", label: "🧼 Insumos Carwash" }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    ...styles.tabBtn,
                    ...(activeTab === t.id ? styles.tabBtnActive : {})
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {filteredCatalog.length === 0 ? (
            <div className="glass-panel" style={styles.emptyState}>
              <Store size={48} color="var(--text-muted)" style={{ marginBottom: "16px", opacity: 0.4 }} />
              <h3>No se encontraron productos</h3>
              <p>Revisa los filtros o tu término de búsqueda.</p>
            </div>
          ) : (
            <div style={styles.productsGrid}>
              {filteredCatalog.map(p => {
                const isOut = p.stock <= 0;
                return (
                  <div 
                    key={p.id} 
                    className="glass-panel" 
                    style={{
                      ...styles.productCard,
                      opacity: isOut ? 0.6 : 1,
                      borderLeft: `3px solid ${p.source === 'taller' ? 'var(--color-primary)' : p.source === 'cafeteria' ? '#ec4899' : 'var(--color-secondary)'}`
                    }}
                  >
                    <div style={styles.productTop}>
                      <span style={{ fontSize: "0.68rem", fontWeight: "800", textTransform: "uppercase", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>
                        {p.source.toUpperCase()}
                      </span>
                      {p.brand && <span style={styles.productBrand}>{p.brand}</span>}
                    </div>
                    
                    <h4 style={styles.productName}>{p.name}</h4>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{p.presentation} • Cod: {p.code}</p>
                    
                    <div style={styles.productBottom}>
                      <span style={styles.productPrice}>{formatMoney(p.salePrice)}</span>
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", color: isOut ? "var(--color-danger)" : "var(--color-success)" }}>
                        {isOut ? "Sin Stock" : `${p.stock} disp.`}
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(p)}
                      disabled={isOut}
                      className="btn btn-primary"
                      style={{ width: "100%", padding: "8px", marginTop: "12px", fontSize: "0.85rem" }}
                    >
                      <Plus size={14} /> Agregar al Carrito
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Cart & Client Info */}
        <div className="glass-panel" style={styles.posRight}>
          <div style={styles.cartHeader}>
            <ShoppingCart size={22} color="var(--color-secondary)" />
            <h2 style={{ fontSize: "1.2rem", fontWeight: "700" }}>Carrito de Ventas</h2>
          </div>

          <form onSubmit={startCheckout} style={styles.cartForm}>
            {/* Cart Items List */}
            <div style={styles.cartList}>
              {cart.length === 0 ? (
                <div style={styles.emptyCart}>
                  <ShoppingCart size={32} color="var(--text-muted)" style={{ marginBottom: "10px", opacity: 0.3 }} />
                  <span>El carrito está vacío</span>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} style={styles.cartItem}>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "#fff" }}>{item.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {formatMoney(item.salePrice)} x {item.qty} | {item.source.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button 
                        type="button" 
                        onClick={() => updateCartQty(item.id, item.qty - 1)}
                        style={styles.qtyBtn}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ minWidth: "20px", textAlign: "center", fontWeight: "700", fontSize: "0.9rem" }}>{item.qty}</span>
                      <button 
                        type="button" 
                        onClick={() => updateCartQty(item.id, item.qty + 1)}
                        style={styles.qtyBtn}
                      >
                        <Plus size={12} />
                      </button>
                      
                      <button 
                        type="button" 
                        onClick={() => removeFromCart(item.id)}
                        style={styles.removeBtn}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Client Information */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "700" }}>Datos del Cliente</h3>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre de Cliente</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Cliente General"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>NIT (Opcional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="C/F o número"
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Nombre de Facturación (Opcional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Facturar a"
                    value={nombreFacturacion}
                    onChange={(e) => setNombreFacturacion(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={styles.cartSummary}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "1rem" }}>
                <span style={{ color: "var(--text-muted)", fontWeight: "600" }}>Total a Pagar:</span>
                <strong style={{ color: "var(--color-secondary)", fontSize: "1.35rem", fontWeight: "900" }}>
                  {formatMoney(cartTotal)}
                </strong>
              </div>

              <button
                type="submit"
                disabled={cart.length === 0}
                className="btn btn-secondary"
                style={{ width: "100%", height: "46px" }}
              >
                <Coins size={18} /> Proceder al Pago
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 🔐 COBRO Y FACTURACIÓN: MODAL DE PAGO DIVIDIDO */}
      {checkoutOrder && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={{ ...styles.modalContent, maxWidth: "500px" }}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <Coins size={22} color="var(--color-primary)" /> Cobro y Facturación
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Tienda POS | Cliente: {checkoutOrder.cliente} | Items: {checkoutOrder.items.length}
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
                  Confirmar Cobro
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
  posLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  catalogHeader: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    textAlign: "left",
  },
  searchCard: {
    display: "flex",
    alignItems: "center",
    padding: "4px 16px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "10px",
    backgroundColor: "rgba(20, 24, 33, 0.8)",
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
  catalogTabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  tabBtn: {
    padding: "8px 16px",
    fontSize: "0.85rem",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    color: "var(--text-muted)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  tabBtnActive: {
    color: "#fff",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  productsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "18px",
  },
  productCard: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "180px",
    textAlign: "left",
    borderRadius: "16px",
  },
  productTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  productBrand: {
    fontSize: "0.72rem",
    fontWeight: "700",
    color: "var(--color-primary)",
    textTransform: "uppercase",
  },
  productName: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "#fff",
    lineHeight: "1.3",
    margin: "4px 0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    minHeight: "38px",
  },
  productBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "12px",
  },
  productPrice: {
    fontSize: "1.1rem",
    fontWeight: "800",
    color: "var(--color-secondary)",
  },
  posRight: {
    padding: "24px",
    textAlign: "left",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    alignSelf: "start",
    position: "sticky",
    top: "30px",
  },
  cartHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    paddingBottom: "12px",
  },
  cartForm: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  cartList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxHeight: "320px",
    overflowY: "auto",
    paddingRight: "4px",
    minHeight: "120px",
  },
  emptyCart: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "120px",
    color: "var(--text-muted)",
    fontSize: "0.85rem",
  },
  cartItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    border: "1px solid rgba(255, 255, 255, 0.03)",
  },
  qtyBtn: {
    width: "22px",
    height: "22px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "var(--color-danger)",
    cursor: "pointer",
    padding: "4px",
    marginLeft: "6px",
  },
  cartSummary: {
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    paddingTop: "15px",
    marginTop: "10px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    textAlign: "left",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "var(--text-muted)",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 20px",
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  }
};
