import React, { useState } from "react";
import { Smartphone, Share2, QrCode, X, Copy, Check, Gift, Sparkles } from "lucide-react";
import { generateGiftPassQR, getPortalUrl } from "../utils/wallet";

export default function WalletInviteModal({
  cliente = {},
  regalosPasesReferidos = [],
  setRegalosPasesReferidos,
  onClose
}) {
  const [activeTab, setActiveTab] = useState("pass"); // 'pass' or 'cortesia'
  const [copied, setCopied] = useState(false);

  // Courtesy pass form states
  const [servicioNombre, setServicioNombre] = useState("Carwash de Cortesía para Referido");
  const [invitadoNombre, setInvitadoNombre] = useState("");
  const [generatedPass, setGeneratedPass] = useState(null);

  const nombre = cliente.nombre || "Cliente Los Pits";
  const telefono = cliente.telefono || "";

  const portalUrl = getPortalUrl({ cliente: telefono || nombre });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsAppPass = () => {
    const msg = `🚗 *¡Hola ${nombre}!* Te compartimos tu *Tarjeta Digital de Socio VIP Los Pits*.\nGuárdala en tu Apple Wallet o Google Wallet para consultar tus puntos e historial de tu vehículo en tiempo real:\n👉 ${portalUrl}`;
    window.open(`https://api.whatsapp.com/send?phone=${encodeURIComponent(telefono)}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleGenerarCortesiaAdmin = (e) => {
    e.preventDefault();
    const newGift = generateGiftPassQR({
      clienteDonanteTelefono: telefono,
      clienteDonanteNombre: nombre,
      servicioNombre,
      tipoRegalo: "cortesia_admin",
      puntosConsumidos: 0,
      invitadoNombre: invitadoNombre.trim() || "Amigo Referido",
      invitadoTelefono: ""
    });

    if (typeof setRegalosPasesReferidos === "function") {
      setRegalosPasesReferidos([newGift, ...(regalosPasesReferidos || [])]);
    }
    setGeneratedPass(newGift);
  };

  const handleShareCortesiaWsp = (gift) => {
    if (!gift) return;
    const giftUrl = getPortalUrl({ qr: gift.codigoQR });
    const msg = `🎁 *¡Hola ${nombre}!* Gracias por ser cliente de Los Pits. Te regalamos este *Pase de Cortesía para un Amigo*: *${gift.servicioNombre}*.\nReenvíaselo a quien quieras y al presentar este código QR *${gift.codigoQR}* en recepción su servicio será GRATIS. 👉 ${giftUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalContent}>
        {/* MODAL HEADER */}
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <Smartphone size={22} color="#eab308" />
            <h3 style={styles.title}>Emisión de Pase Digital & Regalos</h3>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* CLIENT SUMMARY */}
        <div style={styles.clientBox}>
          <div>
            <h4 style={styles.clientName}>{nombre}</h4>
            <span style={styles.clientPhone}>{telefono || "Sin teléfono registrado"}</span>
          </div>
          <span style={styles.clientPointsTag}>
            {cliente.puntos || 0} Puntos Pits
          </span>
        </div>

        {/* TAB SELECTOR */}
        <div style={styles.tabSelector}>
          <button
            onClick={() => setActiveTab("pass")}
            style={{ ...styles.tabBtn, ...(activeTab === "pass" ? styles.activeTabBtn : {}) }}
          >
            <Smartphone size={16} /> Pase Digital Wallet
          </button>
          <button
            onClick={() => setActiveTab("cortesia")}
            style={{ ...styles.tabBtn, ...(activeTab === "cortesia" ? styles.activeTabBtn : {}) }}
          >
            <Gift size={16} /> Regalo de Cortesía (Referidos)
          </button>
        </div>

        {/* TAB 1: WALLET PASS */}
        {activeTab === "pass" && (
          <div style={styles.tabBody}>
            <p style={styles.tabDesc}>Envía el enlace al cliente para que guarde su tarjeta de socio en Apple Wallet o Google Wallet.</p>

            <div style={styles.urlBox}>
              <span style={styles.urlText}>{portalUrl}</span>
              <button onClick={handleCopyLink} style={styles.copyBtn}>
                {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              </button>
            </div>

            <div style={styles.actionsRow}>
              <button onClick={handleSendWhatsAppPass} style={styles.wspBtn}>
                <Share2 size={18} /> Enviar por WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: COURTESY REFERRAL PASS */}
        {activeTab === "cortesia" && (
          <div style={styles.tabBody}>
            <p style={styles.tabDesc}>Genera un pase de cortesía financiado por Los Pits para que este cliente se lo envíe a un amigo y atraiga un nuevo vehículo.</p>

            {!generatedPass ? (
              <form onSubmit={handleGenerarCortesiaAdmin} style={styles.cortesiaForm}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Servicio u Obsequio de Cortesía</label>
                  <select
                    value={servicioNombre}
                    onChange={(e) => setServicioNombre(e.target.value)}
                    style={styles.select}
                  >
                    <option value="Carwash de Cortesía para Referido">🧼 Carwash de Cortesía Gratis</option>
                    <option value="50% Desc. en Mano de Obra Alineación">🛞 50% Desc. en Alineación</option>
                    <option value="Café & Bebida de Cortesía">☕ Café / Bebida de Cortesía</option>
                    <option value="Diagnóstico de Suspensión Gratis">🔍 Diagnóstico de Suspensión Gratis</option>
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nombre del Referido / Amigo (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Nombre del amigo a invitar"
                    value={invitadoNombre}
                    onChange={(e) => setInvitadoNombre(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={styles.generateBtn}>
                  <Sparkles size={18} /> Generar Pase de Cortesía (Cero costo de puntos)
                </button>
              </form>
            ) : (
              <div style={styles.generatedPassBox}>
                <div style={styles.qrDisplay}>
                  <QrCode size={100} color="#111827" />
                  <h4 style={styles.qrCodeText}>{generatedPass.codigoQR}</h4>
                </div>

                <button onClick={() => handleShareCortesiaWsp(generatedPass)} style={styles.wspBtn}>
                  <Share2 size={18} /> Enviar Regalo a {nombre} para su Referido
                </button>

                <button onClick={() => setGeneratedPass(null)} className="btn btn-ghost" style={{ marginTop: "8px", width: "100%" }}>
                  Crear otro Pase de Regalo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px"
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderRadius: "24px",
    padding: "28px",
    maxWidth: "480px",
    width: "100%",
    border: "1px solid #334155",
    color: "#f8fafc",
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #334155",
    paddingBottom: "14px",
    marginBottom: "16px"
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  title: {
    fontSize: "18px",
    fontWeight: 800,
    margin: 0
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer"
  },
  clientBox: {
    backgroundColor: "#0f172a",
    borderRadius: "14px",
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  },
  clientName: {
    fontSize: "15px",
    fontWeight: 700,
    margin: 0
  },
  clientPhone: {
    fontSize: "12px",
    color: "#94a3b8"
  },
  clientPointsTag: {
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    color: "#eab308",
    fontWeight: 800,
    fontSize: "13px",
    padding: "4px 10px",
    borderRadius: "10px"
  },
  tabSelector: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px"
  },
  tabBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    backgroundColor: "#0f172a",
    color: "#94a3b8",
    border: "1px solid #334155",
    padding: "10px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer"
  },
  activeTabBtn: {
    backgroundColor: "#eab308",
    color: "#0f172a",
    borderColor: "#eab308"
  },
  tabBody: {
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  tabDesc: {
    fontSize: "13px",
    color: "#94a3b8",
    margin: 0,
    lineHeight: "1.5"
  },
  urlBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "10px 14px"
  },
  urlText: {
    fontSize: "12px",
    color: "#cbd5e1",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1
  },
  copyBtn: {
    background: "none",
    border: "none",
    color: "#eab308",
    cursor: "pointer"
  },
  actionsRow: {
    display: "flex",
    gap: "10px"
  },
  wspBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#25d366",
    color: "#ffffff",
    border: "none",
    padding: "12px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer"
  },
  cortesiaForm: {
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#cbd5e1"
  },
  input: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "10px 14px",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none"
  },
  select: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "10px 14px",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none"
  },
  generateBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px",
    borderRadius: "12px",
    fontWeight: 800,
    fontSize: "14px",
    marginTop: "6px"
  },
  generatedPassBox: {
    textAlign: "center"
  },
  qrDisplay: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "16px",
    margin: "12px auto",
    display: "inline-block"
  },
  qrCodeText: {
    color: "#111827",
    margin: "8px 0 0 0",
    fontSize: "15px",
    fontWeight: 800
  }
};
