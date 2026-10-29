import { useEffect, useState } from "react";

// 📱 Detecta si la pantalla es de celular (≤ 768 px). En PC siempre devuelve false.
export function useEsMovil(ancho = 768) {
  const consulta = `(max-width: ${ancho}px)`;
  const [esMovil, setEsMovil] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(consulta).matches
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(consulta);
    const alCambiar = (e) => setEsMovil(e.matches);
    setEsMovil(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", alCambiar);
    else mq.addListener(alCambiar);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", alCambiar);
      else mq.removeListener(alCambiar);
    };
  }, [consulta]);
  return esMovil;
}

// Encargos entre pantallas (p. ej. Inicio → Taller con la placa buscada o "abrir nueva orden").
// Se guardan en sessionStorage y se consumen una sola vez al abrir el módulo.
const PREFIJO = "movil_encargo_";
export const dejarEncargoMovil = (clave, valor) => {
  try { sessionStorage.setItem(PREFIJO + clave, String(valor)); } catch (e) { /* sin acceso */ }
};
export const tomarEncargoMovil = (clave) => {
  try {
    const v = sessionStorage.getItem(PREFIJO + clave);
    if (v !== null) sessionStorage.removeItem(PREFIJO + clave);
    return v;
  } catch (e) {
    return null;
  }
};
// Leer sin borrar (para inicializar estados) y borrar después en un useEffect
export const leerEncargoMovil = (clave) => {
  try { return sessionStorage.getItem(PREFIJO + clave); } catch (e) { return null; }
};
export const borrarEncargosMovil = (claves = []) => {
  try { claves.forEach(c => sessionStorage.removeItem(PREFIJO + c)); } catch (e) { /* sin acceso */ }
};

// Placa de una orden / lavado / vehículo (los datos antiguos guardan el vehículo como texto)
export const placaDe = (x) => {
  if (!x) return "";
  if (x.placa) return String(x.placa).toUpperCase().trim();
  if (x.vehiculo && typeof x.vehiculo === "object" && x.vehiculo.placa) return String(x.vehiculo.placa).toUpperCase().trim();
  if (typeof x.vehiculo === "string") {
    const m = x.vehiculo.match(/\(([^)]+)\)\s*$/);
    if (m) return m[1].toUpperCase().trim();
  }
  return "";
};

export const vehiculoTexto = (x) => {
  if (!x) return "";
  if (typeof x.vehiculo === "string") return x.vehiculo.replace(/\s*\([^)]*\)\s*$/, "");
  if (x.vehiculo && typeof x.vehiculo === "object") return [x.vehiculo.marca, x.vehiculo.linea].filter(Boolean).join(" ");
  return [x.marca, x.linea].filter(Boolean).join(" ");
};
