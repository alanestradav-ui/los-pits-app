// 🔐 Quién puede INGRESAR órdenes nuevas (Taller / Carwash)
// - Administración, jefes, gerentes y cajeros: siempre.
// - Cualquier colaborador a quien el administrador le habilitó el módulo
//   (permiso "taller" o "carwash"), excepto mecánicos y vendedores proveedores.
// - Mecánicos u otros roles: si tienen el permiso explícito "crearOrdenes".
export const puedeCrearOrdenes = (usuario, modulo = "taller") => {
  if (!usuario || !usuario.rol) return true;
  const rol = String(usuario.rol || "").toLowerCase().trim();
  const permisos = Array.isArray(usuario.permisos) ? usuario.permisos : [];

  if (
    rol.includes("admin") || rol.includes("gerente") || rol.includes("jefe") ||
    rol.includes("cajero") || rol.includes(modulo)
  ) return true;

  if (permisos.includes("crearOrdenes")) return true;

  const esMecanico = rol === "mecanico" || rol === "mecánico";
  const esVendedor = rol.includes("vendedor") || rol.includes("proveedor");
  if (esVendedor) return false;
  if (esMecanico) return false;

  return permisos.includes(modulo);
};
