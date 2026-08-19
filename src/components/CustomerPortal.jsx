import React, { useState, useEffect } from "react";
import { 
  Award, 
  Car, 
  Wrench, 
  Smartphone, 
  Gift, 
  Share2, 
  QrCode, 
  CheckCircle, 
  Clock, 
  Camera, 
  Search, 
  ChevronRight, 
  Sparkles,
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Phone
} from "lucide-react";
import { formatMoney } from "../utils/storage";
import { generateAppleWalletPassData, generateGoogleWalletPassUrl, generateGiftPassQR } from "../utils/wallet";

export default function CustomerPortal({
  puntosRecompensas = [],
  setPuntosRecompensas,
  ordenes = [],
  carwash = [],
  clientes = [],
  vehiculos = [],
  catalogoPremios = [],
  regalosPasesReferidos = [],
  setRegalosPasesReferidos,
  onClose
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCliente, setActiveCliente] = useState(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedPremio, setSelectedPremio] = useState(null);
  const [invitadoNombre, setInvitadoNombre] = useState("");
  const [invitadoTelefono, setInvitadoTelefono] = useState("");
  const [generatedGift, setGeneratedGift] = useState(null);
  const [activeTab, setActiveTab] = useState("wallet"); // 'wallet', 'estado', 'historial', 'regalos'

  // Pre-load from URL query if available
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const query = params.get("cliente") || params.get("telefono") || params.get("placa");
      if (query) {
        setSearchTerm(query);
        buscarCliente(query);
      }
    } catch (e) {}
  }, [puntosRecompensas, clientes, ordenes]);

  const buscarCliente = (queryStr) => {
    const q = String(queryStr || "").toLowerCase().trim();
    if (!q) return;

    // Search in puntosRecompensas, clientes, ordenes, or vehiculos
    const matchPts = puntosRecompensas.find(p => 
      (p.telefono && p.telefono.toLowerCase().includes(q)) ||
      (p.nombre && p.nombre.toLowerCase().includes(q))
    );

    const matchCliente = clientes.find(c => 
      (c.telefono && c.telefono.toLowerCase().includes(q)) ||
      (c.nombre && c.nombre.toLowerCase().includes(q))
    );

    const matchVehiculo = vehiculos.find(v => v.placa && v.placa.toLowerCase().includes(q));

    let telFound = matchPts?.telefono || matchCliente?.telefono || "";
    let nombreFound = matchPts?.nombre || matchCliente?.nombre || matchVehiculo?.propietario || "Cliente Los Pits";

    if (!telFound && matchVehiculo) {
      const order = ordenes.find(o => o.vehiculo && o.vehiculo.toLowerCase().includes(matchVehiculo.placa.toLowerCase()));
      if (order) {
        telFound = order.telefono || "";
        nombreFound = order.cliente || nombreFound;
      }
    }

    const totalPts = matchPts ? (parseInt(matchPts.puntos) || 0) : 0;

    setActiveCliente({
      nombre: nombreFound,
      telefono: telFound || q,
      puntos: totalPts,
      matchPts
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    buscarCliente(searchTerm);
  };

  // Find active orders in workshop or carwash for this client
  const activeOrders = activeCliente ? ordenes.filter(o => {
    const t = String(o.telefono || "").toLowerCase().trim();
    const c = String(o.cliente || "").toLowerCase().trim();
    const targetT = String(activeCliente.telefono).toLowerCase().trim();
    const targetC = String(activeCliente.nombre).toLowerCase().trim();
    return (t && targetT && t === targetT) || (c && targetC && c.includes(targetC)) || (targetT && String(o.vehiculo).toLowerCase().includes(targetT));
  }) : [];

  const activeCarwash = activeCliente ? carwash.filter(cw => {
    const t = String(cw.telefono || "").toLowerCase().trim();
    const c = String(cw.cliente || "").toLowerCase().trim();
    const targetT = String(activeCliente.telefono).toLowerCase().trim();
    const targetC = String(activeCliente.nombre).toLowerCase().trim();
    return (t && targetT && t === targetT) || (c && targetC && c.includes(targetC));
  }) : [];

  // Default rewards catalog if empty
  const defaultPremios = [
    { id: "p1", titulo: "Carwash Gratis Completo", puntosRequeridos: 150, area: "carwash", icono: "🧼" },
    { id: "p2", titulo: "50% Desc. en Mano de Obra Alineación", puntosRequeridos: 200, area: "taller", icono: "🛞" },
    { id: "p3", titulo: "Café Americano o Bebida Gratis", puntosRequeridos: 50, area: "cafeteria", icono: "☕" },
    { id: "p4", titulo: "Servicio de Cambio de Aceite Gratis (Mano de Obra)", puntosRequeridos: 350, area: "taller", icono: "🛢️" }
  ];

  const premiosList = Array.isArray(catalogoPremios) && catalogoPremios.length > 0 ? catalogoPremios : defaultPremios;

  const handleGenerarRegalo = (premio) => {
    if (!activeCliente) return;
    if (activeCliente.puntos < premio.puntosRequeridos) {
      alert(`Necesitas ${premio.puntosRequeridos} Puntos Pits para donar este servicio. Saldo actual: ${activeCliente.puntos} pts.`);
      return;
    }
    setSelectedPremio(premio);
    setShowGiftModal(true);
  };

  const handleConfirmarDonacion = (e) => {
    e.preventDefault();
    if (!selectedPremio || !activeCliente) return;

    const newGift = generateGiftPassQR({
      clienteDonanteTelefono: activeCliente.telefono,
      clienteDonanteNombre: activeCliente.nombre,
      servicioNombre: selectedPremio.titulo,
      tipoRegalo: "puntos_donados",
      puntosConsumidos: selectedPremio.puntosRequeridos,
      invitadoNombre: invitadoNombre.trim() || "Amigo / Familiar",
      invitadoTelefono: invitadoTelefono.trim()
    });

    // Deduct points from donor
    const targetKey = String(activeCliente.telefono || activeCliente.nombre).toLowerCase().trim();
    setPuntosRecompensas(prev => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const idx = list.findIndex(p =>
        (p.telefono && String(p.telefono).toLowerCase().trim() === targetKey) ||
        (p.nombre && String(p.nombre).toLowerCase().trim() === targetKey)
      );
      if (idx >= 0) {
        list[idx] = { ...list[idx], puntos: Math.max(0, (parseInt(list[idx].puntos) || 0) - selectedPremio.puntosRequeridos) };
      }
      return list;
    });

    // Add to regalosPasesReferidos collection
    setRegalosPasesReferidos([newGift, ...(regalosPasesReferidos || [])]);
    setGeneratedGift(newGift);

    // Update local activeCliente state
    setActiveCliente(prev => ({
      ...prev,
      puntos: Math.max(0, prev.puntos - selectedPremio.puntosRequeridos)
    }));
  };

  const handleShareWhatsApp = (gift) => {
    if (!gift) return;
    const msg = `🎁 ¡Hola ${gift.invitadoNombre || ''}! Te he regale un servicio de *${gift.servicioNombre}* en *Los Pits Taller & Carwash*. Presenta este código QR en recepción para disfrutarlo gratis: *${gift.codigoQR}*. Ver pase digital: https://lospits.app/portal?qr=${gift.codigoQR}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Download Apple Wallet Pass JSON simulation
  const handleDownloadAppleWallet = () => {
    if (!activeCliente) return;
    const passData = generateAppleWalletPassData(activeCliente, {}, activeCliente.puntos, activeOrders);
    const blob = new Blob([JSON.stringify(passData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LosPits_Pass_${activeCliente.telefono || 'VIP'}.pkpass.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert("🍏 Pase Digital para Apple Wallet listo para guardar en tu dispositivo.");
  };

  const handleSaveGoogleWallet = () => {
    if (!activeCliente) return;
    const url = generateGoogleWalletPassUrl(activeCliente, {}, activeCliente.puntos);
    window.open(url, "_blank");
  };

  return (
    <div style={styles.container}>
      {/* HEADER BAR */}
      <header style={styles.header}>
        <div style={styles.headerTitleRow}>
          {onClose && (
            <button onClick={onClose} style={styles.backBtn}>
              <ArrowLeft size={20} />
            </button>
          )}
          <div style={styles.logoBadge}>
            <Car size={24} color="#eab308" />
            <span style={styles.logoText}>LOS PITS</span>
          </div>
          <span style={styles.subLogoText}>Portal & Digital Wallet</span>
        </div>
      </header>

      {/* SEARCH BAR (If no client selected yet) */}
      {!activeCliente ? (
        <div style={styles.searchHeroCard}>
          <div style={styles.heroBadge}>
            <Sparkles size={18} color="#eab308" />
            <span>Bienvenido a Los Pits</span>
          </div>
          <h2 style={styles.heroTitle}>Consulta tus Puntos Pits e Historial de Vehículo</h2>
          <p style={styles.heroSub}>Ingresa tu número de teléfono, nombre o placa para ver tu pase digital e historial técnico.</p>

          <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
            <div style={styles.searchInputWrapper}>
              <Search size={20} color="#9ca3af" />
              <input
                type="text"
                placeholder="Ej. 55443322 o P-420DSK..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={styles.searchBtn}>
              Consultar Portal
            </button>
          </form>

          <div style={styles.heroFeaturesRow}>
            <div style={styles.featurePill}>
              <Smartphone size={16} color="#eab308" />
              <span>Apple & Google Wallet</span>
            </div>
            <div style={styles.featurePill}>
              <Gift size={16} color="#eab308" />
              <span>Donación de Puntos a Amigos</span>
            </div>
            <div style={styles.featurePill}>
              <Wrench size={16} color="#eab308" />
              <span>Fotos & Mantenimientos</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.portalContent}>
          {/* CLIENT BANNER CARD */}
          <div style={styles.clientCard}>
            <div style={styles.clientInfoMain}>
              <div style={styles.avatarCircle}>
                <User size={28} color="#eab308" />
              </div>
              <div>
                <h3 style={styles.clientName}>{activeCliente.nombre}</h3>
                <span style={styles.clientPhone}>
                  <Phone size={14} /> {activeCliente.telefono || "Socio Registrado"}
                </span>
              </div>
            </div>

            <div style={styles.pointsBadgeBox}>
              <Award size={28} color="#eab308" />
              <div>
                <span style={styles.pointsNumber}>{activeCliente.puntos}</span>
                <span style={styles.pointsLabel}>Puntos Pits Acumulados</span>
              </div>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div style={styles.tabsRow}>
            <button
              onClick={() => setActiveTab("wallet")}
              style={{ ...styles.tabBtn, ...(activeTab === "wallet" ? styles.activeTabBtn : {}) }}
            >
              <Smartphone size={18} /> Tarjeta Wallet
            </button>
            <button
              onClick={() => setActiveTab("estado")}
              style={{ ...styles.tabBtn, ...(activeTab === "estado" ? styles.activeTabBtn : {}) }}
            >
              <Clock size={18} /> Estado en Vivo ({activeOrders.length + activeCarwash.length})
            </button>
            <button
              onClick={() => setActiveTab("historial")}
              style={{ ...styles.tabBtn, ...(activeTab === "historial" ? styles.activeTabBtn : {}) }}
            >
              <Wrench size={18} /> Historial Técnico
            </button>
            <button
              onClick={() => setActiveTab("regalos")}
              style={{ ...styles.tabBtn, ...(activeTab === "regalos" ? styles.activeTabBtn : {}) }}
            >
              <Gift size={18} /> Donar o Regalar
            </button>
          </div>

          {/* TAB CONTENT: WALLET PASS */}
          {activeTab === "wallet" && (
            <div style={styles.tabSection}>
              {/* DIGITAL WALLET CARD SIMULATOR */}
              <div style={styles.walletCardSimulator}>
                <div style={styles.walletHeader}>
                  <div style={styles.walletLogo}>
                    <Car size={20} color="#eab308" />
                    <span>LOS PITS</span>
                  </div>
                  <span style={styles.walletPassType}>PASAPORTE SOCIO VIP</span>
                </div>

                <div style={styles.walletBody}>
                  <div>
                    <span style={styles.walletLabel}>TITULAR</span>
                    <h4 style={styles.walletValue}>{activeCliente.nombre}</h4>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={styles.walletLabel}>SALDO DE PUNTOS</span>
                    <h3 style={styles.walletPointsVal}>{activeCliente.puntos} PTS</h3>
                  </div>
                </div>

                <div style={styles.walletFooter}>
                  <div style={styles.qrWrapper}>
                    <QrCode size={90} color="#111827" />
                    <span style={styles.qrSubText}>Escanear en Recepción</span>
                  </div>
                  <div style={styles.walletLevelTag}>
                    {activeCliente.puntos >= 500 ? "NIVEL VIP ORO 🏆" : activeCliente.puntos >= 200 ? "NIVEL SILVER ⭐" : "SOCIO ACTIVO 🚗"}
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS TO SAVE TO WALLET */}
              <div style={styles.walletBtnGrid}>
                <button onClick={handleDownloadAppleWallet} style={styles.appleWalletBtn}>
                  <Smartphone size={20} />
                  <span>Guardar en Apple Wallet</span>
                </button>
                <button onClick={handleSaveGoogleWallet} style={styles.googleWalletBtn}>
                  <Smartphone size={20} />
                  <span>Guardar en Google Wallet</span>
                </button>
              </div>

              <button onClick={() => setSearchTerm("")} style={styles.changeUserBtn}>
                🔍 Consultar otro número de cliente
              </button>
            </div>
          )}

          {/* TAB CONTENT: REAL TIME STATUS */}
          {activeTab === "estado" && (
            <div style={styles.tabSection}>
              <h4 style={styles.sectionTitle}>Progreso en Tiempo Real del Vehículo</h4>
              {activeOrders.length === 0 && activeCarwash.length === 0 ? (
                <div style={styles.emptyCard}>
                  <CheckCircle size={36} color="#10b981" />
                  <p>No tienes vehículos en proceso de reparación o carwash en este momento.</p>
                </div>
              ) : (
                <div style={styles.ordersList}>
                  {activeOrders.map(o => (
                    <div key={o.id} style={styles.orderCard}>
                      <div style={styles.orderHeader}>
                        <div>
                          <span style={styles.orderBadge}>TALLER AUTOMOTRIZ</span>
                          <h4 style={styles.orderVehiculo}>{o.vehiculo}</h4>
                        </div>
                        <span style={styles.orderEstadoPill}>{o.estado}</span>
                      </div>
                      <p style={styles.orderTrabajo}><strong>Trabajo:</strong> {o.trabajo}</p>
                      <div style={styles.orderFooterRow}>
                        <span>Mecánico: {o.mecanico || "Asignado"}</span>
                        <strong>Total: {formatMoney(o.total || 0)}</strong>
                      </div>
                    </div>
                  ))}

                  {activeCarwash.map(cw => (
                    <div key={cw.id} style={styles.orderCard}>
                      <div style={styles.orderHeader}>
                        <div>
                          <span style={styles.orderBadgeCarwash}>CARWASH</span>
                          <h4 style={styles.orderVehiculo}>{cw.vehiculo?.marca} {cw.vehiculo?.linea} ({cw.vehiculo?.placa})</h4>
                        </div>
                        <span style={styles.orderEstadoPill}>{cw.estado}</span>
                      </div>
                      <p style={styles.orderTrabajo}><strong>Servicio:</strong> Carwash Tipo {cw.tipo}</p>
                      <div style={styles.orderFooterRow}>
                        <span>Lavador: {cw.lavador || "Asignado"}</span>
                        <strong>Total: {formatMoney(cw.precio || 0)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: VEHICLE HISTORY & PHOTOS */}
          {activeTab === "historial" && (
            <div style={styles.tabSection}>
              <h4 style={styles.sectionTitle}>Historial Técnico de Servicios Realizados</h4>
              {activeOrders.length === 0 ? (
                <div style={styles.emptyCard}>
                  <Wrench size={36} color="#9ca3af" />
                  <p>Aún no hay registros de mantenimiento almacenados para este cliente.</p>
                </div>
              ) : (
                <div style={styles.historyGrid}>
                  {activeOrders.map(o => (
                    <div key={o.id} style={styles.historyCard}>
                      <div style={styles.historyCardHeader}>
                        <div>
                          <span style={styles.historyDate}>
                            <Calendar size={14} /> {new Date(o.fecha).toLocaleDateString()}
                          </span>
                          <h4 style={styles.historyVehiculo}>{o.vehiculo}</h4>
                        </div>
                        <span style={styles.historyTotal}>{formatMoney(o.total || 0)}</span>
                      </div>

                      <p style={styles.historyTrabajo}>{o.trabajo}</p>

                      {Array.isArray(o.fotos) && o.fotos.length > 0 && (
                        <div style={styles.photosSection}>
                          <span style={styles.photosTitle}><Camera size={14} /> Fotos de Recepción y Trabajo:</span>
                          <div style={styles.photosGrid}>
                            {o.fotos.map((imgUrl, idx) => (
                              <img key={idx} src={imgUrl} alt="Diagnóstico" style={styles.photoThumb} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: GIFT & DONATE POINTS */}
          {activeTab === "regalos" && (
            <div style={styles.tabSection}>
              <div style={styles.giftBanner}>
                <Gift size={32} color="#eab308" />
                <div>
                  <h4 style={styles.giftBannerTitle}>¡Regala un Servicio a un Amigo o Familiar!</h4>
                  <p style={styles.giftBannerSub}>Canjea tus Puntos Pits por un vale de regalo con código QR para compartirlo por WhatsApp. Los puntos se descontarán de tu saldo al generar el regalo.</p>
                </div>
              </div>

              <h4 style={styles.sectionTitle}>Servicios Disponibles para Donar</h4>
              <div style={styles.premiosGrid}>
                {premiosList.map(premio => {
                  const canAfford = activeCliente.puntos >= premio.puntosRequeridos;
                  return (
                    <div key={premio.id} style={{ ...styles.premioCard, opacity: canAfford ? 1 : 0.65 }}>
                      <div style={styles.premioIconRow}>
                        <span style={{ fontSize: "28px" }}>{premio.icono || "🎁"}</span>
                        <span style={styles.premioPtsTag}>{premio.puntosRequeridos} Puntos</span>
                      </div>
                      <h5 style={styles.premioTitle}>{premio.titulo}</h5>
                      <button
                        onClick={() => handleGenerarRegalo(premio)}
                        className={`btn ${canAfford ? 'btn-primary' : 'btn-ghost'}`}
                        style={styles.premioActionBtn}
                        disabled={!canAfford}
                      >
                        {canAfford ? "🎁 Generar QR de Regalo" : `Te faltan ${premio.puntosRequeridos - activeCliente.puntos} pts`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* LIST OF GENERATED GIFTS */}
              {Array.isArray(regalosPasesReferidos) && regalosPasesReferidos.length > 0 && (
                <div style={{ marginTop: "30px" }}>
                  <h4 style={styles.sectionTitle}>Tus Pases de Regalo Generados</h4>
                  <div style={styles.giftsList}>
                    {regalosPasesReferidos.map(g => (
                      <div key={g.id} style={styles.giftCardItem}>
                        <div>
                          <span style={styles.giftBadge}>{g.servicioNombre}</span>
                          <h5 style={styles.giftCodeText}>Código QR: {g.codigoQR}</h5>
                          <span style={styles.giftParaText}>Para: {g.invitadoNombre || 'Amigo'}</span>
                        </div>

                        <button onClick={() => handleShareWhatsApp(g)} style={styles.shareWspBtn}>
                          <Share2 size={16} /> Enviar por WhatsApp
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* GIFT MODAL POPUP */}
      {showGiftModal && selectedPremio && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>🎁 Regalar {selectedPremio.titulo}</h3>
            <p style={styles.modalSub}>Ingresa los datos de la persona a quien deseas obsequiarle este servicio.</p>

            {!generatedGift ? (
              <form onSubmit={handleConfirmarDonacion} style={styles.giftForm}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nombre del Amigo / Familiar</label>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Mendoza"
                    value={invitadoNombre}
                    onChange={(e) => setInvitadoNombre(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Teléfono del Amigo / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej. 55443322"
                    value={invitadoTelefono}
                    onChange={(e) => setInvitadoTelefono(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.modalSummaryBox}>
                  <span>Puntos a descontar de tu saldo:</span>
                  <strong>- {selectedPremio.puntosRequeridos} Puntos Pits</strong>
                </div>

                <div style={styles.modalActionsRow}>
                  <button type="button" onClick={() => setShowGiftModal(false)} className="btn btn-ghost">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    🎁 Confirmar y Generar Código QR
                  </button>
                </div>
              </form>
            ) : (
              <div style={styles.generatedGiftSuccessBox}>
                <CheckCircle size={48} color="#10b981" />
                <h4>¡Pase de Regalo Creado con Éxito!</h4>
                <p>Se han descontado <strong>{selectedPremio.puntosRequeridos} Puntos</strong> de tu saldo.</p>

                <div style={styles.qrDisplayBox}>
                  <QrCode size={120} color="#111827" />
                  <h3 style={styles.qrCodeVal}>{generatedGift.codigoQR}</h3>
                </div>

                <button onClick={() => handleShareWhatsApp(generatedGift)} style={styles.whatsappFullBtn}>
                  <Share2 size={20} /> Compartir por WhatsApp a {generatedGift.invitadoNombre}
                </button>

                <button onClick={() => { setShowGiftModal(false); setGeneratedGift(null); }} className="btn btn-ghost" style={{ marginTop: "12px", width: "100%" }}>
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    paddingBottom: "40px"
  },
  header: {
    backgroundColor: "#1e293b",
    borderBottom: "1px solid #334155",
    padding: "16px 24px"
  },
  headerTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer"
  },
  logoBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  logoText: {
    fontWeight: 800,
    fontSize: "20px",
    letterSpacing: "1px",
    color: "#ffffff"
  },
  subLogoText: {
    fontSize: "13px",
    color: "#eab308",
    fontWeight: 600,
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    padding: "2px 8px",
    borderRadius: "12px"
  },
  searchHeroCard: {
    maxWidth: "600px",
    margin: "60px auto",
    backgroundColor: "#1e293b",
    padding: "40px 32px",
    borderRadius: "24px",
    border: "1px solid #334155",
    textAlign: "center",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    color: "#eab308",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "16px"
  },
  heroTitle: {
    fontSize: "24px",
    fontWeight: 800,
    marginBottom: "12px"
  },
  heroSub: {
    color: "#94a3b8",
    fontSize: "14px",
    lineHeight: "1.6",
    marginBottom: "24px"
  },
  searchForm: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  searchInputWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "12px 16px"
  },
  searchInput: {
    background: "none",
    border: "none",
    color: "#ffffff",
    fontSize: "16px",
    width: "100%",
    outline: "none"
  },
  searchBtn: {
    padding: "14px",
    borderRadius: "12px",
    fontWeight: 700,
    fontSize: "16px"
  },
  heroFeaturesRow: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "28px"
  },
  featurePill: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#0f172a",
    padding: "6px 12px",
    borderRadius: "16px",
    fontSize: "12px",
    color: "#cbd5e1"
  },
  portalContent: {
    maxWidth: "900px",
    margin: "30px auto",
    padding: "0 20px"
  },
  clientCard: {
    backgroundColor: "#1e293b",
    borderRadius: "20px",
    padding: "24px",
    border: "1px solid #334155",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px"
  },
  clientInfoMain: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },
  avatarCircle: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  clientName: {
    fontSize: "20px",
    fontWeight: 700,
    margin: 0
  },
  clientPhone: {
    fontSize: "14px",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginTop: "4px"
  },
  pointsBadgeBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
    padding: "12px 20px",
    borderRadius: "16px"
  },
  pointsNumber: {
    display: "block",
    fontSize: "28px",
    fontWeight: 800,
    color: "#eab308",
    lineHeight: 1
  },
  pointsLabel: {
    fontSize: "12px",
    color: "#cbd5e1",
    fontWeight: 600
  },
  tabsRow: {
    display: "flex",
    gap: "8px",
    marginTop: "24px",
    overflowX: "auto",
    paddingBottom: "8px"
  },
  tabBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#1e293b",
    color: "#94a3b8",
    border: "1px solid #334155",
    padding: "10px 18px",
    borderRadius: "12px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  activeTabBtn: {
    backgroundColor: "#eab308",
    color: "#0f172a",
    borderColor: "#eab308"
  },
  tabSection: {
    marginTop: "20px"
  },
  walletCardSimulator: {
    backgroundColor: "#111827",
    borderRadius: "24px",
    padding: "24px",
    border: "2px solid #eab308",
    boxShadow: "0 10px 25px rgba(234, 179, 8, 0.15)"
  },
  walletHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #1f2937",
    paddingBottom: "16px"
  },
  walletLogo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 800,
    fontSize: "18px"
  },
  walletPassType: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "1px",
    color: "#eab308"
  },
  walletBody: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    margin: "24px 0"
  },
  walletLabel: {
    fontSize: "11px",
    color: "#6b7280",
    fontWeight: 700
  },
  walletValue: {
    fontSize: "18px",
    fontWeight: 700,
    margin: "4px 0 0 0"
  },
  walletPointsVal: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#eab308",
    margin: "4px 0 0 0"
  },
  walletFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "16px"
  },
  qrWrapper: {
    textAlign: "center"
  },
  qrSubText: {
    display: "block",
    fontSize: "10px",
    color: "#4b5563",
    marginTop: "4px",
    fontWeight: 600
  },
  walletLevelTag: {
    backgroundColor: "#0f172a",
    color: "#eab308",
    padding: "8px 14px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 800
  },
  walletBtnGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "16px"
  },
  appleWalletBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#000000",
    color: "#ffffff",
    border: "1px solid #374151",
    padding: "14px",
    borderRadius: "14px",
    fontWeight: 700,
    cursor: "pointer"
  },
  googleWalletBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#1a73e8",
    color: "#ffffff",
    border: "none",
    padding: "14px",
    borderRadius: "14px",
    fontWeight: 700,
    cursor: "pointer"
  },
  changeUserBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "13px",
    marginTop: "16px",
    cursor: "pointer",
    width: "100%",
    textAlign: "center"
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 700,
    marginBottom: "16px",
    color: "#f8fafc"
  },
  emptyCard: {
    backgroundColor: "#1e293b",
    borderRadius: "16px",
    padding: "40px 20px",
    textAlign: "center",
    color: "#94a3b8"
  },
  ordersList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  orderCard: {
    backgroundColor: "#1e293b",
    borderRadius: "16px",
    padding: "16px 20px",
    border: "1px solid #334155"
  },
  orderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  orderBadge: {
    fontSize: "10px",
    fontWeight: 800,
    color: "#eab308",
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    padding: "2px 8px",
    borderRadius: "8px"
  },
  orderBadgeCarwash: {
    fontSize: "10px",
    fontWeight: 800,
    color: "#3b82f6",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    padding: "2px 8px",
    borderRadius: "8px"
  },
  orderVehiculo: {
    fontSize: "16px",
    fontWeight: 700,
    margin: "4px 0 0 0"
  },
  orderEstadoPill: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#10b981",
    fontSize: "12px",
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: "12px"
  },
  orderTrabajo: {
    fontSize: "14px",
    color: "#cbd5e1",
    margin: "10px 0"
  },
  orderFooterRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "#94a3b8",
    borderTop: "1px solid #334155",
    paddingTop: "10px",
    marginTop: "10px"
  },
  historyGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  historyCard: {
    backgroundColor: "#1e293b",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #334155"
  },
  historyCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  historyDate: {
    fontSize: "12px",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  historyVehiculo: {
    fontSize: "16px",
    fontWeight: 700,
    margin: "4px 0 0 0"
  },
  historyTotal: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#eab308"
  },
  historyTrabajo: {
    fontSize: "14px",
    color: "#cbd5e1",
    margin: "12px 0"
  },
  photosSection: {
    marginTop: "12px",
    borderTop: "1px solid #334155",
    paddingTop: "12px"
  },
  photosTitle: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginBottom: "8px"
  },
  photosGrid: {
    display: "flex",
    gap: "8px",
    overflowX: "auto"
  },
  photoThumb: {
    width: "80px",
    height: "80px",
    borderRadius: "10px",
    objectFit: "cover",
    border: "1px solid #334155"
  },
  giftBanner: {
    backgroundColor: "#1e293b",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #334155",
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "24px"
  },
  giftBannerTitle: {
    fontSize: "16px",
    fontWeight: 700,
    margin: "0 0 4px 0"
  },
  giftBannerSub: {
    fontSize: "13px",
    color: "#94a3b8",
    margin: 0,
    lineHeight: "1.5"
  },
  premiosGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px"
  },
  premioCard: {
    backgroundColor: "#1e293b",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #334155",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between"
  },
  premioIconRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px"
  },
  premioPtsTag: {
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    color: "#eab308",
    fontSize: "12px",
    fontWeight: 800,
    padding: "4px 10px",
    borderRadius: "12px"
  },
  premioTitle: {
    fontSize: "15px",
    fontWeight: 700,
    margin: "0 0 16px 0"
  },
  premioActionBtn: {
    width: "100%",
    padding: "10px",
    borderRadius: "10px",
    fontWeight: 700,
    fontSize: "13px"
  },
  giftsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  giftCardItem: {
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    padding: "14px 18px",
    border: "1px solid #334155",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  giftBadge: {
    fontSize: "11px",
    color: "#eab308",
    fontWeight: 700
  },
  giftCodeText: {
    fontSize: "14px",
    fontWeight: 800,
    margin: "2px 0"
  },
  giftParaText: {
    fontSize: "12px",
    color: "#94a3b8"
  },
  shareWspBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#25d366",
    color: "#ffffff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer"
  },
  modalOverlay: {
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
    padding: "32px",
    maxWidth: "460px",
    width: "100%",
    border: "1px solid #334155"
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: 800,
    margin: "0 0 4px 0"
  },
  modalSub: {
    fontSize: "13px",
    color: "#94a3b8",
    marginBottom: "20px"
  },
  giftForm: {
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
  modalSummaryBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    color: "#ef4444",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "13px"
  },
  modalActionsRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "12px"
  },
  generatedGiftSuccessBox: {
    textAlign: "center"
  },
  qrDisplayBox: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    margin: "20px auto",
    display: "inline-block"
  },
  qrCodeVal: {
    color: "#111827",
    margin: "8px 0 0 0",
    fontSize: "16px",
    fontWeight: 800
  },
  whatsappFullBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#25d366",
    color: "#ffffff",
    border: "none",
    padding: "14px",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: 800,
    width: "100%",
    cursor: "pointer"
  }
};
