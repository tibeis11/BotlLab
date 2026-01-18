-- Snippet: Enterprise Access Codes generieren
-- Dieses Script dient als Vorlage für das Erstellen von exklusiven Zugangscodes für die Beta-Phase.

-- 1. Einmaliger Code für einen spezifischen User (z.B. Early Bird)
INSERT INTO enterprise_codes (code, max_uses, expires_at) 
VALUES ('LAB-ALPHA-001', 1, '2026-12-31 23:59:59');

-- 2. Gruppen-Code für 10 Beta-Tester (z.B. für Discord/Community)
INSERT INTO enterprise_codes (code, max_uses, expires_at) 
VALUES ('LAB-COMMUNITY-10', 10, '2026-06-30 23:59:59');

-- 3. Unlimitierter Admin/Developer Code (Ablauf in ferner Zukunft)
INSERT INTO enterprise_codes (code, max_uses, expires_at) 
VALUES ('LAB-DEV-INTERNAL', 9999, '2099-12-31 23:59:59');

/* 
HINWEISE:
- Die Codes müssen UNIQUE sein (daher 'code' als Primary Key).
- 'current_uses' wird automatisch durch die RPC Funktion 'redeem_enterprise_code' hochgezählt.
- Wenn ein Code abgelaufen ist oder sein Limit erreicht hat, wirft die RPC einen Fehler.
*/

-- Abfrage: Alle aktiven/verfügbaren Codes anzeigen
-- SELECT code, max_uses, current_uses, expires_at 
-- FROM enterprise_codes 
-- WHERE current_uses < max_uses AND expires_at > NOW();
