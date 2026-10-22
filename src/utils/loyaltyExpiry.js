// 🏆 Vencimiento de Puntos Pits
// Los puntos vencen tras N días sin visitas (regla de "caducidad" del programa, por defecto 180 días).
// Se avisa con un mes (30 días) de anticipación.

export const DIAS_AVISO_VENCIMIENTO = 30;
const DIAS_VENCIMIENTO_DEFAULT = 180;
const MS_DIA = 24 * 60 * 60 * 1000;

// Lee los días de vencimiento de la regla de caducidad (ej. "Vencimiento a los 6 Meses (180 Días)")
export const getDiasVencimientoPuntos = (reglasPrograma = []) => {
  const regla = (Array.isArray(reglasPrograma) ? reglasPrograma : []).find(r => r && r.tipo === "caducidad");
  if (!regla) return DIAS_VENCIMIENTO_DEFAULT;
  const texto = `${regla.formula || ""} ${regla.descripcion || ""}`.toLowerCase();
  const dias = texto.match(/(\d+)\s*d[ií]as?/);
  if (dias) return parseInt(dias[1], 10) || DIAS_VENCIMIENTO_DEFAULT;
  const meses = texto.match(/(\d+)\s*mes(es)?/);
  if (meses) return (parseInt(meses[1], 10) || 6) * 30;
  return DIAS_VENCIMIENTO_DEFAULT;
};

// Fecha de vencimiento de los puntos de un cliente (última visita + días de vigencia)
export const getFechaVencimientoPuntos = (registro, diasVencimiento = DIAS_VENCIMIENTO_DEFAULT) => {
  if (!registro) return null;
  const base = registro.ultimaVisita || registro.fechaRegistro;
  if (!base) return null;
  const d = new Date(base);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + diasVencimiento * MS_DIA);
};

// Clientes con puntos que vencen dentro del próximo mes (y aún no han vencido)
export const getPuntosPorVencer = (puntosRecompensas = [], reglasPrograma = [], diasAviso = DIAS_AVISO_VENCIMIENTO, ahora = new Date()) => {
  const diasVencimiento = getDiasVencimientoPuntos(reglasPrograma);
  return (Array.isArray(puntosRecompensas) ? puntosRecompensas : [])
    .filter(p => p && (parseInt(p.puntos) || 0) > 0)
    .map(p => {
      const fechaVencimiento = getFechaVencimientoPuntos(p, diasVencimiento);
      if (!fechaVencimiento) return null;
      const diasRestantes = Math.ceil((fechaVencimiento.getTime() - ahora.getTime()) / MS_DIA);
      return { ...p, fechaVencimiento, diasRestantes };
    })
    .filter(p => p && p.diasRestantes >= 0 && p.diasRestantes <= diasAviso)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
};

// ¿Ya se avisó al cliente sobre este ciclo de vencimiento? (aviso posterior a su última visita)
export const yaSeAvisoVencimiento = (registro) => {
  if (!registro || !registro.avisoVencimientoEnviado) return false;
  const aviso = new Date(registro.avisoVencimientoEnviado).getTime();
  const base = new Date(registro.ultimaVisita || registro.fechaRegistro || 0).getTime();
  return !isNaN(aviso) && aviso >= (isNaN(base) ? 0 : base);
};
