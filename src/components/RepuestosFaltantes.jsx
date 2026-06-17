import React, { useState } from "react";
import { 
  ShoppingCart, 
  Search, 
  AlertTriangle, 
  Coins, 
  ClipboardList, 
  CheckCircle,
  FileText
} from "lucide-react";
import { formatMoney } from "../utils/storage";

export default function RepuestosFaltantes({ 
  ordenes = [], 
  setOrdenes, 
  workshopInventory = [], 
  setWorkshopInventory, 
  cuentasPorPagar = [], 
  setCuentasPorPagar, 
  usuarios = [],
  comisionMecanico = 0.10
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedPartToBuy, setSelectedPartToBuy] = useState(null);
  const [buyPurchasePrice, setBuyPurchasePrice] = useState("");
  const [buySalePrice, setBuySalePrice] = useState("");
  const [buyQty, setBuyQty] = useState("");
  const [buyPaymentMethod, setBuyPaymentMethod] = useState("efectivo");
  const [buyProvider, setBuyProvider] = useState("");

  const AUTHORIZED_STATUSES = [
    "En proceso de reparación",
    "En período de prueba y control de calidad",
    "En proceso de lavado",
    "Listo para entrega"
  ];

  // 1. Filter active authorized orders (budget authorized and not delivered)
  const activeAuthorizedOrders = ordenes.filter(o => 
    (o.diagnosticoAutorizado || AUTHORIZED_STATUSES.includes(o.estado)) && 
    o.estado !== "Entregado"
  );

  // 2. Map current physical stock
  const stockReservado = {};
  workshopInventory.forEach(invItem => {
    const key = invItem.code.toUpperCase().trim() || invItem.name.toLowerCase().trim();
    stockReservado[key] = invItem.quantity;
  });

  // 3. Compile missing parts list grouped by vehicle (order)
  const vehiclesWithMissingParts = [];
  let totalFaltantesQtyGlobal = 0;
  let inversionCompraEstimadaGlobal = 0;

  activeAuthorizedOrders.forEach(o => {
    const missingPartsForThisVehicle = [];
    
    if (o.presupuesto && o.presupuesto.parts && o.presupuesto.parts.length > 0) {
      o.presupuesto.parts.forEach(part => {
        const invItem = workshopInventory.find(inv => 
          (part.code && inv.code.toUpperCase().trim() === part.code.toUpperCase().trim()) || 
          inv.name.toLowerCase().trim() === part.desc.toLowerCase().trim()
        );

        const key = invItem ? (invItem.code.toUpperCase().trim() || invItem.name.toLowerCase().trim()) : part.desc.toLowerCase().trim();
        const stockDisponible = key in stockReservado ? stockReservado[key] : (invItem ? invItem.quantity : 0);
        const requerido = part.qty;
        
        if (requerido > stockDisponible) {
          const faltanteQty = requerido - stockDisponible;
          const purchasePriceEst = invItem ? invItem.purchasePrice : (part.purchasePrice || 0);
          
          missingPartsForThisVehicle.push({
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

          totalFaltantesQtyGlobal += faltanteQty;
          inversionCompraEstimadaGlobal += faltanteQty * purchasePriceEst;
          stockReservado[key] = 0;
        } else {
          stockReservado[key] = stockDisponible - requerido;
        }
      });
    }

    if (missingPartsForThisVehicle.length > 0) {
      vehiclesWithMissingParts.push({
        id: o.id,
        cliente: o.cliente,
        telefono: o.telefono || "",
        placa: o.placa || (o.vehiculo && o.vehiculo.match(/\(([^)]+)\)/)?.[1]) || "N/A",
        marca: o.marca || "N/A",
        linea: o.linea || "N/A",
        anio: o.anio || "N/A",
        chasis: o.chasis || "N/A",
        vehiculoDesc: o.vehiculo || `${o.marca || ""} ${o.linea || ""}`,
        missingParts: missingPartsForThisVehicle,
        totalItemsCount: missingPartsForThisVehicle.length,
        totalFaltantesQty: missingPartsForThisVehicle.reduce((sum, p) => sum + p.faltante, 0),
        totalInversion: missingPartsForThisVehicle.reduce((sum, p) => sum + p.totalCostoFaltante, 0)
      });
    }
  });

  const selectedVehicle = selectedVehicleId ? vehiclesWithMissingParts.find(v => v.id === selectedVehicleId) : null;

  const filteredVehicles = vehiclesWithMissingParts.filter(v => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      v.placa.toLowerCase().includes(query) ||
      v.marca.toLowerCase().includes(query) ||
      v.linea.toLowerCase().includes(query) ||
      v.chasis.toLowerCase().includes(query) ||
      v.cliente.toLowerCase().includes(query) ||
      v.missingParts.some(p => 
        p.partName.toLowerCase().includes(query) || 
        p.partCode.toLowerCase().includes(query)
      )
    );
  });

  const calculateOrderCommission = (orderObj) => {
    const mechName = orderObj.mecanico;
    if (!mechName) return 0;
    
    const mechUser = (usuarios || []).find(u => u.user.toLowerCase().trim() === mechName.toLowerCase().trim());
    
    const comisionarLabor = mechUser ? (mechUser.comisionarLabor !== undefined ? mechUser.comisionarLabor : true) : true;
    const comisionarRepuestos = mechUser ? (mechUser.comisionarRepuestos !== undefined ? mechUser.comisionarRepuestos : false) : false;
    
    const pctLabor = mechUser ? (mechUser.comisionTaller !== undefined ? mechUser.comisionTaller / 100 : comisionMecanico) : comisionMecanico;
    const pctRepuestos = mechUser ? (mechUser.comisionRepuestos !== undefined ? mechUser.comisionRepuestos / 100 : 0) : 0;
    
    let laborComm = 0;
    let repuestosComm = 0;
    
    if (orderObj.presupuesto) {
      const totalLabor = orderObj.presupuesto.labor?.reduce((sum, item) => sum + item.price, 0) || 0;
      if (comisionarLabor) {
        laborComm = totalLabor * pctLabor;
      }
      
      if (comisionarRepuestos) {
        const totalPartsUtility = orderObj.presupuesto.parts?.reduce((sum, part) => {
          const utility = Math.max(0, (part.salePrice - (part.purchasePrice || 0)) * part.qty);
          return sum + utility;
        }, 0) || 0;
        repuestosComm = totalPartsUtility * pctRepuestos;
      }
    } else {
      if (comisionarLabor) {
        laborComm = orderObj.total * pctLabor;
      }
    }
    
    return laborComm + repuestosComm;
  };

  const handleConfirmPurchase = (e) => {
    e.preventDefault();
    if (!selectedPartToBuy) return;

    const qty = parseInt(buyQty);
    const purchasePrice = parseFloat(buyPurchasePrice || 0);
    const salePrice = parseFloat(buySalePrice || 0);

    if (isNaN(qty) || qty <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }
    if (isNaN(purchasePrice) || purchasePrice < 0) {
      alert("El precio de compra debe ser un número válido");
      return;
    }
    if (isNaN(salePrice) || salePrice < 0) {
      alert("El precio de venta debe ser un número válido");
      return;
    }
    if (buyPaymentMethod === "credito" && !buyProvider.trim()) {
      alert("Debes ingresar el proveedor para compras al crédito.");
      return;
    }

    // 1. Update Inventory
    if (setWorkshopInventory) {
      setWorkshopInventory(prevInv => {
        const itemCodeUpper = selectedPartToBuy.partCode && selectedPartToBuy.partCode !== "S/C" 
          ? selectedPartToBuy.partCode.toUpperCase().trim() 
          : "";
        const itemNameLower = selectedPartToBuy.partName.toLowerCase().trim();

        const exists = prevInv.some(invItem => 
          (itemCodeUpper && invItem.code.toUpperCase().trim() === itemCodeUpper) ||
          invItem.name.toLowerCase().trim() === itemNameLower
        );

        if (exists) {
          return prevInv.map(invItem => {
            const matches = (itemCodeUpper && invItem.code.toUpperCase().trim() === itemCodeUpper) ||
                            invItem.name.toLowerCase().trim() === itemNameLower;
            if (matches) {
              return {
                ...invItem,
                quantity: invItem.quantity + qty,
                purchasePrice: purchasePrice,
                salePrice: salePrice
              };
            }
            return invItem;
          });
        } else {
          const codeToUse = itemCodeUpper || `REP-${Date.now().toString().slice(-4)}`;
          const brandToUse = selectedPartToBuy.partBrand || buyProvider || "S/M";
          const presentationToUse = selectedPartToBuy.partPresentation || "Unidad";
          
          const newItem = {
            id: Date.now(),
            code: codeToUse,
            name: selectedPartToBuy.partName.trim(),
            brand: brandToUse,
            presentation: presentationToUse,
            quantity: qty,
            purchasePrice: purchasePrice,
            salePrice: salePrice,
            minStock: 5
          };
          return [newItem, ...prevInv];
        }
      });
    }

    // 2. Update Order
    if (setOrdenes) {
      setOrdenes(prevOrdenes => {
        return prevOrdenes.map(o => {
          if (o.id === selectedPartToBuy.vehicleId) {
            if (o.presupuesto && o.presupuesto.parts) {
              const updatedParts = o.presupuesto.parts.map(p => {
                const isMatch = (selectedPartToBuy.partCode && selectedPartToBuy.partCode !== "S/C" && p.code && p.code.toUpperCase().trim() === selectedPartToBuy.partCode.toUpperCase().trim()) ||
                                p.desc.toLowerCase().trim() === selectedPartToBuy.partName.toLowerCase().trim();
                if (isMatch) {
                  return {
                    ...p,
                    purchasePrice: purchasePrice,
                    salePrice: salePrice,
                    price: salePrice // retrocompatibility
                  };
                }
                return p;
              });

              const totalLabor = o.presupuesto.labor?.reduce((sum, item) => sum + item.price, 0) || 0;
              const totalParts = updatedParts.reduce((sum, item) => sum + (item.qty * item.salePrice), 0);
              const totalServices = o.presupuesto.services?.reduce((sum, item) => sum + item.price, 0) || 0;
              const subTotal = totalLabor + totalParts + totalServices;
              const discountPct = o.presupuesto.discount || 0;
              const discountAmount = subTotal * (discountPct / 100);
              const newTotal = subTotal - discountAmount;

              const updatedBudget = {
                ...o.presupuesto,
                parts: updatedParts
              };

              const newCommission = calculateOrderCommission({
                ...o,
                presupuesto: updatedBudget,
                total: newTotal
              });

              return {
                ...o,
                presupuesto: updatedBudget,
                total: newTotal,
                comision: newCommission
              };
            }
          }
          return o;
        });
      });
    }

    // 3. Register Accounts Payable if credit
    if (buyPaymentMethod === "credito" && setCuentasPorPagar) {
      const totalCost = qty * purchasePrice;
      const newCuenta = {
        id: Date.now(),
        proveedor: buyProvider.trim() || selectedPartToBuy.partBrand || "Proveedor de Repuestos",
        concepto: `Compra de repuesto faltante: ${selectedPartToBuy.partName.trim()} (${qty} uds) para vehículo Placa ${selectedPartToBuy.placa} (Orden #${selectedPartToBuy.vehicleId})`,
        total: totalCost,
        saldo: totalCost,
        fecha: new Date().toISOString(),
        estado: "Pendiente",
        pagos: []
      };
      setCuentasPorPagar(prevPayable => [newCuenta, ...prevPayable]);
    }

    alert("¡Repuesto adquirido con éxito! Se actualizó el stock del inventario y el presupuesto del vehículo.");
    setSelectedPartToBuy(null);
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Repuestos Faltantes por Adquirir</h1>
          <p>Listado de vehículos con repuestos faltantes en presupuestos ya autorizados.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={styles.metricsRow}>
        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.iconBg, backgroundColor: "var(--color-primary-glow)" }}>
            <ClipboardList size={20} color="var(--color-primary)" />
          </div>
          <div style={styles.metricInfo}>
            <span style={styles.metricLabel}>Vehículos con Faltantes</span>
            <span style={styles.metricValue}>{vehiclesWithMissingParts.length}</span>
          </div>
        </div>

        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.iconBg, backgroundColor: "var(--color-warning-glow)" }}>
            <AlertTriangle size={20} color="var(--color-warning)" />
          </div>
          <div style={styles.metricInfo}>
            <span style={styles.metricLabel}>Repuestos Faltantes Totales</span>
            <span style={{ ...styles.metricValue, color: "var(--color-warning)" }}>{totalFaltantesQtyGlobal} uds</span>
          </div>
        </div>

        <div className="glass-panel" style={styles.metricCard}>
          <div style={{ ...styles.iconBg, backgroundColor: "var(--color-success-glow)" }}>
            <Coins size={20} color="var(--color-success)" />
          </div>
          <div style={styles.metricInfo}>
            <span style={styles.metricLabel}>Inversión Estimada Compra</span>
            <span style={{ ...styles.metricValue, color: "var(--color-success)" }}>{formatMoney(inversionCompraEstimadaGlobal)}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={styles.workerGrid}>
        <div style={styles.listColumn}>
          {/* Search Box */}
          <div className="glass-panel" style={styles.searchCard}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Filtrar por código, repuesto, marca, chasis, placa o cliente..."
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Vehicles List Table */}
          <div className="glass-panel" style={{ padding: "20px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
            {filteredVehicles.length === 0 ? (
              <div style={styles.emptyState}>
                <CheckCircle size={48} color="var(--color-success)" style={{ marginBottom: "16px", opacity: 0.6 }} />
                <h3>¡Todo al día!</h3>
                <p>No se encontraron vehículos con repuestos faltantes en este momento.</p>
              </div>
            ) : (
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Vehículo</th>
                      <th style={styles.th}>Chasis / VIN</th>
                      <th style={styles.th}>Placa</th>
                      <th style={styles.th}>Cliente / Contacto</th>
                      <th style={styles.th}>Repuestos Diferentes</th>
                      <th style={styles.th}>Total Unidades</th>
                      <th style={styles.th}>Inversión Estimada</th>
                      <th style={{ ...styles.th, textAlign: "right" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.map((item) => (
                      <tr key={item.id} style={styles.tr}>
                        <td style={styles.td}>
                          <span style={{ color: "#fff", fontWeight: "700", fontSize: "0.95rem" }}>
                            {item.marca !== "N/A" ? `${item.marca} ${item.linea} (${item.anio})` : item.vehiculoDesc}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ color: "var(--color-secondary)", fontWeight: "bold", fontSize: "0.85rem" }}>
                            {item.chasis}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ color: "#fff", fontWeight: "600", fontSize: "0.85rem" }}>
                            {item.placa}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ color: "var(--text-main)", fontWeight: "500" }}>{item.cliente}</span>
                            {item.telefono && <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>📞 {item.telefono}</span>}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ fontSize: "0.85rem", backgroundColor: "rgba(59, 130, 246, 0.1)", color: "var(--color-primary)", padding: "3px 8px", borderRadius: "6px", fontWeight: "700" }}>
                            {item.totalItemsCount} ítems
                          </span>
                        </td>
                        <td style={{ ...styles.td, color: "#fff", fontWeight: "600" }}>
                          {item.totalFaltantesQty} uds
                        </td>
                        <td style={{ ...styles.td, color: "var(--color-warning)", fontWeight: "700" }}>
                          {formatMoney(item.totalInversion)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setSelectedVehicleId(item.id)}
                            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", padding: "6px 12px", marginLeft: "auto" }}
                          >
                            <FileText size={14} /> Abrir Lista
                          </button>
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

      {/* Detail Modal */}
      {selectedVehicle && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            {/* Modal Header: Vehicle Details */}
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#fff", marginBottom: "4px" }}>
                    📋 Repuestos Requeridos
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: 0 }}>
                    Lista de repuestos sin stock suficiente para el trabajo autorizado.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSelectedVehicleId(null)} 
                  style={styles.modalCloseBtn}
                >
                  &times;
                </button>
              </div>

              {/* Vehicle info grid in Header */}
              <div style={styles.vehicleInfoGrid}>
                <div style={styles.infoField}>
                  <span style={styles.infoFieldLabel}>Marca y Línea:</span>
                  <span style={styles.infoFieldValue}>
                    {selectedVehicle.marca !== "N/A" ? `${selectedVehicle.marca} ${selectedVehicle.linea}` : selectedVehicle.vehiculoDesc}
                  </span>
                </div>
                <div style={styles.infoField}>
                  <span style={styles.infoFieldLabel}>Modelo / Año:</span>
                  <span style={styles.infoFieldValue}>{selectedVehicle.anio}</span>
                </div>
                <div style={styles.infoField}>
                  <span style={styles.infoFieldLabel}>Chasis / VIN:</span>
                  <span style={{ ...styles.infoFieldValue, color: "var(--color-secondary)", fontWeight: "bold" }}>
                    {selectedVehicle.chasis}
                  </span>
                </div>
                </div>
            </div>

            {/* Modal Body: Table of missing parts */}
            <div style={styles.modalBody}>
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Código</th>
                      <th style={styles.th}>Repuesto / Material</th>
                      <th style={styles.th}>Requerido</th>
                      <th style={styles.th}>En Bodega</th>
                      <th style={styles.th}>Faltan</th>
                      <th style={styles.th}>Costo Unit.</th>
                      <th style={{ ...styles.th, textAlign: "right" }}>Total Costo</th>
                      <th style={{ ...styles.th, textAlign: "right" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVehicle.missingParts.map((item, idx) => (
                      <tr key={idx} style={styles.tr}>
                        <td style={{ ...styles.td, fontFamily: "var(--font-display)", fontWeight: "700", color: "var(--color-primary)" }}>
                          {item.partCode}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ color: "#fff", fontWeight: "600" }}>{item.partName}</span>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              {item.partBrand && <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>🏷️ {item.partBrand}</span>}
                              {item.partPresentation && <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>📦 {item.partPresentation}</span>}
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>{item.requerido} uds</td>
                        <td style={{ ...styles.td, color: "var(--text-muted)" }}>{item.stockBodega} uds</td>
                        <td style={{ ...styles.td, color: "var(--color-danger)", fontWeight: "700" }}>{item.faltante} uds</td>
                        <td style={{ ...styles.td, color: "var(--text-muted)" }}>{formatMoney(item.purchasePrice)}</td>
                        <td style={{ ...styles.td, color: "var(--color-warning)", fontWeight: "700", textAlign: "right" }}>
                          {formatMoney(item.totalCostoFaltante)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                              setSelectedPartToBuy({
                                ...item,
                                vehicleId: selectedVehicle.id,
                                clientName: selectedVehicle.cliente,
                                placa: selectedVehicle.placa
                              });
                              setBuyPurchasePrice(item.purchasePrice > 0 ? item.purchasePrice.toString() : "");
                              setBuySalePrice("");
                              setBuyQty(item.faltante.toString());
                              setBuyPaymentMethod("efectivo");
                              setBuyProvider("");
                            }}
                            style={{ padding: "6px 12px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <ShoppingCart size={12} /> Comprar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={styles.modalFooter}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", gap: "20px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Total Faltantes: <strong style={{ color: "#fff" }}>{selectedVehicle.totalFaltantesQty} uds</strong>
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Inversión de Compra: <strong style={{ color: "var(--color-warning)" }}>{formatMoney(selectedVehicle.totalInversion)}</strong>
                  </span>
                </div>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setSelectedVehicleId(null)}
                >
                  Cerrar Lista
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Modal Form */}
      {selectedPartToBuy && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={{ ...styles.modalContent, maxWidth: "500px" }}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShoppingCart size={22} color="var(--color-primary)" /> Registrar Compra de Repuesto
                </h3>
                <button 
                  type="button" 
                  onClick={() => setSelectedPartToBuy(null)} 
                  style={styles.modalCloseBtn}
                >
                  &times;
                </button>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>
                Para: <span style={{ color: "#fff", fontWeight: "bold" }}>{selectedPartToBuy.clientName}</span> ({selectedPartToBuy.placa})
              </p>
            </div>

            <form onSubmit={handleConfirmPurchase} style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "24px" }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Repuesto</label>
                <input
                  className="input-field"
                  value={`${selectedPartToBuy.partName} (${selectedPartToBuy.partCode})`}
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Cantidad a Comprar *</label>
                <input
                  type="number"
                  placeholder="Cantidad"
                  className="input-field"
                  value={buyQty}
                  onChange={(e) => setBuyQty(e.target.value)}
                  min="1"
                  required
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Unidades faltantes requeridas: {selectedPartToBuy.faltante} uds
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>P. Compra Unitario (Q) *</label>
                  <input
                    type="number"
                    placeholder="Q Costo"
                    className="input-field"
                    value={buyPurchasePrice}
                    onChange={(e) => setBuyPurchasePrice(e.target.value)}
                    min="0"
                    step="any"
                    required
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>P. Venta Unitario (Q) *</label>
                  <input
                    type="number"
                    placeholder="Q Venta"
                    className="input-field"
                    value={buySalePrice}
                    onChange={(e) => setBuySalePrice(e.target.value)}
                    min="0"
                    step="any"
                    required
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Forma de Pago *</label>
                <select
                  className="select-field"
                  value={buyPaymentMethod}
                  onChange={(e) => setBuyPaymentMethod(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "rgba(20, 24, 33, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    color: "#fff"
                  }}
                  required
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="credito">Crédito (Cuentas por Pagar)</option>
                </select>
              </div>

              {buyPaymentMethod === "credito" && (
                <div style={styles.inputGroup} className="animate-fade-in">
                  <label style={styles.label}>Proveedor del Repuesto *</label>
                  <input
                    placeholder="Nombre del proveedor o distribuidora"
                    className="input-field"
                    value={buyProvider}
                    onChange={(e) => setBuyProvider(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedPartToBuy(null)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar Ingreso
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
    verticalAlign: "middle",
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
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 11, 15, 0.8)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    width: "100%",
    maxWidth: "850px",
    maxHeight: "90vh",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
  },
  modalHeader: {
    padding: "24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    backgroundColor: "rgba(255, 255, 255, 0.01)"
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "1.8rem",
    cursor: "pointer",
    lineHeight: "1",
    padding: "0 4px",
    transition: "color 0.2s ease",
  },
  vehicleInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    padding: "16px",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.04)"
  },
  infoField: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    textAlign: "left"
  },
  infoFieldLabel: {
    fontSize: "0.72rem",
    fontWeight: "700",
    color: "var(--text-muted)",
    textTransform: "uppercase"
  },
  infoFieldValue: {
    fontSize: "0.88rem",
    fontWeight: "600",
    color: "#fff"
  },
  modalBody: {
    padding: "24px",
    overflowY: "auto",
    flex: 1
  },
  modalFooter: {
    padding: "20px 24px",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    justifyContent: "flex-end",
    backgroundColor: "rgba(255, 255, 255, 0.01)"
  }
};
