import React, { useState } from "react";
import { 
  Gift, 
  Award, 
  Search, 
  PlusCircle, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  User, 
  Phone, 
  Car, 
  Coins, 
  Zap, 
  History, 
  Settings, 
  RefreshCw, 
  Check, 
  X,
  TrendingUp,
  ShieldCheck,
  Building2
} from "lucide-react";

export default function LoyaltyRewards({
  clientes = [],
  puntosRecompensas = [],
  catalogoPremios = [],
  historialCanjes = [],
  onUpdatePuntos,
  onCanjearPremio,
  onUpdateCatalogo,
  usuarioActual
}) {
  const [activeTab, setActiveTab] = useState("clientes"); // "clientes", "catalogo", "historial", "config"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [redeemingPremio, setRedeemingPremio] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastRedeemedTicket, setLastRedeemedTicket] = useState(null);

  // Default Catálogo if empty
  const defaultCatalogo = [
    { id: "p1", nombre: "Lavado Bronce", puntos: 1000, valorEstimado: 80, descripcion: "Lavado completo de carrocería y aspirado interno", categoria: "Carwash" },
    { id: "p2", nombre: "Encerado a Mano", puntos: 1800, valorEstimado: 150, descripcion: "Aplicación de cera protectora de alta calidad a mano", categoria: "Detailing" },
    { id: "p3", nombre: "Lavado de Motor o Chasis", puntos: 2400, valorEstimado: 200, descripcion: "Desengrasado y lavado profundo de motor o chasis", categoria: "Servicios Específicos" },
    { id: "p4", nombre: "Lavado Oro o Eliminación de Sarro", puntos: 4500, valorEstimado: 450, descripcion: "Lavado detallado profundo con eliminación de sarro o paquete Oro", categoria: "Detailing Avanzado" },
    { id: "p5", nombre: "Pulido y Lustrado Completo", puntos: 10000, valorEstimado: 950, descripcion: "Tratamiento completo de pintura, corrección de barniz y sellado", categoria: "Premium Detailing" }
  ];

  const catalogItems = (catalogoPremios && catalogoPremios.length > 0) ? catalogoPremios : defaultCatalogo;

  // Map client points helper
  const getPuntosCliente = (telOrName) => {
    if (!telOrName) return 0;
    const key = String(telOrName).toLowerCase().trim();
    const match = (puntosRecompensas || []).find(p => 
      String(p.telefono || "").toLowerCase().trim() === key ||
      String(p.nombre || "").toLowerCase().trim() === key
    );
    return match ? (parseInt(match.puntos) || 0) : 0;
  };

  // Filter clients list
  const filteredClientes = (clientes || []).filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = String(c.nombre || "").toLowerCase();
    const tel = String(c.telefono || "").toLowerCase();
    const nit = String(c.nit || "").toLowerCase();
    return name.includes(q) || tel.includes(q) || nit.includes(q);
  });

  const handleCanjearConfirm = () => {
    if (!selectedCliente || !redeemingPremio) return;

    const currentPts = getPuntosCliente(selectedCliente.telefono || selectedCliente.nombre);
    if (currentPts < redeemingPremio.puntos) {
      alert(`El cliente no cuenta con suficientes Puntos Pits. Requiere ${redeemingPremio.puntos} pts y tiene ${currentPts} pts.`);
      return;
    }

    const ticket = {
      id: `CANJE-${Date.now()}`,
      clienteNombre: selectedCliente.nombre || "Cliente Pits",
      clienteTelefono: selectedCliente.telefono || "",
      premioId: redeemingPremio.id,
      premioNombre: redeemingPremio.nombre,
      puntosCanjeados: redeemingPremio.puntos,
      valorEstimado: redeemingPremio.valorEstimado,
      fecha: new Date().toISOString(),
      cajero: usuarioActual?.user || "Admin"
    };

    if (onCanjearPremio) {
      onCanjearPremio(ticket);
    }

    setLastRedeemedTicket(ticket);
    setRedeemingPremio(null);
    setIsSuccessModalOpen(true);
  };

  return (
    <div style={{ padding: "20px", color: "#fff", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(249, 115, 22, 0.15) 100%)",
        border: "1px solid rgba(234, 179, 8, 0.3)",
        borderRadius: "16px",
        padding: "24px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            backgroundColor: "rgba(234, 179, 8, 0.2)",
            border: "1px solid rgba(234, 179, 8, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#eab308"
          }}>
            <Gift size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: "800", margin: "0 0 4px 0", color: "#fef08a" }}>
              Recompensas Pits (Fidelización)
            </h1>
            <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.9rem" }}>
              Moneda única <strong>Puntos Pits</strong> para recompensar la lealtad de tus clientes frecuentes
            </p>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div style={{ display: "flex", gap: "8px", backgroundColor: "rgba(15, 23, 42, 0.6)", padding: "4px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            onClick={() => setActiveTab("clientes")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: activeTab === "clientes" ? "#eab308" : "transparent",
              color: activeTab === "clientes" ? "#0f172a" : "#94a3b8",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <User size={16} /> Clientes y Puntos
          </button>

          <button
            onClick={() => setActiveTab("catalogo")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: activeTab === "catalogo" ? "#eab308" : "transparent",
              color: activeTab === "catalogo" ? "#0f172a" : "#94a3b8",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <Award size={16} /> Catálogo de Premios
          </button>

          <button
            onClick={() => setActiveTab("historial")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: activeTab === "historial" ? "#eab308" : "transparent",
              color: activeTab === "historial" ? "#0f172a" : "#94a3b8",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <History size={16} /> Historial de Canjes
          </button>

          <button
            onClick={() => setActiveTab("config")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: activeTab === "config" ? "#eab308" : "transparent",
              color: activeTab === "config" ? "#0f172a" : "#94a3b8",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <Settings size={16} /> Reglas del Programa
          </button>
        </div>
      </div>

      {/* TAB 1: CLIENTES Y PUNTOS */}
      {activeTab === "clientes" && (
        <div style={{ display: "grid", gridTemplateColumns: selectedCliente ? "1fr 400px" : "1fr", gap: "20px" }}>
          {/* Main Client Search & Cards */}
          <div>
            {/* Search Input */}
            <div style={{ position: "relative", marginBottom: "20px" }}>
              <Search size={20} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              <input
                type="text"
                placeholder="Buscar cliente por Nombre, Teléfono o NIT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 14px 14px 44px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  color: "#fff",
                  fontSize: "0.95rem",
                  outline: "none"
                }}
              />
            </div>

            {/* Client Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
              {filteredClientes.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", backgroundColor: "rgba(15, 23, 42, 0.4)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.1)", color: "#94a3b8" }}>
                  <User size={40} style={{ marginBottom: "10px", opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No se encontraron clientes registrados con ese criterio de búsqueda.</p>
                </div>
              ) : (
                filteredClientes.map((c, idx) => {
                  const pts = getPuntosCliente(c.telefono || c.nombre);
                  const isSelected = selectedCliente?.telefono === c.telefono && selectedCliente?.nombre === c.nombre;

                  return (
                    <div
                      key={c.telefono || c.nombre || idx}
                      onClick={() => setSelectedCliente(c)}
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        backgroundColor: isSelected ? "rgba(234, 179, 8, 0.12)" : "rgba(30, 41, 59, 0.6)",
                        border: isSelected ? "2px solid #eab308" : "1px solid rgba(255, 255, 255, 0.08)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        position: "relative"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <div>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", fontWeight: "700", color: "#f8fafc" }}>
                            {c.nombre || "Cliente Pits"}
                          </h4>
                          <div style={{ fontSize: "0.8rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Phone size={12} /> {c.telefono || "Sin Teléfono"}
                          </div>
                        </div>

                        {/* Badge Points */}
                        <div style={{
                          backgroundColor: pts >= 1000 ? "rgba(234, 179, 8, 0.2)" : "rgba(100, 116, 139, 0.2)",
                          border: `1px solid ${pts >= 1000 ? "rgba(234, 179, 8, 0.4)" : "rgba(100, 116, 139, 0.3)"}`,
                          padding: "6px 10px",
                          borderRadius: "8px",
                          textAlign: "right"
                        }}>
                          <div style={{ fontSize: "1.1rem", fontWeight: "800", color: pts >= 1000 ? "#fef08a" : "#cbd5e1" }}>
                            {pts.toLocaleString()}
                          </div>
                          <div style={{ fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", color: pts >= 1000 ? "#eab308" : "#94a3b8" }}>
                            Puntos Pits
                          </div>
                        </div>
                      </div>

                      {pts >= 1000 && (
                        <div style={{ fontSize: "0.75rem", color: "#4ade80", backgroundColor: "rgba(74, 222, 128, 0.1)", padding: "4px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Sparkles size={12} /> ¡Califica para canje inmediato!
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Client Detail Panel & Canje Actions */}
          {selectedCliente && (
            <div style={{
              backgroundColor: "rgba(30, 41, 59, 0.8)",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              padding: "20px",
              alignSelf: "start"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fef08a", display: "flex", alignItems: "center", gap: "8px" }}>
                  <User size={18} /> Detalle del Cliente
                </h3>
                <button
                  onClick={() => setSelectedCliente(null)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", padding: "14px", borderRadius: "10px", marginBottom: "16px" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#fff", marginBottom: "4px" }}>
                  {selectedCliente.nombre}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "8px" }}>
                  📞 {selectedCliente.telefono} | NIT: {selectedCliente.nit || "C/F"}
                </div>
                <div style={{
                  padding: "10px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(234, 179, 8, 0.15)",
                  border: "1px solid rgba(234, 179, 8, 0.3)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#cbd5e1" }}>Saldo Disponible:</span>
                  <span style={{ fontSize: "1.3rem", fontWeight: "900", color: "#fef08a" }}>
                    {getPuntosCliente(selectedCliente.telefono || selectedCliente.nombre).toLocaleString()} Pts
                  </span>
                </div>
              </div>

              <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", color: "#cbd5e1" }}>
                Premios Disponibles para Canje:
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {catalogItems.map(item => {
                  const currentPts = getPuntosCliente(selectedCliente.telefono || selectedCliente.nombre);
                  const canAfford = currentPts >= item.puntos;

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        backgroundColor: canAfford ? "rgba(34, 197, 94, 0.1)" : "rgba(15, 23, 42, 0.4)",
                        border: `1px solid ${canAfford ? "rgba(34, 197, 94, 0.3)" : "rgba(255, 255, 255, 0.05)"}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "0.9rem", color: canAfford ? "#f8fafc" : "#94a3b8" }}>
                          {item.nombre}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: canAfford ? "#4ade80" : "#64748b" }}>
                          {item.puntos.toLocaleString()} Pts (Valor: Q{item.valorEstimado})
                        </div>
                      </div>

                      <button
                        disabled={!canAfford}
                        onClick={() => setRedeemingPremio(item)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "none",
                          backgroundColor: canAfford ? "#22c55e" : "rgba(100, 116, 139, 0.2)",
                          color: canAfford ? "#fff" : "#64748b",
                          fontWeight: "700",
                          fontSize: "0.75rem",
                          cursor: canAfford ? "pointer" : "not-allowed"
                        }}
                      >
                        Canjear
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CATÁLOGO DE PREMIOS */}
      {activeTab === "catalogo" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {catalogItems.map((item, idx) => (
            <div
              key={item.id || idx}
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(234, 179, 8, 0.25)",
                borderRadius: "16px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden"
              }}
            >
              <div style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                backgroundColor: "rgba(234, 179, 8, 0.15)",
                border: "1px solid rgba(234, 179, 8, 0.3)",
                color: "#fef08a",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "700"
              }}>
                Q{item.valorEstimado} Valor
              </div>

              <div>
                <div style={{ color: "#eab308", marginBottom: "8px" }}>
                  <Award size={28} />
                </div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "1.2rem", fontWeight: "800", color: "#f8fafc" }}>
                  {item.nombre}
                </h3>
                <p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.4" }}>
                  {item.descripcion}
                </p>
              </div>

              <div style={{
                padding: "12px",
                borderRadius: "10px",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>Puntos Requeridos:</span>
                <span style={{ fontSize: "1.2rem", fontWeight: "900", color: "#fef08a" }}>
                  {item.puntos.toLocaleString()} Pts
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: HISTORIAL DE CANJES */}
      {activeTab === "historial" && (
        <div style={{ backgroundColor: "rgba(30, 41, 59, 0.6)", borderRadius: "16px", padding: "20px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "#fef08a", display: "flex", alignItems: "center", gap: "8px" }}>
            <History size={20} /> Historial de Recompensas Canjeadas
          </h3>

          {(!historialCanjes || historialCanjes.length === 0) ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
              <Clock size={40} style={{ marginBottom: "10px", opacity: 0.5 }} />
              <p style={{ margin: 0 }}>Aún no se han registrado canjes de premios en el sistema.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
                    <th style={{ padding: "10px" }}>Ticket ID</th>
                    <th style={{ padding: "10px" }}>Fecha</th>
                    <th style={{ padding: "10px" }}>Cliente</th>
                    <th style={{ padding: "10px" }}>Premio Canjeado</th>
                    <th style={{ padding: "10px" }}>Puntos Descontados</th>
                    <th style={{ padding: "10px" }}>Atendido por</th>
                  </tr>
                </thead>
                <tbody>
                  {historialCanjes.map((h, idx) => (
                    <tr key={h.id || idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px", fontWeight: "700", color: "#60a5fa" }}>{h.id}</td>
                      <td style={{ padding: "10px", color: "#cbd5e1" }}>{new Date(h.fecha).toLocaleDateString()} {new Date(h.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ padding: "10px", fontWeight: "600" }}>{h.clienteNombre}</td>
                      <td style={{ padding: "10px", color: "#fef08a", fontWeight: "700" }}>{h.premioNombre}</td>
                      <td style={{ padding: "10px", color: "#ef4444", fontWeight: "800" }}>-{h.puntosCanjeados.toLocaleString()} Pts</td>
                      <td style={{ padding: "10px", color: "#94a3b8" }}>{h.cajero}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REGLAS DEL PROGRAMA */}
      {activeTab === "config" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          <div style={{ backgroundColor: "rgba(30, 41, 59, 0.7)", borderRadius: "16px", padding: "20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ margin: "0 0 14px 0", color: "#fef08a", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <Zap size={20} /> Fórmulas de Acumulación
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ padding: "12px", backgroundColor: "rgba(15, 23, 42, 0.6)", borderRadius: "10px", borderLeft: "4px solid #22c55e" }}>
                <div style={{ fontWeight: "700", color: "#4ade80", fontSize: "0.95rem" }}>Carwash, Detailing y Cafetería</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "#fff", marginTop: "4px" }}>Q1.00 gastado = 1 Punto Pits</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>Acumulación directa sobre el total cobrado al cliente.</div>
              </div>

              <div style={{ padding: "12px", backgroundColor: "rgba(15, 23, 42, 0.6)", borderRadius: "10px", borderLeft: "4px solid #3b82f6" }}>
                <div style={{ fontWeight: "700", color: "#60a5fa", fontSize: "0.95rem" }}>Taller Automotriz (Protección de Margen)</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "#fff", marginTop: "4px" }}>Q4.00 en Mano de Obra = 1 Punto Pits</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>Calculado exclusivamente sobre la Mano de Obra (excluye repuestos). Tope máximo: 1,500 pts por factura.</div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: "rgba(30, 41, 59, 0.7)", borderRadius: "16px", padding: "20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ margin: "0 0 14px 0", color: "#ef4444", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={20} /> Caducidad y Pasivos Financieros
            </h3>

            <div style={{ padding: "14px", backgroundColor: "rgba(15, 23, 42, 0.6)", borderRadius: "10px" }}>
              <div style={{ fontWeight: "700", color: "#fca5a5", fontSize: "0.95rem", marginBottom: "6px" }}>
                Vencimiento a los 6 Meses (180 Días)
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.5" }}>
                Para evitar pasivos financieros y deudas flotantes de servicios no cobrados, los Puntos Pits vencerán automáticamente si transcurren más de 6 meses sin que el cliente registre una sola visita en Los Pits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR REDEMPTION */}
      {redeemingPremio && selectedCliente && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div style={{
            backgroundColor: "#0f172a",
            border: "1px solid rgba(234, 179, 8, 0.4)",
            borderRadius: "16px",
            padding: "24px",
            maxWidth: "440px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
          }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#fef08a", fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <Gift size={22} /> Confirmar Canje de Recompensa
            </h3>

            <p style={{ margin: "0 0 16px 0", fontSize: "0.9rem", color: "#cbd5e1", lineHeight: "1.4" }}>
              ¿Deseas canjear el premio <strong>{redeemingPremio.nombre}</strong> para el cliente <strong>{selectedCliente.nombre}</strong>?
            </p>

            <div style={{ backgroundColor: "rgba(30, 41, 59, 0.7)", padding: "12px", borderRadius: "10px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "4px" }}>
                <span>Puntos Requeridos:</span>
                <span style={{ fontWeight: "700", color: "#ef4444" }}>-{redeemingPremio.puntos.toLocaleString()} Pts</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#94a3b8" }}>
                <span>Saldo Restante del Cliente:</span>
                <span style={{ fontWeight: "700", color: "#4ade80" }}>
                  {(getPuntosCliente(selectedCliente.telefono || selectedCliente.nombre) - redeemingPremio.puntos).toLocaleString()} Pts
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setRedeemingPremio(null)}
                style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "#94a3b8", fontWeight: "600", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCanjearConfirm}
                style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "#22c55e", color: "#fff", fontWeight: "800", cursor: "pointer" }}
              >
                Confirmar y Canjear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL AFTER REDEMPTION */}
      {isSuccessModalOpen && lastRedeemedTicket && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div style={{
            backgroundColor: "#0f172a",
            border: "1px solid #22c55e",
            borderRadius: "16px",
            padding: "24px",
            maxWidth: "420px",
            width: "100%",
            textAlign: "center"
          }}>
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", backgroundColor: "rgba(34, 197, 94, 0.2)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px auto" }}>
              <CheckCircle2 size={30} />
            </div>

            <h3 style={{ margin: "0 0 8px 0", color: "#4ade80", fontSize: "1.3rem" }}>
              ¡Recompensa Canjeada!
            </h3>

            <div style={{ backgroundColor: "rgba(30, 41, 59, 0.7)", padding: "14px", borderRadius: "10px", margin: "16px 0", textAlign: "left", fontSize: "0.85rem", color: "#cbd5e1" }}>
              <div><strong>Ticket:</strong> {lastRedeemedTicket.id}</div>
              <div><strong>Cliente:</strong> {lastRedeemedTicket.clienteNombre}</div>
              <div><strong>Premio:</strong> {lastRedeemedTicket.premioNombre}</div>
              <div><strong>Puntos Descontados:</strong> {lastRedeemedTicket.puntosCanjeados.toLocaleString()} Pts</div>
            </div>

            <button
              onClick={() => setIsSuccessModalOpen(false)}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#22c55e", color: "#fff", fontWeight: "800", cursor: "pointer" }}
            >
              Aceptar y Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
