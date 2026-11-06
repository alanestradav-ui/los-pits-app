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
  const [cFecha, setCFecha] = useState("");

  // Accounts Payable (Proveedores)
  const [pProveedor, setPProveedor] = useState("");
  const [pConcepto, setPConcepto] = useState("");
  const [pTotal, setPTotal] = useState("");
  const [pFecha, setPFecha] = useState("");

  // 👥 Cuentas agrupadas por cliente / proveedor
  const [gruposAbiertos, setGruposAbiertos] = useState({});
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [busquedaCuentas, setBusquedaCuentas] = useState("");

  // 📅 Fechas programadas de cobro / pago
  const hoyLocalStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const diasHasta = (f) => {
    if (!f) return null;
    const [y, m, d] = String(f).slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return null;
    const objetivo = new Date(y, m - 1, d);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return Math.round((objetivo.getTime() - hoy.getTime()) / 86400000);
  };
  const fechaCorta = (f) => {
    if (!f) return "";
    const [y, m, d] = String(f).slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  };
  const infoVencimiento = (c) => {
    if (!c || (parseFloat(c.saldo) || 0) <= 0.009) return null;
    const d = diasHasta(c.fechaVencimiento);
    if (d === null) return null;
    if (d < 0) return { nivel: 3, texto: `Vencida hace ${-d} día(s) (${fechaCorta(c.fechaVencimiento)})`, color: "#ef4444" };
    if (d === 0) return { nivel: 2, texto: `Vence HOY (${fechaCorta(c.fechaVencimiento)})`, color: "#f59e0b" };
    if (d <= 3) return { nivel: 1, texto: `Vence en ${d} día(s) (${fechaCorta(c.fechaVencimiento)})`, color: "#eab308" };
    return { nivel: 0, texto: `Programada: ${fechaCorta(c.fechaVencimiento)}`, color: "#60a5fa" };
  };

  const normTxt = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  const sumaPagos = (c) => (Array.isArray(c.pagos) ? c.pagos : []).reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);

  // Agrupa las cuentas del mismo cliente (por nombre o teléfono) o del mismo proveedor (por nombre)
  const agruparCuentas = (lista, tipo) => {
    const grupos = [];
    const porNombre = {};
    const porTel = {};
    (Array.isArray(lista) ? lista : []).forEach(c => {
      if (!c) return;
      const nombre = tipo === "cobrar" ? c.cliente : c.proveedor;
      const n = normTxt(nombre) || "sin nombre";
      const tel = tipo === "cobrar" ? String(c.telefono || "").replace(/\D/g, "") : "";
      let g = (tel.length >= 8 && porTel[tel]) || porNombre[n];
      if (!g) {
        g = { clave: `${tipo}_${n}_${grupos.length}`, tipo, nombre: (nombre || "Sin nombre").trim(), telefono: c.telefono || "", nit: c.nit || "", cuentas: [] };
        grupos.push(g);
      }
      g.cuentas.push(c);
      if (!porNombre[n]) porNombre[n] = g;
      if (tel.length >= 8 && !porTel[tel]) porTel[tel] = g;
      if (!g.telefono && c.telefono) g.telefono = c.telefono;
      if ((!g.nit || g.nit === "C/F") && c.nit) g.nit = c.nit;
    });
    grupos.forEach(g => {
      g.cuentas.sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));
      g.total = g.cuentas.reduce((s, c) => s + (parseFloat(c.total) || 0), 0);
      g.saldo = Math.round(g.cuentas.reduce((s, c) => s + Math.max(0, parseFloat(c.saldo) || 0), 0) * 100) / 100;
      g.abonado = g.cuentas.reduce((s, c) => s + sumaPagos(c), 0);
      g.pendientes = g.cuentas.filter(c => (parseFloat(c.saldo) || 0) > 0.009);
      const alertas = g.pendientes.map(infoVencimiento).filter(Boolean).sort((a, b) => b.nivel - a.nivel);
      g.alerta = alertas[0] || null;
      const fechas = g.pendientes.map(c => c.fechaVencimiento).filter(Boolean).sort();
      g.proximaFecha = fechas[0] || "";
    });
    return grupos.sort((a, b) => {
      if ((b.saldo > 0) !== (a.saldo > 0)) return b.saldo > 0 ? 1 : -1;
      const na = a.alerta ? a.alerta.nivel : -1;
      const nb = b.alerta ? b.alerta.nivel : -1;
      if (nb !== na) return nb - na;
      return b.saldo - a.saldo;
    });
  };

  const setterDe = (tipo) => (tipo === "cobrar" ? setCuentasPorCobrar : setCuentasPorPagar);

  const actualizarFechaCuenta = (tipo, cuentaId, fecha) => {
    setterDe(tipo)(prev => (Array.isArray(prev) ? prev : []).map(c => String(c.id) === String(cuentaId)
      ? { ...c, fechaVencimiento: fecha || "", avisoVencimientoVisto: false, updatedAt: new Date().toISOString() }
      : c));
  };

  const actualizarFechaGrupo = (grupo, fecha) => {
    const ids = new Set(grupo.pendientes.map(c => String(c.id)));
    if (ids.size === 0) return;
    setterDe(grupo.tipo)(prev => (Array.isArray(prev) ? prev : []).map(c => ids.has(String(c.id))
      ? { ...c, fechaVencimiento: fecha || "", avisoVencimientoVisto: false, updatedAt: new Date().toISOString() }
      : c));
  };

  const verHistorialPagos = (c) => {
    const pagos = Array.isArray(c.pagos) ? c.pagos : [];
    if (pagos.length === 0) { alert("Esta cuenta no tiene abonos registrados."); return; }
    alert(`Historial de abonos — ${c.concepto || ""}\n\n` + pagos.map(p => `- ${formatDate(p.fecha)}: ${formatMoney(p.monto)} por ${String(p.metodo || "").toUpperCase()}${p.abonoGeneral ? " (abono general)" : ""}`).join("\n"));
  };

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
      fechaVencimiento: cFecha || "",
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
    setCFecha("");
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
      fechaVencimiento: pFecha || "",
      estado: "Pendiente",
      pagos: []
    };

    setCuentasPorPagar([nuevaCuenta, ...cuentasPorPagar]);
    setPProveedor("");
    setPConcepto("");
    setPTotal("");
    setPFecha("");
    alert("Obligación por pagar registrada con éxito.");
  };

  // --- ABONO/PAYMENT PROCESSOR ---
  // selectedCuenta puede ser una cuenta individual o un grupo (cliente/proveedor con varias cuentas).
  // En un grupo, el abono se reparte automáticamente empezando por la cuenta más antigua / que vence primero.
  const handleAbonoSubmit = (e) => {
    e.preventDefault();
    if (!selectedCuenta) return;

    const montoVal = Math.round((parseFloat(abonoMonto) || 0) * 100) / 100;
    if (isNaN(montoVal) || montoVal <= 0) {
      alert("Ingresa un monto válido mayor a 0.");
      return;
    }

    const saldoDisponible = Math.round((parseFloat(selectedCuenta.saldo) || 0) * 100) / 100;
    if (montoVal > saldoDisponible + 0.009) {
      alert(`El abono (${formatMoney(montoVal)}) no puede ser mayor que el saldo pendiente (${formatMoney(saldoDisponible)}).`);
      return;
    }

    const tipo = selectedCuenta.tipoCuenta || activeSubTab;
    const ahora = new Date().toISOString();
    const objetivos = selectedCuenta.esGrupo
      ? [...selectedCuenta.cuentas]
          .filter(c => (parseFloat(c.saldo) || 0) > 0.009)
          .sort((a, b) => {
            const fa = a.fechaVencimiento || "9999-12-31";
            const fb = b.fechaVencimiento || "9999-12-31";
            if (fa !== fb) return fa.localeCompare(fb);
            return new Date(a.fecha || 0) - new Date(b.fecha || 0);
          })
      : [selectedCuenta];

    let restante = montoVal;
    const aplicaciones = {};
    objetivos.forEach((c, idx) => {
      if (restante <= 0.009) return;
      const saldoC = Math.round((parseFloat(c.saldo) || 0) * 100) / 100;
      const aplicar = Math.min(saldoC, restante);
      if (aplicar <= 0) return;
      aplicaciones[String(c.id)] = aplicar;
      restante = Math.round((restante - aplicar) * 100) / 100;
    });

    setterDe(tipo)(prev => (Array.isArray(prev) ? prev : []).map(c => {
      const aplicar = aplicaciones[String(c.id)];
      if (!aplicar) return c;
      const nuevoPago = {
        id: `${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        monto: aplicar,
        metodo: abonoMetodo,
        fecha: ahora,
        abonoGeneral: !!selectedCuenta.esGrupo,
        registradoPor: usuarioActual?.user || ""
      };
      const saldoNuevo = Math.max(0, Math.round(((parseFloat(c.saldo) || 0) - aplicar) * 100) / 100);
      return {
        ...c,
        pagos: [nuevoPago, ...(Array.isArray(c.pagos) ? c.pagos : [])],
        saldo: saldoNuevo,
        estado: saldoNuevo <= 0.009 ? "Pagado" : c.estado,
        updatedAt: ahora
      };
    }));

    const nCuentas = Object.keys(aplicaciones).length;
    alert(tipo === "cobrar"
      ? `Abono del cliente registrado${nCuentas > 1 ? ` (aplicado a ${nCuentas} cuentas)` : ""}.`
      : `Pago al proveedor registrado${nCuentas > 1 ? ` (aplicado a ${nCuentas} cuentas)` : ""}.`);

    setAbonoMonto("");
    setSelectedCuenta(null);
  };

  // --- METRIC SUMMARY CALCULATORS ---
  const gruposCobrar = agruparCuentas(cuentasPorCobrar, "cobrar");
  const gruposPagar = agruparCuentas(cuentasPorPagar, "pagar");
  const alertasVencimiento = [
    ...(cuentasPorCobrar || []).map(c => ({ c, tipo: "cobrar", info: infoVencimiento(c) })),
    ...(cuentasPorPagar || []).map(c => ({ c, tipo: "pagar", info: infoVencimiento(c) }))
  ].filter(a => a.info && a.info.nivel >= 1).sort((a, b) => b.info.nivel - a.info.nivel);
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

  // 👥 Lista unificada por cliente / proveedor con detalle desplegable
  const renderCartera = (tipo) => {
    const esCobrar = tipo === "cobrar";
    const grupos = esCobrar ? gruposCobrar : gruposPagar;
    const q = normTxt(busquedaCuentas);
    const visibles = grupos.filter(g => {
      if (soloPendientes && g.saldo <= 0.009) return false;
      if (!q) return true;
      return normTxt(g.nombre).includes(q) || String(g.telefono || "").includes(q) ||
        g.cuentas.some(c => normTxt(c.concepto).includes(q));
    });
    const colorSaldo = esCobrar ? "var(--color-warning)" : "var(--color-danger)";

    return (
      <div className="glass-panel" style={{ padding: "20px", alignSelf: "stretch", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>
            {esCobrar ? "Cartera de Clientes" : "Cuentas por Pagar"} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>(agrupadas por {esCobrar ? "cliente" : "proveedor"})</span>
          </h3>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
            Solo con saldo pendiente
          </label>
        </div>
        <input
          className="input-field"
          placeholder={esCobrar ? "Buscar cliente, teléfono o concepto..." : "Buscar proveedor o concepto..."}
          value={busquedaCuentas}
          onChange={(e) => setBusquedaCuentas(e.target.value)}
          style={{ marginBottom: "14px", width: "100%" }}
        />

        {visibles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)" }}>
            {esCobrar ? "No hay cuentas por cobrar" : "No hay obligaciones por pagar"}{soloPendientes ? " con saldo pendiente" : " registradas"}.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {visibles.map(g => {
              const abierto = !!gruposAbiertos[g.clave];
              return (
                <div key={g.clave} style={{ border: `1px solid ${g.alerta && g.alerta.nivel >= 2 ? g.alerta.color + "88" : "rgba(255,255,255,0.08)"}`, borderRadius: "12px", background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
                  {/* Encabezado del grupo */}
                  <div style={{ padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                      <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.98rem", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {esCobrar ? <User size={15} /> : <Building size={15} />} {g.nombre}
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>
                          {g.cuentas.length} cuenta{g.cuentas.length !== 1 ? "s" : ""}{g.pendientes.length ? ` · ${g.pendientes.length} pendiente${g.pendientes.length !== 1 ? "s" : ""}` : ""}
                        </span>
                      </div>
                      {(g.telefono || (esCobrar && g.nit)) && (
                        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          {g.telefono ? `📞 ${g.telefono}` : ""}{esCobrar && g.nit ? `  ·  NIT: ${g.nit}` : ""}
                        </div>
                      )}
                      {g.alerta && (
                        <div style={{ fontSize: "0.76rem", fontWeight: 800, color: g.alerta.color, marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={12} /> {g.alerta.texto}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "16px", fontSize: "0.82rem", flexWrap: "wrap" }}>
                      <div><div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Total</div><strong style={{ color: "#fff" }}>{formatMoney(g.total)}</strong></div>
                      <div><div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{esCobrar ? "Abonado" : "Pagado"}</div><strong style={{ color: "var(--color-secondary)" }}>{formatMoney(g.abonado)}</strong></div>
                      <div><div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Saldo</div><strong style={{ color: g.saldo > 0 ? colorSaldo : "var(--color-success)", fontSize: "0.95rem" }}>{formatMoney(g.saldo)}</strong></div>
                    </div>
                  </div>

                  {/* Acciones del grupo */}
                  <div style={{ padding: "0 14px 12px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    {g.saldo > 0.009 && (
                      <button
                        onClick={() => { setAbonoMonto(""); setSelectedCuenta({ esGrupo: true, tipoCuenta: tipo, nombre: g.nombre, cuentas: g.cuentas, saldo: g.saldo }); }}
                        className={`btn ${esCobrar ? "btn-primary" : "btn-danger"}`}
                        style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                      >
                        {esCobrar ? "Abonar al saldo total" : "Pagar / Abonar al saldo total"}
                      </button>
                    )}
                    <button
                      onClick={() => setGruposAbiertos(prev => ({ ...prev, [g.clave]: !prev[g.clave] }))}
                      className="btn btn-ghost"
                      style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                    >
                      {abierto ? "▲ Ocultar detalle" : `▼ Ver detalle (${g.cuentas.length})`}
                    </button>
                    {g.pendientes.length > 0 && (
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                        📅 Fecha de {esCobrar ? "cobro" : "pago"}:
                        <input
                          type="date"
                          className="input-field"
                          value={g.pendientes.every(c => (c.fechaVencimiento || "") === (g.pendientes[0].fechaVencimiento || "")) ? (g.pendientes[0].fechaVencimiento || "") : ""}
                          onChange={(e) => actualizarFechaGrupo(g, e.target.value)}
                          title="Aplica la fecha a todas las cuentas pendientes de este grupo"
                          style={{ padding: "4px 8px", fontSize: "0.78rem", height: "32px", width: "auto" }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Detalle de cuentas individuales */}
                  {abierto && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {g.cuentas.map(c => {
                        const info = infoVencimiento(c);
                        const saldoC = parseFloat(c.saldo) || 0;
                        return (
                          <div key={c.id} style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.03)" }}>
                            <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                              <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.84rem", wordBreak: "break-word" }}>{c.concepto || "Sin concepto"}</div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                Registrada: {formatDate(c.fecha)} · Total {formatMoney(c.total)} · <span style={{ color: saldoC > 0 ? colorSaldo : "var(--color-success)", fontWeight: 700 }}>Saldo {formatMoney(saldoC)}</span>
                              </div>
                              {info && <div style={{ fontSize: "0.72rem", color: info.color, fontWeight: 700 }}>{info.texto}</div>}
                            </div>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                              <span className={`badge ${c.estado === "Pagado" ? "badge-ready" : "badge-process"}`}>{c.estado}</span>
                              {saldoC > 0.009 && (
                                <input
                                  type="date"
                                  className="input-field"
                                  value={c.fechaVencimiento || ""}
                                  onChange={(e) => actualizarFechaCuenta(tipo, c.id, e.target.value)}
                                  title={`Fecha programada de ${esCobrar ? "cobro" : "pago"}`}
                                  style={{ padding: "4px 6px", fontSize: "0.75rem", height: "30px", width: "auto" }}
                                />
                              )}
                              {saldoC > 0.009 && (
                                <button onClick={() => { setAbonoMonto(""); setSelectedCuenta({ ...c, tipoCuenta: tipo }); }} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
                                  Abonar a esta
                                </button>
                              )}
                              {(c.pagos || []).length > 0 && (
                                <button onClick={() => verHistorialPagos(c)} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
                                  Historial ({c.pagos.length})
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => openDeleteModal(tipo, c)}
                                  className="btn btn-ghost"
                                  title="Eliminar cuenta (solo administrador)"
                                  style={{ padding: "4px 8px", fontSize: "0.75rem", color: "#f87171", borderColor: "rgba(239,68,68,0.35)" }}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
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

      {/* 🔔 Avisos de cobros / pagos programados que vencen hoy, están vencidos o vencen pronto */}
      {alertasVencimiento.length > 0 && (
        <div style={{ border: "1px solid rgba(245,158,11,0.45)", background: "rgba(245,158,11,0.1)", borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontWeight: 800, color: "#fbbf24", display: "flex", alignItems: "center", gap: "8px" }}>
            🔔 {alertasVencimiento.length} cobro{alertasVencimiento.length !== 1 ? "s" : ""}/pago{alertasVencimiento.length !== 1 ? "s" : ""} programado{alertasVencimiento.length !== 1 ? "s" : ""} requieren atención
          </div>
          {alertasVencimiento.slice(0, 8).map(({ c, tipo, info }) => (
            <div key={`${tipo}_${c.id}`} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px", fontSize: "0.82rem", alignItems: "center" }}>
              <span style={{ color: "#fff", minWidth: 0 }}>
                {tipo === "cobrar" ? "💰 Cobrar a" : "💸 Pagar a"} <strong>{tipo === "cobrar" ? c.cliente : c.proveedor}</strong> — {formatMoney(c.saldo)}
                <span style={{ color: "var(--text-muted)" }}> · {c.concepto}</span>
              </span>
              <span style={{ color: info.color, fontWeight: 800 }}>{info.texto}</span>
            </div>
          ))}
          {alertasVencimiento.length > 8 && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>…y {alertasVencimiento.length - 8} más.</span>}
        </div>
      )}

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

                <div style={styles.inputGroup}>
                  <label style={styles.label}>📅 Fecha programada de cobro (Opcional)</label>
                  <input
                    type="date"
                    className="input-field"
                    value={cFecha}
                    onChange={(e) => setCFecha(e.target.value)}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Recibirás un aviso cuando llegue esta fecha.</span>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: "10px" }}>
                  <Plus size={16} /> Crear Cuenta por Cobrar
                </button>
              </form>
            </div>

            {renderCartera("cobrar")}
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

                <div style={styles.inputGroup}>
                  <label style={styles.label}>📅 Fecha programada de pago (Opcional)</label>
                  <input
                    type="date"
                    className="input-field"
                    value={pFecha}
                    onChange={(e) => setPFecha(e.target.value)}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Recibirás un aviso cuando llegue esta fecha.</span>
                </div>

                <button type="submit" className="btn btn-danger" style={{ marginTop: "10px" }}>
                  <Plus size={16} /> Crear Obligación por Pagar
                </button>
              </form>
            </div>

            {renderCartera("pagar")}
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
                {selectedCuenta.esGrupo
                  ? `${(selectedCuenta.tipoCuenta || activeSubTab) === "cobrar" ? "Cliente" : "Proveedor"}: ${selectedCuenta.nombre} | Saldo total: ${formatMoney(selectedCuenta.saldo)} (${selectedCuenta.cuentas.filter(c => (parseFloat(c.saldo) || 0) > 0.009).length} cuentas). El abono se aplica primero a la cuenta que vence antes / más antigua.`
                  : (selectedCuenta.tipoCuenta || activeSubTab) === "cobrar"
                    ? `Cliente: ${selectedCuenta.cliente} | ${selectedCuenta.concepto || ""} | Saldo Pendiente: ${formatMoney(selectedCuenta.saldo)}`
                    : `Proveedor: ${selectedCuenta.proveedor} | ${selectedCuenta.concepto || ""} | Saldo Pendiente: ${formatMoney(selectedCuenta.saldo)}`
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
