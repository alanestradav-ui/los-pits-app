import React, { useState } from "react";
import { Wrench, Shield, Lock, User, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { loginRemoto } from "../utils/supabase";
import { setLocalStorage } from "../utils/storage";

// Mensajes en español para los códigos que devuelve el servidor
const MENSAJES_ERROR = {
  DATOS_INCOMPLETOS: "Por favor ingresa el código de taller, usuario y contraseña.",
  CREDENCIALES_INVALIDAS: "Usuario, contraseña o código de taller incorrectos.",
  DEMASIADOS_INTENTOS: "Demasiados intentos fallidos. Por seguridad, espera 15 minutos e inténtalo de nuevo.",
  TALLER_SUSPENDIDO: "El acceso de este taller está suspendido. Comunícate con soporte de Los Pits App.",
  SIN_CONEXION: "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo."
};

export default function Login({ onLogin, activeTenantId = "lospits" }) {
  const [tenantCode, setTenantCode] = useState(activeTenantId || "lospits");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cargando) return;
    const cleanTenant = (tenantCode || "").toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
    if (!cleanTenant || !user.trim() || !pass.trim()) {
      setError(MENSAJES_ERROR.DATOS_INCOMPLETOS);
      return;
    }

    setCargando(true);
    setError("");
    try {
      // 🔐 La contraseña se valida en el servidor; la app nunca recibe contraseñas
      const res = await loginRemoto(cleanTenant, user.trim(), pass.trim());
      if (!res || !res.ok) {
        setError(MENSAJES_ERROR[res?.error] || MENSAJES_ERROR.CREDENCIALES_INVALIDAS);
        setCargando(false);
        return;
      }

      const usuario = res.usuario || { user: user.trim() };
      if (res.taller !== activeTenantId) {
        // Otro taller: recargar para iniciar la app con los datos de ese taller
        setLocalStorage("current_tenant_id", res.taller);
        setLocalStorage(`${res.taller}_usuarioActual`, usuario);
        window.location.reload();
        return;
      }
      setPass("");
      onLogin(usuario);
    } catch (err) {
      const code = String(err?.message || "");
      setError(MENSAJES_ERROR[code] || (code.includes("Tiempo de espera") || code.includes("fetch")
        ? MENSAJES_ERROR.SIN_CONEXION
        : "No se pudo iniciar sesión. Inténtalo de nuevo en unos segundos."));
      setCargando(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <Wrench size={40} color="#3b82f6" style={styles.logoIcon} />
          </div>
          <h1 style={styles.title}>LOS PITS</h1>
          <p style={styles.subtitle}>SISTEMA DE GESTIÓN INTEGRAL</p>
          <div style={{ ...styles.syncBadge, backgroundColor: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}>
            <Lock size={12} />
            <span>Conexión segura</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form} id="form-inicio-sesion">
          {error && <div style={styles.error} role="alert">{error}</div>}

          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="login-taller">🏢 Código de Taller / Empresa</label>
            <div style={styles.inputWrapper}>
              <Shield size={18} style={styles.inputIcon} />
              <input
                id="login-taller"
                type="text"
                placeholder="Ej: mitaller"
                className="input-field"
                autoCapitalize="none"
                autoCorrect="off"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                style={styles.input}
              />
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Lo recibiste al registrar tu taller.
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="login-usuario">Usuario</label>
            <div style={styles.inputWrapper}>
              <User size={18} style={styles.inputIcon} />
              <input
                id="login-usuario"
                type="text"
                placeholder="Tu usuario"
                className="input-field"
                autoCapitalize="none"
                autoComplete="username"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="login-clave">Contraseña</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                id="login-clave"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                className="input-field"
                autoComplete="current-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                style={{ ...styles.input, paddingRight: "40px" }}
              />
              <button
                type="button"
                id="login-ver-clave"
                onClick={() => setShowPass(!showPass)}
                style={styles.eyeBtn}
                title={showPass ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" id="login-ingresar" className="btn btn-primary" style={styles.submitBtn} disabled={cargando}>
            {cargando ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
            {cargando ? "Verificando..." : "Ingresar al Sistema"}
          </button>
        </form>

        <p style={styles.hint}>
          ¿Olvidaste tu contraseña? Pide al administrador de tu taller que te asigne una nueva desde Configuración.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: "100vh",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "450px",
    padding: "40px 30px",
    animation: "fadeIn 0.5s ease-out",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    marginBottom: "35px",
  },
  logoContainer: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    border: "2px solid rgba(59, 130, 246, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 15px",
    boxShadow: "0 0 20px rgba(59, 130, 246, 0.15)",
  },
  logoIcon: {
    filter: "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))",
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "2.2rem",
    fontWeight: "900",
    letterSpacing: "4px",
    background: "linear-gradient(135deg, #fff 30%, var(--color-primary) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "5px",
  },
  subtitle: {
    fontSize: "0.8rem",
    fontWeight: "600",
    letterSpacing: "3px",
    color: "var(--text-muted)",
  },
  syncBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "20px",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    color: "#3b82f6",
    fontSize: "0.75rem",
    fontWeight: "600",
    marginTop: "12px",
    animation: "fadeIn 0.3s ease-out",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  error: {
    backgroundColor: "var(--color-danger-glow)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "0.9rem",
    fontWeight: "500",
    textAlign: "center",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "var(--text-main)",
    textAlign: "left",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    color: "var(--text-muted)",
  },
  input: {
    paddingLeft: "42px",
  },
  eyeBtn: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px"
  },
  submitBtn: {
    marginTop: "10px",
    width: "100%",
  },
  hint: {
    marginTop: "24px",
    paddingTop: "16px",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textAlign: "center",
  },
};
