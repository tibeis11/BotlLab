'use client';

import Link from "next/link";
import Logo from "./components/Logo";
import Header from "./components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black">
      
      {/* --- NAVBAR --- */}
      <Header />

      <main className="pt-20">
        
        {/* --- HERO SECTION --- */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
          {/* Background FX */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/20 blur-[140px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold uppercase tracking-widest text-cyan-400 mb-4 hover:border-cyan-900 transition cursor-default">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
              Jetzt Live verfügbar
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9]">
              Nie wieder <br/>
              <span className="text-zinc-700">Etiketten kratzen.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              BotlLab verwandelt jede Flasche in ein <strong className="text-white">smartes Device</strong>. 
              Kleb einmal einen QR-Code auf und verlinke ihn immer wieder neu mit deinen Rezepten.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-10 py-5 bg-cyan-500 text-black font-black text-lg rounded-2xl hover:bg-cyan-400 hover:scale-105 transition transform shadow-[0_0_40px_-10px_rgba(6,182,212,0.5)]"
              >
                Kostenlos loslegen
              </Link>
              <a 
                href="#features" 
                className="w-full sm:w-auto px-10 py-5 bg-zinc-900/50 border border-zinc-800 text-white font-bold text-lg rounded-2xl hover:bg-zinc-800 transition backdrop-blur-sm"
              >
                Wie es funktioniert ↓
              </a>
            </div>

            <div className="pt-12 flex justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition duration-500">
               <span className="text-zinc-500 font-bold">🍺 Craft Beer</span>
               <span className="text-zinc-500 font-bold">🍷 Wein</span>
               <span className="text-zinc-500 font-bold">🥤 Limo</span>
               <span className="text-zinc-500 font-bold">🍎 Cider</span>
            </div>
          </div>
        </section>

        {/* --- PROBLEM / SOLUTION --- */}
        <section className="py-32 bg-zinc-950 border-y border-white/5">
           <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
              <div>
                 <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                    Die <span className="text-red-500 line-through">Hölle</span> des Hobbybrauens.
                 </h2>
                 <p className="text-lg text-zinc-400 mb-8">
                    Du kennst es: Du hast Stunden mit dem Brauen verbracht. Und dann? 
                    Flaschen waschen, alte Etiketten einweichen, kratzen, kleben, trocknen lassen. 
                    Und nach dem Trinken geht alles von vorne los.
                 </p>
                 <ul className="space-y-4 text-zinc-300">
                    <li className="flex items-center gap-3">❌ Verklebte Spüle</li>
                    <li className="flex items-center gap-3">❌ Teurer Drucker-Toner</li>
                    <li className="flex items-center gap-3">❌ Papier-Müll ohne Ende</li>
                 </ul>
              </div>
              <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 blur-3xl rounded-full" />
                  <div className="relative bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl space-y-6 transform rotate-2 hover:rotate-0 transition duration-500">
                      <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
                         <div className="w-16 h-16 bg-cyan-500 rounded-xl flex items-center justify-center text-3xl text-black font-bold">
                           QR
                         </div>
                         <div>
                            <h3 className="font-bold text-xl text-white">BotlLab ID #4092</h3>
                            <p className="text-cyan-400 font-mono text-sm">Status: Aktiv</p>
                         </div>
                      </div>
                      <div className="space-y-3">
                         <div className="h-4 bg-zinc-800 rounded w-3/4 animate-pulse"></div>
                         <div className="h-4 bg-zinc-800 rounded w-1/2 animate-pulse"></div>
                         <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50 text-sm text-zinc-400 mt-4">
                            "BotlLab löst das Problem dauerhaft. Ein Sticker. Kein Kratzen mehr."
                         </div>
                      </div>
                  </div>
              </div>
           </div>
        </section>

        {/* --- FEATURES GRID --- */}
        <section id="features" className="py-32 px-6">
           <div className="max-w-7xl mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-20">
                 <h2 className="text-4xl md:text-5xl font-black mb-6">Deine Brauerei 2.0</h2>
                 <p className="text-zinc-400 text-lg">BotlLab ist mehr als nur ein QR-Code Generator. Es ist dein komplettes digitales Backend.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                 {/* Feature 1 */}
                 <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-3xl hover:bg-zinc-900 hover:border-cyan-900/50 transition group">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:bg-cyan-500 group-hover:text-black transition">
                      🎨
                    </div>
                    <h3 className="font-bold text-2xl mb-4">KI Design Studio</h3>
                    <p className="text-zinc-400 leading-relaxed">
                       Kein Designer? Kein Problem. Unsere KI generiert einzigartige Etiketten-Kunstwerke basierend auf deinen Zutaten. Egal ob Hopfen-Bombe oder edler Rotwein.
                    </p>
                 </div>

                 {/* Feature 2 */}
                 <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-3xl hover:bg-zinc-900 hover:border-cyan-900/50 transition group">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:bg-cyan-500 group-hover:text-black transition">
                      📦
                    </div>
                    <h3 className="font-bold text-2xl mb-4">Digitales Inventar</h3>
                    <p className="text-zinc-400 leading-relaxed">
                       Behalte den Überblick über deinen Keller. Scanne eine Kiste und weise ihr in Sekunden ein neues Rezept zu. Du weißt immer, was trinkreif ist.
                    </p>
                 </div>

                 {/* Feature 3 */}
                 <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-3xl hover:bg-zinc-900 hover:border-cyan-900/50 transition group">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:bg-cyan-500 group-hover:text-black transition">
                      🔗
                    </div>
                    <h3 className="font-bold text-2xl mb-4">Public Profile</h3>
                    <p className="text-zinc-400 leading-relaxed">
                       Zeige deinen Freunden was du braust. Jeder Scan führt auf eine wunderschöne Info-Seite mit Rezept-Details, Bitterwerten und deiner Brau-Story.
                    </p>
                 </div>
                 
                 {/* Feature 4: Feedback & Ratings (NEU) */}
                 <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-3xl hover:bg-zinc-900 hover:border-cyan-900/50 transition group">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:bg-cyan-500 group-hover:text-black transition">
                      ⭐
                    </div>
                    <h3 className="font-bold text-2xl mb-4">Feedback Loop</h3>
                    <p className="text-zinc-400 leading-relaxed">
                       Sammle ehrliches Feedback. Deine Taster können Bier direkt am Glas bewerten (1-5 Sterne). Sehe sofort, welches Rezept der Renner ist.
                    </p>
                 </div>
              </div>
           </div>
        </section>

        {/* --- CATCHY CTA --- */}
        <section className="py-32 px-6 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/20 to-black pointer-events-none" />
           <div className="relative max-w-4xl mx-auto text-center bg-zinc-900 border border-zinc-800 p-12 md:p-20 rounded-[3rem]">
              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                 Bereit für die <br/>
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Zukunft des Brauens?</span>
              </h2>
              <p className="text-xl text-zinc-400 mb-10 max-w-xl mx-auto">
                 Schließe dich hunderten von Brauern an, die ihre Spülbürste gegen smartes Inventar-Management getauscht haben.
              </p>
              <Link 
                href="/login" 
                className="inline-block w-full sm:w-auto px-12 py-5 bg-white text-black font-black text-xl rounded-2xl hover:bg-cyan-400 hover:scale-105 transition transform"
              >
                Account kostenlos erstellen
              </Link>
              <p className="mt-6 text-sm text-zinc-600 font-medium">Keine Kreditkarte nötig. Sofort loslegen.</p>
           </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="border-t border-zinc-900 bg-black py-12 px-6 text-center md:text-left">
         <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start">
               <div className="mb-4 scale-125 origin-left"><Logo /></div>
               <p className="text-zinc-500 text-sm">© 2024 BotlLab Inc. Made with 🍺 in Germany.</p>
            </div>
            <div className="flex gap-8 text-sm font-bold text-zinc-400">
               <Link href="/login" className="hover:text-white transition">Login</Link>
               <Link href="/impressum" className="hover:text-white transition">Impressum</Link>
            </div>
         </div>
      </footer>

    </div>
  );
}
