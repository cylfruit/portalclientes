import Image from "next/image";
import { redirect } from "next/navigation";
import {
  getCurrentAuthenticatedPortalUser,
  readCsrfTokenFromCookies,
} from "@/lib/auth";
import { sanitizeNextPath } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "invalid-credentials": "Usuario o contraseña incorrectos.",
  pending: "Tu usuario aun esta pendiente de activacion.",
  blocked: "Tu usuario esta bloqueado. Contacta a administracion.",
  csrf: "La sesion del formulario expiro. Intenta ingresar nuevamente.",
  "session-expired": "Debes volver a iniciar sesion para continuar.",
  "admin-required":
    "Necesitas privilegios de administracion para acceder a esa ruta.",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    logged_out?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentAuthenticatedPortalUser();
  const nextPath = sanitizeNextPath(params.next);

  if (currentUser) {
    redirect(nextPath);
  }

  const csrfToken = await readCsrfTokenFromCookies();
  const errorMessage = params.error ? errorMessages[params.error] : null;
  const logoutMessage = params.logged_out === "1" ? "Sesion cerrada." : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#111111] text-white">
      <div className="absolute inset-0">
        <Image
          src="/brand/bg_login.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(0,0,0,0.92),rgba(18,18,18,0.84),rgba(18,18,18,0.72))]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-screen-2xl gap-10 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
        <section className="max-w-2xl space-y-6">
          <div className="flex items-center gap-4">
            <Image
              src="/brand/logocyl.png"
              alt="C&L Fruit"
              width={84}
              height={84}
              className="h-18 w-18 object-contain"
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyl-gold-soft/72">
                Portal cliente C&amp;L
              </p>
              <h1 className="portal-display mt-2 text-5xl leading-none text-white sm:text-6xl lg:text-7xl">
                Acceso seguro
              </h1>
            </div>
          </div>

          <p className="max-w-xl text-base leading-7 text-white/76 sm:text-lg">
            El portal ahora exige autenticacion para cada ingreso. Las sesiones
            usan JWT en cookie de sesion, las rutas sensibles quedan protegidas
            y las mutaciones validan CSRF en el mismo proyecto.
          </p>

          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
            <span className="rounded-full border border-white/10 px-3 py-2">
              JWT Session
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              CSRF Guard
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              Rutas protegidas
            </span>
          </div>
        </section>

        <section className="panel mx-auto w-full max-w-xl p-6 text-cyl-ink sm:p-8">
          <p className="section-kicker text-cyl-gold">Iniciar sesion</p>
          <h2 className="mt-3 text-3xl font-semibold text-cyl-ink">
            Accede al portal de recibidores
          </h2>
          <p className="mt-2 text-sm leading-6 text-cyl-ink/70">
            Usa tu usuario del portal cliente. Si eres administrador o
            superusuario, podras gestionar accesos y ver todas las rutas.
          </p>

          {errorMessage ? (
            <div className="mt-5 rounded-[1.15rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {errorMessage}
            </div>
          ) : null}

          {logoutMessage ? (
            <div className="mt-5 rounded-[1.15rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {logoutMessage}
            </div>
          ) : null}

          <form
            action="/api/auth/login"
            method="post"
            className="mt-6 space-y-4"
          >
            <input type="hidden" name="csrfToken" value={csrfToken ?? ""} />
            <input type="hidden" name="next" value={nextPath} />

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-cyl-ink">
                Usuario
              </span>
              <input
                name="username"
                type="text"
                autoComplete="username"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-cyl-ink outline-none transition focus:border-cyl-gold/60 focus:ring-2 focus:ring-cyl-gold/30"
                placeholder="admin_portal"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-cyl-ink">
                Contraseña
              </span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-cyl-ink outline-none transition focus:border-cyl-gold/60 focus:ring-2 focus:ring-cyl-gold/30"
                placeholder="Tu clave del portal"
                required
              />
            </label>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#111827] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
            >
              Entrar al portal
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
