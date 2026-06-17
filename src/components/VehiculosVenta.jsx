import React, { useState } from "react";
import { 
  Car, 
  User, 
  Plus, 
  Coins, 
  Trash2, 
  Clock, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  X, 
  Upload, 
  Info, 
  DollarSign, 
  Tag, 
  Sparkles, 
  Phone 
} from "lucide-react";
import { formatMoney } from "../utils/storage";

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

export default function VehiculosVenta({
  vehiculosVenta = [],
  setVehiculosVenta,
  usuarioActual,
  cuentasPorCobrar,
  setCuentasPorCobrar,
  usuarios = []
}) {
  const [activeTab, setActiveTab] = useState("catalogo"); // 'catalogo' or 'registro'
  
  // Registration Form States
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nit, setNit] = useState("");
  const [nombreFacturacion, setNombreFacturacion] = useState("");
  
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [linea, setLinea] = useState("");
  const [anio, setAnio] = useState("");
  const [color, setColor] = useState("");
  const [kilometraje, setKilometraje] = useState("");
  const [chasis, setChasis] = useState("");
  
  const [combustible, setCombustible] = useState(50);
  const [luces, setLuces] = useState([]);
  const [fotos, setFotos] = useState([]); // Array of { url: base64, comment: "" }
  const [checklist, setChecklist] = useState(() => {
    const initial = {};
    defaultChecklistItems.forEach(item => {
      initial[item.id] = { status: "Bueno", note: "" };
    });
    return initial;
  });
  
  const [precioMinimo, setPrecioMinimo] = useState("");
  const [precioPublicacion, setPrecioPublicacion] = useState("");
  
  // Commission States
  const [vendedoresAsignados, setVendedoresAsignados] = useState([]);
  const [tipoComision, setTipoComision] = useState("monto"); // 'monto' or 'porcentaje'
  const [comisionValor, setComisionValor] = useState("");
  
  // Dynamic warning lights
  const [warningLightsList, setWarningLightsList] = useState(warningLightsDef);
  const [customLightText, setCustomLightText] = useState("");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFullPhoto, setSelectedFullPhoto] = useState(null);
  
  // Sell Confirmation Modal states
  const [selectedSellVehicle, setSelectedSellVehicle] = useState(null);
  const [sellPriceReal, setSellPriceReal] = useState("");
  const [sellVendedores, setSellVendedores] = useState([]);
  const [sellTipoComision, setSellTipoComision] = useState("monto");
  const [sellComisionValor, setSellComisionValor] = useState("");

  const addCustomWarningLight = () => {
    if (!customLightText.trim()) return;
    const newId = "custom_" + Date.now();
    const newLight = {
      id: newId,
      label: customLightText.trim(),
      color: "#f59e0b",
      glow: "rgba(245, 158, 11, 0.4)",
      icon: "⚠️"
    };
    setWarningLightsList([...warningLightsList, newLight]);
    setLuces([...luces, newId]);
    setCustomLightText("");
  };
  
  const isAdmin = usuarioActual?.rol === "admin";
  const isCajero = usuarioActual?.rol === "cajero";
  const isStaff = isAdmin || isCajero;

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
          setFotos((prev) => [...prev, { url: compressedBase64, comment: "" }]);
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhotoCommentChange = (index, value) => {
    setFotos((prev) =>
      prev.map((photo, i) => (i === index ? { ...photo, comment: value } : photo))
    );
  };

  const toggleWarningLight = (id) => {
    if (luces.includes(id)) {
      setLuces(luces.filter(l => l !== id));
    } else {
      setLuces([...luces, id]);
    }
  };

  const handleChecklistStatus = (itemId, status) => {
    setChecklist({
      ...checklist,
      [itemId]: { ...checklist[itemId], status }
    });
  };

  const handleChecklistNote = (itemId, note) => {
    setChecklist({
      ...checklist,
      [itemId]: { ...checklist[itemId], note }
    });
  };

  const registrarVehiculo = (e) => {
    e.preventDefault();
    if (!placa.trim()) {
      alert("La placa es obligatoria.");
      return;
    }
    if (!precioPublicacion) {
      alert("El precio de publicación es obligatorio.");
      return;
    }

    const minPrice = parseFloat(precioMinimo || 0);
    const pubPrice = parseFloat(precioPublicacion || 0);

    if (isNaN(pubPrice) || pubPrice <= 0) {
      alert("El precio de publicación debe ser un número positivo.");
      return;
    }
    if (precioMinimo && (isNaN(minPrice) || minPrice <= 0)) {
      alert("El precio mínimo debe ser un número positivo.");
      return;
    }

    // Verify if already registered
    const exists = vehiculosVenta.some(v => v.placa.toUpperCase().trim() === placa.toUpperCase().trim() && v.estado === "Disponible");
    if (exists) {
      alert("Ya existe un vehículo registrado con esta placa en el catálogo.");
      return;
    }

    const commVal = parseFloat(comisionValor || 0);
    let totalComisionCalculada = 0;
    if (vendedoresAsignados && vendedoresAsignados.length > 0) {
      if (tipoComision === "porcentaje") {
        totalComisionCalculada = pubPrice * (commVal / 100);
      } else {
        totalComisionCalculada = commVal;
      }
    }

    const nuevo = {
      id: Date.now(),
      placa: placa.toUpperCase().trim(),
      marca: marca.trim(),
      linea: linea.trim(),
      anio: anio.trim(),
      color: color.trim(),
      kilometraje: kilometraje.trim(),
      chasis: chasis.toUpperCase().trim(),
      cliente: cliente.trim() || "Cliente General",
      telefono: telefono.trim(),
      nit: nit.trim() || "C/F",
      nombreFacturacion: nombreFacturacion.trim() || cliente.trim() || "Cliente General",
      combustible,
      luces,
      checklist,
      fotos,
      precioMinimo: minPrice || pubPrice, // fallback to pubPrice if not set
      precioPublicacion: pubPrice,
      vendedoresAsignados,
      vendedorAsignado: vendedoresAsignados.join(", "),
      tipoComision,
      comisionValor: commVal,
      comisionTotalCalculada: totalComisionCalculada,
      lucesDef: warningLightsList,
      estado: "Disponible",
      fechaIngreso: new Date().toISOString(),
      cajero: usuarioActual?.user || "Admin"
    };

    setVehiculosVenta([nuevo, ...vehiculosVenta]);
    
    // Clear states
    setPlaca("");
    setMarca("");
    setLinea("");
    setAnio("");
    setColor("");
    setKilometraje("");
    setChasis("");
    setCliente("");
    setTelefono("");
    setNit("");
    setNombreFacturacion("");
    setCombustible(50);
    setLuces([]);
    setFotos([]);
    setPrecioMinimo("");
    setPrecioPublicacion("");
    const initCheck = {};
    defaultChecklistItems.forEach(item => {
      initCheck[item.id] = { status: "Bueno", note: "" };
    });
    setChecklist(initCheck);
    
    setVendedoresAsignados([]);
    setTipoComision("monto");
    setComisionValor("");
    setWarningLightsList(warningLightsDef);
    setCustomLightText("");
    
    setActiveTab("catalogo");
    alert("Vehículo registrado para venta con éxito.");
  };

  const handleConfirmarVenta = (e) => {
    e.preventDefault();
    if (!selectedSellVehicle) return;

    const realPrice = parseFloat(sellPriceReal || 0);
    const commVal = parseFloat(sellComisionValor || 0);

    if (isNaN(realPrice) || realPrice <= 0) {
      alert("Por favor ingresa un precio de venta real válido.");
      return;
    }
    if (isNaN(commVal) || commVal < 0) {
      alert("Por favor ingresa un valor de comisión válido.");
      return;
    }

    let calculatedComision = 0;
    if (sellVendedores && sellVendedores.length > 0) {
      if (sellTipoComision === "porcentaje") {
        calculatedComision = realPrice * (commVal / 100);
      } else {
        calculatedComision = commVal;
      }
    }

    setVehiculosVenta(
      vehiculosVenta.map((v) =>
        v.id === selectedSellVehicle.id
          ? {
              ...v,
              estado: "Vendido",
              precioVentaReal: realPrice,
              vendedoresAsignados: sellVendedores,
              vendedorAsignado: sellVendedores.join(", "),
              tipoComision: sellTipoComision,
              comisionValor: commVal,
              comisionTotalCalculada: calculatedComision,
              fechaVenta: new Date().toISOString(),
              cajeroVenta: usuarioActual?.user || "Admin"
            }
          : v
      )
    );

    setSelectedSellVehicle(null);
    alert("Vehículo marcado como VENDIDO con éxito.");
  };

  const eliminarRegistro = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este registro del catálogo?")) {
      setVehiculosVenta(vehiculosVenta.filter((v) => v.id !== id));
    }
  };

  const filteredVehicles = vehiculosVenta.filter((v) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      v.placa.toLowerCase().includes(query) ||
      v.marca.toLowerCase().includes(query) ||
      v.linea.toLowerCase().includes(query) ||
      v.cliente.toLowerCase().includes(query)
    );
  });

  const exportarRecepcionImagen = async (o) => {
    const loadImages = async (sources) => {
      return Promise.all(
        sources.map((srcObj) => {
          return new Promise((resolve) => {
            const img = new Image();
            // Handle if srcObj is a string or { url, comment }
            const src = typeof srcObj === "string" ? srcObj : srcObj.url;
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
          });
        })
      );
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
    const rowHeight = 33;
    const checklistStart = 600;
    const checklistEnd = checklistStart + 30 + (checklistCount * rowHeight);

    const currentLightsList = o.lucesDef || warningLightsDef;
    const hasWarningLights = o.luces && o.luces.length > 0;
    let lightsHeight = 0;
    const dummyCanvas = document.createElement("canvas");
    const dummyCtx = dummyCanvas.getContext("2d");
    dummyCtx.font = "bold 11px sans-serif";

    if (hasWarningLights) {
      let lx = 40;
      let lines = 1;
      o.luces.forEach((l) => {
        const lDef = currentLightsList.find((item) => item.id === l);
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
    const page1End = lightsEnd + 150;
    
    const loadedCount = loadedImages.filter((img) => img !== null).length;
    const hasPhotos = loadedCount > 0;
    const page2Height = hasPhotos ? 180 + (Math.ceil(loadedCount / 2) * 290) : 0;

    canvas.height = page1End + page2Height;
    const ctx = canvas.getContext("2d");

    // Clear background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header background
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, 0, canvas.width, 150);

    // Checker Flag decoration
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

    // Title Brand
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText("LOS PITS", 40, 95);

    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("SERVICIO QUE SE SIENTE, CALIDAD QUE SE VE", 40, 120);

    // Divider slant line
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(520, 0);
    ctx.lineTo(460, 150);
    ctx.stroke();

    // Map pin icon
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
    ctx.font = "12px sans-serif";
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

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText("3271-1268", 540, 108);

    // Rounded Box Helper
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

    // Date Box
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 300, 170, 200, 36, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#000000";
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    const dateFormatted = new Date(o.id).toLocaleDateString("es-GT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    ctx.fillText(`Fecha:  ${dateFormatted}`, 400, 194);
    ctx.textAlign = "left";

    // Subtitle bar
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
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RECEPCIÓN DE VEHÍCULO EN VENTA", 400, 256);
    ctx.textAlign = "left";

    // Split Line details
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(400, 300);
    ctx.lineTo(400, 470);
    ctx.stroke();

    // Left Column: Client info
    ctx.fillStyle = "#000000";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("DATOS DEL PROPIETARIO / CLIENTE", 50, 312);

    const drawMetaRow = (c2d, label, value, startX, startY) => {
      c2d.fillStyle = "#4b5563";
      c2d.font = "13px sans-serif";
      c2d.fillText(label + ":", startX, startY);
      c2d.fillStyle = "#111827";
      c2d.font = "bold 13px sans-serif";
      c2d.fillText(value || "N/A", startX + 90, startY);
    };

    drawMetaRow(ctx, "Propietario", o.cliente, 50, 345);
    drawMetaRow(ctx, "Teléfono", o.telefono, 50, 375);
    drawMetaRow(ctx, "NIT", o.nit, 50, 405);
    drawMetaRow(ctx, "Facturar a", o.nombreFacturacion, 50, 435);

    // Right Column: Vehicle details
    ctx.fillStyle = "#000000";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("DETALLES DEL VEHÍCULO", 420, 312);

    drawMetaRow(ctx, "Placa", o.placa, 420, 345);
    drawMetaRow(ctx, "Vehículo", `${o.marca} ${o.linea}`.trim(), 420, 375);
    drawMetaRow(ctx, "Año / Color", `${o.anio || "N/A"} / ${o.color || "N/A"}`, 420, 405);
    drawMetaRow(ctx, "Kilometraje", o.kilometraje ? `${o.kilometraje} km` : "N/A", 420, 435);
    drawMetaRow(ctx, "Chasis / VIN", o.chasis, 420, 465);

    // Fuel level indicator and Listing Price Box
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 485);
    ctx.lineTo(760, 485);
    ctx.stroke();

    // Semicircle fuel indicator
    ctx.fillStyle = "#111827";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("Nivel Combustible:", 50, 520);

    const fx = 200, fy = 550, frad = 35;
    // Draw background arc
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(fx, fy, frad, Math.PI, 0, false);
    ctx.stroke();

    // Draw active arc
    ctx.strokeStyle = "#3b82f6";
    ctx.beginPath();
    const fuelVal = typeof o.combustible === "number" ? o.combustible : 50;
    const endAngle = Math.PI + (Math.PI * (fuelVal / 100));
    ctx.arc(fx, fy, frad, Math.PI, endAngle, false);
    ctx.stroke();

    // Draw percentage text
    ctx.fillStyle = "#111827";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${fuelVal}%`, fx, fy - 10);
    ctx.textAlign = "left";

    // Public listing price prominently displayed on the page
    ctx.fillStyle = "#1e3a8a";
    drawRoundedRect(ctx, 420, 505, 320, 50, 8);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("PRECIO DE VENTA DE PUBLICACIÓN:", 435, 524);
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(formatMoney(o.precioPublicacion), 435, 546);

    // Checklist Section Title
    ctx.fillStyle = "#111827";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("INSPECCIÓN TÉCNICA DE RECEPCIÓN (12 PUNTOS)", 50, checklistStart - 20);

    // Draw checklist table header
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(40, checklistStart - 5, 720, 30);
    ctx.fillStyle = "#374151";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("Punto de Inspección", 55, checklistStart + 15);
    ctx.fillText("Bueno", 320, checklistStart + 15);
    ctx.fillText("Regular", 400, checklistStart + 15);
    ctx.fillText("Malo", 480, checklistStart + 15);
    ctx.fillText("Observación / Notas", 560, checklistStart + 15);

    // Draw checklist rows
    defaultChecklistItems.forEach((item, index) => {
      const y = checklistStart + 30 + (index * rowHeight);
      ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#f9fafb";
      ctx.fillRect(40, y, 720, rowHeight);

      // Grid line
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, y + rowHeight);
      ctx.lineTo(760, y + rowHeight);
      ctx.stroke();

      ctx.fillStyle = "#111827";
      ctx.font = "12px sans-serif";
      ctx.fillText(`${index + 1}. ${item.label}`, 55, y + 20);

      // Status mark check
      const checkData = o.checklist?.[item.id] || { status: "Bueno", note: "" };
      const status = checkData.status || "Bueno";
      const note = checkData.note || "";

      // Bueno Status
      ctx.fillStyle = status === "Bueno" ? "#059669" : "#d1d5db";
      ctx.font = status === "Bueno" ? "bold 14px sans-serif" : "12px sans-serif";
      ctx.fillText(status === "Bueno" ? "✓" : "○", 335, y + 20);

      // Regular Status
      ctx.fillStyle = status === "Regular" ? "#d97706" : "#d1d5db";
      ctx.font = status === "Regular" ? "bold 14px sans-serif" : "12px sans-serif";
      ctx.fillText(status === "Regular" ? "✓" : "○", 418, y + 20);

      // Malo Status
      ctx.fillStyle = status === "Malo" ? "#dc2626" : "#d1d5db";
      ctx.font = status === "Malo" ? "bold 14px sans-serif" : "12px sans-serif";
      ctx.fillText(status === "Malo" ? "✗" : "○", 492, y + 20);

      // Note
      ctx.fillStyle = "#4b5563";
      ctx.font = "11px sans-serif";
      ctx.fillText(note.substring(0, 30) + (note.length > 30 ? "..." : ""), 560, y + 20);
    });

    // Warning lights block if active
    if (hasWarningLights) {
      const lightsY = checklistEnd + 15;
      ctx.fillStyle = "#fffbeb";
      ctx.strokeStyle = "#fef3c7";
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, 40, lightsY, 720, lightsHeight, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#92400e";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("TESTIGOS ACTIVADOS EN EL TABLERO:", 55, lightsY + 22);

      let lx = 55;
      let ly = lightsY + 35;
      o.luces.forEach((l) => {
        const lDef = currentLightsList.find((item) => item.id === l);
        const lText = lDef ? `${lDef.icon} ${lDef.label}` : l;
        ctx.font = "bold 11px sans-serif";
        const textWidth = ctx.measureText(lText).width + 16;
        if (lx + textWidth > 745) {
          lx = 55;
          ly += 32;
        }

        // Draw light pill background
        ctx.fillStyle = lDef ? lDef.glow : "rgba(245, 158, 11, 0.2)";
        drawRoundedRect(ctx, lx, ly, textWidth, 24, 6);
        ctx.fill();

        ctx.strokeStyle = lDef ? lDef.color : "#f59e0b";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#111827";
        ctx.fillText(lText, lx + 8, ly + 16);

        lx += textWidth + 8;
      });
    }

    // Page 1 footer disclaimer
    const disY = lightsEnd + 25;
    ctx.fillStyle = "#9ca3af";
    ctx.font = "italic 10px sans-serif";
    ctx.fillText("Nota: Este reporte detalla las condiciones del vehículo en el momento de la entrega para consignación.", 50, disY);
    ctx.fillText("Los Pits Auto Center no se responsabiliza por fallas mecánicas internas no detectadas visualmente.", 50, disY + 15);

    // Signatures
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(120, disY + 90);
    ctx.lineTo(320, disY + 90);
    ctx.moveTo(480, disY + 90);
    ctx.lineTo(680, disY + 90);
    ctx.stroke();

    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Firma Cliente / Vendedor", 220, disY + 108);
    ctx.fillText("Firma Inspector (Los Pits)", 580, disY + 108);
    ctx.textAlign = "left";

    // PAGE 2: Photos Section (if exists)
    if (hasPhotos) {
      const p2Start = page1End;
      // Header for photos page
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, p2Start, canvas.width, 40);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("ANEXO FOTOGRÁFICO DE RECEPCIÓN", 40, p2Start + 26);

      let px = 50;
      let py = p2Start + 70;
      const cardW = 330;
      const cardH = 260;

      loadedImages.forEach((img, index) => {
        if (!img) return;

        if (index > 0 && index % 2 === 0) {
          px = 50;
          py += 290;
        }

        // Photo card container
        ctx.fillStyle = "#f9fafb";
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, px, py, cardW, cardH, 8);
        ctx.fill();
        ctx.stroke();

        // Draw image proportional
        drawImageProportional(ctx, img, px + 10, py + 10, cardW - 20, cardH - 50);

        // Photo comment caption
        const rawComment = o.fotos?.[index]?.comment || "";
        const commentText = rawComment.trim() || `Foto Recepción #${index + 1}`;
        ctx.fillStyle = "#374151";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(commentText.substring(0, 48), px + (cardW / 2), py + cardH - 15);
        ctx.textAlign = "left";

        px += 370;
      });
    }

    // Trigger PNG Download
    const dataURL = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `recepcion_venta_${o.placa || "venta"}_${o.id}.png`;
    link.href = dataURL;
    link.click();
    alert("Hoja de recepción generada y descargada exitosamente.");
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Dynamic Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Venta de Vehículos</h1>
          <p>Catálogo de vehículos en venta y gestión de consignaciones.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div style={styles.tabsContainer}>
          <button 
            style={{ 
              ...styles.tabBtn, 
              ...(activeTab === "catalogo" ? styles.tabBtnActive : {}) 
            }}
            onClick={() => setActiveTab("catalogo")}
          >
            📋 Catálogo de Venta
          </button>
          <button 
            style={{ 
              ...styles.tabBtn, 
              ...(activeTab === "registro" ? styles.tabBtnActive : {}) 
            }}
            onClick={() => setActiveTab("registro")}
          >
            ➕ Registrar Consignación
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "catalogo" ? (
        <div style={styles.catalogView}>
          {/* Search bar */}
          <div className="glass-panel" style={styles.searchBar}>
            <Search size={18} color="var(--text-muted)" style={{ marginLeft: "14px", marginRight: "10px" }} />
            <input 
              placeholder="Buscar por placa, marca, línea o propietario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Cards Grid */}
          {filteredVehicles.length === 0 ? (
            <div className="glass-panel" style={styles.emptyState}>
              <Car size={48} color="var(--text-muted)" style={{ marginBottom: "16px", opacity: 0.4 }} />
              <h3>No hay vehículos registrados para venta</h3>
              <p>Haz clic en "Registrar Consignación" para añadir uno nuevo.</p>
            </div>
          ) : (
            <div style={styles.gridList}>
              {filteredVehicles.map((v) => (
                <div 
                  className="glass-panel" 
                  key={v.id} 
                  style={{ 
                    ...styles.ticketCard,
                    ...(v.estado === "Vendido" ? styles.soldCard : {})
                  }}
                >
                  <div style={styles.cardHeader}>
                    <div>
                      <h4 style={styles.placaText}>{v.placa}</h4>
                      <p style={styles.vehicleSubText}>
                        {[v.marca, v.linea].filter(Boolean).join(" ") || "Vehículo General"}
                      </p>
                    </div>
                    {v.estado === "Vendido" ? (
                      <span className="badge" style={{ borderColor: "rgba(16, 185, 129, 0.3)", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                        🤝 Vendido
                      </span>
                    ) : (
                      <span className="badge" style={{ borderColor: "rgba(59, 130, 246, 0.3)", backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
                        ✨ Disponible
                      </span>
                    )}
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>🏷️ Precio Venta:</span>
                      <span style={{ ...styles.infoVal, color: "var(--color-primary)", fontSize: "1.1rem", fontWeight: "800" }}>
                        {formatMoney(v.precioPublicacion)}
                      </span>
                    </div>

                    {v.estado === "Vendido" && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>💰 Precio Real de Venta:</span>
                        <span style={{ ...styles.infoVal, color: "var(--color-success)", fontSize: "1.1rem", fontWeight: "800" }}>
                          {formatMoney(v.precioVentaReal || v.precioPublicacion)}
                        </span>
                      </div>
                    )}

                    {isStaff && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>🔒 Mínimo Autorizado:</span>
                        <span style={{ ...styles.infoVal, color: "var(--color-warning)", fontWeight: "700" }}>
                          {formatMoney(v.precioMinimo)}
                        </span>
                      </div>
                    )}
                    
                    <div style={styles.infoRowDivider} />
                    
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>👤 Propietario:</span>
                      <span style={styles.infoVal}>{v.cliente}</span>
                    </div>
                    
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>📞 Teléfono:</span>
                      <span style={styles.infoVal}>{v.telefono || "N/A"}</span>
                    </div>

                    {((v.vendedoresAsignados && v.vendedoresAsignados.length > 0) || v.vendedorAsignado) && (
                      <>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>🤝 Vendedor(es):</span>
                          <span style={styles.infoVal}>
                            {v.vendedoresAsignados && v.vendedoresAsignados.length > 0
                              ? v.vendedoresAsignados.join(", ")
                              : v.vendedorAsignado}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>💸 Comisión Total:</span>
                          <span style={{ ...styles.infoVal, color: "var(--color-success)" }}>
                            {formatMoney(v.comisionTotalCalculada)} ({v.tipoComision === "porcentaje" ? `${v.comisionValor}%` : "Fijo"})
                          </span>
                        </div>
                        {v.vendedoresAsignados && v.vendedoresAsignados.length > 1 && (
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>👤 Comisión c/u:</span>
                            <span style={{ ...styles.infoVal, color: "var(--color-success)" }}>
                              {formatMoney(v.comisionTotalCalculada / v.vendedoresAsignados.length)} c/u
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>📅 Año / Color:</span>
                      <span style={styles.infoVal}>{v.anio || "N/A"} / {v.color || "N/A"}</span>
                    </div>

                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>⛽ Combustible:</span>
                      <span style={styles.infoVal}>{v.combustible}%</span>
                    </div>

                    {v.luces && v.luces.length > 0 && (
                      <div style={{ marginTop: "4px" }}>
                        <span style={{ ...styles.infoLabel, fontSize: "0.75rem", display: "block", marginBottom: "4px" }}>🚨 Testigos activos:</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {v.luces.map((l) => {
                            const light = warningLightsDef.find((def) => def.id === l);
                            return (
                              <span 
                                key={l} 
                                style={{ 
                                  fontSize: "0.7rem", 
                                  padding: "2px 6px", 
                                  borderRadius: "4px", 
                                  backgroundColor: light?.glow || "rgba(255,255,255,0.05)",
                                  color: light?.color || "#fff",
                                  border: `1px solid ${light?.color || "rgba(255,255,255,0.1)"}` 
                                }}
                              >
                                {light?.icon} {light?.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {v.fotos && v.fotos.length > 0 && (
                      <div style={styles.cardPhotosGrid}>
                        {v.fotos.map((f, idx) => (
                          <img 
                            key={idx} 
                            src={f.url} 
                            alt="Foto recepcion" 
                            style={styles.cardPhotoThumbnail} 
                            onClick={() => setSelectedFullPhoto(f.url)}
                            title={f.comment || `Foto ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={styles.cardFooter}>
                    <button
                      onClick={() => exportarRecepcionImagen(v)}
                      className="btn btn-ghost"
                      style={{ padding: "8px 12px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "4px" }}
                      title="Ver Hoja de Recepción"
                    >
                      📋 Ver Hoja
                    </button>

                    {v.estado === "Disponible" && (
                      <button
                        onClick={() => {
                          setSelectedSellVehicle(v);
                          setSellPriceReal(v.precioPublicacion.toString());
                          setSellVendedores(v.vendedoresAsignados || (v.vendedorAsignado ? [v.vendedorAsignado] : []));
                          setSellTipoComision(v.tipoComision || "monto");
                          setSellComisionValor(v.comisionValor !== undefined ? v.comisionValor.toString() : "");
                        }}
                        className="btn btn-primary"
                        style={{ ...styles.cardActionBtn, padding: "8px 10px", fontSize: "0.82rem", backgroundColor: "#059669", borderColor: "#059669" }}
                      >
                        <CheckCircle size={14} style={{ marginRight: "4px" }} />
                        Vender
                      </button>
                    )}

                    <button
                      onClick={() => eliminarRegistro(v.id)}
                      className="btn-delete"
                      style={{ padding: "8px", width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center" }}
                      title="Eliminar registro"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Registration Form View */
        <div style={styles.formContainer}>
          <form onSubmit={registrarVehiculo} style={styles.formLayout}>
            {/* Left: General Info & Prices */}
            <div className="glass-panel" style={{ ...styles.formSection, flex: 1.2 }}>
              <h3 style={styles.sectionTitle}>📁 Datos Generales y Precios</h3>
              
              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1.5 }}>
                  <label style={styles.label}>Vendedor / Propietario *</label>
                  <input
                    required
                    placeholder="Nombre del cliente propietario"
                    className="input-field"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Teléfono</label>
                  <input
                    placeholder="Ej. 5544-3322"
                    className="input-field"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>NIT Facturación</label>
                  <input
                    placeholder="Ej. 1234567-8"
                    className="input-field"
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 2 }}>
                  <label style={styles.label}>Nombre Facturación</label>
                  <input
                    placeholder="Ej. Nombres y Apellidos / Empresa"
                    className="input-field"
                    value={nombreFacturacion}
                    onChange={(e) => setNombreFacturacion(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.infoRowDivider} />

              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Placa del Vehículo *</label>
                  <input
                    required
                    placeholder="Ej. P-984FLB"
                    className="input-field"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1.2 }}>
                  <label style={styles.label}>Chasis / VIN</label>
                  <input
                    placeholder="Ej. 1HGCR2F8..."
                    className="input-field"
                    value={chasis}
                    onChange={(e) => setChasis(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Marca</label>
                  <input
                    placeholder="Ej. Toyota"
                    className="input-field"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Línea / Modelo</label>
                  <input
                    placeholder="Ej. Hilux"
                    className="input-field"
                    value={linea}
                    onChange={(e) => setLinea(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Año</label>
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
                    placeholder="Ej. Blanco"
                    className="input-field"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1.2 }}>
                  <label style={styles.label}>Kilometraje</label>
                  <input
                    placeholder="Ej. 85000"
                    className="input-field"
                    value={kilometraje}
                    onChange={(e) => setKilometraje(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.infoRowDivider} />

              <h3 style={styles.sectionTitle}>💰 Información de Precios</h3>
              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Precio de Publicación (Venta) *</label>
                  <div style={styles.priceInputWrapper}>
                    <span style={styles.currencySymbol}>Q</span>
                    <input
                      required
                      type="number"
                      placeholder="Ej. 55000"
                      className="input-field"
                      value={precioPublicacion}
                      onChange={(e) => setPrecioPublicacion(e.target.value)}
                      style={{ paddingLeft: "30px" }}
                      min="0.01"
                      step="any"
                    />
                  </div>
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Precio Mínimo Autorizado (Privado) *</label>
                  <div style={styles.priceInputWrapper}>
                    <span style={styles.currencySymbol}>Q</span>
                    <input
                      required
                      type="number"
                      placeholder="Ej. 50000"
                      className="input-field"
                      value={precioMinimo}
                      onChange={(e) => setPrecioMinimo(e.target.value)}
                      style={{ paddingLeft: "30px" }}
                      min="0.01"
                      step="any"
                    />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                    Solo visible para Administradores y Cajeros.
                  </span>
                </div>
              </div>

              <div style={styles.infoRowDivider} />
              
              <h3 style={styles.sectionTitle}>🤝 Comisión del Vendedor</h3>
              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1.5 }}>
                  <label style={styles.label}>Vendedor(es) / Colaborador(es) Asignado(s)</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                    {(usuarios || []).map((u) => {
                      const isSelected = vendedoresAsignados.includes(u.user);
                      return (
                        <button
                          key={u.user}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setVendedoresAsignados(vendedoresAsignados.filter((name) => name !== u.user));
                            } else {
                              setVendedoresAsignados([...vendedoresAsignados, u.user]);
                            }
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "20px",
                            border: `1px solid ${isSelected ? "var(--color-primary)" : "rgba(255, 255, 255, 0.15)"}`,
                            backgroundColor: isSelected ? "rgba(59, 130, 246, 0.15)" : "var(--bg-surface)",
                            color: isSelected ? "var(--color-primary)" : "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: "0.82rem",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {isSelected ? "✓" : "+"} {u.user} <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>({u.rol})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Tipo de Comisión</label>
                  <select
                    className="input-field"
                    value={tipoComision}
                    onChange={(e) => setTipoComision(e.target.value)}
                    style={{ height: "42px", padding: "0 10px", width: "100%", background: "var(--bg-surface)", color: "#fff", border: "1px solid rgba(255, 255, 255, 0.15)" }}
                  >
                    <option value="monto" style={{ background: "#1f2937" }}>Monto Fijo (Q)</option>
                    <option value="porcentaje" style={{ background: "#1f2937" }}>Porcentaje (%)</option>
                  </select>
                </div>

                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Valor Comisión</label>
                  <input
                    type="number"
                    placeholder={tipoComision === "porcentaje" ? "Ej. 5" : "Ej. 500"}
                    className="input-field"
                    value={comisionValor}
                    onChange={(e) => setComisionValor(e.target.value)}
                    min="0"
                    step="any"
                    style={{ height: "42px" }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Inspection, fuel, warning lights, photos */}
            <div className="glass-panel" style={{ ...styles.formSection, flex: 1.5 }}>
              <h3 style={styles.sectionTitle}>⛽ Combustible y Testigos</h3>
              
              {/* Fuel Slider */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <label style={styles.label}>Nivel de Combustible: <strong style={{ color: "var(--color-primary)" }}>{combustible}%</strong></label>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Tanque</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={combustible}
                  onChange={(e) => setCombustible(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--color-primary)" }}
                />
              </div>

              {/* Warning Lights Grid */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ ...styles.label, marginBottom: "8px", display: "block" }}>Testigos Activos en Tablero:</label>
                <div style={styles.warningLightsGrid}>
                  {warningLightsList.map((light) => {
                    const isActive = luces.includes(light.id);
                    return (
                      <button
                        key={light.id}
                        type="button"
                        onClick={() => toggleWarningLight(light.id)}
                        style={{
                          ...styles.warningLightBtn,
                          ...(isActive 
                            ? { backgroundColor: light.glow, borderColor: light.color, color: "#fff" } 
                            : {})
                        }}
                      >
                        <span style={{ marginRight: "4px" }}>{light.icon}</span>
                        {light.label}
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Warning Light */}
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <input
                    placeholder="Otro testigo (ej. Freno Mano, Luces Altas)"
                    value={customLightText}
                    onChange={(e) => setCustomLightText(e.target.value)}
                    className="input-field"
                    style={{ flex: 1, height: "36px", fontSize: "0.85rem", padding: "4px 10px" }}
                  />
                  <button
                    type="button"
                    onClick={addCustomWarningLight}
                    className="btn btn-primary"
                    style={{ height: "36px", padding: "0 12px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Plus size={14} /> Agregar Testigo
                  </button>
                </div>
              </div>

              <div style={styles.infoRowDivider} />

              {/* Checklist 12 Puntos */}
              <h3 style={{ ...styles.sectionTitle, marginTop: "12px" }}>📋 Inspección Técnica (12 Puntos)</h3>
              <div style={styles.checklistScrollContainer}>
                {defaultChecklistItems.map((item) => {
                  const check = checklist[item.id] || { status: "Bueno", note: "" };
                  return (
                    <div key={item.id} style={styles.checklistFormItem}>
                      <div style={{ flex: 1, minWidth: "120px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>{item.label}</span>
                      </div>
                      
                      {/* Status selectors */}
                      <div style={styles.checklistStatusRow}>
                        <button
                          type="button"
                          onClick={() => handleChecklistStatus(item.id, "Bueno")}
                          style={{
                            ...styles.checklistStatusBtn,
                            ...(check.status === "Bueno" ? styles.checklistBuenoActive : {})
                          }}
                        >
                          Bueno
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChecklistStatus(item.id, "Regular")}
                          style={{
                            ...styles.checklistStatusBtn,
                            ...(check.status === "Regular" ? styles.checklistRegularActive : {})
                          }}
                        >
                          Regular
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChecklistStatus(item.id, "Malo")}
                          style={{
                            ...styles.checklistStatusBtn,
                            ...(check.status === "Malo" ? styles.checklistMaloActive : {})
                          }}
                        >
                          Malo
                        </button>
                      </div>

                      {/* Observations note */}
                      <div style={{ flex: 1.2 }}>
                        <input
                          placeholder="Nota / Observación"
                          value={check.note}
                          onChange={(e) => handleChecklistNote(item.id, e.target.value)}
                          className="input-field"
                          style={{ height: "30px", fontSize: "0.8rem", padding: "4px 8px" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={styles.infoRowDivider} />

              {/* Photo Upload */}
              <h3 style={{ ...styles.sectionTitle, marginTop: "12px" }}>📷 Fotos de Recepción</h3>
              <div style={styles.photoUploadContainer}>
                <label style={styles.photoUploadLabel}>
                  <Upload size={18} />
                  <span>Subir Fotos de Recepción</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{ display: "none" }}
                  />
                </label>

                {fotos.length > 0 && (
                  <div style={styles.fotosContainer}>
                    {fotos.map((foto, idx) => (
                      <div key={idx} style={styles.fotoRow}>
                        <div style={styles.previewImageWrapper}>
                          <img src={foto.url} alt={`preview-${idx}`} style={styles.previewImage} />
                          <button 
                            type="button" 
                            onClick={() => removePhoto(idx)} 
                            style={styles.previewRemoveBtn}
                          >
                            <X size={10} />
                          </button>
                        </div>
                        <input
                          placeholder="Añade un comentario a esta foto..."
                          value={foto.comment}
                          onChange={(e) => handlePhotoCommentChange(idx, e.target.value)}
                          className="input-field"
                          style={{ flex: 1, height: "40px", fontSize: "0.85rem" }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={styles.formActions}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setActiveTab("catalogo")}
                  style={{ height: "46px" }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ height: "46px", flex: 1 }}
                >
                  Guardar y Registrar Vehículo
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Lightbox for previewing full photos */}
      {selectedFullPhoto && (
        <div style={styles.lightbox} onClick={() => setSelectedFullPhoto(null)}>
          <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img src={selectedFullPhoto} alt="Full view" style={styles.lightboxImage} />
            <button style={styles.lightboxCloseBtn} onClick={() => setSelectedFullPhoto(null)}>×</button>
          </div>
        </div>
      )}

      {/* 🔐 SELL CONFIRMATION MODAL */}
      {selectedSellVehicle && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={{ ...styles.modalContent, maxWidth: "450px" }}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                🤝 Confirmar Venta de Vehículo
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px", margin: "4px 0 0 0" }}>
                Placa: {selectedSellVehicle.placa} | {selectedSellVehicle.marca} {selectedSellVehicle.linea}
              </p>
            </div>

            <form onSubmit={handleConfirmarVenta} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Precio de Venta Real (Q) *</label>
                <div style={styles.priceInputWrapper}>
                  <span style={styles.currencySymbol}>Q</span>
                  <input
                    required
                    type="number"
                    value={sellPriceReal}
                    onChange={(e) => setSellPriceReal(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: "30px", height: "42px" }}
                    min="0.01"
                    step="any"
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Vendedor(es) / Colaborador(es) que realizó la venta</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                  {(usuarios || []).map((u) => {
                    const isSelected = sellVendedores.includes(u.user);
                    return (
                      <button
                        key={u.user}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSellVendedores(sellVendedores.filter((name) => name !== u.user));
                          } else {
                            setSellVendedores([...sellVendedores, u.user]);
                          }
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          border: `1px solid ${isSelected ? "#059669" : "rgba(255, 255, 255, 0.15)"}`,
                          backgroundColor: isSelected ? "rgba(16, 185, 129, 0.15)" : "var(--bg-surface)",
                          color: isSelected ? "#34d399" : "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: "0.82rem",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {isSelected ? "✓" : "+"} {u.user} <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>({u.rol})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {sellVendedores && sellVendedores.length > 0 && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ ...styles.inputGroup, flex: 1.2 }}>
                    <label style={styles.label}>Tipo de Comisión</label>
                    <select
                      className="input-field"
                      value={sellTipoComision}
                      onChange={(e) => setSellTipoComision(e.target.value)}
                      style={{ height: "42px", padding: "0 10px", width: "100%", background: "var(--bg-surface)", color: "#fff", border: "1px solid rgba(255, 255, 255, 0.15)" }}
                    >
                      <option value="monto" style={{ background: "#1f2937" }}>Monto Fijo (Q)</option>
                      <option value="porcentaje" style={{ background: "#1f2937" }}>Porcentaje (%)</option>
                    </select>
                  </div>

                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    <label style={styles.label}>Valor Comisión</label>
                    <input
                      required
                      type="number"
                      value={sellComisionValor}
                      onChange={(e) => setSellComisionValor(e.target.value)}
                      className="input-field"
                      style={{ height: "42px" }}
                      min="0"
                      step="any"
                    />
                  </div>
                </div>
              )}

              {sellVendedores && sellVendedores.length > 0 && sellPriceReal && sellComisionValor && (
                <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.15)", fontSize: "0.85rem", color: "#fff" }}>
                  <strong>Comisión Total Estimada: </strong>
                  <span style={{ color: "var(--color-success)", fontWeight: "700" }}>
                    {formatMoney(
                      sellTipoComision === "porcentaje"
                        ? (parseFloat(sellPriceReal) || 0) * ((parseFloat(sellComisionValor) || 0) / 100)
                        : (parseFloat(sellComisionValor) || 0)
                    )}
                  </span>
                  {sellVendedores.length > 1 && (
                    <div style={{ marginTop: "4px", fontSize: "0.78rem", opacity: 0.9 }}>
                      (Equivale a {formatMoney(
                        (sellTipoComision === "porcentaje"
                          ? (parseFloat(sellPriceReal) || 0) * ((parseFloat(sellComisionValor) || 0) / 100)
                          : (parseFloat(sellComisionValor) || 0)) / sellVendedores.length
                      )} para cada uno)
                    </div>
                  )}
                </div>
              )}

              <div style={styles.formActions}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelectedSellVehicle(null)}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, backgroundColor: "#059669", borderColor: "#059669" }}
                >
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
    display: "flex",
    flexDirection: "column",
    padding: "24px",
    width: "100%",
    height: "100vh",
    overflowY: "auto",
    textAlign: "left",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "16px",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: "800",
    color: "#fff",
    marginBottom: "4px",
  },
  tabsContainer: {
    display: "flex",
    gap: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    padding: "4px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  tabBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "600",
    transition: "var(--transition-smooth)",
  },
  tabBtnActive: {
    background: "rgba(59, 130, 246, 0.1)",
    color: "var(--color-primary)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
  },
  catalogView: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    width: "100%",
  },
  searchBar: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "0",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  searchInput: {
    width: "100%",
    padding: "12px 14px",
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: "0.95rem",
    outline: "none",
  },
  gridList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
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
    minHeight: "280px",
    position: "relative",
  },
  soldCard: {
    opacity: 0.65,
    border: "1px solid rgba(16, 185, 129, 0.15)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
    gap: "10px",
  },
  placaText: {
    fontSize: "1.25rem",
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
    alignItems: "center",
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
    height: "38px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    color: "var(--text-muted)",
  },
  formContainer: {
    width: "100%",
  },
  formLayout: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
    width: "100%",
  },
  formSection: {
    padding: "24px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: "300px",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#fff",
    marginBottom: "8px",
    borderLeft: "3px solid var(--color-primary)",
    paddingLeft: "10px",
  },
  formRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    textAlign: "left",
  },
  label: {
    fontSize: "0.8rem",
    fontWeight: "600",
    color: "var(--text-muted)",
  },
  priceInputWrapper: {
    position: "relative",
    width: "100%",
  },
  currencySymbol: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
    fontWeight: "700",
  },
  warningLightsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
    gap: "6px",
  },
  warningLightBtn: {
    display: "flex",
    alignItems: "center",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.02)",
    color: "var(--text-muted)",
    fontSize: "0.75rem",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
  },
  checklistScrollContainer: {
    maxHeight: "350px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    paddingRight: "6px",
  },
  checklistFormItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 10px",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.03)",
    gap: "12px",
    flexWrap: "wrap",
  },
  checklistStatusRow: {
    display: "flex",
    gap: "4px",
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: "2px",
    borderRadius: "6px",
  },
  checklistStatusBtn: {
    padding: "4px 8px",
    fontSize: "0.75rem",
    fontWeight: "600",
    border: "none",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    borderRadius: "4px",
    transition: "all 0.15s ease",
  },
  checklistBuenoActive: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#34d399",
    border: "1px solid rgba(16, 185, 129, 0.3)",
  },
  checklistRegularActive: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    color: "#fbbf24",
    border: "1px solid rgba(245, 158, 11, 0.3)",
  },
  checklistMaloActive: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
  photoUploadContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
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
  fotosContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "8px",
  },
  fotoRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  previewImageWrapper: {
    position: "relative",
    width: "60px",
    height: "60px",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    flexShrink: 0,
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
  formActions: {
    display: "flex",
    gap: "12px",
    marginTop: "20px",
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
