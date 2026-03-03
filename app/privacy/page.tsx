import { impressumConfig } from '@/lib/site-config';

export const metadata = {
  robots: 'noindex, nofollow',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-surface border-b border-border py-8">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl font-black text-foreground mb-2">Datenschutzerklärung</h1>
          <p className="text-zinc-400">BotlLab – Stand: Januar 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        
        {/* 1. Verantwortlicher */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">1. Verantwortlicher</h2>
          <div className="text-zinc-300 space-y-2">
            <p><strong>{impressumConfig.companyName}</strong></p>
            <p>
              {impressumConfig.ownerName}<br />
              {impressumConfig.address.street}<br />
              {impressumConfig.address.zip} {impressumConfig.address.city}<br />
              {impressumConfig.address.country}
            </p>
            <p>
              <strong>E-Mail:</strong> {impressumConfig.contact.email}<br />
              {impressumConfig.contact.phone && (
                <>
                  <strong>Telefon:</strong> {impressumConfig.contact.phone}<br />
                </>
              )}
              <strong>Website:</strong> {impressumConfig.contact.website}
            </p>
          </div>
        </section>

        {/* 2. Allgemeine Informationen */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">2. Allgemeine Informationen</h2>
          <p className="text-zinc-300 leading-relaxed">
            Diese Datenschutzerklärung informiert dich über die Verarbeitung personenbezogener Daten bei der Nutzung der Plattform BotlLab 
            gemäß der Europäischen Datenschutz-Grundverordnung (DSGVO) und des Bundesdatenschutzgesetzes (BDSG).
          </p>
        </section>

        {/* 3. Arten und Umfang */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">3. Welche Daten erheben wir?</h2>
          <div className="text-zinc-300 space-y-4">
            <div>
              <h3 className="font-bold text-foreground mb-2">3.1 Registrierung & Authentifizierung</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>E-Mail-Adresse</li>
                <li>Passwort (verschlüsselt)</li>
                <li>Name der Brauerei</li>
                <li>Gründungsjahr (optional)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-2">3.2 Inhalte & Funktionalität</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Rezepte und Rezeptdaten (Name, Stil, ABV, IBU, Beschreibung, Zutaten)</li>
                <li>Flaschenverwaltungsdaten (Flaschenummern, Inhalt, Status)</li>
                <li>QR-Code-Links und damit verbundene Daten</li>
                <li>Bewertungen und Kommentare von Nutzern (falls öffentlich sichtbar)</li>
                <li>
                  Forum-Inhalte: Threads (Titel, Beschreibung), Posts (Kommentare, Antworten) sowie hochgeladene Bilder und Medien
                  (Brew-Labels, Kronkorken-Designs) — Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) bzw. lit. a (Einwilligung
                  bei Bild-Uploads). Speicherdauer: für die Dauer des Kontos; Forum-Inhalte bleiben nach Konto-Löschung in anonymisierter Form
                  erhalten (Autor-Referenz wird auf &quot;Gelöschter Nutzer&quot; gesetzt), um die Lesbarkeit von Diskussionen zu gewährleisten
                  (berechtigtes Interesse der Community, Art. 6 Abs. 1 lit. f DSGVO). Bilder werden auf Anfrage vollständig gelöscht.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-2">3.3 Automatisch erfasste Daten & Analytics</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>IP-Adresse (nur für Logfiles & Sicherheit, nicht für Analytics gespeichert)</li>
                <li>Browserdaten (User-Agent, Betriebssystem) zur Fehlerbehebung</li>
                <li>Zugriffszeit und -dauer</li>
                <li>Interne Interaktionsdaten (z.B. Button-Klicks, erreichte Limits, Feature-Nutzung) zur Produktverbesserung</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-2">3.4 QR-Scans & Brauerei-Analytics</h3>
              <p className="text-zinc-300 text-sm mb-2">
                Beim Scannen von Flaschen-QR-Codes erfassen wir kurzzeitig technische Daten (IP-Adresse, User-Agent), um Herkunftsland und Gerätetyp zu bestimmen.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Diese Daten werden <strong>nicht gespeichert</strong>, sondern sofort in anonyme Zähler umgewandelt (z.B. &quot;1x Mobile aus Deutschland&quot;).</li>
                <li>Es werden <strong>keine Cookies</strong> gesetzt.</li>
                <li>Es findet keine langfristige Profilbildung oder personenbezogene Nachverfolgung statt.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-2">3.5 Personalisierung & Profiling</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Interaktionen mit Inhalten (z.B. welche Brews du ansiehst, wie lange du auf einer Karte verweilst, welche du likest).</li>
                <li>Daraus abgeleitete Präferenzen (z.B. bevorzugte Bierstile, Zutaten), um dir im &quot;Für dich&quot;-Feed passendere Inhalte anzuzeigen.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. Zweck der Verarbeitung */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">4. Wofür nutzen wir deine Daten?</h2>
          <div className="text-zinc-300 space-y-2">
            <p>✓ <strong>Kontoverwaltung:</strong> Authentifizierung, Sicherheit, Account-Recovery</p>
            <p>✓ <strong>Servicebereitstellung:</strong> Rezept- und Flaschenmanagement, QR-Code-Generierung</p>
            <p>✓ <strong>Personalisierung:</strong> Anpassung des Discover-Feeds an deine Interessen basierend auf deinem Nutzungsverhalten (z.B. angesehene oder gelikte Rezepte).</p>
            <p>✓ <strong>Kommunikation:</strong> Support, wichtige Mitteilungen über Änderungen</p>
            <p>✓ <strong>Verbesserung:</strong> Analyse von Nutzerverhalten zur Optimierung (anonym/aggregiert)</p>
            <p>✓ <strong>Sicherheit:</strong> Betrugsprävention, Missbrauchserkennung</p>
            <p>✓ <strong>Rechtliche Compliance:</strong> Erfüllung gesetzlicher Anforderungen</p>
          </div>
        </section>

        {/* 5. Rechtsgrundlagen */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">5. Rechtsgrundlagen (DSGVO)</h2>
          <div className="text-zinc-300 space-y-3">
            <p>
              <strong>Art. 6 Abs. 1 DSGVO (Vertragserfüllung):</strong> Datenverarbeitung zur Erfüllung deines Nutzungsvertrags mit BotlLab.
            </p>
            <p>
              <strong>Art. 6 Abs. 1 DSGVO (Rechtliche Verpflichtung):</strong> Einhaltung von Gesetzen (z.B. Steuern, Sicherheit).
            </p>
            <p>
              <strong>Art. 6 Abs. 1 DSGVO (Berechtigte Interessen):</strong> Sicherheit der Plattform, Betrugsbekämpfung, Verbesserung des Services.
            </p>
            <p>
              <strong>Art. 7 DSGVO (Einwilligung):</strong> Du kannst jederzeit eine gegebene Einwilligung widerrufen.
            </p>
          </div>
        </section>

        {/* 6. Speicherdauer */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">6. Wie lange speichern wir deine Daten?</h2>
          <div className="text-zinc-300 space-y-3">
            <p>
              <strong>Kontodaten:</strong> Solange dein Konto aktiv ist. Nach Löschung werden Daten innerhalb von 30 Tagen gelöscht, 
              sofern keine gesetzliche Aufbewahrungspflicht besteht.
            </p>
            <p>
              <strong>Rezepte & Flaschen:</strong> Solange du sie nicht löschst. Bei Account-Löschung werden Rezepte und Flaschendaten
              <strong> anonymisiert</strong>: Die Verknüpfung zu deinem Konto wird entfernt, die Inhalte bleiben jedoch als Teil der Community
              erhalten, da andere Nutzer ihre Brausitzungen und Flaschen darauf aufgebaut haben könnten. Profilbilder (Logo, Banner) und alle
              personenbezogenen Profildaten (Name, Bio, Standort) werden vollständig gelöscht. Rechtsgrundlage für die Aufbewahrung anonymisierter
              Rezeptdaten: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse – Datenintegrität für andere Community-Mitglieder).
            </p>
            <p>
              <strong>Zugriffslogs:</strong> Maximal 90 Tage für Sicherheitszwecke.
            </p>
            <p>
              <strong>Bewertungen:</strong> So lange, wie der Beitrag online ist oder bis zur Löschung angefordert.
            </p>
          </div>
        </section>

        {/* 7. Empfänger von Daten */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">7. Wer erhält deine Daten?</h2>
          <div className="text-zinc-300 space-y-3">
            <p>
              <strong>Supabase:</strong> Datenbankhosting und Authentifizierung (Supabase, Inc. – EU-konform per Standardvertragsklauseln)
            </p>
            <p>
              <strong>Google Gemini:</strong> Prompt-Daten für Label-Generierung (siehe deren Datenschutz)
            </p>
            <p>
              <strong>Interne Teams:</strong> Support und technisches Personal (NDA-gebunden)
            </p>
            <p>
              <strong>Drittanbieter:</strong> Keine freiwillige Weitergabe ohne deine Einwilligung.
            </p>
          </div>
        </section>

        {/* 8. Deine Rechte */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">8. Deine Rechte als Nutzer</h2>
          <div className="text-zinc-300 space-y-2">
            <p>✓ <strong>Auskunftsrecht (Art. 15 DSGVO):</strong> Erfrage, welche Daten wir über dich speichern.</p>
            <p>✓ <strong>Berichtigungsrecht (Art. 16 DSGVO):</strong> Lass fehlerhafte Daten korrigieren.</p>
            <p>✓ <strong>Löschungsrecht (Art. 17 DSGVO):</strong> „Recht auf Vergessenwerden" – Lösche dein Konto und deine Daten.</p>
            <p>✓ <strong>Einschränkungsrecht (Art. 18 DSGVO):</strong> Fordere an, dass Daten nicht verarbeitet werden.</p>
            <p>✓ <strong>Datenportabilität (Art. 20 DSGVO):</strong> Erhalte deine Daten in maschinenlesbarem Format.</p>
            <p>✓ <strong>Widerspruchsrecht (Art. 21 DSGVO):</strong> Widerspreche der Verarbeitung für bestimmte Zwecke.</p>
            <p>✓ <strong>Beschwerde (Art. 77 DSGVO):</strong> Wende dich an deine zuständige Datenschutzbehörde.</p>
          </div>
        </section>

        {/* 9. Cookies und Tracking */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">9. Cookies, Lokaler Speicher und Personalisierung</h2>
          <div className="text-zinc-300 leading-relaxed space-y-4">
            <div>
              <p className="font-bold text-foreground mb-2">9.1 Essenzielle Cookies & Lokaler Speicher</p>
              <ul className="list-disc list-inside space-y-1">
              <li>Session-Management (Login-Daten)</li>
              <li>Sicherheitstoken (CSRF-Schutz)</li>
              <li>Lokaler Speicher (sessionStorage) zur Vermeidung von Mehrfacherfassungen bei der Personalisierung (z.B. welche Brews du in der aktuellen Sitzung bereits gesehen hast).</li>
              <li>Lokaler Speicher (<code>localStorage</code>) zur geräteinternen Duplikat-Prüfung beim Bewerten und Kronkorken-Sammeln: Schlüssel <code>botllab_rated_[BrewID]</code> und <code>botllab_cap_[BrewID]</code>. Diese Daten verlassen dein Gerät nicht, werden an keinen Server übermittelt und stellen kein Tracking-Cookie dar. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Spam- und Missbrauchsprävention).</li>
              </ul>
            </div>
            
            <div>
              <p className="font-bold text-foreground mb-2">9.2 Interne Analyse & Personalisierung (First-Party)</p>
              <p className="mb-2">
                Wir nutzen <strong>keine Drittanbieter-Tracker</strong> (wie Google Analytics, Facebook Pixel, etc.), die Daten an andere Unternehmen weitergeben.
              </p>
              <p className="mb-2">
                Um BotlLab zu verbessern und dir relevante Inhalte im &quot;Für dich&quot;-Feed anzuzeigen, erfassen wir Interaktionsdaten (z.B. angesehene Brews, Verweildauer) verknüpft mit deinem Profil. 
                Dies geschieht auf Basis unseres berechtigten Interesses (Art. 6 Abs. 1 lit. f DSGVO) an der Bereitstellung eines personalisierten und nutzerfreundlichen Dienstes.
              </p>
              <p>
                <strong>Widerspruchsrecht:</strong> Du kannst dieser internen Analyse und Personalisierung jederzeit in deinen <a href="/account" className="text-brand underline">Kontoeinstellungen</a> widersprechen (Opt-Out).
              </p>
            </div>
          </div>
        </section>

        {/* 10. Sicherheitsmaßnahmen */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">10. Wie schützen wir deine Daten?</h2>
          <div className="text-zinc-300 space-y-2">
            <p>🔒 <strong>Verschlüsselung:</strong> HTTPS/TLS für alle Übertragungen</p>
            <p>🔒 <strong>Passwörter:</strong> Mit starken Algorithmen gehashed (bcrypt)</p>
            <p>🔒 <strong>Zugriffskontrolle:</strong> Row-Level Security (RLS) in der Datenbank</p>
            <p>🔒 <strong>Regelmäßige Backups:</strong> Automatische Sicherungen durch Supabase</p>
            <p>🔒 <strong>Monitoring:</strong> Überwachung auf verdächtige Aktivitäten</p>
          </div>
        </section>

        {/* 11. Drittanbieter */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">11. Externe Dienstleister</h2>
          <div className="text-zinc-300 space-y-3">
            <p>
              <strong>Supabase (Datenbankhosting):</strong> <a href="https://supabase.com/privacy" className="text-brand underline">Datenschutz</a>
            </p>
            <p>
              <strong>Vercel (Hosting):</strong> <a href="https://vercel.com/legal/privacy" className="text-brand underline">Datenschutz</a>
            </p>
            <p>
              <strong>Google Gemini (KI-Labels, optional):</strong> <a href="https://ai.google.dev/privacy" className="text-brand underline">Datenschutz</a>
            </p>
            <p>
              Alle Dienstleister sind vertraglich gebunden, deine Daten zu schützen.
            </p>
          </div>
        </section>

        {/* 12. Änderungen */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">12. Änderungen dieser Datenschutzerklärung</h2>
          <p className="text-zinc-300 leading-relaxed">
            Wir können diese Datenschutzerklärung jederzeit ändern. Bedeutsame Änderungen teilen wir dir per E-Mail mit.
          </p>
        </section>

        {/* 13. Kontakt */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">13. Kontakt & Fragen</h2>
          <p className="text-zinc-300 leading-relaxed">
            Bei Fragen zu dieser Datenschutzerklärung oder zur Ausübung deiner Rechte, kontaktiere uns unter:<br />
            <strong>E-Mail:</strong> {impressumConfig.contact.email}
          </p>
        </section>

        {/* Disclaimer removed per request */}
      </div>
    </div>
  );
}
