import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Zap, 
  X, 
  Plus, 
  Trash2, 
  FileText, 
  Share2, 
  Send, 
  Car, 
  User, 
  Search, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Calendar, 
  ArrowRightCircle, 
  Sparkles, 
  Printer, 
  History, 
  Wrench,
  Package,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { formatMoney } from "../utils/storage";
import { DEFAULT_BRANDING, getCleanBranding, drawCanvasHeader } from "../utils/branding";
import { findVehiclesForClient } from "../utils/vehicleHelpers";
import ClientVehiclesModal from "./ClientVehiclesModal";
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

export default function ExpressQuoteModal({
  isOpen,
  onClose,
  clientes = [],
  vehiculos = [],
  ordenes = [],
  carwash = [],
  workshopInventory = [],
  workshopBranding = DEFAULT_BRANDING,
  cotizacionesExpress = [],
  setCotizacionesExpress,
  onConvertToOrder,
  usuarioActual
}) {
  const [activeTab, setActiveTab] = useState("form"); // 'form' or 'history'
  
  // Form State
  const [quoteId, setQuoteId] = useState(null);
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nit, setNit] = useState("C/F");
  const [nombreFacturacion, setNombreFacturacion] = useState("");
  const [platePrefix, setPlatePrefix] = useState("P");
  const [plateNumber, setPlateNumber] = useState("");
  const [marca, setMarca] = useState("");
  const [linea, setLinea] = useState("");
  const [anio, setAnio] = useState("");
  const [color, setColor] = useState("");
  const [kilometraje, setKilometraje] = useState("");

  const [servicios, setServicios] = useState([
    { id: 1, desc: "", price: "" }
  ]);
  const [repuestos, setRepuestos] = useState([
    { id: 1, name: "", qty: 1, price: "", brand: "" }
  ]);
  const [descuento, setDescuento] = useState("");
  const [diasValidez, setDiasValidez] = useState("15");
  const [notas, setNotas] = useState("Precios incluyen mano de obra e instalación. Cotización válida por 15 días. Sujeto a disponibilidad de repuestos.");

  // Autocomplete suggestions
  const [clienteSuggestions, setClienteSuggestions] = useState([]);
  const [inventorySuggestionsIdx, setInventorySuggestionsIdx] = useState(null);
  const [clientVehiclesModalData, setClientVehiclesModalData] = useState({
    isOpen: false,
    clienteNombre: "",
    vehicles: []
  });

  // History search filter
  const [historySearch, setHistorySearch] = useState("");
  const [savedSuccessMsg, setSavedSuccessMsg] = useState(false);

  // Initialize or reset form
  const resetForm = () => {
    setQuoteId(null);
    setCliente("");
    setTelefono("");
    setNit("C/F");
    setNombreFacturacion("");
    setPlatePrefix("P");
    setPlateNumber("");
    setMarca("");
    setLinea("");
    setAnio("");
    setColor("");
    setKilometraje("");
    setServicios([{ id: Date.now(), desc: "", price: "" }]);
    setRepuestos([{ id: Date.now() + 1, name: "", qty: 1, price: "", brand: "" }]);
    setDescuento("");
    setDiasValidez("15");
    setNotas("Precios incluyen mano de obra e instalación. Cotización válida por 15 días. Sujeto a disponibilidad de repuestos.");
    setClienteSuggestions([]);
  };

  // Load an existing quote into the form
  const handleLoadQuoteToForm = (q) => {
    setQuoteId(q.id);
    setCliente(q.cliente || "");
    setTelefono(q.telefono || "");
    setNit(q.nit || "C/F");
    setNombreFacturacion(q.nombreFacturacion || q.cliente || "");
    const parsed = parsePlate(q.placa || "");
    setPlatePrefix(q.platePrefix || parsed.prefix || "P");
    setPlateNumber(q.plateNumber || parsed.number || "");
    setMarca(q.marca || "");
    setLinea(q.linea || "");
    setAnio(q.anio || "");
    setColor(q.color || "");
    setKilometraje(q.kilometraje || "");

    if (Array.isArray(q.servicios) && q.servicios.length > 0) {
      setServicios(q.servicios);
    } else {
      setServicios([{ id: Date.now(), desc: "", price: "" }]);
    }

    if (Array.isArray(q.repuestos) && q.repuestos.length > 0) {
      setRepuestos(q.repuestos);
    } else {
      setRepuestos([{ id: Date.now() + 1, name: "", qty: 1, price: "", brand: "" }]);
    }

    setDescuento(q.descuento || "");
    setDiasValidez(q.diasValidez || "15");
    setNotas(q.notas || "Precios incluyen mano de obra e instalación. Cotización válida por 15 días. Sujeto a disponibilidad de repuestos.");
    setActiveTab("form");
  };

  // Client Selection Handlers
  const handleClienteChange = (val) => {
    setCliente(val);
    if (!val.trim()) {
      setClienteSuggestions([]);
      return;
    }
    const q = val.toLowerCase().trim();
    const matches = (clientes || []).filter(c => 
      (c.nombre || "").toLowerCase().includes(q) || 
      (c.telefono || "").includes(q)
    ).slice(0, 5);
    setClienteSuggestions(matches);
  };

  const applySelectedVehicle = (v) => {
    if (v.placa) {
      const parsed = parsePlate(v.placa);
      setPlatePrefix(parsed.prefix);
      setPlateNumber(parsed.number);
    }
    if (v.marca) setMarca(v.marca);
    if (v.linea) setLinea(v.linea);
    if (v.color) setColor(v.color);
    if (v.anio || v.modelo) setAnio(v.anio || v.modelo);
    setClientVehiclesModalData({ isOpen: false, clienteNombre: "", vehicles: [] });
  };

  const selectClienteSuggestion = (c) => {
    setCliente(c.nombre || "");
    if (c.telefono && !telefono.trim()) setTelefono(c.telefono);
    if (c.nit && (!nit || nit === "C/F")) setNit(c.nit);
    if (c.nombreFacturacion && !nombreFacturacion.trim()) setNombreFacturacion(c.nombreFacturacion);
    setClienteSuggestions([]);

    const cVehicles = findVehiclesForClient({
      clienteNombre: c.nombre,
      clienteTelefono: c.telefono,
      clienteId: c.id,
      vehiculos,
      ordenes,
      carwash
    });

    if (cVehicles.length === 1) {
      applySelectedVehicle(cVehicles[0]);
    } else if (cVehicles.length > 1) {
      setClientVehiclesModalData({
        isOpen: true,
        clienteNombre: c.nombre,
        vehicles: cVehicles
      });
    }
  };

  // Labor Item Handlers
  const addServicioRow = () => {
    setServicios(prev => [...prev, { id: Date.now(), desc: "", price: "" }]);
  };

  const removeServicioRow = (id) => {
    if (servicios.length <= 1) {
      setServicios([{ id: Date.now(), desc: "", price: "" }]);
      return;
    }
    setServicios(prev => prev.filter(s => s.id !== id));
  };

  const updateServicio = (id, field, val) => {
    setServicios(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  // Parts Item Handlers
  const addRepuestoRow = () => {
    setRepuestos(prev => [...prev, { id: Date.now(), name: "", qty: 1, price: "", brand: "" }]);
  };

  const removeRepuestoRow = (id) => {
    if (repuestos.length <= 1) {
      setRepuestos([{ id: Date.now(), name: "", qty: 1, price: "", brand: "" }]);
      return;
    }
    setRepuestos(prev => prev.filter(r => r.id !== id));
  };

  const updateRepuesto = (id, field, val) => {
    setRepuestos(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const selectInventoryItem = (repuestoId, item) => {
    setRepuestos(prev => prev.map(r => {
      if (r.id === repuestoId) {
        return {
          ...r,
          name: item.name || "",
          price: item.salePrice || item.price || "",
          brand: item.brand || ""
        };
      }
      return r;
    }));
    setInventorySuggestionsIdx(null);
  };

  // Totals Calculations
  const subtotalLabor = servicios.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  const subtotalParts = repuestos.reduce((sum, r) => sum + ((parseFloat(r.qty) || 1) * (parseFloat(r.price) || 0)), 0);
  const discountVal = parseFloat(descuento) || 0;
  const totalCotizacion = Math.max(0, subtotalLabor + subtotalParts - discountVal);

  // Build Quote Object
  const getQuoteObject = () => {
    const fullPlaca = plateNumber.trim() ? `${platePrefix}-${plateNumber.trim().toUpperCase()}` : "";
    return {
      id: quoteId || `express_${Date.now()}`,
      cliente: cliente.trim() || "Cliente General",
      telefono: telefono.trim(),
      nit: nit.trim() || "C/F",
      nombreFacturacion: nombreFacturacion.trim() || cliente.trim() || "Cliente General",
      platePrefix,
      plateNumber: plateNumber.trim().toUpperCase(),
      placa: fullPlaca,
      marca: marca.trim(),
      linea: linea.trim(),
      anio: anio.trim(),
      color: color.trim(),
      kilometraje: kilometraje.trim(),
      servicios: servicios.filter(s => s.desc.trim() || parseFloat(s.price) > 0),
      repuestos: repuestos.filter(r => r.name.trim() || parseFloat(r.price) > 0),
      subtotalLabor,
      subtotalParts,
      descuento: discountVal,
      total: totalCotizacion,
      diasValidez: diasValidez.trim() || "15",
      notas: notas.trim(),
      fecha: new Date().toISOString(),
      estado: "Pendiente", // 'Pendiente', 'Convertida en Orden', 'Rechazada'
      usuarioCreador: usuarioActual?.user || "Admin"
    };
  };

  // Save Express Quote
  const handleSaveQuote = (e) => {
    if (e) e.preventDefault();
    if (!cliente.trim() && !plateNumber.trim()) {
      alert("Por favor ingresa al menos el nombre del cliente o la placa del vehículo.");
      return;
    }

    const newQuote = getQuoteObject();
    if (typeof setCotizacionesExpress === "function") {
      setCotizacionesExpress(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const exists = safePrev.findIndex(q => q.id === newQuote.id);
        if (exists >= 0) {
          const copy = [...safePrev];
          copy[exists] = newQuote;
          return copy;
        }
        return [newQuote, ...safePrev];
      });
    }

    setQuoteId(newQuote.id);
    setSavedSuccessMsg(true);
    setTimeout(() => setSavedSuccessMsg(false), 3000);
  };

  // Generate & Download PDF
  const handleGeneratePDF = async (quoteToPrint = null) => {
    const q = quoteToPrint || getQuoteObject();
    const brand = getCleanBranding(workshopBranding);

    // Compile items list
    const allItems = [];
    (q.servicios || []).forEach(s => {
      if (s.desc || s.price) {
        allItems.push({
          type: "labor",
          qty: 1,
          desc: s.desc || "Mano de obra",
          unitPrice: parseFloat(s.price) || 0,
          totalPrice: parseFloat(s.price) || 0
        });
      }
    });

    (q.repuestos || []).forEach(r => {
      if (r.name || r.price) {
        const descText = r.brand ? `${r.name} (${r.brand})` : r.name;
        allItems.push({
          type: "part",
          qty: parseFloat(r.qty) || 1,
          desc: descText || "Repuesto / Insumo",
          unitPrice: parseFloat(r.price) || 0,
          totalPrice: (parseFloat(r.qty) || 1) * (parseFloat(r.price) || 0)
        });
      }
    });

    if (q.descuento > 0) {
      allItems.push({
        type: "discount",
        qty: 1,
        desc: "Descuento Especial",
        unitPrice: 0,
        totalPrice: -q.descuento,
        isDiscount: true
      });
    }

    // Wrap text helper
    const wrapText = (c2d, text, maxWidth) => {
      if (!text) return [""];
      const words = String(text).split(" ");
      const lines = [];
      let line = "";
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = c2d.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          lines.push(line.trim());
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());
      return lines;
    };

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.font = "13px 'Plus Jakarta Sans', sans-serif";

    const processedItems = allItems.map(item => {
      const descLines = wrapText(tempCtx, item.desc, 355);
      const dynamicRowH = Math.max(35, descLines.length * 18 + 14);
      return { ...item, descLines, dynamicRowH };
    });

    const totalTableHeight = processedItems.reduce((sum, item) => sum + item.dynamicRowH, 0);

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    const tableHeaderY = 515;
    const tableEnd = tableHeaderY + 30 + totalTableHeight;
    canvas.height = tableEnd + 390;
    const ctx = canvas.getContext("2d");

    // 1. Background
    ctx.fillStyle = brand.colorFondoDocumento || "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Header Box
    drawCanvasHeader(ctx, canvas.width, brand);

    // 3. Date & Document Info Badge
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

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = brand.colorSecundario || "#f59e0b";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 300, 170, 200, 36, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#000000";
    ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    const dateFormatted = new Date().toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    ctx.fillText(`Fecha:  ${dateFormatted}`, 400, 194);
    ctx.textAlign = "left";

    // 4. Budget Title Banner
    ctx.fillStyle = "#000000";
    drawRoundedRect(ctx, 40, 230, 720, 40, 10);
    ctx.fill();

    ctx.strokeStyle = brand.colorSecundario || "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(55, 250); ctx.lineTo(105, 250); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(695, 250); ctx.lineTo(745, 250); ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⚡ COTIZACIÓN ESTIMADA / PRESUPUESTO EXPRESS", 400, 256);
    ctx.textAlign = "left";

    // 5. Customer & Vehicle Metadata
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(400, 300); ctx.lineTo(400, 470); ctx.stroke();

    ctx.fillStyle = "#000000";
    ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("DATOS DEL CLIENTE", 50, 312);
    ctx.fillText("DETALLES DEL VEHÍCULO", 420, 312);

    const drawMetaRow = (c2d, label, value, startX, startY) => {
      c2d.beginPath();
      c2d.arc(startX + 12, startY + 4, 12, 0, Math.PI * 2);
      c2d.fillStyle = brand.colorSecundario || "#f59e0b";
      c2d.fill();

      c2d.fillStyle = "#6b7280";
      c2d.font = "12px 'Plus Jakarta Sans', sans-serif";
      c2d.fillText(label, startX + 32, startY + 8);

      c2d.fillStyle = "#111827";
      c2d.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
      c2d.fillText(String(value || "---"), startX + 130, startY + 8);
    };

    drawMetaRow(ctx, "Cliente:", q.cliente, 40, 340);
    drawMetaRow(ctx, "Teléfono:", q.telefono || "---", 40, 375);
    drawMetaRow(ctx, "NIT:", q.nit || "C/F", 40, 410);
    drawMetaRow(ctx, "Facturar a:", q.nombreFacturacion || q.cliente, 40, 445);

    const vehiculoStr = [q.marca, q.linea, q.anio].filter(Boolean).join(" ") || "Vehículo sin especificar";
    drawMetaRow(ctx, "Vehículo:", vehiculoStr, 410, 340);
    drawMetaRow(ctx, "Placa:", q.placa || "---", 410, 375);
    drawMetaRow(ctx, "Color:", q.color || "---", 410, 410);
    drawMetaRow(ctx, "Validez:", `${q.diasValidez || 15} Días`, 410, 445);

    // 6. Table Header
    ctx.fillStyle = "#000000";
    ctx.font = "bold 16px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("DESGLOSE DE SERVICIOS Y REPUESTOS", 40, 500);

    ctx.fillStyle = "#000000";
    ctx.fillRect(40, 515, 720, 30);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CANT.", 80, 534);
    ctx.textAlign = "left";
    ctx.fillText("DESCRIPCIÓN", 135, 534);
    ctx.textAlign = "center";
    ctx.fillText("PRECIO UNITARIO", 565, 534);
    ctx.fillText("TOTAL", 695, 534);
    ctx.textAlign = "left";

    // 7. Table Rows
    let currentY = 545;
    processedItems.forEach((item, index) => {
      const rowH = item.dynamicRowH;
      ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#f9fafb";
      ctx.fillRect(40, currentY, 720, rowH);

      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, currentY); ctx.lineTo(40, currentY + rowH);
      ctx.moveTo(120, currentY); ctx.lineTo(120, currentY + rowH);
      ctx.moveTo(500, currentY); ctx.lineTo(500, currentY + rowH);
      ctx.moveTo(630, currentY); ctx.lineTo(630, currentY + rowH);
      ctx.moveTo(760, currentY); ctx.lineTo(760, currentY + rowH);
      ctx.moveTo(40, currentY + rowH); ctx.lineTo(760, currentY + rowH);
      ctx.stroke();

      ctx.fillStyle = item.isDiscount ? "#ef4444" : "#111827";
      ctx.font = item.isDiscount ? "bold 13px 'Plus Jakarta Sans', sans-serif" : "13px 'Plus Jakarta Sans', sans-serif";

      const middleY = currentY + Math.floor(rowH / 2) + 4;
      ctx.textAlign = "center";
      ctx.fillText(item.qty.toString(), 80, middleY);

      ctx.textAlign = "left";
      item.descLines.forEach((dLine, dIdx) => {
        ctx.fillText(dLine, 135, currentY + 18 + (dIdx * 18));
      });

      ctx.textAlign = "right";
      ctx.fillText(formatMoney(item.unitPrice), 615, middleY);
      ctx.fillText(formatMoney(item.totalPrice), 745, middleY);
      ctx.textAlign = "left";

      currentY += rowH;
    });

    // 8. Total Summary Box
    const totalBoxY = tableEnd + 15;
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(470, totalBoxY, 290, 80);
    ctx.strokeStyle = "#e5e7eb";
    ctx.strokeRect(470, totalBoxY, 290, 80);

    ctx.font = "14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#4b5563";
    ctx.fillText("Mano de Obra:", 485, totalBoxY + 24);
    ctx.textAlign = "right";
    ctx.fillText(formatMoney(q.subtotalLabor || subtotalLabor), 745, totalBoxY + 24);
    ctx.textAlign = "left";

    ctx.fillText("Repuestos / Insumos:", 485, totalBoxY + 44);
    ctx.textAlign = "right";
    ctx.fillText(formatMoney(q.subtotalParts || subtotalParts), 745, totalBoxY + 44);
    ctx.textAlign = "left";

    ctx.fillStyle = "#000000";
    ctx.fillRect(470, totalBoxY + 54, 290, 26);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("TOTAL ESTIMADO:", 485, totalBoxY + 72);
    ctx.textAlign = "right";
    ctx.fillStyle = brand.colorSecundario || "#f59e0b";
    ctx.fillText(formatMoney(q.total || totalCotizacion), 745, totalBoxY + 72);
    ctx.textAlign = "left";

    // 9. Notes & Terms
    const notesY = tableEnd + 110;
    ctx.fillStyle = "#f3f4f6";
    drawRoundedRect(ctx, 40, notesY, 720, 90, 8);
    ctx.fill();

    ctx.fillStyle = "#000000";
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("TÉRMINOS Y NOTAS TÉCNICAS", 60, notesY + 25);

    ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#374151";
    const noteLines = wrapText(ctx, q.notas || "Cotización válida por 15 días.", 680);
    noteLines.forEach((nl, nidx) => {
      ctx.fillText("•  " + nl, 60, notesY + 48 + (nidx * 18));
    });

    // 10. Footer Section
    const footerY = notesY + 110;
    const footerHeight = canvas.height - footerY;
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, footerY, canvas.width, footerHeight);

    ctx.strokeStyle = brand.colorSecundario || "#f59e0b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, footerY); ctx.lineTo(canvas.width, footerY); ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(brand.nombreEmpresa || "LOS PITS AUTO CENTER", 400, footerY + 35);
    ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(`${brand.direccion || ""} | Tel: ${brand.telefono || ""}`, 400, footerY + 55);

    // Output PDF
    const dataURL = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF("p", "px", [800, canvas.height]);
    pdf.addImage(dataURL, "JPEG", 0, 0, 800, canvas.height);
    pdf.save(`Cotizacion_Express_${q.placa || "Vehiculo"}.pdf`);
  };

  // Send WhatsApp Message
  const handleSendWhatsApp = (quoteToSend = null) => {
    const q = quoteToSend || getQuoteObject();
    const brand = getCleanBranding(workshopBranding);
    const rawTel = String(q.telefono || "").replace(/[^0-9]/g, "");

    let laborList = (q.servicios || [])
      .filter(s => s.desc.trim())
      .map(s => `  • ${s.desc}: Q ${parseFloat(s.price || 0).toFixed(2)}`)
      .join("\n");

    let partsList = (q.repuestos || [])
      .filter(r => r.name.trim())
      .map(r => `  • ${r.qty}x ${r.name}${r.brand ? ` (${r.brand})` : ''}: Q ${(parseFloat(r.qty || 1) * parseFloat(r.price || 0)).toFixed(2)}`)
      .join("\n");

    const message = `🏁 *COTIZACIÓN ESTIMADA - ${brand.nombreEmpresa || "LOS PITS AUTO CENTER"}* 🏁

📅 *Fecha:* ${new Date().toLocaleDateString('es-GT')}
👤 *Cliente:* ${q.cliente}
🚗 *Vehículo:* ${[q.marca, q.linea, q.anio].filter(Boolean).join(" ")} ${q.placa ? `(${q.placa})` : ''}

${laborList ? `🛠️ *MANO DE OBRA Y SERVICIOS:*\n${laborList}\n` : ''}
${partsList ? `🔩 *REPUESTOS E INSUMOS:*\n${partsList}\n` : ''}
${q.descuento > 0 ? `🎁 *Descuento Especial:* -Q ${parseFloat(q.descuento).toFixed(2)}\n` : ''}
💰 *TOTAL ESTIMADO: Q ${parseFloat(q.total).toFixed(2)}*

⏳ *Validez:* ${q.diasValidez || 15} días
📝 *Notas:* ${q.notas || 'Precios sujetos a disponibilidad de repuestos.'}

📍 *Ubicación:* ${brand.direccion || ''}
📞 *Teléfono:* ${brand.telefono || ''}

_¡Contáctanos para agendar tu cita y confirmar la orden de trabajo!_`;

    const encoded = encodeURIComponent(message);
    const waUrl = rawTel ? `https://wa.me/502${rawTel}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  // Convert Express Quote to Real Workshop Order
  const handleConvertToOrder = (quoteToConvert) => {
    const q = quoteToConvert || getQuoteObject();
    if (!q) return;

    if (window.confirm(`¿Deseas convertir la cotización de "${q.cliente}" (${q.placa || 'Vehículo'}) en una Orden de Ingreso de Taller?`)) {
      if (typeof onConvertToOrder === "function") {
        onConvertToOrder(q);
      }

      // Update state of quote in list
      if (typeof setCotizacionesExpress === "function") {
        setCotizacionesExpress(prev => (prev || []).map(item => item.id === q.id ? { ...item, estado: "Convertida en Orden" } : item));
      }

      alert(`✅ ¡Cotización convertida en Orden de Taller con éxito! El vehículo ya se encuentra registrado en trabajos en proceso.`);
      onClose();
    }
  };

  // Delete quote from history
  const handleDeleteFromHistory = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar esta cotización del historial?")) {
      if (typeof setCotizacionesExpress === "function") {
        setCotizacionesExpress(prev => (prev || []).filter(q => q.id !== id));
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div style={styles.backdrop}>
      <div className="glass-panel animate-fade-in" style={styles.modalCard}>
        
        {/* Modal Header */}
        <div style={styles.headerRow}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={styles.headerIcon}>
              <Zap size={24} color="#f59e0b" />
            </div>
            <div>
              <h2 style={styles.title}>Cotización Rápida Express</h2>
              <p style={styles.subtitle}>
                Presupuesta servicios y repuestos al instante sin ingresar el vehículo al sistema.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={styles.tabToggleGroup}>
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                style={{
                  ...styles.tabToggleBtn,
                  backgroundColor: activeTab === "form" ? "#f59e0b" : "transparent",
                  color: activeTab === "form" ? "#000" : "#fff"
                }}
              >
                <Zap size={15} /> Nueva Cotización
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                style={{
                  ...styles.tabToggleBtn,
                  backgroundColor: activeTab === "history" ? "#f59e0b" : "transparent",
                  color: activeTab === "history" ? "#000" : "#fff"
                }}
              >
                <History size={15} /> Historial ({cotizacionesExpress.length})
              </button>
            </div>

            <button type="button" onClick={onClose} style={styles.closeBtn}>
              <X size={20} />
            </button>
          </div>
        </div>

        {savedSuccessMsg && (
          <div style={styles.successBanner}>
            <CheckCircle size={18} /> ¡Cotización guardada exitosamente en el historial!
          </div>
        )}

        {/* TAB 1: FORM VIEW */}
        {activeTab === "form" && (
          <form onSubmit={handleSaveQuote} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* 1. Customer & Vehicle Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              
              {/* Left Box: Customer Info */}
              <div className="glass-panel" style={styles.sectionCard}>
                <div style={styles.sectionTitleRow}>
                  <User size={16} color="#f59e0b" />
                  <span style={styles.sectionTitle}>1. Datos del Cliente</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative" }}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Nombre del Cliente *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ej. Carlos Mendoza"
                      value={cliente}
                      onChange={(e) => handleClienteChange(e.target.value)}
                      required
                    />
                    {clienteSuggestions.length > 0 && (
                      <div style={styles.suggestionsBox}>
                        {clienteSuggestions.map((c, i) => (
                          <div 
                            key={i} 
                            style={styles.suggestionItem}
                            onClick={() => selectClienteSuggestion(c)}
                          >
                            <div style={{ fontWeight: "700" }}>{c.nombre}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {c.telefono ? `Tel: ${c.telefono}` : ''} {c.nit ? `• NIT: ${c.nit}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Teléfono WhatsApp</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ej. 55551234"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>NIT (Facturación)</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ej. C/F"
                        value={nit}
                        onChange={(e) => setNit(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Nombre de Facturación</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Nombre fiscal o empresa"
                      value={nombreFacturacion}
                      onChange={(e) => setNombreFacturacion(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Right Box: Vehicle Info */}
              <div className="glass-panel" style={styles.sectionCard}>
                <div style={styles.sectionTitleRow}>
                  <Car size={16} color="#f59e0b" />
                  <span style={styles.sectionTitle}>2. Datos del Vehículo</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Plate Row */}
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Placa del Vehículo</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <select
                        className="input-field"
                        value={platePrefix}
                        onChange={(e) => setPlatePrefix(e.target.value)}
                        style={{ width: "110px" }}
                      >
                        {prefixesList.map(p => <option key={p} value={p}>{p}</option>)}
                        <option value="Extranjera">Extranjera</option>
                      </select>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="123XYZ"
                        value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                        style={{ flex: 1, fontWeight: "700", letterSpacing: "1px" }}
                      />
                    </div>
                  </div>

                  {/* Brand & Line */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Marca</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ej. Toyota"
                        value={marca}
                        onChange={(e) => setMarca(e.target.value)}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Línea / Modelo</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ej. Corolla"
                        value={linea}
                        onChange={(e) => setLinea(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Year, Color, Km */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Año</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="2018"
                        value={anio}
                        onChange={(e) => setAnio(e.target.value)}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Color</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Gris"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Kilometraje</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="85,000"
                        value={kilometraje}
                        onChange={(e) => setKilometraje(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Services / Labor Table */}
            <div className="glass-panel" style={styles.sectionCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={styles.sectionTitleRow}>
                  <Wrench size={16} color="#f59e0b" />
                  <span style={styles.sectionTitle}>3. Mano de Obra y Servicios de Taller</span>
                </div>
                <button
                  type="button"
                  onClick={addServicioRow}
                  className="btn btn-ghost"
                  style={{ fontSize: "0.85rem", padding: "6px 12px", color: "#f59e0b", borderColor: "rgba(245, 158, 11, 0.4)" }}
                >
                  <Plus size={14} /> Agregar Servicio
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {servicios.map((s, idx) => (
                  <div key={s.id || idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={`Descripción del trabajo ${idx + 1} (ej. Cambio de pastillas de freno y purga)`}
                      value={s.desc}
                      onChange={(e) => updateServicio(s.id, "desc", e.target.value)}
                      style={{ flex: 3 }}
                    />
                    <div style={{ position: "relative", width: "160px" }}>
                      <span style={{ position: "absolute", left: "10px", top: "10px", color: "var(--text-muted)", fontSize: "0.9rem" }}>Q</span>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="Precio (Q)"
                        value={s.price}
                        onChange={(e) => updateServicio(s.id, "price", e.target.value)}
                        style={{ paddingLeft: "28px", fontWeight: "700", textAlign: "right" }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeServicioRow(s.id)}
                      className="btn btn-ghost"
                      style={{ color: "#ef4444", padding: "8px", borderRadius: "8px" }}
                      title="Eliminar fila"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Parts and Supplies Table */}
            <div className="glass-panel" style={styles.sectionCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={styles.sectionTitleRow}>
                  <Package size={16} color="#3b82f6" />
                  <span style={styles.sectionTitle}>4. Repuestos e Insumos</span>
                </div>
                <button
                  type="button"
                  onClick={addRepuestoRow}
                  className="btn btn-ghost"
                  style={{ fontSize: "0.85rem", padding: "6px 12px", color: "#3b82f6", borderColor: "rgba(59, 130, 246, 0.4)" }}
                >
                  <Plus size={14} /> Agregar Repuesto
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {repuestos.map((r, idx) => {
                  const filteredParts = r.name.trim() 
                    ? (workshopInventory || []).filter(item => 
                        (item.name || "").toLowerCase().includes(r.name.toLowerCase()) || 
                        (item.code || "").toLowerCase().includes(r.name.toLowerCase())
                      ).slice(0, 5)
                    : [];

                  const rowSubtotal = (parseFloat(r.qty) || 1) * (parseFloat(r.price) || 0);

                  return (
                    <div key={r.id || idx} style={{ display: "flex", gap: "10px", alignItems: "center", position: "relative" }}>
                      <div style={{ position: "relative", flex: 3 }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Buscar en bodega o escribir repuesto (ej. Pastillas de freno delanteras)"
                          value={r.name}
                          onChange={(e) => {
                            updateRepuesto(r.id, "name", e.target.value);
                            setInventorySuggestionsIdx(idx);
                          }}
                          onFocus={() => setInventorySuggestionsIdx(idx)}
                        />
                        {inventorySuggestionsIdx === idx && filteredParts.length > 0 && (
                          <div style={styles.suggestionsBox}>
                            {filteredParts.map(inv => (
                              <div
                                key={inv.id}
                                style={styles.suggestionItem}
                                onClick={() => selectInventoryItem(r.id, inv)}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontWeight: "700" }}>{inv.name}</span>
                                  <span style={{ color: "#10b981", fontWeight: "700" }}>{formatMoney(inv.salePrice || inv.price || 0)}</span>
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  Stock: {inv.stock || inv.quantity || 0} • Marca: {inv.brand || "Genérica"}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <input
                        type="text"
                        className="input-field"
                        placeholder="Marca (opcional)"
                        value={r.brand}
                        onChange={(e) => updateRepuesto(r.id, "brand", e.target.value)}
                        style={{ width: "130px" }}
                      />

                      <div style={{ width: "90px" }}>
                        <input
                          type="number"
                          min="1"
                          className="input-field"
                          placeholder="Cant."
                          value={r.qty}
                          onChange={(e) => updateRepuesto(r.id, "qty", e.target.value)}
                          style={{ textAlign: "center" }}
                        />
                      </div>

                      <div style={{ position: "relative", width: "130px" }}>
                        <span style={{ position: "absolute", left: "10px", top: "10px", color: "var(--text-muted)", fontSize: "0.9rem" }}>Q</span>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="P. Unit"
                          value={r.price}
                          onChange={(e) => updateRepuesto(r.id, "price", e.target.value)}
                          style={{ paddingLeft: "26px", textAlign: "right" }}
                        />
                      </div>

                      <div style={{ width: "120px", textAlign: "right", fontWeight: "700", color: "#60a5fa" }}>
                        {formatMoney(rowSubtotal)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeRepuestoRow(r.id)}
                        className="btn btn-ghost"
                        style={{ color: "#ef4444", padding: "8px", borderRadius: "8px" }}
                        title="Eliminar fila"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Notes, Validity & Totals Box */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
              
              {/* Notes & Validity */}
              <div className="glass-panel" style={styles.sectionCard}>
                <div style={styles.sectionTitleRow}>
                  <Clock size={16} color="#f59e0b" />
                  <span style={styles.sectionTitle}>5. Condiciones y Notas</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Validez de la Cotización (Días)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={diasValidez}
                      onChange={(e) => setDiasValidez(e.target.value)}
                      style={{ width: "120px" }}
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Notas Técnicas / Términos</label>
                    <textarea
                      className="input-field"
                      rows="3"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Escribe notas adicionales..."
                      style={{ resize: "vertical" }}
                    />
                  </div>
                </div>
              </div>

              {/* Financial Breakdown Card */}
              <div className="glass-panel" style={{ ...styles.sectionCard, border: "2px solid rgba(245, 158, 11, 0.4)", backgroundColor: "rgba(15, 23, 42, 0.7)" }}>
                <h4 style={{ ...styles.sectionTitle, color: "#f59e0b", marginBottom: "14px", fontSize: "1.1rem" }}>
                  Resumen de la Cotización
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={styles.summaryRow}>
                    <span style={{ color: "var(--text-muted)" }}>Subtotal Mano de Obra:</span>
                    <span style={{ fontWeight: "700" }}>{formatMoney(subtotalLabor)}</span>
                  </div>

                  <div style={styles.summaryRow}>
                    <span style={{ color: "var(--text-muted)" }}>Subtotal Repuestos:</span>
                    <span style={{ fontWeight: "700" }}>{formatMoney(subtotalParts)}</span>
                  </div>

                  <div style={{ ...styles.summaryRow, alignItems: "center" }}>
                    <span style={{ color: "#ef4444" }}>Descuento Especial (Q):</span>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="0.00"
                      value={descuento}
                      onChange={(e) => setDescuento(e.target.value)}
                      style={{ width: "100px", textAlign: "right", padding: "4px 8px", color: "#ef4444", fontWeight: "700" }}
                    />
                  </div>

                  <div style={{ height: "1px", backgroundColor: "rgba(255, 255, 255, 0.1)", margin: "4px 0" }} />

                  <div style={{ ...styles.summaryRow, fontSize: "1.2rem", paddingTop: "4px" }}>
                    <span style={{ fontWeight: "800", color: "#fff" }}>TOTAL ESTIMADO:</span>
                    <span style={{ fontWeight: "900", color: "#f59e0b", fontSize: "1.4rem", fontFamily: "var(--font-display)" }}>
                      {formatMoney(totalCotizacion)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Action Buttons Bar */}
            <div style={styles.actionBar}>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-ghost"
                  style={{ color: "var(--text-muted)" }}
                >
                  Limpiar Formulario
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp()}
                  className="btn btn-ghost"
                  style={{ display: "flex", alignItems: "center", gap: "8px", borderColor: "#22c55e", color: "#22c55e" }}
                >
                  <Send size={16} /> Enviar por WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => handleGeneratePDF()}
                  className="btn btn-ghost"
                  style={{ display: "flex", alignItems: "center", gap: "8px", borderColor: "#3b82f6", color: "#60a5fa" }}
                >
                  <Printer size={16} /> Descargar PDF
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#f59e0b", borderColor: "#f59e0b", color: "#000", fontWeight: "800" }}
                >
                  <Sparkles size={16} /> Guardar Cotización Express
                </button>

                <button
                  type="button"
                  onClick={() => handleConvertToOrder()}
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#10b981", borderColor: "#10b981", color: "#fff", fontWeight: "800" }}
                >
                  <ArrowRightCircle size={18} /> Convertir a Orden de Taller
                </button>
              </div>
            </div>

          </form>
        )}

        {/* TAB 2: HISTORY VIEW */}
        {activeTab === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Search Filter */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ position: "relative", width: "320px" }}>
                <Search size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Buscar por cliente, placa o fecha..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  style={{ paddingLeft: "36px" }}
                />
              </div>

              <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                Mostrando {cotizacionesExpress.length} cotizaciones registradas
              </div>
            </div>

            {/* List */}
            {cotizacionesExpress.length === 0 ? (
              <div style={styles.emptyState}>
                <History size={48} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: "12px" }} />
                <h3>No hay cotizaciones express guardadas aún</h3>
                <p>Las cotizaciones que crees se guardarán aquí para consultarlas, re-imprimirlas o convertirlas en órdenes de taller.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "60vh", overflowY: "auto", paddingRight: "4px" }}>
                {cotizacionesExpress
                  .filter(q => {
                    if (!historySearch.trim()) return true;
                    const s = historySearch.toLowerCase();
                    return (
                      (q.cliente || "").toLowerCase().includes(s) ||
                      (q.placa || "").toLowerCase().includes(s) ||
                      (q.marca || "").toLowerCase().includes(s) ||
                      (q.linea || "").toLowerCase().includes(s) ||
                      (q.telefono || "").includes(s)
                    );
                  })
                  .map(q => {
                    const isConverted = q.estado === "Convertida en Orden";
                    return (
                      <div key={q.id} className="glass-panel" style={styles.historyCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                          
                          {/* Info */}
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                              <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "#fff" }}>
                                {q.cliente}
                              </h4>
                              <span style={{ 
                                fontSize: "0.75rem", 
                                padding: "2px 8px", 
                                borderRadius: "10px", 
                                fontWeight: "700",
                                backgroundColor: isConverted ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                                color: isConverted ? "#34d399" : "#fbbf24",
                                border: isConverted ? "1px solid #10b981" : "1px solid #f59e0b"
                              }}>
                                {isConverted ? "✅ Convertida en Orden" : "⏳ Cotización Pendiente"}
                              </span>
                            </div>

                            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                              <span>🚗 <strong>{q.marca} {q.linea} {q.anio}</strong> {q.placa ? `(${q.placa})` : ''}</span>
                              {q.telefono && <span>📞 {q.telefono}</span>}
                              <span>📅 {new Date(q.fecha).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {/* Services & Parts Preview */}
                            <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "#9ca3af" }}>
                              <strong>Items:</strong> {[
                                ...(q.servicios || []).map(s => s.desc),
                                ...(q.repuestos || []).map(r => `${r.qty}x ${r.name}`)
                              ].filter(Boolean).slice(0, 3).join(", ") || "Sin detalles específicos"}
                            </div>
                          </div>

                          {/* Total & Action Buttons */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
                            <div style={{ fontSize: "1.3rem", fontWeight: "900", color: "#f59e0b", fontFamily: "var(--font-display)" }}>
                              {formatMoney(q.total || 0)}
                            </div>

                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => handleSendWhatsApp(q)}
                                className="btn btn-ghost"
                                style={{ padding: "6px 10px", color: "#22c55e", fontSize: "0.8rem" }}
                                title="Enviar por WhatsApp"
                              >
                                <Send size={14} /> WhatsApp
                              </button>

                              <button
                                type="button"
                                onClick={() => handleGeneratePDF(q)}
                                className="btn btn-ghost"
                                style={{ padding: "6px 10px", color: "#60a5fa", fontSize: "0.8rem" }}
                                title="Descargar PDF"
                              >
                                <Printer size={14} /> PDF
                              </button>

                              <button
                                type="button"
                                onClick={() => handleLoadQuoteToForm(q)}
                                className="btn btn-ghost"
                                style={{ padding: "6px 10px", color: "#f59e0b", fontSize: "0.8rem" }}
                                title="Cargar y editar"
                              >
                                ✏️ Editar
                              </button>

                              {!isConverted && (
                                <button
                                  type="button"
                                  onClick={() => handleConvertToOrder(q)}
                                  className="btn btn-primary"
                                  style={{ padding: "6px 12px", backgroundColor: "#10b981", borderColor: "#10b981", color: "#fff", fontSize: "0.8rem", fontWeight: "700" }}
                                  title="Convertir a Orden de Trabajo"
                                >
                                  <ArrowRightCircle size={14} /> Convertir a Orden
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteFromHistory(q.id)}
                                className="btn btn-ghost"
                                style={{ padding: "6px 8px", color: "#ef4444" }}
                                title="Eliminar del historial"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* Client Multi-Vehicle Selection Modal */}
      {clientVehiclesModalData.isOpen && (
        <ClientVehiclesModal
          isOpen={clientVehiclesModalData.isOpen}
          clienteNombre={clientVehiclesModalData.clienteNombre}
          vehicles={clientVehiclesModalData.vehicles}
          onSelectVehicle={applySelectedVehicle}
          onClose={() => setClientVehiclesModalData({ isOpen: false, clienteNombre: "", vehicles: [] })}
        />
      )}
    </div>,
    document.body
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
    padding: "20px"
  },
  modalCard: {
    width: "100%",
    maxWidth: "1050px",
    maxHeight: "92vh",
    overflowY: "auto",
    backgroundColor: "var(--bg-card, #131722)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    borderRadius: "16px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6)"
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    paddingBottom: "16px",
    flexWrap: "wrap",
    gap: "12px"
  },
  headerIcon: {
    padding: "10px",
    borderRadius: "12px",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    margin: 0,
    fontSize: "1.4rem",
    fontWeight: "800",
    color: "#fff"
  },
  subtitle: {
    margin: "4px 0 0 0",
    fontSize: "0.85rem",
    color: "var(--text-muted)"
  },
  tabToggleGroup: {
    display: "flex",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "10px",
    padding: "3px",
    gap: "4px"
  },
  tabToggleBtn: {
    padding: "6px 14px",
    borderRadius: "8px",
    border: "none",
    fontSize: "0.85rem",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s ease"
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "8px",
    display: "flex"
  },
  successBanner: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    border: "1px solid #10b981",
    color: "#10b981",
    padding: "10px 16px",
    borderRadius: "8px",
    fontWeight: "700",
    fontSize: "0.9rem",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  sectionCard: {
    padding: "16px",
    borderRadius: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.07)"
  },
  sectionTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px"
  },
  sectionTitle: {
    fontWeight: "800",
    fontSize: "0.95rem",
    color: "#fff"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  label: {
    fontSize: "0.8rem",
    fontWeight: "600",
    color: "var(--text-muted)"
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.95rem"
  },
  actionBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "14px",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    flexWrap: "wrap",
    gap: "12px"
  },
  suggestionsBox: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#1e2433",
    border: "1px solid rgba(245, 158, 11, 0.4)",
    borderRadius: "8px",
    zIndex: 9999,
    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
    overflow: "hidden",
    marginTop: "2px"
  },
  suggestionItem: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    cursor: "pointer",
    transition: "background 0.15s ease",
    fontSize: "0.85rem"
  },
  historyCard: {
    padding: "16px",
    borderRadius: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    transition: "all 0.2s ease"
  },
  emptyState: {
    padding: "40px 20px",
    textAlign: "center",
    color: "var(--text-muted)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  }
};
