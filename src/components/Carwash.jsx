import React, { useState } from "react";
import { 
  Car, 
  User, 
  Coins, 
  Search, 
  Plus, 
  CheckCircle, 
  Trash2, 
  Clock, 
  UserCheck,
  Warehouse,
  AlertTriangle,
  Edit
} from "lucide-react";
import { formatMoney } from "../utils/storage";
import { jsPDF } from "jspdf";

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

export default function Carwash({ 
  carwash, 
  setCarwash, 
  usuarioActual, 
  lavadores, 
  ordenes, 
  setOrdenes,
  carwashPresets,
  carwashInventory,
  setCarwashInventory,
  carwashConsumption,
  setCarwashConsumption,
  usuarios = [],
  cuentasPorCobrar,
  setCuentasPorCobrar
}) {
  const [activeSubTab, setActiveSubTab] = useState("servicios"); // 'servicios' or 'inventario'

  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [linea, setLinea] = useState("");
  const [color, setColor] = useState("");
  const [fotos, setFotos] = useState([]);
  const [anio, setAnio] = useState("");
  const [kilometraje, setKilometraje] = useState("");
  const [chasis, setChasis] = useState("");
  const [combustible, setCombustible] = useState(50);
  const [luces, setLuces] = useState([]);
  const [warningLightsList, setWarningLightsList] = useState(warningLightsDef);
  const [checklist, setChecklist] = useState(() => {
    const initial = {};
    defaultChecklistItems.forEach(item => {
      initial[item.id] = { status: "Bueno", note: "" };
    });
    return initial;
  });
  
  const [selectedLavadores, setSelectedLavadores] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFullPhoto, setSelectedFullPhoto] = useState(null);

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

  // Carwash Insumos CRUD States
  const [itemName, setItemName] = useState("");
  const [presentation, setPresentation] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [minStock, setMinStock] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [invSearchQuery, setInvSearchQuery] = useState("");

  const handleInventorySubmit = (e) => {
    e.preventDefault();
    if (!itemName.trim() || !quantity || !purchasePrice) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    const qty = parseInt(quantity);
    const cost = parseFloat(purchasePrice);
    const minS = minStock === "" ? 5 : parseInt(minStock);

    if (isNaN(qty) || qty < 0) {
      alert("La cantidad debe ser mayor o igual a 0.");
      return;
    }
    if (isNaN(cost) || cost < 0) {
      alert("El costo unitario debe ser mayor o igual a 0.");
      return;
    }
    if (isNaN(minS) || minS < 0) {
      alert("El stock mínimo debe ser un número entero mayor o igual a 0.");
      return;
    }

    if (editingId) {
      // Edit
      setCarwashInventory(
        carwashInventory.map((item) =>
          item.id === editingId
            ? { ...item, name: itemName.trim(), presentation: presentation.trim(), quantity: qty, purchasePrice: cost, minStock: minS }
            : item
        )
      );
      setEditingId(null);
    } else {
      // Add
      const exists = carwashInventory.some(item => item.name.toLowerCase().trim() === itemName.toLowerCase().trim());
      if (exists) {
        alert("Ya existe un insumo con este nombre.");
        return;
      }

      const nuevo = {
        id: Date.now(),
        name: itemName.trim(),
        presentation: presentation.trim(),
        quantity: qty,
        purchasePrice: cost,
        minStock: minS
      };
      setCarwashInventory([nuevo, ...carwashInventory]);
    }

    setItemName("");
    setPresentation("");
    setQuantity("");
    setPurchasePrice("");
    setMinStock("");
  };

  const iniciarEdicion = (item) => {
    setEditingId(item.id);
    setItemName(item.name);
    setPresentation(item.presentation || "");
    setQuantity(item.quantity.toString());
    setPurchasePrice(item.purchasePrice.toString());
    setMinStock(item.minStock !== undefined ? item.minStock.toString() : "5");
  };

  const eliminarItem = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este insumo de carwash?")) {
      setCarwashInventory(carwashInventory.filter(item => item.id !== id));
    }
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setItemName("");
    setPresentation("");
    setQuantity("");
    setPurchasePrice("");
    setMinStock("");
  };

  const registrarConsumo = (item) => {
    const qtyStr = prompt(`Ingresa la cantidad consumida de ${item.name} (Stock actual: ${item.quantity}):`);
    if (qtyStr === null) return;
    const qty = parseInt(qtyStr);
    if (isNaN(qty) || qty <= 0) {
      alert("Cantidad inválida.");
      return;
    }
    if (qty > item.quantity) {
      alert("Stock insuficiente.");
      return;
    }

    // Deduct stock
    setCarwashInventory(prev => prev.map(p => p.id === item.id ? { ...p, quantity: p.quantity - qty } : p));

    // Log consumption
    const cost = qty * item.purchasePrice;
    const logEntry = {
      id: Date.now(),
      itemId: item.id,
      name: item.name,
      quantity: qty,
      purchasePrice: item.purchasePrice,
      cost,
      fecha: new Date().toISOString()
    };
    setCarwashConsumption(prev => [logEntry, ...prev]);
    alert(`Se consumieron ${qty} unidades. Costo total de Q${cost.toFixed(2)} cargado.`);
  };

  // Extract unique vehicles historically registered
  const getUniqueVehicles = () => {
    const vehiclesMap = {};
    carwash.forEach(c => {
      if (c.vehiculo?.placa) {
        const p = c.vehiculo.placa.toUpperCase().trim();
        if (!vehiclesMap[p]) {
          vehiclesMap[p] = {
            placa: p,
            cliente: c.cliente || "",
            telefono: c.telefono || "",
            marca: c.vehiculo.marca || "",
            linea: c.vehiculo.linea || ""
          };
        }
      }
    });
    return Object.values(vehiclesMap);
  };

  const allVehicles = getUniqueVehicles();
  const suggestions = placa.trim()
    ? allVehicles.filter(v => v.placa.toLowerCase().includes(placa.toLowerCase()))
    : [];

  const handlePlacaChange = (e) => {
    const val = e.target.value;
    setPlaca(val);
    setShowSuggestions(true);
  };

  const selectVehicle = (v) => {
    setPlaca(v.placa);
    setCliente(v.cliente);
    setTelefono(v.telefono);
    setMarca(v.marca);
    setLinea(v.linea);
    setShowSuggestions(false);
  };

  const isWorker = usuarioActual?.rol === "lavador";
  const isManager = usuarioActual?.rol === "admin" || usuarioActual?.rol === "cajero";

  // Wash type presets from config
  const presets = carwashPresets || [];

  // Filter carwash supplies
  const filteredInvProducts = (carwashInventory || []).filter(p => {
    return p.name.toLowerCase().includes(invSearchQuery.toLowerCase()) ||
           (p.presentation && p.presentation.toLowerCase().includes(invSearchQuery.toLowerCase()));
  });

  const totalWashesEntregados = carwash.filter(c => c.estado === "Entregado").length;
  const totalCostConsumed = (carwashConsumption || []).reduce((sum, c) => sum + c.cost, 0);
  const averageCostPerWash = totalWashesEntregados > 0 ? (totalCostConsumed / totalWashesEntregados) : 0;

  const totalInvValue = (carwashInventory || []).reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0);
  const totalInvItems = (carwashInventory || []).length;

  // Filter washes by search query and role
  const filteredCarwash = carwash.filter(c => {
    if (c.estado === "Entregado") return false;

    // If washer role, show only their assigned washes
    if (isWorker && c.lavador.toLowerCase() !== usuarioActual.user.toLowerCase()) {
      return false;
    }
    
    // Global search
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (c.cliente && c.cliente.toLowerCase().includes(query)) ||
      (c.telefono && c.telefono.toLowerCase().includes(query)) ||
      (c.vehiculo?.placa && c.vehiculo.placa.toLowerCase().includes(query)) ||
      (c.vehiculo?.marca && c.vehiculo.marca.toLowerCase().includes(query)) ||
      (c.vehiculo?.linea && c.vehiculo.linea.toLowerCase().includes(query)) ||
      c.tipo.toLowerCase().includes(query) ||
      c.lavador.toLowerCase().includes(query);
      
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

  const removePhoto = (index) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const registrarLavado = (e) => {
    e.preventDefault();
    if (!cliente.trim() || !telefono.trim() || !placa.trim() || !marca.trim() || !linea.trim() || !selectedPreset) {
      alert("Completa todos los campos obligatorios (Placa, Cliente, Teléfono, Marca, Línea y tipo de lavado).");
      return;
    }

    const nuevo = {
      id: Date.now(),
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      nit: nit.trim() || "C/F",
      nombreFacturacion: nombreFacturacion.trim() || cliente.trim(),
      vehiculo: {
        placa: placa.toUpperCase().trim(),
        marca: marca.trim(),
        linea: linea.trim(),
        color: color.trim()
      },
      tipo: selectedPreset.tipo,
      precio: selectedPreset.precio,
      lavadores: selectedLavadores,
      lavador: selectedLavadores.join(", "),
      fotos: fotos,
      estado: "En proceso",
      comision: selectedLavadores.length > 0 ? selectedLavadores.reduce((sum, name) => {
        const washerUser = (usuarios || []).find(u => u.user.toLowerCase() === name.toLowerCase());
        return sum + (washerUser && washerUser.comisionCarwash !== undefined ? parseFloat(washerUser.comisionCarwash) : 7);
      }, 0) : selectedPreset.comision,
      fecha: new Date().toISOString(),
      anio: anio.trim(),
      kilometraje: kilometraje.trim(),
      chasis: chasis.toUpperCase().trim(),
      combustible,
      luces,
      checklist
    };

    setCarwash([nuevo, ...carwash]);
    setCliente("");
    setTelefono("");
    setPlaca("");
    setMarca("");
    setLinea("");
    setColor("");
    setFotos([]);
    setSelectedLavadores([]);
    setSelectedPreset(null);
    setNit("");
    setNombreFacturacion("");
    setAnio("");
    setKilometraje("");
    setChasis("");
    setCombustible(50);
    setLuces([]);
    const initCheck = {};
    defaultChecklistItems.forEach(item => {
      initCheck[item.id] = { status: "Bueno", note: "" };
    });
    setChecklist(initCheck);
  };

  const asignarLavadores = (id, newList) => {
    setCarwash(
      carwash.map((c) => {
        if (c.id === id) {
          const newComm = newList.length > 0 ? newList.reduce((sum, name) => {
            const washerUser = (usuarios || []).find(u => u.user.toLowerCase() === name.toLowerCase());
            return sum + (washerUser && washerUser.comisionCarwash !== undefined ? parseFloat(washerUser.comisionCarwash) : 7);
          }, 0) : c.comision;
          return {
            ...c,
            lavadores: newList,
            lavador: newList.join(", "),
            comision: newComm
          };
        }
        return c;
      })
    );
  };

  const avanzarLavado = (id) => {
    const wash = carwash.find((c) => c.id === id);
    const washerList = wash ? (wash.lavadores || (wash.lavador ? wash.lavador.split(", ").filter(Boolean) : [])) : [];
    if (wash && washerList.length === 0) {
      alert("Por favor, asigna al menos un lavador a este servicio antes de avanzar.");
      return;
    }
    
    let cancelado = false;
    const nuevasCarwash = carwash.map((c) => {
      if (c.id === id) {
        let nuevoEstado = c.estado;
        if (c.estado === "En proceso") {
          nuevoEstado = "Listo para entrega";

          // Sync: If linked to Taller order, automatically transition linked Taller order to "Listo para entrega"
          if (c.tallerOrderId) {
            setOrdenes((prevOrdenes) =>
              prevOrdenes.map((o) =>
                o.id === c.tallerOrderId ? { ...o, estado: "Listo para entrega" } : o
              )
            );
          }
        } else if (c.estado === "Listo para entrega" && isManager) {
          // Open split payment modal instead of directly updating order state!
          setCheckoutOrder({ ...c, total: c.precio });
          setCheckoutNit(c.nit || "C/F");
          setCheckoutNombreFacturacion(c.nombreFacturacion || c.cliente);
          setCheckoutPayments({ efectivo: "", transferencia: "", cheque: "", tarjeta: "", credito: "" });
          setSelectedPaymentMethods([]);
          cancelado = true;
          return c;
        }
        return { ...c, estado: nuevoEstado };
      }
      return c;
    });

    if (!cancelado) {
      setCarwash(nuevasCarwash);
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
      const method = paymentMethodsSelected[0];
      breakdown[method] = checkoutOrder.precio;
      totalPaid = checkoutOrder.precio;
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
      if (Math.abs(totalPaid - checkoutOrder.precio) > 0.01) {
        alert(`La suma de los pagos (${formatMoney(totalPaid)}) debe ser igual al total a cobrar (${formatMoney(checkoutOrder.precio)}).`);
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
          nit: checkoutNit.trim() || "C/F",
          concepto: `Carwash Orden #${checkoutOrder.id} - ${checkoutOrder.tipo} (${checkoutOrder.vehiculo?.placa || "Auto"})`,
          total: creditAmount,
          saldo: creditAmount,
          fecha: new Date().toISOString(),
          estado: "Pendiente",
          pagos: []
        };
        setCuentasPorCobrar([newCuenta, ...cuentasPorCobrar]);
      }
    }
    
    // Complete checkout & update carwash list
    const updatedCarwash = carwash.map(c => {
      if (c.id === checkoutOrder.id) {
        // Sync: If linked to Taller order, automatically transition linked Taller order to "Entregado"
        if (c.tallerOrderId) {
          setOrdenes((prevOrdenes) =>
            prevOrdenes.map((o) =>
              o.id === c.tallerOrderId ? { ...o, estado: "Entregado" } : o
            )
          );
        }
        return {
          ...c,
          estado: "Entregado",
          nit: checkoutNit.trim() || "C/F",
          nombreFacturacion: checkoutNombreFacturacion.trim() || c.cliente,
          formaPago: breakdown,
          formaPagoDesc: paymentMethodsSelected.map(m => `${m.toUpperCase()} (Q${breakdown[m].toFixed(2)})`).join(", "),
          cajero: usuarioActual?.user || "Admin"
        };
      }
      return c;
    });
    
    setCarwash(updatedCarwash);
    setCheckoutOrder(null);
    alert("Servicio de carwash finalizado y cobrado con éxito.");
  };

  const exportarRecepcionImagen = async (o) => {
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
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    
    const checklistCount = defaultChecklistItems.length;
    const rowHeight = 35;

    const motString = `Servicio de Carwash: ${o.tipo}. Lavado y aspirado del vehículo.`;
    const dummyCanvas = document.createElement("canvas");
    const dummyCtx = dummyCanvas.getContext("2d");
    dummyCtx.font = "13px 'Plus Jakarta Sans', sans-serif";
    const motifLines = wrapText(dummyCtx, motString, 690);
    const motiveBoxHeight = 35 + (motifLines.length * 18);
    
    const checklistStart = 495 + motiveBoxHeight + 40;
    const checklistEnd = checklistStart + 30 + (checklistCount * rowHeight);
    
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
    const page1End = lightsEnd + 180;
    const loadedCount = loadedImages.filter(img => img !== null).length;
    const hasPhotos = loadedCount > 0;
    const page2Height = hasPhotos ? 230 + (Math.ceil(loadedCount / 2) * 285) : 0;
    
    canvas.height = page1End + page2Height;
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, 0, canvas.width, 150);
    
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

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px 'Orbitron', sans-serif";
    ctx.fillText("LOS PITS", 40, 95);
    
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("SERVICIO QUE SE SIENTE, CALIDAD QUE SE VE", 40, 120);
    
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(520, 0);
    ctx.lineTo(460, 150);
    ctx.stroke();
    
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
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("3 calle 6-47 zona 10,", 540, 44);
    ctx.fillText("Ciudad de Guatemala", 540, 59);
    
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
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("3271-1268", 540, 108);
    
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
    ctx.fillText("COMPROBANTE DE RECEPCIÓN - CARWASH", 400, 256);
    ctx.textAlign = "left";
    
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

    drawMetaRow(ctx, "user", "Cliente:", o.cliente || "Cliente General", 40, 335, 175);
    drawMetaRow(ctx, "phone", "Teléfono:", o.telefono || "S/N", 40, 375, 175);
    drawMetaRow(ctx, "money", "Combustible:", `${o.combustible ?? 50}%`, 40, 415, 175);
    
    const vehName = `${o.vehiculo?.marca || ""} ${o.vehiculo?.linea || ""}`.trim() || "Vehículo General";
    drawMetaRow(ctx, "car", "Vehículo:", vehName, 410, 335);
    drawMetaRow(ctx, "calendar", "Modelo:", (o.anio || "N/A").toString(), 410, 375);
    drawMetaRow(ctx, "plate", "Placa:", o.vehiculo?.placa || "N/A", 410, 415);
    const mileageFormatted = o.kilometraje ? parseInt(o.kilometraje).toLocaleString() : "N/A";
    drawMetaRow(ctx, "speedometer", "Kilometraje:", mileageFormatted, 410, 455);
    
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
    
    if (hasPhotos) {
      const page2Start = page1End;
      
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, page2Start, 800, 15);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, page2Start + 7);
      ctx.lineTo(800, page2Start + 7);
      ctx.stroke();

      const p2HeaderY = page2Start + 15;
      ctx.fillStyle = "#0a0c10";
      ctx.fillRect(0, p2HeaderY, 800, 80);
      
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(540, p2HeaderY);
      ctx.lineTo(500, p2HeaderY + 80);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px 'Orbitron', sans-serif";
      ctx.fillText("LOS PITS", 40, p2HeaderY + 48);
      
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 9px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("ANEXO DE FOTOS DE INGRESO DE VEHÍCULO", 40, p2HeaderY + 65);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(`Placa: ${o.vehiculo?.placa || "N/A"}`, 560, p2HeaderY + 35);
      
      let clientTrunc = o.cliente || "N/A";
      if (ctx.measureText(`Cliente: ${clientTrunc}`).width > 200) {
        while (ctx.measureText(`Cliente: ${clientTrunc}...`).width > 200 && clientTrunc.length > 0) {
          clientTrunc = clientTrunc.slice(0, -1);
        }
        clientTrunc += "...";
      }
      ctx.fillText(`Cliente: ${clientTrunc}`, 560, p2HeaderY + 55);

      const photosStartY = p2HeaderY + 110;
      let px = 40;
      let py = photosStartY;
      
      loadedImages.forEach((img, index) => {
        if (img) {
          if (index > 0 && index % 2 === 0) {
            px = 40;
            py += 285;
          }
          ctx.strokeStyle = "#e5e7eb";
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, 340, 255);
          
          drawImageProportional(ctx, img, px, py, 340, 255);
          px += 380;
        }
      });

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
    pdf.save(`Recepcion_Carwash_${o.vehiculo?.placa || "auto"}.pdf`);
  };

  const eliminarLavado = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este servicio de carwash?")) {
      setCarwash(carwash.filter((c) => c.id !== id));
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Module Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Carwash & Lavado</h1>
          <p>
            {isWorker 
              ? `Panel de Lavados Asignados a: ${usuarioActual.user}` 
              : "Gestión de servicios de lavado, aspirado y detallado automotriz."}
          </p>
        </div>
      </div>

      {/* Subnavigation Tabs */}
      {isManager && (
        <div style={styles.subTabs}>
          <button 
            onClick={() => setActiveSubTab("servicios")}
            style={{ ...styles.subTabBtn, ...(activeSubTab === "servicios" ? styles.subTabActive : {}) }}
          >
            <Car size={16} /> Servicios de Lavado
          </button>
          <button 
            onClick={() => setActiveSubTab("inventario")}
            style={{ ...styles.subTabBtn, ...(activeSubTab === "inventario" ? styles.subTabActive : {}) }}
          >
            <Warehouse size={16} /> Inventario & Costos Insumos
          </button>
        </div>
      )}

      {/* RENDER WASH SERVICES TAB */}
      {activeSubTab === "servicios" && (
        <div style={isManager ? styles.managerGrid : styles.workerGrid}>
        
        {/* Left Column: Create Wash Job (Only for Admin/Cajero) */}
        {isManager && (
          <div className="glass-panel" style={styles.formCard}>
            <div style={styles.formHeader}>
              <Plus size={20} color="var(--color-secondary)" />
              <h3 style={styles.formTitle}>Registrar Nuevo Lavado</h3>
            </div>
            
            <form onSubmit={registrarLavado} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Placa del Vehículo</label>
                <div style={{ position: "relative" }}>
                  <div style={styles.inputWrapper}>
                    <Car size={18} style={styles.inputIcon} />
                    <input
                      placeholder="Ej. P-123XYZ"
                      className="input-field"
                      value={placa}
                      onChange={handlePlacaChange}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      style={styles.input}
                    />
                  </div>
                  {showSuggestions && suggestions.length > 0 && (
                    <div style={styles.suggestionsContainer}>
                      {suggestions.map((v, i) => (
                        <div 
                          key={i} 
                          className="suggestion-item"
                          style={styles.suggestionItem}
                          onClick={() => selectVehicle(v)}
                        >
                          <div style={{ fontWeight: "700", color: "#fff", fontSize: "0.9rem" }}>{v.placa}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {v.marca} {v.linea} • {v.cliente}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1.5 }}>
                  <label style={styles.label}>Cliente</label>
                  <div style={styles.inputWrapper}>
                    <User size={18} style={styles.inputIcon} />
                    <input
                      placeholder="Nombre del cliente"
                      className="input-field"
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Teléfono</label>
                  <input
                    placeholder="Número de teléfono"
                    className="input-field"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
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
                <div style={{ ...styles.inputGroup, flex: 1.2 }}>
                  <label style={styles.label}>Marca *</label>
                  <input
                    placeholder="Toyota, Honda..."
                    className="input-field"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    required
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1.2 }}>
                  <label style={styles.label}>Línea / Modelo *</label>
                  <input
                    placeholder="Hilux, Civic..."
                    className="input-field"
                    value={linea}
                    onChange={(e) => setLinea(e.target.value)}
                    required
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 0.8 }}>
                  <label style={styles.label}>Color</label>
                  <input
                    placeholder="Gris, Rojo..."
                    className="input-field"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Año / Modelo</label>
                  <input
                    type="number"
                    placeholder="Ej. 2018"
                    className="input-field"
                    value={anio}
                    onChange={(e) => setAnio(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Kilometraje</label>
                  <input
                    type="number"
                    placeholder="Ej. 85000"
                    className="input-field"
                    value={kilometraje}
                    onChange={(e) => setKilometraje(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1.5 }}>
                  <label style={styles.label}>Chasis / VIN</label>
                  <input
                    placeholder="Chasis o VIN"
                    className="input-field"
                    value={chasis}
                    onChange={(e) => setChasis(e.target.value)}
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Nivel de Combustible</label>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%", padding: "10px 0" }}>
                  <div style={{ position: "relative", width: "120px", height: "65px", display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
                    <svg width="120" height="60" viewBox="0 0 100 50">
                      <path
                        d="M 15 45 A 35 35 0 0 1 85 45"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="10"
                        strokeLinecap="round"
                      />
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
                      <circle cx="50" cy="45" r="4" fill="#fff" />
                    </svg>
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

              <div style={styles.inputGroup}>
                <label style={styles.label}>Testigos de Advertencia (Tablero)</label>
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
                <div style={{ display: "flex", gap: "8px", marginTop: "10px", alignItems: "center" }}>
                  <input
                    placeholder="Añadir Testigo (Ej. Freno de mano)"
                    id="custom-warning-label-carwash"
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
                      const inputEl = document.getElementById("custom-warning-label-carwash");
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
                <label style={styles.label}>Asignar Lavadores (Opcional)</label>
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "4px" }}>
                  {lavadores.map((l, i) => {
                    const isChecked = selectedLavadores.includes(l);
                    return (
                      <label key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", cursor: "pointer", color: isChecked ? "#fff" : "var(--text-muted)", fontWeight: isChecked ? "bold" : "normal" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedLavadores(selectedLavadores.filter(val => val !== l));
                            } else {
                              setSelectedLavadores([...selectedLavadores, l]);
                            }
                          }}
                          style={{ accentColor: "var(--color-secondary)" }}
                        />
                        {l}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Fotos del Vehículo (Recepción)</label>
                <div style={styles.photoUploadContainer}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    style={{ display: "none" }}
                    id="carwash-photos-input"
                  />
                  <label htmlFor="carwash-photos-input" className="btn btn-ghost" style={styles.photoUploadLabel}>
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

              <div style={styles.presetSection}>
                <label style={{ ...styles.label, marginBottom: "8px", display: "block" }}>
                  Tipo de Lavado:
                </label>
                <div style={styles.presetButtonsRow}>
                  {presets.map((p, idx) => {
                    const isSelected = selectedPreset?.tipo === p.tipo;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPreset(p)}
                        className={`btn btn-preset-wash ${isSelected ? 'active-preset' : ''}`}
                        style={{
                          ...styles.presetBtnRow,
                          backgroundColor: isSelected ? "rgba(168, 85, 247, 0.2)" : "rgba(168, 85, 247, 0.05)",
                          borderColor: isSelected ? "var(--color-secondary)" : "rgba(168, 85, 247, 0.15)",
                          boxShadow: isSelected ? "var(--shadow-neon-secondary)" : "none",
                        }}
                      >
                        <span style={styles.presetName}>{p.tipo}</span>
                        <span style={styles.presetPrice}>{formatMoney(p.precio)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="submit" className="btn btn-secondary" style={styles.submitBtn}>
                <Car size={18} />
                Ingresar a Lavado
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
              placeholder="Buscar por cliente, teléfono, placa, marca o lavador..."
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* List Area */}
          <div style={styles.orderListContainer}>
            {filteredCarwash.length === 0 ? (
              <div className="glass-panel" style={styles.emptyState}>
                <Car size={48} color="var(--text-muted)" style={{ marginBottom: "16px", opacity: 0.4 }} />
                <h3>No hay lavados registrados</h3>
                <p>Asigna un lavador y selecciona un tipo para registrar o ajusta los criterios de búsqueda.</p>
              </div>
            ) : (
              <div style={styles.gridList}>
                {filteredCarwash.map((c) => (
                  <div className="glass-panel" key={c.id} style={styles.orderCard}>
                    {/* Top Row: Service Description & Badges */}
                    <div style={styles.cardHeader}>
                      <div>
                        <h4 style={styles.clientName}>{c.cliente || "Cliente General"}</h4>
                        <p style={styles.vehicleText}>
                          {c.vehiculo ? `${c.vehiculo.marca} ${c.vehiculo.linea} (${c.vehiculo.placa})` : `Lavado ${c.tipo}`}
                        </p>
                        {c.tallerOrderId && (
                          <span className="badge" style={{ backgroundColor: "var(--color-primary-glow)", color: "var(--color-primary)", borderColor: "rgba(59, 130, 246, 0.3)", marginTop: "5px", padding: "3px 8px", fontSize: "0.7rem" }}>
                            🔧 Desde Taller
                          </span>
                        )}
                      </div>
                      <span className={`badge ${
                        c.estado === "En proceso" ? "badge-process" :
                        c.estado === "Listo para entrega" ? "badge-ready" : "badge-paid"
                      }`} style={{ borderColor: c.estado === "En proceso" ? "rgba(168, 85, 247, 0.3)" : "" }}>
                        {c.estado === "En proceso" && <Clock size={12} style={{ marginRight: "4px" }} />}
                        {c.estado}
                      </span>
                    </div>

                    {/* Middle Row: Assignee, Prices */}
                    <div style={styles.cardBody}>
                      {c.telefono && (
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>📞 Teléfono:</span>
                          <span style={styles.infoVal}>{c.telefono}</span>
                        </div>
                      )}
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>🚗 Info Auto:</span>
                        <span style={styles.infoVal}>
                          {[c.vehiculo?.color].filter(Boolean).join("") || "Sin color"}
                        </span>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>🧼 Tipo Lavado:</span>
                        <span style={styles.infoVal}>{c.tipo}</span>
                      </div>
                      
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>🧼 Lavador(es):</span>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "60%" }}>
                          {lavadores.map((l, idx) => {
                            const washerList = c.lavadores || (c.lavador ? c.lavador.split(", ").filter(Boolean) : []);
                            const isChecked = washerList.includes(l);
                            return (
                              <label key={idx} style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "0.8rem", cursor: "pointer", color: isChecked ? "#fff" : "var(--text-muted)", fontWeight: isChecked ? "bold" : "normal" }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!isManager}
                                  onChange={() => {
                                    const newList = isChecked
                                      ? washerList.filter(val => val !== l)
                                      : [...washerList, l];
                                    asignarLavadores(c.id, newList);
                                  }}
                                  style={{ accentColor: "var(--color-secondary)" }}
                                />
                                {l}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>💰 Total Servicio:</span>
                        <span style={styles.infoValTotal}>{formatMoney(c.precio)}</span>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>🪙 Comisión Lavador:</span>
                        <span style={styles.infoValCom}>{formatMoney(c.comision)}</span>
                      </div>
                      
                      {c.fotos && c.fotos.length > 0 && (
                        <div style={styles.cardPhotosGrid}>
                          {c.fotos.map((foto, idx) => (
                            <img 
                              key={idx} 
                              src={foto} 
                              alt={`Lavado ${idx + 1}`} 
                              style={styles.cardPhotoThumbnail} 
                              onClick={() => setSelectedFullPhoto(foto)}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Row: Action Buttons */}
                    <div style={styles.cardFooter}>
                      <button
                        onClick={() => exportarRecepcionImagen(c)}
                        className="btn btn-ghost"
                        style={{ padding: "10px 8px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "4px" }}
                        title="Ver Hoja de Recepción"
                      >
                        📋 Ver Hoja
                      </button>

                      {/* Advance State */}
                      {c.estado !== "Entregado" && (c.estado === "En proceso" || !c.tallerOrderId) && (
                        <button
                          onClick={() => avanzarLavado(c.id)}
                          className={`btn ${c.estado === "En proceso" ? "btn-warning-glow-wash" : "btn-success-glow"}`}
                          style={styles.cardActionBtn}
                        >
                          <CheckCircle size={16} />
                          {c.estado === "En proceso" ? "Completar Lavado" : "Facturar y Entregar"}
                        </button>
                      )}
                      
                      {isManager && (
                        <button
                          onClick={() => eliminarLavado(c.id)}
                          className="btn-delete"
                          style={styles.deleteBtn}
                          title="Eliminar Servicio"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* RENDER CARWASH INVENTORY TAB */}
      {activeSubTab === "inventario" && isManager && (
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          {/* Inventory Metrics Row */}
          <div style={styles.metricsRow}>
            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-secondary-glow)" }}>
                <Warehouse size={20} color="var(--color-secondary)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Insumos Registrados</span>
                <span style={styles.metricValue}>{totalInvItems}</span>
              </div>
            </div>

            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-warning-glow)" }}>
                <Coins size={20} color="var(--color-warning)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Valorización de Insumos</span>
                <span style={{ ...styles.metricValue, color: "var(--color-warning)" }}>{formatMoney(totalInvValue)}</span>
              </div>
            </div>

            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "var(--color-danger-glow)" }}>
                <Coins size={20} color="var(--color-danger)" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Total Consumo Cargado</span>
                <span style={{ ...styles.metricValue, color: "var(--color-danger)" }}>{formatMoney(totalCostConsumed)}</span>
              </div>
            </div>

            <div className="glass-panel" style={styles.metricCard}>
              <div style={{ ...styles.iconBg, backgroundColor: "rgba(6, 182, 212, 0.15)" }}>
                <Coins size={20} color="#06b6d4" />
              </div>
              <div style={styles.metricInfo}>
                <span style={styles.metricLabel}>Costo Promedio Insumos / Lavado</span>
                <span style={{ ...styles.metricValue, color: "#06b6d4" }}>{formatMoney(averageCostPerWash)}</span>
              </div>
            </div>
          </div>

          {/* Grid CRUD */}
          <div style={styles.managerGrid}>
            {/* Left Form: CRUD */}
            <div className="glass-panel" style={styles.formCard}>
              <div style={styles.formHeader}>
                <Plus size={20} color="var(--color-secondary)" />
                <h3 style={styles.formTitle}>
                  {editingId ? "Editar Insumo" : "Agregar Insumo Carwash"}
                </h3>
              </div>

              <form onSubmit={handleInventorySubmit} style={styles.form}>
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ ...styles.inputGroup, flex: 2 }}>
                    <label style={styles.label}>Nombre del Insumo *</label>
                    <input
                      placeholder="Ej. Shampoo con Cera, Silicona"
                      className="input-field"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Presentación / Tamaño</label>
                    <input
                      placeholder="Ej. Litro, Galón, Unidad"
                      className="input-field"
                      value={presentation}
                      onChange={(e) => setPresentation(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Stock *</label>
                    <input
                      type="number"
                      placeholder="Ej. 10"
                      className="input-field"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="0"
                      required
                    />
                  </div>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Costo Unitario (Q) *</label>
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
                    {editingId ? "Actualizar Insumo" : "Registrar Insumo"}
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
                  placeholder="Buscar insumos por nombre..."
                  style={styles.searchInput}
                  value={invSearchQuery}
                  onChange={(e) => setInvSearchQuery(e.target.value)}
                />
              </div>

              <div className="glass-panel" style={{ padding: "20px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
                {filteredInvProducts.length === 0 ? (
                  <div style={styles.emptyState}>
                    <Warehouse size={48} color="var(--text-muted)" style={{ marginBottom: "16px", opacity: 0.4 }} />
                    <h3>No hay insumos registrados</h3>
                    <p>Usa el buscador o agrega en el formulario lateral.</p>
                  </div>
                ) : (
                  <div style={styles.tableResponsive}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Insumo</th>
                          <th style={styles.th}>Presentación</th>
                          <th style={styles.th}>Stock</th>
                          <th style={styles.th}>Costo Unitario</th>
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
                              <td style={{ ...styles.td, color: "var(--color-secondary)", fontWeight: "700" }}>
                                {formatMoney(p.purchasePrice)}
                              </td>
                              <td style={styles.td}>
                                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                  <button 
                                    onClick={() => registrarConsumo(p)}
                                    style={{ background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", color: "var(--color-secondary)", fontSize: "0.75rem", fontWeight: "bold" }}
                                    title="Consumir"
                                    disabled={p.quantity <= 0}
                                  >
                                    Consumir
                                  </button>
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
                <Coins size={22} color="var(--color-secondary)" /> Cobro y Facturación
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Servicio Carwash | Cliente: {checkoutOrder.cliente}
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
                  <span style={{ color: "var(--color-secondary)", fontSize: "1.2rem", fontWeight: "900" }}>{formatMoney(checkoutOrder.total)}</span>
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
                        backgroundColor: isChecked ? "rgba(168, 85, 247, 0.1)" : "rgba(255,255,255,0.02)",
                        padding: "8px",
                        borderRadius: "6px",
                        border: `1px solid ${isChecked ? "var(--color-secondary)" : "rgba(255,255,255,0.05)"}`
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

      <style>{`
        .btn-preset-wash {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          background: rgba(168, 85, 247, 0.05);
          border: 1px solid rgba(168, 85, 247, 0.15);
          color: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        .btn-preset-wash:hover {
          background: rgba(168, 85, 247, 0.12);
          border-color: var(--color-secondary);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.2);
        }
        .btn-preset-wash:active {
          transform: translateY(0);
        }

        .btn-warning-glow-wash {
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.3);
          color: var(--color-secondary);
          width: 100%;
        }
        .btn-warning-glow-wash:hover {
          background: var(--color-secondary);
          color: #fff;
          box-shadow: var(--shadow-neon-secondary);
        }
        .suggestion-item {
          transition: background-color 0.2s ease;
        }
        .suggestion-item:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
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
      {selectedFullPhoto && (
        <div style={styles.lightbox} onClick={() => setSelectedFullPhoto(null)}>
          <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img src={selectedFullPhoto} alt="Full Size" style={styles.lightboxImage} />
            <button style={styles.lightboxCloseBtn} onClick={() => setSelectedFullPhoto(null)}>
              &times;
            </button>
          </div>
        </div>
      )}
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
  inputRow: {
    display: "flex",
    gap: "10px",
    width: "100%",
  },
  presetButtonsRow: {
    display: "flex",
    gap: "10px",
    width: "100%",
  },
  presetBtnRow: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px",
    borderRadius: "10px",
    color: "#fff",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "1px solid",
  },
  submitBtn: {
    width: "100%",
    marginTop: "10px",
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
    background: "linear-gradient(135deg, #fff 60%, var(--color-secondary) 100%)",
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
    gap: "24px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
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
  select: {
    paddingLeft: "42px",
  },
  presetSection: {
    display: "flex",
    flexDirection: "column",
  },
  presetButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  presetDetails: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  presetName: {
    fontSize: "0.95rem",
    fontWeight: "700",
  },
  presetPrice: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    marginTop: "2px",
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
    color: "var(--color-secondary)",
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
  deleteBtn: {
    padding: "10px",
    borderRadius: "8px",
    background: "rgba(239, 68, 68, 0.05)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "var(--color-danger)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  subTabs: {
    display: "flex",
    gap: "10px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    paddingBottom: "10px",
    marginBottom: "20px",
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
};
