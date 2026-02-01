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
</html>`
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
    breweryId: string
) {
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
            settingsUrl: `https://botllab.de/team/${breweryId}/analytics?tab=reports`
        }
    });
}
