import Link from 'next/link';
import { impressumConfig } from '@/lib/site-config';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ImpressumPage() {
  const { companyName, ownerName, address, contact, editorial, vatId, registerEntry } = impressumConfig;

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <div className="max-w-3xl mx-auto px-6 py-20">
        
        <Link href="/" className="inline-flex items-center gap-2 text-cyan-500 hover:text-cyan-400 font-bold mb-12 transition">
          ← Zurück zur Startseite
        </Link>
        
        <h1 className="text-4xl font-black text-white mb-8">Impressum</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Angaben gemäß § 5 TMG</h2>
            <p>
              {companyName && <>{companyName}<br /></>}
              {ownerName}<br />
              {address.street}<br />
              {address.zip} {address.city}
            </p>
            
            {registerEntry?.court && registerEntry?.number && (
              <p className="mt-4">
                Registergericht: {registerEntry.court}<br />
                Registernummer: {registerEntry.number}
              </p>
            )}

            {vatId && (
              <p className="mt-4">
                Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
                {vatId}
              </p>
            )}
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">Kontakt</h2>
            <p>
              {contact.phone && <>Telefon: {contact.phone}<br /></>}
              E-Mail: <a href={`mailto:${contact.email}`} className="text-cyan-500 hover:underline">{contact.email}</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">Redaktionell verantwortlich</h2>
            <p>
              {editorial.name}<br />
              {editorial.street}<br />
              {editorial.zip} {editorial.city}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">EU-Streitschlichtung</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline ml-1">
                https://ec.europa.eu/consumers/odr/
              </a>.<br />
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <div className="h-px bg-zinc-800 my-12" />

          <section className="text-sm text-zinc-500">
            <h2 className="text-lg font-bold text-white mb-4">Haftungsausschluss (Disclaimer)</h2>
            
            <h3 className="font-bold text-white mt-4 mb-2">Haftung für Inhalte</h3>
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. 
              Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu 
              überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
            
            <h3 className="font-bold text-white mt-4 mb-2">Haftung für Links</h3>
            <p>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese 
              fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber 
              der Seiten verantwortlich.
            </p>

            <h3 className="font-bold text-white mt-4 mb-2">Urheberrecht</h3>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. 
              Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen 
              der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
}