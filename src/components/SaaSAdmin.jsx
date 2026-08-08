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
import { getLocalStorage, setLocalStorage } from "../utils/storage";
import { syncKeyToCloud, getSupabaseClient, withTimeout } from "../utils/supabase";

export default function SaaSAdmin({ activeTenantId, onSwitchTenant }) {
  const [workshops, setWorkshops] = useState(() => {
    const saved = getLocalStorage("saas_workshops", null);
    if (Array.isArray(saved) && saved.length > 0) return saved;
    return [
      {
        id: "lospits",
        nombre: "Los Pits Auto Center (Matriz)",
        codigo: "lospits",
        adminUser: "admin",
        pass: "1234",
        plan: "Premium PRO",
        estado: "activo",
        fechaRegistro: "2026-01-01",
        contactoNombre: "Alan Estrada",
        telefono: "5544-3322"
      }
    ];
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Workshop Form State
  const [newNombre, setNewNombre] = useState("");
  const [newCodigo, setNewCodigo] = useState("");
  const [newAdminUser, setNewAdminUser] = useState("admin");
  const [newPass, setNewPass] = useState("1234");
  const [newPlan, setNewPlan] = useState("Premium PRO");
  const [newContactoNombre, setNewContactoNombre] = useState("");
  const [newTelefono, setNewTelefono] = useState("");

  // Persist SaaS Workshops
  useEffect(() => {
    setLocalStorage("saas_workshops", workshops);
    syncKeyToCloud("saas_workshops", workshops);
  }, [workshops]);

  // Pull latest workshops from Cloud on mount
  useEffect(() => {
    const pullWorkshops = async () => {
      const client = getSupabaseClient();
      if (!client) return;
      try {
        const queryPromise = client.from("app_data").select("value").eq("key", "saas_workshops").maybeSingle();
        const { data } = await withTimeout(queryPromise, 6000, "Timeout cargando talleres SaaS");
        if (data && Array.isArray(data.value) && data.value.length > 0) {
          setWorkshops(data.value);
        }
      } catch (e) {
        console.warn("[SaaSAdmin] Error cargando talleres desde la nube:", e);
      }
    };
    pullWorkshops();
  }, []);

  const handleAddWorkshop = (e) => {
    e.preventDefault();
    const cleanCode = newCodigo.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
    if (!cleanCode) {
      alert("Por favor ingresa un código válido (letras, números y guiones).");
      return;
    }

    if (workshops.some(w => w.codigo.toLowerCase() === cleanCode)) {
      alert(`El código de taller "${cleanCode}" ya está registrado.`);
      return;
    }

    const newWorkshop = {
      id: cleanCode,
      nombre: newNombre.trim() || `Taller ${cleanCode.toUpperCase()}`,
      codigo: cleanCode,
      adminUser: newAdminUser.trim() || "admin",
      pass: newPass.trim() || "1234",
      plan: newPlan,
      estado: "activo",
      fechaRegistro: new Date().toISOString().split("T")[0],
      contactoNombre: newContactoNombre.trim(),
      telefono: newTelefono.trim()
    };

    // Initialize default admin user for the new tenant
    const defaultUserObj = [
      {
        user: newWorkshop.adminUser,
        pass: newWorkshop.pass,
        rol: "admin",
        permissions: ["dashboard", "taller", "carwash", "parqueo", "bodega", "cafeteria", "finanzas", "repuestosFaltantes", "configuracion", "historial", "tienda", "cuentas", "vehiculosVenta", "clientesVehiculos", "compras", "accesorios"],
        nombreCompleto: newWorkshop.contactoNombre || "Administrador Taller"
      }
    ];

    // Persist default admin user for this new tenant
    setLocalStorage(`${cleanCode}_usuarios`, defaultUserObj);
    syncKeyToCloud(`${cleanCode}_usuarios`, defaultUserObj);

    setWorkshops([newWorkshop, ...workshops]);
    setShowAddModal(false);

    // Reset Form
    setNewNombre("");
    setNewCodigo("");
    setNewAdminUser("admin");
    setNewPass("1234");
    setNewContactoNombre("");
    setNewTelefono("");

    alert(`¡Taller "${newWorkshop.nombre}" registrado con éxito!\n\nCódigo de Taller: ${cleanCode}\nUsuario: ${newWorkshop.adminUser}\nContraseña: ${newWorkshop.pass}`);
  };

  const toggleEstadoTaller = (wId) => {
    setWorkshops(prev => prev.map(w => {
      if (w.id === wId) {
        const nextState = w.estado === "activo" ? "suspendido" : "activo";
        return { ...w, estado: nextState };
      }
      return w;
    }));
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
            {filteredWorkshops.map((w) => {
              const isCurrent = activeTenantId === w.codigo;
              return (
                <tr key={w.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: "700", color: "#fff" }}>{w.nombre}</div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Reg: {w.fechaRegistro}</span>
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
                      onClick={() => toggleEstadoTaller(w.id)}
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
                  <label style={styles.label}>Contraseña Inicial *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                  />
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
                  <option value="Premium PRO">Premium PRO (Completo)</option>
                  <option value="Standard Taller">Standard Taller</option>
                  <option value="Basic Carwash">Basic Carwash</option>
                  <option value="Demo 15 Días">Prueba Demo (15 Días)</option>
                </select>
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
                >
                  Registrar Taller Cliente
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
