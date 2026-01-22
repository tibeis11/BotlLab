'use client';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-surface border-b border-border py-8">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl font-black text-foreground mb-2">Allgemeine Geschäftsbedingungen</h1>
          <p className="text-zinc-400">BotlLab – Stand: Januar 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        
        {/* 1. Geltungsbereich */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">1. Geltungsbereich</h2>
          <p className="text-zinc-300 leading-relaxed">
            Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der Plattform BotlLab (nachfolgend „Dienst" oder „Plattform"). 
            Durch die Registrierung und Nutzung erkennen Sie diese Bedingungen an. Nutzer, die diesen nicht zustimmen, dürfen den Dienst nicht verwenden.
          </p>
        </section>

        {/* 2. Beschreibung des Dienstes */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">2. Beschreibung des Dienstes</h2>
          <p className="text-zinc-300 leading-relaxed">
            BotlLab ist eine Plattform zur Verwaltung von Braurezepten, Flaschenbeständen und zur Erstellung von QR-Code-Labels. 
            Der Dienst wird im Status „wie vorhanden" bereitgestellt und ist ausschließlich für den persönlichen, nicht-kommerziellen Gebrauch bestimmt, 
            sofern nicht ausdrücklich schriftlich vereinbart.
          </p>
        </section>

        {/* 3. Nutzerbedingungen */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">3. Nutzerbedingungen</h2>
          <div className="text-zinc-300 space-y-3">
            <p>
              <strong>3.1 Berechtigung:</strong> Du versicherst, mindestens 18 Jahre alt zu sein und das Recht zu haben, diese AGB zu akzeptieren.
            </p>
            <p>
              <strong>3.2 Kontoverantwortung:</strong> Du bist allein verantwortlich für die Geheimhaltung deines Passworts und aller Aktivitäten unter deinem Konto. 
              Benachrichtige uns unverzüglich bei verdächtig unberechtigtem Zugriff.
            </p>
            <p>
              <strong>3.3 Verbotene Nutzung:</strong> Du wirst die Plattform nicht für illegale Aktivitäten, Missbrauch, Hacking, 
              Spam oder Verletzung von Drittrechten nutzen.
            </p>
          </div>
        </section>

        {/* 4. Community Forum & Inhalte (UGC) */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">4. Community Forum & Inhalte (UGC)</h2>
           <div className="text-zinc-300 space-y-3">
            <p>
              <strong>4.1 Nutzungsrechte:</strong> Mit dem Erstellen von Beiträgen im Forum (Threads, Posts) räumst du BotlLab ein einfaches, räumlich und zeitlich unbeschränktes Nutzungsrecht an diesen Inhalten ein, um sie auf der Plattform anzuzeigen. Dies dient der langfristigen Lesbarkeit von Diskussionen. Dieses Recht bleibt auch nach Löschung des Benutzerkontos bestehen.
            </p>
            <p>
              <strong>4.2 Moderation:</strong> Wir behalten uns das Recht vor, Inhalte zu löschen oder zu sperren, die gegen geltendes Recht, die guten Sitten oder diese AGB verstoßen (z.B. Beleidigungen, Spam, extremistische Inhalte).
            </p>
             <p>
              <strong>4.3 Haftungsausschluss:</strong> Ratschläge und Rezepte im Forum werden von Nutzern für Nutzer erstellt. BotlLab übernimmt keine Haftung für die Richtigkeit oder Sicherheit von Anleitungen (z.B. Druckbehälter, Hygiene). Die Anwendung erfolgt auf eigene Gefahr.
            </p>
          </div>
        </section>

        {/* 5. Datenschutz */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">5. Datenschutz</h2>
          <p className="text-zinc-300 leading-relaxed">
            Die Verarbeitung deiner persönlichen Daten erfolgt gemäß unserer Datenschutzerklärung. 
            Deine Daten werden nicht an Dritte weitergegeben, ohne dass du dies explizit genehmigt hast.
          </p>
        </section>

        {/* 6. Haftungsausschluss */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">6. Haftungsausschluss</h2>
          <div className="text-zinc-300 space-y-3">
            <p>
              <strong>6.1 Verzicht auf Garantien:</strong> Die Plattform wird ohne Mängelgewähr bereitgestellt. 
              Wir garantieren nicht für Verfügbarkeit, Genauigkeit oder Fehlerfreiheit.
            </p>
            <p>
              <strong>6.2 Haftungsbegrenzung:</strong> Wir haften nicht für Datenverluste, Ausfallzeiten, indirekte Schäden oder Gewinnverluste, 
              die durch die Nutzung oder Unmöglichkeit der Nutzung entstehen.
            </p>
            <p>
              <strong>6.3 Third-Party-Inhalte:</strong> Verlinkungen zu externen Seiten implizieren keine Empfehlung oder Haftung für deren Inhalte.
            </p>
          </div>
        </section>

        {/* 7. Geistiges Eigentum */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">7. Geistiges Eigentum</h2>
          <p className="text-zinc-300 leading-relaxed">
            Alle Inhalte, Logos, Grafiken und Software der Plattform sind unser Eigentum oder das unserer Lizenzgeber. 
            Du darfst diese nicht ohne Genehmigung reproduzieren, ändern oder verbreiten. Deine Rezepte und Inhalte bleiben dein Eigentum, 
            aber du gewährst uns das Recht, sie zu hosten und zu betreiben.
          </p>
        </section>

        {/* 8. Änderungen der AGB */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">8. Änderungen der Bedingungen</h2>
          <p className="text-zinc-300 leading-relaxed">
            Wir können diese AGB jederzeit ändern. Bedeutsame Änderungen teilen wir dir mit. 
            Fortgesetzte Nutzung nach Änderungen bedeutet Akzeptanz.
          </p>
        </section>

        {/* 9. Beendigung */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">9. Beendigung</h2>
          <p className="text-zinc-300 leading-relaxed">
            Du kannst dein Konto jederzeit löschen. Wir können Konten bei Verstoß gegen diese AGB suspendieren oder löschen. 
            Nach Löschung werden Daten gemäß unserer Datenschutzrichtlinie verwaltet.
          </p>
        </section>

        {/* 10. Geltung */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">10. Rechtswahl und Gerichtsstand</h2>
          <p className="text-zinc-300 leading-relaxed">
            Diese AGB unterliegen deutschem Recht. Gerichtsstand ist der Ort deines Wohnsitzes oder unserer Niederlassung, falls anwendbar.
          </p>
        </section>

        {/* 11. Kontakt */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">11. Kontakt</h2>
          <p className="text-zinc-300 leading-relaxed">
            Bei Fragen zu diesen AGB oder zum Dienst, kontaktiere uns über die Kontaktseite oder per E-Mail.
          </p>
        </section>

        {/* Disclaimer */}
        <div className="bg-surface border border-amber-500/30 rounded-2xl p-6 mt-12">
          <p className="text-amber-200 text-sm">
            <strong>Rechtlicher Hinweis:</strong> Diese AGB sind eine Basis-Struktur und keine vollständige Rechtsberatung. 
            Bitte konsultiere einen Rechtsanwalt, um die AGB an deine spezifische Situation anzupassen und alle geltenden Gesetze einzuhalten.
          </p>
        </div>
      </div>
    </div>
  );
}
