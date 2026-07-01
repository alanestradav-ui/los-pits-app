import React, { useState } from "react";
import { 
  FileText, 
  User, 
  Coins, 
  Plus, 
  CheckCircle2, 
  Clock, 
  ArrowDownRight, 
  ArrowUpRight,
  TrendingDown,
  Calendar,
  Building
} from "lucide-react";
import { formatMoney, formatDate } from "../utils/storage";

export default function Cuentas({
  cuentasPorCobrar = [],
  setCuentasPorCobrar,
  cuentasPorPagar = [],
  setCuentasPorPagar,
  usuarioActual,
  clientes = [],
  setClientes
}) {
  const [activeSubTab, setActiveSubTab] = useState("cobrar"); // 'cobrar' or 'pagar'
  
  // Modal for registering payments/abonos
  const [selectedCuenta, setSelectedCuenta] = useState(null); // account object
  const [abonoMonto, setAbonoMonto] = useState("");
  const [abonoMetodo, setAbonoMetodo] = useState("efectivo");

  // Form states for manual additions
  // Accounts Receivable (Clientes)
  const [cCliente, setCCliente] = useState("");
  const [cTelefono, setCTelefono] = useState("");
  const [cNit, setCNit] = useState("");
  const [cConcepto, setCConcepto] = useState("");
  const [cTotal, setCTotal] = useState("");

  // Accounts Payable (Proveedores)
  const [pProveedor, setPProveedor] = useState("");
  const [pConcepto, setPConcepto] = useState("");
  const [pTotal, setPTotal] = useState("");

  // --- MANUAL CREATION ACTIONS ---
  const handleAddCobrar = (e) => {
    e.preventDefault();
    const totalVal = parseFloat(cTotal);
    if (!cCliente.trim() || !cConcepto.trim() || isNaN(totalVal) || totalVal <= 0) {
      alert("Completa todos los campos con valores válidos.");
      return;
    }

    const nuevaCuenta = {
      id: Date.now(),
      cliente: cCliente.trim(),
      telefono: cTelefono.trim(),
      nit: cNit.trim() || "C/F",
      concepto: cConcepto.trim(),
      total: totalVal,
      saldo: totalVal,
      fecha: new Date().toISOString(),
      estado: "Pendiente",
      pagos: []
    };

    // Register or update client in global list
    const tel = cTelefono.trim();
    if (tel && setClientes) {
      setClientes(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const exists = safePrev.find(c => c.telefono === tel);
        if (exists) {
          return safePrev.map(c => c.telefono === tel ? {
            ...c,
            nombre: cCliente.trim(),
            nit: cNit.trim() || c.nit
          } : c);
        } else {
          return [...safePrev, {
            telefono: tel,
            nombre: cCliente.trim(),
            nit: cNit.trim() || "C/F",
            nombreFacturacion: cCliente.trim(),
            fechaRegistro: new Date().toISOString()
          }];
        }
      });
    }

    setCuentasPorCobrar([nuevaCuenta, ...cuentasPorCobrar]);
    setCCliente("");
    setCTelefono("");
    setCNit("");
    setCConcepto("");
    setCTotal("");
    alert("Cuenta por cobrar registrada con éxito.");
  };

  const handleAddPagar = (e) => {
    e.preventDefault();
    const totalVal = parseFloat(pTotal);
    if (!pProveedor.trim() || !pConcepto.trim() || isNaN(totalVal) || totalVal <= 0) {
      alert("Completa todos los campos con valores válidos.");
      return;
    }

    const nuevaCuenta = {
      id: Date.now(),
      proveedor: pProveedor.trim(),
      concepto: pConcepto.trim(),
      total: totalVal,
      saldo: totalVal,
      fecha: new Date().toISOString(),
      estado: "Pendiente",
      pagos: []
    };

    setCuentasPorPagar([nuevaCuenta, ...cuentasPorPagar]);
    setPProveedor("");
    setPConcepto("");
    setPTotal("");
    alert("Obligación por pagar registrada con éxito.");
  };

  // --- ABONO/PAYMENT PROCESSOR ---
  const handleAbonoSubmit = (e) => {
    e.preventDefault();
    if (!selectedCuenta) return;

    const montoVal = parseFloat(abonoMonto);
    if (isNaN(montoVal) || montoVal <= 0) {
      alert("Ingresa un monto válido mayor a 0.");
      return;
    }

    if (montoVal > selectedCuenta.saldo) {
      alert(`El abono (${formatMoney(montoVal)}) no puede ser mayor que el saldo pendiente (${formatMoney(selectedCuenta.saldo)}).`);
      return;
    }

    const updatedCuenta = { ...selectedCuenta };
    const nuevoPago = {
      id: Date.now(),
      monto: montoVal,
      metodo: abonoMetodo,
      fecha: new Date().toISOString()
    };

    updatedCuenta.pagos = [nuevoPago, ...updatedCuenta.pagos];
    updatedCuenta.saldo = Math.max(0, updatedCuenta.saldo - montoVal);
    
    if (updatedCuenta.saldo === 0) {
      updatedCuenta.estado = "Pagado";
    }

    if (activeSubTab === "cobrar") {
      setCuentasPorCobrar(cuentasPorCobrar.map(c => c.id === selectedCuenta.id ? updatedCuenta : c));
      alert("Abono del cliente registrado.");
    } else {
      setCuentasPorPagar(cuentasPorPagar.map(c => c.id === selectedCuenta.id ? updatedCuenta : c));
      alert("Pago al proveedor registrado.");
    }

    setAbonoMonto("");
    setSelectedCuenta(null);
  };

  // --- METRIC SUMMARY CALCULATORS ---
  const totalCobrarPendiente = cuentasPorCobrar
    .filter(c => c.estado === "Pendiente")
    .reduce((sum, c) => sum + c.saldo, 0);

  const totalCobrarCobrado = cuentasPorCobrar.reduce((sum, c) => {
    const pagosTotal = c.pagos ? c.pagos.reduce((pSum, p) => pSum + p.monto, 0) : 0;
    return sum + pagosTotal;
  }, 0);

  const activeCobrarCount = cuentasPorCobrar.filter(c => c.estado === "Pendiente").length;

  const totalPagarPendiente = cuentasPorPagar
    .filter(p => p.estado === "Pendiente")
    .reduce((sum, p) => sum + p.saldo, 0);

  const totalPagarAbonado = cuentasPorPagar.reduce((sum, p) => {
    const pagosTotal = p.pagos ? p.pagos.reduce((pSum, pg) => pSum + pg.monto, 0) : 0;
    return sum + pagosTotal;
  }, 0);

  const activePagarCount = cuentasPorPagar.filter(p => p.estado === "Pendiente").length;

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Cuentas por Cobrar & Pagar</h1>
          <p>Administra créditos otorgados a clientes y deudas con proveedores de refacciones.</p>
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div style={styles.subTabs}>
        <button 
          onClick={() => { setActiveSubTab("cobrar"); setSelectedCuenta(null); }}
          style={{ ...styles.subTabBtn, ...(activeSubTab === "cobrar" ? styles.subTabActive : {}) }}
        >
          <ArrowDownRight size={16} color="var(--color-success)" /> Cuentas por Cobrar (Clientes)
        </button>
        <button 
          onClick={() => { setActiveSubTab("pagar"); setSelectedCuenta(null); }}
          style={{ ...styles.subTabBtn, ...(activeSubTab === "pagar" ? styles.subTabActive : {}) }}
        >
          <ArrowUpRight size={16} color="var(--color-danger)" /> Cuentas por Pagar (Proveedores)
        </button>
      </div>

      {/* COBRAR TAB */}
      {activeSubTab === "cobrar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          {/* Metrics summary */}
          <div style={styles.metricsRow}>
            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-success-glow)" }}>
                <Coins size={20} color="var(--color-success)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Saldo Pendiente Clientes</span>
                <span style={{ ...styles.metricValue, color: "var(--color-success)", fontFamily: "var(--font-display)" }}>
                  {formatMoney(totalCobrarPendiente)}
                </span>
              </div>
            </div>

            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-primary-glow)" }}>
                <Clock size={20} color="var(--color-primary)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Créditos Activos</span>
                <span style={{ ...styles.metricValue, fontFamily: "var(--font-display)" }}>
                  {activeCobrarCount} Cuentas
                </span>
              </div>
            </div>

            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-secondary-glow)" }}>
                <CheckCircle2 size={20} color="var(--color-secondary)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Total Abonado / Cobrado</span>
                <span style={{ ...styles.metricValue, color: "var(--color-secondary)", fontFamily: "var(--font-display)" }}>
                  {formatMoney(totalCobrarCobrado)}
                </span>
              </div>
            </div>
          </div>

          <div className="responsive-parking-grid">
            {/* Left form: manual entry */}
            <div className="glass-panel" style={styles.formCard}>
              <div style={styles.formHeader}>
                <FileText size={18} color="var(--color-primary)" />
                <span style={styles.formTitle}>Registrar Crédito Manual</span>
              </div>
              
              <form onSubmit={handleAddCobrar} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nombre del Cliente *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Cliente o Empresa"
                    value={cCliente}
                    onChange={(e) => setCCliente(e.target.value)}
                    onBlur={(e) => {
                      const nameVal = e.target.value.trim();
                      if (nameVal && !cTelefono) {
                        const match = (clientes || []).find(c => c.nombre?.toLowerCase().trim() === nameVal.toLowerCase());
                        if (match) {
                          const isSame = window.confirm(`Ya existe un cliente registrado con el nombre "${match.nombre}" (Tel: ${match.telefono}).\n\n¿Es la misma persona? (Si confirmas, se llenarán todos sus datos automáticamente)`);
                          if (isSame) {
                            setCCliente(match.nombre || "");
                            setCTelefono(match.telefono || "");
                            if (match.nit) setCNit(match.nit);
                          }
                        }
                      }
                    }}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Teléfono (Opcional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej. 5566-7788"
                    value={cTelefono}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCTelefono(val);
                      const exactMatch = (clientes || []).find(c => c.telefono === val.trim());
                      if (exactMatch) {
                        setCCliente(exactMatch.nombre || "");
                        if (exactMatch.nit) setCNit(exactMatch.nit);
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      const exactMatch = (clientes || []).find(c => c.telefono === val);
                      if (exactMatch) {
                        setCCliente(exactMatch.nombre || "");
                        if (exactMatch.nit) setCNit(exactMatch.nit);
                      }
                    }}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>NIT (Opcional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="NIT de facturación"
                    value={cNit}
                    onChange={(e) => setCNit(e.target.value)}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Concepto del Crédito *</label>
                  <textarea
                    required
                    className="input-field"
                    style={{ minHeight: "80px", resize: "none" }}
                    placeholder="Ej. Factura por repuestos de motor..."
                    value={cConcepto}
                    onChange={(e) => setCConcepto(e.target.value)}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Monto Total del Crédito (Q) *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    className="input-field"
                    placeholder="Q 0.00"
                    value={cTotal}
                    onChange={(e) => setCTotal(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: "10px" }}>
                  <Plus size={16} /> Crear Cuenta por Cobrar
                </button>
              </form>
            </div>

            {/* Right: Table of accounts */}
            <div className="glass-panel" style={{ padding: "24px", alignSelf: "stretch" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "16px" }}>Cartera de Clientes</h3>
              
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Fecha / NIT</th>
                      <th style={styles.th}>Cliente / Concepto</th>
                      <th style={styles.th}>Total</th>
                      <th style={styles.th}>Saldo Pendiente</th>
                      <th style={styles.th}>Estado</th>
                      <th style={{ ...styles.th, textAlign: "right" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuentasPorCobrar.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ ...styles.td, textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                          No hay cuentas por cobrar registradas.
                        </td>
                      </tr>
                    ) : (
                      cuentasPorCobrar.map((c) => (
                        <tr key={c.id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={{ fontWeight: "600", color: "#fff" }}>{formatDate(c.fecha)}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>NIT: {c.nit}</div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: "700", color: "#fff" }}>
                              {c.cliente}
                              {c.telefono && <span style={{ color: "var(--text-muted)", fontWeight: "500", fontSize: "0.8rem", marginLeft: "8px" }}>📞 {c.telefono}</span>}
                            </div>
                            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: "220px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={c.concepto}>
                              {c.concepto}
                            </div>
                          </td>
                          <td style={styles.td}>{formatMoney(c.total)}</td>
                          <td style={{ ...styles.td, fontWeight: "700", color: c.saldo > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
                            {formatMoney(c.saldo)}
                          </td>
                          <td style={styles.td}>
                            <span className={`badge ${c.estado === "Pagado" ? "badge-ready" : "badge-process"}`}>
                              {c.estado}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                              {c.saldo > 0 && (
                                <button
                                  onClick={() => setSelectedCuenta(c)}
                                  className="btn btn-primary"
                                  style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                                >
                                  Abonar
                                </button>
                              )}
                              {c.pagos && c.pagos.length > 0 && (
                                <button
                                  onClick={() => {
                                    alert(`Historial de Abonos:\n` + c.pagos.map(p => `- ${formatDate(p.fecha)}: ${formatMoney(p.monto)} por ${p.metodo.toUpperCase()}`).join("\n"));
                                  }}
                                  className="btn btn-ghost"
                                  style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                                >
                                  Historial ({c.pagos.length})
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAGAR TAB */}
      {activeSubTab === "pagar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          {/* Metrics summary */}
          <div style={styles.metricsRow}>
            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-danger-glow)" }}>
                <Coins size={20} color="var(--color-danger)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Saldo Pendiente Proveedores</span>
                <span style={{ ...styles.metricValue, color: "var(--color-danger)", fontFamily: "var(--font-display)" }}>
                  {formatMoney(totalPagarPendiente)}
                </span>
              </div>
            </div>

            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-primary-glow)" }}>
                <Building size={20} color="var(--color-primary)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Deudas Activas</span>
                <span style={{ ...styles.metricValue, fontFamily: "var(--font-display)" }}>
                  {activePagarCount} Obligaciones
                </span>
              </div>
            </div>

            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-secondary-glow)" }}>
                <CheckCircle2 size={20} color="var(--color-secondary)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Total Pagado a Proveedores</span>
                <span style={{ ...styles.metricValue, color: "var(--color-secondary)", fontFamily: "var(--font-display)" }}>
                  {formatMoney(totalPagarAbonado)}
                </span>
              </div>
            </div>
          </div>

          <div className="responsive-parking-grid">
            {/* Left form: manual entry */}
            <div className="glass-panel" style={styles.formCard}>
              <div style={styles.formHeader}>
                <Building size={18} color="var(--color-danger)" />
                <span style={styles.formTitle}>Registrar Factura Proveedor</span>
              </div>
              
              <form onSubmit={handleAddPagar} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nombre del Proveedor *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Distribuidora, Refaccionaria, etc."
                    value={pProveedor}
                    onChange={(e) => setPProveedor(e.target.value)}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Concepto del Gasto *</label>
                  <textarea
                    required
                    className="input-field"
                    style={{ minHeight: "80px", resize: "none" }}
                    placeholder="Ej. Compra de pastillas de freno en lote..."
                    value={pConcepto}
                    onChange={(e) => setPConcepto(e.target.value)}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Monto Total de la Factura (Q) *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    className="input-field"
                    placeholder="Q 0.00"
                    value={pTotal}
                    onChange={(e) => setPTotal(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-danger" style={{ marginTop: "10px" }}>
                  <Plus size={16} /> Crear Obligación por Pagar
                </button>
              </form>
            </div>

            {/* Right: Table of accounts */}
            <div className="glass-panel" style={{ padding: "24px", alignSelf: "stretch" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "16px" }}>Cuentas por Pagar</h3>
              
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Proveedor / Concepto</th>
                      <th style={styles.th}>Total</th>
                      <th style={styles.th}>Saldo Pendiente</th>
                      <th style={styles.th}>Estado</th>
                      <th style={{ ...styles.th, textAlign: "right" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuentasPorPagar.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ ...styles.td, textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                          No hay obligaciones por pagar registradas.
                        </td>
                      </tr>
                    ) : (
                      cuentasPorPagar.map((p) => (
                        <tr key={p.id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={{ fontWeight: "600", color: "#fff" }}>{formatDate(p.fecha)}</div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: "700", color: "#fff" }}>{p.proveedor}</div>
                            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: "220px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={p.concepto}>
                              {p.concepto}
                            </div>
                          </td>
                          <td style={styles.td}>{formatMoney(p.total)}</td>
                          <td style={{ ...styles.td, fontWeight: "700", color: p.saldo > 0 ? "var(--color-danger)" : "var(--color-success)" }}>
                            {formatMoney(p.saldo)}
                          </td>
                          <td style={styles.td}>
                            <span className={`badge ${p.estado === "Pagado" ? "badge-ready" : "badge-process"}`}>
                              {p.estado}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                              {p.saldo > 0 && (
                                <button
                                  onClick={() => setSelectedCuenta(p)}
                                  className="btn btn-danger"
                                  style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                                >
                                  Pagar / Abonar
                                </button>
                              )}
                              {p.pagos && p.pagos.length > 0 && (
                                <button
                                  onClick={() => {
                                    alert(`Historial de Pagos:\n` + p.pagos.map(pg => `- ${formatDate(pg.fecha)}: ${formatMoney(pg.monto)} por ${pg.metodo.toUpperCase()}`).join("\n"));
                                  }}
                                  className="btn btn-ghost"
                                  style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                                >
                                  Historial ({p.pagos.length})
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔐 ABONO/PAGO REGISTER OVERLAY MODAL */}
      {selectedCuenta && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <Coins size={22} color="var(--color-primary)" /> Registrar Abono / Pago
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "3px" }}>
                {activeSubTab === "cobrar" 
                  ? `Cliente: ${selectedCuenta.cliente} | Saldo Pendiente: ${formatMoney(selectedCuenta.saldo)}` 
                  : `Proveedor: ${selectedCuenta.proveedor} | Saldo Pendiente: ${formatMoney(selectedCuenta.saldo)}`
                }
              </p>
            </div>

            <form onSubmit={handleAbonoSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Monto a Abonar (Q) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  max={selectedCuenta.saldo}
                  step="any"
                  className="input-field"
                  placeholder={`Máx. ${selectedCuenta.saldo}`}
                  value={abonoMonto}
                  onChange={(e) => setAbonoMonto(e.target.value)}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Método de Pago *</label>
                <select 
                  className="select-field" 
                  value={abonoMetodo} 
                  onChange={(e) => setAbonoMetodo(e.target.value)}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="cheque">Cheque</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedCuenta(null)}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirmar Transacción
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
    alignSelf: "start",
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
    textAlign: "left",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: "600",
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
  }
};
