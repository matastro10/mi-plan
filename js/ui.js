// Estado de pantalla que NO se guarda: en qué pestaña estás, qué mes ves, qué está abierto...

export const ui = {
  vista: 'hoy',
  mes: null, // 'AAAA-MM' que muestra el calendario
  semana: null, // lunes de la semana que muestra el resumen
  abiertos: new Set(), // <details> abiertos, por id
  efectos: [], // animaciones pendientes después de pintar
  push: null, // estado de las notificaciones en este teléfono
  borradorFrase: '',
  ocupado: null,
};
