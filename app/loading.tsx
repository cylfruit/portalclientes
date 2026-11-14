// Se muestra al instante mientras el servidor consulta ClickHouse. Con conexiones
// lentas evita la pantalla en blanco: el HTML con este esqueleto llega primero y el
// contenido real lo reemplaza al terminar (streaming).
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cyl-bg px-4 text-cyl-muted"
    >
      <div
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-2 border-cyl-border border-t-cyl-gold motion-reduce:animate-none"
      />
      <p className="text-sm">Cargando… / Loading…</p>
    </div>
  );
}
