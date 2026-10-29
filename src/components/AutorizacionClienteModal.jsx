import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { XCircle, Scissors, FileX, AlertTriangle } from "lucide-react";
import { formatMoney } from "../utils/storage";
import { lineasDePresupuesto, totalesPresupuesto, registrosNoAutorizados } from "../utils/cotizaciones";

/**
 * Ventana para registrar la respuesta del cliente al presupuesto:
 *  - modo "total":   el cliente NO autoriza la reparación → cobro por diagnóstico (puede ser 0) y se cierra la orden
 *  - modo "parcial": el cliente autoriza solo algunas líneas → las demás quedan registradas como no autorizadas
 */
export function AutorizacionClienteModal({ orden, modo, anticipos = 0, onCancel, onConfirm }) {
  const lineas = useMemo(() => lineasDePresupuesto(orden?.presupuesto), [orden]);
  const totales = useMemo(() => totalesPresupuesto(orden?.presupuesto), [orden]);
  const [autorizadas, setAutorizadas] = useState(() => new Set(lineas.map(l => l.id)));
  const [cobro, setCobro] = useState("0");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (!orden) return null;
  const esTotal = modo === "total";

  const noAutorizadas = lineas.filter(l => !autorizadas.has(l.id));
  const montoAutorizado = lineas.filter(l => autorizadas.has(l.id)).reduce((s, l) => s + l.monto, 0);
  const montoNoAutorizado = noAutorizadas.reduce((s, l) => s + l.monto, 0);
  const cobroNum = Math.max(0, parseFloat(cobro) || 0);

  const toggle = (id) => {
    setAutorizadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const confirmar = (e) => {
    e.preventDefault();
    if (guardando) return;
    if (esTotal) {
      if (isNaN(parseFloat(cobro)) && cobro.trim() !== "") {
        alert("Ingresa un monto válido para el diagnóstico (puede ser 0).");
        return;
      }
      const msg = cobroNum > 0
        ? `Se registrará que el cliente NO autorizó la reparación y se cobrará ${formatMoney(cobroNum)} por diagnóstico. A continuación se abrirá la ventana de cobro para cerrar la orden.\n\n¿Continuar?`
        : "Se registrará que el cliente NO autorizó la reparación y la orden se cerrará SIN COBRO.\n\n¿Continuar?";
      if (!window.confirm(msg)) return;
      setGuardando(true);
      onConfirm({ modo: "total", cobroDiagnostico: cobroNum, motivo, lineasNoAutorizadas: lineas });
    } else {
      if (noAutorizadas.length === 0) {
        alert("Desmarca las líneas que el cliente NO autorizó. Si autorizó todo, usa el botón normal para iniciar la reparación.");
        return;
      }
      if (autorizadas.size === 0) {
        alert("Si el cliente no autorizó ninguna línea, usa el botón \"Cliente no autoriza\".");
        return;
      }
      setGuardando(true);
      onConfirm({ modo: "parcial", idsAutorizados: autorizadas, motivo, lineasNoAutorizadas: noAutorizadas });
    }
  };

  const fila = (l) => {
    const marcada = autorizadas.has(l.id);
    return (
      <label
        key={l.id}
        style={{
          display: "flex", alignItems: "center", gap: "12px", padding: "12px",
          borderRadius: "10px", cursor: esTotal ? "default" : "pointer",
          background: esTotal ? "rgba(255,255,255,0.03)" : marcada ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${esTotal ? "rgba(255,255,255,0.06)" : marcada ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)"}`,
          minHeight: "48px"
        }}
      >
        {!esTotal && (
          <input
            type="checkbox"
            checked={marcada}
            onChange={() => toggle(l.id)}
            style={{ width: "22px", height: "22px", accentColor: "#10b981", flexShrink: 0 }}
          />
        )}
        <span style={{ fontSize: "1.1rem" }}>{l.icono}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", color: "#fff", fontWeight: 600, fontSize: "0.9rem", textDecoration: !esTotal && !marcada ? "line-through" : "none" }}>
            {l.desc}
          </span>
          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
            {l.etiqueta}{l.qty ? ` · Cant. ${l.qty}` : ""}
          </span>
        </span>
        <strong style={{ color: !esTotal && !marcada ? "#f87171" : "#fff", whiteSpace: "nowrap" }}>{formatMoney(l.monto)}</strong>
      </label>
    );
  };

  return createPortal(
    <div className="modal-overlay-centered" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
      <form onSubmit={confirmar} className="glass-panel" style={{ width: "100%", maxWidth: "560px", maxHeight: "92vh", display: "flex", flexDirection: "column", borderRadius: "16px", overflow: "hidden" }}>
        <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
            {esTotal ? <XCircle size={22} color="#f87171" /> : <Scissors size={22} color="#f59e0b" />}
            {esTotal ? "Cliente no autoriza la reparación" : "Autorización parcial del presupuesto"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Orden #{orden.id} · {orden.cliente} · {typeof orden.vehiculo === "string" ? orden.vehiculo : (orden.vehiculo?.placa || "")}
          </p>
        </div>

        <div style={{ padding: "14px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            {esTotal ? "Lo que se cotizó (quedará en el historial del vehículo)" : "Marca lo que el cliente SÍ autorizó"}
          </span>
          {lineas.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>Esta orden no tiene líneas de presupuesto.</p>
          )}
          {lineas.map(fila)}

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-muted)", padding: "4px 2px" }}>
            <span>Total cotizado{totales.descuento > 0 ? " (con descuento)" : ""}</span>
            <strong style={{ color: "#fff" }}>{formatMoney(totales.total)}</strong>
          </div>

          {!esTotal && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ padding: "10px", borderRadius: "10px", background: "rgba(16,185,129,0.1)", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 700 }}>AUTORIZADO</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff" }}>{formatMoney(montoAutorizado)}</div>
              </div>
              <div style={{ padding: "10px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "#f87171", fontWeight: 700 }}>NO AUTORIZADO</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff" }}>{formatMoney(montoNoAutorizado)}</div>
              </div>
            </div>
          )}

          {esTotal && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
              <label htmlFor="cobro-diagnostico" style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
                Cobro por diagnóstico (Q)
              </label>
              <input
                id="cobro-diagnostico"
                className="input-field"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={cobro}
                onChange={(e) => setCobro(e.target.value)}
                style={{ fontSize: "1.2rem", fontWeight: 800, padding: "12px" }}
              />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[0, 100, 150, 200, 250].map(v => (
                  <button key={v} type="button" onClick={() => setCobro(String(v))} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                    {v === 0 ? "Sin cobro" : `Q ${v}`}
                  </button>
                ))}
              </div>
              {anticipos > 0 && (
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", padding: "10px", borderRadius: "10px", background: "rgba(245,158,11,0.1)", color: "#fbbf24", fontSize: "0.8rem" }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
                  <span>Esta orden tiene anticipos por {formatMoney(anticipos)}. Si el diagnóstico es menor, recuerda devolver la diferencia al cliente.</span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="motivo-no-autoriza" style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
              Comentario / motivo (opcional)
            </label>
            <textarea
              id="motivo-no-autoriza"
              className="input-field"
              rows={2}
              placeholder={esTotal ? "Ej. El cliente lo reparará en otro lugar / por presupuesto" : "Ej. Lo hará en su próxima visita"}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "10px" }}>
          <button type="button" onClick={onCancel} className="btn btn-ghost" style={{ flex: 1, minHeight: "48px" }}>
            Cancelar
          </button>
          <button
            id={esTotal ? "confirmar-no-autoriza" : "confirmar-autorizacion-parcial"}
            type="submit"
            disabled={guardando}
            className="btn btn-primary"
            style={{ flex: 2, minHeight: "48px", fontWeight: 800, background: esTotal ? "#dc2626" : undefined, borderColor: esTotal ? "#dc2626" : undefined }}
          >
            {esTotal
              ? (cobroNum > 0 ? `Cobrar ${formatMoney(cobroNum)} y cerrar` : "Cerrar orden sin cobro")
              : `Guardar autorización (${formatMoney(montoAutorizado)})`}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

/** Muestra lo cotizado y no autorizado de una orden (para historial y tarjetas) */
export function RegistrosNoAutorizados({ orden, compacto = false }) {
  const registros = registrosNoAutorizados(orden);
  if (registros.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: compacto ? "6px" : "14px", textAlign: "left" }}>
      {registros.map(r => (
        <div key={r.id} style={{ border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.06)", borderRadius: "12px", padding: compacto ? "8px 10px" : "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <strong style={{ color: "#f87171", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <FileX size={15} />
              {r.tipo === "total" ? "Cotizado y NO autorizado (reparación rechazada)" : "Cotizado y NO autorizado (autorización parcial)"}
            </strong>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {new Date(r.fecha).toLocaleDateString("es-GT")} {r.usuario ? `· ${r.usuario}` : ""}
            </span>
          </div>
          {!compacto && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
              {(r.lineas || []).map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "0.82rem" }}>
                  <span style={{ color: "#e5e7eb" }}>
                    {l.desc} <span style={{ color: "var(--text-muted)" }}>({l.etiqueta}{l.qty ? ` · ${l.qty}` : ""})</span>
                  </span>
                  <span style={{ color: "#fca5a5", whiteSpace: "nowrap" }}>{formatMoney(l.monto)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginTop: "8px", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--text-muted)" }}>
              No autorizado: <strong style={{ color: "#fca5a5" }}>{formatMoney(r.totalNoAutorizado)}</strong>
              {compacto ? ` · ${(r.lineas || []).length} línea(s)` : ""}
            </span>
            {r.tipo === "total" && (
              <span style={{ color: "var(--text-muted)" }}>
                Diagnóstico cobrado: <strong style={{ color: "#fff" }}>{r.cobroDiagnostico > 0 ? formatMoney(r.cobroDiagnostico) : "Sin cobro"}</strong>
              </span>
            )}
          </div>
          {r.motivo && !compacto && (
            <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "#d1d5db" }}>📝 {r.motivo}</div>
          )}
        </div>
      ))}
    </div>
  );
}
