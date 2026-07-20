import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  CircleParking, 
  Clock, 
  Car, 
  Plus, 
  CheckCircle, 
  Trash2, 
  Edit,
  User,
  Coins,
  Wrench,
  UserCheck,
  X,
  AlertTriangle
} from "lucide-react";
import { formatMoney } from "../utils/storage";
import { jsPDF } from "jspdf";

const prefixesList = ["P", "A", "MI", "CD", "C", "M", "DIS"];

const parsePlate = (plateStr) => {
  if (!plateStr) return { prefix: "P", number: "" };
  for (const pref of prefixesList) {
    if (plateStr.startsWith(`${pref}-`)) {
      return { prefix: pref, number: plateStr.slice(pref.length + 1) };
    }
  }
  return { prefix: "Extranjera", number: plateStr };
};

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

export default function Parking({ 
  parkingEntries, 
  setParkingEntries, 
  parkingRate, 
  setParkingRate, 
  parkingHistory, 
  setParkingHistory, 
  usuarioActual,
  cuentasPorCobrar,
  setCuentasPorCobrar,
  clientes = [],
  setClientes
}) {
  const [platePrefix, setPlatePrefix] = useState("P");
  const [plateNumber, setPlateNumber] = useState("");
  const [marca, setMarca] = useState("");
  const [linea, setLinea] = useState("");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nit, setNit] = useState("");
  const [nombreFacturacion, setNombreFacturacion] = useState("");

  const [anio, setAnio] = useState("");
  const [color, setColor] = useState("");
  const [kilometraje, setKilometraje] = useState("");
  const [chasis, setChasis] = useState("");
  const [combustible, setCombustible] = useState(50);
  const [luces, setLuces] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [warningLightsList, setWarningLightsList] = useState(warningLightsDef);
  const [checklist, setChecklist] = useState(() => {
    const initial = {};
    defaultChecklistItems.forEach(item => {
      initial[item.id] = { status: "Bueno", note: "" };
    });
    return initial;
  });
  const [selectedFullPhoto, setSelectedFullPhoto] = useState(null);
  
  const [tempRate, setTempRate] = useState(parkingRate.toString());
  const [editingRate, setEditingRate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
  
  // Real-time ticking effect to refresh elapsed times every 30 seconds
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = usuarioActual?.rol === "admin";

  const handlePhotoChange = (e) => {
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
          setFotos((prev) => [...prev, compressedBase64]);
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const ingresarVehiculo = (e) => {
    e.preventDefault();
    const cleanNum = plateNumber.trim().toUpperCase();
    if (!cleanNum) {
      alert("La placa es obligatoria");
      return;
    }
    const fullPlaca = platePrefix === "Extranjera" ? cleanNum : `${platePrefix}-${cleanNum}`;

    // Check if vehicle already in parking
    const exists = parkingEntries.some(p => p.placa.toUpperCase().trim() === fullPlaca);
    if (exists) {
      alert("El vehículo con esta placa ya se encuentra en el parqueo.");
      return;
    }

    const nuevo = {
      id: Date.now(),
      placa: fullPlaca,
      marca: marca.trim(),
      linea: linea.trim(),
      cliente: cliente.trim() || "Cliente General",
      telefono: telefono.trim(),
      nit: nit.trim() || "C/F",
      nombreFacturacion: nombreFacturacion.trim() || cliente.trim() || "Cliente General",
      horaIngreso: new Date().toISOString(),
      anio: anio.trim(),
      color: color.trim(),
      fotos
    };

    // Register or update client in global list if they entered a phone
    const tel = telefono?.trim();
    if (tel && setClientes) {
      setClientes(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const exists = safePrev.find(c => c.telefono === tel);
        if (exists) {
          return safePrev.map(c => c.telefono === tel ? {
            ...c,
            nombre: cliente.trim() || c.nombre,
            nit: nit.trim() || c.nit,
            nombreFacturacion: nombreFacturacion.trim() || c.nombreFacturacion
          } : c);
        } else {
          return [...safePrev, {
            telefono: tel,
            nombre: cliente.trim() || "Cliente General",
            nit: nit.trim() || "C/F",
            nombreFacturacion: nombreFacturacion.trim() || cliente.trim() || "Cliente General",
            fechaRegistro: new Date().toISOString()
          }];
        }
      });
    }

    setParkingEntries([nuevo, ...parkingEntries]);
    setPlatePrefix("P");
    setPlateNumber("");
    setMarca("");
    setLinea("");
    setCliente("");
    setTelefono("");
    setNit("");
    setNombreFacturacion("");
    setAnio("");
    setColor("");
    setFotos([]);
  };

  const getElapsedTime = (horaIngreso) => {
    const entry = new Date(horaIngreso);
    const now = new Date();
    const diffMs = now - entry;
    
    const diffMinsTotal = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(diffMinsTotal / 60);
    const mins = diffMinsTotal % 60;
    
    return {
      totalMins: diffMinsTotal,
      formatted: `${hours}h ${mins}m`
    };
  };

  const calculateCharge = (horaIngreso) => {
    const { totalMins } = getElapsedTime(horaIngreso);
    // Charge is pro-rated per half hour
    // Q10/hour means Q5 per half hour fraction
    const fractionMins = 30;
    const ratePerFraction = parkingRate / 2;
    
    // Minimum charge is 1 fraction (e.g. Q5) even if parked for 1 min
    const fractions = Math.max(1, Math.ceil(totalMins / fractionMins));
    return fractions * ratePerFraction;
  };

  const cobrarSalida = (id) => {
    const entry = parkingEntries.find(p => p.id === id);
    if (!entry) return;

    const charge = calculateCharge(entry.horaIngreso);
    const { formatted, totalMins } = getElapsedTime(entry.horaIngreso);

    setCheckoutOrder({
      ...entry,
      total: charge,
      minutos: totalMins,
      formattedTime: formatted
    });
    setCheckoutNit(entry.nit || "C/F");
    setCheckoutNombreFacturacion(entry.nombreFacturacion || entry.cliente || "Cliente General");
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
          telefono: checkoutOrder.telefono || "",
          nit: checkoutNit.trim() || "C/F",
          concepto: `Parking Ticket #${checkoutOrder.id} - Placa ${checkoutOrder.placa}`,
          total: creditAmount,
          saldo: creditAmount,
          fecha: new Date().toISOString(),
          estado: "Pending",
          pagos: []
        };
        setCuentasPorCobrar([newCuenta, ...cuentasPorCobrar]);
      }
    }

    // Register history & remove entry
    const now = new Date();
    const cobro = {
      id: Date.now(),
      cliente: checkoutOrder.cliente || "Cliente General",
      telefono: checkoutOrder.telefono || "",
      placa: checkoutOrder.placa,
      marca: checkoutOrder.marca,
      linea: checkoutOrder.linea,
      horaIngreso: checkoutOrder.horaIngreso,
      horaSalida: now.toISOString(),
      minutos: checkoutOrder.minutos,
      total: checkoutOrder.total,
      tipo: "Parqueo",
      nit: checkoutNit.trim() || "C/F",
      nombreFacturacion: checkoutNombreFacturacion.trim() || checkoutOrder.cliente || "Cliente General",
      formaPago: breakdown,
      formaPagoDesc: paymentMethodsSelected.map(m => `${m.toUpperCase()} (Q${breakdown[m].toFixed(2)})`).join(", "),
      cajero: usuarioActual?.user || "Admin"
    };

    setParkingHistory([cobro, ...parkingHistory]);
    setParkingEntries(parkingEntries.filter(p => p.id !== checkoutOrder.id));
    setCheckoutOrder(null);
    alert("Cobro de parqueo procesado con éxito.");
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

    const motString = "Servicio de Parqueo y resguardo del vehículo en instalaciones.";
    const dummyCanvas = document.createElement("canvas");
    const dummyCtx = dummyCanvas.getContext("2d");
    dummyCtx.font = "13px 'Plus Jakarta Sans', sans-serif";
    const motifLines = wrapText(dummyCtx, motString, 690);
    const motiveBoxHeight = 35 + (motifLines.length * 18);
    
    const checklistStart = 495 + motiveBoxHeight + 40;
    const hasChecklist = o.checklist && Object.keys(o.checklist).length > 0;
    const checklistEnd = hasChecklist ? (checklistStart + 30 + (checklistCount * rowHeight)) : checklistStart;
    
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
    ctx.fillText("COMPROBANTE DE RECEPCIÓN - PARQUEO", 400, 256);
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
    if (o.combustible !== undefined && o.combustible !== null) {
      drawMetaRow(ctx, "money", "Combustible:", `${o.combustible}%`, 40, 415, 175);
    }
    
    const vehName = `${o.marca || ""} ${o.linea || ""}`.trim() || "Vehículo General";
    drawMetaRow(ctx, "car", "Vehículo:", vehName, 410, 335);
    drawMetaRow(ctx, "calendar", "Modelo:", (o.anio || "N/A").toString(), 410, 375);
    drawMetaRow(ctx, "plate", "Placa:", o.placa || "N/A", 410, 415);
    if (o.kilometraje) {
      const mileageFormatted = parseInt(o.kilometraje).toLocaleString();
      drawMetaRow(ctx, "speedometer", "Kilometraje:", mileageFormatted, 410, 455);
    }
    
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
    
    if (hasChecklist) {
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
    }
    
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
      ctx.fillText(`Placa: ${o.placa || "N/A"}`, 560, p2HeaderY + 35);
      
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
    pdf.save(`Recepcion_Parqueo_${o.placa || "auto"}.pdf`);
  };

  const eliminarRegistro = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este registro sin cobrar? (Uso de emergencia)")) {
      setParkingEntries(parkingEntries.filter(p => p.id !== id));
    }
  };

  const guardarNuevaTarifa = (e) => {
    e.preventDefault();
    const rate = parseFloat(tempRate);
    if (isNaN(rate) || rate < 0) {
      alert("Ingresa una tarifa válida mayor o igual a 0.");
      return;
    }
    setParkingRate(rate);
    setEditingRate(false);
  };

  const filteredEntries = parkingEntries.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.placa.toLowerCase().includes(query) ||
      p.marca.toLowerCase().includes(query) ||
      p.linea.toLowerCase().includes(query)
    );
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Control de Parqueo</h1>
          <p>Registro de entradas y cobro fraccionado en tiempo real.</p>
        </div>
        
        {/* Tarifas Settings */}
        <div className="glass-panel" style={styles.rateCard}>
          <Clock size={20} color="var(--color-primary)" style={{ marginRight: "10px" }} />
          <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>TARIFA POR HORA:</span>
            {editingRate ? (
              <form onSubmit={guardarNuevaTarifa} style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <input 
                  type="number" 
                  value={tempRate}
                  onChange={(e) => setTempRate(e.target.value)}
                  style={{ width: "80px", padding: "4px 8px", fontSize: "0.9rem", height: "28px" }}
                  className="input-field"
                  min="0"
                  step="any"
                />
                <button type="submit" className="btn btn-primary" style={{ padding: "0 10px", height: "28px", fontSize: "0.8rem" }}>
                  Guardar
                </button>
              </form>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "#fff" }}>
                  {formatMoney(parkingRate)}
                </span>
                {isAdmin && (
                  <button 
                    onClick={() => { setTempRate(parkingRate.toString()); setEditingRate(true); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                    title="Editar Tarifa"
                  >
                    <Edit size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="responsive-parking-grid">
        
        {/* Form Registration (Left) */}
        <div className="glass-panel" style={styles.formCard}>
          <div style={styles.formHeader}>
            <Plus size={20} color="var(--color-primary)" />
            <h3 style={styles.formTitle}>Registrar Ingreso de Vehículo</h3>
          </div>
          
          <form onSubmit={ingresarVehiculo} style={styles.form}>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ ...styles.inputGroup, flex: 1.5 }}>
                <label style={styles.label}>Cliente (Opcional)</label>
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
                    style={{ ...styles.input, paddingLeft: "42px" }}
                  />
                </div>
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Teléfono (Opcional)</label>
                <input
                  placeholder="Ej. 5544-3322"
                  className="input-field"
                  value={telefono}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTelefono(val);
                    const exactMatch = (clientes || []).find(c => c.telefono === val.trim());
                    if (exactMatch) {
                      setCliente(exactMatch.nombre || "");
                      if (exactMatch.nit) setNit(exactMatch.nit);
                      if (exactMatch.nombreFacturacion) setNombreFacturacion(exactMatch.nombreFacturacion);
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    const exactMatch = (clientes || []).find(c => c.telefono === val);
                    if (exactMatch) {
                      setCliente(exactMatch.nombre || "");
                      if (exactMatch.nit) setNit(exactMatch.nit);
                      if (exactMatch.nombreFacturacion) setNombreFacturacion(exactMatch.nombreFacturacion);
                    }
                  }}
                />
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Placa del Vehículo *</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    className="input-field"
                    value={platePrefix}
                    onChange={(e) => setPlatePrefix(e.target.value)}
                    style={{ width: "110px", padding: "4px 8px", cursor: "pointer" }}
                  >
                    <option value="P">P</option>
                    <option value="A">A</option>
                    <option value="MI">MI</option>
                    <option value="CD">CD</option>
                    <option value="C">C</option>
                    <option value="M">M</option>
                    <option value="DIS">DIS</option>
                    <option value="Extranjera">Extranjera</option>
                  </select>
                  <input
                    placeholder="123XYZ"
                    className="input-field"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    style={{ flex: 1, minWidth: 0, textTransform: "uppercase" }}
                    required
                  />
                </div>
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
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Marca (Opcional)</label>
                <input
                  placeholder="Toyota, Mazda..."
                  className="input-field"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                />
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Línea (Opcional)</label>
                <input
                  placeholder="Hilux, 3..."
                  className="input-field"
                  value={linea}
                  onChange={(e) => setLinea(e.target.value)}
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
                <label style={styles.label}>Color</label>
                <input
                  placeholder="Ej. Gris, Azul"
                  className="input-field"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
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
                  id="parking-photos-input"
                />
                <label htmlFor="parking-photos-input" className="btn btn-ghost" style={styles.photoUploadLabel}>
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
              <CircleParking size={18} />
              Registrar Entrada
            </button>
          </form>
        </div>

        {/* Active Grid (Right) */}
        <div style={styles.listColumn}>
          {/* Search Box */}
          <div className="glass-panel" style={styles.searchCard}>
            <CircleParking size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por placa, marca o línea..."
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* List */}
          <div style={styles.orderListContainer}>
            {filteredEntries.length === 0 ? (
              <div className="glass-panel" style={styles.emptyState}>
                <Car size={48} color="var(--text-muted)" style={{ marginBottom: "16px", opacity: 0.4 }} />
                <h3>No hay vehículos en el parqueo</h3>
                <p>Usa el formulario para registrar un ingreso.</p>
              </div>
            ) : (
              <div style={styles.gridList}>
                {filteredEntries.map((p) => {
                  const elapsed = getElapsedTime(p.horaIngreso);
                  const activeCharge = calculateCharge(p.horaIngreso);
                  return (
                    <div className="glass-panel" key={p.id} style={styles.ticketCard}>
                      <div style={styles.cardHeader}>
                        <div>
                          <h4 style={styles.placaText}>{p.placa}</h4>
                          <p style={styles.vehicleSubText}>
                            {[p.marca, p.linea].filter(Boolean).join(" ") || "Vehículo General"}
                          </p>
                        </div>
                        <span className="badge badge-process" style={{ borderColor: "rgba(59, 130, 246, 0.2)", backgroundColor: "var(--color-primary-glow)", color: "var(--color-primary)" }}>
                          <Clock size={12} style={{ marginRight: "4px" }} />
                          En Parqueo
                        </span>
                      </div>

                      <div style={styles.cardBody}>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>🕒 Hora Ingreso:</span>
                          <span style={styles.infoVal}>
                            {new Date(p.horaIngreso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>⏳ Tiempo transcurrido:</span>
                          <span style={{ ...styles.infoVal, color: "var(--color-warning)" }}>
                            {elapsed.formatted}
                          </span>
                        </div>
                        <div style={styles.infoRowDivider} />
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>💰 Importe actual:</span>
                          <span style={styles.infoValTotal}>
                            {formatMoney(activeCharge)}
                          </span>
                        </div>
                        {p.fotos && p.fotos.length > 0 && (
                          <div style={styles.cardPhotosGrid}>
                            {p.fotos.map((f, idx) => (
                              <img 
                                key={idx} 
                                src={f} 
                                alt="Foto recepcion" 
                                style={styles.cardPhotoThumbnail} 
                                onClick={() => setSelectedFullPhoto(f)}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={styles.cardFooter}>
                        <button
                          onClick={() => exportarRecepcionImagen(p)}
                          className="btn btn-ghost"
                          style={{ padding: "10px 8px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "4px" }}
                          title="Ver Hoja de Recepción"
                        >
                          📋 Ver Hoja
                        </button>
                        
                        <button
                          onClick={() => cobrarSalida(p.id)}
                          className="btn btn-primary"
                          style={{ ...styles.cardActionBtn, padding: "10px 10px", fontSize: "0.85rem" }}
                        >
                          <CheckCircle size={14} style={{ marginRight: "4px" }} />
                          Cobrar
                        </button>
                        
                        <button
                          onClick={() => eliminarRegistro(p.id)}
                          className="btn-delete"
                          style={{ padding: "10px", width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="Eliminar sin cobrar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* 🔐 COBRO Y FACTURACIÓN: MODAL DE PAGO DIVIDIDO */}
      {checkoutOrder && createPortal(
        <div style={styles.modalOverlay} className="modal-overlay-centered">
          <div className="glass-panel" style={{ ...styles.modalContent, maxWidth: "500px" }}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <Coins size={22} color="var(--color-primary)" /> Cobro y Facturación
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Servicio Parqueo | Placa: {checkoutOrder.placa} | Tiempo: {checkoutOrder.formattedTime}
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
        </div>,
        document.body
      )}

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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
  rateCard: {
    display: "flex",
    alignItems: "center",
    padding: "12px 20px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
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
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
    width: "100%",
  },
  ticketCard: {
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
  placaText: {
    fontSize: "1.2rem",
    fontWeight: "800",
    color: "#fff",
    fontFamily: "var(--font-display)",
    letterSpacing: "1px",
  },
  vehicleSubText: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    marginTop: "2px",
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    paddingBottom: "14px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    marginBottom: "14px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
  },
  infoRowDivider: {
    height: "1px",
    backgroundColor: "rgba(255,255,255,0.04)",
    margin: "4px 0",
  },
  infoLabel: {
    color: "var(--text-muted)",
  },
  infoVal: {
    fontWeight: "600",
    color: "#fff",
  },
  infoValTotal: {
    fontWeight: "800",
    color: "var(--color-success)",
    fontSize: "1rem",
  },
  cardFooter: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  cardActionBtn: {
    flex: 1,
    padding: "10px 14px",
    fontSize: "0.85rem",
    fontWeight: "700",
    height: "42px",
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
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
  }
};
