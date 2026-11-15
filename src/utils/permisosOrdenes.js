// 🔐 Quién puede INGRESAR órdenes nuevas (Taller / Carwash)
// - Administración, jefes, gerentes y cajeros: siempre.
// - Cualquier colaborador a quien el administrador le habilitó el módulo
//   (permiso "taller" o "carwash"), excepto mecánicos y vendedores proveedores.
// - Mecánicos u otros roles: si tienen el permiso explícito "crearOrdenes".
// Nota: los usuarios guardan sus accesos en "permissions" (algunos datos antiguos usan "permisos").
export const permisosDeUsuario = (usuario) => {
  if (!usuario) return [];
  const a = Array.isArray(usuario.permissions) ? usuario.permissions : [];
  const b = Array.isArray(usuario.permisos) ? usuario.permisos : [];
  return Array.from(new Set([...a, ...b]));
};

export const puedeCrearOrdenes = (usuario, modulo = "taller") => {
  if (!usuario || !usuario.rol) return true;
  const rol = String(usuario.rol || "").toLowerCase().trim();
  const permisos = permisosDeUsuario(usuario);

  if (
    rol.includes("admin") || rol.includes("gerente") || rol.includes("jefe") ||
    rol.includes("cajero") || rol.includes(modulo)
  ) return true;

  if (permisos.includes("crearOrdenes")) return true;

  const esMecanico = rol === "mecanico" || rol === "mecánico";
  const esVendedor = rol.includes("vendedor") || rol.includes("proveedor");
  if (esVendedor || esMecanico) return false;

  // Si el usuario puede abrir el módulo, puede ingresar órdenes en él
  return permisos.length === 0 ? true : permisos.includes(modulo);
};
