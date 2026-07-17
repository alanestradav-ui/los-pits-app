import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Wrench, 
  User, 
  Car, 
  Coins, 
  Search, 
  Plus, 
  CheckCircle, 
  Trash2, 
  Clock, 
  UserCheck,
  DollarSign,
  X,
  CheckCircle2,
  AlertTriangle,
  Pencil
} from "lucide-react";
import { formatMoney, getLocalStorage, setLocalStorage } from "../utils/storage";
import { jsPDF } from "jspdf";

const TALLER_STATUSES = [
  "En recepción",
  "En proceso de diagnóstico y presupuesto",
  "En espera de autorización",
  "En proceso de reparación",
  "En período de prueba y control de calidad",
  "En proceso de lavado",
  "Listo para entrega",
  "Entregado"
];

const warningLightsDef = [
  { id: "engine", label: "Check Engine", color: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)", icon: "⚠️" },
  { id: "oil", label: "Presión Aceite", color: "#ef4444", glow: "rgba(239, 68, 68, 0.4)", icon: "🛢️" },
  { id: "battery", label: "Batería", color: "#ef4444", glow: "rgba(239, 68, 68, 0.4)", icon: "🔋" },
  { id: "brakes", label: "Frenos", color: "#ef4444", glow: "rgba(239, 68, 68, 0.4)", icon: "🛑" },
  { id: "temp", label: "Temperatura", color: "#ef4444", glow: "rgba(239, 68, 68, 0.4)", icon: "🌡️" },
  { id: "abs", label: "Sistema ABS", color: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)", icon: "⚠️ ABS" },
  { id: "airbag", label: "Bolsa Aire", color: "#ef4444", glow: "rgba(239, 68, 68, 0.4)", icon: "🎈" },
  { id: "tpms", label: "Presión Llantas", color: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)", icon: "⚙️🛞" },
  { id: "traction", label: "Ctrl Tracción", color: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)", icon: "🚗💨" },
  { id: "steering", label: "Dir Asistida", color: "#ef4444", glow: "rgba(239, 68, 68, 0.4)", icon: "☸️" },
  { id: "brakewear", label: "Desgaste Pastilla", color: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)", icon: "⭕" },
  { id: "coolant", label: "Refrigerante", color: "#3b82f6", glow: "rgba(59, 130, 246, 0.4)", icon: "💧" }
];

const defaultChecklistItems = [
  { id: "wipers", label: "Limpiaparabrisas" },
  { id: "horn", label: "Bocina / Claxon" },
  { id: "ac", label: "Aire Acondicionado" },
  { id: "headlights", label: "Luces Principales" },
  { id: "brakelights", label: "Luces de Freno" },
  { id: "turnsignals", label: "Luces Direccionales" },
  { id: "tires", label: "Llantas / Neumáticos" },
  { id: "brakefluid", label: "Líquido de Frenos" },
  { id: "engineoil", label: "Aceite de Motor" },
  { id: "battery", label: "Batería / Bornes" },
  { id: "mirrors", label: "Retrovisores / Vidrios" },
  { id: "suspension", label: "Suspensión" }
];

const getStatusStyle = (estado) => {
  switch (estado) {
    case "En recepción":
    case "En período de prueba y control de calidad":
      return {
        backgroundColor: "var(--color-primary-glow)",
        color: "var(--color-primary)",
        borderColor: "rgba(59, 130, 246, 0.3)"
      };
    case "En proceso de diagnóstico y presupuesto":
    case "En proceso de reparación":
      return {
        backgroundColor: "var(--color-warning-glow)",
        color: "var(--color-warning)",
        borderColor: "rgba(245, 158, 11, 0.3)"
      };
    case "En espera de autorización":
      return {
        backgroundColor: "var(--color-secondary-glow)",
        color: "var(--color-secondary)",
        borderColor: "rgba(168, 85, 247, 0.3)"
      };
    case "En proceso de lavado":
    case "Entregado":
      return {
        backgroundColor: "var(--color-info-glow)",
        color: "var(--color-info)",
        borderColor: "rgba(6, 182, 212, 0.3)"
      };
    case "Listo para entrega":
      return {
        backgroundColor: "var(--color-success-glow)",
        color: "var(--color-success)",
        borderColor: "rgba(16, 185, 129, 0.3)"
      };
    default:
      return {};
  }
};

const getButtonLabel = (estado) => {
  switch (estado) {
    case "En recepción":
      return "Iniciar Diagnóstico";
    case "En proceso de diagnóstico y presupuesto":
      return "Pedir Autorización";
    case "En espera de autorización":
      return "Iniciar Reparación";
    case "En proceso de reparación":
      return "Control de Calidad";
    case "En período de prueba y control de calidad":
      return "Pasar a Lavado";
    case "En proceso de lavado":
      return "Listo para Entrega";
    case "Listo para entrega":
      return "Facturar y Entregar";
    default:
      return "Siguiente";
  }
};

export default function Taller({ 
  ordenes, 
  setOrdenes, 
  usuarioActual, 
  mecanicos, 
  carwash, 
  setCarwash, 
  lavadores, 
  workshopInventory, 
  setWorkshopInventory, 
  accesoriosInventory = [],
  setAccesoriosInventory,
  comisionMecanico, 
  usuarios = [],
  cuentasPorCobrar,
  setCuentasPorCobrar,
  cuentasPorPagar = [],
  setCuentasPorPagar,
  clientes = [],
  setClientes,
  vehiculos = [],
  setVehiculos,
  carwashPresets = []
}) {
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [linea, setLinea] = useState("");
  const [anio, setAnio] = useState("");
  const [color, setColor] = useState("");
  const [kilometraje, setKilometraje] = useState("");
  const [chasis, setChasis] = useState("");
  const [combustible, setCombustible] = useState(50);
  const [luces, setLuces] = useState([]);
  const [mecanico, setMecanico] = useState("");
  const [precio, setPrecio] = useState("");
  const [fotos, setFotos] = useState([]);

  // Client and vehicle suggestions states
  const [activeFieldSuggestions, setActiveFieldSuggestions] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [editingEntryOrder, setEditingEntryOrder] = useState(null);

  // Nit and billing name
  const [nit, setNit] = useState("");
  const [nombreFacturacion, setNombreFacturacion] = useState("");

  const calculateOrderCommission = (orderObj) => {
    if (!orderObj) return 0;
    const mechName = orderObj.mecanico;
    if (!mechName) return 0;
    
    const mechUser = (usuarios || []).find(u => u && String(u.user || "").toLowerCase().trim() === String(mechName || "").toLowerCase().trim());
    
    // Determine flags and rates
    const comisionarLabor = mechUser ? (mechUser.comisionarLabor !== undefined ? mechUser.comisionarLabor : true) : true;
    const comisionarRepuestos = mechUser ? (mechUser.comisionarRepuestos !== undefined ? mechUser.comisionarRepuestos : false) : false;
    
    const pctLabor = mechUser ? (mechUser.comisionTaller !== undefined ? Number(mechUser.comisionTaller) / 100 : comisionMecanico) : comisionMecanico;
    const pctRepuestos = mechUser ? (mechUser.comisionRepuestos !== undefined ? Number(mechUser.comisionRepuestos) / 100 : 0) : 0;
    
    let laborComm = 0;
    let repuestosComm = 0;
    
    if (orderObj.presupuesto) {
      const totalLabor = orderObj.presupuesto.labor?.reduce((sum, item) => sum + Number(item.price || 0), 0) || 0;
      if (comisionarLabor) {
        laborComm = totalLabor * pctLabor;
      }
      
      if (comisionarRepuestos) {
        const totalPartsUtility = orderObj.presupuesto.parts?.reduce((sum, part) => {
          const utility = Math.max(0, (Number(part.salePrice || 0) - Number(part.purchasePrice || 0)) * Number(part.qty || 0));
          return sum + utility;
        }, 0) || 0;
        repuestosComm = totalPartsUtility * pctRepuestos;
      }
    } else {
      // Reception order or simple total
      if (comisionarLabor) {
        laborComm = Number(orderObj.total || 0) * pctLabor;
      }
    }
    
    return laborComm + repuestosComm;
  };

  // Multiple motives
  const [motivosIngreso, setMotivosIngreso] = useState([]);
  const [inputMotivo, setInputMotivo] = useState("");

  // Checklist
  const [checklist, setChecklist] = useState(() => {
    const initial = {};
    defaultChecklistItems.forEach(item => {
      initial[item.id] = { status: "Bueno", note: "" };
    });
    return initial;
  });

  // Dynamic warning lights state
  const [warningLightsList, setWarningLightsList] = useState(() => {
    return getLocalStorage("warningLightsList", warningLightsDef);
  });
  useEffect(() => {
    setLocalStorage("warningLightsList", warningLightsList);
  }, [warningLightsList]);

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

  // Detailed Budget Modal states
  const [budgetModalOrder, setBudgetModalOrder] = useState(null);
  const [quickAddOrder, setQuickAddOrder] = useState(null);
  const [quickType, setQuickType] = useState("part");
  const [quickDesc, setQuickDesc] = useState("");
  const [quickQty, setQuickQty] = useState("1");
  const [quickCost, setQuickCost] = useState("");
  const [quickPrice, setQuickPrice] = useState("");
  const [quickSuggestions, setQuickSuggestions] = useState([]);
  const [quickShowSuggestions, setQuickShowSuggestions] = useState(false);
  const [currentBudget, setCurrentBudget] = useState({ labor: [], parts: [], services: [], discount: 0 });
  const [inputDiscount, setInputDiscount] = useState("0");
  const [inputLaborDesc, setInputLaborDesc] = useState("");
  const [inputLaborPrice, setInputLaborPrice] = useState("");
  
  // Parts double pricing and quantity states
  const [inputPartDesc, setInputPartDesc] = useState("");
  const [inputPartQty, setInputPartQty] = useState("1");
  const [inputPartPurchasePrice, setInputPartPurchasePrice] = useState("");
  const [inputPartSalePrice, setInputPartSalePrice] = useState("");
  const [showPartSuggestions, setShowPartSuggestions] = useState(false);
  
  const [inputServiceDesc, setInputServiceDesc] = useState("");
  const [inputServicePrice, setInputServicePrice] = useState("");
  const [inputServicePurchasePrice, setInputServicePurchasePrice] = useState("");
  
  const [cajeroComisionApplies, setCajeroComisionApplies] = useState(true);
  const [budgetCajeroComisionApplies, setBudgetCajeroComisionApplies] = useState(true);
  
  const [inputInsumoDesc, setInputInsumoDesc] = useState("");
  const [inputInsumoQty, setInputInsumoQty] = useState("1");
  const [inputInsumoPurchasePrice, setInputInsumoPurchasePrice] = useState("");
  const [inputInsumoSalePrice, setInputInsumoSalePrice] = useState("");
  
  const [inputToolDesc, setInputToolDesc] = useState("");
  const [inputToolQty, setInputToolQty] = useState("1");
  const [inputToolPrice, setInputToolPrice] = useState("");
  
  // Diagnostic photos state
  const [diagnosticPhotos, setDiagnosticPhotos] = useState([]);
  
  // Formal budget preview state
  const [presupuestoFormalOrder, setPresupuestoFormalOrder] = useState(null);
  const [recepcionFormalOrder, setRecepcionFormalOrder] = useState(null);
  
  const [selectedFullPhoto, setSelectedFullPhoto] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const partSuggestions = inputPartDesc.trim()
    ? [
        ...(workshopInventory || []).map(item => ({ ...item, isAccessory: false })),
        ...(accesoriosInventory || []).map(item => ({ ...item, isAccessory: true }))
      ].filter(item => 
        (item.name || "").toLowerCase().includes(inputPartDesc.toLowerCase()) || 
        (item.code || "").toLowerCase().includes(inputPartDesc.toLowerCase())
      )
    : [];

  const isWorker = usuarioActual?.rol === "mecanico";
  const isManager = usuarioActual?.rol === "admin" || usuarioActual?.rol === "cajero";

  // Filter orders by search query and role
  const filteredOrdenes = ordenes.filter(o => {
    if (o.estado === "Entregado") return false; // Ocultar vehículos ya entregados de las listas activas

    // If mechanic role, show only their assigned orders
    if (isWorker && (o.mecanico || "").toLowerCase() !== (usuarioActual?.user || "").toLowerCase()) {
      return false;
    }
    
    // Global search
    const matchesSearch = 
      (o.cliente || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.vehiculo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.mecanico || "").toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesSearch;
  });

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const max_size = 600; // Limit image dimensions to save space in localStorage
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7); // 70% quality jpeg
          setFotos((prev) => [...prev, compressedBase64]);
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleTelefonoInput = (val) => {
    setTelefono(val);
    if (!val.trim()) {
      setSuggestions([]);
      setActiveFieldSuggestions(null);
      return;
    }
    
    const matches = (clientes || []).filter(c => 
      c.telefono?.includes(val) || 
      c.nombre?.toLowerCase().includes(val.toLowerCase())
    );

    // If exact match on phone number, autofill client details
    const exactMatch = (clientes || []).find(c => c.telefono === val.trim());
    if (exactMatch) {
      setCliente(exactMatch.nombre || "");
      if (exactMatch.nit) setNit(exactMatch.nit);
      if (exactMatch.nombreFacturacion) setNombreFacturacion(exactMatch.nombreFacturacion);
    }
    
    setSuggestions(matches.slice(0, 5));
    setActiveFieldSuggestions("telefono");
  };

  const selectClienteSuggestion = (c) => {
    setTelefono(c.telefono || "");
    setCliente(c.nombre || "");
    if (c.nit) setNit(c.nit);
    if (c.nombreFacturacion) setNombreFacturacion(c.nombreFacturacion);
    setActiveFieldSuggestions(null);
  };

  const handlePlacaInput = (val) => {
    setPlaca(val.toUpperCase());
    if (!val.trim()) {
      setSuggestions([]);
      setActiveFieldSuggestions(null);
      return;
    }
    
    const matches = (vehiculos || []).filter(v => 
      v.placa?.toLowerCase().includes(val.toLowerCase())
    );
    
    setSuggestions(matches.slice(0, 5));
    setActiveFieldSuggestions("placa");
  };

  const handleChasisInput = (val) => {
    setChasis(val.toUpperCase());
    if (!val.trim()) {
      setSuggestions([]);
      setActiveFieldSuggestions(null);
      return;
    }
    
    const matches = (vehiculos || []).filter(v => 
      v.chasis?.toLowerCase().includes(val.toLowerCase())
    );
    
    setSuggestions(matches.slice(0, 5));
    setActiveFieldSuggestions("chasis");
  };

  const selectVehiculoSuggestion = (v) => {
    setPlaca(v.placa || "");
    setChasis(v.chasis || "");
    setMarca(v.marca || "");
    setLinea(v.linea || "");
    if (v.anio) setAnio(v.anio);
    if (v.color) setColor(v.color);
    
    if (v.clienteTelefono) {
      setTelefono(v.clienteTelefono);
      const owner = (clientes || []).find(c => c.telefono === v.clienteTelefono);
      if (owner) {
        setCliente(owner.nombre || "");
        if (owner.nit) setNit(owner.nit);
        if (owner.nombreFacturacion) setNombreFacturacion(owner.nombreFacturacion);
      }
    }
    
    setActiveFieldSuggestions(null);
  };

  const registrarClienteYVehiculo = (order) => {
    const tel = order.telefono?.trim();
    if (tel) {
      setClientes(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const exists = safePrev.find(c => c.telefono === tel);
        if (exists) {
          return safePrev.map(c => c.telefono === tel ? {
            ...c,
            nombre: order.cliente.trim(),
            nit: order.nit || c.nit,
            nombreFacturacion: order.nombreFacturacion || c.nombreFacturacion
          } : c);
        } else {
          return [...safePrev, {
            telefono: tel,
            nombre: order.cliente.trim(),
            nit: order.nit || "C/F",
            nombreFacturacion: order.nombreFacturacion || order.cliente.trim(),
            fechaRegistro: new Date().toISOString()
          }];
        }
      });
    }

    const plc = order.placa?.toUpperCase()?.trim();
    const chs = order.chasis?.toUpperCase()?.trim();
    if (plc || chs) {
      setVehiculos(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const matchIndex = safePrev.findIndex(v => 
          (plc && v.placa === plc) || (chs && v.chasis === chs)
        );
        if (matchIndex > -1) {
          return safePrev.map((v, idx) => idx === matchIndex ? {
            ...v,
            placa: plc || v.placa,
            chasis: chs || v.chasis,
            marca: order.marca.trim(),
            linea: order.linea.trim(),
            anio: order.anio || v.anio,
            color: order.color || v.color,
            clienteTelefono: tel || v.clienteTelefono
          } : v);
        } else {
          return [...safePrev, {
            placa: plc || "",
            chasis: chs || "",
            marca: order.marca.trim(),
            linea: order.linea.trim(),
            anio: order.anio || "",
            color: order.color || "",
            clienteTelefono: tel || "",
            fechaRegistro: new Date().toISOString()
          }];
        }
      });
    }
  };

  const guardarEdicionIngreso = (e) => {
    e.preventDefault();
    if (!editingEntryOrder) return;
    
    if (!editingEntryOrder.cliente?.trim() || !editingEntryOrder.placa?.trim() || !editingEntryOrder.marca?.trim() || !editingEntryOrder.linea?.trim() || !editingEntryOrder.motivoIngreso?.trim()) {
      alert("Completa los campos obligatorios (Placa, Marca, Línea, Cliente y Motivo de ingreso).");
      return;
    }
    
    const updatedVehiculo = `${editingEntryOrder.marca.trim()} ${editingEntryOrder.linea.trim()} (${editingEntryOrder.placa.toUpperCase().trim()})`;
    
    const updatedOrders = ordenes.map(o => {
      if (o.id === editingEntryOrder.id) {
        const motivosString = editingEntryOrder.motivoIngreso.trim();
        const newMotivosArray = motivosString.split(" / ");
        
        const updatedOrder = {
          ...o,
          cliente: editingEntryOrder.cliente.trim(),
          telefono: editingEntryOrder.telefono.trim(),
          nit: editingEntryOrder.nit?.trim() || "C/F",
          nombreFacturacion: editingEntryOrder.nombreFacturacion?.trim() || editingEntryOrder.cliente.trim(),
          placa: editingEntryOrder.placa.toUpperCase().trim(),
          chasis: editingEntryOrder.chasis?.toUpperCase()?.trim() || "",
          marca: editingEntryOrder.marca.trim(),
          linea: editingEntryOrder.linea.trim(),
          anio: editingEntryOrder.anio?.toString()?.trim() || "",
          color: editingEntryOrder.color?.trim() || "",
          kilometraje: editingEntryOrder.kilometraje?.toString()?.trim() || "",
          motivoIngreso: motivosString,
          trabajo: motivosString,
          motivosIngreso: newMotivosArray,
          vehiculo: updatedVehiculo
        };
        
        registrarClienteYVehiculo(updatedOrder);
        return updatedOrder;
      }
      return o;
    });
    
    setOrdenes(updatedOrders);
    setEditingEntryOrder(null);
  };

  const removePhoto = (index) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const crearOrden = (e) => {
    e.preventDefault();
    if (!cliente.trim() || !placa.trim() || !marca.trim() || !linea.trim() || motivosIngreso.length === 0) {
      alert("Completa los campos obligatorios (Placa, Marca, Línea, Cliente y al menos un Motivo de ingreso).");
      return;
    }

    let valorPrecio = 0;
    if (precio) {
      valorPrecio = parseFloat(precio);
      if (isNaN(valorPrecio) || valorPrecio < 0) {
        alert("El precio debe ser un número válido");
        return;
      }
    }

    const comision = calculateOrderCommission({ total: valorPrecio, mecanico });

    const motivosString = motivosIngreso.join(" / ");

    const nueva = {
      id: Date.now(),
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      placa: placa.toUpperCase().trim(),
      marca: marca.trim(),
      linea: linea.trim(),
      anio: anio.trim(),
      color: color.trim(),
      kilometraje: kilometraje.trim(),
      chasis: chasis.toUpperCase().trim(),
      combustible,
      luces,
      motivosIngreso,
      motivoIngreso: motivosString,
      trabajo: motivosString, // Retrocompatibilidad
      vehiculo: `${marca.trim()} ${linea.trim()} (${placa.toUpperCase().trim()})`, // Retrocompatibilidad
      mecanico,
      fotos: fotos,
      estado: "En recepción",
      total: valorPrecio,
      comision,
      diagnosticoAutorizado: false,
      fecha: new Date().toISOString(),
      nit: nit.trim() || "C/F",
      nombreFacturacion: nombreFacturacion.trim() || cliente.trim(),
      checklist,
      cajeroComisionApplies
    };

    setOrdenes([nueva, ...ordenes]);
    registrarClienteYVehiculo(nueva);
    setCliente("");
    setTelefono("");
    setPlaca("");
    setMarca("");
    setLinea("");
    setAnio("");
    setColor("");
    setKilometraje("");
    setChasis("");
    setCombustible(50);
    setLuces([]);
    setMecanico("");
    setPrecio("");
    setFotos([]);
    setNit("");
    setNombreFacturacion("");
    setMotivosIngreso([]);
    setInputMotivo("");
    setCajeroComisionApplies(true);
    const initCheck = {};
    defaultChecklistItems.forEach(item => {
      initCheck[item.id] = { status: "Bueno", note: "" };
    });
    setChecklist(initCheck);
  };

  const cambiarEstado = (id, nuevoEstado) => {
    let cancelado = false;
    const nuevasOrdenes = ordenes.map((o) => {
      if (o.id === id) {
        let nuevoTotal = o.total;
        let nuevaComision = o.comision;

        // Validation: Only manager can set Entregado (since it closes/bills)
        if (nuevoEstado === "Entregado") {
          if (!isManager) {
            alert("Solo el personal administrativo o cajero puede marcar un vehículo como Entregado.");
            cancelado = true;
            return o;
          }
          if (o.total === 0) {
            // Must have a price before checking out!
            const inputPrecio = prompt("El trabajo se facturará. Ingresa el precio final de facturación (Q):", "");
            if (inputPrecio === null || inputPrecio.trim() === "") {
              alert("Debes ingresar un precio para facturar el trabajo.");
              cancelado = true;
              return o;
            }
            const valorPrecio = parseFloat(inputPrecio);
            if (isNaN(valorPrecio) || valorPrecio <= 0) {
              alert("Precio inválido.");
              cancelado = true;
              return o;
            }
            nuevoTotal = valorPrecio;
          }
          // Open split payment modal instead of directly updating order state!
          setCheckoutOrder({ ...o, total: nuevoTotal, cajeroComisionApplies: o.cajeroComisionApplies !== false });
          setCheckoutNit(o.nit || "C/F");
          setCheckoutNombreFacturacion(o.nombreFacturacion || o.cliente);
          setCheckoutPayments({ efectivo: "", transferencia: "", cheque: "", tarjeta: "", credito: "" });
          setSelectedPaymentMethods([]);
          cancelado = true;
          return o;
        }

        // Validation: Must have a mechanic assigned if moving out of "En recepción"
        if (nuevoEstado !== "En recepción" && !o.mecanico) {
          alert("Debes asignar un mecánico antes de avanzar el estado del vehículo.");
          cancelado = true;
          return o;
        }

        // Validation: Must have a detailed budget before transitioning to "En espera de autorización"
        if (nuevoEstado === "En espera de autorización" && o.total === 0) {
          alert("Debes elaborar el presupuesto detallado de mano de obra, repuestos y servicios antes de solicitar autorización.");
          setBudgetModalOrder(o);
          setCurrentBudget(o.presupuesto || { labor: [], parts: [], services: [], discount: 0 });
          setInputDiscount(o.presupuesto?.discount?.toString() || "0");
          cancelado = true;
          return o;
        }

        // Validation: Must have a price when transitioning to "Listo para entrega"
        if (nuevoEstado === "Listo para entrega" && o.total === 0) {
          const inputPrecio = prompt(`El trabajo cambiará a "${nuevoEstado}". Ingresa el precio final de facturación (Q):`, "");
          if (inputPrecio === null || inputPrecio.trim() === "") {
            alert("Debes ingresar un precio para facturar el trabajo.");
            cancelado = true;
            return o;
          }
          const valorPrecio = parseFloat(inputPrecio);
          if (isNaN(valorPrecio) || valorPrecio <= 0) {
            alert("Precio inválido. Debe ser un número mayor a 0 para facturar.");
            cancelado = true;
            return o;
          }
          nuevoTotal = valorPrecio;
          nuevaComision = calculateOrderCommission({ ...o, total: valorPrecio });
        }

        // Sync: Create linked wash in Carwash module if transitioning to "En proceso de lavado"
        if (nuevoEstado === "En proceso de lavado") {
          const alreadyLinked = carwash.some(c => c.tallerOrderId === o.id);
          if (!alreadyLinked) {
            const carwashServices = o.presupuesto?.services?.filter(s => s.desc.startsWith("Carwash:")) || [];
            
            if (carwashServices.length > 0) {
              const newWashes = carwashServices.map((s, idx) => {
                const presetTipo = s.desc.replace("Carwash:", "").trim();
                const preset = carwashPresets.find(p => p.tipo.toLowerCase().trim() === presetTipo.toLowerCase().trim());
                
                return {
                  id: Date.now() + idx,
                  tallerOrderId: o.id,
                  cliente: o.cliente,
                  telefono: o.telefono || "",
                  vehiculo: {
                    placa: o.placa || "",
                    marca: o.marca || "",
                    linea: o.linea || "",
                    color: o.color || ""
                  },
                  tipo: presetTipo,
                  precio: s.price || 0,
                  precioBase: s.price || 0,
                  trabajoAdicionalNombre: "",
                  trabajoAdicionalPrecio: 0,
                  comision: preset ? (preset.comision || 10.0) : 10.0,
                  lavadores: [],
                  estado: "En proceso",
                  fecha: new Date().toISOString()
                };
              });
              setCarwash([...newWashes, ...carwash]);
            } else {
              const nuevoLavadoTaller = {
                id: Date.now(),
                tallerOrderId: o.id,
                cliente: o.cliente,
                telefono: o.telefono || "",
                vehiculo: {
                  placa: o.placa || "",
                  marca: o.marca || "",
                  linea: o.linea || "",
                  color: o.color || ""
                },
                tipo: "Lavado de Taller",
                precio: 0,
                precioBase: 0,
                trabajoAdicionalNombre: "",
                trabajoAdicionalPrecio: 0,
                comision: 10.0, // Fixed Q10 commission for workshop washes
                lavadores: [],
                estado: "En proceso",
                fecha: new Date().toISOString()
              };
              setCarwash([nuevoLavadoTaller, ...carwash]);
            }
          }
        }

        return { ...o, estado: nuevoEstado, total: nuevoTotal, comision: nuevaComision };
      }
      return o;
    });

    if (!cancelado) {
      setOrdenes(nuevasOrdenes);
    }
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
      // Takes 100% of total
      const method = paymentMethodsSelected[0];
      breakdown[method] = checkoutOrder.total;
      totalPaid = checkoutOrder.total;
    } else {
      // Sum amounts
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
          cliente: checkoutOrder.cliente,
          telefono: checkoutOrder.telefono || "",
          nit: checkoutNit.trim() || "C/F",
          concepto: `Taller Orden #${checkoutOrder.id} - ${checkoutOrder.vehiculo}`,
          total: creditAmount,
          saldo: creditAmount,
          fecha: new Date().toISOString(),
          estado: "Pendiente",
          pagos: []
        };
        setCuentasPorCobrar([newCuenta, ...cuentasPorCobrar]);
      }
    }
    
    // Complete checkout & update order
    const updatedOrders = ordenes.map(o => {
      if (o.id === checkoutOrder.id) {
        // Sync carwash
        setCarwash((prevCarwash) => 
          prevCarwash.map(c => c.tallerOrderId === o.id ? { 
            ...c, 
            estado: "Entregado",
            fecha: new Date().toISOString(),
            formaPago: breakdown,
            formaPagoDesc: paymentMethodsSelected.map(m => `${m.toUpperCase()} (Q${breakdown[m].toFixed(2)})`).join(", "),
            cajero: usuarioActual.user
          } : c)
        );

        // Deduct inventory
        if (o.presupuesto && o.presupuesto.parts && o.presupuesto.parts.length > 0) {
          // 1. Deduct Accessories
          setAccesoriosInventory((prevInventory) => {
            const safeInventory = Array.isArray(prevInventory) ? prevInventory : [];
            return safeInventory.map(invItem => {
              const usedPart = o.presupuesto.parts.find(p => 
                (p.isAccessory === true && (
                  (p.code && invItem.code && p.code === invItem.code) || 
                  (p.desc || "").toLowerCase().trim() === (invItem.name || "").toLowerCase().trim()
                )) || 
                (p.isAccessory !== false && !workshopInventory.some(wi => wi.code === invItem.code || wi.name === invItem.name) && (
                  (p.code && invItem.code && p.code === invItem.code) || 
                  (p.desc || "").toLowerCase().trim() === (invItem.name || "").toLowerCase().trim()
                ))
              );
              if (usedPart) {
                if (invItem.acquisitionMode === "consignacion" && setCuentasPorPagar) {
                  const qtySold = usedPart.qty;
                  const totalCost = qtySold * (invItem.purchasePrice || 0);
                  if (totalCost > 0) {
                    const nuevaCuenta = {
                      id: Date.now() + Math.random(),
                      proveedor: invItem.proveedor || invItem.brand || "Proveedor de Consignación",
                      concepto: `Consignación - Taller Orden #${o.id} - Venta de accesorio: ${invItem.name} (${qtySold} uds) - Código: ${invItem.code}`,
                      total: totalCost,
                      saldo: totalCost,
                      fecha: new Date().toISOString(),
                      estado: "Pendiente",
                      pagos: []
                    };
                    setCuentasPorPagar(prevCuentas => [nuevaCuenta, ...(prevCuentas || [])]);
                  }
                }
                const newQty = Math.max(0, invItem.quantity - usedPart.qty);
                return { ...invItem, quantity: newQty };
              }
              return invItem;
            });
          });

          // 2. Deduct Workshop Parts
          setWorkshopInventory((prevInventory) => {
            const safeInventory = Array.isArray(prevInventory) ? prevInventory : [];
            return safeInventory.map(invItem => {
              const usedPart = o.presupuesto.parts.find(p => 
                p.isAccessory !== true && (
                  (p.code && invItem.code && p.code === invItem.code) || 
                  (p.desc || "").toLowerCase().trim() === (invItem.name || "").toLowerCase().trim()
                )
              );
              if (usedPart) {
                const newQty = Math.max(0, invItem.quantity - usedPart.qty);
                return { ...invItem, quantity: newQty };
              }
              return invItem;
            });
          });
        }
        
        // Compute commission
        const comision = calculateOrderCommission(checkoutOrder);
        
        return {
          ...o,
          estado: "Entregado",
          nit: checkoutNit.trim() || "C/F",
          nombreFacturacion: checkoutNombreFacturacion.trim() || o.cliente,
          formaPago: breakdown,
          formaPagoDesc: paymentMethodsSelected.map(m => `${m.toUpperCase()} (Q${breakdown[m].toFixed(2)})`).join(", "),
          comision,
          total: checkoutOrder.total,
          cajero: usuarioActual.user,
          cajeroComisionApplies: checkoutOrder.cajeroComisionApplies !== false,
          fecha: new Date().toISOString()
        };
      }
      return o;
    });
    
    setOrdenes(updatedOrders);
    setCheckoutOrder(null);
    alert("Orden finalizada y cobrada con éxito.");
  };

  const asignarMecanico = (id, name) => {
    setOrdenes(
      ordenes.map((o) => {
        if (o.id === id) {
          return { ...o, mecanico: name };
        }
        return o;
      })
    );
  };

  // Detailed Budget Modal Operations
  const addLaborItem = () => {
    if (!inputLaborDesc.trim()) return;
    const price = inputLaborPrice.trim() !== "" ? parseFloat(inputLaborPrice) : 0;
    if (isNaN(price) || price < 0) {
      alert("El precio debe ser un número válido");
      return;
    }
    setCurrentBudget((prev) => ({
      ...prev,
      labor: [...(prev.labor || []), { desc: inputLaborDesc.trim(), price }]
    }));
    setInputLaborDesc("");
    setInputLaborPrice("");
  };

  const addPartItem = () => {
    if (!inputPartDesc.trim() || !inputPartQty) return;
    const qty = parseInt(inputPartQty);
    if (isNaN(qty) || qty <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }

    const purchase = inputPartPurchasePrice.trim() !== "" ? parseFloat(inputPartPurchasePrice) : 0;
    const sale = inputPartSalePrice.trim() !== "" ? parseFloat(inputPartSalePrice) : 0;

    if (inputPartSalePrice && (isNaN(sale) || sale < 0)) {
      alert("El precio de venta debe ser un número válido");
      return;
    }
    if (inputPartPurchasePrice && (isNaN(purchase) || purchase < 0)) {
      alert("El precio de compra debe ser un número válido");
      return;
    }

    const matchingInv = [
      ...(workshopInventory || []).map(item => ({ ...item, isAccessory: false })),
      ...(accesoriosInventory || []).map(item => ({ ...item, isAccessory: true }))
    ].find(item => (item.name || "").toLowerCase().trim() === (inputPartDesc || "").trim().toLowerCase());
    const code = matchingInv ? matchingInv.code : "";
    const brand = matchingInv ? matchingInv.brand : "";
    const presentation = matchingInv ? matchingInv.presentation : "";
    const isAccessory = matchingInv ? matchingInv.isAccessory : false;

    setCurrentBudget((prev) => ({
      ...prev,
      parts: [
        ...(prev.parts || []),
        {
          desc: inputPartDesc.trim(),
          qty,
          purchasePrice: purchase,
          salePrice: sale,
          price: sale, // retrocompatibility for display / older code
          code: code,
          brand: brand,
          presentation: presentation,
          isAccessory: isAccessory
        }
      ]
    }));
    setInputPartDesc("");
    setInputPartQty("1");
    setInputPartPurchasePrice("");
    setInputPartSalePrice("");
  };

  const addInsumoItem = () => {
    if (!inputInsumoDesc.trim() || !inputInsumoQty) return;
    const qty = parseInt(inputInsumoQty);
    if (isNaN(qty) || qty <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }
    const purchase = inputInsumoPurchasePrice.trim() !== "" ? parseFloat(inputInsumoPurchasePrice) : 0;
    const sale = inputInsumoSalePrice.trim() !== "" ? parseFloat(inputInsumoSalePrice) : 0;

    setCurrentBudget((prev) => ({
      ...prev,
      insumos: [
        ...(prev.insumos || []),
        { desc: inputInsumoDesc.trim(), qty, purchasePrice: purchase, salePrice: sale }
      ]
    }));
    setInputInsumoDesc("");
    setInputInsumoQty("1");
    setInputInsumoPurchasePrice("");
    setInputInsumoSalePrice("");
  };

  const addToolItem = () => {
    if (!inputToolDesc.trim() || !inputToolQty) return;
    const qty = parseInt(inputToolQty);
    if (isNaN(qty) || qty <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }
    const price = inputToolPrice.trim() !== "" ? parseFloat(inputToolPrice) : 0;

    setCurrentBudget((prev) => ({
      ...prev,
      tools: [
        ...(prev.tools || []),
        { desc: inputToolDesc.trim(), qty, price }
      ]
    }));
    setInputToolDesc("");
    setInputToolQty("1");
    setInputToolPrice("");
  };

  const addServiceItem = () => {
    if (!inputServiceDesc.trim()) return;
    const purchasePrice = inputServicePurchasePrice.trim() !== "" ? parseFloat(inputServicePurchasePrice) : 0;
    const price = inputServicePrice.trim() !== "" ? parseFloat(inputServicePrice) : 0;
    if (isNaN(purchasePrice) || purchasePrice < 0) return;
    if (isNaN(price) || price < 0) return;
    setCurrentBudget((prev) => ({
      ...prev,
      services: [...(prev.services || []), { desc: inputServiceDesc.trim(), purchasePrice, price }]
    }));
    setInputServiceDesc("");
    setInputServicePurchasePrice("");
    setInputServicePrice("");
  };

  const deleteLaborItem = (idx) => {
    setCurrentBudget((prev) => ({
      ...prev,
      labor: (prev.labor || []).filter((_, i) => i !== idx)
    }));
  };

  const deletePartItem = (idx) => {
    setCurrentBudget((prev) => ({
      ...prev,
      parts: (prev.parts || []).filter((_, i) => i !== idx)
    }));
  };

  const deleteInsumoItem = (idx) => {
    setCurrentBudget((prev) => ({
      ...prev,
      insumos: (prev.insumos || []).filter((_, i) => i !== idx)
    }));
  };

  const deleteToolItem = (idx) => {
    setCurrentBudget((prev) => ({
      ...prev,
      tools: (prev.tools || []).filter((_, i) => i !== idx)
    }));
  };

  const deleteServiceItem = (idx) => {
    setCurrentBudget((prev) => ({
      ...prev,
      services: (prev.services || []).filter((_, i) => i !== idx)
    }));
  };

  const guardarPresupuesto = () => {
    if (!budgetModalOrder) return;
    const discountPct = parseFloat(inputDiscount) || 0;
    const updatedBudget = {
      ...currentBudget,
      discount: discountPct
    };

    const totalLabor = (updatedBudget.labor || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const totalParts = (updatedBudget.parts || []).reduce((sum, item) => sum + (item.qty * (parseFloat(item.salePrice) || 0)), 0);
    const totalInsumos = (updatedBudget.insumos || []).reduce((sum, item) => sum + (item.qty * (parseFloat(item.salePrice) || 0)), 0);
    const totalTools = (updatedBudget.tools || []).reduce((sum, item) => sum + (item.qty * (parseFloat(item.price) || 0)), 0);
    const totalServices = (updatedBudget.services || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const subTotal = totalLabor + totalParts + totalInsumos + totalTools + totalServices;
    const discountAmount = subTotal * (discountPct / 100);
    const granTotal = subTotal - discountAmount;

    setOrdenes(
      ordenes.map((o) => {
        if (o.id === budgetModalOrder.id) {
          return {
            ...o,
            presupuesto: updatedBudget,
            fotosDiagnostico: diagnosticPhotos,
            cajeroComisionApplies: budgetCajeroComisionApplies,
            total: granTotal,
            comision: calculateOrderCommission({ ...o, presupuesto: updatedBudget, total: granTotal }),
            diagnosticoAutorizado: o.diagnosticoAutorizado !== undefined ? o.diagnosticoAutorizado : false
          };
        }
        return o;
      })
    );

    setBudgetModalOrder(null);
    setDiagnosticPhotos([]);
  };

  const handleQuickDescChange = (val) => {
    setQuickDesc(val);
    if (!val.trim() || quickType === "service") {
      setQuickSuggestions([]);
      setQuickShowSuggestions(false);
      return;
    }
    const matches = [
      ...(workshopInventory || []).map(item => ({ ...item, isAccessory: false })),
      ...(accesoriosInventory || []).map(item => ({ ...item, isAccessory: true }))
    ].filter(item => 
      (item.name || "").toLowerCase().includes(val.toLowerCase()) ||
      (item.code || "").toLowerCase().includes(val.toLowerCase())
    );
    setQuickSuggestions(matches.slice(0, 5));
    setQuickShowSuggestions(true);
  };

  const selectQuickSuggestion = (item) => {
    setQuickDesc(item.name || "");
    setQuickCost(item.costPrice?.toString() || "");
    setQuickPrice(item.salePrice?.toString() || "");
    setQuickShowSuggestions(false);
  };

  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    if (!quickDesc.trim()) {
      alert("La descripción es obligatoria.");
      return;
    }
    const qty = quickType === "service" ? 1 : parseInt(quickQty);
    if (isNaN(qty) || qty <= 0) {
      alert("La cantidad debe ser un número entero mayor a 0.");
      return;
    }
    const cost = parseFloat(quickCost) || 0;
    const price = parseFloat(quickPrice) || 0;
    if (price < 0 || cost < 0) {
      alert("Los precios no pueden ser negativos.");
      return;
    }

    const orderToUpdate = ordenes.find(o => o.id === quickAddOrder.id);
    if (!orderToUpdate) return;

    const currentBud = orderToUpdate.presupuesto || { labor: [], parts: [], services: [], discount: 0, insumos: [], tools: [] };
    const updatedParts = [...(currentBud.parts || [])];
    const updatedInsumos = [...(currentBud.insumos || [])];
    const updatedServices = [...(currentBud.services || [])];

    if (quickType === "part") {
      const matchingInv = [
        ...(workshopInventory || []).map(item => ({ ...item, isAccessory: false })),
        ...(accesoriosInventory || []).map(item => ({ ...item, isAccessory: true }))
      ].find(item => (item.name || "").toLowerCase().trim() === quickDesc.trim().toLowerCase());
      const code = matchingInv ? matchingInv.code : "";
      const brand = matchingInv ? matchingInv.brand : "";
      const presentation = matchingInv ? matchingInv.presentation : "";
      const isAccessory = matchingInv ? matchingInv.isAccessory : false;
      updatedParts.push({
        desc: quickDesc.trim(),
        qty,
        purchasePrice: cost,
        salePrice: price,
        price,
        code,
        brand,
        presentation,
        isAccessory
      });
    } else if (quickType === "insumo") {
      updatedInsumos.push({
        desc: quickDesc.trim(),
        qty,
        purchasePrice: cost,
        salePrice: price
      });
    } else {
      updatedServices.push({
        desc: quickDesc.trim(),
        purchasePrice: cost,
        price
      });
    }

    const nextBudget = {
      ...currentBud,
      parts: updatedParts,
      insumos: updatedInsumos,
      services: updatedServices
    };

    const discountPct = parseFloat(nextBudget.discount) || 0;
    const totalLabor = (nextBudget.labor || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const totalParts = (nextBudget.parts || []).reduce((sum, item) => sum + (item.qty * (parseFloat(item.salePrice) || 0)), 0);
    const totalInsumos = (nextBudget.insumos || []).reduce((sum, item) => sum + (item.qty * (parseFloat(item.salePrice) || 0)), 0);
    const totalTools = (nextBudget.tools || []).reduce((sum, item) => sum + (item.qty * (parseFloat(item.price) || 0)), 0);
    const totalServices = (nextBudget.services || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const subTotal = totalLabor + totalParts + totalInsumos + totalTools + totalServices;
    const discountAmount = subTotal * (discountPct / 100);
    const granTotal = subTotal - discountAmount;

    setOrdenes(
      ordenes.map(o => {
        if (o.id === quickAddOrder.id) {
          return {
            ...o,
            presupuesto: nextBudget,
            total: granTotal,
            comision: calculateOrderCommission({ ...o, presupuesto: nextBudget, total: granTotal })
          };
        }
        return o;
      })
    );

    setQuickAddOrder(null);
    setQuickDesc("");
    setQuickQty("1");
    setQuickCost("");
    setQuickPrice("");
    setQuickSuggestions([]);
    setQuickShowSuggestions(false);
    alert("Elemento cargado inmediatamente.");
  };

  const avanzarOrden = (id) => {
    const orden = ordenes.find((o) => o.id === id);
    if (!orden) return;
    const currentIndex = TALLER_STATUSES.indexOf(orden.estado);
    if (currentIndex !== -1 && currentIndex < TALLER_STATUSES.length - 1) {
      const siguienteEstado = TALLER_STATUSES[currentIndex + 1];
      cambiarEstado(id, siguienteEstado);
    }
  };

  const exportarPresupuestoImagen = async (o) => {
    // Helper to load images asynchronously
    const loadImages = async (sources) => {
      return Promise.all(sources.map(srcObj => {
        const src = typeof srcObj === "string" ? srcObj : srcObj.base64;
        return new Promise((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
        });
      }));
    };

    // Helper for proportional drawing (contain fit)
    const drawImageProportional = (c2d, img, x, y, width, height) => {
      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;
      const r = Math.min(width / imgWidth, height / imgHeight);
      const nw = imgWidth * r;
      const nh = imgHeight * r;
      const cx = x + (width - nw) / 2;
      const cy = y + (height - nh) / 2;
      
      c2d.fillStyle = "#f3f4f6";
      c2d.fillRect(x, y, width, height);
      c2d.drawImage(img, cx, cy, nw, nh);
    };

    // Helper to wrap text
    const wrapText = (context, text, maxWidth) => {
      const words = text.split(" ");
      let line = "";
      const lines = [];
      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + " ";
        let testWidth = context.measureText(testLine).width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line.trim());
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());
      return lines;
    };

    const diagPhotos = o.fotosDiagnostico || [];
    const loadedImages = await loadImages(diagPhotos);
    const loadedCount = loadedImages.filter(img => img !== null).length;
    const hasPhotos = loadedCount > 0;

    // Compile flat list of all items
    const allItems = [];
    
    // 1. Labor
    if (o.presupuesto && o.presupuesto.labor) {
      o.presupuesto.labor.forEach(item => {
        allItems.push({
          qty: 1,
          desc: `${item.desc} (Mano de obra)`,
          unitPrice: parseFloat(item.price) || 0,
          totalPrice: parseFloat(item.price) || 0
        });
      });
    }
    
    // 2. Parts
    if (o.presupuesto && o.presupuesto.parts) {
      o.presupuesto.parts.forEach(item => {
        let itemDesc = item.desc;
        if (item.brand) itemDesc += ` (${item.brand})`;
        if (item.presentation) itemDesc += ` - ${item.presentation}`;
        allItems.push({
          qty: item.qty,
          desc: itemDesc,
          unitPrice: parseFloat(item.salePrice) || 0,
          totalPrice: item.qty * (parseFloat(item.salePrice) || 0)
        });
      });
    }

    // 3. Insumos
    if (o.presupuesto && o.presupuesto.insumos) {
      o.presupuesto.insumos.forEach(item => {
        allItems.push({
          qty: item.qty,
          desc: `${item.desc} (Insumo)`,
          unitPrice: parseFloat(item.salePrice) || 0,
          totalPrice: item.qty * (parseFloat(item.salePrice) || 0)
        });
      });
    }

    // 4. Tools
    if (o.presupuesto && o.presupuesto.tools) {
      o.presupuesto.tools.forEach(item => {
        allItems.push({
          qty: item.qty,
          desc: `${item.desc} (Herramienta Especial)`,
          unitPrice: parseFloat(item.price) || 0,
          totalPrice: item.qty * (parseFloat(item.price) || 0)
        });
      });
    }
    
    // 5. Services
    if (o.presupuesto && o.presupuesto.services) {
      o.presupuesto.services.forEach(item => {
        allItems.push({
          qty: 1,
          desc: item.desc,
          unitPrice: parseFloat(item.price) || 0,
          totalPrice: parseFloat(item.price) || 0
        });
      });
    }

    const discountPct = o.presupuesto?.discount || 0;
    const subTotal = allItems.reduce((sum, item) => sum + item.totalPrice, 0);
    let discountAmount = 0;
    
    if (discountPct > 0) {
      discountAmount = subTotal * (discountPct / 100);
      allItems.push({
        qty: 1,
        desc: `Descuento ${discountPct}%`,
        unitPrice: 0,
        totalPrice: -discountAmount,
        isDiscount: true
      });
    }

    // Set canvas dimensions
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    const rowHeight = 35;
    const tableHeaderY = 515;
    const tableEnd = tableHeaderY + 30 + (allItems.length * rowHeight);
    
    const page2Height = hasPhotos ? 325 + (Math.ceil(loadedCount / 2) * 310) : 0;
    canvas.height = tableEnd + 390 + page2Height;
    const ctx = canvas.getContext("2d");
    
    // 1. Draw Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Draw Header Box
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, 0, canvas.width, 150);
    
    // Checkered flag slanted
    ctx.save();
    ctx.transform(1, 0, -0.25, 1, 0, 0);
    const flagX = 55;
    const flagY = 25;
    const sqSize = 14;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(flagX, flagY, sqSize * 4, sqSize * 2);
    ctx.fillStyle = "#000000";
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillRect(flagX + c * sqSize, flagY + r * sqSize, sqSize, sqSize);
        }
      }
    }
    ctx.restore();

    // Brand texts
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px 'Orbitron', sans-serif";
    ctx.fillText("LOS PITS", 40, 95);
    
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("SERVICIO QUE SE SIENTE, CALIDAD QUE SE VE", 40, 120);
    
    // Diagonal divider line
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(520, 0);
    ctx.lineTo(460, 150);
    ctx.stroke();
    
    // Location Icon
    ctx.beginPath();
    ctx.arc(520, 48, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(520, 45, 3, 0, Math.PI, true);
    ctx.lineTo(520, 52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(520, 45, 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Address text
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("3 calle 6-47 zona 10,", 540, 44);
    ctx.fillText("Ciudad de Guatemala", 540, 59);
    
    // Phone Icon
    ctx.beginPath();
    ctx.arc(520, 100, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(518, 102, 5, Math.PI * 1.0, Math.PI * 1.6);
    ctx.stroke();
    
    // Phone text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("3271-1268", 540, 108);
    
    // 3. Date box centered
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1;
    
    const drawRoundedRect = (c2d, rx, ry, rw, rh, rad) => {
      c2d.beginPath();
      c2d.moveTo(rx + rad, ry);
      c2d.lineTo(rx + rw - rad, ry);
      c2d.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rad);
      c2d.lineTo(rx + rw, ry + rh - rad);
      c2d.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rad, ry + rh);
      c2d.lineTo(rx + rad, ry + rh);
      c2d.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rad);
      c2d.lineTo(rx, ry + rad);
      c2d.quadraticCurveTo(rx, ry, rx + rad, ry);
      c2d.closePath();
    };

    drawRoundedRect(ctx, 300, 170, 200, 36, 6);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = "#000000";
    ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    const dateFormatted = new Date(o.id).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    ctx.fillText(`Fecha:  ${dateFormatted}`, 400, 194);
    ctx.textAlign = "left";
    
    // 4. Budget Title Banner Capsule
    ctx.fillStyle = "#000000";
    drawRoundedRect(ctx, 40, 230, 720, 40, 10);
    ctx.fill();
    
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(55, 250);
    ctx.lineTo(105, 250);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(695, 250);
    ctx.lineTo(745, 250);
    ctx.stroke();
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PRESUPUESTO DE REPARACIÓN DE VEHÍCULO", 400, 256);
    ctx.textAlign = "left";
    
    // 5. Metadata section
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(400, 300);
    ctx.lineTo(400, 470);
    ctx.stroke();
    
    ctx.fillStyle = "#000000";
    ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("DATOS DEL CLIENTE", 50, 312);
    ctx.fillText("DETALLES DEL VEHÍCULO", 420, 312);
    
    const drawMetaRow = (c2d, iconType, label, value, startX, startY, lineStartXOffset = 130) => {
      c2d.beginPath();
      c2d.arc(startX + 12, startY + 4, 12, 0, Math.PI * 2);
      c2d.fillStyle = "#f59e0b";
      c2d.fill();
      
      c2d.fillStyle = "#000000";
      c2d.strokeStyle = "#000000";
      c2d.lineWidth = 1.5;
      const cx = startX + 12;
      const cy = startY + 4;
      if (iconType === "user") {
        c2d.beginPath();
        c2d.arc(cx, cy - 3, 3, 0, Math.PI * 2);
        c2d.fill();
        c2d.beginPath();
        c2d.arc(cx, cy + 8, 6, Math.PI, Math.PI * 2);
        c2d.fill();
      } else if (iconType === "phone") {
        c2d.lineWidth = 2.5;
        c2d.lineCap = "round";
        c2d.beginPath();
        c2d.arc(cx - 2, cy + 2, 4, Math.PI * 1.0, Math.PI * 1.6);
        c2d.stroke();
      } else if (iconType === "money") {
        c2d.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
        c2d.textAlign = "center";
        c2d.fillText("$", cx, cy + 4);
        c2d.textAlign = "left";
      } else if (iconType === "car") {
        c2d.fillRect(cx - 6, cy, 12, 4);
        c2d.beginPath();
        c2d.arc(cx - 3, cy + 4, 2, 0, Math.PI * 2);
        c2d.arc(cx + 3, cy + 4, 2, 0, Math.PI * 2);
        c2d.fill();
        c2d.beginPath();
        c2d.moveTo(cx - 4, cy);
        c2d.lineTo(cx - 2, cy - 4);
        c2d.lineTo(cx + 2, cy - 4);
        c2d.lineTo(cx + 4, cy);
        c2d.closePath();
        c2d.stroke();
      } else if (iconType === "calendar") {
        c2d.strokeRect(cx - 5, cy - 4, 10, 8);
        c2d.fillRect(cx - 3, cy - 6, 2, 2);
        c2d.fillRect(cx + 1, cy - 6, 2, 2);
      } else if (iconType === "plate") {
        c2d.strokeRect(cx - 7, cy - 4, 14, 8);
        c2d.font = "bold 6px sans-serif";
        c2d.textAlign = "center";
        c2d.fillText("Q", cx, cy + 2);
        c2d.textAlign = "left";
      } else if (iconType === "speedometer") {
        c2d.beginPath();
        c2d.arc(cx, cy + 3, 7, Math.PI, Math.PI * 2);
        c2d.stroke();
        c2d.beginPath();
        c2d.moveTo(cx, cy + 3);
        c2d.lineTo(cx + 4, cy - 1);
        c2d.stroke();
      }
      
      c2d.fillStyle = "#374151";
      c2d.font = "14px 'Plus Jakarta Sans', sans-serif";
      c2d.fillText(label, startX + 35, startY + 8);
      
      const lineStartX = startX + lineStartXOffset;
      const lineEndX = startX + 330;
      c2d.strokeStyle = "#e5e7eb";
      c2d.lineWidth = 1;
      c2d.beginPath();
      c2d.moveTo(lineStartX, startY + 11);
      c2d.lineTo(lineEndX, startY + 11);
      c2d.stroke();
      
      c2d.fillStyle = "#111827";
      c2d.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
      // Truncate to prevent overlap
      const maxValWidth = lineEndX - lineStartX - 10;
      let displayValue = value;
      if (c2d.measureText(displayValue).width > maxValWidth) {
        while (displayValue.length > 0 && c2d.measureText(displayValue + "...").width > maxValWidth) {
          displayValue = displayValue.slice(0, -1);
        }
        displayValue += "...";
      }
      c2d.fillText(displayValue, lineStartX + 5, startY + 7);
    };

    drawMetaRow(ctx, "user", "Cliente:", o.cliente, 40, 335, 175);
    drawMetaRow(ctx, "phone", "Teléfono:", o.telefono || "S/N", 40, 375, 175);
    drawMetaRow(ctx, "money", "Condición de pago:", "Contado", 40, 415, 175);
    
    const vehName = `${o.marca || ""} ${o.linea || ""}`.trim() || "N/A";
    drawMetaRow(ctx, "car", "Vehículo:", vehName, 410, 335);
    drawMetaRow(ctx, "calendar", "Modelo:", (o.anio || "N/A").toString(), 410, 375);
    drawMetaRow(ctx, "plate", "Placa:", o.placa || "N/A", 410, 415);
    const mileageFormatted = o.kilometraje ? parseInt(o.kilometraje).toLocaleString() : "N/A";
    drawMetaRow(ctx, "speedometer", "Kilometraje:", mileageFormatted, 410, 455);
    
    // 6. Table title and header
    ctx.fillStyle = "#000000";
    ctx.font = "bold 16px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("DETALLES DE LA REPARACIÓN", 40, 500);
    
    ctx.fillStyle = "#000000";
    ctx.fillRect(40, 515, 720, 30);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CANTIDAD", 80, 534);
    ctx.textAlign = "left";
    ctx.fillText("DESCRIPCIÓN", 135, 534);
    ctx.textAlign = "center";
    ctx.fillText("PRECIO UNITARIO", 565, 534);
    ctx.fillText("TOTAL", 695, 534);
    ctx.textAlign = "left";
    
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, 515); ctx.lineTo(120, 545);
    ctx.moveTo(500, 515); ctx.lineTo(500, 545);
    ctx.moveTo(630, 515); ctx.lineTo(630, 545);
    ctx.stroke();
    
    // 7. Table rows
    let currentY = 545;
    allItems.forEach((item, index) => {
      // Row background striping
      if (index % 2 === 0) {
        ctx.fillStyle = "#ffffff";
      } else {
        ctx.fillStyle = "#f9fafb";
      }
      ctx.fillRect(40, currentY, 720, rowHeight);
      
      // Vertical borders
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, currentY); ctx.lineTo(40, currentY + rowHeight);
      ctx.moveTo(120, currentY); ctx.lineTo(120, currentY + rowHeight);
      ctx.moveTo(500, currentY); ctx.lineTo(500, currentY + rowHeight);
      ctx.moveTo(630, currentY); ctx.lineTo(630, currentY + rowHeight);
      ctx.moveTo(760, currentY); ctx.lineTo(760, currentY + rowHeight);
      ctx.moveTo(40, currentY + rowHeight); ctx.lineTo(760, currentY + rowHeight);
      ctx.stroke();
      
      // Values
      ctx.fillStyle = item.isDiscount ? "#ef4444" : "#111827";
      ctx.font = item.isDiscount ? "bold 13px 'Plus Jakarta Sans', sans-serif" : "13px 'Plus Jakarta Sans', sans-serif";
      
      ctx.textAlign = "center";
      ctx.fillText(item.qty.toString(), 80, currentY + 22);
      
      ctx.textAlign = "left";
      const maxLen = 50;
      let dispDesc = item.desc;
      if (dispDesc.length > maxLen) {
        dispDesc = dispDesc.slice(0, maxLen - 3) + "...";
      }
      ctx.fillText(dispDesc, 135, currentY + 22);
      
      if (item.isDiscount) {
        ctx.textAlign = "center";
        ctx.fillText("-", 565, currentY + 22);
        
        ctx.fillStyle = "#ef4444";
        ctx.textAlign = "left";
        ctx.fillText("-Q", 640, currentY + 22);
        ctx.textAlign = "right";
        ctx.fillText(Math.abs(item.totalPrice).toFixed(2), 750, currentY + 22);
      } else {
        ctx.textAlign = "left";
        ctx.fillText("Q", 515, currentY + 22);
        ctx.textAlign = "right";
        ctx.fillText(item.unitPrice.toFixed(2), 620, currentY + 22);
        
        ctx.textAlign = "left";
        ctx.fillText("Q", 640, currentY + 22);
        ctx.textAlign = "right";
        ctx.fillText(item.totalPrice.toFixed(2), 750, currentY + 22);
      }
      
      ctx.textAlign = "left";
      currentY += rowHeight;
    });
    
    // 8. Total Box
    const totalY = currentY + 15;
    ctx.fillStyle = "#000000";
    ctx.fillRect(500, totalY, 130, 40);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TOTAL:", 565, totalY + 25);
    
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(630, totalY, 130, 40);
    ctx.fillStyle = "#000000";
    ctx.font = "bold 16px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(formatMoney(o.total), 695, totalY + 25);
    ctx.textAlign = "left";
    
    // 9. Technical Notes
    const notesY = totalY + 70;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 40, notesY, 720, 130, 10);
    ctx.stroke();
    
    // Clipboard Icon Badge
    const bx = 75;
    const by = notesY + 35;
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(bx, by, 16, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx - 6, by - 8, 12, 16);
    ctx.fillRect(bx - 3, by - 10, 6, 2);
    ctx.beginPath();
    ctx.moveTo(bx - 3, by - 2); ctx.lineTo(bx + 3, by - 2);
    ctx.moveTo(bx - 3, by + 2); ctx.lineTo(bx + 3, by + 2);
    ctx.stroke();
    
    ctx.fillStyle = "#000000";
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("NOTAS TÉCNICAS", 105, notesY + 25);
    
    const bulletPoints = [
      "Precios incluyen mano de obra e IVA.",
      "Repuestos originales o de calidad equivalente.",
      "Cotización válida por 15 días.",
      "El tiempo de reparación puede variar según disponibilidad de repuestos."
    ];
    ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#374151";
    bulletPoints.forEach((text, i) => {
      ctx.fillText("•  " + text, 105, notesY + 48 + (i * 20));
    });
    
    // 10. Footer Section
    const footerY = notesY + 160;
    const footerHeight = (tableEnd + 390) - footerY;
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, footerY, canvas.width, footerHeight);
    
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, footerY);
    ctx.lineTo(canvas.width, footerY);
    ctx.stroke();
    
    const drawFooterBadge = (c2d, iconType, text, cx, cy) => {
      c2d.fillStyle = "#f59e0b";
      c2d.beginPath();
      c2d.arc(cx, cy, 14, 0, Math.PI * 2);
      c2d.fill();
      
      c2d.strokeStyle = "#000000";
      c2d.fillStyle = "#000000";
      c2d.lineWidth = 1.5;
      if (iconType === "shield") {
        c2d.beginPath();
        c2d.moveTo(cx - 5, cy - 6);
        c2d.lineTo(cx + 5, cy - 6);
        c2d.lineTo(cx + 5, cy);
        c2d.quadraticCurveTo(cx + 5, cy + 6, cx, cy + 9);
        c2d.quadraticCurveTo(cx - 5, cy + 6, cx - 5, cy);
        c2d.closePath();
        c2d.stroke();
      } else if (iconType === "handshake") {
        c2d.beginPath();
        c2d.arc(cx - 3, cy, 3, 0, Math.PI * 2);
        c2d.arc(cx + 3, cy, 3, 0, Math.PI * 2);
        c2d.fill();
      } else if (iconType === "gear") {
        c2d.beginPath();
        c2d.arc(cx, cy, 4, 0, Math.PI * 2);
        c2d.stroke();
        for (let a = 0; a < 360; a += 60) {
          const rad = a * Math.PI / 180;
          c2d.fillRect(cx + Math.cos(rad) * 5 - 1.5, cy + Math.sin(rad) * 5 - 1.5, 3, 3);
        }
      } else if (iconType === "check") {
        c2d.beginPath();
        c2d.moveTo(cx - 4, cy);
        c2d.lineTo(cx - 1, cy + 3);
        c2d.lineTo(cx + 5, cy - 3);
        c2d.stroke();
      }
      
      c2d.fillStyle = "#ffffff";
      c2d.font = "bold 9px 'Plus Jakarta Sans', sans-serif";
      c2d.textAlign = "center";
      const words = text.split(" ");
      if (words.length > 1) {
        c2d.fillText(words.slice(0, Math.ceil(words.length / 2)).join(" "), cx, cy + 28);
        c2d.fillText(words.slice(Math.ceil(words.length / 2)).join(" "), cx, cy + 38);
      } else {
        c2d.fillText(text, cx, cy + 28);
      }
    };
    
    const badgeY = footerY + 35;
    drawFooterBadge(ctx, "shield", "CALIDAD GARANTIZADA", 100, badgeY);
    drawFooterBadge(ctx, "handshake", "EXPERIENCIA Y CONFIANZA", 300, badgeY);
    drawFooterBadge(ctx, "gear", "SERVICIO PROFESIONAL", 500, badgeY);
    drawFooterBadge(ctx, "check", "COMPROMISO CON NUESTROS CLIENTES", 700, badgeY);
    
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 24px 'Dancing Script', cursive";
    ctx.textAlign = "center";
    ctx.fillText("¡Gracias por confiar en Los Pits!", 400, footerY + 110);
    ctx.textAlign = "left";
    
    // Draw Page 2 if hasPhotos is true
    if (hasPhotos) {
      const page2Start = tableEnd + 390;
      
      // 1. Visual Page Divider
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, page2Start, 800, 15);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, page2Start + 7);
      ctx.lineTo(800, page2Start + 7);
      ctx.stroke();

      // 2. Compact Page 2 Header Box
      const p2HeaderY = page2Start + 15;
      ctx.fillStyle = "#0a0c10";
      ctx.fillRect(0, p2HeaderY, 800, 80);
      
      // Slanted divider
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(540, p2HeaderY);
      ctx.lineTo(500, p2HeaderY + 80);
      ctx.stroke();

      // Brand Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px 'Orbitron', sans-serif";
      ctx.fillText("LOS PITS", 40, p2HeaderY + 48);
      
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 9px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("ANEXO DE FOTOS DE DIAGNÓSTICO", 40, p2HeaderY + 65);
      
      // Right metadata reference
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(`Placa: ${o.placa || "N/A"}`, 560, p2HeaderY + 35);
      
      let clientTrunc = o.cliente || "N/A";
      if (ctx.measureText(`Cliente: ${clientTrunc}`).width > 200) {
        while (ctx.measureText(`Cliente: ${clientTrunc}...`).width > 200 && clientTrunc.length > 0) {
          clientTrunc = clientTrunc.slice(0, -1);
        }
        clientTrunc += "...";
      }
      ctx.fillText(`Cliente: ${clientTrunc}`, 560, p2HeaderY + 55);

      // 3. Draw Photos Grid
      const photosStartY = p2HeaderY + 110;
      let px = 40;
      let py = photosStartY;
      
      loadedImages.forEach((img, index) => {
        if (img) {
          if (index > 0 && index % 2 === 0) {
            px = 40;
            py += 310;
          }
          
          // Photo frame
          ctx.strokeStyle = "#e5e7eb";
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, 340, 255);
          
          // Proportional drawing
          drawImageProportional(ctx, img, px, py, 340, 255);
          
          // Photo comment
          const photoData = diagPhotos[index];
          const comment = typeof photoData === "object" && photoData ? photoData.comment : "";
          
          ctx.fillStyle = "#1f2937";
          ctx.font = "italic 12px 'Plus Jakarta Sans', sans-serif";
          ctx.textAlign = "left";
          if (comment) {
            const commentLines = wrapText(ctx, comment, 330);
            commentLines.slice(0, 2).forEach((line, lineIdx) => {
              ctx.fillText(line, px + 5, py + 272 + (lineIdx * 14));
            });
          } else {
            ctx.fillText("Sin comentarios", px + 5, py + 272);
          }
          
          px += 380;
        }
      });

      // 4. Page 2 Footer Section
      const p2FooterY = canvas.height - 100;
      ctx.fillStyle = "#0a0c10";
      ctx.fillRect(0, p2FooterY, canvas.width, 100);
      
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, p2FooterY);
      ctx.lineTo(canvas.width, p2FooterY);
      ctx.stroke();
      
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 18px 'Dancing Script', cursive";
      ctx.textAlign = "center";
      ctx.fillText("¡Gracias por confiar en Los Pits!", 400, p2FooterY + 60);
      ctx.textAlign = "left";
    }

    // Trigger PDF Download
    const dataURL = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF("p", "px", [800, canvas.height]);
    pdf.addImage(dataURL, "JPEG", 0, 0, 800, canvas.height);
    pdf.save(`Presupuesto_${o.placa || "auto"}.pdf`);
  };

  const exportarRecepcionImagen = async (o) => {
    // 1. Load images asynchronously
    const loadImages = async (sources) => {
      return Promise.all(sources.map(src => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
        });
      }));
    };
    
    // Proportional drawing (contain fit)
    const drawImageProportional = (c2d, img, x, y, width, height) => {
      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;
      const r = Math.min(width / imgWidth, height / imgHeight);
      const nw = imgWidth * r;
      const nh = imgHeight * r;
      const cx = x + (width - nw) / 2;
      const cy = y + (height - nh) / 2;
      
      c2d.fillStyle = "#f3f4f6";
      c2d.fillRect(x, y, width, height);
      c2d.drawImage(img, cx, cy, nw, nh);
    };

    // Helper to wrap text
    const wrapText = (context, text, maxWidth) => {
      const words = text.split(" ");
      let line = "";
      const lines = [];
      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + " ";
        let testWidth = context.measureText(testLine).width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line.trim());
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());
      return lines;
    };

    const loadedImages = await loadImages(o.fotos || []);
    
    // Set canvas dimensions
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    
    // Calculate checklist table height
    const checklistCount = defaultChecklistItems.length;
    const rowHeight = 35;

    // Motivo de ingreso dynamic height calculation
    const motString = o.motivoIngreso || o.trabajo || "Sin especificar";
    const dummyCanvas = document.createElement("canvas");
    const dummyCtx = dummyCanvas.getContext("2d");
    dummyCtx.font = "13px 'Plus Jakarta Sans', sans-serif";
    const motifLines = wrapText(dummyCtx, motString, 690);
    const motiveBoxHeight = 35 + (motifLines.length * 18);
    
    // Increased gap from 20 to 40 to prevent bottom line of motives box overlapping the checklist title
    const checklistStart = 495 + motiveBoxHeight + 40;
    const checklistEnd = checklistStart + 30 + (checklistCount * rowHeight);
    
    // Calculate active warning lights height wrapping onto multiple lines if necessary
    const hasWarningLights = o.luces && o.luces.length > 0;
    let lightsHeight = 0;
    if (hasWarningLights) {
      dummyCtx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
      let lx = 40;
      let lines = 1;
      o.luces.forEach(l => {
        const lDef = warningLightsDef.find(item => item.id === l);
        const lText = lDef ? `${lDef.icon} ${lDef.label}` : l;
        const textWidth = dummyCtx.measureText(lText).width + 16;
        if (lx + textWidth > 760) {
          lx = 40;
          lines++;
        }
        lx += textWidth + 8;
      });
      lightsHeight = 15 + (lines * 32) + 15;
    }
    
    const lightsEnd = hasWarningLights ? (checklistEnd + 30 + lightsHeight) : (checklistEnd + 10);
    
    // Page heights (Page 1 ends with footer badges + signature)
    const page1End = lightsEnd + 180;
    const loadedCount = loadedImages.filter(img => img !== null).length;
    const hasPhotos = loadedCount > 0;
    const page2Height = hasPhotos ? 230 + (Math.ceil(loadedCount / 2) * 285) : 0;
    
    // Canvas total height
    canvas.height = page1End + page2Height;
    
    const ctx = canvas.getContext("2d");
    
    // 1. Draw Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Draw Header Box
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, 0, canvas.width, 150);
    
    // Checkered flag slanted
    ctx.save();
    ctx.transform(1, 0, -0.25, 1, 0, 0);
    const flagX = 55;
    const flagY = 25;
    const sqSize = 14;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(flagX, flagY, sqSize * 4, sqSize * 2);
    ctx.fillStyle = "#000000";
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillRect(flagX + c * sqSize, flagY + r * sqSize, sqSize, sqSize);
        }
      }
    }
    ctx.restore();

    // Brand texts
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px 'Orbitron', sans-serif";
    ctx.fillText("LOS PITS", 40, 95);
    
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("SERVICIO QUE SE SIENTE, CALIDAD QUE SE VE", 40, 120);
    
    // Diagonal divider line
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(520, 0);
    ctx.lineTo(460, 150);
    ctx.stroke();
    
    // Location Icon
    ctx.beginPath();
    ctx.arc(520, 48, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(520, 45, 3, 0, Math.PI, true);
    ctx.lineTo(520, 52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(520, 45, 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Address text
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("3 calle 6-47 zona 10,", 540, 44);
    ctx.fillText("Ciudad de Guatemala", 540, 59);
    
    // Phone Icon
    ctx.beginPath();
    ctx.arc(520, 100, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(518, 102, 5, Math.PI * 1.0, Math.PI * 1.6);
    ctx.stroke();
    
    // Phone text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("3271-1268", 540, 108);
    
    // 3. Date box centered
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1;
    
    const drawRoundedRect = (c2d, rx, ry, rw, rh, rad) => {
      c2d.beginPath();
      c2d.moveTo(rx + rad, ry);
      c2d.lineTo(rx + rw - rad, ry);
      c2d.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rad);
      c2d.lineTo(rx + rw, ry + rh - rad);
      c2d.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rad, ry + rh);
      c2d.lineTo(rx + rad, ry + rh);
      c2d.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rad);
      c2d.lineTo(rx, ry + rad);
      c2d.quadraticCurveTo(rx, ry, rx + rad, ry);
      c2d.closePath();
    };

    drawRoundedRect(ctx, 300, 170, 200, 36, 6);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = "#000000";
    ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    const dateFormatted = new Date(o.id).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    ctx.fillText(`Fecha:  ${dateFormatted}`, 400, 194);
    ctx.textAlign = "left";
    
    // 4. Title Banner Capsule
    ctx.fillStyle = "#000000";
    drawRoundedRect(ctx, 40, 230, 720, 40, 10);
    ctx.fill();
    
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(55, 250);
    ctx.lineTo(105, 250);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(695, 250);
    ctx.lineTo(745, 250);
    ctx.stroke();
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HOJA DE RECEPCIÓN DE VEHÍCULO", 400, 256);
    ctx.textAlign = "left";
    
    // 5. Metadata section
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(400, 300);
    ctx.lineTo(400, 470);
    ctx.stroke();
    
    ctx.fillStyle = "#000000";
    ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("DATOS DEL CLIENTE", 50, 312);
    ctx.fillText("DETALLES DEL VEHÍCULO", 420, 312);
    
    const drawMetaRow = (c2d, iconType, label, value, startX, startY, lineStartXOffset = 130) => {
      c2d.beginPath();
      c2d.arc(startX + 12, startY + 4, 12, 0, Math.PI * 2);
      c2d.fillStyle = "#f59e0b";
      c2d.fill();
      
      c2d.fillStyle = "#000000";
      c2d.strokeStyle = "#000000";
      c2d.lineWidth = 1.5;
      const cx = startX + 12;
      const cy = startY + 4;
      if (iconType === "user") {
        c2d.beginPath();
        c2d.arc(cx, cy - 3, 3, 0, Math.PI * 2);
        c2d.fill();
        c2d.beginPath();
        c2d.arc(cx, cy + 8, 6, Math.PI, Math.PI * 2);
        c2d.fill();
      } else if (iconType === "phone") {
        c2d.lineWidth = 2.5;
        c2d.lineCap = "round";
        c2d.beginPath();
        c2d.arc(cx - 2, cy + 2, 4, Math.PI * 1.0, Math.PI * 1.6);
        c2d.stroke();
      } else if (iconType === "money") { // Fuel pump
        c2d.strokeRect(cx - 4, cy - 4, 8, 10);
        c2d.fillRect(cx - 2, cy - 6, 4, 2);
        c2d.beginPath();
        c2d.arc(cx + 4, cy + 1, 2, 0, Math.PI * 2);
        c2d.stroke();
      } else if (iconType === "car") {
        c2d.fillRect(cx - 6, cy, 12, 4);
        c2d.beginPath();
        c2d.arc(cx - 3, cy + 4, 2, 0, Math.PI * 2);
        c2d.arc(cx + 3, cy + 4, 2, 0, Math.PI * 2);
        c2d.fill();
        c2d.beginPath();
        c2d.moveTo(cx - 4, cy);
        c2d.lineTo(cx - 2, cy - 4);
        c2d.lineTo(cx + 2, cy - 4);
        c2d.lineTo(cx + 4, cy);
        c2d.closePath();
        c2d.stroke();
      } else if (iconType === "calendar") {
        c2d.strokeRect(cx - 5, cy - 4, 10, 8);
        c2d.fillRect(cx - 3, cy - 6, 2, 2);
        c2d.fillRect(cx + 1, cy - 6, 2, 2);
      } else if (iconType === "plate") {
        c2d.strokeRect(cx - 7, cy - 4, 14, 8);
        c2d.font = "bold 6px sans-serif";
        c2d.textAlign = "center";
        c2d.fillText("Q", cx, cy + 2);
        c2d.textAlign = "left";
      } else if (iconType === "speedometer") {
        c2d.beginPath();
        c2d.arc(cx, cy + 3, 7, Math.PI, Math.PI * 2);
        c2d.stroke();
        c2d.beginPath();
        c2d.moveTo(cx, cy + 3);
        c2d.lineTo(cx + 4, cy - 1);
        c2d.stroke();
      }
      
      c2d.fillStyle = "#374151";
      c2d.font = "14px 'Plus Jakarta Sans', sans-serif";
      c2d.fillText(label, startX + 35, startY + 8);
      
      const lineStartX = startX + lineStartXOffset;
      const lineEndX = startX + 330;
      c2d.strokeStyle = "#e5e7eb";
      c2d.lineWidth = 1;
      c2d.beginPath();
      c2d.moveTo(lineStartX, startY + 11);
      c2d.lineTo(lineEndX, startY + 11);
      c2d.stroke();
      
      c2d.fillStyle = "#111827";
      c2d.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
      
      // Truncate to prevent overlap
      const maxValWidth = lineEndX - lineStartX - 10;
      let displayValue = value;
      if (c2d.measureText(displayValue).width > maxValWidth) {
        while (displayValue.length > 0 && c2d.measureText(displayValue + "...").width > maxValWidth) {
          displayValue = displayValue.slice(0, -1);
        }
        displayValue += "...";
      }
      c2d.fillText(displayValue, lineStartX + 5, startY + 7);
    };

    drawMetaRow(ctx, "user", "Cliente:", o.cliente, 40, 335, 175);
    drawMetaRow(ctx, "phone", "Teléfono:", o.telefono || "S/N", 40, 375, 175);
    drawMetaRow(ctx, "money", "Combustible:", `${o.combustible ?? 50}%`, 40, 415, 175);
    
    const vehName = `${o.marca || ""} ${o.linea || ""}`.trim() || "N/A";
    drawMetaRow(ctx, "car", "Vehículo:", vehName, 410, 335);
    drawMetaRow(ctx, "calendar", "Modelo:", (o.anio || "N/A").toString(), 410, 375);
    drawMetaRow(ctx, "plate", "Placa:", o.placa || "N/A", 410, 415);
    const mileageFormatted = o.kilometraje ? parseInt(o.kilometraje).toLocaleString() : "N/A";
    drawMetaRow(ctx, "speedometer", "Kilometraje:", mileageFormatted, 410, 455);
    
    // 6. Motivos de Ingreso Box (Dynamic Height)
    const motiveY = 495;
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 40, motiveY, 720, motiveBoxHeight, 8);
    ctx.stroke();
    
    ctx.fillStyle = "#3b82f6";
    ctx.font = "bold 12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("MOTIVO DE INGRESO", 55, motiveY + 22);
    
    ctx.fillStyle = "#111827";
    ctx.font = "13px 'Plus Jakarta Sans', sans-serif";
    motifLines.forEach((line, lineIdx) => {
      ctx.fillText(line, 55, motiveY + 42 + (lineIdx * 18));
    });
    
    // 7. Checklist Table
    ctx.fillStyle = "#000000";
    ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("INVENTARIO Y CHECKLIST DE RECEPCIÓN", 40, checklistStart - 15);
    
    ctx.fillStyle = "#000000";
    ctx.fillRect(40, checklistStart, 720, 30);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("PUNTO DE INSPECCIÓN", 55, checklistStart + 19);
    ctx.textAlign = "center";
    ctx.fillText("ESTADO", 320, checklistStart + 19);
    ctx.textAlign = "left";
    ctx.fillText("OBSERVACIONES / OBSERVATION", 435, checklistStart + 19);
    
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(260, checklistStart); ctx.lineTo(260, checklistStart + 30);
    ctx.moveTo(380, checklistStart); ctx.lineTo(380, checklistStart + 30);
    ctx.stroke();
    
    let currentY = checklistStart + 30;
    defaultChecklistItems.forEach((item, index) => {
      if (index % 2 === 0) {
        ctx.fillStyle = "#ffffff";
      } else {
        ctx.fillStyle = "#f9fafb";
      }
      ctx.fillRect(40, currentY, 720, rowHeight);
      
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, currentY); ctx.lineTo(40, currentY + rowHeight);
      ctx.moveTo(260, currentY); ctx.lineTo(260, currentY + rowHeight);
      ctx.moveTo(380, currentY); ctx.lineTo(380, currentY + rowHeight);
      ctx.moveTo(760, currentY); ctx.lineTo(760, currentY + rowHeight);
      ctx.moveTo(40, currentY + rowHeight); ctx.lineTo(760, currentY + rowHeight);
      ctx.stroke();
      
      ctx.fillStyle = "#111827";
      ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(item.label, 55, currentY + 22);
      
      const checkVal = o.checklist?.[item.id] || { status: "Bueno", note: "" };
      const status = typeof checkVal === "object" ? checkVal.status : checkVal;
      const note = typeof checkVal === "object" ? checkVal.note : "";
      
      if (status === "Bueno") {
        ctx.fillStyle = "#10b981";
      } else if (status === "Regular") {
        ctx.fillStyle = "#f59e0b";
      } else {
        ctx.fillStyle = "#ef4444";
      }
      ctx.font = "bold 12px 'Plus Jakarta Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(status.toUpperCase(), 320, currentY + 22);
      
      ctx.fillStyle = "#4b5563";
      ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
      ctx.textAlign = "left";
      
      // Truncate note to fit column (350px max width)
      const maxNoteWidth = 760 - 395 - 15;
      let displayNote = note || "-";
      if (ctx.measureText(displayNote).width > maxNoteWidth) {
        while (displayNote.length > 0 && ctx.measureText(displayNote + "...").width > maxNoteWidth) {
          displayNote = displayNote.slice(0, -1);
        }
        displayNote += "...";
      }
      ctx.fillText(displayNote, 395, currentY + 22);
      
      currentY += rowHeight;
    });
    
    // 8. Warning Lights (Dynamic Line Wrap & Height)
    if (hasWarningLights) {
      const lightsY = checklistEnd + 30;
      ctx.fillStyle = "#000000";
      ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("🚨 TESTIGOS ACTIVOS AL INGRESO", 40, lightsY);
      
      let lx = 40;
      let ly = lightsY + 12;
      o.luces.forEach(l => {
        const lDef = warningLightsDef.find(item => item.id === l);
        const lText = lDef ? `${lDef.icon} ${lDef.label}` : l;
        
        ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
        const textWidth = ctx.measureText(lText).width + 16;
        
        if (lx + textWidth > 760) {
          lx = 40;
          ly += 32;
        }
        
        ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
        ctx.strokeStyle = "rgba(245, 158, 11, 0.3)";
        drawRoundedRect(ctx, lx, ly, textWidth, 24, 4);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = "#f59e0b";
        ctx.fillText(lText, lx + 8, ly + 16);
        
        lx += textWidth + 8;
      });
    }
    
    // 10. Footer Section Page 1
    const footerY = lightsEnd + 20;
    const footerHeight = page1End - footerY;
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, footerY, canvas.width, footerHeight);
    
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, footerY);
    ctx.lineTo(canvas.width, footerY);
    ctx.stroke();
    
    const drawFooterBadge = (c2d, iconType, text, cx, cy) => {
      c2d.fillStyle = "#f59e0b";
      c2d.beginPath();
      c2d.arc(cx, cy, 14, 0, Math.PI * 2);
      c2d.fill();
      
      c2d.strokeStyle = "#000000";
      c2d.fillStyle = "#000000";
      c2d.lineWidth = 1.5;
      if (iconType === "shield") {
        c2d.beginPath();
        c2d.moveTo(cx - 5, cy - 6);
        c2d.lineTo(cx + 5, cy - 6);
        c2d.lineTo(cx + 5, cy);
        c2d.quadraticCurveTo(cx + 5, cy + 6, cx, cy + 9);
        c2d.quadraticCurveTo(cx - 5, cy + 6, cx - 5, cy);
        c2d.closePath();
        c2d.stroke();
      } else if (iconType === "handshake") {
        c2d.beginPath();
        c2d.arc(cx - 3, cy, 3, 0, Math.PI * 2);
        c2d.arc(cx + 3, cy, 3, 0, Math.PI * 2);
        c2d.fill();
      } else if (iconType === "gear") {
        c2d.beginPath();
        c2d.arc(cx, cy, 4, 0, Math.PI * 2);
        c2d.stroke();
        for (let a = 0; a < 360; a += 60) {
          const rad = a * Math.PI / 180;
          c2d.fillRect(cx + Math.cos(rad) * 5 - 1.5, cy + Math.sin(rad) * 5 - 1.5, 3, 3);
        }
      } else if (iconType === "check") {
        c2d.beginPath();
        c2d.moveTo(cx - 4, cy);
        c2d.lineTo(cx - 1, cy + 3);
        c2d.lineTo(cx + 5, cy - 3);
        c2d.stroke();
      }
      
      c2d.fillStyle = "#ffffff";
      c2d.font = "bold 9px 'Plus Jakarta Sans', sans-serif";
      c2d.textAlign = "center";
      const words = text.split(" ");
      if (words.length > 1) {
        c2d.fillText(words.slice(0, Math.ceil(words.length / 2)).join(" "), cx, cy + 28);
        c2d.fillText(words.slice(Math.ceil(words.length / 2)).join(" "), cx, cy + 38);
      } else {
        c2d.fillText(text, cx, cy + 28);
      }
    };
    
    const badgeY = footerY + 35;
    drawFooterBadge(ctx, "shield", "CALIDAD GARANTIZADA", 100, badgeY);
    drawFooterBadge(ctx, "handshake", "EXPERIENCIA Y CONFIANZA", 300, badgeY);
    drawFooterBadge(ctx, "gear", "SERVICIO PROFESIONAL", 500, badgeY);
    drawFooterBadge(ctx, "check", "COMPROMISO CON NUESTROS CLIENTES", 700, badgeY);
    
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 24px 'Dancing Script', cursive";
    ctx.textAlign = "center";
    ctx.fillText("¡Gracias por confiar en Los Pits!", 400, footerY + 110);
    ctx.textAlign = "left";
    
    // Draw Page 2 if hasPhotos is true
    if (hasPhotos) {
      const page2Start = page1End;
      
      // 1. Visual Page Divider
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, page2Start, 800, 15);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, page2Start + 7);
      ctx.lineTo(800, page2Start + 7);
      ctx.stroke();

      // 2. Compact Page 2 Header Box
      const p2HeaderY = page2Start + 15;
      ctx.fillStyle = "#0a0c10";
      ctx.fillRect(0, p2HeaderY, 800, 80);
      
      // Slanted divider
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(540, p2HeaderY);
      ctx.lineTo(500, p2HeaderY + 80);
      ctx.stroke();

      // Brand Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px 'Orbitron', sans-serif";
      ctx.fillText("LOS PITS", 40, p2HeaderY + 48);
      
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 9px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("ANEXO DE FOTOS DE INGRESO DE VEHÍCULO", 40, p2HeaderY + 65);
      
      // Right metadata reference
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(`Placa: ${o.placa || "N/A"}`, 560, p2HeaderY + 35);
      
      let clientTrunc = o.cliente || "N/A";
      if (ctx.measureText(`Cliente: ${clientTrunc}`).width > 200) {
        while (ctx.measureText(`Cliente: ${clientTrunc}...`).width > 200 && clientTrunc.length > 0) {
          clientTrunc = clientTrunc.slice(0, -1);
        }
        clientTrunc += "...";
      }
      ctx.fillText(`Cliente: ${clientTrunc}`, 560, p2HeaderY + 55);

      // 3. Draw Photos Grid
      const photosStartY = p2HeaderY + 110;
      let px = 40;
      let py = photosStartY;
      
      loadedImages.forEach((img, index) => {
        if (img) {
          if (index > 0 && index % 2 === 0) {
            px = 40;
            py += 285;
          }
          // Border frame
          ctx.strokeStyle = "#e5e7eb";
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, 340, 255);
          
          // Draw proportionally
          drawImageProportional(ctx, img, px, py, 340, 255);
          px += 380;
        }
      });

      // 4. Page 2 Footer Section
      const p2FooterY = canvas.height - 100;
      ctx.fillStyle = "#0a0c10";
      ctx.fillRect(0, p2FooterY, canvas.width, 100);
      
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, p2FooterY);
      ctx.lineTo(canvas.width, p2FooterY);
      ctx.stroke();
      
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 18px 'Dancing Script', cursive";
      ctx.textAlign = "center";
      ctx.fillText("¡Gracias por confiar en Los Pits!", 400, p2FooterY + 60);
      ctx.textAlign = "left";
    }

    // Trigger PDF Download
    const dataURL = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF("p", "px", [800, canvas.height]);
    pdf.addImage(dataURL, "JPEG", 0, 0, 800, canvas.height);
    pdf.save(`Recepcion_${o.placa || "auto"}.pdf`);
  };

  const eliminarOrden = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar esta orden?")) {
      setOrdenes(ordenes.filter((o) => o.id !== id));
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Module Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Taller de Mecánica</h1>
          <p>
            {isWorker 
              ? `Panel de Trabajos Asignados a: ${usuarioActual.user}` 
              : "Gestión de reparaciones, diagnósticos y mecánicos."}
          </p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div style={isManager ? styles.managerGrid : styles.workerGrid}>
        
        {/* Left Column: Create Order Form (Only for Admin/Cajero) */}
        {isManager && (
          <div className="glass-panel" style={styles.formCard}>
            <div style={styles.formHeader}>
              <Plus size={20} color="var(--color-primary)" />
              <h3 style={styles.formTitle}>Nueva Orden de Reparación</h3>
            </div>
            
            <form onSubmit={crearOrden} style={styles.form}>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1.5 }}>
                  <label style={styles.label}>Cliente *</label>
                  <div style={styles.inputWrapper}>
                    <User size={18} style={styles.inputIcon} />
                    <input
                      placeholder="Nombre del cliente"
                      className="input-field"
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      onBlur={(e) => {
                        const nameVal = e.target.value.trim();
                        if (nameVal && !telefono) {
                          const match = (clientes || []).find(c => c.nombre?.toLowerCase().trim() === nameVal.toLowerCase());
                          if (match) {
                            const isSame = window.confirm(`Ya existe un cliente registrado con el nombre "${match.nombre}" (Tel: ${match.telefono}).\n\n¿Es la misma persona? (Si confirmas, se llenarán todos sus datos automáticamente)`);
                            if (isSame) {
                              setCliente(match.nombre || "");
                              setTelefono(match.telefono || "");
                              if (match.nit) setNit(match.nit);
                              if (match.nombreFacturacion) setNombreFacturacion(match.nombreFacturacion);
                            }
                          }
                        }
                      }}
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={{ ...styles.inputGroup, flex: 1, position: "relative" }}>
                  <label style={styles.label}>Teléfono</label>
                  <input
                    placeholder="Ej. 5544-3322"
                    className="input-field"
                    value={telefono}
                    onChange={(e) => handleTelefonoInput(e.target.value)}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      const match = (clientes || []).find(c => c.telefono === val);
                      if (match) {
                        setCliente(match.nombre || "");
                        if (match.nit) setNit(match.nit);
                        if (match.nombreFacturacion) setNombreFacturacion(match.nombreFacturacion);
                      }
                      setTimeout(() => setActiveFieldSuggestions(null), 200);
                    }}
                  />
                  {activeFieldSuggestions === "telefono" && suggestions.length > 0 && (
                    <ul className="suggestions-list">
                      {suggestions.map((s, idx) => (
                        <li 
                          key={idx} 
                          className="suggestion-item"
                          onMouseDown={() => selectClienteSuggestion(s)}
                        >
                          <strong>{s.nombre}</strong> - {s.telefono}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Optional billing data fields */}
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
                <div style={{ ...styles.inputGroup, flex: 2 }}>
                  <label style={styles.label}>Nombre de Facturación (Opcional)</label>
                  <input
                    placeholder="Ej. Juan López / Distribuidora XYZ"
                    className="input-field"
                    value={nombreFacturacion}
                    onChange={(e) => setNombreFacturacion(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1, position: "relative" }}>
                  <label style={styles.label}>Placa *</label>
                  <div style={styles.inputWrapper}>
                    <Car size={18} style={styles.inputIcon} />
                    <input
                      placeholder="P-123XYZ"
                      className="input-field"
                      value={placa}
                      onChange={(e) => handlePlacaInput(e.target.value)}
                      onBlur={() => setTimeout(() => setActiveFieldSuggestions(null), 200)}
                      style={styles.input}
                    />
                  </div>
                  {activeFieldSuggestions === "placa" && suggestions.length > 0 && (
                    <ul className="suggestions-list">
                      {suggestions.map((s, idx) => (
                        <li 
                          key={idx} 
                          className="suggestion-item"
                          onMouseDown={() => selectVehiculoSuggestion(s)}
                        >
                          <strong>{s.placa || "Sin Placa"}</strong> - {s.marca} {s.linea} ({s.color})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Marca *</label>
                  <input
                    placeholder="Toyota, Honda..."
                    className="input-field"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Línea *</label>
                  <input
                    placeholder="Hilux, Civic..."
                    className="input-field"
                    value={linea}
                    onChange={(e) => setLinea(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Año</label>
                  <input
                    type="number"
                    placeholder="2020"
                    className="input-field"
                    value={anio}
                    onChange={(e) => setAnio(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Color</label>
                  <input
                    placeholder="Gris, Rojo..."
                    className="input-field"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Kilometraje</label>
                  <input
                    type="number"
                    placeholder="120000"
                    className="input-field"
                    value={kilometraje}
                    onChange={(e) => setKilometraje(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1, position: "relative" }}>
                  <label style={styles.label}>Chasis / VIN</label>
                  <input
                    placeholder="Ej. 1HGCR2F8..."
                    className="input-field"
                    value={chasis}
                    onChange={(e) => handleChasisInput(e.target.value)}
                    onBlur={() => setTimeout(() => setActiveFieldSuggestions(null), 200)}
                    style={{ textTransform: "uppercase" }}
                  />
                  {activeFieldSuggestions === "chasis" && suggestions.length > 0 && (
                    <ul className="suggestions-list">
                      {suggestions.map((s, idx) => (
                        <li 
                          key={idx} 
                          className="suggestion-item"
                          onMouseDown={() => selectVehiculoSuggestion(s)}
                        >
                          <strong>{s.chasis}</strong> - {s.marca} {s.linea} ({s.placa || "Sin Placa"})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Nivel de Combustible Semicírculo interactivo */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nivel de Combustible</label>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%", padding: "10px 0" }}>
                  <div style={{ position: "relative", width: "120px", height: "65px", display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
                    <svg width="120" height="60" viewBox="0 0 100 50">
                      {/* Background Arc */}
                      <path
                        d="M 15 45 A 35 35 0 0 1 85 45"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="10"
                        strokeLinecap="round"
                      />
                      {/* Filled Arc */}
                      <path
                        d="M 15 45 A 35 35 0 0 1 85 45"
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray="110"
                        strokeDashoffset={110 - (110 * (combustible / 100))}
                        style={{ transition: "stroke-dashoffset 0.3s ease" }}
                      />
                      {/* Needle pointing to value */}
                      <line
                        x1="50"
                        y1="45"
                        x2={50 + 30 * Math.cos(((combustible / 100) * 180 - 180) * Math.PI / 180)}
                        y2={45 + 30 * Math.sin(((combustible / 100) * 180 - 180) * Math.PI / 180)}
                        stroke="#ef4444"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ transition: "all 0.3s ease" }}
                      />
                      {/* Center cap */}
                      <circle cx="50" cy="45" r="4" fill="#fff" />
                    </svg>
                    
                    {/* Text indicators */}
                    <span style={{ position: "absolute", left: "-5px", bottom: "5px", fontSize: "0.7rem", fontWeight: "bold", color: "var(--text-muted)" }}>V (Vacío)</span>
                    <span style={{ position: "absolute", right: "-5px", bottom: "5px", fontSize: "0.7rem", fontWeight: "bold", color: "var(--text-muted)" }}>Ll (Lleno)</span>
                    <span style={{ position: "absolute", bottom: "-15px", fontSize: "0.85rem", fontWeight: "800", color: "#fff" }}>{combustible}%</span>
                  </div>
                  
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={combustible}
                    onChange={(e) => setCombustible(parseInt(e.target.value))}
                    style={{ width: "100%", marginTop: "15px", accentColor: "var(--color-primary)", cursor: "pointer" }}
                  />
                </div>
              </div>

              {/* Luces de Advertencia del Tablero */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Luces de Advertencia en el Tablero</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%", justifyContent: "space-between", marginTop: "5px" }}>
                  {warningLightsList.map((light) => {
                    const isActive = luces.includes(light.id);
                    return (
                      <button
                        key={light.id}
                        type="button"
                        onClick={() => {
                          if (luces.includes(light.id)) {
                            setLuces(luces.filter(l => l !== light.id));
                          } else {
                            setLuces([...luces, light.id]);
                          }
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 4px",
                          borderRadius: "8px",
                          backgroundColor: isActive ? light.glow : "rgba(255, 255, 255, 0.02)",
                          border: `1px solid ${isActive ? light.color : "rgba(255, 255, 255, 0.1)"}`,
                          color: isActive ? "#fff" : "var(--text-muted)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          flex: 1,
                          minWidth: "60px"
                        }}
                      >
                        <span style={{ fontSize: "1.3rem", filter: isActive ? `drop-shadow(0 0 5px ${light.color})` : "grayscale(80%)" }}>
                          {light.icon}
                        </span>
                        <span style={{ fontSize: "0.62rem", fontWeight: "600", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>{light.label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Inline custom warning light adder */}
                <div style={{ display: "flex", gap: "8px", marginTop: "10px", alignItems: "center" }}>
                  <input
                    placeholder="Añadir Testigo (Ej. Freno de mano)"
                    id="custom-warning-label"
                    className="input-field"
                    style={{ flex: 1, padding: "8px 12px", fontSize: "0.85rem" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = e.target.value.trim();
                        if (val) {
                          const newId = `custom_${Date.now()}`;
                          setWarningLightsList([...warningLightsList, { id: newId, label: val, color: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)", icon: "⚠️" }]);
                          e.target.value = "";
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                    onClick={() => {
                      const inputEl = document.getElementById("custom-warning-label");
                      const val = inputEl?.value.trim();
                      if (val) {
                        const newId = `custom_${Date.now()}`;
                        setWarningLightsList([...warningLightsList, { id: newId, label: val, color: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)", icon: "⚠️" }]);
                        inputEl.value = "";
                      }
                    }}
                  >
                    ➕ Testigo
                  </button>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Mecánico Asignado (Opcional)</label>
                <div style={styles.inputWrapper}>
                  <UserCheck size={18} style={styles.inputIcon} />
                  <select
                    className="select-field"
                    value={mecanico}
                    onChange={(e) => setMecanico(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Seleccionar mecánico (Opcional)</option>
                    {mecanicos.map((m, i) => (
                      <option key={i} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", marginBottom: "15px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  id="cajeroComisionApplies"
                  checked={cajeroComisionApplies}
                  onChange={(e) => setCajeroComisionApplies(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--color-primary)", cursor: "pointer" }}
                />
                <label htmlFor="cajeroComisionApplies" style={{ ...styles.label, margin: 0, cursor: "pointer", fontSize: "0.85rem" }}>
                  Comisión de cajero aplica sobre la mano de obra
                </label>
              </div>

              {/* Multiple Motives Tags Editor */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Motivos de ingreso * (Agrega al menos uno)</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    placeholder="Ej. Cambio de pastillas de frenos, Ruido en motor"
                    className="input-field"
                    value={inputMotivo}
                    onChange={(e) => setInputMotivo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (inputMotivo.trim()) {
                          setMotivosIngreso([...motivosIngreso, inputMotivo.trim()]);
                          setInputMotivo("");
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (inputMotivo.trim()) {
                        setMotivosIngreso([...motivosIngreso, inputMotivo.trim()]);
                        setInputMotivo("");
                      }
                    }}
                    style={{ padding: "0 15px" }}
                  >
                    +
                  </button>
                </div>
                {motivosIngreso.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                    {motivosIngreso.map((m, idx) => (
                      <span key={idx} className="badge badge-process" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", textTransform: "none" }}>
                        {m}
                        <button
                          type="button"
                          onClick={() => setMotivosIngreso(motivosIngreso.filter((_, i) => i !== idx))}
                          style={{ background: "none", border: "none", color: "var(--color-warning)", cursor: "pointer", fontWeight: "bold", padding: 0 }}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Checklist 12 Puntos */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Checklist / Inventario de Recepción (12 Puntos)</label>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.05)"
                }}>
                  {defaultChecklistItems.map((item) => {
                    const currentVal = checklist[item.id] || { status: "Bueno", note: "" };
                    const statusVal = typeof currentVal === "object" ? currentVal.status : currentVal;
                    const noteVal = typeof currentVal === "object" ? currentVal.note : "";
                    
                    return (
                      <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: "6px", borderBottom: "1px solid rgba(255, 255, 255, 0.03)", paddingBottom: "10px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "0.8rem", color: "#fff", fontWeight: "600" }}>{item.label}</span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {["Bueno", "Regular", "Malo"].map((option) => {
                            const isSel = statusVal === option;
                            let activeBg = "rgba(255,255,255,0.03)";
                            let activeColor = "var(--text-muted)";
                            let borderC = "rgba(255,255,255,0.05)";
                            if (isSel) {
                              if (option === "Bueno") {
                                activeBg = "rgba(16, 185, 129, 0.2)";
                                activeColor = "var(--color-success)";
                                borderC = "rgba(16, 185, 129, 0.4)";
                              } else if (option === "Regular") {
                                activeBg = "rgba(245, 158, 11, 0.2)";
                                activeColor = "var(--color-warning)";
                                borderC = "rgba(245, 158, 11, 0.4)";
                              } else if (option === "Malo") {
                                activeBg = "rgba(239, 68, 68, 0.2)";
                                activeColor = "var(--color-danger)";
                                borderC = "rgba(239, 68, 68, 0.4)";
                              }
                            }
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setChecklist({ 
                                  ...checklist, 
                                  [item.id]: { 
                                    ...(typeof currentVal === "object" ? currentVal : { note: "" }), 
                                    status: option 
                                  } 
                                })}
                                style={{
                                  flex: 1,
                                  padding: "6px 4px",
                                  fontSize: "0.68rem",
                                  fontWeight: "700",
                                  borderRadius: "4px",
                                  backgroundColor: activeBg,
                                  border: `1px solid ${borderC}`,
                                  color: activeColor,
                                  cursor: "pointer",
                                  transition: "all 0.2s ease"
                                }}
                              >
                                {option === "Bueno" ? "🟢 Bueno" : option === "Regular" ? "🟡 Regular" : "🔴 Malo"}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          type="text"
                          placeholder="Nota / Especificación..."
                          className="input-field"
                          value={noteVal}
                          onChange={(e) => setChecklist({
                            ...checklist,
                            [item.id]: {
                              ...(typeof currentVal === "object" ? currentVal : { status: "Bueno" }),
                              note: e.target.value
                            }
                          })}
                          style={{
                            height: "28px",
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            marginTop: "2px",
                            backgroundColor: "rgba(0,0,0,0.2)"
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Precio Presupuesto (Q) (Opcional)</label>
                <div style={styles.inputWrapper}>
                  <Coins size={18} style={styles.inputIcon} />
                  <input
                    type="number"
                    placeholder="Q 0.00"
                    className="input-field"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    style={styles.input}
                    min="0"
                    step="any"
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Fotos de Recepción</label>
                <div style={styles.photoUploadContainer}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    style={{ display: "none" }}
                    id="taller-photos-input"
                  />
                  <label htmlFor="taller-photos-input" className="btn btn-ghost" style={styles.photoUploadLabel}>
                    📸 Seleccionar Fotos
                  </label>
                  {fotos.length > 0 && (
                    <div style={styles.photoPreviewsGrid}>
                      {fotos.map((f, i) => (
                        <div key={i} style={styles.previewImageWrapper}>
                          <img src={f} alt="Preview" style={styles.previewImage} />
                          <button type="button" onClick={() => removePhoto(i)} style={styles.previewRemoveBtn}>
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={styles.submitBtn}>
                <Wrench size={18} />
                Ingresar Vehículo
              </button>
            </form>
          </div>
        )}

        {/* Right Column: Search and Interactive List */}
        <div style={styles.listColumn}>
          {/* Search Box */}
          <div className="glass-panel" style={styles.searchCard}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por cliente, vehículo o mecánico..."
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* List Area */}
          <div style={styles.orderListContainer}>
            {filteredOrdenes.length === 0 ? (
              <div className="glass-panel" style={styles.emptyState}>
                <Wrench size={48} color="var(--text-muted)" style={{ marginBottom: "16px", opacity: 0.4 }} />
                <h3>No hay órdenes encontradas</h3>
                <p>Usa el formulario para agregar una o ajusta los criterios de búsqueda.</p>
              </div>
            ) : (
              <div style={styles.gridList}>
                {filteredOrdenes.map((o) => (
                  <div className="glass-panel" key={o.id} style={styles.orderCard}>
                    {/* Top Row: Client & Badges */}
                    <div style={styles.cardHeader}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h4 style={styles.clientName}>{o.cliente}</h4>
                          {usuarioActual?.rol === "admin" && (
                            <button
                              onClick={() => setEditingEntryOrder({ ...o, motivoIngreso: o.motivoIngreso || o.trabajo || "" })}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                padding: "4px",
                                borderRadius: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                              }}
                              className="card-edit-btn"
                              title="Editar datos de ingreso"
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                        </div>
                        <p style={styles.vehicleText}>{o.vehiculo}</p>
                      </div>
                      <span className="badge" style={getStatusStyle(o.estado)}>
                        {o.estado !== "Entregado" && o.estado !== "Listo para entrega" && <Clock size={12} style={{ marginRight: "4px" }} />}
                        {o.estado}
                      </span>
                    </div>

                    {/* Middle Row: Assignee, Prices */}
                    <div style={styles.cardBody}>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>📋 Motivo:</span>
                        <span style={{ ...styles.infoVal, textAlign: "right", maxWidth: "60%", wordBreak: "break-word" }}>{o.motivoIngreso || o.trabajo || "Sin descripción"}</span>
                      </div>
                      
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>🔧 Mecánico:</span>
                        {o.mecanico ? (
                          isManager ? (
                            <select
                              value={o.mecanico}
                              onChange={(e) => asignarMecanico(o.id, e.target.value)}
                              className="select-field"
                              style={{
                                padding: "2px 6px",
                                fontSize: "0.8rem",
                                width: "auto",
                                height: "26px",
                                backgroundColor: "rgba(20, 24, 33, 0.9)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "4px",
                                color: "#fff",
                                margin: 0
                              }}
                            >
                              {!mecanicos.includes(o.mecanico) && (
                                <option value={o.mecanico}>{o.mecanico}</option>
                              )}
                              {mecanicos.map((m, i) => (
                                <option key={i} value={m}>{m}</option>
                              ))}
                            </select>
                          ) : (
                            <span style={styles.infoVal}>{o.mecanico}</span>
                          )
                        ) : (
                          isManager ? (
                            <select
                              value=""
                              onChange={(e) => asignarMecanico(o.id, e.target.value)}
                              className="select-field"
                              style={{
                                padding: "2px 6px",
                                fontSize: "0.8rem",
                                width: "auto",
                                height: "26px",
                                backgroundColor: "rgba(20, 24, 33, 0.9)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                borderRadius: "4px",
                                color: "var(--color-danger)",
                                margin: 0
                              }}
                            >
                              <option value="">⚠️ Asignar...</option>
                              {mecanicos.map((m, i) => (
                                <option key={i} value={m}>{m}</option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ ...styles.infoVal, color: "var(--color-danger)" }}>⚠️ Sin asignar</span>
                          )
                        )}
                      </div>

                      {o.telefono && (
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>📞 Teléfono:</span>
                          <span style={styles.infoVal}>{o.telefono}</span>
                        </div>
                      )}

                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>🚗 Info Auto:</span>
                        <span style={styles.infoVal}>
                          {[o.color, o.anio].filter(Boolean).join(" - ") || "Sin datos"}
                        </span>
                      </div>

                      {o.kilometraje && (
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>🛣️ Kilometraje:</span>
                          <span style={styles.infoVal}>{parseInt(o.kilometraje).toLocaleString()} Km</span>
                        </div>
                      )}

                      {/* Mini Fuel Indicator */}
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>⛽ Combustible:</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "60px", height: "6px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${o.combustible ?? 50}%`, height: "100%", backgroundColor: (o.combustible ?? 50) < 20 ? "var(--color-danger)" : "var(--color-primary)" }} />
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: "bold" }}>{o.combustible ?? 50}%</span>
                        </div>
                      </div>

                      {/* Miniature active warning lights */}
                      {o.luces && o.luces.length > 0 && (
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>⚠️ Alertas:</span>
                          <div style={{ display: "flex", gap: "4px" }}>
                            {o.luces.map((luzId) => {
                              const luzDef = warningLightsDef.find(l => l.id === luzId);
                              return luzDef ? (
                                <span
                                  key={luzId}
                                  title={luzDef.label}
                                  style={{
                                    fontSize: "0.95rem",
                                    filter: `drop-shadow(0 0 2px ${luzDef.color})`
                                  }}
                                >
                                  {luzDef.icon}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Real-time Taller Washers Sync */}
                      {(o.estado === "En proceso de lavado" || o.estado === "Listo para entrega" || o.estado === "Entregado") && (() => {
                        const linkedWashes = carwash.filter(c => c.tallerOrderId === o.id);
                        const assignedWashers = [];
                        linkedWashes.forEach(w => {
                          const washers = w.lavadores || (w.lavador ? w.lavador.split(", ").filter(Boolean) : []);
                          washers.forEach(was => {
                            if (!assignedWashers.includes(was)) {
                              assignedWashers.push(was);
                            }
                          });
                        });
                        return (
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>🧼 Lavador(es):</span>
                            <span style={{ ...styles.infoVal, color: assignedWashers.length > 0 ? "#fff" : "var(--color-warning)" }}>
                              {assignedWashers.length > 0 ? assignedWashers.join(", ") : "⚠️ Esperando en Carwash"}
                            </span>
                          </div>
                        );
                      })()}

                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>💰 Total Trabajo:</span>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <span style={o.total > 0 ? styles.infoValTotal : { ...styles.infoVal, color: "var(--color-warning)", fontWeight: "bold" }}>
                            {o.total > 0 ? formatMoney(o.total) : "Pendiente de presupuesto"}
                          </span>
                          {/* Button to edit budget detailed items */}
                          {o.estado !== "Entregado" && (isManager || isWorker) && (
                            <button
                              type="button"
                              onClick={() => {
                                setBudgetModalOrder(o);
                                setCurrentBudget(o.presupuesto || { labor: [], parts: [], services: [], discount: 0, insumos: [], tools: [] });
                                setInputDiscount(o.presupuesto?.discount?.toString() || "0");
                                setDiagnosticPhotos((o.fotosDiagnostico || []).map(f => typeof f === 'string' ? { base64: f, comment: '' } : f));
                                setBudgetCajeroComisionApplies(o.cajeroComisionApplies !== false);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--color-primary)",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                padding: "2px 0 0 0",
                                textDecoration: "underline"
                              }}
                            >
                              {o.total > 0 ? "✏️ Editar Presupuesto" : "📋 Crear Presupuesto"}
                            </button>
                          )}
                          {o.total > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                              <button
                                type="button"
                                onClick={() => setPresupuestoFormalOrder(o)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--color-secondary)",
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                  padding: "2px 0 0 0",
                                  textDecoration: "underline",
                                  fontWeight: "bold"
                                }}
                              >
                                📄 Ver Presupuesto Formal
                              </button>
                              <span style={{
                                fontSize: "0.7rem",
                                fontWeight: "800",
                                color: o.diagnosticoAutorizado ? "var(--color-success)" : "var(--color-warning)",
                                marginTop: "3px"
                              }}>
                                {o.diagnosticoAutorizado ? "✅ Presupuesto Autorizado" : "⚠️ Pendiente Autorización"}
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setRecepcionFormalOrder(o)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--color-info)",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                              padding: "2px 0 0 0",
                              textDecoration: "underline",
                              fontWeight: "bold",
                              marginTop: "4px"
                            }}
                          >
                            📋 Ver Hoja de Recepción
                          </button>
                        </div>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>🪙 Comisión (10%):</span>
                        <span style={o.total > 0 ? styles.infoValCom : styles.infoVal}>
                          {o.total > 0 ? formatMoney(o.comision) : "Pendiente"}
                        </span>
                      </div>
                      
                      {/* Alerta de Repuestos Faltantes */}
                      {(() => {
                        const AUTHORIZED_STATUSES = [
                          "En proceso de reparación",
                          "En período de prueba y control de calidad",
                          "En proceso de lavado",
                          "Listo para entrega"
                        ];
                        if (!(o.diagnosticoAutorizado || AUTHORIZED_STATUSES.includes(o.estado)) || o.estado === "Entregado") return null;
                        
                        const missingParts = [];
                        if (o.presupuesto && o.presupuesto.parts) {
                          o.presupuesto.parts.forEach(part => {
                            const invItem = (workshopInventory || []).find(inv => 
                              (part.code && inv.code && inv.code.toUpperCase().trim() === part.code.toUpperCase().trim()) || 
                              (inv.name || "").toLowerCase().trim() === (part.desc || "").toLowerCase().trim()
                            );
                            const stock = invItem ? invItem.quantity : 0;
                            if (part.qty > stock) {
                              missingParts.push({
                                name: part.desc,
                                brand: part.brand || (invItem ? invItem.brand : ""),
                                needed: part.qty,
                                stock: stock,
                                missingQty: part.qty - stock
                              });
                            }
                          });
                        }

                        if (missingParts.length === 0) return null;

                        return (
                          <div style={{
                            marginTop: "12px",
                            padding: "10px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(239, 68, 68, 0.08)",
                            border: "1px solid rgba(239, 68, 68, 0.25)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px"
                          }}>
                            <span style={{ 
                              fontSize: "0.78rem", 
                              color: "var(--color-danger)", 
                              fontWeight: "700", 
                              display: "flex", 
                              alignItems: "center", 
                              gap: "4px" 
                            }}>
                              ⚠️ Faltan Repuestos en Bodega:
                            </span>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {missingParts.map((item, idx) => (
                                <div key={idx} style={{ fontSize: "0.75rem", color: "#fff", display: "flex", justifyContent: "space-between" }}>
                                  <span>
                                    • {item.name} {item.brand ? `(${item.brand})` : ""}
                                  </span>
                                  <span style={{ color: "var(--color-danger)", fontWeight: "bold" }}>
                                    Faltan {item.missingQty} ud(s) (Stock: {item.stock}/{item.needed})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {o.fotos && o.fotos.length > 0 && (
                        <div style={{ marginTop: "8px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>📸 Fotos de Recepción:</span>
                          <div style={styles.cardPhotosGrid}>
                            {o.fotos.map((foto, idx) => (
                              <img 
                                key={idx} 
                                src={foto} 
                                alt={`Trabajo ${idx + 1}`} 
                                style={styles.cardPhotoThumbnail} 
                                onClick={() => setSelectedFullPhoto(foto)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {o.fotosDiagnostico && o.fotosDiagnostico.length > 0 && (
                        <div style={{ marginTop: "8px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>📸 Fotos de Diagnóstico:</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {o.fotosDiagnostico.map((foto, idx) => {
                              const base64 = typeof foto === "string" ? foto : foto.base64;
                              const comment = typeof foto === "object" && foto ? foto.comment : "";
                              return (
                                <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
                                  <img 
                                    src={base64} 
                                    alt={`Diagnóstico ${idx + 1}`} 
                                    style={styles.cardPhotoThumbnail} 
                                    onClick={() => setSelectedFullPhoto(base64)}
                                  />
                                  {comment && (
                                    <span 
                                      style={{ fontSize: "0.65rem", color: "var(--text-muted)", maxWidth: "60px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} 
                                      title={comment}
                                    >
                                      {comment}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Row: Action Buttons */}
                    <div style={styles.cardFooter}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                        <div style={{ display: "flex", gap: "8px", width: "100%", alignItems: "center" }}>
                          {/* Dropdown Selector */}
                          <select
                            value={o.estado}
                            onChange={(e) => cambiarEstado(o.id, e.target.value)}
                            className="select-field"
                            style={{
                              flex: 1.2,
                              padding: "8px 12px",
                              fontSize: "0.85rem",
                              backgroundColor: "rgba(20, 24, 33, 0.9)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "8px",
                              color: "#fff",
                              height: "38px"
                            }}
                            disabled={isWorker && (o.estado === "Listo para entrega" || o.estado === "Entregado")}
                          >
                            {TALLER_STATUSES.map((status) => (
                              <option key={status} value={status} style={{ backgroundColor: "var(--bg-surface)", color: "#fff" }}>
                                {status}
                              </option>
                            ))}
                          </select>

                          {/* Action Button */}
                          {o.estado !== "Entregado" && (
                            o.estado === "En proceso de lavado" ? (
                              <button
                                className="btn btn-ghost"
                                style={{ ...styles.cardActionBtn, flex: 1.8, height: "38px", padding: "0 10px", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", borderColor: "var(--border-glass)", color: "var(--text-muted)", cursor: "not-allowed" }}
                                disabled
                              >
                                <Clock size={14} style={{ marginRight: "4px" }} />
                                <span style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>🚿 Lavándose en Carwash</span>
                              </button>
                            ) : o.estado === "En proceso de diagnóstico y presupuesto" && o.total === 0 ? (
                              <button
                                onClick={() => {
                                  setBudgetModalOrder(o);
                                  setCurrentBudget(o.presupuesto || { labor: [], parts: [], services: [], discount: 0, insumos: [], tools: [] });
                                  setInputDiscount(o.presupuesto?.discount?.toString() || "0");
                                  setBudgetCajeroComisionApplies(o.cajeroComisionApplies !== false);
                                }}
                                className="btn btn-warning-glow"
                                style={{ ...styles.cardActionBtn, flex: 1.8, height: "38px", padding: "0 10px", margin: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                              >
                                <CheckCircle size={14} />
                                <span style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>📋 Crear Presupuesto</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => avanzarOrden(o.id)}
                                className={`btn ${
                                  o.estado === "Listo para entrega" 
                                    ? "btn-success-glow" 
                                    : "btn-warning-glow"
                                }`}
                                style={{ ...styles.cardActionBtn, flex: 1.8, height: "38px", padding: "0 10px", margin: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                                disabled={isWorker && o.estado === "Listo para entrega"}
                              >
                                <CheckCircle size={14} />
                                <span style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>{getButtonLabel(o.estado)}</span>
                              </button>
                            )
                          )}

                          {/* Delete button (Only Admin/Cajero can delete) */}
                          {isManager && (
                            <button
                              onClick={() => eliminarOrden(o.id)}
                              className="btn-delete"
                              style={{ ...styles.deleteBtn, height: "38px", width: "38px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}
                              title="Eliminar Orden"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        {o.estado !== "Entregado" && (
                          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickAddOrder(o);
                                setQuickType("part");
                                setQuickDesc("");
                                setQuickQty("1");
                                setQuickCost("");
                                setQuickPrice("");
                                setQuickSuggestions([]);
                                setQuickShowSuggestions(false);
                              }}
                              className="btn btn-ghost"
                              style={{ 
                                flex: 1, 
                                height: "34px", 
                                fontSize: "0.8rem", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                gap: "6px",
                                border: "1px solid var(--color-primary)",
                                color: "var(--color-primary)",
                                borderRadius: "8px",
                                cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                            >
                              <Plus size={14} />
                              <span>⚙️ Cargar Repuesto / Insumo / Servicio</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedFullPhoto && createPortal(
        <div style={styles.lightbox} onClick={() => setSelectedFullPhoto(null)}>
          <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img src={selectedFullPhoto} alt="Vista Completa" style={styles.lightboxImage} />
            <button style={styles.lightboxCloseBtn} onClick={() => setSelectedFullPhoto(null)}>&times;</button>
          </div>
        </div>,
        document.body
      )}

      {/* Detailed Budget Modal Overlay */}
      {budgetModalOrder && createPortal(
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#fff" }}>
                Elaborar Presupuesto: {budgetModalOrder.cliente}
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                {budgetModalOrder.vehiculo}
              </p>
            </div>

            <div style={styles.modalBody}>
              {/* 🛠️ Mano de Obra */}
              <div style={styles.budgetSection}>
                <h3 style={styles.budgetSecTitle}>🛠️ Mano de Obra</h3>
                <div style={styles.budgetInputRow}>
                  <input
                    placeholder="Descripción del trabajo (ej. Rectificación culata)"
                    className="input-field"
                    value={inputLaborDesc}
                    onChange={(e) => setInputLaborDesc(e.target.value)}
                    style={{ flex: 3 }}
                  />
                  {!isWorker && (
                    <input
                      type="number"
                      placeholder="Q 0"
                      className="input-field"
                      value={inputLaborPrice}
                      onChange={(e) => setInputLaborPrice(e.target.value)}
                      style={{ flex: 1.2 }}
                    />
                  )}
                  <button type="button" className="btn btn-primary" onClick={addLaborItem} style={{ padding: "0 15px", height: "42px" }}>
                    +
                  </button>
                </div>
                <ul style={styles.budgetList}>
                  {(currentBudget.labor || []).map((item, idx) => (
                    <li key={idx} style={styles.budgetItem}>
                      <span>{item.desc}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {!isWorker ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Q</span>
                            <input
                              type="number"
                              value={item.price !== undefined ? item.price : ""}
                              placeholder="0.00"
                              onChange={(e) => {
                                const val = e.target.value;
                                setCurrentBudget(prev => {
                                  const laborCopy = [...prev.labor];
                                  laborCopy[idx] = { ...laborCopy[idx], price: val === "" ? "" : parseFloat(val) };
                                  return { ...prev, labor: laborCopy };
                                });
                              }}
                              style={{
                                width: "80px",
                                height: "28px",
                                padding: "2px 6px",
                                fontSize: "0.85rem",
                                backgroundColor: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "6px",
                                color: "#fff",
                                textAlign: "right"
                              }}
                            />
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>(Precio Oculto)</span>
                        )}
                        <button type="button" onClick={() => deleteLaborItem(idx)} style={styles.btnDeleteBudget}>&times;</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ⚙️ Repuestos */}
              <div style={styles.budgetSection}>
                <h3 style={styles.budgetSecTitle}>⚙️ Repuestos</h3>
                <div style={styles.budgetInputRow}>
                  <div style={{ position: "relative", flex: 2, display: "flex" }}>
                    <input
                      placeholder="Nombre del repuesto (ej. Pastillas de freno)"
                      className="input-field"
                      value={inputPartDesc}
                      onChange={(e) => {
                        setInputPartDesc(e.target.value);
                        setShowPartSuggestions(true);
                      }}
                      onFocus={() => setShowPartSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowPartSuggestions(false), 250)}
                      style={{ width: "100%" }}
                    />
                    {showPartSuggestions && partSuggestions.length > 0 && (
                      <div style={styles.suggestionsContainer}>
                        {partSuggestions.map((item, idx) => (
                          <div 
                            key={idx}
                            style={styles.suggestionItem}
                            onMouseDown={() => {
                              setInputPartDesc(item.name);
                              if (!isWorker) {
                                setInputPartPurchasePrice(item.purchasePrice.toString());
                                setInputPartSalePrice(item.salePrice.toString());
                              }
                              setShowPartSuggestions(false);
                            }}
                          >
                            <div style={{ fontWeight: "700", color: "#fff", fontSize: "0.85rem" }}>
                              {item.code} - {item.name} {item.brand ? `(${item.brand})` : ""}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              Stock: {item.quantity} | Presentación: {item.presentation || "Unidad"} | Marca: {item.brand || "N/A"}{!isWorker && ` | Venta: ${formatMoney(item.salePrice)}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="Cant."
                    className="input-field"
                    value={inputPartQty}
                    onChange={(e) => setInputPartQty(e.target.value)}
                    style={{ width: "75px" }}
                    min="1"
                  />
                  {!isWorker && (
                    <>
                      <input
                        type="number"
                        placeholder="Costo Q"
                        className="input-field"
                        value={inputPartPurchasePrice}
                        onChange={(e) => setInputPartPurchasePrice(e.target.value)}
                        style={{ flex: 0.9 }}
                        min="0"
                      />
                      <input
                        type="number"
                        placeholder="Venta Q"
                        className="input-field"
                        value={inputPartSalePrice}
                        onChange={(e) => setInputPartSalePrice(e.target.value)}
                        style={{ flex: 0.9 }}
                        min="0"
                      />
                    </>
                  )}
                  <button type="button" className="btn btn-primary" onClick={addPartItem} style={{ padding: "0 15px", height: "42px" }}>
                    +
                  </button>
                </div>
                <ul style={styles.budgetList}>
                  {(currentBudget.parts || []).map((item, idx) => (
                    <li key={idx} style={styles.budgetItem}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span><strong>{item.qty}x</strong> {item.desc} {item.brand ? `(${item.brand})` : ""}</span>
                        {!isWorker ? (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                            <span>Costo Q: 
                              <input
                                type="number"
                                value={item.purchasePrice !== undefined ? item.purchasePrice : ""}
                                placeholder="0.00"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCurrentBudget(prev => {
                                    const partsCopy = [...prev.parts];
                                    partsCopy[idx] = { ...partsCopy[idx], purchasePrice: val === "" ? "" : parseFloat(val) };
                                    return { ...prev, parts: partsCopy };
                                  });
                                }}
                                style={{
                                  width: "70px",
                                  height: "24px",
                                  padding: "2px 6px",
                                  fontSize: "0.78rem",
                                  backgroundColor: "rgba(0,0,0,0.3)",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                  borderRadius: "6px",
                                  color: "#fff",
                                  textAlign: "right",
                                  marginLeft: "4px"
                                }}
                              />
                            </span>
                            <span>Venta Q: 
                              <input
                                type="number"
                                value={item.salePrice !== undefined ? item.salePrice : ""}
                                placeholder="0.00"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCurrentBudget(prev => {
                                    const partsCopy = [...prev.parts];
                                    const parsedVal = val === "" ? "" : parseFloat(val);
                                    partsCopy[idx] = { ...partsCopy[idx], salePrice: parsedVal, price: parsedVal };
                                    return { ...prev, parts: partsCopy };
                                  });
                                }}
                                style={{
                                  width: "70px",
                                  height: "24px",
                                  padding: "2px 6px",
                                  fontSize: "0.78rem",
                                  backgroundColor: "rgba(0,0,0,0.3)",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                  borderRadius: "6px",
                                  color: "#fff",
                                  textAlign: "right",
                                  marginLeft: "4px"
                                }}
                              />
                            </span>
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(Precios Ocultos)</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {!isWorker && (
                          <strong style={{ color: "var(--color-primary)" }}>
                            Sub: {formatMoney(item.qty * (parseFloat(item.salePrice) || 0))}
                          </strong>
                        )}
                        <button type="button" onClick={() => deletePartItem(idx)} style={styles.btnDeleteBudget}>&times;</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 🧪 Insumos */}
              <div style={styles.budgetSection}>
                <h3 style={styles.budgetSecTitle}>🧪 Insumos</h3>
                <div style={styles.budgetInputRow}>
                  <input
                    placeholder="Descripción del insumo (ej. Silicona / W40)"
                    className="input-field"
                    value={inputInsumoDesc}
                    onChange={(e) => setInputInsumoDesc(e.target.value)}
                    style={{ flex: 3 }}
                  />
                  <input
                    type="number"
                    placeholder="Cant."
                    className="input-field"
                    value={inputInsumoQty}
                    onChange={(e) => setInputInsumoQty(e.target.value)}
                    style={{ width: "75px" }}
                    min="1"
                  />
                  {!isWorker && (
                    <>
                      <input
                        type="number"
                        placeholder="Costo Q"
                        className="input-field"
                        value={inputInsumoPurchasePrice}
                        onChange={(e) => setInputInsumoPurchasePrice(e.target.value)}
                        style={{ flex: 0.9 }}
                        min="0"
                      />
                      <input
                        type="number"
                        placeholder="Venta Q"
                        className="input-field"
                        value={inputInsumoSalePrice}
                        onChange={(e) => setInputInsumoSalePrice(e.target.value)}
                        style={{ flex: 0.9 }}
                        min="0"
                      />
                    </>
                  )}
                  <button type="button" className="btn btn-primary" onClick={addInsumoItem} style={{ padding: "0 15px", height: "42px" }}>
                    +
                  </button>
                </div>
                <ul style={styles.budgetList}>
                  {(currentBudget.insumos || []).map((item, idx) => (
                    <li key={idx} style={styles.budgetItem}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span><strong>{item.qty}x</strong> {item.desc}</span>
                        {!isWorker ? (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                            <span>Costo Q: 
                              <input
                                type="number"
                                value={item.purchasePrice !== undefined ? item.purchasePrice : ""}
                                placeholder="0.00"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCurrentBudget(prev => {
                                    const insumosCopy = [...prev.insumos];
                                    insumosCopy[idx] = { ...insumosCopy[idx], purchasePrice: val === "" ? "" : parseFloat(val) };
                                    return { ...prev, insumos: insumosCopy };
                                  });
                                }}
                                style={{
                                  width: "70px",
                                  height: "24px",
                                  padding: "2px 6px",
                                  fontSize: "0.78rem",
                                  backgroundColor: "rgba(0,0,0,0.3)",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                  borderRadius: "6px",
                                  color: "#fff",
                                  textAlign: "right",
                                  marginLeft: "4px"
                                }}
                              />
                            </span>
                            <span>Venta Q: 
                              <input
                                type="number"
                                value={item.salePrice !== undefined ? item.salePrice : ""}
                                placeholder="0.00"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCurrentBudget(prev => {
                                    const insumosCopy = [...prev.insumos];
                                    insumosCopy[idx] = { ...insumosCopy[idx], salePrice: val === "" ? "" : parseFloat(val) };
                                    return { ...prev, insumos: insumosCopy };
                                  });
                                }}
                                style={{
                                  width: "70px",
                                  height: "24px",
                                  padding: "2px 6px",
                                  fontSize: "0.78rem",
                                  backgroundColor: "rgba(0,0,0,0.3)",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                  borderRadius: "6px",
                                  color: "#fff",
                                  textAlign: "right",
                                  marginLeft: "4px"
                                }}
                              />
                            </span>
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(Precios Ocultos)</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {!isWorker && (
                          <strong style={{ color: "var(--color-primary)" }}>
                            Sub: {formatMoney(item.qty * (parseFloat(item.salePrice) || 0))}
                          </strong>
                        )}
                        <button type="button" onClick={() => deleteInsumoItem(idx)} style={styles.btnDeleteBudget}>&times;</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 🧰 Herramienta Especial */}
              <div style={styles.budgetSection}>
                <h3 style={styles.budgetSecTitle}>🧰 Herramienta Especial</h3>
                <div style={styles.budgetInputRow}>
                  <input
                    placeholder="Descripción de la herramienta (ej. Extractor de cojinetes)"
                    className="input-field"
                    value={inputToolDesc}
                    onChange={(e) => setInputToolDesc(e.target.value)}
                    style={{ flex: 3 }}
                  />
                  <input
                    type="number"
                    placeholder="Cant."
                    className="input-field"
                    value={inputToolQty}
                    onChange={(e) => setInputToolQty(e.target.value)}
                    style={{ width: "75px" }}
                    min="1"
                  />
                  {!isWorker && (
                    <input
                      type="number"
                      placeholder="Costo Q"
                      className="input-field"
                      value={inputToolPrice}
                      onChange={(e) => setInputToolPrice(e.target.value)}
                      style={{ flex: 1.2 }}
                      min="0"
                    />
                  )}
                  <button type="button" className="btn btn-primary" onClick={addToolItem} style={{ padding: "0 15px", height: "42px" }}>
                    +
                  </button>
                </div>
                <ul style={styles.budgetList}>
                  {(currentBudget.tools || []).map((item, idx) => (
                    <li key={idx} style={styles.budgetItem}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span><strong>{item.qty}x</strong> {item.desc}</span>
                        {!isWorker ? (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Costo de uso Q: 
                            <input
                              type="number"
                              value={item.price !== undefined ? item.price : ""}
                              placeholder="0.00"
                              onChange={(e) => {
                                const val = e.target.value;
                                setCurrentBudget(prev => {
                                  const toolsCopy = [...prev.tools];
                                  toolsCopy[idx] = { ...toolsCopy[idx], price: val === "" ? "" : parseFloat(val) };
                                  return { ...prev, tools: toolsCopy };
                                });
                              }}
                              style={{
                                width: "70px",
                                height: "24px",
                                padding: "2px 6px",
                                fontSize: "0.78rem",
                                backgroundColor: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "6px",
                                color: "#fff",
                                textAlign: "right",
                                marginLeft: "4px"
                              }}
                            />
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(Precio Oculto)</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {!isWorker && (
                          <strong style={{ color: "var(--color-primary)" }}>
                            Sub: {formatMoney(item.qty * (parseFloat(item.price) || 0))}
                          </strong>
                        )}
                        <button type="button" onClick={() => deleteToolItem(idx)} style={styles.btnDeleteBudget}>&times;</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 💼 Servicios Externos / Otros (Solo para Admin / Cajero) */}
              {!isWorker && (
                <div style={styles.budgetSection}>
                  <h3 style={styles.budgetSecTitle}>💼 Servicios Externos / Otros</h3>
                  {carwashPresets && carwashPresets.length > 0 && (
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                      <select
                        className="input-field"
                        onChange={(e) => {
                          const selectedVal = e.target.value;
                          if (selectedVal) {
                            const preset = carwashPresets.find(p => p.tipo === selectedVal);
                            if (preset) {
                              setInputServiceDesc(`Carwash: ${preset.tipo}`);
                              setInputServicePurchasePrice("0");
                              setInputServicePrice(preset.precio.toString());
                            }
                          }
                          e.target.value = "";
                        }}
                        style={{ flex: 1 }}
                        defaultValue=""
                      >
                        <option value="" disabled>-- Cargar Servicio de Carwash --</option>
                        {carwashPresets.map((p, idx) => (
                          <option key={idx} value={p.tipo}>
                            🧼 {p.tipo} (Q{p.precio.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="budget-input-row-container" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                    <input
                      placeholder="Servicio (ej. Torno culata / Grúa)"
                      className="input-field"
                      value={inputServiceDesc}
                      onChange={(e) => setInputServiceDesc(e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <input
                      type="number"
                      placeholder="P. Compra"
                      className="input-field"
                      value={inputServicePurchasePrice}
                      onChange={(e) => setInputServicePurchasePrice(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      placeholder="P. Venta"
                      className="input-field"
                      value={inputServicePrice}
                      onChange={(e) => setInputServicePrice(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn-primary" onClick={addServiceItem} style={{ padding: "0 15px", height: "42px" }}>
                      +
                    </button>
                  </div>
                  <ul style={styles.budgetList}>
                    {(currentBudget.services || []).map((item, idx) => (
                      <li key={idx} style={styles.budgetItem}>
                        <span style={{ flex: 1 }}>{item.desc}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                          {/* Purchase Price Input */}
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Compra: Q</span>
                            <input
                              type="number"
                              value={item.purchasePrice !== undefined ? item.purchasePrice : ""}
                              placeholder="0.00"
                              onChange={(e) => {
                                const val = e.target.value;
                                setCurrentBudget(prev => {
                                  const servicesCopy = [...prev.services];
                                  servicesCopy[idx] = { ...servicesCopy[idx], purchasePrice: val === "" ? "" : parseFloat(val) };
                                  return { ...prev, services: servicesCopy };
                                });
                              }}
                              style={{
                                width: "70px",
                                height: "28px",
                                padding: "2px 6px",
                                fontSize: "0.85rem",
                                backgroundColor: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "6px",
                                color: "#fff",
                                textAlign: "right"
                              }}
                            />
                          </div>
                          {/* Sale Price Input */}
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Venta: Q</span>
                            <input
                              type="number"
                              value={item.price !== undefined ? item.price : ""}
                              placeholder="0.00"
                              onChange={(e) => {
                                const val = e.target.value;
                                setCurrentBudget(prev => {
                                  const servicesCopy = [...prev.services];
                                  servicesCopy[idx] = { ...servicesCopy[idx], price: val === "" ? "" : parseFloat(val) };
                                  return { ...prev, services: servicesCopy };
                                });
                              }}
                              style={{
                                width: "70px",
                                height: "28px",
                                padding: "2px 6px",
                                fontSize: "0.85rem",
                                backgroundColor: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "6px",
                                color: "#fff",
                                textAlign: "right"
                              }}
                            />
                          </div>
                          <button type="button" onClick={() => deleteServiceItem(idx)} style={styles.btnDeleteBudget}>&times;</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 📸 Fotos de Diagnóstico */}
              <div style={styles.budgetSection}>
                <h3 style={styles.budgetSecTitle}>📸 Fotos de Diagnóstico (Opcional)</h3>
                <div style={styles.photoUploadContainer}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      files.forEach((file) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const img = new Image();
                          img.src = reader.result;
                          img.onload = () => {
                            const canvas = document.createElement("canvas");
                            const max_size = 600;
                            let width = img.width;
                            let height = img.height;
                            if (width > height) {
                              if (width > max_size) {
                                height *= max_size / width;
                                width = max_size;
                              }
                            } else {
                              if (height > max_size) {
                                width *= max_size / height;
                                height = max_size;
                              }
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext("2d");
                            ctx.drawImage(img, 0, 0, width, height);
                            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
                            setDiagnosticPhotos((prev) => [...prev, { base64: compressedBase64, comment: "" }]);
                          };
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                    style={{ display: "none" }}
                    id="diag-photos-input"
                  />
                  <label htmlFor="diag-photos-input" className="btn btn-ghost" style={styles.photoUploadLabel}>
                    📸 Subir Fotos de Diagnóstico
                  </label>
                  {diagnosticPhotos.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px", marginTop: "8px" }}>
                      {diagnosticPhotos.map((f, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px", background: "rgba(255,255,255,0.05)", padding: "6px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", position: "relative" }}>
                          <div style={{ position: "relative", width: "100%", height: "80px" }}>
                            <img src={f.base64} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "4px" }} />
                            <button type="button" onClick={() => setDiagnosticPhotos((prev) => prev.filter((_, idx) => idx !== i))} style={styles.previewRemoveBtn}>
                              &times;
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Comentario..."
                            value={f.comment || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDiagnosticPhotos((prev) => prev.map((imgObj, idx) => idx === i ? { ...imgObj, comment: val } : imgObj));
                            }}
                            style={{
                              width: "100%",
                              background: "rgba(0,0,0,0.4)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              borderRadius: "4px",
                              color: "#fff",
                              fontSize: "10px",
                              padding: "4px 6px",
                              outline: "none",
                              boxSizing: "border-box"
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Descuento y Comisión del Cajero (Solo para Admin / Cajero) */}
            {!isWorker && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "10px 0", borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                  <label style={{ ...styles.label, margin: 0 }}>Descuento (%) (Opcional):</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="input-field"
                    value={inputDiscount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val >= 0 && val <= 100) {
                        setInputDiscount(e.target.value);
                      } else if (e.target.value === "") {
                        setInputDiscount("");
                      }
                    }}
                    style={{ width: "80px", textAlign: "right" }}
                    min="0"
                    max="100"
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 0", borderTop: "1px dashed rgba(255,255,255,0.1)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    id="modalCajeroComision"
                    checked={budgetCajeroComisionApplies}
                    onChange={(e) => setBudgetCajeroComisionApplies(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "var(--color-primary)", cursor: "pointer" }}
                  />
                  <label htmlFor="modalCajeroComision" style={{ ...styles.label, margin: 0, cursor: "pointer", fontSize: "0.85rem" }}>
                    Aplicar Comisión del Cajero sobre Mano de Obra
                  </label>
                </div>
              </>
            )}

            {/* Total Summary */}
            <div style={styles.modalSummary}>
              {!isWorker ? (() => {
                const subTotal = ((currentBudget.labor || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0)) +
                                 ((currentBudget.parts || []).reduce((sum, item) => sum + (item.qty * (parseFloat(item.salePrice) || 0)), 0)) +
                                 ((currentBudget.insumos || []).reduce((sum, item) => sum + (item.qty * (parseFloat(item.salePrice) || 0)), 0)) +
                                 ((currentBudget.tools || []).reduce((sum, item) => sum + (item.qty * (parseFloat(item.price) || 0)), 0)) +
                                 ((currentBudget.services || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0));
                const discountPct = parseFloat(inputDiscount) || 0;
                const discountAmount = subTotal * (discountPct / 100);
                const finalTotal = subTotal - discountAmount;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "15px", marginBottom: "15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", color: "var(--text-muted)" }}>
                      <span>Subtotal:</span>
                      <span>{formatMoney(subTotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", color: "var(--color-danger)" }}>
                        <span>Descuento ({discountPct}%):</span>
                        <span>-{formatMoney(discountAmount)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "800", color: "#fff", paddingTop: "5px" }}>
                      <span>Total Neto Estimado:</span>
                      <span style={{ color: "var(--color-primary)", fontSize: "1.2rem", fontWeight: "800" }}>
                        {formatMoney(finalTotal)}
                      </span>
                    </div>
                  </div>
                );
              })() : (
                <div style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.1)", marginBottom: "15px", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>
                  <span>🔒 Precios e importes totales visibles únicamente para personal administrativo.</span>
                </div>
              )}
              
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setBudgetModalOrder(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={guardarPresupuesto}>
                  Guardar Presupuesto
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {quickAddOrder && createPortal(
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={{ ...styles.modalContent, maxWidth: "500px" }}>
            <div style={{ ...styles.modalHeader, display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#fff" }}>
                  ⚙️ Cargar Repuesto, Insumo o Trabajo Externo
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Orden #{quickAddOrder.id} - Placa {quickAddOrder.placa} ({quickAddOrder.cliente})
                </p>
              </div>
              <button 
                onClick={() => {
                  setQuickAddOrder(null);
                  setQuickDesc("");
                  setQuickQty("1");
                  setQuickCost("");
                  setQuickPrice("");
                  setQuickSuggestions([]);
                  setQuickShowSuggestions(false);
                }} 
                style={{ background: "none", border: "none", color: "#fff", fontSize: "1.5rem", cursor: "pointer", padding: 0 }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Tipo de Carga *</label>
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickType("part");
                      setQuickDesc("");
                      setQuickSuggestions([]);
                      setQuickShowSuggestions(false);
                    }}
                    className={`btn ${quickType === "part" ? "btn-primary" : "btn-ghost"}`}
                    style={{ flex: 1, padding: "8px 0", fontSize: "0.85rem" }}
                  >
                    ⚙️ Repuesto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickType("insumo");
                      setQuickDesc("");
                      setQuickSuggestions([]);
                      setQuickShowSuggestions(false);
                    }}
                    className={`btn ${quickType === "insumo" ? "btn-primary" : "btn-ghost"}`}
                    style={{ flex: 1, padding: "8px 0", fontSize: "0.85rem" }}
                  >
                    🧪 Insumo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickType("service");
                      setQuickDesc("");
                      setQuickSuggestions([]);
                      setQuickShowSuggestions(false);
                    }}
                    className={`btn ${quickType === "service" ? "btn-primary" : "btn-ghost"}`}
                    style={{ flex: 1, padding: "8px 0", fontSize: "0.85rem" }}
                  >
                    🛠️ Trabajo Externo
                  </button>
                </div>
              </div>

              {quickType === "service" && carwashPresets && carwashPresets.length > 0 && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Cargar Servicio de Carwash</label>
                  <select
                    className="input-field"
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      if (selectedVal) {
                        const preset = carwashPresets.find(p => p.tipo === selectedVal);
                        if (preset) {
                          setQuickDesc(`Carwash: ${preset.tipo}`);
                          setQuickCost("0");
                          setQuickPrice(preset.precio.toString());
                        }
                      }
                      e.target.value = "";
                    }}
                    style={{ width: "100%", boxSizing: "border-box" }}
                    defaultValue=""
                  >
                    <option value="" disabled>-- Selecciona un Servicio de Carwash --</option>
                    {carwashPresets.map((p, idx) => (
                      <option key={idx} value={p.tipo}>
                        🧼 {p.tipo} (Q{p.precio.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ ...styles.inputGroup, position: "relative" }}>
                <label style={styles.label}>Descripción / Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder={quickType === "part" ? "Ej. Pastillas de freno delanteras" : quickType === "insumo" ? "Ej. Silicona gris" : "Ej. Torno de culata"}
                  className="input-field"
                  value={quickDesc}
                  onChange={(e) => handleQuickDescChange(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
                {quickShowSuggestions && quickSuggestions.length > 0 && (
                  <ul className="suggestions-list" style={{ position: "absolute", zIndex: 10, width: "100%", backgroundColor: "var(--bg-surface)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "4px 0", listStyle: "none", margin: "4px 0 0 0" }}>
                    {quickSuggestions.map((item, idx) => (
                      <li 
                        key={idx} 
                        className="suggestion-item"
                        onMouseDown={() => selectQuickSuggestion(item)}
                        style={{ padding: "8px 12px", cursor: "pointer", color: "#fff" }}
                      >
                        <strong>{item.name}</strong> {item.brand ? `(${item.brand})` : ""} - Stock: {item.quantity} - Q{item.salePrice}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {quickType !== "service" && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="input-field"
                    value={quickQty}
                    onChange={(e) => setQuickQty(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Precio Costo (Compra)</label>
                  <input
                    type="text"
                    placeholder="Q0.00"
                    className="input-field"
                    value={quickCost}
                    onChange={(e) => setQuickCost(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Precio Venta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Q0.00"
                    className="input-field"
                    value={quickPrice}
                    onChange={(e) => setQuickPrice(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => {
                    setQuickAddOrder(null);
                    setQuickDesc("");
                    setQuickQty("1");
                    setQuickCost("");
                    setQuickPrice("");
                    setQuickSuggestions([]);
                    setQuickShowSuggestions(false);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  ⚡ Cargar Inmediatamente
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {presupuestoFormalOrder && createPortal(
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={{ ...styles.modalContent, maxWidth: "650px" }}>
            <div style={{ ...styles.modalHeader, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#fff" }}>
                  📋 Presupuesto de Servicio
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Formalizado para el Cliente
                </p>
              </div>
              <button 
                onClick={() => setPresupuestoFormalOrder(null)} 
                style={{ background: "none", border: "none", color: "#fff", fontSize: "1.5rem", cursor: "pointer", padding: 0 }}
              >
                &times;
              </button>
            </div>

            <div style={{ ...styles.modalBody, padding: "10px" }}>
              {/* Logo / Header Membrete */}
              <div style={{ borderBottom: "1px dashed rgba(255,255,255,0.1)", paddingBottom: "15px", marginBottom: "15px" }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-primary)", margin: 0 }}>
                  LOS PITS AUTO CENTER
                </h1>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Taller de Mecánica & Carwash Premium
                </p>
              </div>

              {/* metadata client */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", fontSize: "0.85rem", backgroundColor: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div>
                  <p style={{ color: "var(--text-muted)", fontWeight: "bold" }}>CLIENTE:</p>
                  <p style={{ color: "#fff" }}>{presupuestoFormalOrder.cliente}</p>
                  {presupuestoFormalOrder.telefono && <p style={{ color: "var(--text-muted)" }}>Tel: {presupuestoFormalOrder.telefono}</p>}
                </div>
                <div>
                  <p style={{ color: "var(--text-muted)", fontWeight: "bold" }}>VEHÍCULO:</p>
                  <p style={{ color: "#fff" }}>{presupuestoFormalOrder.marca} {presupuestoFormalOrder.linea} ({presupuestoFormalOrder.placa})</p>
                  <p style={{ color: "var(--text-muted)" }}>
                    Color: {presupuestoFormalOrder.color || "N/A"} | Año: {presupuestoFormalOrder.anio || "N/A"}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "20px" }}>
                {/* 1. Labor */}
                {presupuestoFormalOrder.presupuesto?.labor && presupuestoFormalOrder.presupuesto.labor.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.9rem", color: "var(--color-primary)", borderBottom: "1px solid rgba(59, 130, 246, 0.2)", paddingBottom: "4px", marginBottom: "8px" }}>
                      🛠️ Mano de Obra y Servicios Taller
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {presupuestoFormalOrder.presupuesto.labor.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                          <span style={{ color: "#fff" }}>{item.desc}</span>
                          <span style={{ color: "#fff", fontWeight: "bold" }}>{formatMoney(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Parts */}
                {presupuestoFormalOrder.presupuesto?.parts && presupuestoFormalOrder.presupuesto.parts.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.9rem", color: "var(--color-secondary)", borderBottom: "1px solid rgba(168, 85, 247, 0.2)", paddingBottom: "4px", marginBottom: "8px" }}>
                      ⚙️ Repuestos y Materiales
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {presupuestoFormalOrder.presupuesto.parts.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                          <span style={{ color: "#fff" }}>
                            <strong>{item.qty}x</strong> {item.desc} {item.brand ? `(${item.brand}) ` : ""}{item.presentation ? ` - Presentación: ${item.presentation} ` : ""}<span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(c/u {formatMoney(item.salePrice)})</span>
                          </span>
                          <span style={{ color: "#fff", fontWeight: "bold" }}>
                            {formatMoney(item.qty * item.salePrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                 {/* 3. Services */}
                {presupuestoFormalOrder.presupuesto?.services && presupuestoFormalOrder.presupuesto.services.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.9rem", color: "var(--color-info)", borderBottom: "1px solid rgba(6, 182, 212, 0.2)", paddingBottom: "4px", marginBottom: "8px" }}>
                      💼 Servicios Externos / Otros
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {presupuestoFormalOrder.presupuesto.services.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                          <span style={{ color: "#fff" }}>{item.desc}</span>
                          <span style={{ color: "#fff", fontWeight: "bold" }}>{formatMoney(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3b. Insumos */}
                {presupuestoFormalOrder.presupuesto?.insumos && presupuestoFormalOrder.presupuesto.insumos.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.9rem", color: "var(--color-warning)", borderBottom: "1px solid rgba(245, 158, 11, 0.2)", paddingBottom: "4px", marginBottom: "8px" }}>
                      🧪 Insumos Utilizados
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {presupuestoFormalOrder.presupuesto.insumos.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                          <span style={{ color: "#fff" }}>
                            <strong>{item.qty}x</strong> {item.desc}
                          </span>
                          <span style={{ color: "#fff", fontWeight: "bold" }}>{formatMoney(item.qty * item.salePrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3c. Tools */}
                {presupuestoFormalOrder.presupuesto?.tools && presupuestoFormalOrder.presupuesto.tools.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.9rem", color: "var(--color-primary)", borderBottom: "1px solid rgba(59, 130, 246, 0.2)", paddingBottom: "4px", marginBottom: "8px" }}>
                      🧰 Herramienta Especial
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {presupuestoFormalOrder.presupuesto.tools.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                          <span style={{ color: "#fff" }}>
                            <strong>{item.qty}x</strong> {item.desc}
                          </span>
                          <span style={{ color: "#fff", fontWeight: "bold" }}>{formatMoney(item.qty * item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Diagnostic Photos */}
                {presupuestoFormalOrder.fotosDiagnostico && presupuestoFormalOrder.fotosDiagnostico.length > 0 && (
                  <div style={{ marginTop: "15px" }}>
                    <h3 style={{ fontSize: "0.9rem", color: "var(--color-primary)", borderBottom: "1px solid rgba(234, 179, 8, 0.2)", paddingBottom: "4px", marginBottom: "8px" }}>
                      📸 Fotos de Diagnóstico
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px" }}>
                      {presupuestoFormalOrder.fotosDiagnostico.map((foto, idx) => {
                        const base64 = typeof foto === 'string' ? foto : foto.base64;
                        const comment = typeof foto === 'object' && foto ? foto.comment : '';
                        return (
                          <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px", background: "rgba(255,255,255,0.05)", padding: "6px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)" }}>
                            <img 
                              src={base64} 
                              alt={`Foto ${idx+1}`} 
                              style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "4px", cursor: "pointer" }} 
                              onClick={() => setSelectedFullPhoto(base64)} 
                            />
                            {comment && (
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", wordBreak: "break-word", marginTop: "2px" }}>
                                {comment}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Total / Actions */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "15px", marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {(() => {
                const discountPct = Number(presupuestoFormalOrder.presupuesto?.discount || 0);
                const totalLabor = presupuestoFormalOrder.presupuesto.labor?.reduce((sum, item) => sum + Number(item.price || 0), 0) || 0;
                const totalParts = presupuestoFormalOrder.presupuesto.parts?.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.salePrice || 0)), 0) || 0;
                const totalInsumos = presupuestoFormalOrder.presupuesto.insumos?.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.salePrice || 0)), 0) || 0;
                const totalTools = presupuestoFormalOrder.presupuesto.tools?.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0) || 0;
                const totalServices = presupuestoFormalOrder.presupuesto.services?.reduce((sum, item) => sum + Number(item.price || 0), 0) || 0;
                const subTotal = Number(totalLabor) + Number(totalParts) + Number(totalInsumos) + Number(totalTools) + Number(totalServices);
                const discountAmount = subTotal * (discountPct / 100);
                if (discountPct > 0) {
                  return (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", color: "var(--text-muted)" }}>
                        <span>Subtotal:</span>
                        <span>{formatMoney(subTotal)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", color: "var(--color-danger)" }}>
                        <span>Descuento ({discountPct}%):</span>
                        <span>-{formatMoney(discountAmount)}</span>
                      </div>
                    </>
                  );
                }
                return null;
              })()}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "800", color: "#fff" }}>
                <span>Total Estimado:</span>
                <span style={{ color: "var(--color-primary)", fontSize: "1.2rem", fontWeight: "900" }}>
                  {(() => {
                    const discountPct = Number(presupuestoFormalOrder.presupuesto?.discount || 0);
                    const totalLabor = presupuestoFormalOrder.presupuesto.labor?.reduce((sum, item) => sum + Number(item.price || 0), 0) || 0;
                    const totalParts = presupuestoFormalOrder.presupuesto.parts?.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.salePrice || 0)), 0) || 0;
                    const totalInsumos = presupuestoFormalOrder.presupuesto.insumos?.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.salePrice || 0)), 0) || 0;
                    const totalTools = presupuestoFormalOrder.presupuesto.tools?.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0) || 0;
                    const totalServices = presupuestoFormalOrder.presupuesto.services?.reduce((sum, item) => sum + Number(item.price || 0), 0) || 0;
                    const subTotal = Number(totalLabor) + Number(totalParts) + Number(totalInsumos) + Number(totalTools) + Number(totalServices);
                    return formatMoney(subTotal - (subTotal * (discountPct / 100)));
                  })()}
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center", width: "100%" }}>
                {!presupuestoFormalOrder.diagnosticoAutorizado && (
                  <div style={{
                    width: "100%",
                    padding: "10px 14px",
                    backgroundColor: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    borderRadius: "8px",
                    color: "var(--color-warning)",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    textAlign: "left",
                    marginBottom: "10px"
                  }}>
                    ⚠️ Este diagnóstico y presupuesto debe ser autorizado por el Jefe de Taller o Administrador antes de poder compartirse con el cliente.
                  </div>
                )}

                <button type="button" className="btn btn-ghost" onClick={() => setPresupuestoFormalOrder(null)}>
                  Cerrar
                </button>

                {!presupuestoFormalOrder.diagnosticoAutorizado && (usuarioActual?.rol === "admin" || usuarioActual?.rol === "jefe de taller") && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setOrdenes(prev => prev.map(o => o.id === presupuestoFormalOrder.id ? { ...o, diagnosticoAutorizado: true } : o));
                      setPresupuestoFormalOrder(prev => ({ ...prev, diagnosticoAutorizado: true }));
                      alert("Diagnóstico autorizado con éxito.");
                    }}
                    style={{
                      backgroundColor: "var(--color-success-glow)",
                      border: "1px solid var(--color-success)",
                      color: "var(--color-success)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: "bold"
                    }}
                  >
                    ✅ Autorizar Diagnóstico
                  </button>
                )}
                
                {presupuestoFormalOrder.diagnosticoAutorizado && (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={() => exportarPresupuestoImagen(presupuestoFormalOrder)}
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      📥 Descargar PDF
                    </button>

                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => {
                        const cleanPhone = presupuestoFormalOrder.telefono ? presupuestoFormalOrder.telefono.replace(/\D/g, "") : "";
                        const phoneFormatted = cleanPhone.startsWith("502") || cleanPhone.length > 8
                          ? cleanPhone
                          : (cleanPhone.length === 8 ? `502${cleanPhone}` : "");
                          
                        let text = `*LOS PITS AUTO CENTER*\n`;
                        text += `*PRESUPUESTO DE REPARACIÓN*\n\n`;
                        text += `*Cliente:* ${presupuestoFormalOrder.cliente}\n`;
                        text += `*Vehículo:* ${presupuestoFormalOrder.marca} ${presupuestoFormalOrder.linea} (${presupuestoFormalOrder.placa})\n`;
                        text += `*Fecha:* ${new Date(presupuestoFormalOrder.id).toLocaleDateString()}\n`;
                        text += `----------------------------------\n\n`;
                        
                        if (presupuestoFormalOrder.presupuesto.labor && presupuestoFormalOrder.presupuesto.labor.length > 0) {
                          text += `*Mano de Obra:*\n`;
                          presupuestoFormalOrder.presupuesto.labor.forEach(item => {
                            text += `- ${item.desc}: Q${item.price.toFixed(2)}\n`;
                          });
                          text += `\n`;
                        }
                        
                        if (presupuestoFormalOrder.presupuesto.parts && presupuestoFormalOrder.presupuesto.parts.length > 0) {
                          text += `*Repuestos:*\n`;
                          presupuestoFormalOrder.presupuesto.parts.forEach(item => {
                            const brandText = item.brand ? ` (${item.brand})` : "";
                            const presentationText = item.presentation ? ` - ${item.presentation}` : "";
                            text += `- ${item.qty}x ${item.desc}${brandText}${presentationText} (c/u Q${item.salePrice.toFixed(2)}): Q${(item.qty * item.salePrice).toFixed(2)}\n`;
                          });
                          text += `\n`;
                        }
                        
                        if (presupuestoFormalOrder.presupuesto.services && presupuestoFormalOrder.presupuesto.services.length > 0) {
                          text += `*Servicios:*\n`;
                          presupuestoFormalOrder.presupuesto.services.forEach(item => {
                            text += `- ${item.desc}: Q${item.price.toFixed(2)}\n`;
                          });
                          text += `\n`;
                        }

                        const discountPct = Number(presupuestoFormalOrder.presupuesto?.discount || 0);
                        if (discountPct > 0) {
                          const totalLabor = presupuestoFormalOrder.presupuesto.labor?.reduce((sum, item) => sum + Number(item.price || 0), 0) || 0;
                          const totalParts = presupuestoFormalOrder.presupuesto.parts?.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.salePrice || 0)), 0) || 0;
                          const totalServices = presupuestoFormalOrder.presupuesto.services?.reduce((sum, item) => sum + Number(item.price || 0), 0) || 0;
                          const subTotal = Number(totalLabor) + Number(totalParts) + Number(totalServices);
                          const discountAmount = subTotal * (discountPct / 100);
                          text += `Subtotal: Q${subTotal.toFixed(2)}\n`;
                          text += `Descuento ${discountPct}%: -Q${discountAmount.toFixed(2)}\n\n`;
                        }
                        
                        text += `----------------------------------\n`;
                        text += `*TOTAL ESTIMADO: Q${presupuestoFormalOrder.total.toFixed(2)}*\n\n`;
                        text += `_Este presupuesto es estimado y válido por 15 días._`;
                        
                        const waUrl = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(text)}`;
                        window.open(waUrl, "_blank");
                      }}
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      💬 Compartir por WhatsApp
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {recepcionFormalOrder && createPortal(
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={{ ...styles.modalContent, maxWidth: "700px" }}>
            <div style={{ ...styles.modalHeader, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#fff" }}>
                  📋 Hoja de Recepción de Vehículo
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Inventario de Ingreso y Datos del Vehículo
                </p>
              </div>
              <button 
                onClick={() => setRecepcionFormalOrder(null)} 
                style={{ background: "none", border: "none", color: "#fff", fontSize: "1.5rem", cursor: "pointer", padding: 0 }}
              >
                &times;
              </button>
            </div>

            <div style={{ ...styles.modalBody, padding: "10px" }}>
              <div style={{ borderBottom: "1px dashed rgba(255,255,255,0.1)", paddingBottom: "15px", marginBottom: "15px" }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-primary)", margin: 0 }}>
                  LOS PITS AUTO CENTER
                </h1>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Taller de Mecánica & Carwash Premium
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", fontSize: "0.85rem", backgroundColor: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div>
                  <p style={{ color: "var(--text-muted)", fontWeight: "bold" }}>CLIENTE:</p>
                  <p style={{ color: "#fff" }}>{recepcionFormalOrder.cliente}</p>
                  {recepcionFormalOrder.telefono && <p style={{ color: "var(--text-muted)" }}>Tel: {recepcionFormalOrder.telefono}</p>}
                  <p style={{ color: "var(--text-muted)" }}>Combustible: <strong style={{ color: "#fff" }}>{recepcionFormalOrder.combustible ?? 50}%</strong></p>
                </div>
                <div>
                  <p style={{ color: "var(--text-muted)", fontWeight: "bold" }}>VEHÍCULO:</p>
                  <p style={{ color: "#fff" }}>{recepcionFormalOrder.marca} {recepcionFormalOrder.linea} ({recepcionFormalOrder.placa})</p>
                  <p style={{ color: "var(--text-muted)" }}>
                    Color: {recepcionFormalOrder.color || "N/A"} | Año: {recepcionFormalOrder.anio || "N/A"}
                  </p>
                  <p style={{ color: "var(--text-muted)" }}>
                    Kilometraje: {recepcionFormalOrder.kilometraje ? parseInt(recepcionFormalOrder.kilometraje).toLocaleString() : "N/A"} | Chasis: {recepcionFormalOrder.chasis || "N/A"}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: "15px", padding: "12px", backgroundColor: "rgba(255,255,255,0.01)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)" }}>
                <p style={{ color: "var(--color-primary)", fontWeight: "bold", fontSize: "0.85rem", marginBottom: "6px" }}>⚠️ MOTIVO DE INGRESO:</p>
                <p style={{ color: "#fff", fontSize: "0.85rem", whiteSpace: "pre-line" }}>{recepcionFormalOrder.motivoIngreso || recepcionFormalOrder.trabajo}</p>
              </div>

              {recepcionFormalOrder.luces && recepcionFormalOrder.luces.length > 0 && (
                <div style={{ marginTop: "15px" }}>
                  <p style={{ color: "var(--color-warning)", fontWeight: "bold", fontSize: "0.85rem", marginBottom: "6px" }}>🚨 TESTIGOS ACTIVOS AL INGRESO:</p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {recepcionFormalOrder.luces.map((l, idx) => {
                      const lDef = warningLightsDef.find(item => item.id === l);
                      return (
                        <span key={idx} style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "var(--color-warning)", fontSize: "0.75rem", fontWeight: "700" }}>
                          {lDef ? lDef.icon + " " + lDef.label : l}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginTop: "20px" }}>
                <p style={{ color: "var(--color-secondary)", fontWeight: "bold", fontSize: "0.85rem", marginBottom: "8px" }}>📋 INVENTARIO Y CHECKLIST DE RECEPCIÓN:</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                        <th style={{ padding: "6px" }}>PUNTO DE INSPECCIÓN</th>
                        <th style={{ padding: "6px", textAlign: "center" }}>ESTADO</th>
                        <th style={{ padding: "6px" }}>OBSERVACIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defaultChecklistItems.map((item) => {
                        const currentVal = recepcionFormalOrder.checklist?.[item.id] || { status: "Bueno", note: "" };
                        const statusVal = typeof currentVal === "object" ? currentVal.status : currentVal;
                        const noteVal = typeof currentVal === "object" ? currentVal.note : "";
                        
                        let badgeColor = "var(--color-success)";
                        if (statusVal === "Regular") badgeColor = "var(--color-warning)";
                        if (statusVal === "Malo") badgeColor = "var(--color-danger)";
                        
                        return (
                          <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <td style={{ padding: "6px", color: "#fff", fontWeight: "600" }}>{item.label}</td>
                            <td style={{ padding: "6px", textAlign: "center" }}>
                              <span style={{ color: badgeColor, fontWeight: "bold" }}>{statusVal.toUpperCase()}</span>
                            </td>
                            <td style={{ padding: "6px", color: "var(--text-muted)" }}>{noteVal || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {recepcionFormalOrder.fotos && recepcionFormalOrder.fotos.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <p style={{ color: "var(--color-info)", fontWeight: "bold", fontSize: "0.85rem", marginBottom: "8px" }}>📸 FOTOS DE ESTADO (RECEPCIÓN):</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {recepcionFormalOrder.fotos.map((foto, idx) => (
                      <div key={idx} style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <img src={foto} alt={`Foto ${idx+1}`} style={{ width: "100%", height: "180px", objectFit: "cover", cursor: "pointer" }} onClick={() => setSelectedFullPhoto(foto)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "15px", marginTop: "15px", display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="btn btn-ghost" onClick={() => setRecepcionFormalOrder(null)}>
                Cerrar
              </button>

              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => exportarRecepcionImagen(recepcionFormalOrder)}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                📥 Descargar PDF
              </button>

              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  const cleanPhone = recepcionFormalOrder.telefono ? recepcionFormalOrder.telefono.replace(/\D/g, "") : "";
                  const phoneFormatted = cleanPhone.startsWith("502") || cleanPhone.length > 8
                    ? cleanPhone
                    : (cleanPhone.length === 8 ? `502${cleanPhone}` : "");
                    
                  let text = `*LOS PITS AUTO CENTER*\n`;
                  text += `*COMPROBANTE DE RECEPCIÓN DE VEHÍCULO*\n\n`;
                  text += `*Cliente:* ${recepcionFormalOrder.cliente}\n`;
                  text += `*Vehículo:* ${recepcionFormalOrder.marca} ${recepcionFormalOrder.linea} (${recepcionFormalOrder.placa})\n`;
                  text += `*Fecha:* ${new Date(recepcionFormalOrder.id).toLocaleDateString()}\n`;
                  text += `*Combustible:* ${recepcionFormalOrder.combustible ?? 50}%\n`;
                  text += `----------------------------------\n\n`;
                  text += `*Motivo de Ingreso:*\n${recepcionFormalOrder.motivoIngreso || recepcionFormalOrder.trabajo}\n\n`;
                  
                  if (recepcionFormalOrder.checklist) {
                    text += `*Inventario / Inspección:*\n`;
                    defaultChecklistItems.forEach(item => {
                      const val = recepcionFormalOrder.checklist[item.id] || { status: "Bueno", note: "" };
                      const status = typeof val === "object" ? val.status : val;
                      const note = typeof val === "object" ? val.note : "";
                      const statusIcon = status === "Bueno" ? "✅" : (status === "Regular" ? "⚠️" : "❌");
                      const noteText = note ? ` (${note})` : "";
                      text += `${statusIcon} ${item.label}: *${status}*${noteText}\n`;
                    });
                    text += `\n`;
                  }
                  
                  if (recepcionFormalOrder.luces && recepcionFormalOrder.luces.length > 0) {
                    text += `*Testigos encendidos:* ${recepcionFormalOrder.luces.map(l => {
                      const lDef = warningLightsDef.find(item => item.id === l);
                      return lDef ? lDef.label : l;
                    }).join(", ")}\n\n`;
                  }
                  
                  text += `----------------------------------\n`;
                  text += `_Vehículo recibido correctamente en taller._`;
                  
                  const waUrl = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(text)}`;
                  window.open(waUrl, "_blank");
                }}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                💬 Compartir por WhatsApp
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {checkoutOrder && createPortal(
        <div style={styles.modalOverlay} className="modal-overlay-centered">
          <div className="glass-panel" style={{ ...styles.modalContent, maxWidth: "500px" }}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <Coins size={22} color="var(--color-primary)" /> Cobro y Facturación
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Orden de {checkoutOrder.cliente} | Vehículo: {checkoutOrder.vehiculo}
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
        </div>,
        document.body
      )}

      {editingEntryOrder && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={{ ...styles.modalContent, maxWidth: "600px" }}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Editar Información de Ingreso</h3>
              <button onClick={() => setEditingEntryOrder(null)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={guardarEdicionIngreso} style={styles.form}>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ ...styles.inputGroup, flex: 1.5 }}>
                  <label style={styles.label}>Cliente *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={editingEntryOrder.cliente || ""}
                    onChange={(e) => setEditingEntryOrder({ ...editingEntryOrder, cliente: e.target.value })}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Teléfono</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingEntryOrder.telefono || ""}
                    onChange={(e) => setEditingEntryOrder({ ...editingEntryOrder, telefono: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>NIT</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingEntryOrder.nit || ""}
                    onChange={(e) => setEditingEntryOrder({ ...editingEntryOrder, nit: e.target.value })}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 2 }}>
                  <label style={styles.label}>Nombre de Facturación</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingEntryOrder.nombreFacturacion || ""}
                    onChange={(e) => setEditingEntryOrder({ ...editingEntryOrder, nombreFacturacion: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Placa *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={editingEntryOrder.placa || ""}
                    onChange={(e) => setEditingEntryOrder({ ...editingEntryOrder, placa: e.target.value.toUpperCase() })}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Chasis / VIN</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingEntryOrder.chasis || ""}
                    onChange={(e) => setEditingEntryOrder({ ...editingEntryOrder, chasis: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Marca *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={editingEntryOrder.marca || ""}
                    onChange={(e) => setEditingEntryOrder({ ...editingEntryOrder, marca: e.target.value })}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Línea *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={editingEntryOrder.linea || ""}
                    onChange={(e) => setEditingEntryOrder({ ...editingEntryOrder, linea: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Año</label>
                  <input
                    type="number"
                    className="input-field"
                    value={editingEntryOrder.anio || ""}
                    onChange={(e) => setEditingEntryOrder({ ...editingEntryOrder, anio: e.target.value })}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Color</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingEntryOrder.color || ""}
                    onChange={(e) => setEditingEntryOrder({ ...editingEntryOrder, color: e.target.value })}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Kilometraje</label>
                  <input
                    type="number"
                    className="input-field"
                    value={editingEntryOrder.kilometraje || ""}
                    onChange={(e) => setEditingEntryOrder({ ...editingEntryOrder, kilometraje: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Motivo(s) de Ingreso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cambio de Aceite / Revisión de Frenos"
                  className="input-field"
                  value={editingEntryOrder.motivoIngreso || ""}
                  onChange={(e) => setEditingEntryOrder({ ...editingEntryOrder, motivoIngreso: e.target.value })}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Separe múltiples motivos usando una barra diagonal " / " (Ej. Motivo 1 / Motivo 2)
                </span>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setEditingEntryOrder(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, backgroundColor: "var(--color-primary)", borderColor: "var(--color-primary)" }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .suggestions-list {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: rgba(20, 24, 33, 0.98);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          max-height: 160px;
          overflow-y: auto;
          z-index: 1000;
          margin-top: 4px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
          padding: 0;
          list-style: none;
        }
        .suggestion-item {
          padding: 10px 14px;
          cursor: pointer;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
          text-align: left;
          font-size: 0.85rem;
          color: #e2e8f0;
        }
        .suggestion-item:hover {
          background: rgba(59, 130, 246, 0.15);
          color: var(--color-primary);
        }
        .card-edit-btn {
          opacity: 0.4;
        }
        .card-edit-btn:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.08) !important;
        }
        .btn-warning-glow {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: var(--color-warning);
          width: 100%;
        }
        .btn-warning-glow:hover {
          background: var(--color-warning);
          color: var(--text-dark);
          box-shadow: var(--shadow-neon-warning);
        }

        .btn-success-glow {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--color-success);
          width: 100%;
        }
        .btn-success-glow:hover {
          background: var(--color-success);
          color: var(--text-dark);
          box-shadow: var(--shadow-neon-success);
        }

        .btn-delete {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--color-danger);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-delete:hover {
          background: var(--color-danger);
          color: #fff;
          box-shadow: var(--shadow-neon-danger);
        }
      `}</style>
    </div>
  );
}

const styles = {
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    width: "100%",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-glass-hover)",
    borderRadius: "10px",
    zIndex: 10,
    maxHeight: "150px",
    overflowY: "auto",
    marginTop: "4px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
  },
  suggestionItem: {
    padding: "10px 14px",
    cursor: "pointer",
    textAlign: "left",
    borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
  },
  photoUploadContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "100%",
  },
  photoUploadLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: "12px",
    borderRadius: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    border: "1px dashed rgba(255, 255, 255, 0.15)",
    color: "var(--text-main)",
    fontWeight: "600",
    transition: "var(--transition-smooth)",
    width: "100%",
    gap: "8px",
  },
  photoPreviewsGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "8px",
  },
  previewImageWrapper: {
    position: "relative",
    width: "60px",
    height: "60px",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  previewRemoveBtn: {
    position: "absolute",
    top: "2px",
    right: "2px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    border: "none",
    color: "#fff",
    fontSize: "12px",
    lineHeight: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardPhotosGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "12px",
  },
  cardPhotoThumbnail: {
    width: "55px",
    height: "55px",
    borderRadius: "6px",
    objectFit: "cover",
    cursor: "pointer",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    transition: "var(--transition-smooth)",
  },
  lightbox: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxContent: {
    position: "relative",
    maxWidth: "90%",
    maxHeight: "90%",
  },
  lightboxImage: {
    maxWidth: "100%",
    maxHeight: "90vh",
    borderRadius: "8px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: "-40px",
    right: "0",
    backgroundColor: "transparent",
    border: "none",
    color: "#fff",
    fontSize: "30px",
    cursor: "pointer",
  },
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
  managerGrid: {
    display: "grid",
    gridTemplateColumns: "1.1fr 2fr",
    gap: "30px",
    alignItems: "start",
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
    gap: "16px",
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
  select: {
    paddingLeft: "42px",
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
  orderListContainer: {
    width: "100%",
  },
  gridList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
    gap: "20px",
    width: "100%",
  },
  orderCard: {
    padding: "20px",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    minHeight: "220px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
    gap: "10px",
  },
  clientName: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#fff",
  },
  vehicleText: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    marginTop: "2px",
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    paddingBottom: "16px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    marginBottom: "16px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
  },
  infoLabel: {
    color: "var(--text-muted)",
  },
  infoVal: {
    fontWeight: "600",
    color: "#fff",
  },
  infoValTotal: {
    fontWeight: "700",
    color: "var(--color-primary)",
  },
  infoValCom: {
    fontWeight: "600",
    color: "#10b981",
  },
  cardFooter: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  cardActionBtn: {
    flex: 1,
    padding: "10px 14px",
    fontSize: "0.85rem",
    fontWeight: "700",
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
    maxWidth: "600px",
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
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    overflowY: "auto",
    paddingRight: "5px",
    marginBottom: "20px",
  },
  budgetSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    textAlign: "left",
  },
  budgetSecTitle: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "var(--text-muted)",
  },
  budgetInputRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  budgetList: {
    listStyle: "none",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    maxHeight: "120px",
    overflowY: "auto",
  },
  budgetItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    fontSize: "0.85rem",
  },
  btnDeleteBudget: {
    background: "transparent",
    border: "none",
    color: "var(--color-danger)",
    fontSize: "1.2rem",
    cursor: "pointer",
    lineHeight: "1",
    padding: "0 4px",
  },
  modalSummary: {
    borderTop: "1px solid rgba(255,255,255,0.06)",
    paddingTop: "15px",
    textAlign: "left",
  },
};
