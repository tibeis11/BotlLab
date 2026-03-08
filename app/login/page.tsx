"use client";
import { useState, useEffect } from "react";
import { useSupabase } from "@/lib/hooks/useSupabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { intentToAppMode } from "@/lib/types/user-mode";
import { FlaskConical, QrCode, ArrowLeft, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type LoginMode = "brewer" | "drinker" | null;

const getRedirectUrl = (callbackUrl?: string) => {
  if (typeof window !== 'undefined') {
    const base = `${window.location.origin}/auth/callback`;
    if (callbackUrl) {
      return `${base}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }
    return base;
  }
  return undefined;
};

export default function LoginPage() {
  const supabase = useSupabase();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  // null = no mode chosen yet, 'brewer'/'drinker' = specific registration path
  const [mode, setMode] = useState<LoginMode>(null);
  // Stores URL-detected intent so we can auto-set mode when switching to register
  const [detectedIntent, setDetectedIntent] = useState<'brew' | 'drink' | null>(null);

  const [isRegister, setIsRegister] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const router = useRouter();


  const [timeoutMessage, setTimeoutMessage] = useState("");

  // Detect intent from URL on first mount — store for later, don't switch view
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const intent = params.get('intent');
      const callbackUrl = params.get('callbackUrl');

      // Store intent for auto-mode when toggling to register
      if (intent === 'brew') {
        setDetectedIntent('brew');
      } else if (intent === 'drink' || (callbackUrl && callbackUrl.startsWith('/b/'))) {
        setDetectedIntent('drink');
      } else {
        // Fallback: infer intent from referrer
        try {
          const ref = document.referrer ? new URL(document.referrer) : null;
          if (ref && ref.origin === window.location.origin) {
            if (ref.pathname === '/') {
              setDetectedIntent('brew');
            } else if (ref.pathname.startsWith('/b/')) {
              setDetectedIntent('drink');
            }
          }
        } catch {}
      }

      if (params.get('reason') === 'timeout') {
        setTimeoutMessage("Du wurdest wegen Inaktivität automatisch abgemeldet.");
      }
    }
  }, []);

  useEffect(() => {
    if (timeoutMessage) setMessage(timeoutMessage);
  }, [timeoutMessage]);

  // Debounced live username uniqueness check
  useEffect(() => {
    if (!isRegister || !username || username.length < 2) {
      setUsernameError("");
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }
    if (username.trim().toLowerCase() === 'admin') {
      setUsernameError("Der Benutzername 'admin' ist reserviert.");
      setUsernameAvailable(false);
      return;
    }
    setCheckingUsername(true);
    setUsernameAvailable(null);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .ilike('display_name', username.trim())
        .maybeSingle();
      setCheckingUsername(false);
      if (data) {
        setUsernameError("Dieser Username ist bereits vergeben. Bitte wähle einen anderen.");
        setUsernameAvailable(false);
      } else {
        setUsernameError("");
        setUsernameAvailable(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username, isRegister]);

  // ZWEI WELTEN: Mode-basierter Redirect nach Login
  const redirectAfterAuth = async (userId: string) => {
    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get('callbackUrl');
    const intent = params.get('intent');

    // Phase 8.2: intent=drink → app_mode auf 'drinker' setzen (wenn nicht bereits Brauer)
    let resolvedAppMode: string | null = null;
    if (intent === 'drink' || !callbackUrl) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('app_mode')
        .eq('id', userId)
        .single();
      resolvedAppMode = profile?.app_mode ?? null;
      if (intent === 'drink' && resolvedAppMode !== 'brewer') {
        await supabase.from('profiles').update({ app_mode: 'drinker' }).eq('id', userId);
        resolvedAppMode = 'drinker';
      }
    }

    if (callbackUrl) {
      router.push(decodeURIComponent(callbackUrl));
    } else {
      const target = resolvedAppMode === 'brewer' ? '/dashboard' : '/my-cellar';
      router.push(target);
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
        redirectAfterAuth(user.id);
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

        if (usernameError || usernameAvailable === false) {
            setMessage(usernameError || "Dieser Username ist bereits vergeben. Bitte wähle einen anderen.");
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

        // ZWEI WELTEN: intent aus URL lesen und als app_mode durchreichen
        const params = new URLSearchParams(window.location.search);
        // Fall back to current mode state if no URL intent is present
        const urlIntent = params.get('intent');
        const intent = urlIntent ?? (mode === 'brewer' ? 'brew' : 'drink');
        const callbackUrl = params.get('callbackUrl') || undefined;
        const appMode = intentToAppMode(intent);

        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: getRedirectUrl(callbackUrl),
            data: {
              display_name: username,
              birthdate: birthdate,
              app_mode: appMode,
            }
          }
        });
        
        if (error) {
            if (error.message.toLowerCase().includes('username') || error.message.toLowerCase().includes('display_name') || error.message.toLowerCase().includes('unique')) {
                setMessage("Dieser Username ist bereits vergeben. Bitte wähle einen anderen.");
            } else if (error.message.includes('Database error')) {
                setMessage("Registrierung fehlgeschlagen. Der gewählte Username könnte bereits vergeben sein.");
            } else {
                setMessage(error.message);
            }
        } else if (data.user) {
            // Profil wird automatisch per Datenbank-Trigger erstellt
            setMessage("Konto erstellt! Bestätige deine E-Mail-Adresse über den Link in deinem Postfach.");
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
            setMessage("Bitte bestätige deine E-Mail-Adresse zuerst.");
            setAwaitingConfirmation(true);
          } else {
            // ZWEI WELTEN: Mode-basierter Redirect
            redirectAfterAuth(data.user.id);
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
        setMessage("Bestätigungslink erneut versendet! Schau in dein Postfach.");
      }
    } catch (e: any) {
      setMessage("Fehler: " + (e?.message || "Unbekannter Fehler"));
    }
    setResendLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?type=recovery`
        : undefined,
    });
    if (error) setMessage(error.message);
    else setForgotSent(true);
    setForgotLoading(false);
  };

  const resetForm = () => {
    setEmail(""); setPassword(""); setUsername(""); setBirthdate("");
    setUsernameError(""); setUsernameAvailable(null); setMessage("");
    setIsForgotPassword(false); setForgotSent(false); setAwaitingConfirmation(false);
  };

  // Mode picker → select a mode and go to register form
  const selectMode = (m: LoginMode) => {
    resetForm();
    setMode(m);
    setIsRegister(true);
  };

  // Toggle from login to register — auto-detect mode from URL intent
  const toggleToRegister = () => {
    resetForm();
    if (detectedIntent === 'brew') {
      setMode('brewer');
    } else if (detectedIntent === 'drink') {
      setMode('drinker');
    }
    // If no detected intent → mode stays null → mode picker will show
    setIsRegister(true);
  };

  // Toggle from register back to login
  const toggleToLogin = () => {
    resetForm();
    setMode(null);
    setIsRegister(false);
  };

  if (!mounted) return null;

  const isBrewerMode = mode === 'brewer';

  // Accent style palette — amber for brewers, cyan/brand for drinkers
  const accent = isBrewerMode
    ? {
        text: 'text-amber-400',
        textHover: 'hover:text-amber-300',
        label: 'text-amber-500',
        border: 'border-amber-500/30',
        borderFocus: 'focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20',
        bg: 'bg-amber-950/20',
        glow: 'bg-amber-900/20',
        glowSecondary: 'bg-amber-900/10',
        badge: 'border-amber-500/30 bg-amber-950/20',
        button: 'bg-amber-500 hover:bg-amber-400 text-black',
        underline: 'underline decoration-amber-400/30 hover:decoration-amber-300 underline-offset-4',
      }
    : {
        text: 'text-brand',
        textHover: 'hover:text-brand-hover',
        label: 'text-brand',
        border: 'border-brand/30',
        borderFocus: 'focus:border-brand focus:ring-2 focus:ring-brand/20',
        bg: 'bg-brand-bg',
        glow: 'bg-cyan-900/20',
        glowSecondary: 'bg-purple-900/10',
        badge: 'border-brand/30 bg-brand-bg',
        button: 'bg-brand hover:bg-brand-hover text-black',
        underline: 'underline decoration-brand/30 hover:decoration-brand-hover underline-offset-4',
      };

  // Show the auth form card for login (default) or register-with-mode-set
  const showAuthForm = !isRegister || !!mode;

  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background glows */}
      <div className={`absolute top-1/3 left-1/4 w-[600px] h-[600px] ${isRegister && mode ? accent.glow : 'bg-cyan-900/10'} blur-[140px] rounded-full pointer-events-none animate-pulse`} />
      <div className={`absolute bottom-1/4 right-1/4 w-[500px] h-[500px] ${isRegister && mode ? accent.glowSecondary : 'bg-amber-900/10'} blur-[120px] rounded-full pointer-events-none`} />

      {/* Back navigation */}
      {isRegister ? (
        <button
          onClick={() => {
            if (mode && !detectedIntent) {
              // Came from picker → go back to picker
              setMode(null);
              resetForm();
            } else {
              // Auto-detected or picker → go back to login
              toggleToLogin();
            }
          }}
          className="absolute top-8 left-8 flex items-center gap-2 text-text-muted hover:text-text-primary transition group"
        >
          <div className="w-8 h-8 bg-surface border border-border rounded-lg flex items-center justify-center group-hover:border-border-hover transition">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold hidden sm:block">
            {mode && !detectedIntent ? 'Andere Wahl' : 'Zurück zur Anmeldung'}
          </span>
        </button>
      ) : (
        <Link
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-text-muted hover:text-text-primary transition group"
        >
          <div className="w-8 h-8 bg-surface border border-border rounded-lg flex items-center justify-center group-hover:border-border-hover transition">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold hidden sm:block">Zurück zur Startseite</span>
        </Link>
      )}

      {/* ===== MODE PICKER (only when registering without auto-detected intent) ===== */}
      {isRegister && !mode && (
        <div className="relative z-10 w-full max-w-2xl">
          <div className="text-center mb-10 flex flex-col items-center">
            <div className="mb-6 scale-110">
              <Logo />
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Registrieren</h1>
            <p className="text-text-muted text-sm">Wie möchtest du BotlLab nutzen?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Consumer / Drinker card */}
            <button
              onClick={() => selectMode('drinker')}
              className="group bg-surface border border-border rounded-2xl p-8 text-left hover:border-brand/60 hover:bg-brand-bg transition-all duration-200 hover:shadow-lg hover:shadow-brand/20"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-bg border border-brand/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <QrCode className="w-7 h-7 text-brand" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Ich entdecke Biere</h2>
              <p className="text-text-muted text-sm leading-relaxed mb-4">
                Du hast einen QR-Code gescannt, willst Biere bewerten oder dein Geschmacksprofil aufbauen.
              </p>
              <div className="space-y-1.5 mb-6">
                {['Biere scannen & entdecken', 'Bewertungen & Ratings', 'Taste-DNA entwickeln'].map((f) => (
                  <p key={f} className="text-xs text-text-secondary">{f}</p>
                ))}
              </div>
              <div className="flex items-center gap-2 text-brand text-sm font-bold group-hover:gap-3 transition-all">
                <span>Als Biertrinker registrieren</span>
                <span>→</span>
              </div>
            </button>

            {/* Brewer card */}
            <button
              onClick={() => selectMode('brewer')}
              className="group bg-surface border border-border rounded-2xl p-8 text-left hover:border-amber-500/60 hover:bg-amber-950/20 transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/20"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <FlaskConical className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Ich bin Brauer</h2>
              <p className="text-text-muted text-sm leading-relaxed mb-4">
                Du braust selbst oder betreibst eine Brauerei und willst Produkte, Rezepte & Kundenfeedback digital verwalten.
              </p>
              <div className="space-y-1.5 mb-6">
                {['Rezepte & Sudsessions tracken', 'Labels & QR-Codes erstellen', 'Analytics & Kundenfeedback'].map((f) => (
                  <p key={f} className="text-xs text-text-secondary">{f}</p>
                ))}
              </div>
              <div className="flex items-center gap-2 text-amber-400 text-sm font-bold group-hover:gap-3 transition-all">
                <span>Als Brauer registrieren</span>
                <span>→</span>
              </div>
            </button>
          </div>

          <p className="text-center text-text-disabled text-xs mt-8">
            Mit der Registrierung stimmst du unseren{' '}
            <a href="/terms" className="text-brand underline hover:text-brand-hover">AGB</a>{' '}
            und der{' '}
            <a href="/privacy" className="text-brand underline hover:text-brand-hover">Datenschutzerklärung</a> zu.
          </p>
        </div>
      )}

      {/* ===== AUTH FORM (Login default, or Registration with mode set) ===== */}
      {showAuthForm && (
        <div className="relative z-10 w-full max-w-md">

          {/* Headline + optional mode badge */}
          <div className="text-center mb-8 flex flex-col items-center">
            <div className="mb-5 scale-110">
              <Logo />
            </div>

            {/* Mode badge — only during registration */}
            {isRegister && mode && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${accent.badge} mb-3`}>
                {isBrewerMode
                  ? <FlaskConical className={`w-3.5 h-3.5 ${accent.text}`} />
                  : <QrCode className={`w-3.5 h-3.5 ${accent.text}`} />}
                <span className={`text-xs font-bold ${accent.text}`}>
                  {isBrewerMode ? 'Brauer-Account' : 'Biertrinker-Account'}
                </span>
              </div>
            )}

            <h1 className="text-xl font-bold text-text-primary">
              {isRegister
                ? (isBrewerMode ? 'Brauerei anlegen' : 'Community beitreten')
                : 'Willkommen bei BotlLab'}
            </h1>
            <p className={`text-sm mt-1 ${isRegister ? accent.text : 'text-text-muted'}`}>
              {isRegister
                ? (isBrewerMode ? 'Rezepte, Labels & Analytics' : 'Entdecke & bewerte Biere')
                : 'Melde dich mit deinem Account an'}
            </p>
          </div>

          {/* Main card */}
          <div className="bg-surface border border-border rounded-2xl p-8 shadow-xl">

            {isForgotPassword ? (
              /* ---- Passwort vergessen ---- */
              <div className="space-y-5">
                {forgotSent ? (
                  <div className="text-center space-y-4 py-6">
                    <div className="w-12 h-12 rounded-full bg-success-bg border border-success/30 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    </div>
                    <p className="text-text-primary font-bold text-lg">E-Mail versendet!</p>
                    <p className="text-text-muted text-sm">Schau in dein Postfach und klicke auf den Reset-Link. Der Link ist 1 Stunde gültig.</p>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <p className="text-sm text-text-muted leading-relaxed">
                      Gib deine E-Mail-Adresse ein — wir schicken dir einen Link zum Zurücksetzen deines Passworts.
                    </p>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Email</label>
                      <input
                        type="email"
                        placeholder="dein@email.de"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full bg-background border border-border p-4 rounded-xl ${accent.borderFocus} outline-none transition text-text-primary placeholder:text-text-disabled`}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={forgotLoading || !email}
                      className={`w-full ${accent.button} py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
                    >
                      {forgotLoading
                        ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Sendet…</span>
                        : 'Reset-Link senden'}
                    </button>
                  </form>
                )}
                {message && (
                  <div className={`mt-4 p-4 rounded-xl text-sm font-medium text-center border ${
                    message.includes('Bestätigungslink') || forgotSent
                      ? 'bg-success-bg border-success/30 text-success'
                      : 'bg-error-bg border-error/30 text-error'
                  }`}>{message}</div>
                )}
                <div className="mt-6 pt-6 border-t border-border text-center">
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(false); setMessage(''); setForgotSent(false); }}
                    className={`text-sm font-bold ${accent.text} ${accent.textHover} ${accent.underline} transition`}
                  >
                    ← Zurück zur Anmeldung
                  </button>
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleAuth} className="space-y-5">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Email</label>
                    <input
                      type="email"
                      placeholder="dein@email.de"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full bg-background border border-border p-4 rounded-xl ${accent.borderFocus} outline-none transition text-text-primary placeholder:text-text-disabled`}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Passwort</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={password}
                        minLength={8}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full bg-background border border-border p-4 pr-12 rounded-xl ${accent.borderFocus} outline-none transition text-text-primary placeholder:text-text-disabled`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {isRegister && (
                      <p className="text-[10px] text-text-disabled mt-2 px-1">
                        Min. 8 Zeichen, Klein- & Großbuchstaben, Zahlen & Symbole.
                      </p>
                    )}
                  </div>

                  {/* Forgot password — login only */}
                  {!isRegister && (
                    <div className="text-right -mt-1">
                      <button
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setMessage(''); }}
                        className="text-xs text-text-muted hover:text-text-secondary transition"
                      >
                        Passwort vergessen?
                      </button>
                    </div>
                  )}

                  {/* Register-only fields */}
                  {isRegister && (
                    <div className="animate-in fade-in slide-in-from-top-3 duration-300 space-y-3">
                      {/* Username */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
                          {isBrewerMode ? 'Brauereiname / Username' : 'Username'}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder={isBrewerMode ? 'z.B. tims_brauerei' : 'z.B. bierfreund42'}
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={`w-full bg-surface border p-4 pl-12 pr-10 rounded-xl focus:ring-2 outline-none transition text-text-primary placeholder:text-text-disabled font-medium ${
                              usernameError
                                ? 'border-error/60 focus:border-error focus:ring-error/20'
                                : usernameAvailable
                                ? 'border-success/60 focus:border-success focus:ring-success/20'
                                : `${accent.border} ${accent.borderFocus}`
                            }`}
                          />
                          <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${accent.text} pointer-events-none`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {checkingUsername && <Loader2 className="w-4 h-4 text-text-muted animate-spin" />}
                            {!checkingUsername && usernameAvailable === true && <CheckCircle2 className="w-4 h-4 text-success" />}
                            {!checkingUsername && usernameAvailable === false && <XCircle className="w-4 h-4 text-error" />}
                          </div>
                        </div>
                        {usernameError ? (
                          <p className="text-[11px] text-error mt-2 px-1 font-medium">{usernameError}</p>
                        ) : usernameAvailable ? (
                          <p className="text-[11px] text-success mt-2 px-1 font-medium">Username ist verfügbar</p>
                        ) : (
                          <p className="text-[10px] text-text-disabled mt-2 px-1">
                            {isBrewerMode ? 'Dein Brauereiname in der Community.' : 'So wirst du in der Community genannt.'}
                          </p>
                        )}
                      </div>

                      {/* Birthdate */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Geburtsdatum</label>
                        <input
                          type="date"
                          required
                          value={birthdate}
                          onChange={(e) => setBirthdate(e.target.value)}
                          className={`w-full bg-surface border ${accent.border} p-3 rounded-xl ${accent.borderFocus} outline-none transition text-text-primary`}
                        />
                        <p className="text-[10px] text-text-disabled mt-2 px-1">Du musst mindestens 18 Jahre alt sein.</p>
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full ${accent.button} py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-6`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Lade...
                      </span>
                    ) : (
                      isRegister
                        ? (isBrewerMode ? 'Brauerei starten' : 'Community beitreten')
                        : 'Anmelden'
                    )}
                  </button>
                </form>

                {/* Toggle Login ↔ Register */}
                <div className="mt-8 pt-6 border-t border-border text-center">
                  <p className="text-sm text-text-muted mb-3">
                    {isRegister
                      ? 'Du hast schon einen Account?'
                      : 'Noch kein Account?'}
                  </p>
                  <button
                    onClick={() => {
                      if (isRegister) {
                        toggleToLogin();
                      } else {
                        toggleToRegister();
                      }
                    }}
                    className={`text-sm font-bold ${accent.text} ${accent.textHover} ${accent.underline} transition`}
                  >
                    {isRegister
                      ? 'Hier anmelden'
                      : 'Jetzt kostenlos registrieren'}
                  </button>
                </div>

                {/* Feedback message */}
                {message && (
                  <div className={`mt-6 p-4 rounded-xl text-sm font-medium text-center border ${
                    message.includes("Bestätige") || message.includes("Konto erstellt")
                      ? "bg-success-bg border-success/30 text-success"
                      : "bg-error-bg border-error/30 text-error"
                  }`}>{message}</div>
                )}

                {/* Resend verification */}
                {awaitingConfirmation && (
                  <div className="mt-6 p-4 rounded-xl bg-warning-bg border border-warning/30">
                    <p className="text-xs text-warning mb-4">Hast du die Mail nicht bekommen?</p>
                    <button
                      onClick={handleResendVerification}
                      disabled={resendLoading}
                      className="w-full bg-warning hover:bg-warning/80 text-black py-2 rounded-lg font-bold text-sm transition disabled:opacity-50"
                    >
                      {resendLoading ? "Sende..." : "Bestätigungslink erneut senden"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <p className="text-center text-text-disabled text-xs mt-6">
            Mit der Registrierung stimmst du unseren{' '}
            <a href="/terms" className={`${accent.text} underline ${accent.textHover}`}>AGB</a>{' '}
            und der{' '}
            <a href="/privacy" className={`${accent.text} underline ${accent.textHover}`}>Datenschutzerklärung</a> zu.
          </p>
        </div>
      )}
    </div>
  );
}

