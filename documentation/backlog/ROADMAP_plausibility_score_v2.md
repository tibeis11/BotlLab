# Roadmap: Plausibility Score Engine (v2)

## Aktueller Stand (v1)
Derzeit nutzen wir ein hartes Filter-System (Shadowban) basierend auf der "Velocity"-Regel (Trink-Geschwindigkeit). Wir erfassen in der Datenbank bereits vorausschauend einen numerischen `plausibility_score` (`1.0` oder `0.0`), werten diesen momentan aber rein logisch über das `is_shadowbanned = true/false` Flag aus. Alles, was gebannt ist, wird schlichtweg komplett ignoriert.

## Ziel für v2 (Gewichtetes Soft-Penalty-System)
Um auch feinere Nuancen von Troll-Verhalten, Bots oder unzuverlässigen Daten abzufangen – ohne reguläre Nutzer sofort komplett zu bannen – wollen wir den `plausibility_score` als echten Multiplikator (Faktor zwischen `0.0` und `1.0`) nutzen.
Ein Rating geht dann im Dashboard der Brauer nicht nur mit 100% oder 0% ein, sondern kann auch "teilgewichtet" (z.B. mit 60% Vertrauen) abgebildet werden.

### 1. Der Penalty-Katalog (Beispiele)
Jede Aktion (Rating, BTB, VibeCheck) startet programmatisch mit einem Base-Score von `1.0`. Verschiedene Heuristik-Module (Signals) bewerten die Aktion und ziehen (falls zutreffend) Punkte ab:

*   **Signal 1: Supermarkt-Troll (Velocity) - Harter Cut**
    *   *Bedingung:* > 3 unterschiedliche Flaschen in 2 Stunden (pro IP/User).
    *   *Abzug:* `-1.0` (Score fällt sofort auf 0.0) -> Triggert `is_shadowbanned = true`.
*   **Signal 2: Geo-Mismatch - Weicher Cut**
    *   *Bedingung:* IP-Location (Land/Region des Handys) passt absolut nicht zum regionalen Verkaufsgebiet der Flasche (z.B. lokales Kellerbier in Franken, aber IP aus Südostasien).
    *   *Abzug:* `-0.4` (Score fiele z.B. auf 0.6). Das Rating zählt, aber ist schwächer gewichtet.
*   **Signal 3: Ausfüllgeschwindigkeit (Bot-Indikator) - Weicher Cut**
    *   *Bedingung:* `time_to_submit` (Zeit zwischen QR-Scan / Seitenaufruf und Absenden) ist extrem kurz (z.B. < 3 Sekunden für ein komplexes BTB-Flavor-Profile).
    *   *Abzug:* `-0.3` (Indikator für blindes Slider-Wischen).
*   **Signal 4: Tageszeit-Anomalien - Minimaler Cut**
    *   *Bedingung:* Scan um 8 Uhr morgens an einem Dienstag (Ist physisch möglich, aber statistisch ungewöhnlich für den Bierkonsum).
    *   *Abzug:* `-0.1`.

### 2. Auswirkungen auf Analytics und Dashboards
In v2 wird der `plausibility_score` zur **Gewichtung (Weight)** bei der Durchschnittsberechnung in unseren analytischen SQL-Queries.
Statt eines einfachen `AVG(rating)` rechnet das Dashboard dann:
`SUM(rating * plausibility_score) / SUM(plausibility_score)`
Ein 5-Sterne Rating von einem Nutzer mit Plausibilitäts-Score 0.6 zieht den Gesamt-Schnitt des Bieres somit spürbar weniger stark nach oben als dasselbe Rating von einem verifizierten "1.0"-Nutzer.

### 3. Technische Architektur
*   Erweiterung der `evaluatePlausibility` Funktion (`lib/plausibility-service.ts`) zu einer Loop-Architektur.
*   Es wird über ein Array von Regel-Modulen iteriert (`[checkVelocity, checkGeoMismatch, checkTimeToSubmit]`).
*   Der Service summiert alle greifenden Penalties und kappt den Endwert bei `0.0`.
*   Unterschreitet der End-Score einen kritischen Grenzwert (z.B. `<= 0.2`), wird automatisch auch der `is_shadowbanned = true` Not-Hebel gezogen.
