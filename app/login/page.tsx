"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";

const getRedirectUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  return undefined;
};

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [isRegister, setIsRegister] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  // Check for timeout logout message
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reason') === 'timeout') {
        setMessage("Du wurdest wegen Inaktivität automatisch abgemeldet.");
      }
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
        const params = new URLSearchParams(window.location.search);
        const callbackUrl = params.get('callbackUrl');
        if (callbackUrl) {
            router.push(decodeURIComponent(callbackUrl));
        } else {
            router.push('/dashboard');
        }
    }
  }, [user, authLoading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (isRegister) {
        // --- SIGN UP ---
        if(!username) {
          setMessage("Bitte gib einen Benutzernamen an!");
            setLoading(false);
            return;
        }

        if (username.trim().toLowerCase() === 'admin') {
            setMessage("Der Benutzername 'admin' ist nicht zulässig.");
            setLoading(false);
            return;
        }

        if (!birthdate) {
            setMessage('Bitte gib dein Geburtsdatum ein.');
            setLoading(false);
            return;
        }

        // Age check (>=18)
        try {
          const bd = new Date(birthdate);
          const today = new Date();
          let age = today.getFullYear() - bd.getFullYear();
          const m = today.getMonth() - bd.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
          if (isNaN(age) || age < 18) {
            setMessage('Du musst mindestens 18 Jahre alt sein, um dich zu registrieren.');
            setLoading(false);
            return;
          }
        } catch (e) {
          setMessage('Ungültiges Geburtsdatum.');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: getRedirectUrl(),
            // Brauerei-Name wird auch als Display-Name gesetzt (User = Brauerei)
            data: {
            display_name: username,
            birthdate: birthdate
          }
          }
        });
        
        if (error) {
            setMessage(error.message);
        } else if (data.user) {
            // Profil wird automatisch per Datenbank-Trigger erstellt
            setMessage("✅ Brauerei gegründet! Bestätige deine E-Mail-Adresse über den Link in deinem Postfach.");
            setAwaitingConfirmation(true);
            setIsRegister(false);
        }
    } else {
        // --- LOGIN ---
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMessage(error.message);
        } else if (data.user) {
          // Check if email is confirmed
          if (!data.user.email_confirmed_at) {
            setMessage("⚠️ Bitte bestätige deine E-Mail-Adresse zuerst.");
            setAwaitingConfirmation(true);
          } else {
             if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                const callbackUrl = params.get('callbackUrl');
                if (callbackUrl) {
                    router.push(decodeURIComponent(callbackUrl));
                } else {
                    router.push("/dashboard");
                }
             } else {
                router.push("/dashboard");
             }
          }
        }
    }
    setLoading(false);
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: getRedirectUrl()
        }
      });
      if (error) {
        setMessage("Fehler beim Versenden: " + error.message);
      } else {
        setMessage("✅ Bestätigungslink erneut versendet! Schau in dein Postfach.");
      }
    } catch (e: any) {
      setMessage("Fehler: " + (e?.message || "Unbekannter Fehler"));
    }
    setResendLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* --- Background FX (matching Landing Page) --- */}
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-cyan-900/20 blur-[140px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* --- Back to Home Link --- */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition group"
      >
        <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center group-hover:border-cyan-500 transition">
          ←
        </div>
        <span className="text-sm font-bold hidden sm:block">Zurück zur Startseite</span>
      </Link>

      {/* --- Login Card --- */}
      <div className="relative z-10 w-full max-w-md">
        
        {/* Logo Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-4 scale-125">
            <Logo />
          </div>
          <p className="text-zinc-500 text-sm">
            {isRegister ? 'Starte deine digitale Brauerei' : 'Willkommen zurück 👋'}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
          
          <form onSubmit={handleAuth} className="space-y-5">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Email
              </label>
              <input 
                type="email" 
                placeholder="dein@email.de" 
                required
                value={email}
                className="w-full bg-zinc-950/50 border border-zinc-800 p-4 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition text-white placeholder:text-zinc-600"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Passwort
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  required
                  value={password}
                  minLength={8}
                  className="w-full bg-zinc-950/50 border border-zinc-800 p-4 pr-12 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition text-white placeholder:text-zinc-600"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
              {isRegister && (
                  <p className="text-[10px] text-zinc-500 mt-2 px-1">
                      Min. 8 Zeichen, Klein- & Großbuchstaben, Zahlen & Symbole.
                  </p>
              )}
            </div>

            {/* Username & Birthdate (nur bei Registrierung) */}
            {isRegister && (
              <div className="animate-in fade-in slide-in-from-top-3 duration-300 space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-cyan-500 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="z.B. tims_craft" 
                      required
                      value={username}
                      className="w-full bg-cyan-950/10 border border-cyan-500/30 p-4 pl-12 rounded-xl focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition text-white placeholder:text-zinc-600 font-medium"
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-2 px-1">
                    So wirst du in der Community genannt.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-cyan-500 mb-2">Geburtsdatum</label>
                  <input
                    type="date"
                    required
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full bg-cyan-950/10 border border-cyan-500/30 p-3 rounded-xl focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition text-white"
                  />
                  <p className="text-[10px] text-zinc-500 mt-2 px-1">Wir benötigen dein Geburtsdatum, um sicherzustellen, dass du 18+ bist.</p>
                </div>
              </div>
            )}
            
            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-white text-black py-4 rounded-xl font-black text-lg hover:bg-cyan-400 hover:scale-105 transition transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Lade...
                </span>
              ) : (
                isRegister ? '🚀 Brauerei gründen' : '→ Einloggen'
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
            <p className="text-sm text-zinc-500 mb-3">
              {isRegister ? 'Du hast schon einen Account?' : 'Noch keine Brauerei?'}
            </p>
            <button 
              onClick={() => { 
                setIsRegister(!isRegister); 
                setMessage(""); 
                setEmail(""); 
                setPassword(""); 
                setUsername(""); 
                setBirthdate(""); 
              }}
              className="text-sm font-bold text-cyan-400 hover:text-cyan-300 transition underline decoration-cyan-400/30 underline-offset-4 hover:decoration-cyan-300"
            >
              {isRegister ? 'Hier einloggen' : 'Jetzt kostenlos registrieren'}
            </button>
          </div>
          
          {/* Feedback Message */}
          {message && (
            <div className={`mt-6 p-4 rounded-xl text-sm font-medium text-center border ${
              message.includes("Bestätige") || message.includes("✅") 
                ? "bg-green-950/30 border-green-800/30 text-green-400" 
                : "bg-red-950/30 border-red-800/30 text-red-400"
            }`}>
              {message}
            </div>
          )}

          {/* Resend Verification Button */}
          {awaitingConfirmation && (
            <div className="mt-6 p-4 rounded-xl bg-amber-950/30 border border-amber-800/30">
              <p className="text-xs text-amber-400 mb-4">
                Hast du die Mail nicht bekommen?
              </p>
              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg font-bold text-sm transition disabled:opacity-50"
              >
                {resendLoading ? "Sende..." : "Bestätigungslink erneut senden"}
              </button>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <p className="text-center text-zinc-600 text-xs mt-6">
          Mit der Registrierung stimmst du unseren <a href="/terms" className="text-cyan-400 underline hover:text-cyan-300">AGB</a> und der <a href="/privacy" className="text-cyan-400 underline hover:text-cyan-300">Datenschutzerklärung</a> zu.
        </p>
      </div>
    </div>
  );
}