import React, { useState } from "react";
import { Wrench, Shield, Lock, User, KeyRound, Loader2 } from "lucide-react";

const getLevenshteinDistance = (a, b) => {
  const tmp = [];
  let i, j;
  for (i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
};

const matchNameFlexible = (dbName, inputName) => {
  if (!dbName || !inputName) return false;
  const dbWords = dbName.toLowerCase().trim().split(/\s+/);
  const inputWords = inputName.toLowerCase().trim().split(/\s+/);

  if (inputWords.length < dbWords.length) {
    return inputWords.every(inWord => {
      return dbWords.some(dbWord => {
        if (dbWord === inWord) return true;
        const sortStr = (w) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/z/g, "s").split("").sort().join("");
        if (sortStr(dbWord) === sortStr(inWord)) return true;
        return getLevenshteinDistance(dbWord, inWord) <= 2;
      });
    });
  }

  return dbWords.every((dbWord, idx) => {
    const inWord = inputWords[idx] || "";
    if (dbWord === inWord) return true;
    const sortStr = (w) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/z/g, "s").split("").sort().join("");
    if (sortStr(dbWord) === sortStr(inWord)) return true;
    if (getLevenshteinDistance(dbWord, inWord) <= 2) return true;

    return inputWords.some(anyInWord => {
      if (dbWord === anyInWord) return true;
      if (sortStr(dbWord) === sortStr(anyInWord)) return true;
      return getLevenshteinDistance(dbWord, anyInWord) <= 2;
    });
  });
};

export default function Login({ usuarios, onLogin, isInitialPullDone = true, realtimeStatus = "connected" }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user.trim() || !pass.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }

    const cleanInput = user.toLowerCase().trim();
    const cleanPass = pass.trim();

    const encontrado = usuarios.find((u) => {
      const uName = u.user || "";
      const uFullName = u.nombreCompleto || "";
      const isPasswordMatch = (u.pass || "").toLowerCase().trim() === cleanPass.toLowerCase();
      
      if (!isPasswordMatch) return false;
      if (matchNameFlexible(uName, cleanInput)) return true;
      if (uFullName && matchNameFlexible(uFullName, cleanInput)) return true;
      
      return false;
    });

    if (encontrado) {
      setError("");
      onLogin(encontrado);
    } else {
      setError("Usuario o contraseña incorrectos.");
    }
  };

  const fillCredentials = (username) => {
    setUser(username);
    const matchedUser = usuarios.find(u => (u.user || "").toLowerCase().trim() === username.toLowerCase().trim());
    setPass(matchedUser ? matchedUser.pass : "1234");
    setError("");
  };

  const isConnecting = !isInitialPullDone;

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
          
          {isConnecting ? (
            <div style={styles.syncBadge}>
              <Loader2 size={14} className="animate-spin" />
              <span>Sincronizando base de datos...</span>
            </div>
          ) : (
            <div style={{ ...styles.syncBadge, backgroundColor: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}>
              <span style={styles.dot}>●</span>
              <span>Sincronizado con la nube</span>
            </div>
          )}
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
            {isConnecting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <KeyRound size={18} />
            )}
            {isConnecting ? "Sincronizando..." : "Ingresar al Sistema"}
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
  dot: {
    fontSize: "0.6rem",
    marginRight: "2px",
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

