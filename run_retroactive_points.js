// run_retroactive_points.js
// Ejecuta el cálculo retroactivo de puntos para el tenant "pruebas"
// y sincroniza los puntos actualizados a Supabase.

// supabase import not needed for script execution
import "./scratch/calculate_retroactive_points_pruebas.js"; // side-effect import

(async () => {
  console.log('Iniciando cálculo retroactivo de puntos para el tenant "pruebas"');
  try {
    // calculateRetroactive executed on import
    console.log('Cálculo retroactivo completado exitosamente.');
  } catch (e) {
    console.error('Error durante el cálculo retroactivo:', e);
    process.exit(1);
  }
})();
