import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Home, Wrench, Car, Store, LayoutGrid, CalendarClock, Tv, CircleParking, Warehouse, Coffee,
  ShoppingCart, Receipt, Wallet, Users, Gift, Smartphone, ShoppingBag, History, TrendingUp,
  Settings, Sparkles, Gauge, Search, X, LogOut, RefreshCw, UserCircle2
} from "lucide-react";
import { isModuleActive } from "../../utils/modulesConfig";
import { isSuperAdminSession } from "../../utils/supabase";

// Catálogo de módulos agrupados para el menú "Más" del celular
export const MODULOS_MOVIL = [
  { id: "citas", label: "Citas", icon: CalendarClock, grupo: "Operación", color: "#38bdf8" },
  { id: "taller", label: "Taller", icon: Wrench, grupo: "Operación", color: "#60a5fa" },
  { id: "carwash", label: "Carwash", icon: Car, grupo: "Operación", color: "#22d3ee" },
  { id: "parqueo", label: "Parqueo", icon: CircleParking, grupo: "Operación", color: "#a78bfa" },
  { id: "historial", label: "Historial", icon: History, grupo: "Operación", color: "#94a3b8" },
  { id: "repuestosFaltantes", label: "Repuestos faltantes", icon: ShoppingCart, grupo: "Operación", color: "#f87171" },
  { id: "cotizacionesVendedores", label: "Cotizar repuestos", icon: ShoppingBag, grupo: "Operación", color: "#fb923c" },
  { id: "pantalla", label: "Pantalla monitor", icon: Tv, grupo: "Operación", color: "#818cf8" },

  { id: "tienda", label: "Caja / Tienda", icon: Store, grupo: "Ventas y clientes", color: "#34d399" },
  { id: "accesorios", label: "Accesorios", icon: ShoppingBag, grupo: "Ventas y clientes", color: "#f472b6" },
  { id: "cafeteria", label: "Cafetería", icon: Coffee, grupo: "Ventas y clientes", color: "#fbbf24" },
  { id: "cuentas", label: "Cuentas", icon: Receipt, grupo: "Ventas y clientes", color: "#2dd4bf" },
  { id: "clientesVehiculos", label: "Clientes", icon: Users, grupo: "Ventas y clientes", color: "#60a5fa" },
  { id: "recompensas", label: "Recompensas", icon: Gift, grupo: "Ventas y clientes", color: "#f59e0b" },
  { id: "portal", label: "Portal cliente", icon: Smartphone, grupo: "Ventas y clientes", color: "#a78bfa" },
  { id: "vehiculosVenta", label: "Autos en venta", icon: Car, grupo: "Ventas y clientes", color: "#4ade80" },

  { id: "bodega", label: "Bodega", icon: Warehouse, grupo: "Inventario y compras", color: "#fb923c" },
  { id: "compras", label: "Compras", icon: Wallet, grupo: "Inventario y compras", color: "#facc15" },

  { id: "dashboard", label: "Estadísticas", icon: Gauge, grupo: "Administración", color: "#60a5fa" },
  { id: "finanzas", label: "Finanzas", icon: TrendingUp, grupo: "Administración", color: "#34d399" },
  { id: "configuracion", label: "Configuración", icon: Settings, grupo: "Administración", color: "#94a3b8" },
  { id: "saasAdmin", label: "Panel SaaS", icon: Sparkles, grupo: "Administración", color: "#e879f9" }
];

const GRUPOS = ["Operación", "Ventas y clientes", "Inventario y compras", "Administración"];

/** Módulos que el usuario puede abrir (permisos + módulos activos del taller) */
export const modulosPermitidos = (puede, activeModules) =>
  MODULOS_MOVIL.filter(m => {
    if (m.id === "saasAdmin") return isSuperAdminSession();
    if (!isModuleActive(m.id, activeModules)) return false;
    return puede(m.id);
  });

/** Barra inferior fija (solo celular) */
export function BarraInferiorMovil({ currentTab, onNavegar, onAbrirMas, menuAbierto, permitidos, badges = {} }) {
  const ids = new Set(permitidos.map(m => m.id));
  // Inicio siempre; luego Taller, Carwash y Caja si tiene permiso; si no, se rellenan con otros módulos permitidos
  const preferidos = ["taller", "carwash", "tienda"];
  const alternos = ["citas", "parqueo", "historial", "cuentas", "bodega"];
  const centrales = [];
  [...preferidos, ...alternos].forEach(id => {
    if (centrales.length < 3 && ids.has(id)) centrales.push(id);
  });
  const etiqueta = { taller: "Taller", carwash: "Carwash", tienda: "Caja", citas: "Citas", parqueo: "Parqueo", historial: "Historial", cuentas: "Cuentas", bodega: "Bodega" };
  const icono = { taller: Wrench, carwash: Car, tienda: Store, citas: CalendarClock, parqueo: CircleParking, historial: History, cuentas: Receipt, bodega: Warehouse };

  const items = [
    { id: "inicio", label: "Inicio", Icon: Home },
    ...centrales.map(id => ({ id, label: etiqueta[id], Icon: icono[id] })),
  ];
  const activoEnMas = !menuAbierto && !items.some(i => i.id === currentTab);
  const totalBadgesMas = Object.entries(badges).filter(([id]) => !items.some(i => i.id === id)).reduce((s, [, n]) => s + (n || 0), 0);

  return (
    <nav className="barra-inferior-movil" aria-label="Navegación principal">
      {items.map(({ id, label, Icon }) => {
        const activo = !menuAbierto && currentTab === id;
        return (
          <button key={id} id={`nav-movil-${id}`} type="button" className={`barra-inferior-item${activo ? " activo" : ""}`} onClick={() => onNavegar(id)}>
            <span className="barra-inferior-icono">
              <Icon size={22} strokeWidth={activo ? 2.4 : 1.9} />
              {badges[id] > 0 && <span className="barra-inferior-badge">{badges[id]}</span>}
            </span>
            <span>{label}</span>
          </button>
        );
      })}
      <button id="nav-movil-mas" type="button" className={`barra-inferior-item${menuAbierto || activoEnMas ? " activo" : ""}`} onClick={onAbrirMas}>
        <span className="barra-inferior-icono">
          <LayoutGrid size={22} strokeWidth={menuAbierto || activoEnMas ? 2.4 : 1.9} />
          {totalBadgesMas > 0 && <span className="barra-inferior-badge">{totalBadgesMas}</span>}
        </span>
        <span>Más</span>
      </button>
    </nav>
  );
}

/** Menú "Más": cuadrícula de módulos por grupos, con buscador */
export function MenuMasMovil({ permitidos, currentTab, onNavegar, onCerrar, usuario, onLogout, realtimeStatus, onSincronizar, badges = {}, nombreTaller }) {
  const [filtro, setFiltro] = useState("");
  const lista = useMemo(() => {
    const f = filtro.toLowerCase().trim();
    return f ? permitidos.filter(m => m.label.toLowerCase().includes(f)) : permitidos;
  }, [filtro, permitidos]);
  const conectado = realtimeStatus === "SUBSCRIBED" || realtimeStatus === "connected" || realtimeStatus === true;

  return createPortal(
    <div className="menu-mas-movil" role="dialog" aria-label="Todos los módulos">
      <div className="menu-mas-cabecera">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <UserCircle2 size={34} color="#60a5fa" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: "#fff", fontSize: "1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {usuario?.nombreCompleto || usuario?.nombre || usuario?.user}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: conectado ? "#10b981" : "#f59e0b", display: "inline-block" }} />
              {nombreTaller ? `${nombreTaller} · ` : ""}{conectado ? "En línea" : "Conectando…"}
            </div>
          </div>
        </div>
        <button type="button" onClick={onCerrar} className="menu-mas-cerrar" aria-label="Cerrar menú"><X size={22} /></button>
      </div>

      <div className="menu-mas-buscador">
        <Search size={18} color="var(--text-muted)" />
        <input
          id="menu-mas-buscar"
          type="search"
          placeholder="Buscar módulo…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      <div className="menu-mas-contenido">
        {GRUPOS.map(grupo => {
          const delGrupo = lista.filter(m => m.grupo === grupo);
          if (delGrupo.length === 0) return null;
          return (
            <section key={grupo} style={{ marginBottom: "18px" }}>
              <h3 className="menu-mas-grupo">{grupo}</h3>
              <div className="menu-mas-grid">
                {delGrupo.map(m => {
                  const Icon = m.icon;
                  const activo = currentTab === m.id;
                  return (
                    <button key={m.id} id={`menu-mas-${m.id}`} type="button" className={`menu-mas-tile${activo ? " activo" : ""}`} onClick={() => onNavegar(m.id)}>
                      <span className="menu-mas-tile-icono" style={{ background: `${m.color}22`, color: m.color }}>
                        <Icon size={24} />
                        {badges[m.id] > 0 && <span className="barra-inferior-badge">{badges[m.id]}</span>}
                      </span>
                      <span className="menu-mas-tile-texto">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        {lista.length === 0 && <p style={{ color: "var(--text-muted)", textAlign: "center" }}>No se encontró ningún módulo.</p>}

        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          {onSincronizar && (
            <button type="button" className="btn btn-secondary" style={{ flex: 1, minHeight: "48px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }} onClick={onSincronizar}>
              <RefreshCw size={18} /> Sincronizar
            </button>
          )}
          <button id="menu-mas-salir" type="button" className="btn" style={{ flex: 1, minHeight: "48px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", fontWeight: 700 }} onClick={onLogout}>
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
