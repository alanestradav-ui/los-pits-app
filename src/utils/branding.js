/**
 * 🎨 Workshop Branding & Document Customization Utilities
 * Allows each tenant / workshop to customize colors, logo, slogans, disclaimers and contact info.
 */

export const DEFAULT_BRANDING = {
  nombreEmpresa: "Los Pits",
  subtitulo: "Taller Mecánico & Carwash",
  eslogan: "SERVICIO QUE SE SIENTE, CALIDAD QUE SE VE",
  fraseSecundaria: "Tu vehículo en manos de profesionales certificados",
  direccion: "3 calle 6-47 zona 10, Ciudad de Guatemala",
  telefono: "3271-1268",
  whatsapp: "3271-1268",
  email: "info@lospits.gt",
  nit: "CF",
  sitioWeb: "https://lospits.app",
  logoUrl: "", // Custom uploaded logo (data URI / base64 or URL)
  mostrarBanderaPits: true, // Keep checkered flag if no logo or as design accent

  // Theme Colors for PDFs and Documents
  colorPrimario: "#0a0c10", // Main Header & Banner background
  colorSecundario: "#f59e0b", // Accent lines, highlights, badges, icons
  colorTextoEncabezado: "#ffffff",
  colorFondoDocumento: "#ffffff",
  colorBordes: "#e5e7eb",
  colorTotalFondo: "#000000",
  colorTotalTexto: "#f59e0b",

  // Custom terms & disclaimers
  terminosRecepcion: "El taller no se hace responsable por objetos de valor no declarados en el inventario de recepción. Los vehículos no retirados después de 5 días hábiles causarán cargo por parqueo.",
  terminosCotizacion: "Esta cotización tiene una vigencia de 15 días calendario. Precios de repuestos sujetos a disponibilidad del distribuidor.",
  garantiaTexto: "Garantía de 30 días o 1,000 km en mano de obra técnica realizada.",
  piePaginaDocumento: "¡Gracias por su preferencia! Calidad, honestidad y garantía para su vehículo."
};

export const COLOR_PRESETS = [
  {
    id: "lospits",
    name: "Los Pits Clásico (Negro & Dorado)",
    colorPrimario: "#0a0c10",
    colorSecundario: "#f59e0b",
    colorTextoEncabezado: "#ffffff",
    colorTotalFondo: "#000000",
    colorTotalTexto: "#f59e0b"
  },
  {
    id: "racing_blue",
    name: "Azul Racing & Cyan",
    colorPrimario: "#0f172a",
    colorSecundario: "#06b6d4",
    colorTextoEncabezado: "#ffffff",
    colorTotalFondo: "#0f172a",
    colorTotalTexto: "#38bdf8"
  },
  {
    id: "scuderia_red",
    name: "Rojo Deportivo (Scuderia)",
    colorPrimario: "#18181b",
    colorSecundario: "#ef4444",
    colorTextoEncabezado: "#ffffff",
    colorTotalFondo: "#18181b",
    colorTotalTexto: "#f87171"
  },
  {
    id: "emerald_green",
    name: "Verde Esmeralda & Eco",
    colorPrimario: "#064e3b",
    colorSecundario: "#10b981",
    colorTextoEncabezado: "#ffffff",
    colorTotalFondo: "#022c22",
    colorTotalTexto: "#34d399"
  },
  {
    id: "purple_neon",
    name: "Púrpura Premium & Neón",
    colorPrimario: "#1e1b4b",
    colorSecundario: "#a855f7",
    colorTextoEncabezado: "#ffffff",
    colorTotalFondo: "#1e1b4b",
    colorTotalTexto: "#c084fc"
  },
  {
    id: "titanium_orange",
    name: "Titanio & Naranja Fuego",
    colorPrimario: "#27272a",
    colorSecundario: "#f97316",
    colorTextoEncabezado: "#ffffff",
    colorTotalFondo: "#18181b",
    colorTotalTexto: "#fb923c"
  },
  {
    id: "navy_blue",
    name: "Azul Marino & Azul Real",
    colorPrimario: "#1e293b",
    colorSecundario: "#3b82f6",
    colorTextoEncabezado: "#ffffff",
    colorTotalFondo: "#0f172a",
    colorTotalTexto: "#60a5fa"
  }
];

export const getCleanBranding = (customBranding) => {
  if (!customBranding || typeof customBranding !== "object") return DEFAULT_BRANDING;
  return {
    ...DEFAULT_BRANDING,
    ...customBranding
  };
};

/**
 * Renders the top branding header on any HTML5 Canvas for PDF export or ticket printing.
 */
export const drawCanvasHeader = (ctx, canvasWidth, brand, customLogoImg = null) => {
  const b = getCleanBranding(brand);
  const headerHeight = 150;

  // 1. Header Box Background
  ctx.fillStyle = b.colorPrimario || "#0a0c10";
  ctx.fillRect(0, 0, canvasWidth, headerHeight);

  // 2. Checkered flag or Logo
  if (customLogoImg) {
    try {
      ctx.drawImage(customLogoImg, 40, 20, 100, 50);
    } catch (e) {
      console.warn("Logo draw fallback", e);
    }
  } else if (b.mostrarBanderaPits) {
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
  }

  // 3. Brand Name & Slogan
  ctx.fillStyle = b.colorTextoEncabezado || "#ffffff";
  ctx.font = "bold 38px 'Orbitron', sans-serif";
  const nameToDraw = (b.nombreEmpresa || "LOS PITS").toUpperCase();
  ctx.fillText(nameToDraw, 40, 95);

  ctx.fillStyle = b.colorSecundario || "#f59e0b";
  ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText((b.eslogan || "").toUpperCase(), 40, 120);

  // 4. Diagonal divider line
  ctx.strokeStyle = b.colorSecundario || "#f59e0b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(520, 0);
  ctx.lineTo(460, headerHeight);
  ctx.stroke();

  // 5. Location Icon & Address
  ctx.beginPath();
  ctx.arc(520, 48, 12, 0, Math.PI * 2);
  ctx.fillStyle = b.colorSecundario || "#f59e0b";
  ctx.fill();
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(520, 45, 3, 0, Math.PI, true);
  ctx.lineTo(520, 52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = b.colorSecundario || "#f59e0b";
  ctx.beginPath();
  ctx.arc(520, 45, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = b.colorTextoEncabezado || "#ffffff";
  ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
  const addr = b.direccion || "Ciudad de Guatemala";
  const addrParts = addr.includes(",") ? addr.split(",") : [addr.slice(0, 25), addr.slice(25)];
  ctx.fillText(addrParts[0]?.trim() || "", 540, 44);
  if (addrParts[1]) {
    ctx.fillText(addrParts.slice(1).join(",").trim(), 540, 59);
  }

  // 6. Phone Icon & Phone
  ctx.beginPath();
  ctx.arc(520, 100, 12, 0, Math.PI * 2);
  ctx.fillStyle = b.colorSecundario || "#f59e0b";
  ctx.fill();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(518, 102, 5, Math.PI * 1.0, Math.PI * 1.6);
  ctx.stroke();

  ctx.fillStyle = b.colorTextoEncabezado || "#ffffff";
  ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(b.telefono || "3271-1268", 540, 108);
};
