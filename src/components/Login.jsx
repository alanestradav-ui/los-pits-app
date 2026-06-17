import React, { useState } from "react";
import { Wrench, Shield, Lock, User, KeyRound } from "lucide-react";

export default function Login({ usuarios, onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user.trim() || !pass.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }

    const encontrado = usuarios.find(
      (u) => u.user.toLowerCase() === user.toLowerCase().trim() && u.pass === pass
    );

    if (encontrado) {
      setError("");
      onLogin(encontrado);
    } else {
      setError("Usuario o contraseña incorrectos.");
    }
  };

  const fillCredentials = (username) => {
    setUser(username);
    setPass("1234");
    setError("");
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <Wrench size={40} color="#3b82f6" style={styles.logoIcon} />
          </div>
          <h1 style={styles.title}>LOS PITS</h1>
          <p style={styles.subtitle}>SISTEMA DE GESTIÓN INTEGRAL</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Usuario</label>
            <div style={styles.inputWrapper}>
              <User size={18} style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Ej. admin, mecanico..."
                className="input-field"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                placeholder="••••"
                className="input-field"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={styles.submitBtn}>
            <KeyRound size={18} />
            Ingresar al Sistema
          </button>
        </form>

        <div style={styles.demoUsersSection}>
          <h4 style={styles.demoTitle}>Acceso Rápido para Pruebas:</h4>
          <div style={styles.demoButtonsContainer}>
            <button 
              type="button" 
              onClick={() => fillCredentials("admin")} 
              style={{ ...styles.demoBtn, borderColor: "#3b82f6" }}
            >
              🔑 Admin
            </button>
            <button 
              type="button" 
              onClick={() => fillCredentials("cajero")} 
              style={{ ...styles.demoBtn, borderColor: "#06b6d4" }}
            >
              💳 Cajero
            </button>
            <button 
              type="button" 
              onClick={() => fillCredentials("mecanico")} 
              style={{ ...styles.demoBtn, borderColor: "#f59e0b" }}
            >
              🔧 Mecánico
            </button>
            <button 
              type="button" 
              onClick={() => fillCredentials("lavador")} 
              style={{ ...styles.demoBtn, borderColor: "#a855f7" }}
            >
              🧼 Lavador
            </button>
          </div>
          <p style={styles.demoHint}>Todos usan la contraseña: <strong>1234</strong></p>
        </div>
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
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    color: "var(--text-muted)",
  },
  input: {
    paddingLeft: "42px",
  },
  submitBtn: {
    marginTop: "10px",
    width: "100%",
  },
  demoUsersSection: {
    marginTop: "30px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  },
  demoTitle: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    marginBottom: "12px",
    textAlign: "left",
    fontWeight: "600",
  },
  demoButtonsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "8px",
    marginBottom: "10px",
  },
  demoBtn: {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    padding: "8px 12px",
    color: "#fff",
    fontSize: "0.85rem",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  demoHint: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textAlign: "center",
  },
};
