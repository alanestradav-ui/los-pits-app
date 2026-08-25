/**
 * 📲 Digital Wallet Passes & Referral Gift Engine for Los Pits
 * Utility handlers for Apple Wallet (.pkpass), Google Wallet JWT, and Gift QR Codes.
 */

import { formatMoney } from "./storage";

export const getBaseAppUrl = () => {
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return window.location.origin;
  }
  return "https://los-pits-app.vercel.app";
};

export const getPortalUrl = (query = {}) => {
  const baseUrl = getBaseAppUrl();
  const searchParams = new URLSearchParams();
  searchParams.set("portal", "true");
  if (query.cliente) searchParams.set("cliente", query.cliente);
  if (query.telefono) searchParams.set("telefono", query.telefono);
  if (query.placa) searchParams.set("placa", query.placa);
  if (query.qr) searchParams.set("qr", query.qr);
  return `${baseUrl}?${searchParams.toString()}`;
};

/**
 * 🍏 Generates Apple Wallet Pass Payload structure (.pkpass schema)
 */
export const generateAppleWalletPassData = (cliente = {}, vehiculo = {}, puntos = 0, ordenes = []) => {
  const nombre = cliente.nombre || "Cliente Los Pits";
  const telefono = cliente.telefono || "";
  const placa = vehiculo.placa || "General";
  const modelo = vehiculo.marca ? `${vehiculo.marca} ${vehiculo.linea || ""}` : "Vehículo";

  const ultimasOrdenes = Array.isArray(ordenes) ? ordenes.slice(0, 5) : [];
  const targetPortalUrl = getPortalUrl({ cliente: telefono || nombre });

  return {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.lospits.loyalty",
    serialNumber: `PITS-${telefono || Date.now()}`,
    teamIdentifier: "LOSPITS888",
    organizationName: "Los Pits Taller & Carwash",
    description: "Tarjeta de Socio VIP - Los Pits",
    logoText: "LOS PITS",
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: "rgb(20, 20, 20)",
    labelColor: "rgb(234, 179, 8)", // Gold accent
    barcode: {
      format: "PKBarcodeFormatQR",
      message: targetPortalUrl,
      messageEncoding: "iso-8859-1"
    },
    loyaltyCard: {
      headerFields: [
        {
          key: "puntos",
          label: "PUNTOS PITS",
          value: `${puntos} pts`
        }
      ],
      primaryFields: [
        {
          key: "cliente",
          label: "SOCIO",
          value: nombre
        }
      ],
      secondaryFields: [
        {
          key: "vehiculo",
          label: "VEHÍCULO",
          value: `${modelo} (${placa})`
        },
        {
          key: "nivel",
          label: "NIVEL",
          value: puntos >= 500 ? "VIP ORO 🏆" : puntos >= 200 ? "SILVER ⭐" : "SOCIO PITS 🚗"
        }
      ],
      backFields: [
        {
          key: "historial_titulo",
          label: "ÚLTIMOS SERVICIOS EN LOS PITS",
          value: ultimasOrdenes.length > 0
            ? ultimasOrdenes.map(o => `• ${new Date(o.fecha).toLocaleDateString()} | ${o.trabajo || "Servicio"} (${formatMoney(o.total || 0)})`).join("\n")
            : "Aún no registras mantenimientos recientes."
        },
        {
          key: "portal_link",
          label: "HISTORIAL COMPLETO CON FOTOS Y FACTURAS",
          value: targetPortalUrl
        },
        {
          key: "contacto",
          label: "ATENCIÓN A CLIENTES & CITAS",
          value: "WhatsApp / Teléfono: +502 5555-8888\nUbicación: Los Pits Taller Automotriz & Carwash"
        }
      ]
    }
  };
};

/**
 * 🤖 Generates Google Wallet Save URL / JWT
 */
export const generateGoogleWalletPassUrl = (cliente = {}, vehiculo = {}, puntos = 0) => {
  const nombre = encodeURIComponent(cliente.nombre || "Cliente Los Pits");
  const telefono = encodeURIComponent(cliente.telefono || "");
  const pts = encodeURIComponent(puntos);
  
  // URL universal que activa la vista del pase y permite guardar en Google Wallet
  return `https://pay.google.com/gp/v/save/lospits_loyalty_pass?name=${nombre}&phone=${telefono}&points=${pts}`;
};

/**
 * 🎁 Generates a unique Gift QR Ticket for Points Donation or Admin Courtesy Pass
 */
export const generateGiftPassQR = ({
  clienteDonanteTelefono = "",
  clienteDonanteNombre = "",
  servicioNombre = "Carwash Completo",
  tipoRegalo = "puntos_donados", // 'puntos_donados' | 'cortesia_admin'
  puntosConsumidos = 0,
  invitadoNombre = "",
  invitadoTelefono = ""
}) => {
  const randomHex = Math.random().toString(36).substr(2, 6).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const codigoQR = `REGALO-${tipoRegalo === 'cortesia_admin' ? 'ADMIN' : 'DONA'}-${timestamp}-${randomHex}`;

  return {
    id: `gift_${Date.now()}_${randomHex}`,
    codigoQR,
    clienteDonanteTelefono,
    clienteDonanteNombre,
    servicioNombre,
    tipoRegalo,
    puntosConsumidos,
    invitadoNombre,
    invitadoTelefono,
    estado: "Pendiente", // 'Pendiente' | 'Canjeado' | 'Cancelado'
    fechaCreacion: new Date().toISOString(),
    fechaCanje: null,
    canjeadoEn: null
  };
};

/**
 * 🔍 Validates a Gift QR code against list of regalos
 */
export const validateGiftPassQR = (codigoQR, regalosList = []) => {
  if (!codigoQR) return { valid: false, message: "Código QR no proporcionado." };
  
  const cleanCode = String(codigoQR).trim().toUpperCase();
  const gift = regalosList.find(r => String(r.codigoQR).trim().toUpperCase() === cleanCode);

  if (!gift) {
    return { valid: false, message: "El código QR presentado no existe en el sistema." };
  }

  if (gift.estado === "Canjeado") {
    return { 
      valid: false, 
      message: `Este pase de regalo ya fue canjeado el ${gift.fechaCanje ? new Date(gift.fechaCanje).toLocaleString() : 'anteriormente'}.` 
    };
  }

  if (gift.estado === "Cancelado") {
    return { valid: false, message: "Este pase de regalo ha sido anulado." };
  }

  return {
    valid: true,
    gift,
    message: `Pase VÁLIDO: ${gift.servicioNombre} (Donado por: ${gift.clienteDonanteNombre || 'Los Pits Admin'})`
  };
};
