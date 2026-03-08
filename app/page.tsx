'use client';

import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";
import {
  Printer, Package, BarChart2, Timer, Star, Link2,
  MessageSquare, Globe, Users, Megaphone, Trophy, XCircle,
  FlaskConical,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-text-primary selection:bg-brand/30 selection:text-text-primary">
      
      {/* --- NAVBAR --- */}
      <Header />

      <main>
        
        {/* --- HERO SECTION --- */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
          {/* Background FX */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/10 blur-[140px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-border text-xs font-bold uppercase tracking-widest text-brand mb-4 hover:border-border-hover transition cursor-default">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse"/>
              Jetzt Live verfügbar
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9]">
              Nie wieder <br/>
              <span className="text-text-disabled">Etiketten kratzen.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
              BotlLab verwandelt jede Flasche in ein <strong className="text-text-primary">smartes Device</strong>. 
              Kleb einmal einen QR-Code auf und verlinke ihn immer wieder neu mit deinen Rezepten.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Link 
                href="/login?intent=brew" 
                className="w-full sm:w-auto px-10 py-5 bg-brand text-background font-black text-lg rounded-2xl hover:bg-brand/90 hover:scale-105 transition transform shadow-lg shadow-brand/20"
              >
                Kostenlos loslegen
              </Link>
              <a 
                href="#features" 
                className="w-full sm:w-auto px-10 py-5 bg-surface/50 border border-border text-text-primary font-bold text-lg rounded-2xl hover:bg-surface-hover transition backdrop-blur-sm"
              >
                Wie es funktioniert &darr;
              </a>
            </div>

            <div className="pt-12 flex flex-wrap justify-center gap-8 opacity-60 hover:opacity-100 transition duration-500">
               <span className="text-text-muted font-bold">Craft Beer</span>
               <span className="text-text-muted font-bold">Wein</span>
               <span className="text-text-muted font-bold">Limo</span>
               <span className="text-text-muted font-bold">Teams</span>
               <span className="text-text-muted font-bold">Achievements</span>
            </div>
          </div>
        </section>

        {/* --- SQUAD SECTION --- */}
        <section className="py-24 bg-surface border-y border-border relative overflow-hidden">
           <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
               <div className="relative order-2 lg:order-1">
                  <div className="relative bg-surface-hover border border-border p-8 rounded-3xl shadow-2xl space-y-4 max-w-sm mx-auto lg:ml-auto transform -rotate-2 hover:rotate-0 transition duration-500">
                      <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                          <h3 className="font-bold text-text-primary">Hopfenrebellen Squad</h3>
                          <span className="text-xs bg-brand/10 text-brand px-2 py-1 rounded border border-brand/20">3 Mitglieder</span>
                      </div>
                      <div className="space-y-3">
                          <div className="flex items-center gap-3 p-2 bg-background/50 rounded-xl border border-border">
                              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 text-xs font-bold">M</div>
                              <div className="flex-1">
                                  <div className="h-2 bg-surface-hover rounded w-20 mb-1"></div>
                                  <div className="h-1.5 bg-surface-hover/50 rounded w-12"></div>
                              </div>
                              <span className="text-[10px] text-text-muted">Meister</span>
                          </div>
                           <div className="flex items-center gap-3 p-2 bg-background/50 rounded-xl border border-border">
                              <div className="w-8 h-8 rounded-full bg-warning/20 text-warning flex items-center justify-center border border-warning/30 text-xs font-bold">L</div>
                              <div className="flex-1">
                                  <div className="h-2 bg-surface-hover rounded w-24 mb-1"></div>
                                  <div className="h-1.5 bg-surface-hover/50 rounded w-16"></div>
                              </div>
                              <span className="text-[10px] text-text-muted">Geselle</span>
                          </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border text-center">
                          <span className="text-xs text-text-secondary">Neues Achievement freigeschaltet: <strong>Team Brewer</strong></span>
                      </div>
                  </div>
               </div>
               
               <div className="order-1 lg:order-2">
                   <span className="text-brand font-bold tracking-widest uppercase text-xs mb-2 block">Squads & Teams</span>
                   <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                      Brauen ist <span className="text-brand">Teamsport</span>.
                   </h2>
                   <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                      Egal ob WG-Brauerei, Verein oder einfach Freunde: Gründe dein eigenes <strong>Squad</strong>. 
                      Verwaltet zusammen Rezepte, teilt euch das Inventar und feiert gemeinsame Erfolge im Feed.
                   </p>
                   <ul className="space-y-4 text-text-secondary font-medium">
                      <li className="flex items-center gap-3"><Users className="w-5 h-5 text-brand shrink-0" /> Gemeinsames Dashboard</li>
                      <li className="flex items-center gap-3"><Megaphone className="w-5 h-5 text-brand shrink-0" /> Team-Newsfeed</li>
                      <li className="flex items-center gap-3"><Trophy className="w-5 h-5 text-brand shrink-0" /> Squad-Achievements sammeln</li>
                   </ul>
               </div>
           </div>
        </section>

        {/* --- PROBLEM / SOLUTION --- */}
        <section className="py-24 bg-background">
           <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">
              <div>
                 <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                    Die <span className="text-error line-through">Hölle</span> des Hobbybrauens.
                 </h2>
                 <p className="text-lg text-text-secondary mb-8">
                    Du kennst es: Du hast Stunden mit dem Brauen verbracht. Und dann? 
                    Flaschen waschen, alte Etiketten einweichen, kratzen, kleben, trocknen lassen. 
                    Und nach dem Trinken geht alles von vorne los.
                 </p>
                 <ul className="space-y-4 text-text-secondary">
                    <li className="flex items-center gap-3"><XCircle className="w-5 h-5 text-error shrink-0" /> Verklebte Spüle</li>
                    <li className="flex items-center gap-3"><XCircle className="w-5 h-5 text-error shrink-0" /> Teurer Drucker-Toner</li>
                    <li className="flex items-center gap-3"><XCircle className="w-5 h-5 text-error shrink-0" /> Papier-Müll ohne Ende</li>
                 </ul>
              </div>
              <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-brand/10 to-success/10 blur-3xl rounded-full" />
                  <div className="relative bg-surface border border-border p-8 rounded-3xl shadow-2xl space-y-6 transform rotate-2 hover:rotate-0 transition duration-500">
                      <div className="flex items-center gap-4 border-b border-border pb-6">
                         <div className="w-16 h-16 bg-brand rounded-xl flex items-center justify-center text-xl text-background font-bold">
                           QR
                         </div>
                         <div>
                            <h3 className="font-bold text-xl text-text-primary">BotlLab ID #4092</h3>
                            <p className="text-brand font-mono text-sm">Status: Aktiv</p>
                         </div>
                      </div>
                      <div className="space-y-3">
                         <div className="h-4 bg-surface-hover rounded w-3/4 animate-pulse"></div>
                         <div className="h-4 bg-surface-hover rounded w-1/2 animate-pulse"></div>
                         <div className="p-4 bg-background/50 rounded-xl border border-border text-sm text-text-secondary mt-4">
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
                 <p className="text-text-secondary text-lg">BotlLab ist mehr als nur ein QR-Code Generator. Es ist dein komplettes digitales Backend.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                 <div className="bg-surface/30 border border-border p-8 rounded-3xl hover:bg-surface hover:border-brand/30 transition group">
                    <div className="w-12 h-12 bg-surface-hover rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand transition">
                      <Printer className="w-6 h-6 text-text-secondary group-hover:text-background transition" />
                    </div>
                    <h3 className="font-bold text-2xl mb-4">Design & PDF-Druck</h3>
                    <p className="text-text-secondary leading-relaxed">
                       Lass die KI ein Etiketten-Kunstwerk generieren oder lade dein eigenes hoch. Nutze unseren Smart-Label Export, um Flaschenetiketten mit einem Klick performant als PDF zu drucken.
                    </p>
                 </div>

                 <div className="bg-surface/30 border border-border p-8 rounded-3xl hover:bg-surface hover:border-brand/30 transition group">
                    <div className="w-12 h-12 bg-surface-hover rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand transition">
                      <Package className="w-6 h-6 text-text-secondary group-hover:text-background transition" />
                    </div>
                    <h3 className="font-bold text-2xl mb-4">Digitales Inventar</h3>
                    <p className="text-text-secondary leading-relaxed">
                       Behalte den Überblick über deinen Keller. Weist du Flaschen einem neuen Rezept zu, sind sie scannbar. Du weißt immer, was trinkreif ist und was wo lagert.
                    </p>
                 </div>

                 <div className="bg-surface/30 border border-border p-8 rounded-3xl hover:bg-surface hover:border-brand/30 transition group">
                    <div className="w-12 h-12 bg-surface-hover rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand transition">
                      <BarChart2 className="w-6 h-6 text-text-secondary group-hover:text-background transition" />
                    </div>
                    <h3 className="font-bold text-2xl mb-4">Analytics & Insights</h3>
                    <p className="text-text-secondary leading-relaxed">
                       Tiefgreifende Metriken zu deinen Suden. Verfolge Bewertungs-Trends, Bitterwerte-Verteilungen und verstehe exakt, welche deiner Biere am besten bei Tastern ankommen.
                    </p>
                 </div>
                 
                 <div className="bg-surface/30 border border-border p-8 rounded-3xl hover:bg-surface hover:border-brand/30 transition group">
                    <div className="w-12 h-12 bg-surface-hover rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand transition">
                      <Timer className="w-6 h-6 text-text-secondary group-hover:text-background transition" />
                    </div>
                    <h3 className="font-bold text-2xl mb-4">Fokus Brau-Logs</h3>
                    <p className="text-text-secondary leading-relaxed">
                       Protokolliere deinen kompletten Brauprozess mit detaillierten Session-Logs. Notiere pH-Wert, Stammwürze, Gärverlauf und optimiere deinen Workflow datengesteuert.
                    </p>
                 </div>

                 <div className="bg-surface/30 border border-border p-8 rounded-3xl hover:bg-surface hover:border-brand/30 transition group">
                    <div className="w-12 h-12 bg-surface-hover rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand transition">
                      <Star className="w-6 h-6 text-text-secondary group-hover:text-background transition" />
                    </div>
                    <h3 className="font-bold text-2xl mb-4">Feedback Loop</h3>
                    <p className="text-text-secondary leading-relaxed">
                       Deine Taster können dein Bier per QR-Scan bewerten und Geschmacks-Profile erfassen. Wertvolles, unverfälschtes Feedback fließt direkt in deine Batch-Analytics.
                    </p>
                 </div>

                 <div className="bg-surface/30 border border-border p-8 rounded-3xl hover:bg-surface hover:border-brand/30 transition group">
                    <div className="w-12 h-12 bg-surface-hover rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand transition">
                      <Link2 className="w-6 h-6 text-text-secondary group-hover:text-background transition" />
                    </div>
                    <h3 className="font-bold text-2xl mb-4">Brauerei-Profil</h3>
                    <p className="text-text-secondary leading-relaxed">
                       Baue dir deine eigene digitale Identität auf. Deine öffentlich geteilten Sude und Rezepte erscheinen auf deinem Profil als Visitenkarte für jeden Craft-Bier Fan.
                    </p>
                 </div>
              </div>
           </div>
        </section>

        {/* --- NETWORK / COMMUNITY SECTION --- */}
        <section className="py-24 bg-gradient-to-br from-surface to-background border-y border-border relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #06b6d4 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            
            <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center gap-16">
                <div className="flex-1 space-y-8">
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider border border-brand/20">
                        <span className="w-2 h-2 bg-brand rounded-full animate-pulse"></span>
                        Community & Wissen
                     </div>
                     <h2 className="text-4xl md:text-6xl font-black leading-tight">
                        Werde Teil des <br/>
                        <span className="text-brand">Netzwerks.</span>
                     </h2>
                     <p className="text-lg text-text-secondary leading-relaxed">
                        BotlLab ist mehr als Software. Es ist der Ort, an dem Hobbybrauer zusammenkommen. 
                        Tausche dich im <strong>Forum</strong> aus, entdecke <strong>tausende Rezepte</strong> in der Discover-Area oder lass dir bei einer Gärstockung helfen.
                     </p>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-background/40 border border-border rounded-xl">
                            <div className="font-black text-xl text-text-primary mb-1">Stetig wachsend</div>
                            <div className="text-xs text-text-muted uppercase font-bold tracking-wider">Aktive Community</div>
                        </div>
                        <div className="p-4 bg-background/40 border border-border rounded-xl">
                            <div className="font-black text-xl text-text-primary mb-1">Täglich neue</div>
                            <div className="text-xs text-text-muted uppercase font-bold tracking-wider">Geteilte Rezepte</div>
                        </div>
                     </div>

                     <div className="flex flex-wrap gap-4 pt-2">
                        <Link href="/forum" className="flex items-center gap-2 text-sm font-bold text-text-primary bg-surface-hover hover:bg-surface-hover/80 px-5 py-3 rounded-xl transition">
                           <MessageSquare className="w-4 h-4" /> Zum Forum
                        </Link>
                        <Link href="/discover" className="flex items-center gap-2 text-sm font-bold text-text-primary bg-surface-hover hover:bg-surface-hover/80 px-5 py-3 rounded-xl transition">
                           <Globe className="w-4 h-4" /> Rezepte entdecken
                        </Link>
                     </div>
                </div>

                <div className="flex-1 relative w-full h-[400px] md:h-[500px]">
                    <div className="absolute top-10 left-0 bg-surface/90 backdrop-blur-md border border-border p-5 rounded-2xl shadow-2xl max-w-xs animate-[float_4s_ease-in-out_infinite] z-20">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold text-background text-xs">M</div>
                           <div>
                              <div className="text-xs font-bold text-text-primary">Micha_Braut</div>
                              <div className="text-[10px] text-text-muted">vor 2 Min im Forum</div>
                           </div>
                        </div>
                        <p className="text-sm text-text-secondary">&quot;Hat jemand Erfahrung mit Kveik bei 35 Grad? Mein Gäreimer explodiert gleich!&quot;</p>
                        <div className="mt-3 flex gap-2">
                           <span className="text-[10px] bg-surface-hover px-2 py-1 rounded text-text-muted">#notfall</span>
                           <span className="text-[10px] bg-surface-hover px-2 py-1 rounded text-text-muted">#hefe</span>
                        </div>
                    </div>

                    <div className="absolute bottom-20 right-0 bg-surface/90 backdrop-blur-md border border-brand/30 p-5 rounded-2xl shadow-2xl max-w-xs animate-[float_5s_ease-in-out_infinite_1s] z-10">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center font-bold text-background text-xs">L</div>
                           <div>
                              <div className="text-xs font-bold text-text-primary">Lisa_Brews</div>
                              <div className="text-[10px] text-brand">Neues Rezept geteilt</div>
                           </div>
                        </div>
                        <div className="flex gap-4 mb-2">
                           <div className="h-12 w-12 bg-surface-hover rounded-lg flex items-center justify-center shrink-0">
                             <FlaskConical className="w-5 h-5 text-text-muted" />
                           </div>
                           <div>
                              <p className="text-sm font-bold text-text-primary">Summer Ale 2024</p>
                              <p className="text-xs text-text-muted">5.2% ABV · 35 IBU</p>
                           </div>
                        </div>
                        <div className="mt-2 w-full bg-brand/20 text-brand text-center py-1.5 rounded-lg text-xs font-bold">
                           Rezept ansehen
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* --- PREMIUM TEASER --- */}
        <section className="py-24 bg-background border-t border-border">
           <div className="max-w-7xl mx-auto px-4 text-center">
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                 Kostenlos starten. <span className="text-warning">Für Power-User gemacht.</span>
              </h2>
              <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-12">
                 BotlLab ist für Hobbybrauer kostenlos. Wer mehr will, nutzt unsere Premium-Features für tiefe Einblicke und den besten Brau-Workflow.
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
                  <div className="p-8 rounded-3xl bg-surface border border-border">
                      <h3 className="text-2xl font-bold text-text-primary mb-2">BotlLab Free</h3>
                      <p className="text-text-secondary mb-6">Alles, was du für den Einstieg brauchst.</p>
                      <ul className="space-y-4">
                          <li className="flex gap-3 text-text-secondary"><span className="text-brand font-bold">&#10003;</span> Unbegrenzte Rezepte & Sude</li>
                          <li className="flex gap-3 text-text-secondary"><span className="text-brand font-bold">&#10003;</span> Digitale Speisekammer & Inventar</li>
                          <li className="flex gap-3 text-text-secondary"><span className="text-brand font-bold">&#10003;</span> Basis QR-Code Etikettendruck</li>
                          <li className="flex gap-3 text-text-secondary"><span className="text-brand font-bold">&#10003;</span> Community Forum Zugang</li>
                      </ul>
                  </div>
                  
                  <div className="p-8 rounded-3xl bg-gradient-to-b from-surface to-background border border-warning/30 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4">
                         <span className="text-[10px] font-bold uppercase tracking-wider bg-warning/20 text-warning px-3 py-1 rounded-full border border-warning/30">
                            Empfohlen
                         </span>
                      </div>
                      <h3 className="text-2xl font-bold text-warning mb-2">BotlLab Premium</h3>
                      <p className="text-text-secondary mb-6">Für detaillierte Analytics und perfekten Etikettendruck.</p>
                      <ul className="space-y-4 mb-8">
                          <li className="flex gap-3 text-text-secondary"><span className="text-warning font-bold">&#10003;</span> Erweiterte Rating & Batch Analytics</li>
                          <li className="flex gap-3 text-text-secondary"><span className="text-warning font-bold">&#10003;</span> Wasserzeichenfreier PDF-Export</li>
                          <li className="flex gap-3 text-text-secondary"><span className="text-warning font-bold">&#10003;</span> KI-Design-Generierungen inklusive</li>
                          <li className="flex gap-3 text-text-secondary"><span className="text-warning font-bold">&#10003;</span> Unbegrenzte Brau-Squads</li>
                      </ul>
                      <Link href="/pricing" className="text-sm font-bold text-warning hover:text-warning/80 transition flex items-center gap-1">
                          Preise & Features ansehen &rarr;
                      </Link>
                  </div>
              </div>
           </div>
        </section>

        {/* --- CTA --- */}
        <section className="py-32 px-4 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-b from-brand/10 to-background pointer-events-none" />
           <div className="relative max-w-4xl mx-auto text-center bg-surface border border-border p-12 md:p-20 rounded-[3rem]">
              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                 Bereit für die <br/>
                 <span className="text-brand">Zukunft des Brauens?</span>
              </h2>
              <p className="text-xl text-text-secondary mb-10 max-w-xl mx-auto">
                 Schließe dich hunderten von Brauern an, die ihre Spülbürste gegen smartes Inventar-Management getauscht haben.
              </p>
              <Link 
                href="/login?intent=brew" 
                className="inline-block w-full sm:w-auto px-12 py-5 bg-brand text-background font-black text-xl rounded-2xl hover:bg-brand/90 hover:scale-105 transition transform"
              >
                Account kostenlos erstellen
              </Link>
              <p className="mt-6 text-sm text-text-disabled font-medium">Keine Kreditkarte nötig. Sofort loslegen.</p>
           </div>
        </section>

      </main>

      <Footer />

    </div>
  );
}
