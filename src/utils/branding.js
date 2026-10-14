/**
 * 🎨 Workshop Branding & Document Customization Utilities
 * Allows each tenant / workshop to customize colors, logo, slogans, disclaimers and contact info.
 *
 * 🖨️ MOTOR DE TEMA DE DOCUMENTOS
 * Todos los documentos (presupuestos, recepciones, recibos, tickets, fichas) fueron diseñados
 * originalmente con la paleta clásica de Los Pits (negro + dorado). En lugar de reescribir cada
 * generador, `applyDocumentTheme(ctx, brand)` intercepta los colores asignados al lienzo y los
 * traduce al ROL equivalente de la paleta configurada (encabezado, bandas, texto, bordes, etc.).
 * Así la paleta elegida en Configuración se aplica a TODA la hoja y no solo al encabezado.
 *
 * Tokens especiales aceptados en fillStyle / strokeStyle de un lienzo tematizado:
 *   "@rol"        → color del rol de la paleta (ej. "@secundario", "@totalFondo")
 *   "@raw:#hex"   → color literal que NO debe ser remapeado
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
  colorPrimario: "#0a0c10", // Encabezado y pie de página
  colorSecundario: "#f59e0b", // Acentos: líneas, íconos, insignias
  colorTextoEncabezado: "#ffffff", // Texto sobre fondos oscuros (encabezado, bandas, pie)
  colorBanda: "#000000", // Bandas de títulos y encabezados de tablas
  colorTexto: "#111827", // Texto principal del cuerpo
  colorTextoSecundario: "#4b5563", // Etiquetas y texto secundario
  colorFondoDocumento: "#ffffff", // Fondo de la hoja
  colorFilaAlterna: "#f9fafb", // Filas alternas y recuadros
  colorBordes: "#e5e7eb", // Bordes y divisores
  colorTotalFondo: "#000000", // Fondo del cuadro de total
  colorTotalTexto: "#f59e0b", // Texto del cuadro de total

  // Custom terms & disclaimers
  terminosRecepcion: "El taller no se hace responsable por objetos de valor no declarados en el inventario de recepción. Los vehículos no retirados después de 5 días hábiles causarán cargo por parqueo.",
  terminosCotizacion: "Esta cotización tiene una vigencia de 15 días calendario. Precios de repuestos sujetos a disponibilidad del distribuidor.",
  garantiaTexto: "Garantía de 30 días o 1,000 km en mano de obra técnica realizada.",
  piePaginaDocumento: "¡Gracias por su preferencia! Calidad, honestidad y garantía para su vehículo."
};

/**
 * Definición de los colores configurables de la paleta (usado por el editor en Configuración).
 */
export const DOC_COLOR_FIELDS = [
  { key: "colorPrimario", grupo: "estructura", label: "Encabezado y pie de página", desc: "Fondo del encabezado y del pie de cada hoja" },
  { key: "colorTextoEncabezado", grupo: "estructura", label: "Texto sobre fondos oscuros", desc: "Texto del encabezado, bandas y pie" },
  { key: "colorBanda", grupo: "estructura", label: "Bandas de títulos y tablas", desc: "Título del documento y encabezados de tablas" },
  { key: "colorSecundario", grupo: "acentos", label: "Color de acento", desc: "Líneas, íconos, insignias y resaltados" },
  { key: "colorTotalFondo", grupo: "acentos", label: "Fondo del cuadro de total", desc: "Recuadro del monto total" },
  { key: "colorTotalTexto", grupo: "acentos", label: "Texto del cuadro de total", desc: "Cifra del monto total" },
  { key: "colorTexto", grupo: "contenido", label: "Texto principal", desc: "Datos, descripciones y valores" },
  { key: "colorTextoSecundario", grupo: "contenido", label: "Texto secundario", desc: "Etiquetas, notas y aclaraciones" },
  { key: "colorFondoDocumento", grupo: "contenido", label: "Fondo de la hoja", desc: "Color del papel" },
  { key: "colorFilaAlterna", grupo: "contenido", label: "Filas alternas y recuadros", desc: "Cebrado de tablas y tarjetas" },
  { key: "colorBordes", grupo: "contenido", label: "Bordes y divisores", desc: "Líneas de tablas y separadores" }
];

export const DOC_COLOR_KEYS = DOC_COLOR_FIELDS.map(f => f.key);

export const COLOR_PRESETS = [
  {
    id: "lospits",
    name: "Los Pits Clásico (Negro & Dorado)",
    colorPrimario: "#0a0c10",
    colorSecundario: "#f59e0b",
    colorTextoEncabezado: "#ffffff",
    colorBanda: "#000000",
    colorTexto: "#111827",
    colorTextoSecundario: "#4b5563",
    colorFondoDocumento: "#ffffff",
    colorFilaAlterna: "#f9fafb",
    colorBordes: "#e5e7eb",
    colorTotalFondo: "#000000",
    colorTotalTexto: "#f59e0b"
  },
  {
    id: "racing_blue",
    name: "Azul Racing & Cyan",
    colorPrimario: "#0f172a",
    colorSecundario: "#06b6d4",
    colorTextoEncabezado: "#ffffff",
    colorBanda: "#1e293b",
    colorTexto: "#0f172a",
    colorTextoSecundario: "#475569",
    colorFondoDocumento: "#ffffff",
    colorFilaAlterna: "#f0fdff",
    colorBordes: "#cbe9f0",
    colorTotalFondo: "#0f172a",
    colorTotalTexto: "#38bdf8"
  },
  {
    id: "scuderia_red",
    name: "Rojo Deportivo (Scuderia)",
    colorPrimario: "#18181b",
    colorSecundario: "#ef4444",
    colorTextoEncabezado: "#ffffff",
    colorBanda: "#7f1d1d",
    colorTexto: "#18181b",
    colorTextoSecundario: "#52525b",
    colorFondoDocumento: "#ffffff",
    colorFilaAlterna: "#fef2f2",
    colorBordes: "#f5d0d0",
    colorTotalFondo: "#18181b",
    colorTotalTexto: "#f87171"
  },
  {
    id: "emerald_green",
    name: "Verde Esmeralda & Eco",
    colorPrimario: "#064e3b",
    colorSecundario: "#10b981",
    colorTextoEncabezado: "#ffffff",
    colorBanda: "#065f46",
    colorTexto: "#022c22",
    colorTextoSecundario: "#3f6258",
    colorFondoDocumento: "#ffffff",
    colorFilaAlterna: "#ecfdf5",
    colorBordes: "#c6eedd",
    colorTotalFondo: "#022c22",
    colorTotalTexto: "#34d399"
  },
  {
    id: "purple_neon",
    name: "Púrpura Premium & Neón",
    colorPrimario: "#1e1b4b",
    colorSecundario: "#a855f7",
    colorTextoEncabezado: "#ffffff",
    colorBanda: "#312e81",
    colorTexto: "#1e1b4b",
    colorTextoSecundario: "#5b5479",
    colorFondoDocumento: "#ffffff",
    colorFilaAlterna: "#faf5ff",
    colorBordes: "#e4d4f7",
    colorTotalFondo: "#1e1b4b",
    colorTotalTexto: "#c084fc"
  },
  {
    id: "titanium_orange",
    name: "Titanio & Naranja Fuego",
    colorPrimario: "#27272a",
    colorSecundario: "#f97316",
    colorTextoEncabezado: "#ffffff",
    colorBanda: "#3f3f46",
    colorTexto: "#18181b",
    colorTextoSecundario: "#52525b",
    colorFondoDocumento: "#ffffff",
    colorFilaAlterna: "#fff7ed",
    colorBordes: "#f3dcc8",
    colorTotalFondo: "#18181b",
    colorTotalTexto: "#fb923c"
  },
  {
    id: "navy_blue",
    name: "Azul Marino & Azul Real",
    colorPrimario: "#1e293b",
    colorSecundario: "#3b82f6",
    colorTextoEncabezado: "#ffffff",
    colorBanda: "#1e3a8a",
    colorTexto: "#0f172a",
    colorTextoSecundario: "#475569",
    colorFondoDocumento: "#ffffff",
    colorFilaAlterna: "#eff6ff",
    colorBordes: "#d6e2f5",
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

// ==========================================
// 🌐 Marca activa global (para módulos que no reciben la prop workshopBranding)
// ==========================================
let ACTIVE_BRANDING = DEFAULT_BRANDING;
export const setActiveBranding = (brand) => {
  ACTIVE_BRANDING = getCleanBranding(brand);
};
export const getActiveBranding = () => ACTIVE_BRANDING;

// ==========================================
// 🎨 Utilidades de color
// ==========================================
export const normalizeHex = (value, fallback = null) => {
  if (typeof value !== "string") return fallback;
  let v = value.trim().toLowerCase();
  if (!v.startsWith("#")) v = "#" + v;
  if (/^#[0-9a-f]{3}$/.test(v)) {
    v = "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
  }
  return /^#[0-9a-f]{6}$/.test(v) ? v : fallback;
};

export const hexToRgb = (hex) => {
  const h = normalizeHex(hex, "#000000");
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
};

const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/** Mezcla el color `a` hacia `b` en proporción t (0 = a, 1 = b). */
export const mixColors = (a, b, t) => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return "#" + toHex(r1 + (r2 - r1) * t) + toHex(g1 + (g2 - g1) * t) + toHex(b1 + (b2 - b1) * t);
};

export const withAlpha = (hex, alpha) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Devuelve un color legible (oscuro o claro) sobre el fondo indicado. */
export const contrastOn = (hex) => (luminance(hex) > 0.45 ? "#111111" : "#ffffff");

/**
 * Construye la paleta completa de roles a partir de la marca configurada.
 */
export const getDocTheme = (brand) => {
  const b = getCleanBranding(brand);
  const d = DEFAULT_BRANDING;
  const pick = (key) => normalizeHex(b[key], d[key]);

  const t = {
    primario: pick("colorPrimario"),
    secundario: pick("colorSecundario"),
    textoEncabezado: pick("colorTextoEncabezado"),
    banda: pick("colorBanda"),
    texto: pick("colorTexto"),
    textoSecundario: pick("colorTextoSecundario"),
    fondo: pick("colorFondoDocumento"),
    filaAlterna: pick("colorFilaAlterna"),
    bordes: pick("colorBordes"),
    totalFondo: pick("colorTotalFondo"),
    totalTexto: pick("colorTotalTexto")
  };

  // Tonos derivados para mantener armonía en toda la hoja
  t.textoTenue = mixColors(t.textoSecundario, t.fondo, 0.35);
  t.acentoSuave = mixColors(t.secundario, t.fondo, 0.88);
  t.acentoBorde = mixColors(t.secundario, t.fondo, 0.55);
  t.acentoOscuro = mixColors(t.secundario, "#000000", 0.45);
  t.superficie = mixColors(t.filaAlterna, t.bordes, 0.45);
  t.sobreAcento = contrastOn(t.secundario);
  return t;
};

// ==========================================
// 🖌️ Mapa de colores heredados (diseño clásico) → roles de la paleta
// Las entradas con objeto dependen de la operación: texto, figura (relleno) o línea (trazo).
// Los colores de estado (rojo, verde, azul de alertas) se conservan intencionalmente.
// ==========================================
const CANVAS_LEGACY_MAP = {
  "#f59e0b": "secundario",
  "#fbbf24": "secundario",
  "#d97706": "secundario",
  "#eab308": "secundario",
  "#fef3c7": "acentoSuave",
  "#fffbeb": "acentoSuave",
  "#92400e": "acentoOscuro",
  "#0a0c10": { text: "texto", shape: "primario", line: "primario" },
  "#000000": { text: "texto", shape: "banda", line: "texto" },
  "#111827": { text: "texto", shape: "banda", line: "texto" },
  "#1f2937": { text: "texto", shape: "banda", line: "texto" },
  "#ffffff": { text: "textoEncabezado", shape: "fondo", line: "textoEncabezado" },
  "#f9fafb": "filaAlterna",
  "#f3f4f6": "superficie",
  "#e5e7eb": "bordes",
  "#d1d5db": "bordes",
  "#374151": "textoSecundario",
  "#4b5563": "textoSecundario",
  "#6b7280": "textoSecundario",
  "#9ca3af": "textoTenue"
};

const ACCENT_RGBA_RE = /^rgba\(\s*245\s*,\s*158\s*,\s*11\s*,\s*([\d.]+)\s*\)$/;

const resolveCanvasColor = (value, op, theme) => {
  if (typeof value !== "string") return value; // Gradientes / patrones
  if (value.startsWith("@raw:")) return value.slice(5);
  if (value.startsWith("@")) return theme[value.slice(1)] || "#000000";

  const raw = value.trim().toLowerCase();
  const accentMatch = raw.match(ACCENT_RGBA_RE);
  if (accentMatch) return withAlpha(theme.secundario, accentMatch[1]);

  const hex = normalizeHex(raw);
  if (!hex) return value;
  const entry = CANVAS_LEGACY_MAP[hex];
  if (!entry) return value;
  const role = typeof entry === "string" ? entry : entry[op];
  return theme[role] || value;
};

/**
 * Aplica la paleta configurada a TODO lo que se dibuje en el contexto 2D indicado.
 * Es idempotente: llamarlo varias veces solo actualiza la paleta.
 */
export const applyDocumentTheme = (ctx, brand) => {
  if (!ctx) return ctx;
  if (ctx.__docTheme) {
    if (brand) ctx.__docTheme.theme = getDocTheme(brand);
    return ctx;
  }

  const proto = Object.getPrototypeOf(ctx);
  const fillDesc = Object.getOwnPropertyDescriptor(proto, "fillStyle");
  const strokeDesc = Object.getOwnPropertyDescriptor(proto, "strokeStyle");
  if (!fillDesc || !strokeDesc) return ctx;

  const state = {
    theme: getDocTheme(brand || ACTIVE_BRANDING),
    fill: fillDesc.get.call(ctx),
    stroke: strokeDesc.get.call(ctx),
    stack: []
  };
  ctx.__docTheme = state;

  const setRealFill = (op) => fillDesc.set.call(ctx, resolveCanvasColor(state.fill, op, state.theme));
  const setRealStroke = (op) => strokeDesc.set.call(ctx, resolveCanvasColor(state.stroke, op, state.theme));

  Object.defineProperty(ctx, "fillStyle", {
    configurable: true,
    get: () => state.fill,
    set: (v) => { state.fill = v; setRealFill("shape"); }
  });
  Object.defineProperty(ctx, "strokeStyle", {
    configurable: true,
    get: () => state.stroke,
    set: (v) => { state.stroke = v; setRealStroke("line"); }
  });

  const wrap = (name, before) => {
    const original = proto[name];
    if (typeof original !== "function") return;
    ctx[name] = function (...args) {
      before();
      return original.apply(ctx, args);
    };
  };

  wrap("fillText", () => setRealFill("text"));
  wrap("strokeText", () => setRealStroke("text"));
  wrap("fill", () => setRealFill("shape"));
  wrap("fillRect", () => setRealFill("shape"));
  wrap("stroke", () => setRealStroke("line"));
  wrap("strokeRect", () => setRealStroke("line"));

  const originalSave = proto.save;
  const originalRestore = proto.restore;
  ctx.save = function () {
    state.stack.push({ fill: state.fill, stroke: state.stroke });
    return originalSave.call(ctx);
  };
  ctx.restore = function () {
    const prev = state.stack.pop();
    const result = originalRestore.call(ctx);
    if (prev) {
      state.fill = prev.fill;
      state.stroke = prev.stroke;
    }
    return result;
  };

  // Gradientes: sus paradas de color también siguen la paleta
  ["createLinearGradient", "createRadialGradient"].forEach((name) => {
    const original = proto[name];
    if (typeof original !== "function") return;
    ctx[name] = function (...args) {
      const gradient = original.apply(ctx, args);
      const addStop = gradient.addColorStop.bind(gradient);
      gradient.addColorStop = (offset, color) => addStop(offset, resolveCanvasColor(color, "shape", state.theme));
      return gradient;
    };
  });

  return ctx;
};

// ==========================================
// 📄 Documentos HTML impresos (recibos, estados de resultados, nóminas)
// ==========================================
const HTML_LEGACY_MAP = {
  "#1e3a8a": "primario",
  "#1e40af": "primario",
  "#1e293b": "primario",
  "#0a0c10": "primario",
  "#2563eb": "secundario",
  "#3b82f6": "secundario",
  "#f59e0b": "secundario",
  "#eff6ff": "acentoSuave",
  "#dbeafe": "acentoSuave",
  "#fef3c7": "acentoSuave",
  "#bfdbfe": "acentoBorde",
  "#93c5fd": "acentoBorde",
  "#0f172a": "texto",
  "#111827": "texto",
  "#1f2937": "texto",
  "#334155": "textoSecundario",
  "#475569": "textoSecundario",
  "#64748b": "textoSecundario",
  "#4b5563": "textoSecundario",
  "#6b7280": "textoSecundario",
  "#374151": "textoSecundario",
  "#9ca3af": "textoTenue",
  "#f8fafc": "filaAlterna",
  "#f9fafb": "filaAlterna",
  "#f1f5f9": "superficie",
  "#f3f4f6": "superficie",
  "#e2e8f0": "bordes",
  "#cbd5e1": "bordes",
  "#e5e7eb": "bordes",
  "#d1d5db": "bordes"
};

/**
 * Traduce los colores de una plantilla HTML impresa a la paleta configurada.
 */
export const themeHtmlDocument = (html, brand) => {
  if (typeof html !== "string") return html;
  const t = getDocTheme(brand || ACTIVE_BRANDING);
  return html
    // Texto blanco → texto sobre fondos oscuros (no afecta background-color)
    .replace(/(^|[^-\w])color\s*:\s*#fff(?:fff)?\b/gi, `$1color: ${t.textoEncabezado}`)
    // Fondo blanco → fondo de la hoja
    .replace(/background(-color)?\s*:\s*#fff(?:fff)?\b/gi, (m, bc) => `background${bc || ""}: ${t.fondo}`)
    .replace(/#[0-9a-fA-F]{6}\b/g, (hex) => {
      const role = HTML_LEGACY_MAP[hex.toLowerCase()];
      return role ? t[role] : hex;
    });
};

/**
 * Paleta en formato RGB para documentos generados con jsPDF.
 */
export const getDocThemeRgb = (brand) => {
  const t = getDocTheme(brand || ACTIVE_BRANDING);
  const out = {};
  Object.keys(t).forEach((k) => { out[k] = hexToRgb(t[k]); });
  return out;
};

/**
 * Renders the top branding header on any HTML5 Canvas for PDF export or ticket printing.
 */
export const drawCanvasHeader = (ctx, canvasWidth, brand, customLogoImg = null) => {
  const b = getCleanBranding(brand);
  applyDocumentTheme(ctx, b);
  const headerHeight = 150;

  // 1. Header Box Background
  ctx.fillStyle = "@primario";
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
    ctx.fillStyle = "@raw:#ffffff";
    ctx.fillRect(flagX, flagY, sqSize * 4, sqSize * 2);
    ctx.fillStyle = "@raw:#000000";
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
  ctx.fillStyle = "@textoEncabezado";
  ctx.font = "bold 38px 'Orbitron', sans-serif";
  const nameToDraw = (b.nombreEmpresa || "LOS PITS").toUpperCase();
  ctx.fillText(nameToDraw, 40, 95);

  ctx.fillStyle = "@secundario";
  ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText((b.eslogan || "").toUpperCase(), 40, 120);

  // 4. Diagonal divider line
  ctx.strokeStyle = "@secundario";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(520, 0);
  ctx.lineTo(460, headerHeight);
  ctx.stroke();

  // 5. Location Icon & Address
  ctx.beginPath();
  ctx.arc(520, 48, 12, 0, Math.PI * 2);
  ctx.fillStyle = "@secundario";
  ctx.fill();
  ctx.fillStyle = "@sobreAcento";
  ctx.beginPath();
  ctx.arc(520, 45, 3, 0, Math.PI, true);
  ctx.lineTo(520, 52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "@secundario";
  ctx.beginPath();
  ctx.arc(520, 45, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "@textoEncabezado";
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
  ctx.fillStyle = "@secundario";
  ctx.fill();
  ctx.strokeStyle = "@sobreAcento";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(518, 102, 5, Math.PI * 1.0, Math.PI * 1.6);
  ctx.stroke();

  ctx.fillStyle = "@textoEncabezado";
  ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(b.telefono || "3271-1268", 540, 108);
};

// ==========================================
// 🧾 HOJA MODELO (vista previa en Configuración)
// Se dibuja con los mismos colores heredados que usan los generadores reales y pasa por el
// mismo motor de tema, por lo que la vista previa es fiel al documento final.
// ==========================================
export const SAMPLE_DOC_TYPES = [
  { id: "presupuesto", label: "Presupuesto" },
  { id: "recepcion", label: "Hoja de Recepción" },
  { id: "recibo", label: "Recibo de Caja" }
];

export const SAMPLE_DOC_WIDTH = 800;
export const SAMPLE_DOC_HEIGHT = 1100;

const roundedRectPath = (c, x, y, w, h, r) => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
};

export const drawSampleDocument = (ctx, brand, tipo = "presupuesto", logoImg = null) => {
  const b = getCleanBranding(brand);
  const W = SAMPLE_DOC_WIDTH;
  const H = SAMPLE_DOC_HEIGHT;
  applyDocumentTheme(ctx, b);
  ctx.textAlign = "left";

  // Fondo + encabezado
  ctx.fillStyle = "@fondo";
  ctx.fillRect(0, 0, W, H);
  drawCanvasHeader(ctx, W, b, logoImg);

  // Fecha
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 1;
  roundedRectPath(ctx, 300, 170, 200, 36, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#000000";
  ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  const hoy = new Date().toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" });
  ctx.fillText(`Fecha:  ${hoy}`, 400, 194);

  // Banda de título
  const titulos = {
    presupuesto: "PRESUPUESTO DE REPARACIÓN DE VEHÍCULO",
    recepcion: "HOJA DE RECEPCIÓN DE VEHÍCULO",
    recibo: "RECIBO DE CAJA - ANTICIPO A CUENTA"
  };
  ctx.fillStyle = "#000000";
  roundedRectPath(ctx, 40, 230, 720, 40, 10);
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(55, 250); ctx.lineTo(105, 250);
  ctx.moveTo(695, 250); ctx.lineTo(745, 250);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(titulos[tipo] || titulos.presupuesto, 400, 256);
  ctx.textAlign = "left";

  // Datos del cliente / vehículo
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(400, 300); ctx.lineTo(400, 470);
  ctx.stroke();
  ctx.fillStyle = "#000000";
  ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("DATOS DEL CLIENTE", 50, 312);
  ctx.fillText("DETALLES DEL VEHÍCULO", 420, 312);

  const metaRow = (label, value, x, y) => {
    ctx.beginPath();
    ctx.arc(x + 12, y + 4, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 12, y + 4, 4, 0, Math.PI * 2);
    ctx.fillStyle = "@sobreAcento";
    ctx.fill();
    ctx.fillStyle = "#374151";
    ctx.font = "14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(label, x + 35, y + 8);
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(x + 150, y + 11); ctx.lineTo(x + 330, y + 11);
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(value, x + 155, y + 7);
  };
  metaRow("Cliente:", "Juan Pérez", 40, 335);
  metaRow("Teléfono:", "5555-1234", 40, 375);
  metaRow("NIT:", "1234567-8", 40, 415);
  metaRow("Vehículo:", "Toyota Hilux", 410, 335);
  metaRow("Modelo:", "2021", 410, 375);
  metaRow("Placa:", "P-123ABC", 410, 415);
  metaRow("Kilometraje:", "48,250", 410, 455);

  // Tabla
  const tablas = {
    presupuesto: {
      titulo: "DETALLES DE LA REPARACIÓN",
      cols: [["CANT.", 80, "center"], ["DESCRIPCIÓN", 135, "left"], ["PRECIO UNIT.", 565, "center"], ["TOTAL", 695, "center"]],
      divs: [120, 500, 630],
      filas: [
        ["1", "Cambio de aceite sintético 5W-30", "Q 350.00", "Q 350.00"],
        ["4", "Filtro de aceite y aire", "Q 85.00", "Q 340.00"],
        ["1", "Alineación y balanceo", "Q 250.00", "Q 250.00"],
        ["2", "Pastillas de freno delanteras", "Q 260.00", "Q 520.00"]
      ],
      total: "Q 1,460.00",
      etiquetaTotal: "TOTAL:"
    },
    recepcion: {
      titulo: "INVENTARIO Y ESTADO DE RECEPCIÓN",
      cols: [["#", 80, "center"], ["ELEMENTO REVISADO", 135, "left"], ["ESTADO", 565, "center"], ["NOTA", 695, "center"]],
      divs: [120, 500, 630],
      filas: [
        ["1", "Llanta de repuesto y herramienta", "✓ Bien", "—"],
        ["2", "Luces delanteras y traseras", "✓ Bien", "—"],
        ["3", "Parabrisas y espejos", "Revisar", "Rayón"],
        ["4", "Radio y accesorios", "✓ Bien", "—"]
      ],
      total: "3/4 Tanque",
      etiquetaTotal: "COMBUSTIBLE:"
    },
    recibo: {
      titulo: "DETALLE DEL PAGO RECIBIDO",
      cols: [["#", 80, "center"], ["CONCEPTO", 135, "left"], ["MÉTODO", 565, "center"], ["MONTO", 695, "center"]],
      divs: [120, 500, 630],
      filas: [
        ["1", "Anticipo a cuenta - Orden #1045", "Efectivo", "Q 500.00"],
        ["2", "Abono por repuestos", "Transferencia", "Q 300.00"],
        ["", "Total de la orden", "", "Q 1,460.00"],
        ["", "Saldo pendiente", "", "Q 660.00"]
      ],
      total: "Q 800.00",
      etiquetaTotal: "RECIBIDO:"
    }
  };
  const tabla = tablas[tipo] || tablas.presupuesto;

  ctx.fillStyle = "#000000";
  ctx.font = "bold 16px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(tabla.titulo, 40, 500);

  ctx.fillStyle = "#000000";
  ctx.fillRect(40, 515, 720, 30);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px 'Plus Jakarta Sans', sans-serif";
  tabla.cols.forEach(([txt, x, align]) => {
    ctx.textAlign = align;
    ctx.fillText(txt, x, 534);
  });
  ctx.textAlign = "left";
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  tabla.divs.forEach((x) => { ctx.moveTo(x, 515); ctx.lineTo(x, 545); });
  ctx.stroke();

  let y = 545;
  const rowH = 38;
  tabla.filas.forEach((fila, i) => {
    ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#f9fafb";
    ctx.fillRect(40, y, 720, rowH);
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    [40, ...tabla.divs, 760].forEach((x) => { ctx.moveTo(x, y); ctx.lineTo(x, y + rowH); });
    ctx.moveTo(40, y + rowH); ctx.lineTo(760, y + rowH);
    ctx.stroke();

    const midY = y + rowH / 2 + 5;
    ctx.font = "13px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.fillText(fila[0], 80, midY);
    ctx.textAlign = "left";
    ctx.fillText(fila[1], 135, midY);
    ctx.textAlign = "center";
    if (tipo === "recepcion") {
      const ok = fila[2].startsWith("✓");
      ctx.fillStyle = ok ? "#10b981" : "#ef4444";
      ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
    }
    ctx.fillText(fila[2], 565, midY);
    ctx.fillStyle = "#111827";
    ctx.font = "13px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(fila[3], 695, midY);
    ctx.textAlign = "left";
    y += rowH;
  });

  // Cuadro de total
  const totalY = y + 15;
  ctx.fillStyle = "#000000";
  ctx.fillRect(500, totalY, 130, 40);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(tabla.etiquetaTotal, 565, totalY + 25);
  ctx.fillStyle = "@totalFondo";
  ctx.fillRect(630, totalY, 130, 40);
  ctx.fillStyle = "@totalTexto";
  ctx.font = "bold 16px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(tabla.total, 695, totalY + 25);
  ctx.textAlign = "left";

  // Notas / términos
  const notesY = totalY + 70;
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 1.5;
  roundedRectPath(ctx, 40, notesY, 720, 120, 10);
  ctx.stroke();
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(75, notesY + 35, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "@sobreAcento";
  ctx.font = "bold 16px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("i", 75, notesY + 41);
  ctx.textAlign = "left";
  ctx.fillStyle = "#000000";
  ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(tipo === "recepcion" ? "CONDICIONES DE RECEPCIÓN" : "NOTAS Y TÉRMINOS", 105, notesY + 30);
  const terminos = tipo === "recepcion" ? b.terminosRecepcion : tipo === "recibo" ? b.garantiaTexto : b.terminosCotizacion;
  ctx.fillStyle = "#374151";
  ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
  const palabras = String(terminos || "").split(" ");
  let linea = "";
  let ly = notesY + 55;
  palabras.forEach((p) => {
    const prueba = linea + p + " ";
    if (ctx.measureText(prueba).width > 620 && linea) {
      ctx.fillText(linea.trim(), 105, ly);
      linea = p + " ";
      ly += 18;
    } else {
      linea = prueba;
    }
  });
  if (linea && ly < notesY + 112) ctx.fillText(linea.trim(), 105, ly);

  // Pie de página
  const footerY = notesY + 150;
  ctx.fillStyle = "#0a0c10";
  ctx.fillRect(0, footerY, W, H - footerY);
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, footerY); ctx.lineTo(W, footerY);
  ctx.stroke();

  const badges = ["CALIDAD GARANTIZADA", "EXPERIENCIA Y CONFIANZA", "SERVICIO PROFESIONAL", "COMPROMISO TOTAL"];
  badges.forEach((txt, i) => {
    const cx = 100 + i * 200;
    const cy = footerY + 35;
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "@sobreAcento";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy); ctx.lineTo(cx - 1, cy + 4); ctx.lineTo(cx + 6, cy - 4);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(txt, cx, cy + 30);
  });

  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 22px 'Dancing Script', cursive";
  ctx.fillText(b.piePaginaDocumento || `¡Gracias por confiar en ${b.nombreEmpresa}!`, 400, footerY + 100, 720);
  ctx.fillStyle = "#9ca3af";
  ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`${b.direccion || ""}  |  Tel: ${b.telefono || ""}  |  ${b.email || ""}`, 400, footerY + 128, 720);
  ctx.textAlign = "left";
};
