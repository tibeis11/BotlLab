'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/lib/hooks/useSupabase'
import Link from 'next/link'
import Logo from '@/app/components/Logo'

export default function ResetPasswordPage() {
  const supabase = useSupabase()
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase sets the session after exchangeCodeForSession in the callback.
  // We wait for onAuthStateChange to confirm the session is live before rendering the form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true)
      } else {
        // No session means the user navigated here directly without a valid reset link
        router.replace('/login')
      }
    })
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setIsError(true)
      setMessage('Die Passwörter stimmen nicht überein.')
      return
    }
    if (password.length < 8) {
      setIsError(true)
      setMessage('Das Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }

    setLoading(true)
    setMessage('')
    setIsError(false)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setIsError(true)
      setMessage(error.message)
    } else {
      setDone(true)
      // Sign out so the user logs in fresh with the new password
      await supabase.auth.signOut()
      setTimeout(() => router.push('/login'), 3000)
    }
    setLoading(false)
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background FX */}
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-cyan-900/20 blur-[140px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Back link */}
      <Link
        href="/login"
        className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition group"
      >
        <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center group-hover:border-cyan-500 transition">
          ←
        </div>
        <span className="text-sm font-bold hidden sm:block">Zum Login</span>
      </Link>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-4 scale-125">
            <Logo />
          </div>
          <p className="text-zinc-500 text-sm">Neues Passwort festlegen</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center space-y-4 py-4">
              <div className="text-4xl">✅</div>
              <p className="text-white font-bold text-lg">Passwort geändert!</p>
              <p className="text-zinc-400 text-sm">Du wirst in Kürze zum Login weitergeleitet…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                  Neues Passwort
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 Zeichen"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800 p-4 pr-12 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition text-white placeholder:text-zinc-600"
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
                <p className="text-[10px] text-zinc-500 mt-2 px-1">
                  Min. 8 Zeichen, Klein- &amp; Großbuchstaben, Zahlen &amp; Symbole.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                  Passwort bestätigen
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Passwort wiederholen"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`w-full bg-zinc-950/50 border p-4 rounded-xl focus:ring-2 outline-none transition text-white placeholder:text-zinc-600 ${
                    confirm && confirm !== password
                      ? 'border-red-500/60 focus:border-red-400 focus:ring-red-400/20'
                      : confirm && confirm === password
                      ? 'border-emerald-500/60 focus:border-emerald-400 focus:ring-emerald-400/20'
                      : 'border-zinc-800 focus:border-cyan-500 focus:ring-cyan-500/20'
                  }`}
                />
                {confirm && confirm === password && (
                  <p className="text-[11px] text-emerald-400 mt-2 px-1 font-medium">Passwörter stimmen überein ✓</p>
                )}
                {confirm && confirm !== password && (
                  <p className="text-[11px] text-red-400 mt-2 px-1 font-medium">Passwörter stimmen nicht überein</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full bg-white text-black py-4 rounded-xl font-black text-lg hover:bg-cyan-400 hover:scale-105 transition transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Speichern…
                  </span>
                ) : (
                  '🔐 Passwort speichern'
                )}
              </button>
            </form>
          )}

          {message && !done && (
            <div className={`mt-6 p-4 rounded-xl text-sm font-medium text-center border ${
              isError
                ? 'bg-red-950/30 border-red-800/30 text-red-400'
                : 'bg-green-950/30 border-green-800/30 text-green-400'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
