# Datenschutzerklärung / Privacy Policy

**Discophery**  
Betreiber: mazer666 (GitHub)  
Gehostet auf: GitHub Pages  
Stand: April 2026

---

## 1. Überblick

Diese App ist ein persönliches, nicht-kommerzielles Projekt.  
Sie dient der privaten Nutzung als werbefreier News-Reader.

---

## 2. Welche Daten werden verarbeitet?

### 2.1 Google Login (OAuth 2.0)

Wenn du dich mit deinem Google-Account einloggst, erhält diese App:

- Deinen **Namen** (zur Anzeige in der App)
- Deine **E-Mail-Adresse** (zur Identifikation)
- Dein **Profilbild** (zur Anzeige in der App)

Diese Daten werden **nicht gespeichert** — weder auf einem Server noch in einer Datenbank.  
Sie existieren nur für die Dauer deiner Browser-Session im Arbeitsspeicher.

Die Verarbeitung des Logins erfolgt durch Google. Es gelten die  
[Datenschutzbestimmungen von Google](https://policies.google.com/privacy).

### 2.2 Lokale Einstellungen (localStorage)

Die folgenden Daten werden **ausschließlich lokal in deinem Browser** gespeichert:

- Deine Filter-Einstellungen (blockierte Quellen, Keywords)
- Weggewischte Artikel (als anonyme IDs)
- App-Einstellungen (Refresh-Intervall etc.)

Diese Daten verlassen deinen Browser nicht. Es gibt keinen Server der diese Daten empfängt.

### 2.3 RSS-Feeds

Die App lädt RSS-Feeds der von dir konfigurierten Nachrichtenquellen.  
Diese Anfragen werden über einen öffentlichen CORS-Proxy (allorigins.win) geleitet,  
da Browser direkte Anfragen an fremde Domains aus Sicherheitsgründen blockieren.

Dabei werden folgende Daten an allorigins.win übertragen:
- Die URL des angeforderten RSS-Feeds

Es werden **keine persönlichen Daten** an allorigins.win übertragen.  
Die Datenschutzbestimmungen von allorigins.win findest du auf deren Website.

---

## 3. Was wird nicht getan

- Es werden **keine Cookies** gesetzt
- Es gibt **kein Tracking** oder Analytics
- Es werden **keine Daten an Dritte verkauft**
- Es gibt **keine Werbung**
- Es werden **keine Nutzerprofile** erstellt

---

## 4. Deine Rechte

Da keine personenbezogenen Daten auf Servern gespeichert werden,  
kannst du deine lokalen Daten jederzeit selbst löschen:

- **Browser-Einstellungen** → Websitedaten löschen → discophery
- Oder in der App: Einstellungen → "Alle Daten zurücksetzen"

---

## 5. Kontakt

Bei Fragen: GitHub Issues unter  
https://github.com/mazer666/discophery/issues

---

## 6. Änderungen

Änderungen an dieser Datenschutzerklärung werden in der  
[Commit-Historie](https://github.com/mazer666/discophery/commits/main/docs/privacy-policy.md)  
auf GitHub nachvollziehbar dokumentiert.
