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
import { getExternalJobs } from "../utils/workshopCalc";

export default function Cuentas({
  cuentasPorCobrar = [],
  setCuentasPorCobrar,
  cuentasPorPagar = [],
  setCuentasPorPagar,
  usuarioActual,
  clientes = [],
  setClientes,
  softDelete,
  ordenes = [],
  setOrdenes,
  setCompras
}) {
  const [activeSubTab, setActiveSubTab] = useState("cobrar"); // 'cobrar', 'pagar' or 'externos'
  const isAdmin = String(usuarioActual?.rol || usuarioActual?.role || "").toLowerCase().includes("admin");

  // 🗑️ Eliminación (solo admin) con tratamiento contable
  const [deleteTarget, setDeleteTarget] = useState(null); // { tipo: 'cobrar'|'pagar', cuenta }
  const [deleteTratamiento, setDeleteTratamiento] = useState("sin_efecto");

  // 🛠️ Pagos / anticipos a proveedores de trabajos externos
  const [extPayTarget, setExtPayTarget] = useState(null); // job from getExternalJobs
  const [extPayMonto, setExtPayMonto] = useState("");
  const [extPayMetodo, setExtPayMetodo] = useState("efectivo");
  const [extPayTipo, setExtPayTipo] = useState("anticipo");
  const [extPayNota, setExtPayNota] = useState("");
  const [extSoloSaldo, setExtSoloSaldo] = useState(true);
  const [extSearch, setExtSearch] = useState("");
  const [extHistoryJob, setExtHistoryJob] = useState(null);
  
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

  // --- ELIMINAR CUENTA (solo administrador) ---
  const openDeleteModal = (tipo, cuenta) => {
    if (!isAdmin) {
      alert("Solo un administrador puede eliminar cuentas.");
      return;
    }
    setDeleteTarget({ tipo, cuenta });
    setDeleteTratamiento("sin_efecto");
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget || !isAdmin) return;
    const { tipo, cuenta } = deleteTarget;
    const saldo = parseFloat(cuenta.saldo) || 0;
    const nombre = tipo === "cobrar" ? cuenta.cliente : cuenta.proveedor;

    // Registrar efecto contable (si aplica) como movimiento en Compras/Gastos
    if (saldo > 0 && deleteTratamiento !== "sin_efecto" && typeof setCompras === "function") {
      const hoy = new Date();
      const fechaLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
      const esPerdida = deleteTratamiento === "perdida";
      const ajuste = {
        id: Date.now(),
        fecha: fechaLocal,
        fotos: [],
        total: esPerdida ? saldo : -saldo,
        modulo: "general",
        concepto: esPerdida
          ? `Cuenta incobrable eliminada: ${nombre} — ${cuenta.concepto || ""}`
          : `Deuda condonada / ganancia: ${nombre} — ${cuenta.concepto || ""}`,
        formaPago: "ajuste",
        proveedor: nombre || "",
        tipoGasto: "gasto",
        categoria: esPerdida ? "Cuentas incobrables" : "Ganancia por condonación de deuda",
        ajusteContable: true,
        registradoPor: usuarioActual?.user || "admin",
        cargarInventario: false,
        detallesInventario: null
      };
      setCompras(prev => [ajuste, ...(Array.isArray(prev) ? prev : [])]);
    }

    const modulo = tipo === "cobrar" ? "cuentasPorCobrar" : "cuentasPorPagar";
    if (typeof softDelete === "function") {
      softDelete(modulo, { ...cuenta, tratamientoEliminacion: deleteTratamiento }, usuarioActual?.user);
    }
    if (tipo === "cobrar") {
      setCuentasPorCobrar(prev => (Array.isArray(prev) ? prev : []).filter(c => String(c.id) !== String(cuenta.id)));
    } else {
      setCuentasPorPagar(prev => (Array.isArray(prev) ? prev : []).filter(c => String(c.id) !== String(cuenta.id)));
    }
    setDeleteTarget(null);
  };

  // --- TRABAJOS EXTERNOS: proveedores ---
  const externalJobs = getExternalJobs(ordenes).filter(j =>
    j.costo > 0 || j.pagado > 0 || String(j.service?.proveedor || "").trim()
  );
  const extQuery = extSearch.toLowerCase().trim();
  const visibleExternalJobs = externalJobs.filter(j => {
    if (extSoloSaldo && !(j.saldo > 0.009 || (j.costo === 0 && j.pagado === 0))) return false;
    if (!extQuery) return true;
    return [j.proveedor, j.service?.desc, j.order?.placa, j.order?.cliente].some(v => String(v || "").toLowerCase().includes(extQuery));
  });
  const extGroups = visibleExternalJobs.reduce((acc, j) => {
    (acc[j.proveedor] = acc[j.proveedor] || []).push(j);
    return acc;
  }, {});
  const extTotalCosto = externalJobs.reduce((s, j) => s + j.costo, 0);
  const extTotalPagado = externalJobs.reduce((s, j) => s + j.pagado, 0);
  const extTotalSaldo = externalJobs.reduce((s, j) => s + Math.max(0, j.saldo), 0);

  const openExtPay = (job) => {
    setExtPayTarget(job);
    setExtPayMonto("");
    setExtPayMetodo("efectivo");
    setExtPayTipo(job.costo > 0 && job.pagado === 0 ? "anticipo" : (job.saldo > 0 ? "pago" : "anticipo"));
    setExtPayNota("");
  };

  const handleExtPaySubmit = (e) => {
    e.preventDefault();
    if (!extPayTarget || typeof setOrdenes !== "function") return;
    const monto = parseFloat(extPayMonto);
    if (isNaN(monto) || monto <= 0) {
      alert("Ingresa un monto válido mayor a 0.");
      return;
    }
    if (extPayTarget.costo > 0 && monto > extPayTarget.saldo + 0.009) {
      if (!window.confirm(`El monto (${formatMoney(monto)}) supera el saldo pendiente con el proveedor (${formatMoney(Math.max(0, extPayTarget.saldo))}). ¿Registrarlo de todas formas?`)) return;
    }
    const pago = {
      id: `pext_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tipo: extPayTipo,
      monto,
      metodo: extPayMetodo,
      nota: extPayNota.trim(),
      fecha: new Date().toISOString(),
      registradoPor: usuarioActual?.user || ""
    };
    const orderId = extPayTarget.order.id;
    const idx = extPayTarget.idx;
    setOrdenes(prev => (Array.isArray(prev) ? prev : []).map(o => {
      if (String(o.id) !== String(orderId) || !o.presupuesto) return o;
      const services = [...(o.presupuesto.services || [])];
      if (!services[idx]) return o;
      services[idx] = { ...services[idx], pagos: [...(Array.isArray(services[idx].pagos) ? services[idx].pagos : []), pago] };
      return { ...o, presupuesto: { ...o.presupuesto, services }, updatedAt: new Date().toISOString() };
    }));
    setExtPayTarget(null);
    alert(`${extPayTipo === "anticipo" ? "Anticipo" : "Pago"} a ${extPayTarget.proveedor} registrado.`);
  };

  const removeExtPayment = (job, pagoId) => {
    if (!isAdmin) return;
    if (!window.confirm("¿Eliminar este pago/anticipo al proveedor?")) return;
    setOrdenes(prev => (Array.isArray(prev) ? prev : []).map(o => {
      if (String(o.id) !== String(job.order.id) || !o.presupuesto) return o;
      const services = [...(o.presupuesto.services || [])];
      if (!services[job.idx]) return o;
      services[job.idx] = { ...services[job.idx], pagos: (services[job.idx].pagos || []).filter(p => p.id !== pagoId) };
      return { ...o, presupuesto: { ...o.presupuesto, services }, updatedAt: new Date().toISOString() };
    }));
    setExtHistoryJob(null);
  };

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
        <button 
          onClick={() => { setActiveSubTab("externos"); setSelectedCuenta(null); }}
          style={{ ...styles.subTabBtn, ...(activeSubTab === "externos" ? styles.subTabActive : {}) }}
        >
          <Building size={16} color="#f59e0b" /> Proveedores Trabajos Externos
          {extTotalSaldo > 0 && <span className="notif-pin" style={{ marginLeft: "4px" }}>{Object.keys(externalJobs.filter(j => j.saldo > 0.009).reduce((a, j) => { a[j.proveedor] = 1; return a; }, {})).length}</span>}
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
                              {isAdmin && (
                                <button
                                  onClick={() => openDeleteModal("cobrar", c)}
                                  className="btn btn-ghost"
                                  title="Eliminar cuenta (solo administrador)"
                                  style={{ padding: "6px 10px", fontSize: "0.78rem", color: "#f87171", borderColor: "rgba(239,68,68,0.35)" }}
                                >
                                  🗑️
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
                              {isAdmin && (
                                <button
                                  onClick={() => openDeleteModal("pagar", p)}
                                  className="btn btn-ghost"
                                  title="Eliminar cuenta (solo administrador)"
                                  style={{ padding: "6px 10px", fontSize: "0.78rem", color: "#f87171", borderColor: "rgba(239,68,68,0.35)" }}
                                >
                                  🗑️
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

      {/* 🛠️ PROVEEDORES DE TRABAJOS EXTERNOS TAB */}
      {activeSubTab === "externos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={styles.metricsRow}>
            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "rgba(245,158,11,0.15)" }}>
                <Building size={20} color="#f59e0b" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Costo Trabajos Externos</span>
                <span style={{ ...styles.metricValue, fontFamily: "var(--font-display)" }}>{formatMoney(extTotalCosto)}</span>
              </div>
            </div>
            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-secondary-glow)" }}>
                <CheckCircle2 size={20} color="var(--color-secondary)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Pagado / Anticipado</span>
                <span style={{ ...styles.metricValue, color: "var(--color-secondary)", fontFamily: "var(--font-display)" }}>{formatMoney(extTotalPagado)}</span>
              </div>
            </div>
            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-danger-glow)" }}>
                <Coins size={20} color="var(--color-danger)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Saldo Pendiente a Proveedores</span>
                <span style={{ ...styles.metricValue, color: "var(--color-danger)", fontFamily: "var(--font-display)" }}>{formatMoney(extTotalSaldo)}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "20px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="input-field"
              placeholder="Buscar proveedor, trabajo, placa o cliente..."
              value={extSearch}
              onChange={(e) => setExtSearch(e.target.value)}
              style={{ flex: 1, minWidth: "220px" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--text-muted)", cursor: "pointer" }}>
              <input type="checkbox" checked={extSoloSaldo} onChange={(e) => setExtSoloSaldo(e.target.checked)} />
              Solo con saldo pendiente
            </label>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", width: "100%" }}>
              ℹ️ El costo del trabajo externo ya se refleja como costo de la orden en Finanzas; los anticipos y pagos aquí registrados controlan lo que se le debe a cada proveedor.
            </span>
          </div>

          {Object.keys(extGroups).length === 0 ? (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              No hay trabajos externos {extSoloSaldo ? "con saldo pendiente" : "registrados"}. Asigna el proveedor y costo en el presupuesto de la orden.
            </div>
          ) : (
            Object.entries(extGroups).sort((a, b) => a[0].localeCompare(b[0])).map(([prov, jobs]) => {
              const gCosto = jobs.reduce((s, j) => s + j.costo, 0);
              const gPagado = jobs.reduce((s, j) => s + j.pagado, 0);
              const gSaldo = jobs.reduce((s, j) => s + Math.max(0, j.saldo), 0);
              return (
                <div key={prov} className="glass-panel" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                      <Building size={18} color="#f59e0b" /> {prov}
                    </h3>
                    <div style={{ display: "flex", gap: "14px", fontSize: "0.85rem", flexWrap: "wrap" }}>
                      <span style={{ color: "var(--text-muted)" }}>Costo: <strong style={{ color: "#fff" }}>{formatMoney(gCosto)}</strong></span>
                      <span style={{ color: "var(--text-muted)" }}>Pagado: <strong style={{ color: "var(--color-secondary)" }}>{formatMoney(gPagado)}</strong></span>
                      <span style={{ color: "var(--text-muted)" }}>Saldo: <strong style={{ color: gSaldo > 0 ? "var(--color-danger)" : "var(--color-success)" }}>{formatMoney(gSaldo)}</strong></span>
                    </div>
                  </div>
                  <div style={styles.tableResponsive}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Orden</th>
                          <th style={styles.th}>Trabajo</th>
                          <th style={styles.th}>Costo</th>
                          <th style={styles.th}>Pagado</th>
                          <th style={styles.th}>Saldo</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((j) => (
                          <tr key={`${j.order.id}_${j.idx}`} style={styles.tr}>
                            <td style={styles.td}>
                              <div style={{ fontWeight: "700", color: "#fff" }}>{j.order.placa || "S/P"}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{j.order.cliente} · {formatDate(j.order.fecha)}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{j.order.estado}</div>
                            </td>
                            <td style={styles.td}>{j.service.desc}</td>
                            <td style={styles.td}>{j.costo > 0 ? formatMoney(j.costo) : <span style={{ color: "#f87171", fontSize: "0.78rem", fontWeight: 700 }}>Sin costo registrado</span>}</td>
                            <td style={{ ...styles.td, color: "var(--color-secondary)", fontWeight: 600 }}>{formatMoney(j.pagado)}</td>
                            <td style={{ ...styles.td, fontWeight: 700, color: j.saldo > 0 ? "var(--color-danger)" : (j.saldo < 0 ? "#fbbf24" : "var(--color-success)") }}>
                              {j.saldo < 0 ? `A favor ${formatMoney(Math.abs(j.saldo))}` : formatMoney(j.saldo)}
                            </td>
                            <td style={styles.td}>
                              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                <button onClick={() => openExtPay(j)} className="btn btn-primary" style={{ padding: "6px 12px", fontSize: "0.78rem" }}>
                                  Anticipo / Pago
                                </button>
                                {j.pagos.length > 0 && (
                                  <button onClick={() => setExtHistoryJob(j)} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "0.78rem" }}>
                                    Historial ({j.pagos.length})
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 💸 MODAL: Registrar anticipo/pago a proveedor externo */}
      {extPayTarget && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <Building size={22} color="#f59e0b" /> Pago a Proveedor Externo
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "3px" }}>
                {extPayTarget.proveedor} · {extPayTarget.service.desc} · Placa {extPayTarget.order.placa}
                <br />
                Costo: {formatMoney(extPayTarget.costo)} | Pagado: {formatMoney(extPayTarget.pagado)} | Saldo: {formatMoney(Math.max(0, extPayTarget.saldo))}
              </p>
            </div>
            <form onSubmit={handleExtPaySubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Tipo *</label>
                <select className="select-field" value={extPayTipo} onChange={(e) => setExtPayTipo(e.target.value)}>
                  <option value="anticipo">Anticipo</option>
                  <option value="pago">Pago / Abono</option>
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Monto (Q) *</label>
                <input type="number" required min="0.01" step="any" className="input-field" value={extPayMonto} onChange={(e) => setExtPayMonto(e.target.value)} placeholder="Q 0.00" />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Método de Pago *</label>
                <select className="select-field" value={extPayMetodo} onChange={(e) => setExtPayMetodo(e.target.value)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="cheque">Cheque</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nota (Opcional)</label>
                <input className="input-field" value={extPayNota} onChange={(e) => setExtPayNota(e.target.value)} placeholder="Ej. Recibo #123" />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setExtPayTarget(null)} className="btn btn-ghost">Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📜 MODAL: Historial de pagos a proveedor externo */}
      {extHistoryJob && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#fff" }}>Historial · {extHistoryJob.proveedor}</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "3px" }}>{extHistoryJob.service.desc} · Placa {extHistoryJob.order.placa}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
              {extHistoryJob.pagos.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)" }}>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700 }}>{p.tipo === "anticipo" ? "Anticipo" : "Pago"} · {formatMoney(p.monto)}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatDate(p.fecha)} · {String(p.metodo || "").toUpperCase()} {p.nota ? `· ${p.nota}` : ""} {p.registradoPor ? `· por ${p.registradoPor}` : ""}</div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => removeExtPayment(extHistoryJob, p.id)} className="btn btn-ghost" style={{ padding: "4px 8px", color: "#f87171" }} title="Eliminar">🗑️</button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
              <button onClick={() => setExtHistoryJob(null)} className="btn btn-ghost">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ MODAL: Eliminar cuenta con tratamiento contable (solo admin) */}
      {deleteTarget && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#fff" }}>🗑️ Eliminar Cuenta</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "3px" }}>
                {deleteTarget.tipo === "cobrar" ? `Cliente: ${deleteTarget.cuenta.cliente}` : `Proveedor: ${deleteTarget.cuenta.proveedor}`}
                {" · "}Total {formatMoney(deleteTarget.cuenta.total)} · Saldo {formatMoney(deleteTarget.cuenta.saldo)}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              <span style={{ fontSize: "0.88rem", color: "#fff", fontWeight: 700 }}>¿Cómo se debe tratar contablemente el saldo pendiente?</span>
              {[
                { val: "sin_efecto", label: "Sin efecto contable", desc: "Error de registro / cuenta duplicada. No afecta resultados." },
                deleteTarget.tipo === "cobrar"
                  ? { val: "perdida", label: "Registrar como pérdida", desc: `Cuenta incobrable: se registra un gasto de ${formatMoney(deleteTarget.cuenta.saldo)}.` }
                  : { val: "ganancia", label: "Registrar como ganancia", desc: `Deuda condonada: se registra un ingreso (gasto negativo) de ${formatMoney(deleteTarget.cuenta.saldo)}.` }
              ].map(opt => (
                <label key={opt.val} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 12px", borderRadius: "10px", cursor: "pointer", border: `1px solid ${deleteTratamiento === opt.val ? "var(--color-primary)" : "rgba(255,255,255,0.1)"}`, background: deleteTratamiento === opt.val ? "rgba(59,130,246,0.1)" : "transparent", opacity: (opt.val !== "sin_efecto" && !(parseFloat(deleteTarget.cuenta.saldo) > 0)) ? 0.5 : 1 }}>
                  <input
                    type="radio"
                    name="tratamiento"
                    disabled={opt.val !== "sin_efecto" && !(parseFloat(deleteTarget.cuenta.saldo) > 0)}
                    checked={deleteTratamiento === opt.val}
                    onChange={() => setDeleteTratamiento(opt.val)}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.88rem" }}>{opt.label}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>La cuenta se moverá a la Papelera (recuperable por 30 días).</span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
              <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-ghost">Cancelar</button>
              <button type="button" onClick={handleConfirmDelete} className="btn btn-danger">Confirmar eliminación</button>
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
