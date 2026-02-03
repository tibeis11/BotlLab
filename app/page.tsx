'use client';

import Link from "next/link";
import Logo from "./components/Logo";
import Header from "./components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black">
      
      {/* --- NAVBAR --- */}
      <Header />

      <main>
        
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

            <div className="pt-12 flex flex-wrap justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition duration-500">
               <span className="text-zinc-500 font-bold flex items-center gap-2">🍺 Craft Beer</span>
               <span className="text-zinc-500 font-bold flex items-center gap-2">🍷 Wein</span>
               <span className="text-zinc-500 font-bold flex items-center gap-2">🥤 Limo</span>
               <span className="text-zinc-500 font-bold flex items-center gap-2">👯‍♀️ Teams</span>
               <span className="text-zinc-500 font-bold flex items-center gap-2">🏆 Achievements</span>
            </div>
          </div>
        </section>

        {/* --- SOCIAL PROOF & SQUAD SECTION (NEW) --- */}
        <section className="py-24 bg-zinc-950 border-y border-white/5 relative overflow-hidden">
             
           <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
               <div className="relative order-2 lg:order-1">
                  {/* Abstract Squad Visual */}
                  <div className="relative bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl space-y-4 max-w-sm mx-auto lg:ml-auto transform -rotate-2 hover:rotate-0 transition duration-500">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                          <h3 className="font-bold text-white">Hopfenrebellen Squad</h3>
                          <span className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded border border-cyan-800">3 Mitglieder</span>
                      </div>
                      <div className="space-y-3">
                          <div className="flex items-center gap-3 p-2 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 text-xs">👨‍🍳</div>
                              <div className="flex-1">
                                  <div className="h-2 bg-zinc-800 rounded w-20 mb-1"></div>
                                  <div className="h-1.5 bg-zinc-800/50 rounded w-12"></div>
                              </div>
                              <span className="text-[10px] text-zinc-500">Meister</span>
                          </div>
                           <div className="flex items-center gap-3 p-2 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 text-xs">🎓</div>
                              <div className="flex-1">
                                  <div className="h-2 bg-zinc-800 rounded w-24 mb-1"></div>
                                  <div className="h-1.5 bg-zinc-800/50 rounded w-16"></div>
                              </div>
                              <span className="text-[10px] text-zinc-500">Geselle</span>
                          </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-zinc-800 text-center">
                          <span className="text-xs text-zinc-400">Neues Achievement freigeschaltet: <strong>Team Brewer</strong> 🏆</span>
                      </div>
                  </div>
               </div>
               
               <div className="order-1 lg:order-2">
                   <span className="text-cyan-400 font-bold tracking-widest uppercase text-xs mb-2 block">Neu: Squads & Teams</span>
                   <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight text-white">
                      Brauen ist <span className="text-cyan-400">Teamsport</span>.
                   </h2>
                   <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
                      Egal ob WG-Brauerei, Verein oder einfach Freunde: Gründe dein eigenes <strong>Squad</strong>. 
                      Verwaltet zusammen Rezepte, teilt euch das Inventar und feiert gemeinsame Erfolge im Feed.
                   </p>
                   <ul className="space-y-4 text-zinc-300 font-medium">
                      <li className="flex items-center gap-3"><span className="text-xl">🤝</span> Gemeinsames Dashboard</li>
                      <li className="flex items-center gap-3"><span className="text-xl">📢</span> Team-Newsfeed</li>
                      <li className="flex items-center gap-3"><span className="text-xl">🏆</span> Squad-Achievements sammeln</li>
                   </ul>
               </div>
           </div>
        </section>

        {/* --- PROBLEM / SOLUTION --- */}
        <section className="py-24 bg-zinc-950">
           <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">
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
                            &quot;BotlLab löst das Problem dauerhaft. Ein Sticker. Kein Kratzen mehr.&quot;
                         </div>
                      </div>
                  </div>
              </div>
           </div>
        </section>

        {/* --- FEATURES GRID --- */}
        <section id="features" className="py-32 px-4">
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
                 
                 {/* Feature 4: Feedback & Ratings */}
                 <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-3xl hover:bg-zinc-900 hover:border-cyan-900/50 transition group">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:bg-cyan-500 group-hover:text-black transition">
                      ⭐
                    </div>
                    <h3 className="font-bold text-2xl mb-4">Feedback Loop</h3>
                    <p className="text-zinc-400 leading-relaxed">
                       Sammle ehrliches Feedback. Deine Taster können Bier direkt am Glas bewerten (1-5 Sterne). Sehe sofort, welches Rezept der Renner ist.
                    </p>
                 </div>

                 {/* Feature 5: Squads (NEU) */}
                 <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-3xl hover:bg-zinc-900 hover:border-purple-900/50 transition group">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:bg-purple-500 group-hover:text-black transition">
                      👯‍♀️
                    </div>
                    <h3 className="font-bold text-2xl mb-4">Squad Management</h3>
                    <p className="text-zinc-400 leading-relaxed">
                       Braue nicht allein. Lade Freunde in dein Team ein, teilt euch Rezepte und verwaltet gemeinsam das Inventar. Perfekt für WGs und Vereine.
                    </p>
                 </div>

                 {/* Feature 6: Gamification (NEU) */}
                 <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-3xl hover:bg-zinc-900 hover:border-amber-900/50 transition group">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:bg-amber-500 group-hover:text-black transition">
                      🏆
                    </div>
                    <h3 className="font-bold text-2xl mb-4">Achievements</h3>
                    <p className="text-zinc-400 leading-relaxed">
                       Werde zur Legende. Sammle Badges für jeden Sud, jeden Meilenstein und jedes neue Mitglied. Steige im Level auf und schalte Features frei.
                    </p>
                 </div>
              </div>
           </div>
        </section>

        {/* --- NETWORK / COMMUNITY SECTION (NEW) --- */}
        <section className="py-24 bg-gradient-to-br from-zinc-900 to-black border-y border-zinc-800 relative overflow-hidden">
            {/* Background Map Effect */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #22d3ee 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            
            <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center gap-16">
                <div className="flex-1 space-y-8">
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/20">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                        Community & Wissen
                     </div>
                     <h2 className="text-4xl md:text-6xl font-black leading-tight text-white">
                        Werde Teil des <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Netzwerks.</span>
                     </h2>
                     <p className="text-lg text-zinc-400 leading-relaxed">
                        BotlLab ist mehr als Software. Es ist der Ort, an dem Hobbybrauer zusammenkommen. 
                        Tausche dich im <strong>Forum</strong> aus, entdecke <strong>tausende Rezepte</strong> in der Discover-Area oder lass dir bei einer Gärstockung helfen.
                     </p>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-black/40 border border-zinc-800 rounded-xl">
                            <div className="font-black text-xl text-white mb-1">Stetig wachsend</div>
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Aktive Community</div>
                        </div>
                        <div className="p-4 bg-black/40 border border-zinc-800 rounded-xl">
                            <div className="font-black text-xl text-white mb-1">Täglich neue</div>
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Geteilte Rezepte</div>
                        </div>
                     </div>

                     <div className="flex flex-wrap gap-4 pt-2">
                        <Link href="/forum" className="flex items-center gap-2 text-sm font-bold text-white bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl transition">
                           💬 Zum Forum
                        </Link>
                        <Link href="/discover" className="flex items-center gap-2 text-sm font-bold text-white bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl transition">
                           🌍 Rezepte entdecken
                        </Link>
                     </div>
                </div>

                <div className="flex-1 relative w-full h-[400px] md:h-[500px]">
                    {/* Floating Chat / Forum Cards */}
                    <div className="absolute top-10 left-0 bg-zinc-900/90 backdrop-blur-md border border-zinc-700 p-5 rounded-2xl shadow-2xl max-w-xs animate-[float_4s_ease-in-out_infinite] z-20">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold text-black text-xs">M</div>
                           <div>
                              <div className="text-xs font-bold text-white">Micha_Braut</div>
                              <div className="text-[10px] text-zinc-500">vor 2 Min im Forum</div>
                           </div>
                        </div>
                        <p className="text-sm text-zinc-300">"Hat jemand Erfahrung mit Kveik bei 35°C? Mein Gäreimer explodiert gleich! 🚀"</p>
                        <div className="mt-3 flex gap-2">
                           <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400">#notfall</span>
                           <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400">#hefe</span>
                        </div>
                    </div>

                    <div className="absolute bottom-20 right-0 bg-zinc-900/90 backdrop-blur-md border border-cyan-900/50 p-5 rounded-2xl shadow-2xl max-w-xs animate-[float_5s_ease-in-out_infinite_1s] z-10">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-black text-xs">L</div>
                           <div>
                              <div className="text-xs font-bold text-white">Lisa_Brews</div>
                              <div className="text-[10px] text-cyan-400">Neues Rezept geteilt</div>
                           </div>
                        </div>
                        <div className="flex gap-4 mb-2">
                           <div className="h-12 w-12 bg-zinc-800 rounded-lg flex items-center justify-center text-xl">🍺</div>
                           <div>
                              <p className="text-sm font-bold text-white">Summer Ale 2024</p>
                              <p className="text-xs text-zinc-500">5.2% ABV • 35 IBU</p>
                           </div>
                        </div>
                        <div className="mt-2 w-full bg-cyan-500/20 text-cyan-400 text-center py-1.5 rounded-lg text-xs font-bold">
                           Rezept ansehen
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* --- CATCHY CTA --- */}
        <section className="py-32 px-4 relative overflow-hidden">
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
      <footer className="border-t border-zinc-900 bg-black py-12 px-4 text-center md:text-left">
         <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start">
               <div className="mb-4 scale-125 origin-left"><Logo /></div>
               <p className="text-zinc-500 text-sm">© {new Date().getFullYear()} BotlLab. Made with 🍺 in Germany.</p>
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
