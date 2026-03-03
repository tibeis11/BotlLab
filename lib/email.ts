import { Resend } from 'resend';

// Templates stored in memory to avoid Vercel/Next.js file system issues in serverless functions
const EMAIL_TEMPLATES: Record<string, string> = {
    'image-approved': `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bild veröffentlicht — BotlLab</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background-color: #f8fafc; padding: 32px; border-bottom: 1px solid #e2e8f0; }
    .content { padding: 40px; }
    .heading { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.025em; }
    .text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; }
    .button-container { text-align: left; margin-top: 32px; }
    .button { display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 14px; padding: 14px 32px; border-radius: 6px; text-decoration: none; }
    .footer { padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #f1f5f9; }
    .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; }
    
    .status-badge { display: inline-block; padding: 4px 12px; background-color: #ecfdf5; color: #059669; border: 1px solid #d1fae5; border-radius: 100px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }

    @media only screen and (max-width: 600px) {
      .content { padding: 24px !important; }
      .wrapper { padding: 0 !important; }
      .container { border-radius: 0 !important; box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <div class="container">
            <!-- Header -->
            <div class="header">
               <a href="https://botllab.de" target="_blank">
                  <img src="https://botllab.de/brand/logo_withName.svg" alt="BotlLab" width="140" style="display: block; opacity: 0.9;">
               </a>
            </div>

            <!-- Content -->
            <div class="content">
              <span class="status-badge">Veröffentlicht</span>
              <h1 class="heading">Dein Bild ist live 🎉</h1>
              <p class="text">
                 Gute Neuigkeiten — das von dir hochgeladene Bild für <strong>{{itemName}}</strong> wurde geprüft und ist jetzt für alle sichtbar.
              </p>
              
              <div class="button-container">
                <a href="{{itemUrl}}" class="button" target="_blank">Element ansehen</a>
              </div>
            </div>
             
             <!-- Footer -->
             <div class="footer">
                <p class="footer-text">
                  BotlLab • <a href="https://botllab.de" target="_blank" style="color: #94a3b8; text-decoration: none;">botllab.de</a>
                </p>
             </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`,

    'image-rejected': `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bild abgelehnt — BotlLab</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background-color: #f8fafc; padding: 32px; border-bottom: 1px solid #e2e8f0; }
    .content { padding: 40px; }
    .heading { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.025em; }
    .text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; }
    .button-container { text-align: left; margin-top: 32px; }
    .button { display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 14px; padding: 14px 32px; border-radius: 6px; text-decoration: none; }
    .footer { padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #f1f5f9; }
    .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; }
    
    .status-badge { display: inline-block; padding: 4px 12px; background-color: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; border-radius: 100px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
    .reason-box { background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 16px; margin-bottom: 24px; }
    .reason-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9a3412; font-weight: 700; margin-bottom: 4px; display: block; }
    .reason-text { color: #7c2d12; font-size: 14px; margin: 0; }

    @media only screen and (max-width: 600px) {
      .content { padding: 24px !important; }
      .wrapper { padding: 0 !important; }
      .container { border-radius: 0 !important; box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <div class="container">
            <!-- Header -->
            <div class="header">
               <a href="https://botllab.de" target="_blank">
                  <img src="https://botllab.de/brand/logo_withName.svg" alt="BotlLab" width="140" style="display: block; opacity: 0.9;">
               </a>
            </div>

            <!-- Content -->
            <div class="content">
              <span class="status-badge">Abgelehnt</span>
              <h1 class="heading">Bild nicht veröffentlicht</h1>
              <p class="text">
                 Leider entspricht dein Bild für <strong>{{itemName}}</strong> nicht unseren Richtlinien.
              </p>
              
              <div class="reason-box">
                 <span class="reason-label">Begründung</span>
                 <p class="reason-text">{{moderatorNote}}</p>
              </div>

              <p class="text">
                 Du kannst das Bild korrigieren und erneut hochladen.
              </p>
              
              <div class="button-container">
                <a href="{{editUrl}}" class="button" target="_blank">Bild bearbeiten</a>
              </div>
            </div>
             
             <!-- Footer -->
             <div class="footer">
                <p class="footer-text">
                  BotlLab • <a href="https://botllab.de" target="_blank" style="color: #94a3b8; text-decoration: none;">botllab.de</a>
                </p>
             </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`,

    'report-resolved': `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Update zur Meldung — BotlLab</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background-color: #f8fafc; padding: 32px; border-bottom: 1px solid #e2e8f0; }
    .content { padding: 40px; }
    .heading { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.025em; }
    .text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; }
    .button-container { text-align: left; margin-top: 32px; }
    .button { display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 14px; padding: 14px 32px; border-radius: 6px; text-decoration: none; }
    .footer { padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #f1f5f9; }
    .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; }
    
    .status-badge { display: inline-block; padding: 4px 12px; background-color: #f0f9ff; color: #0369a1; border: 1px solid #e0f2fe; border-radius: 100px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }

    @media only screen and (max-width: 600px) {
      .content { padding: 24px !important; }
      .wrapper { padding: 0 !important; }
      .container { border-radius: 0 !important; box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <div class="container">
            <!-- Header -->
            <div class="header">
               <a href="https://botllab.de" target="_blank">
                  <img src="https://botllab.de/brand/logo_withName.svg" alt="BotlLab" width="140" style="display: block; opacity: 0.9;">
               </a>
            </div>

            <!-- Content -->
            <div class="content">
              <span class="status-badge">Meldung bearbeitet</span>
              <h1 class="heading">Update zu deiner Meldung</h1>
              <p class="text">
                 Danke, dass du uns auf diesen Inhalt hingewiesen hast. Wir haben deine Meldung vom <strong>{{reportDate}}</strong> geprüft.
              </p>
              
              <div class="text" style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
                 <strong>Ergebnis:</strong> {{status}}<br>
                 <span style="font-size: 14px;">{{messageSummary}}</span>
              </div>
              
              <div class="button-container">
                <a href="{{reportUrl}}" class="button" target="_blank">Meldung anzeigen</a>
              </div>
            </div>
             
             <!-- Footer -->
             <div class="footer">
                <p class="footer-text">
                  BotlLab • <a href="https://botllab.de" target="_blank" style="color: #94a3b8; text-decoration: none;">botllab.de</a>
                </p>
             </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`,

    'forum-reply': `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neue Antwort im Forum — BotlLab</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background-color: #f8fafc; padding: 32px; border-bottom: 1px solid #e2e8f0; }
    .content { padding: 40px; }
    .heading { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.025em; }
    .text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; }
    .button-container { text-align: left; margin-top: 32px; }
    .button { display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 14px; padding: 14px 32px; border-radius: 6px; text-decoration: none; }
    .footer { padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #f1f5f9; }
    .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; }
    
    .quote-box { background-color: #f1f5f9; border-left: 4px solid #cbd5e1; padding: 16px; border-radius: 4px; color: #334155; font-style: italic; margin-bottom: 24px; }

    @media only screen and (max-width: 600px) {
      .content { padding: 24px !important; }
      .wrapper { padding: 0 !important; }
      .container { border-radius: 0 !important; box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <div class="container">
            <!-- Header -->
            <div class="header">
               <a href="https://botllab.de" target="_blank">
                  <img src="https://botllab.de/brand/logo_withName.svg" alt="BotlLab" width="140" style="display: block; opacity: 0.9;">
               </a>
            </div>

            <!-- Content -->
            <div class="content">
              <h1 class="heading">Neue Antwort 💬</h1>
              <p class="text">
                 <strong>{{replierName}}</strong> hat auf deine Diskussion <strong>"{{threadTitle}}"</strong> geantwortet.
              </p>
              
              <div class="quote-box">
                "{{messagePreview}}"
              </div>
              
              <div class="button-container">
                <a href="{{threadUrl}}" class="button" target="_blank">Diskussion ansehen</a>
              </div>
            </div>
             
             <!-- Footer -->
             <div class="footer">
                <p class="footer-text">
                  BotlLab • <a href="https://botllab.de" target="_blank" style="color: #94a3b8; text-decoration: none;">botllab.de</a>
                </p>
             </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`,

    'analytics-report': `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dein Analytics Report — BotlLab</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background-color: #f8fafc; padding: 32px; border-bottom: 1px solid #e2e8f0; }
    .content { padding: 40px; }
    .heading { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.025em; }
    .text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; }
    .button-container { text-align: center; margin-top: 32px; }
    .button { display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 14px; padding: 14px 32px; border-radius: 6px; text-decoration: none; }
    .footer { padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #f1f5f9; }
    .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; }
    
    /* Analytics Specific */
    .kpi-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 32px; }
    .kpi-cell { width: 48%; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; }
    .kpi-spacer { width: 4%; }
    .kpi-value { font-size: 32px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.05em; }
    .kpi-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin: 8px 0 0 0; }
    
    .list-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; }

    @media only screen and (max-width: 600px) {
      .content { padding: 24px !important; }
      .wrapper { padding: 0 !important; }
      .container { border-radius: 0 !important; box-shadow: none !important; }
      .kpi-cell { display: block; width: 100% !important; margin-bottom: 12px; box-sizing: border-box; }
      .kpi-spacer { display: none; }
      .kpi-table { display: block; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <div class="container">
            <!-- Header -->
            <div class="header">
               <a href="https://botllab.de" target="_blank">
                  <img src="https://botllab.de/brand/logo_withName.svg" alt="BotlLab" width="140" style="display: block; opacity: 0.9;">
               </a>
            </div>

            <!-- Content -->
            <div class="content">
              <h1 class="heading">Dein Analytics Report 📈</h1>
              <p class="text">
                Hier ist die Zusammenfassung für <strong>{{breweryName}}</strong> im Zeitraum {{period}}.
              </p>
              
              <!-- KPI Cards -->
              <table class="kpi-table" role="presentation">
                <tr>
                  <td class="kpi-cell">
                    <p class="kpi-value">{{totalScans}}</p>
                    <p class="kpi-label">Scans</p>
                  </td>
                  <td class="kpi-spacer"></td>
                  <td class="kpi-cell">
                    <p class="kpi-value" style="color: #0891b2;">{{uniqueVisitors}}</p>
                    <p class="kpi-label">Visitors</p>
                  </td>
                </tr>
              </table>

              <!-- Top Brews List -->
              <div style="margin-bottom: 24px;">
                 <h3 class="list-title">Top Performance</h3>
                 {{topBrewsList}}
              </div>

              <div class="button-container">
                <a href="{{dashboardUrl}}" class="button" target="_blank">Zum Dashboard</a>
              </div>
            </div>
             
             <!-- Footer -->
             <div class="footer">
                <p class="footer-text" style="margin-bottom: 8px;">
                  Du erhältst diesen Report basierend auf deinen Einstellungen. <a href="{{settingsUrl}}" style="color: #64748b; text-decoration: underline;">Einstellungen ändern</a>
                </p>
                <p class="footer-text">
                  BotlLab • <a href="https://botllab.de" target="_blank" style="color: #94a3b8; text-decoration: none;">botllab.de</a>
                </p>
             </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`,

    'new-brew': `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Neues Rezept — BotlLab</title>
  <style>
    body { font-family: sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; padding: 32px; border-radius: 8px; }
    .btn { display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Neues Rezept: {{brewName}} 🍺</h2>
    <p><strong>{{authorName}}</strong> hat ein neues Rezept veröffentlicht.</p>
    <p>Typ: {{brewType}}</p>
    <p style="margin-top: 24px;">
      <a href="{{brewUrl}}" class="btn">Rezept ansehen</a>
    </p>
  </div>
</body>
</html>`,

    'new-rating': `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Neue Bewertung — BotlLab</title>
  <style>
    body { font-family: sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; padding: 32px; border-radius: 8px; }
    .btn { display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
    .stars { color: #f59e0b; font-size: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Neue Bewertung für {{brewName}}</h2>
    <p><strong>{{authorName}}</strong> hat dein Rezept bewertet.</p>
    <p class="stars">Bewertung: {{ratingValue}}/5 ★</p>
    <blockquote style="background: #f1f5f9; padding: 16px; border-left: 4px solid #cbd5e1; margin: 24px 0;">
      {{comment}}
    </blockquote>
    <p>
      <a href="{{ratingUrl}}" class="btn">Bewertung ansehen</a>
    </p>
  </div>
</body>
</html>`,

    'new-thread': `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Neues Thema — BotlLab</title>
  <style>
    body { font-family: sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; padding: 32px; border-radius: 8px; }
    .btn { display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Neues Forum-Thema: {{threadTitle}}</h2>
    <p><strong>{{authorName}}</strong> hat ein neues Thema in <strong>{{category}}</strong> erstellt.</p>
    <p style="margin-top: 24px;">
      <a href="{{threadUrl}}" class="btn">Thema ansehen</a>
    </p>
  </div>
</body>
</html>`,

    'content-moderated': `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inhalt entfernt — BotlLab</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background-color: #f8fafc; padding: 32px; border-bottom: 1px solid #e2e8f0; }
    .content { padding: 40px; }
    .heading { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.025em; }
    .text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; }
    .button-container { text-align: left; margin-top: 32px; }
    .button { display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 14px; padding: 14px 32px; border-radius: 6px; text-decoration: none; }
    .footer { padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #f1f5f9; }
    .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; }
    .status-badge { display: inline-block; padding: 4px 12px; background-color: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; border-radius: 100px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
    .info-box { background-color: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 24px; border-left: 3px solid #fbbf24; }
    @media only screen and (max-width: 600px) { .content { padding: 24px !important; } .wrapper { padding: 0 !important; } .container { border-radius: 0 !important; box-shadow: none !important; } }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <div class="container">
          <div class="header">
            <a href="https://botllab.de" target="_blank"><img src="https://botllab.de/brand/logo_withName.svg" alt="BotlLab" width="140" style="display: block; opacity: 0.9;"></a>
          </div>
          <div class="content">
            <span class="status-badge">Inhalt entfernt</span>
            <h1 class="heading">Dein Inhalt wurde entfernt</h1>
            <p class="text">Wir haben einen deiner Inhalte aufgrund einer Meldung überprüft und entfernt.</p>
            <div class="info-box">
              <strong>Inhalt:</strong> {{contentTitle}}<br>
              <span style="font-size: 14px; color: #64748b;"><strong>Grund:</strong> {{reasonLabel}}</span>
            </div>
            <p class="text">Wenn du der Meinung bist, dass diese Entscheidung nicht korrekt war, kannst du Widerspruch einlegen. Dein Widerspruch wird von unserem Team gemäß EU Digital Services Act (Art. 20 DSA) geprüft.</p>
            <div class="button-container">
              <a href="{{appealUrl}}" class="button" target="_blank">Widerspruch einlegen</a>
            </div>
            <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">Falls du keinen Widerspruch einlegen möchtest, musst du nichts weiter tun.</p>
          </div>
          <div class="footer"><p class="footer-text">BotlLab • <a href="https://botllab.de" target="_blank" style="color: #94a3b8; text-decoration: none;">botllab.de</a></p></div>
        </div>
      </td></tr>
    </table>
  </div>
</body>
</html>`,

    'appeal-decision': `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Widerspruch entschieden — BotlLab</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background-color: #f8fafc; padding: 32px; border-bottom: 1px solid #e2e8f0; }
    .content { padding: 40px; }
    .heading { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.025em; }
    .text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; }
    .button-container { text-align: left; margin-top: 32px; }
    .button { display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 14px; padding: 14px 32px; border-radius: 6px; text-decoration: none; }
    .footer { padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #f1f5f9; }
    .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; }
    .status-badge { display: inline-block; padding: 4px 12px; background-color: #f0f9ff; color: #0369a1; border: 1px solid #e0f2fe; border-radius: 100px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
    .info-box { background-color: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 24px; border-left: 3px solid #e2e8f0; }
    @media only screen and (max-width: 600px) { .content { padding: 24px !important; } .wrapper { padding: 0 !important; } .container { border-radius: 0 !important; box-shadow: none !important; } }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <div class="container">
          <div class="header">
            <a href="https://botllab.de" target="_blank"><img src="https://botllab.de/brand/logo_withName.svg" alt="BotlLab" width="140" style="display: block; opacity: 0.9;"></a>
          </div>
          <div class="content">
            <span class="status-badge">Widerspruch entschieden</span>
            <h1 class="heading">{{decisionHeading}}</h1>
            <p class="text">Dein Widerspruch zu <strong>{{targetTitle}}</strong> wurde von unserem Team geprüft.</p>
            <div class="info-box">
              <strong>Entscheidung:</strong> {{decisionLabel}}<br>
              <span style="font-size: 14px; color: #64748b;"><strong>Begründung:</strong> {{adminResponse}}</span>
            </div>
            <p class="text">{{outcomeText}}</p>
            <div class="button-container">
              <a href="{{dashboardUrl}}" class="button" target="_blank">Zum Dashboard</a>
            </div>
          </div>
          <div class="footer"><p class="footer-text">BotlLab • <a href="https://botllab.de" target="_blank" style="color: #94a3b8; text-decoration: none;">botllab.de</a></p></div>
        </div>
      </td></tr>
    </table>
  </div>
</body>
</html>`,

  // -------------------------------------------------------------------------
  // Admin Daily Platform Report
  // -------------------------------------------------------------------------
  'admin-daily-report': `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BotlLab Daily Report</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #0a0a0a; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111111; border-radius: 12px; overflow: hidden; border: 1px solid #1f1f1f; }
    .header { background-color: #0a0a0a; padding: 28px 32px; border-bottom: 1px solid #1f1f1f; }
    .content { padding: 36px 40px; }
    .badge { display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 4px; background-color: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); margin-bottom: 16px; }
    .heading { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0; letter-spacing: -0.025em; }
    .subheading { font-size: 14px; color: #71717a; margin: 0 0 28px 0; }
    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #52525b; margin: 0 0 10px 0; }
    .button-container { text-align: center; margin-top: 32px; }
    .button { display: inline-block; background-color: #ffffff; color: #000000; font-weight: 700; font-size: 13px; padding: 12px 28px; border-radius: 6px; text-decoration: none; }
    .footer { padding: 20px 32px; background-color: #0a0a0a; border-top: 1px solid #1f1f1f; }
    .footer-text { font-size: 12px; color: #52525b; line-height: 1.5; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <div class="container">
          <div class="header">
            <a href="https://botllab.de" target="_blank">
              <img src="https://botllab.de/brand/logo_withName.svg" alt="BotlLab" width="120" style="display:block;opacity:0.8;">
            </a>
          </div>
          <div class="content">
            <span class="badge">Admin · Tagesbericht</span>
            <h1 class="heading">Platform Status</h1>
            <p class="subheading">{{date}} · Automatischer Tagesbericht</p>

            <p class="section-label">Nutzer</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
              <tr>
                <td style="width:48%;background:#18181b;border:1px solid #27272a;border-radius:8px;padding:18px 20px;vertical-align:top;">
                  <p style="font-size:28px;font-weight:800;color:#fff;margin:0;letter-spacing:-0.04em;">{{totalUsers}}</p>
                  <p style="font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.06em;margin:6px 0 0 0;">Gesamt</p>
                </td>
                <td style="width:4%;"></td>
                <td style="width:48%;background:#18181b;border:1px solid #27272a;border-radius:8px;padding:18px 20px;vertical-align:top;">
                  <p style="font-size:28px;font-weight:800;color:#22d3ee;margin:0;letter-spacing:-0.04em;">{{activeUsers30d}}</p>
                  <p style="font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.06em;margin:6px 0 0 0;">Aktiv (30d)</p>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="width:48%;background:#18181b;border:1px solid #27272a;border-radius:8px;padding:18px 20px;vertical-align:top;">
                  <p style="font-size:28px;font-weight:800;color:#4ade80;margin:0;letter-spacing:-0.04em;">+{{newUsersToday}}</p>
                  <p style="font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.06em;margin:6px 0 0 0;">Neu heute</p>
                </td>
                <td style="width:4%;"></td>
                <td style="width:48%;background:#18181b;border:1px solid #27272a;border-radius:8px;padding:18px 20px;vertical-align:top;">
                  <p style="font-size:28px;font-weight:800;color:{{errorColor}};margin:0;letter-spacing:-0.04em;">{{errorCount24h}}</p>
                  <p style="font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.06em;margin:6px 0 0 0;">Fehler (24h)</p>
                </td>
              </tr>
            </table>

            <p class="section-label">Content &amp; Activity</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;background:#18181b;border:1px solid #27272a;border-radius:8px;overflow:hidden;">
              <tr style="border-bottom:1px solid #27272a;">
                <td style="padding:12px 16px;font-size:13px;color:#a1a1aa;">Brews gesamt</td>
                <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#e4e4e7;text-align:right;">{{totalBrews}}</td>
              </tr>
              <tr style="border-bottom:1px solid #27272a;">
                <td style="padding:12px 16px;font-size:13px;color:#a1a1aa;">Bottle-Scans gesamt</td>
                <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#e4e4e7;text-align:right;">{{totalScans}}</td>
              </tr>
              <tr style="border-bottom:1px solid #27272a;">
                <td style="padding:12px 16px;font-size:13px;color:#a1a1aa;">Brauereien</td>
                <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#e4e4e7;text-align:right;">{{totalBreweries}}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#a1a1aa;">&#216; Bewertung</td>
                <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#e4e4e7;text-align:right;">{{avgRating}} / 5</td>
              </tr>
            </table>

            <div class="button-container">
              <a href="{{dashboardUrl}}" class="button" target="_blank">&#8594; Admin Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p class="footer-text">Du erhältst diesen Bericht als Super-Admin von BotlLab. <a href="{{settingsUrl}}" style="color:#71717a;text-decoration:underline;">Benachrichtigung deaktivieren</a></p>
            <p class="footer-text" style="margin-top:6px;">BotlLab · <a href="https://botllab.de" style="color:#52525b;text-decoration:none;">botllab.de</a></p>
          </div>
        </div>
      </td></tr>
    </table>
  </div>
</body>
</html>`,

  // Phase 10.7: Event detected notification
  'event-detected': `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event erkannt — BotlLab</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background-color: #f8fafc; padding: 32px; border-bottom: 1px solid #e2e8f0; }
    .content { padding: 40px; }
    .heading { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.025em; }
    .text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; }
    .button-container { text-align: left; margin-top: 32px; }
    .button { display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 14px; padding: 14px 32px; border-radius: 6px; text-decoration: none; }
    .footer { padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #f1f5f9; }
    .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; }
    .event-badge { display: inline-block; padding: 4px 12px; background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; border-radius: 100px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px !important; }
      .wrapper { padding: 0 !important; }
      .container { border-radius: 0 !important; box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <div class="container">
            <div class="header">
               <a href="https://botllab.de" target="_blank">
                  <img src="https://botllab.de/brand/logo_withName.svg" alt="BotlLab" width="140" style="display: block; opacity: 0.9;">
               </a>
            </div>
            <div class="content">
              <span class="event-badge">Event erkannt</span>
              <h1 class="heading">&#127867; {{totalScans}} Personen haben dein Bier in {{city}} probiert!</h1>
              <p class="text">
                Hallo {{brewerName}},<br><br>
                Am {{eventDate}} zwischen {{eventStartTime}} und {{eventEndTime}} wurden <strong>{{totalScans}} Scans</strong> deines <strong>{{brewName}}</strong> in {{city}} registriert.
                Das sieht nach einem <strong>{{eventTypeLabel}}</strong> aus!
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td width="50%" style="padding-right: 8px;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
                      <p style="font-size: 28px; font-weight: 800; color: #0f172a; margin: 0;">{{totalScans}}</p>
                      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin: 4px 0 0; font-weight: 600;">Scans</p>
                    </div>
                  </td>
                  <td width="50%" style="padding-left: 8px;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
                      <p style="font-size: 28px; font-weight: 800; color: #0f172a; margin: 0;">{{uniqueSessions}}</p>
                      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin: 4px 0 0; font-weight: 600;">Personen</p>
                    </div>
                  </td>
                </tr>
              </table>
              <p class="text" style="font-size: 13px; color: #64748b;">
                Du kannst dieses Event in deinem Analytics-Dashboard benennen und mit Notizen versehen.
              </p>
              <div class="button-container">
                <a href="{{eventUrl}}" class="button" target="_blank">Event im Dashboard ansehen &#8594;</a>
              </div>
            </div>
            <div class="footer">
              <p class="footer-text">
                Du erh&auml;ltst diese Benachrichtigung, weil dein Bier bei einem Event gescannt wurde.<br>
                BotlLab &bull; <a href="https://botllab.de" target="_blank" style="color: #94a3b8; text-decoration: none;">botllab.de</a>
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`,
};

// Lazy initialization to prevent crash if API key is missing during module evaluation
let resendInstance: Resend | null = null;

function getResend() {
    if (!resendInstance) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.warn('⚠️ RESEND_API_KEY is missing. Email features will not work.');
            return null;
        }
        resendInstance = new Resend(apiKey);
    }
    return resendInstance;
}

interface EmailOptions {
    to: string;
    subject: string;
    template: string;
    placeholders: Record<string, string>;
}

/**
 * Core function to send an email using a local HTML template and Resend.
 */
export async function sendEmail({ to, subject, template, placeholders }: EmailOptions) {
    try {
        const resend = getResend();
        if (!resend) {
            return { success: false, error: 'Resend API key missing' };
        }

        // Use in-memory templates instead of file system read (Vercel/Serverless compatible)
        let html = EMAIL_TEMPLATES[template];
        
        if (!html) {
             console.error(`Email template '${template}' not found in memory map.`);
             return { success: false, error: `Template '${template}' not found` };
        }

        // Replace placeholders
        Object.entries(placeholders).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, value || '');
        });

        console.log(`[Email] Sending to: ${to} | Subject: ${subject}`);
        const { data, error } = await resend.emails.send({
            from: 'BotlLab <noreply@botllab.de>',
            to,
            subject,
            html,
        });

        if (error) {
            console.error('[Email] Error sending via Resend:', error);
            return { success: false, error };
        }

        console.log('[Email] Sent successfully:', data);
        return { success: true, data };
    } catch (error) {
        console.error('[Email] Critical service error:', error);
        return { success: false, error };
    }
}

/**
 * Notification for reporting users.
 */
export async function sendReportResolvedEmail(to: string, reportDate: string, status: string, messageSummary: string, reportId: string) {
    return sendEmail({
        to,
        subject: 'Update zu deiner Meldung — BotlLab',
        template: 'report-resolved',
        placeholders: {
            reportDate,
            status,
            messageSummary,
            reportUrl: `https://botllab.de/team/notifications` // Or specific report view if exists
        }
    });
}

/**
 * Notification for content approval.
 */
export async function sendImageApprovedEmail(to: string, itemName: string, itemId: string, type: 'brew' | 'brewery') {
    const itemUrl = type === 'brew' 
        ? `https://botllab.de/brew/${itemId}` 
        : `https://botllab.de/brewery/${itemId}`;

    return sendEmail({
        to,
        subject: 'Dein Bild wurde genehmigt 🎉 — BotlLab',
        template: 'image-approved',
        placeholders: {
            itemName,
            itemUrl
        }
    });
}

/**
 * Notification for content rejection.
 */
export async function sendImageRejectedEmail(to: string, itemName: string, reason: string, breweryId: string) {
    return sendEmail({
        to,
        subject: 'Dein Bild konnte nicht veröffentlicht werden — BotlLab',
        template: 'image-rejected',
        placeholders: {
            itemName,
            moderatorNote: reason,
            editUrl: `https://botllab.de/team/${breweryId}/settings`
        }
    });
}

/**
 * Notification for forum replies.
 */
export async function sendForumReplyEmail(to: string, replierName: string, threadTitle: string, messagePreview: string, threadId: string) {
    return sendEmail({
        to,
        subject: `Neue Antwort: ${threadTitle} — BotlLab`,
        template: 'forum-reply',
        placeholders: {
            replierName,
            threadTitle,
            messagePreview,
            threadUrl: `https://botllab.de/forum/thread/${threadId}`
        }
    });
}

/**
 * Send analytics report email.
 */
export async function sendAnalyticsReportEmail(
    to: string, 
    breweryName: string, 
    period: string, 
    totalScans: number, 
    uniqueVisitors: number,
    topBrewsList: string,
    breweryId: string,
    extended?: {
      drinkerRate?: number;
      newVerifiedDrinkers?: number;
      topFlavorTag?: string | null;
      peakHour?: number | null;
      offFlavorAlerts?: number;
      qualitySummary?: {
        avgRating: number | null;
        totalRatings: number;
        bestBrew: { name: string; avgRating: number } | null;
        worstBrew: { name: string; avgRating: number } | null;
      };
    }
) {
    const peakHourLabel = extended?.peakHour != null
      ? `${extended.peakHour}:00–${extended.peakHour + 1}:00 Uhr`
      : null;

    const offFlavorBanner = (extended?.offFlavorAlerts ?? 0) > 0
      ? `<div style="background:#450a0a;border:1px solid #7f1d1d;border-radius:6px;padding:16px;margin-bottom:24px;">
           <p style="margin:0;font-size:13px;color:#fca5a5;font-weight:600;">&#9888; Off-Flavor Warnung aktiv</p>
           <p style="margin:6px 0 0;font-size:12px;color:#f87171;">${extended!.offFlavorAlerts} Fehlgeschmacks-Anomalie${extended!.offFlavorAlerts !== 1 ? 'n' : ''} in den letzten 30 Tagen entdeckt. <a href="https://botllab.de/team/${breweryId}/analytics?tab=quality" style="color:#f87171;">Jetzt ansehen</a>.</p>
         </div>`
      : '';

    return sendEmail({
        to,
        subject: `Dein Analytics Report für ${breweryName} — BotlLab`,
        template: 'analytics-report',
        placeholders: {
            breweryName,
            period,
            totalScans: totalScans.toString(),
            uniqueVisitors: uniqueVisitors.toString(),
            topBrewsList,
            dashboardUrl: `https://botllab.de/team/${breweryId}/analytics`,
            settingsUrl: `https://botllab.de/team/${breweryId}/analytics?tab=reports`,
            // Phase 6 extended
            drinkerRateRow: extended?.drinkerRate != null
              ? `<tr>
                   <td class="kpi-cell">
                     <p class="kpi-value" style="color:#10b981;">${extended.drinkerRate.toFixed(1)}%</p>
                     <p class="kpi-label">Drinker Rate</p>
                   </td>
                   <td class="kpi-spacer"></td>
                   <td class="kpi-cell">
                     <p class="kpi-value" style="color:#8b5cf6;">${extended.newVerifiedDrinkers ?? 0}</p>
                     <p class="kpi-label">Neue Verified Drinkers</p>
                   </td>
                 </tr>`
              : '',
            topFlavorRow: extended?.topFlavorTag
              ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
                   <span style="font-size:16px;">&#127870;</span>
                   <span style="font-size:13px;color:#166534;">Top Flavor-Tag diese Woche: <strong>${extended.topFlavorTag}</strong></span>
                 </div>`
              : '',
            peakHourRow: peakHourLabel
              ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
                   <span style="font-size:16px;">&#128336;</span>
                   <span style="font-size:13px;color:#1e40af;">Meiste Scans um <strong>${peakHourLabel}</strong></span>
                 </div>`
              : '',
            offFlavorBanner,
            qualitySummarySection: extended?.qualitySummary?.avgRating != null
              ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
                   <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.05em;">&#127866; Qualitäts-Zusammenfassung</h3>
                   <p style="margin:0 0 8px;font-size:14px;color:#166534;">Durchschnittliche Bewertung: <strong style="font-size:18px;">${extended.qualitySummary!.avgRating}★</strong> <span style="font-size:12px;color:#4ade80;">(${extended.qualitySummary!.totalRatings} Bewertungen)</span></p>
                   ${extended.qualitySummary!.bestBrew ? `<p style="margin:0 0 4px;font-size:13px;color:#166534;">&#128077; Bestes Bier: <strong>${extended.qualitySummary!.bestBrew.name}</strong> (${extended.qualitySummary!.bestBrew.avgRating}★)</p>` : ''}
                   ${extended.qualitySummary!.worstBrew ? `<p style="margin:0 0 4px;font-size:13px;color:#166534;">&#128161; Verbesserungspotenzial: <strong>${extended.qualitySummary!.worstBrew.name}</strong> (${extended.qualitySummary!.worstBrew.avgRating}★)</p>` : ''}
                 </div>`
              : '',
        }
    });
}

/**
 * Notification for new brew.
 */
export async function sendNewBrewEmail(to: string, brewName: string, brewType: string, authorName: string, brewId: string) {
    return sendEmail({
        to,
        subject: `Neues Rezept: ${brewName} — BotlLab`,
        template: 'new-brew',
        placeholders: {
            brewName,
            brewType,
            authorName,
            brewUrl: `https://botllab.de/brew/${brewId}`
        }
    });
}

/**
 * Notification for new rating.
 */
export async function sendNewRatingEmail(to: string, brewName: string, ratingValue: number, comment: string, authorName: string, brewId: string) {
    return sendEmail({
        to,
        subject: `Neue Bewertung für ${brewName} — BotlLab`,
        template: 'new-rating',
        placeholders: {
            brewName,
            ratingValue: ratingValue.toString(),
            comment: comment || 'Kein Kommentar',
            authorName,
            ratingUrl: `https://botllab.de/brew/${brewId}`
        }
    });
}

/**
 * Notification for new forum thread.
 */
export async function sendNewThreadEmail(to: string, threadTitle: string, category: string, authorName: string, threadId: string) {
    return sendEmail({
        to,
        subject: `Neues Thema: ${threadTitle} — BotlLab`,
        template: 'new-thread',
        placeholders: {
            threadTitle,
            category,
            authorName,
            threadUrl: `https://botllab.de/forum/thread/${threadId}`
        }
    });
}

/**
 * DSA Art. 20 — Notify content author that their content was removed.
 */
export async function sendContentModeratedEmail(
    to: string,
    contentTitle: string,
    reasonLabel: string,
    appealUrl: string
) {
    return sendEmail({
        to,
        subject: 'Dein Inhalt wurde entfernt — BotlLab',
        template: 'content-moderated',
        placeholders: { contentTitle, reasonLabel, appealUrl }
    });
}

/**
 * DSA Art. 20 — Notify user about the outcome of their appeal.
 */
export async function sendAppealDecisionEmail(
    to: string,
    targetTitle: string,
    decision: 'accepted' | 'rejected',
    adminResponse: string
) {
    const isAccepted = decision === 'accepted';
    return sendEmail({
        to,
        subject: isAccepted
            ? 'Dein Widerspruch wurde stattgegeben — BotlLab'
            : 'Dein Widerspruch wurde abgelehnt — BotlLab',
        template: 'appeal-decision',
        placeholders: {
            targetTitle: targetTitle || 'deinen Inhalt',
            decisionHeading: isAccepted ? 'Widerspruch stattgegeben ✅' : 'Widerspruch abgelehnt',
            decisionLabel: isAccepted ? 'Stattgegeben' : 'Abgelehnt',
            adminResponse,
            outcomeText: isAccepted
                ? 'Wir haben die Entscheidung revidiert. Der Inhalt wird wiederhergestellt oder die Einschränkung aufgehoben.'
                : 'Nach erneuter Prüfung halten wir die ursprüngliche Entscheidung aufrecht. Bei weiteren Fragen kannst du dich an unser Team wenden.',
            dashboardUrl: 'https://botllab.de/dashboard'
        }
    });
}

// ============================================================================
// Admin Daily Platform Report
// ============================================================================

export interface AdminDailyReportData {
  totalUsers: number
  activeUsers30d: number
  newUsersToday: number
  totalBrews: number
  totalScans: number
  totalBreweries: number
  errorCount24h: number
  avgRating: number
}

/**
 * Sends the daily platform status report to a super-admin.
 */
export async function sendAdminDailyReport(to: string, data: AdminDailyReportData) {
    const date = new Date().toLocaleDateString('de-DE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    return sendEmail({
        to,
        subject: `BotlLab Daily Report · ${new Date().toLocaleDateString('de-DE')}`,
        template: 'admin-daily-report',
        placeholders: {
            date,
            totalUsers:      data.totalUsers.toLocaleString('de-DE'),
            activeUsers30d:  data.activeUsers30d.toLocaleString('de-DE'),
            newUsersToday:   data.newUsersToday.toLocaleString('de-DE'),
            totalBrews:      data.totalBrews.toLocaleString('de-DE'),
            totalScans:      data.totalScans.toLocaleString('de-DE'),
            totalBreweries:  data.totalBreweries.toLocaleString('de-DE'),
            errorCount24h:   data.errorCount24h.toLocaleString('de-DE'),
            avgRating:       data.avgRating.toFixed(1),
            errorColor:      data.errorCount24h > 10 ? '#fb923c' : '#4ade80',
            dashboardUrl:    'https://botllab.de/admin/dashboard',
            settingsUrl:     'https://botllab.de/admin/dashboard?section=settings&view=admins',
        }
    });
}

// ============================================================================
// Phase 10.7: Event Detected Notification
// ============================================================================

const EVENT_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  tasting:  { label: 'Tasting',  emoji: '🍻' },
  festival: { label: 'Festival', emoji: '🎉' },
  party:    { label: 'Party',    emoji: '🎈' },
  meetup:   { label: 'Meetup',   emoji: '🤝' },
  unknown:  { label: 'Event',    emoji: '📍' },
};

/**
 * Phase 10.7 — Notify brewery owner when an event is detected.
 */
export async function sendEventDetectedEmail(
    to: string,
    brewerName: string,
    breweryName: string,
    brewName: string,
    city: string,
    totalScans: number,
    uniqueSessions: number,
    eventDate: string,
    eventEndTime: string,
    eventType: string,
    breweryId: string,
    eventId: string,
) {
    const typeConfig = EVENT_TYPE_LABELS[eventType] || EVENT_TYPE_LABELS.unknown;
    return sendEmail({
        to,
        subject: `${typeConfig.emoji} Event erkannt: ${totalScans} Personen haben dein Bier in ${city} probiert!`,
        template: 'event-detected',
        placeholders: {
            brewerName,
            brewName,
            city,
            totalScans: totalScans.toString(),
            uniqueSessions: uniqueSessions.toString(),
            eventDate,
            eventStartTime: eventDate, // Full formatted date+time
            eventEndTime,
            eventTypeLabel: typeConfig.label,
            eventTypeEmoji: typeConfig.emoji,
            eventUrl: `https://botllab.de/team/${breweryId}/analytics?event=${eventId}`,
        }
    });
}
