import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { LogIn, Mail, LockKeyhole, UserRound, Chrome } from "lucide-react";
import { auth, googleProvider } from "../services/firebase";

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "Este e-mail já está cadastrado.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Digite um e-mail válido.",
  "auth/missing-password": "Digite sua senha.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/popup-closed-by-user": "O login com Google foi cancelado.",
  "auth/popup-blocked": "O navegador bloqueou a janela do Google.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
};

function messageFromError(error) {
  return ERROR_MESSAGES[error?.code] || "Não foi possível continuar. Tente novamente.";
}

export default function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(credential.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError("");
    setNotice("");

    if (!email.trim()) {
      setError("Digite seu e-mail para recuperar a senha.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice("Enviamos um link de recuperação para seu e-mail.");
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setNotice("");
  };

  return (
    <div className="min-h-screen font-body px-5 py-10 flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="text-5xl mb-3">🐷</div>
          <h1 className="font-display text-3xl font-semibold" style={{ color: "var(--ink)" }}>Cofrinho</h1>
          <p className="text-sm mt-2" style={{ color: "var(--ink-soft)" }}>
            Sua conquista continua segura em qualquer dispositivo.
          </p>
        </div>

        <div className="rounded-3xl border p-5 shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl mb-5" style={{ background: "var(--bg)" }}>
            <button type="button" onClick={() => changeMode("login")}
              className="rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: mode === "login" ? "var(--surface)" : "transparent", color: "var(--ink)" }}>
              Entrar
            </button>
            <button type="button" onClick={() => changeMode("signup")}
              className="rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: mode === "signup" ? "var(--surface)" : "transparent", color: "var(--ink)" }}>
              Criar conta
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            {mode === "signup" && (
              <label className="block">
                <span className="text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>Seu nome</span>
                <div className="mt-1.5 flex items-center gap-2 rounded-2xl border px-3.5" style={{ borderColor: "var(--line)" }}>
                  <UserRound size={18} color="var(--ink-soft)" />
                  <input value={name} onChange={(e) => setName(e.target.value)} required
                    className="w-full py-3.5 outline-none bg-transparent text-sm" placeholder="Como devemos chamar você?" />
                </div>
              </label>
            )}

            <label className="block">
              <span className="text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>E-mail</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-2xl border px-3.5" style={{ borderColor: "var(--line)" }}>
                <Mail size={18} color="var(--ink-soft)" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                  className="w-full py-3.5 outline-none bg-transparent text-sm" placeholder="voce@email.com" />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>Senha</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-2xl border px-3.5" style={{ borderColor: "var(--line)" }}>
                <LockKeyhole size={18} color="var(--ink-soft)" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="w-full py-3.5 outline-none bg-transparent text-sm" placeholder="Mínimo de 6 caracteres" />
              </div>
            </label>

            {error && <p className="text-sm rounded-xl px-3 py-2" style={{ background: "var(--accent-lt)", color: "#8f2f17" }}>{error}</p>}
            {notice && <p className="text-sm rounded-xl px-3 py-2" style={{ background: "var(--primary-lt)", color: "var(--primary-dk)" }}>{notice}</p>}

            <button disabled={loading} type="submit"
              className="w-full rounded-2xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "var(--primary)", color: "#fff" }}>
              <LogIn size={18} />
              {loading ? "Aguarde..." : mode === "signup" ? "Criar minha conta" : "Entrar no Cofrinho"}
            </button>
          </form>

          {mode === "login" && (
            <button type="button" onClick={resetPassword} disabled={loading}
              className="w-full text-sm font-semibold mt-3 py-2" style={{ color: "var(--primary-dk)" }}>
              Esqueci minha senha
            </button>
          )}

          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1" style={{ background: "var(--line)" }} />
            <span className="text-xs" style={{ color: "var(--ink-soft)" }}>ou</span>
            <div className="h-px flex-1" style={{ background: "var(--line)" }} />
          </div>

          <button type="button" onClick={loginWithGoogle} disabled={loading}
            className="w-full rounded-2xl border py-3.5 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--surface)" }}>
            <Chrome size={18} /> Continuar com Google
          </button>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: "var(--ink-soft)" }}>
          Seus dados financeiros não são compartilhados com outros usuários.
        </p>
      </div>
    </div>
  );
}
