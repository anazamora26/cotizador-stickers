import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

export function Login() {
  const [modoRegistro, setModoRegistro] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const manejarEnvio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (modoRegistro) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (!data.session) {
          alert("Registro exitoso. Revisa tu correo para confirmar la cuenta.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo completar la autenticación.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="neu-chip w-full max-w-md rounded-2xl p-6">
        <h1 className="mb-6 text-center text-2xl font-bold text-foreground">
          {modoRegistro ? "Crear cuenta" : "Iniciar sesión"}
        </h1>

        <form className="grid gap-4" onSubmit={manejarEnvio}>
          <div>
            <label className="etiqueta" htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              className="campo"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label className="etiqueta" htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              className="campo"
              type="password"
              autoComplete={modoRegistro ? "new-password" : "current-password"}
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button className="btn-neu btn-cian w-full" type="submit" disabled={loading}>
            {loading
              ? "Procesando..."
              : modoRegistro
                ? "Registrarme"
                : "Entrar"}
          </button>
        </form>

        <button
          className="mt-4 w-full text-sm text-foreground/70 underline"
          type="button"
          onClick={() => setModoRegistro((actual) => !actual)}
          disabled={loading}
        >
          {modoRegistro ? "Ya tengo una cuenta" : "Crear una cuenta"}
        </button>
      </section>
    </main>
  );
}
