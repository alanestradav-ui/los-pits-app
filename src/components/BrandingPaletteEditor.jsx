import React, { useEffect, useRef, useState } from "react";
import { Palette, Save, Download, RotateCcw, Check, FileText, ClipboardCheck, Receipt } from "lucide-react";
import { jsPDF } from "jspdf";
import {
  DEFAULT_BRANDING,
  COLOR_PRESETS,
  DOC_COLOR_FIELDS,
  DOC_COLOR_KEYS,
  SAMPLE_DOC_TYPES,
  SAMPLE_DOC_WIDTH,
  SAMPLE_DOC_HEIGHT,
  drawSampleDocument,
  normalizeHex
} from "../utils/branding";

const GRUPOS = [
  { id: "estructura", titulo: "Estructura de la hoja" },
  { id: "acentos", titulo: "Acentos y totales" },
  { id: "contenido", titulo: "Contenido y fondo" }
];

const TIPO_ICONOS = {
  presupuesto: FileText,
  recepcion: ClipboardCheck,
  recibo: Receipt
};

/**
 * 🎨 Editor de paleta de documentos con HOJA MODELO en vivo.
 * La hoja modelo se dibuja con el mismo motor de tema que usan los documentos reales,
 * por lo que lo que se ve aquí es exactamente lo que se imprimirá.
 */
export default function BrandingPaletteEditor({ brandingForm, setBrandingForm, onSave, savedToast }) {
  const canvasRef = useRef(null);
  const [tipoDoc, setTipoDoc] = useState("presupuesto");
  const [logoImg, setLogoImg] = useState(null);

  // Cargar logo para la hoja modelo
  useEffect(() => {
    if (!brandingForm.logoUrl) {
      setLogoImg(null);
      return;
    }
    const img = new Image();
    img.onload = () => setLogoImg(img);
    img.onerror = () => setLogoImg(null);
    img.src = brandingForm.logoUrl;
  }, [brandingForm.logoUrl]);

  // Redibujar la hoja modelo en cada cambio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const render = () => drawSampleDocument(ctx, brandingForm, tipoDoc, logoImg);
    render();
    // Redibujar cuando terminen de cargar las fuentes web
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(render).catch(() => {});
    }
  }, [brandingForm, tipoDoc, logoImg]);

  const updateColor = (key, value) => {
    setBrandingForm(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyPreset = (preset) => {
    setBrandingForm(prev => {
      const next = { ...prev };
      DOC_COLOR_KEYS.forEach(k => {
        next[k] = preset[k] || DEFAULT_BRANDING[k];
      });
      return next;
    });
  };

  const handleResetColors = () => {
    handleApplyPreset(DEFAULT_BRANDING);
  };

  const isPresetActive = (preset) =>
    DOC_COLOR_KEYS.every(k => normalizeHex(brandingForm[k]) === normalizeHex(preset[k] || DEFAULT_BRANDING[k]));

  const handleDownloadSample = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF("p", "px", [SAMPLE_DOC_WIDTH, SAMPLE_DOC_HEIGHT]);
    pdf.addImage(dataURL, "JPEG", 0, 0, SAMPLE_DOC_WIDTH, SAMPLE_DOC_HEIGHT);
    pdf.save(`Hoja_Modelo_${tipoDoc}.pdf`);
  };

  return (
    <div className="glass-panel palette-editor" style={s.card}>
      <style>{css}</style>

      {/* Encabezado */}
      <div style={s.headerRow}>
        <div>
          <h3 style={s.title}>
            <Palette size={20} color="#eab308" /> Paleta de Colores y Hoja Modelo
          </h3>
          <p style={s.subtitle}>
            Los colores se aplican a <strong>toda la hoja</strong> de presupuestos, recepciones, recibos, tickets y demás documentos — no solo al encabezado.
          </p>
        </div>
        {savedToast && (
          <div style={s.toast}>
            <Check size={16} /> ¡Paleta guardada!
          </div>
        )}
      </div>

      <div className="palette-grid">
        {/* ===== Controles ===== */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", minWidth: 0 }}>
          {/* Temas */}
          <div>
            <label style={s.groupLabel}>Temas rápidos predefinidos</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {COLOR_PRESETS.map(preset => {
                const active = isPresetActive(preset);
                return (
                  <button
                    key={preset.id}
                    id={`preset-${preset.id}`}
                    type="button"
                    className="palette-preset"
                    onClick={() => handleApplyPreset(preset)}
                    style={{
                      ...s.preset,
                      border: active ? `2px solid ${preset.colorSecundario}` : "1px solid rgba(255,255,255,0.1)",
                      boxShadow: active ? `0 0 14px ${preset.colorSecundario}55` : "none"
                    }}
                    title={preset.name}
                  >
                    <span style={s.presetSwatches}>
                      {[preset.colorPrimario, preset.colorBanda, preset.colorSecundario, preset.colorFilaAlterna].map((c, i) => (
                        <span key={i} style={{ ...s.presetDot, backgroundColor: c }} />
                      ))}
                    </span>
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colores por grupo */}
          {GRUPOS.map(grupo => (
            <div key={grupo.id}>
              <label style={s.groupLabel}>{grupo.titulo}</label>
              <div className="palette-fields">
                {DOC_COLOR_FIELDS.filter(f => f.grupo === grupo.id).map(field => {
                  const value = brandingForm[field.key] || DEFAULT_BRANDING[field.key];
                  const valid = !!normalizeHex(value);
                  return (
                    <div key={field.key} className="palette-field" style={s.field}>
                      <label className="palette-swatch" style={{ backgroundColor: valid ? normalizeHex(value) : "transparent" }}>
                        <input
                          id={`color-${field.key}`}
                          type="color"
                          value={normalizeHex(value, DEFAULT_BRANDING[field.key])}
                          onChange={(e) => updateColor(field.key, e.target.value)}
                          style={s.hiddenColor}
                        />
                      </label>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={s.fieldLabel}>{field.label}</div>
                        <div style={s.fieldDesc}>{field.desc}</div>
                      </div>
                      <input
                        id={`hex-${field.key}`}
                        type="text"
                        className="input-field"
                        value={value}
                        maxLength={7}
                        onChange={(e) => updateColor(field.key, e.target.value)}
                        style={{ ...s.hexInput, borderColor: valid ? undefined : "#ef4444" }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Acciones */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button id="btn-guardar-paleta" type="button" className="btn btn-primary" onClick={onSave} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Save size={16} /> Guardar paleta
            </button>
            <button id="btn-descargar-hoja-modelo" type="button" className="btn btn-ghost" onClick={handleDownloadSample} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Download size={16} /> Descargar hoja modelo (PDF)
            </button>
            <button id="btn-restablecer-colores" type="button" className="btn btn-ghost" onClick={handleResetColors} style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9ca3af" }}>
              <RotateCcw size={16} /> Colores clásicos
            </button>
          </div>
        </div>

        {/* ===== Hoja modelo ===== */}
        <div className="palette-preview">
          <div style={s.tabs}>
            {SAMPLE_DOC_TYPES.map(t => {
              const Icon = TIPO_ICONOS[t.id] || FileText;
              const active = tipoDoc === t.id;
              return (
                <button
                  key={t.id}
                  id={`hoja-modelo-${t.id}`}
                  type="button"
                  onClick={() => setTipoDoc(t.id)}
                  style={{
                    ...s.tab,
                    backgroundColor: active ? "rgba(234, 179, 8, 0.18)" : "transparent",
                    color: active ? "#facc15" : "#9ca3af",
                    borderColor: active ? "rgba(234, 179, 8, 0.5)" : "rgba(255,255,255,0.08)"
                  }}
                >
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>
          <div className="palette-paper">
            <canvas
              ref={canvasRef}
              width={SAMPLE_DOC_WIDTH}
              height={SAMPLE_DOC_HEIGHT}
              style={{ width: "100%", height: "auto", display: "block", borderRadius: "6px" }}
              aria-label="Hoja modelo con la paleta de colores configurada"
            />
          </div>
          <p style={s.previewNote}>
            Vista previa en vivo · Así se verán tus documentos impresos y en PDF. Recuerda presionar <strong>Guardar paleta</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

const css = `
  .palette-editor .palette-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    gap: 24px;
    align-items: start;
  }
  @media (max-width: 1100px) {
    .palette-editor .palette-grid { grid-template-columns: 1fr; }
  }
  .palette-editor .palette-fields {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .palette-editor .palette-field {
    transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
  }
  .palette-editor .palette-field:hover {
    border-color: rgba(234, 179, 8, 0.35) !important;
    background-color: rgba(255, 255, 255, 0.05) !important;
    transform: translateX(2px);
  }
  .palette-editor .palette-swatch {
    position: relative;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 10px;
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.18);
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.3);
    transition: transform 0.15s ease;
  }
  .palette-editor .palette-swatch:hover { transform: scale(1.08); }
  .palette-editor .palette-preset { transition: transform 0.15s ease, box-shadow 0.2s ease; }
  .palette-editor .palette-preset:hover { transform: translateY(-2px); }
  .palette-editor .palette-preview {
    position: sticky;
    top: 16px;
  }
  .palette-editor .palette-paper {
    padding: 14px;
    border-radius: 12px;
    background: linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01));
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 20px 40px rgba(0,0,0,0.45);
  }
  .palette-editor .palette-paper canvas {
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    animation: paletteFade 0.35s ease;
  }
  @keyframes paletteFade { from { opacity: 0.6; } to { opacity: 1; } }
`;

const s = {
  card: {
    padding: "24px",
    borderRadius: "16px",
    border: "1px solid rgba(234, 179, 8, 0.3)"
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "20px"
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "#fff"
  },
  subtitle: {
    margin: "4px 0 0 0",
    fontSize: "0.85rem",
    color: "#9ca3af",
    maxWidth: "640px"
  },
  toast: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    border: "1px solid #10b981",
    color: "#34d399",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  groupLabel: {
    display: "block",
    fontSize: "0.72rem",
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#eab308",
    marginBottom: "8px"
  },
  preset: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 12px",
    borderRadius: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    cursor: "pointer",
    color: "#fff",
    fontSize: "0.78rem",
    fontWeight: 600
  },
  presetSwatches: { display: "flex" },
  presetDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.35)",
    marginLeft: "-3px"
  },
  field: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 10px",
    borderRadius: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    border: "1px solid rgba(255, 255, 255, 0.06)"
  },
  hiddenColor: {
    position: "absolute",
    inset: 0,
    opacity: 0,
    width: "100%",
    height: "100%",
    cursor: "pointer"
  },
  fieldLabel: { fontSize: "0.85rem", fontWeight: 700, color: "#f3f4f6" },
  fieldDesc: { fontSize: "0.72rem", color: "#9ca3af", marginTop: "1px" },
  hexInput: {
    width: "96px",
    flexShrink: 0,
    textTransform: "uppercase",
    fontFamily: "monospace",
    fontSize: "0.82rem",
    padding: "6px 8px"
  },
  tabs: { display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 12px",
    borderRadius: "8px",
    border: "1px solid",
    fontSize: "0.8rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  previewNote: { fontSize: "0.75rem", color: "#9ca3af", textAlign: "center", marginTop: "10px" }
};
