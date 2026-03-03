# 🎯 Stripe Setup Guide - BotlLab Payment Integration

**Status:** ⏸️ Vorbereitet, warten auf Gewerbeanmeldung  
**Zeitaufwand:** ~30-45 Minuten  
**Wann ausführen:** Sobald Gewerbe angemeldet ist

---

## 📌 Übersicht

Diese Anleitung erklärt Schritt-für-Schritt, wie du Stripe für BotlLab konfigurierst. Du kannst diesen Schritt **jetzt überspringen** und erst ausführen, wenn du bereit bist, echte Zahlungen zu akzeptieren.

**Was ist Stripe?**

- Payment-Processor für Kreditkartenzahlungen
- Kümmert sich um: PCI-Compliance, Betrugserkennung, Steuern, Rechnungen
- Alternative zu PayPal (aber besser für Subscriptions)

**Kosten:**

- Test Mode: Kostenlos
- Live Mode: 1.5% + €0.25 pro erfolgreicher Transaktion
- Keine monatlichen Fixkosten
- Beispiel: Bei €4.99 Abo zahlst du ~€0.33 an Stripe

---

## 🛡️ Wichtig: Test Mode vs. Live Mode

### Test Mode (Jetzt verwenden)

- ✅ Kostenlos testen ohne echte Zahlungen
- ✅ Test-Kreditkarten verwenden (z.B. `4242 4242 4242 4242`)
- ✅ Alle Features ausprobieren
- ❌ Kein echtes Geld fließt

### Live Mode (Nach Gewerbeanmeldung)

- ✅ Echte Zahlungen möglich
- ✅ Echte Kunden können bezahlen
- ⚠️ Benötigt Gewerbeschein & Steuernummer
- ⚠️ Stripe nimmt Transaktionsgebühren

**Du wirst beide Modi durchlaufen:**

1. **Jetzt:** Test Mode Setup (zum Testen)
2. **Später:** Live Mode Setup (für echte Zahlungen)

---

## 📝 PHASE 1: Stripe Account erstellen (5 Min)

### Schritt 1.1: Registrierung

1. Gehe zu: **https://dashboard.stripe.com/register**

2. Registriere dich mit:
   - **Email:** info@botllab.de (wichtig für Rechnungen)
   - **Passwort:** Sicheres Passwort
   - **Land:** **Deutschland** ⚠️ Sehr wichtig!

**Warum "Deutschland"?**

- Bestimmt, welche MwSt-Regeln gelten (19%)
- Bestimmt, welche EU-Compliance-Regeln greifen
- Später: Hier hinterlegst du deine Steuernummer

### Schritt 1.2: Test Mode aktivieren

Nach dem Login:

- **Oben links** im Dashboard siehst du einen Toggle: **"Test Mode" / "Live Mode"**
- Stelle sicher, dass **"Test Mode" aktiviert ist** (Orange/Gelber Indikator)
- Im Test Mode kannst du alles ausprobieren ohne echte Zahlungen

**Test-Kreditkarte für später:**

```
Nummer: 4242 4242 4242 4242
Expiry: Beliebiges zukünftiges Datum (z.B. 12/28)
CVC: Beliebige 3 Ziffern (z.B. 123)
PLZ: Beliebige 5 Ziffern (z.B. 10115)
```

---

## 🏷️ PHASE 2: Produkte anlegen (15 Min)

### Warum Produkte in Stripe?

Stripe braucht Produktdefinitionen für:

- **Preis-Logik:** Was kostet das Abo? (€4.99 oder €14.99)
- **Recurring-Logik:** Wie oft wird abgebucht? (Monatlich)
- **Steuer-Berechnung:** Wie viel MwSt? (Automatisch 19% in DE)

Ohne Produkt → Checkout funktioniert nicht.

---

### Produkt 1: Heimbrauer (Brewer) - €4.99/Monat

**Schritt 2.1: Neues Produkt erstellen**

1. Im Stripe Dashboard → **"Products"** (linke Navigation)
2. Klick **"+ Create Product"** (oben rechts, blauer Button)

**Schritt 2.2: Produktdetails ausfüllen**

**Name:**

```
Heimbrauer
```

- Wird dem Kunden auf der Rechnung angezeigt
- Sollte klar verständlich sein

**Description (optional):**

```
50 AI Credits pro Monat, Custom Logos, Analytics Dashboard
```

- Hilft dir später, Produkte zu unterscheiden
- Wird auch dem Kunden angezeigt

**Schritt 2.3: Preis konfigurieren**

**Pricing Model:**

- Wähle: **"Recurring"** (nicht "One-time")
- **Warum?** Wir wollen monatliche Abos, keine Einmalzahlung

**Price:**

- Betrag: `4.99`
- Währung: `EUR`

**Billing Period:**

- Wähle: **"Monthly"**
- **Warum?** User zahlt jeden Monat, bis sie kündigen
- Alternative wäre: "Yearly" (dann müsstest du Rabatt geben)

**Tax Behavior:**

- Wähle: **"Inclusive"** (oder "Inclusive of tax")
- **Warum Inclusive?**
  - Preis €4.99 **inkludiert bereits** die 19% MwSt
  - Kunde zahlt genau €4.99 (davon ~€0.80 MwSt)
  - Alternative "Exclusive": €4.99 netto + 19% = €5.94 Brutto (verwirrt Kunden)

**Schritt 2.4: Speichern & Price-ID kopieren**

1. Klick **"Save Product"**

2. Nach dem Speichern siehst du unter **"Pricing"** eine ID wie:

   ```
   price_1Abc2Def3Ghi456Jkl789
   ```

3. **⚠️ WICHTIG: Kopiere diese Price-ID!**
   - Klick auf das Copy-Icon neben der ID
   - Speichere sie in einer Notiz:
     ```
     STRIPE_PRICE_BREWER=price_1Abc2Def3Ghi456Jkl789
     ```

---

### Produkt 2: Brauerei (Brewery) - €14.99/Monat

**Wiederhole die gleichen Schritte:**

1. Products → **"+ Create Product"**

2. **Name:**

   ```
   Brauerei
   ```

3. **Description:**

   ```
   Unbegrenzte AI Credits, Team-Features, Priority Support
   ```

4. **Pricing:**
   - Recurring
   - Preis: `14.99 EUR`
   - Monthly
   - Tax Behavior: **Inclusive**

5. **Save Product**

6. **Kopiere die Price-ID:**
   ```
   STRIPE_PRICE_BREWERY=price_9Xyz8Wvu7Tsr654Qpo321
   ```

---

## 💶 PHASE 3: Stripe Tax aktivieren (10 Min)

### Warum Stripe Tax?

**Problem ohne Stripe Tax:**

- Du müsstest manuell berechnen: 19% MwSt in DE, 20% in AT, 21% in NL, 25% in DK...
- Du müsstest wissen: Ist der Kunde in der EU oder außerhalb?
- Du müsstest Reverse Charge für B2B-Kunden aus anderen EU-Ländern handhaben
- Du müsstest quartalsweise MwSt-Meldungen an jedes EU-Land senden (MOSS)

**Mit Stripe Tax:**

- ✅ Berechnet automatisch die korrekte MwSt basierend auf Kundenadresse
- ✅ Erstellt Tax Reports für dein Finanzamt
- ✅ Kümmert sich um EU MOSS (One-Stop-Shop) Meldungen
- ✅ Unterstützt B2B Reverse Charge automatisch (falls du später B2B anbietest)

### Schritt 3.1: Tax Settings öffnen

1. Stripe Dashboard → **"Settings"** (unten links, Zahnrad-Icon)
2. → **"Tax"** (in der linken Sidebar unter "Product Settings")

### Schritt 3.2: Automatic Tax Collection aktivieren

1. Klick **"Enable Automatic Tax Collection"**

2. **Your business location:**
   - Wähle: **Germany**
   - **Warum?** Bestimmt deinen "Heimat"-MwSt-Satz (19%)

3. **Tax registration number (optional):**
   - **Jetzt:** Leer lassen
   - **Später (Live Mode):** Hier trägst du deine USt-ID ein (DE123456789)

### Schritt 3.3: EU Tax Compliance aktivieren

1. Checkbox: **"Activate EU Tax Compliance"** ✅
2. **Was passiert?**
   - Stripe meldet automatisch deine MwSt-Einnahmen aus anderen EU-Ländern
   - Du musst nicht selbst in 27 EU-Ländern Tax Reports einreichen
   - Stripe erstellt quartalsweise Reports für dich

3. Klick **"Save"**

### Schritt 3.4: Verifizierung (Nur Live Mode)

**Im Test Mode:**

- Alles funktioniert sofort, keine Verifizierung nötig

**Im Live Mode (später):**

- Stripe wird nach Dokumenten fragen:
  - ✅ Gewerbeschein
  - ✅ USt-ID Bestätigung vom Finanzamt
  - ✅ Bankkonto-Verifizierung (SEPA)
- Dauert 1-2 Werktage

---

## 🔑 PHASE 4: API-Keys kopieren (5 Min)

### Warum API-Keys?

Deine App muss mit Stripe kommunizieren können:

- **Publishable Key:** Frontend (öffentlich, sicher)
- **Secret Key:** Backend (geheim, niemals committen!)
- **Webhook Secret:** Für Webhook-Verifizierung (später)

### Schritt 4.1: API-Keys finden

1. Stripe Dashboard → **"Developers"** (rechts oben)
2. → **"API Keys"**

### Schritt 4.2: Publishable Key kopieren

1. Du siehst: **"Publishable key"**

   ```
   pk_test_51Abc...
   ```

2. **Klick auf "Reveal test key"** falls versteckt

3. **Kopiere den Key** und speichere:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Abc...
   ```

**Warum "NEXT_PUBLIC"?**

- Dieser Key ist sicher genug fürs Frontend
- User können ihn sehen (in Browser DevTools)
- Er kann nur Checkout-Sessions erstellen, keine Zahlungen manipulieren

### Schritt 4.3: Secret Key kopieren

1. Du siehst: **"Secret key"**

   ```
   sk_test_51Xyz...
   ```

2. **Klick auf "Reveal test key"**

3. **⚠️ NIEMALS IN GIT COMMITTEN!**

4. **Kopiere den Key** und speichere:
   ```
   STRIPE_SECRET_KEY=sk_test_51Xyz...
   ```

**Warum geheim?**

- Mit diesem Key kann man Zahlungen manipulieren
- Kann Abo-Status ändern, Refunds auslösen, etc.
- Darf NUR im Backend verwendet werden (Next.js Server Components)

---

## 📋 Zusammenfassung - Was du jetzt haben solltest:

Nach diesem Setup solltest du folgende Werte notiert haben:

```bash
# Stripe Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_51Xyz...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Abc...

# Stripe Price IDs
STRIPE_PRICE_BREWER=price_1Abc...
STRIPE_PRICE_BREWERY=price_2Def...

# Webhook Secret (kommt später in Schritt 5)
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🚀 Nächste Schritte (In DEPLOYMENT_CHECKLIST.md)

Nachdem du Stripe konfiguriert hast:

1. **Environment Variables setzen** (lokal & Vercel)
2. **Webhook registrieren** (damit Stripe deine App über Zahlungen informiert)
3. **Test-Zahlung durchführen** (mit Test-Karte)

---

## 🔄 Live Mode Setup (Später, nach Gewerbe)

Wenn du bereit bist, echte Zahlungen zu akzeptieren:

### Schritt 1: Live Mode aktivieren

- Toggle oben links: **Test Mode → Live Mode**
- Alles wird rot (warnt dich vor echten Zahlungen)

### Schritt 2: Produkte neu anlegen

- Im Live Mode gibt es KEINE Produkte aus Test Mode
- Du musst beide Produkte (Brewer, Brewery) **neu anlegen**
- **Neue Price-IDs** kopieren

### Schritt 3: Live API-Keys kopieren

- Developers → API Keys
- Diesmal: `pk_live_...` und `sk_live_...`
- ⚠️ Noch geheimer als Test Keys!

### Schritt 4: Geschäftsdaten hinterlegen

- Settings → Account Details
- **Business Type:** Individual (oder GmbH, falls vorhanden)
- **Legal Name:** Dein Name / Firmenname
- **Address:** Geschäftsadresse
- **Tax ID:** Deine USt-ID (DE123456789)

### Schritt 5: Bankkonto verbinden

- Settings → Bank Accounts & Scheduling
- **IBAN** hinterlegen
- Stripe überweist dir alle 7 Tage die Einnahmen (minus Gebühren)

### Schritt 6: Verifizierung abwarten

- Stripe prüft deine Dokumente (1-2 Werktage)
- Du erhältst eine Email, sobald freigeschaltet

### Schritt 7: Environment Variables updaten

```bash
# Ersetze Test Keys durch Live Keys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_BREWER=price_live_...
STRIPE_PRICE_BREWERY=price_live_...

# Commercial Barrier deaktivieren
NEXT_PUBLIC_ENABLE_PAYMENTS=true  # 🚀 GO LIVE!
```

### Schritt 8: Redeploy zu Vercel

```bash
git push origin main
# Vercel deployed automatisch mit neuen Env Vars
```

---

## 🤔 Häufige Fragen

### "Muss ich eine Kreditkarte bei Stripe hinterlegen?"

**Nein!** Stripe nimmt keine monatlichen Gebühren. Sie nehmen nur eine Transaktionsgebühr (1.5% + €0.25) **wenn** eine Zahlung erfolgt.

### "Was passiert, wenn ich Test Mode und Live Mode verwechsle?"

Im Test Mode:

- ✅ Keine echten Zahlungen möglich
- ✅ Nur Test-Karten funktionieren
- ✅ Kein Risiko

Im Live Mode:

- ⚠️ Echte Zahlungen möglich
- ⚠️ Echte Kreditkarten werden belastet
- ⚠️ Du musst Gewerbeschein haben!

**Tipp:** Der Toggle ist farbcodiert (Orange = Test, Rot = Live)

### "Kann ich Stripe später wieder löschen?"

Ja, jederzeit. Aber:

- Bestehende Subscriptions müssen erst gekündigt werden
- Du musst ausstehende Auszahlungen abwarten
- Alternative: Account einfach inaktiv lassen

### "Warum nicht PayPal?"

- ❌ PayPal Subscriptions haben schlechtere Developer Experience
- ❌ Webhooks sind unzuverlässig
- ❌ Keine automatische Tax-Berechnung
- ❌ Schlechtere Conversion Rate (Kunden müssen PayPal-Account haben)
- ✅ Stripe: Kunden können direkt mit Karte zahlen (höhere Conversion)

### "Was ist mit Datenschutz (DSGVO)?"

- ✅ Stripe ist DSGVO-konform
- ✅ Stripe hat Data Processing Agreement (DPA)
- ✅ Kreditkartendaten werden nie auf deinem Server gespeichert
- ✅ Stripe kümmert sich um PCI-DSS Compliance

### "Welche Zahlungsmethoden funktionieren?"

Mit deinem Setup:

- ✅ Kreditkarte (Visa, Mastercard, Amex)
- ✅ SEPA Lastschrift (in Europa)
- ❌ PayPal (müsstest du extra aktivieren)
- ❌ Klarna/Sofortüberweisung (müsstest du extra aktivieren)

**Tipp:** Starte mit Karte + SEPA, das deckt 95% der Kunden ab.

---

## 📞 Support

**Stripe Documentation:**

- https://stripe.com/docs
- https://stripe.com/docs/billing/subscriptions

**Stripe Support:**

- Live Chat im Dashboard (unten rechts)
- Email: support@stripe.com
- Telefon: +49 800 000 0000 (kostenlos)

**BotlLab Internal:**

- Siehe: `DEPLOYMENT_CHECKLIST.md`
- Siehe: `ROADMAP_SUBSCRIPTION_LIFECYCLE.md`

---

**Viel Erfolg beim Setup! 🚀**

Sobald du Stripe konfiguriert hast, geht es weiter mit der Integration in BotlLab (Environment Variables setzen).
