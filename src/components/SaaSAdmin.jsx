import React, { useState, useEffect } from "react";
import { 
  Building2, 
  PlusCircle, 
  CheckCircle, 
  XCircle, 
  ShieldCheck, 
  ExternalLink, 
  Search, 
  Sparkles,
  KeyRound,
  Users,
  Calendar,
  AlertCircle
} from "lucide-react";
import { callRpc, getSession } from "../utils/supabase";

const MENSAJES_SAAS = {
  CODIGO_INVALIDO: "Código inválido. Usa de 2 a 40 letras minúsculas, números o guiones (sin espacios ni guion bajo).",
  CLAVE_DEBIL: "La contraseña inicial debe tener al menos 8 caracteres.",
  CODIGO_EN_USO: "Ese código ya tiene datos registrados. Elige otro código.",
  SIN_PERMISO: "Solo el administrador de la plataforma puede gestionar talleres.",
  SESION_INVALIDA: "Tu sesión expiró. Vuelve a iniciar sesión."
};
const mensajeSaas = (err) => MENSAJES_SAAS[err?.code || err?.message] || ("No se pudo completar la operación: " + (err?.message || "error desconocido"));

const generarClave = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(12);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, n => chars[n % chars.length]).join("");
};

export default function SaaSAdmin({ activeTenantId, onSwitchTenant }) {
  const [workshops, setWorkshops] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Workshop Form State
  const [newNombre, setNewNombre] = useState("");
  const [newCodigo, setNewCodigo] = useState("");
  const [newAdminUser, setNewAdminUser] = useState("admin");
  const [newPass, setNewPass] = useState(() => generarClave());
  const [newPlan, setNewPlan] = useState("Piloto");
  const [newContactoNombre, setNewContactoNombre] = useState("");
  const [newTelefono, setNewTelefono] = useState("");
  const [newVence, setNewVence] = useState("");

  const token = () => getSession()?.token || "";

  // Cargar talleres desde el servidor
  const cargarTalleres = async () => {
    setCargando(true);
    try {
      const data = await callRpc("saas_talleres", { p_token: token() }, 15000);
      setWorkshops(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("[SaaSAdmin] Error cargando talleres:", e);
      alert(mensajeSaas(e));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTalleres();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddWorkshop = async (e) => {
    e.preventDefault();
    const cleanCode = newCodigo.toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(cleanCode)) {
      alert(MENSAJES_SAAS.CODIGO_INVALIDO);
      return;
    }
    if (workshops.some(w => (w.codigo || "").toLowerCase() === cleanCode)) {
      alert(`El código de taller "${cleanCode}" ya está registrado.`);
      return;
    }
    if (newPass.trim().length < 8) {
      alert(MENSAJES_SAAS.CLAVE_DEBIL);
      return;
    }

    const adminUser = newAdminUser.trim().toLowerCase() || "admin";
    const passInicial = newPass.trim();
    const nombre = newNombre.trim() || `Taller ${cleanCode.toUpperCase()}`;

    setGuardando(true);
    try {
      await callRpc("saas_guardar_taller", {
        p_token: token(),
        p_datos: {
          codigo: cleanCode,
          nombre,
          plan: newPlan,
          adminUser,
          adminPass: passInicial,
          contactoNombre: newContactoNombre.trim(),
          telefono: newTelefono.trim(),
          venceEl: newVence || ""
        }
      }, 20000);

      setShowAddModal(false);
      setNewNombre("");
      setNewCodigo("");
      setNewAdminUser("admin");
      setNewPass(generarClave());
      setNewContactoNombre("");
      setNewTelefono("");
      setNewVence("");
      await cargarTalleres();

      alert(`¡Taller "${nombre}" registrado con éxito!\n\nCódigo de Taller: ${cleanCode}\nUsuario: ${adminUser}\nContraseña: ${passInicial}\n\nAnota estos datos y entrégalos al taller de forma privada. La contraseña no se puede volver a ver.`);
    } catch (err) {
      alert(mensajeSaas(err));
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstadoTaller = async (w) => {
    if (w.codigo === "lospits") {
      alert("El taller principal no se puede suspender.");
      return;
    }
    const nextState = w.estado === "activo" ? "suspendido" : "activo";
    const confirmMsg = nextState === "suspendido"
      ? `¿Suspender el taller "${w.nombre}"? Sus usuarios no podrán entrar hasta que lo actives de nuevo. Sus datos NO se borran.`
      : `¿Activar de nuevo el taller "${w.nombre}"?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await callRpc("saas_guardar_taller", { p_token: token(), p_datos: { codigo: w.codigo, estado: nextState } });
      await cargarTalleres();
    } catch (err) {
      alert(mensajeSaas(err));
    }
  };

  const cambiarVencimiento = async (w) => {
    const actual = w.venceEl || "";
    const nuevo = window.prompt(`Fecha de vencimiento para "${w.nombre}" (AAAA-MM-DD). Déjalo vacío para quitarla:`, actual);
    if (nuevo === null) return;
    const limpio = nuevo.trim();
    if (limpio && !/^\d{4}-\d{2}-\d{2}$/.test(limpio)) {
      alert("Formato inválido. Usa AAAA-MM-DD, por ejemplo 2026-12-31.");
      return;
    }
    try {
      await callRpc("saas_guardar_taller", { p_token: token(), p_datos: { codigo: w.codigo, venceEl: limpio } });
      await cargarTalleres();
    } catch (err) {
      alert(mensajeSaas(err));
    }
  };

  const filteredWorkshops = workshops.filter(w => 
    (w.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.codigo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.contactoNombre || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header */}
      <div style={styles.headerRow}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={styles.headerIconBg}>
              <Sparkles size={24} color="var(--color-primary)" />
            </div>
            <div>
              <h1 style={styles.title}>Panel Maestro SaaS (Comercialización)</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
                Administración central de empresas, licencias y clientes de Los Pits App.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          style={styles.addBtn}
        >
          <PlusCircle size={18} />
          <span>Registrar Nuevo Taller Cliente</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div style={styles.statsGrid}>
        <div className="glass-panel" style={styles.statCard}>
          <Building2 size={26} color="var(--color-primary)" />
          <div>
            <span style={styles.statLabel}>Total Empresas / Talleres</span>
            <span style={styles.statVal}>{workshops.length}</span>
          </div>
        </div>
        <div className="glass-panel" style={styles.statCard}>
          <CheckCircle size={26} color="#10b981" />
          <div>
            <span style={styles.statLabel}>Suscripciones Activas</span>
            <span style={{ ...styles.statVal, color: "#10b981" }}>
              {workshops.filter(w => w.estado === "activo").length}
            </span>
          </div>
        </div>
        <div className="glass-panel" style={styles.statCard}>
          <KeyRound size={26} color="#3b82f6" />
          <div>
            <span style={styles.statLabel}>Taller Actual en Uso</span>
            <span style={{ ...styles.statVal, fontSize: "1.1rem", color: "#60a5fa" }}>
              {activeTenantId || "lospits"}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={styles.searchRow}>
        <div style={styles.searchWrapper}>
          <Search size={18} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Buscar taller por nombre, código o propietario..."
            className="input-field"
            style={{ paddingLeft: "38px", width: "100%" }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Workshop List Table */}
      <div className="glass-panel" style={{ padding: "16px", borderRadius: "12px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", color: "#fff", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left" }}>
              <th style={styles.th}>Empresa / Taller</th>
              <th style={styles.th}>Código Taller (`tenant_id`)</th>
              <th style={styles.th}>Contacto / Propietario</th>
              <th style={styles.th}>Plan SaaS</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Acceso Directo</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={7} style={{ ...styles.td, textAlign: "center", color: "var(--text-muted)" }}>Cargando talleres...</td></tr>
            )}
            {filteredWorkshops.map((w) => {
              const isCurrent = activeTenantId === w.codigo;
              return (
                <tr key={w.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: "700", color: "#fff" }}>{w.nombre}</div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Reg: {w.fechaRegistro} · Usuarios: {w.usuarios ?? "-"}</span>
                    <button
                      type="button"
                      onClick={() => cambiarVencimiento(w)}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.75rem", color: w.venceEl && w.venceEl < new Date().toISOString().slice(0, 10) ? "#f87171" : "#facc15" }}
                      title="Cambiar fecha de vencimiento"
                    >
                      📅 {w.venceEl ? `Vence: ${w.venceEl}` : "Sin vencimiento"}
                    </button>
                  </td>
                  <td style={styles.td}>
                    <code style={styles.codeBadge}>{w.codigo}</code>
                  </td>
                  <td style={styles.td}>
                    <div>{w.contactoNombre || "No registrado"}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{w.telefono || "-"}</div>
                  </td>
                  <td style={styles.td}>
                    <span className="badge" style={{ backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" }}>
                      {w.plan || "PRO"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span className={`badge ${w.estado === "activo" ? "badge-ready" : "badge-process"}`}>
                      {w.estado === "activo" ? "🟢 Activo" : "🔴 Suspendido"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => onSwitchTenant && onSwitchTenant(w.codigo)}
                      className="btn btn-secondary"
                      style={{ padding: "4px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "5px" }}
                      disabled={isCurrent}
                    >
                      <ExternalLink size={14} />
                      <span>{isCurrent ? "En uso" : "Entrar a Taller"}</span>
                    </button>
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => toggleEstadoTaller(w)}
                      disabled={w.codigo === "lospits"}
                      style={{
                        background: "transparent",
                        border: `1px solid ${w.estado === "activo" ? "#ef4444" : "#10b981"}`,
                        color: w.estado === "activo" ? "#ef4444" : "#10b981",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        fontSize: "0.75rem",
                        cursor: "pointer"
                      }}
                    >
                      {w.estado === "activo" ? "Suspender" : "Activar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Registrar Nuevo Taller */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={20} color="var(--color-primary)" />
                Dar de Alta Nuevo Taller Cliente
              </h3>
              <button onClick={() => setShowAddModal(false)} style={styles.closeBtn}>×</button>
            </div>

            <form onSubmit={handleAddWorkshop} style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={styles.label}>Nombre de la Empresa / Taller *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Taller Mecánico El Triunfo"
                  className="input-field"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                />
              </div>

              <div>
                <label style={styles.label}>Código Único de Taller (`tenant_id`) *</label>
                <input
                  type="text"
                  required
                  placeholder="ej: eltriunfo"
                  className="input-field"
                  value={newCodigo}
                  onChange={(e) => setNewCodigo(e.target.value)}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Este código servirá para aislar sus datos y para el inicio de sesión.
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Usuario Admin Inicial *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={newAdminUser}
                    onChange={(e) => setNewAdminUser(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Contraseña Inicial * (mín. 8)</label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="text"
                      required
                      minLength={8}
                      className="input-field"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn-secondary" onClick={() => setNewPass(generarClave())} title="Generar otra contraseña">🎲</button>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Nombre Propietario / Contacto</label>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Mendoza"
                    className="input-field"
                    value={newContactoNombre}
                    onChange={(e) => setNewContactoNombre(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Teléfono Contacto</label>
                  <input
                    type="text"
                    placeholder="Ej. 5566-7788"
                    className="input-field"
                    value={newTelefono}
                    onChange={(e) => setNewTelefono(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={styles.label}>Plan SaaS</label>
                <select
                  className="input-field"
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                >
                  <option value="Piloto">Piloto (Prueba)</option>
                  <option value="Premium PRO">Premium PRO (Completo)</option>
                  <option value="Standard Taller">Standard Taller</option>
                  <option value="Basic Carwash">Basic Carwash</option>
                  <option value="Demo 15 Días">Prueba Demo (15 Días)</option>
                </select>
              </div>

              <div>
                <label style={styles.label}>Fecha de Vencimiento (opcional)</label>
                <input
                  type="date"
                  className="input-field"
                  value={newVence}
                  onChange={(e) => setNewVence(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={guardando}
                >
                  {guardando ? "Registrando..." : "Registrar Taller Cliente"}
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
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto"
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "15px"
  },
  headerIconBg: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "800",
    color: "#fff",
    margin: 0
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    marginBottom: "20px"
  },
  statCard: {
    padding: "16px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "14px"
  },
  statLabel: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    display: "block"
  },
  statVal: {
    fontSize: "1.4rem",
    fontWeight: "800",
    color: "#fff"
  },
  searchRow: {
    marginBottom: "16px"
  },
  searchWrapper: {
    position: "relative",
    maxWidth: "500px"
  },
  th: {
    padding: "12px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    color: "var(--text-muted)",
    fontWeight: "700",
    fontSize: "0.8rem",
    textTransform: "uppercase"
  },
  td: {
    padding: "12px 10px"
  },
  codeBadge: {
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: "4px 8px",
    borderRadius: "6px",
    color: "#60a5fa",
    fontFamily: "monospace",
    fontSize: "0.85rem",
    border: "1px solid rgba(59, 130, 246, 0.2)"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px"
  },
  modalCard: {
    width: "100%",
    maxWidth: "550px",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.8)"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    paddingBottom: "12px"
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "1.5rem",
    cursor: "pointer"
  },
  label: {
    display: "block",
    fontSize: "0.82rem",
    fontWeight: "600",
    color: "var(--text-muted)",
    marginBottom: "6px"
  }
};
