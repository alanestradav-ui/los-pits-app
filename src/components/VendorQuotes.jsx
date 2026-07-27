import React, { useState } from "react";
import { 
  ShoppingBag, 
  Car, 
  Search, 
  Send, 
  Upload, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Image as ImageIcon,
  Tag,
  AlertCircle,
  X,
  FileText,
  Building2,
  Trash2
} from "lucide-react";
import { formatMoney } from "../utils/storage";

export default function VendorQuotes({
  ordenes = [],
  cotizacionesRepuestos = [],
  setCotizacionesRepuestos,
  usuarioActual
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("pendientes"); // "pendientes" | "misCotizaciones"

  // Form states for vendor submitting quote
  const [quoteItems, setQuoteItems] = useState({});
  const [vendedorNombre, setVendedorNombre] = useState(usuarioActual?.nombreEmpresa || usuarioActual?.user || "Vendedor");
  const [notasGenerales, setNotasGenerales] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build requests list: Combine requests generated from Taller orders authorized with requested parts
  const requestsFromOrders = (ordenes || [])
    .filter(o => o && o.presupuesto && (o.estado === "En Proceso" || o.estado === "Autorizado" || o.estado === "Registrado"))
    .map(o => {
      const parts = o.presupuesto?.parts || [];
      if (parts.length === 0) return null;

      // Check existing quotes in global array if any
      const existingGlobal = (cotizacionesRepuestos || []).find(c => String(c.tallerOrderId) === String(o.id));

      let vehMarca = o.marca;
      let vehLinea = o.linea;
      let vehAnio = o.anio;
      let vehMotor = o.motor;
      let vehVin = o.chasis || o.vin || o.placa;

      if (o.vehiculo && typeof o.vehiculo === "object") {
        vehMarca = vehMarca || o.vehiculo.marca;
        vehLinea = vehLinea || o.vehiculo.linea;
        vehAnio = vehAnio || o.vehiculo.anio;
        vehMotor = vehMotor || o.vehiculo.motor;
        vehVin = vehVin || o.vehiculo.chasis || o.vehiculo.vin || o.vehiculo.placa;
      }

      return {
        id: existingGlobal?.id || `req_order_${o.id}`,
        tallerOrderId: o.id,
        fechaSolicitud: o.fecha || new Date().toISOString(),
        estado: existingGlobal?.estado || "Abierta",
        vehiculo: {
          marca: vehMarca || "N/A",
          linea: vehLinea || "N/A",
          anio: vehAnio || "N/A",
          motor: vehMotor || "N/A",
          vin: vehVin || "N/A"
        },
        trabajoSolicitado: o.trabajo || o.motivoIngreso || "Reparación General",
        repuestosSolicitados: parts.map((p, idx) => ({
          id: `p_${idx}`,
          desc: p.desc || p.name || "Repuesto solicitado",
          qty: parseFloat(p.qty) || 1,
          observacion: p.brand ? `Marca preferida: ${p.brand}` : ""
        })),
        cotizacionesRecibidas: existingGlobal?.cotizacionesRecibidas || []
      };
    })
    .filter(Boolean);

  // Combine with standalone cotizacionesRepuestos if any
  const allRequestsMap = new Map();
  requestsFromOrders.forEach(r => allRequestsMap.set(String(r.id), r));
  (cotizacionesRepuestos || []).forEach(c => {
    if (c && c.id) {
      const existing = allRequestsMap.get(String(c.id));
      allRequestsMap.set(String(c.id), { ...existing, ...c });
    }
  });

  const allRequests = Array.from(allRequestsMap.values());

  // Filter requests
  const filteredRequests = allRequests.filter(r => {
    const query = searchQuery.toLowerCase().trim();
    const hasMyQuote = r.cotizacionesRecibidas.some(c => c.vendedorUser === usuarioActual?.user);

    if (activeSubTab === "pendientes" && hasMyQuote) return false;
    if (activeSubTab === "misCotizaciones" && !hasMyQuote) return false;

    if (!query) return true;

    return (
      (r.vehiculo.marca && r.vehiculo.marca.toLowerCase().includes(query)) ||
      (r.vehiculo.linea && r.vehiculo.linea.toLowerCase().includes(query)) ||
      (r.vehiculo.vin && r.vehiculo.vin.toLowerCase().includes(query)) ||
      (r.vehiculo.motor && r.vehiculo.motor.toLowerCase().includes(query)) ||
      r.repuestosSolicitados.some(p => p.desc.toLowerCase().includes(query))
    );
  });

  const handleOpenRequest = (req) => {
    setSelectedRequest(req);
    // Pre-fill vendor form state
    const initialFormState = {};
    req.repuestosSolicitados.forEach(p => {
      initialFormState[p.id] = {
        repuestoId: p.id,
        repuestoDesc: p.desc,
        qty: p.qty,
        disponible: true,
        marcaRepuesto: "",
        precio: "",
        fotos: [],
        notas: ""
      };
    });
    setQuoteItems(initialFormState);
  };

  // Image Upload Handler
  const handleImageUpload = (partId, event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setQuoteItems(prev => {
          const current = prev[partId] || {};
          const currentFotos = current.fotos || [];
          return {
            ...prev,
            [partId]: {
              ...current,
              fotos: [...currentFotos, reader.result]
            }
          };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (partId, imgIdx) => {
    setQuoteItems(prev => {
      const current = prev[partId] || {};
      const currentFotos = current.fotos || [];
      return {
        ...prev,
        [partId]: {
          ...current,
          fotos: currentFotos.filter((_, idx) => idx !== imgIdx)
        }
      };
    });
  };

  // Submit quote handler
  const handleSubmitQuote = (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setIsSubmitting(true);

    const ofertasSubmitted = Object.values(quoteItems).map(item => ({
      ...item,
      precio: parseFloat(item.precio) || 0
    }));

    const totalCotizado = ofertasSubmitted.reduce((sum, item) => sum + (item.disponible ? (item.precio * item.qty) : 0), 0);

    const newQuoteEntry = {
      id: `cot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      vendedorUser: usuarioActual?.user || "vendedor",
      vendedorNombre: vendedorNombre.trim() || usuarioActual?.user || "Vendedor",
      fechaCotizacion: new Date().toISOString(),
      ofertas: ofertasSubmitted,
      totalCotizado,
      notasGenerales
    };

    setCotizacionesRepuestos(prev => {
      const existingReq = (prev || []).find(r => String(r.id) === String(selectedRequest.id));
      if (existingReq) {
        return prev.map(r => String(r.id) === String(selectedRequest.id) ? {
          ...r,
          cotizacionesRecibidas: [...(r.cotizacionesRecibidas || []), newQuoteEntry]
        } : r);
      } else {
        return [
          ...(prev || []),
          {
            ...selectedRequest,
            cotizacionesRecibidas: [newQuoteEntry]
          }
        ];
      }
    });

    setIsSubmitting(false);
    alert("¡Tu cotización ha sido enviada con éxito al taller!");
    setSelectedRequest(null);
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header Banner */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Portal de Cotizaciones para Vendedores</h1>
          <p style={styles.subtitle}>
            Ofrece tus repuestos y cotiza precios directamente a las órdenes en proceso del taller.
          </p>
        </div>

        <div style={styles.subTabsContainer}>
          <button
            type="button"
            style={{
              ...styles.subTabBtn,
              ...(activeSubTab === "pendientes" ? styles.subTabBtnActive : {})
            }}
            onClick={() => setActiveSubTab("pendientes")}
          >
            <Clock size={16} /> Solicitudes Pendientes ({allRequests.filter(r => !r.cotizacionesRecibidas.some(c => c.vendedorUser === usuarioActual?.user)).length})
          </button>

          <button
            type="button"
            style={{
              ...styles.subTabBtn,
              ...(activeSubTab === "misCotizaciones" ? styles.subTabBtnActive : {})
            }}
            onClick={() => setActiveSubTab("misCotizaciones")}
          >
            <CheckCircle2 size={16} /> Mis Cotizaciones Enviadas ({allRequests.filter(r => r.cotizacionesRecibidas.some(c => c.vendedorUser === usuarioActual?.user)).length})
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={styles.mainGrid}>
        
        {/* Left Side: Requests List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Search Box */}
          <div className="glass-panel" style={styles.searchCard}>
            <div style={styles.searchWrapper}>
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Buscar por Marca, Línea, Motor, VIN o Repuesto..."
                style={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Cards List */}
          {filteredRequests.length === 0 ? (
            <div className="glass-panel" style={styles.emptyCard}>
              <ShoppingBag size={48} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: "12px" }} />
              <h3>No hay solicitudes registradas</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {activeSubTab === "pendientes" 
                  ? "Actualmente no hay solicitudes pendientes de repuestos para cotizar." 
                  : "Aún no has enviado cotizaciones."}
              </p>
            </div>
          ) : (
            filteredRequests.map(req => {
              const isSelected = selectedRequest?.id === req.id;
              const myQuote = req.cotizacionesRecibidas.find(c => c.vendedorUser === usuarioActual?.user);

              return (
                <div
                  key={req.id}
                  className="glass-panel"
                  style={{
                    ...styles.requestCard,
                    ...(isSelected ? styles.requestCardActive : {})
                  }}
                  onClick={() => handleOpenRequest(req)}
                >
                  <div style={styles.cardHeader}>
                    <div style={styles.vehicleBadgeWrapper}>
                      <span className="badge badge-paid" style={{ backgroundColor: "rgba(99, 102, 241, 0.15)", color: "var(--color-primary)", borderColor: "rgba(99, 102, 241, 0.4)" }}>
                        🚗 {req.vehiculo.marca} {req.vehiculo.linea} ({req.vehiculo.anio})
                      </span>
                      {myQuote && (
                        <span className="badge badge-paid" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "var(--color-success)", borderColor: "rgba(16, 185, 129, 0.4)" }}>
                          ✓ Cotizado (Q{myQuote.totalCotizado.toFixed(2)})
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      📅 {new Date(req.fechaSolicitud).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Vehicle Specs Grid */}
                  <div style={styles.specsGrid}>
                    <div style={styles.specItem}>
                      <span style={styles.specLabel}>VIN / Chasis:</span>
                      <strong style={{ color: "var(--color-secondary)", fontSize: "0.85rem" }}>{req.vehiculo.vin}</strong>
                    </div>
                    <div style={styles.specItem}>
                      <span style={styles.specLabel}>Motor:</span>
                      <strong style={{ color: "#fff", fontSize: "0.85rem" }}>{req.vehiculo.motor}</strong>
                    </div>
                  </div>

                  {/* Parts Needed List Preview */}
                  <div style={styles.partsPreviewList}>
                    <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                      📦 Repuestos requeridos ({req.repuestosSolicitados.length}):
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {req.repuestosSolicitados.map((p, idx) => (
                        <span key={idx} style={styles.partChip}>
                          {p.desc} (x{p.qty})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: "12px", textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: "6px 14px", fontSize: "0.8rem", fontWeight: "800" }}
                    >
                      {myQuote ? "✏️ Ver / Editar Mi Cotización" : "📝 Cotizar Repuestos"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Form / Detail View */}
        <div>
          {selectedRequest ? (
            <div className="glass-panel" style={styles.detailCard}>
              <div style={styles.detailHeader}>
                <div>
                  <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#fff", margin: 0 }}>
                    Formulario de Cotización
                  </h2>
                  <p style={{ fontSize: "0.85rem", color: "var(--color-primary)", margin: "4px 0 0 0", fontWeight: "600" }}>
                    {selectedRequest.vehiculo.marca} {selectedRequest.vehiculo.linea} ({selectedRequest.vehiculo.anio})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Technical Vehicle Card (Restricted View) */}
              <div style={styles.vehicleTechnicalBanner}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "var(--color-secondary)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Car size={16} /> Ficha Técnica del Vehículo
                </h4>
                <div style={styles.technicalSpecsRow}>
                  <div><span>Marca:</span> <strong>{selectedRequest.vehiculo.marca}</strong></div>
                  <div><span>Línea:</span> <strong>{selectedRequest.vehiculo.linea}</strong></div>
                  <div><span>Modelo (Año):</span> <strong>{selectedRequest.vehiculo.anio}</strong></div>
                  <div><span>Motor:</span> <strong>{selectedRequest.vehiculo.motor}</strong></div>
                  <div><span>Número VIN:</span> <strong style={{ color: "var(--color-secondary)" }}>{selectedRequest.vehiculo.vin}</strong></div>
                </div>
              </div>

              {/* Vendor Form */}
              <form onSubmit={handleSubmitQuote}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Nombre del Vendedor / Empresa:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={vendedorNombre}
                    onChange={(e) => setVendedorNombre(e.target.value)}
                    required
                    placeholder="Ej. Repuestos Guate / Carlos Pérez"
                  />
                </div>

                <h4 style={{ fontSize: "0.95rem", fontWeight: "800", color: "#fff", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "8px" }}>
                  Cotizar Repuestos Solicitados
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
                  {selectedRequest.repuestosSolicitados.map(part => {
                    const itemState = quoteItems[part.id] || { disponible: true, marcaRepuesto: "", precio: "", fotos: [], notas: "" };

                    return (
                      <div key={part.id} style={styles.partQuoteBox}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <div>
                            <strong style={{ fontSize: "0.95rem", color: "#fff" }}>📦 {part.desc}</strong>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "8px" }}>
                              (Cantidad requerida: {part.qty})
                            </span>
                          </div>

                          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", cursor: "pointer", color: itemState.disponible ? "var(--color-success)" : "var(--color-danger)" }}>
                            <input
                              type="checkbox"
                              checked={itemState.disponible}
                              onChange={(e) => {
                                setQuoteItems(prev => ({
                                  ...prev,
                                  [part.id]: { ...itemState, disponible: e.target.checked }
                                }));
                              }}
                            />
                            {itemState.disponible ? "Disponible" : "No tengo este repuesto"}
                          </label>
                        </div>

                        {itemState.disponible && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                              <div>
                                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                                  Marca / Calidad (Ej. Original, OEM, WIX):
                                </label>
                                <input
                                  type="text"
                                  className="input-field"
                                  style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                                  placeholder="Ej. Bosch / Original Toyota"
                                  value={itemState.marcaRepuesto || ""}
                                  onChange={(e) => {
                                    setQuoteItems(prev => ({
                                      ...prev,
                                      [part.id]: { ...itemState, marcaRepuesto: e.target.value }
                                    }));
                                  }}
                                  required={itemState.disponible}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                                  Precio Unitario (Q):
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  className="input-field"
                                  style={{ padding: "6px 10px", fontSize: "0.82rem", textAlign: "right", color: "var(--color-success)", fontWeight: "700" }}
                                  placeholder="0.00"
                                  value={itemState.precio || ""}
                                  onChange={(e) => {
                                    setQuoteItems(prev => ({
                                      ...prev,
                                      [part.id]: { ...itemState, precio: e.target.value }
                                    }));
                                  }}
                                  required={itemState.disponible}
                                />
                              </div>
                            </div>

                            {/* Photo Upload for this Part */}
                            <div>
                              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                                📸 Fotografías del Repuesto (Opcional):
                              </label>
                              
                              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                                {(itemState.fotos || []).map((img, imgIdx) => (
                                  <div key={imgIdx} style={{ position: "relative", width: "60px", height: "60px" }}>
                                    <img
                                      src={img}
                                      alt="Foto repuesto"
                                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.15)" }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeImage(part.id, imgIdx)}
                                      style={{
                                        position: "absolute",
                                        top: "-6px",
                                        right: "-6px",
                                        backgroundColor: "#ef4444",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "50%",
                                        width: "18px",
                                        height: "18px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer"
                                      }}
                                    >
                                      &times;
                                    </button>
                                  </div>
                                ))}

                                <label style={styles.uploadPhotoBtn}>
                                  <Upload size={16} /> Subir Foto
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    style={{ display: "none" }}
                                    onChange={(e) => handleImageUpload(part.id, e)}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Notas Adicionales / Garantía / Tiempo de Entrega:
                  </label>
                  <textarea
                    className="input-field"
                    rows="2"
                    placeholder="Ej. Entrega en 2 horas, garantía de 6 meses contra defecto de fábrica."
                    value={notasGenerales}
                    onChange={(e) => setNotasGenerales(e.target.value)}
                  />
                </div>

                {/* Total Summary Bar */}
                <div style={styles.totalSummaryBar}>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Total Oferta Cotizada:</span>
                    <strong style={{ fontSize: "1.4rem", color: "var(--color-success)" }}>
                      {formatMoney(Object.values(quoteItems).reduce((sum, item) => sum + (item.disponible ? ((parseFloat(item.precio) || 0) * (item.qty || 1)) : 0), 0))}
                    </strong>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedRequest(null)}
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                      style={{ backgroundColor: "var(--color-success)", borderColor: "var(--color-success)", fontWeight: "800", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <Send size={16} /> Enviar Cotización al Taller
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="glass-panel" style={styles.emptyDetailCard}>
              <ShoppingBag size={54} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: "16px" }} />
              <h3>Selecciona una Solicitud de la Lista</h3>
              <p>Haz clic en cualquier vehículo de la izquierda para ingresar precios, fotos y enviar tu cotización al taller.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    width: "100%",
    overflowY: "auto",
    height: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    textAlign: "left",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "800",
    marginBottom: "4px",
    background: "linear-gradient(135deg, #fff 60%, var(--color-primary) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "0.88rem",
    color: "var(--text-muted)",
    margin: 0
  },
  subTabsContainer: {
    display: "flex",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: "4px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  subTabBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    fontSize: "0.85rem",
    fontWeight: "700",
    color: "var(--text-muted)",
    background: "none",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  subTabBtnActive: {
    backgroundColor: "var(--color-primary)",
    color: "#fff",
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.3fr",
    gap: "24px",
    alignItems: "start",
  },
  searchCard: {
    padding: "12px 16px",
    borderRadius: "12px",
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  searchInput: {
    width: "100%",
    background: "none",
    border: "none",
    outline: "none",
    color: "#fff",
    fontSize: "0.88rem",
  },
  emptyCard: {
    padding: "50px 20px",
    textAlign: "center",
    borderRadius: "14px",
    color: "var(--text-muted)"
  },
  emptyDetailCard: {
    padding: "60px 30px",
    textAlign: "center",
    borderRadius: "16px",
    color: "var(--text-muted)"
  },
  requestCard: {
    padding: "18px",
    borderRadius: "14px",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
    border: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  requestCardActive: {
    borderColor: "var(--color-primary)",
    backgroundColor: "rgba(99, 102, 241, 0.08)"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vehicleBadgeWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap"
  },
  specsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: "10px 12px",
    borderRadius: "8px"
  },
  specItem: {
    display: "flex",
    flexDirection: "column",
    gap: "2px"
  },
  specLabel: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    textTransform: "uppercase"
  },
  partsPreviewList: {
    marginTop: "4px"
  },
  partChip: {
    backgroundColor: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px",
    padding: "3px 8px",
    fontSize: "0.76rem",
    color: "#fff"
  },
  detailCard: {
    padding: "24px",
    borderRadius: "16px",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    paddingBottom: "12px"
  },
  vehicleTechnicalBanner: {
    backgroundColor: "rgba(245, 158, 11, 0.06)",
    border: "1px solid rgba(245, 158, 11, 0.25)",
    borderRadius: "10px",
    padding: "14px"
  },
  technicalSpecsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
    gap: "10px",
    fontSize: "0.8rem"
  },
  partQuoteBox: {
    backgroundColor: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "10px",
    padding: "14px"
  },
  uploadPhotoBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    color: "var(--color-primary)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "0.78rem",
    fontWeight: "700",
    cursor: "pointer"
  },
  totalSummaryBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    paddingTop: "16px",
    marginTop: "10px"
  }
};
