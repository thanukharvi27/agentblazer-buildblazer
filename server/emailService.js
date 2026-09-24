import nodemailer from 'nodemailer';
import { db } from './database.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load server/.env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch (e) {
    // ignore
  }
}

/**
 * Format a non-sensitive error message from an SMTP error object
 */
export function formatSmtpError(err) {
  if (!err) return 'Unknown SMTP error';
  const msg = err.message || String(err);
  if (msg.includes('535') || msg.includes('BadCredentials') || msg.includes('Username and Password not accepted')) {
    return 'Authentication failed (535 BadCredentials): Gmail/SMTP server rejected your credentials. For Gmail, make sure 2-Step Verification is enabled and a 16-character App Password (from myaccount.google.com/apppasswords) is used instead of your account password.';
  }
  if (msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('ENETUNREACH')) {
    return `Network/Port blocked (${err.code || 'ENETUNREACH'}). Render Free Tier blocks outbound SMTP ports (25, 465, 587). To send live emails from Render, use the Resend HTTPS API in Email Settings, or upgrade to a paid Render plan.`;
  }
  if (msg.includes('EENVELOPE') || msg.includes('No recipients defined')) {
    return `Invalid email address or envelope format (${err.code || 'Envelope error'}).`;
  }
  // Strip any accidental password prints or sensitive stack traces
  return msg.split('\n')[0].slice(0, 250);
}

/**
 * Retrieve current email configuration from Database or ENV fallback
 */
export function getEmailConfig() {
  const getSetting = (key) => {
    try {
      const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
      return row ? row.value : null;
    } catch {
      return null;
    }
  };

  const resendApiKey = (getSetting('resend_api_key') || process.env.RESEND_API_KEY || '').trim();
  const service = (getSetting('smtp_service') || process.env.SMTP_SERVICE || (resendApiKey ? 'resend' : '')).trim().toLowerCase();
  const host = (getSetting('smtp_host') || process.env.SMTP_HOST || '').trim();
  const port = Number(getSetting('smtp_port') || process.env.SMTP_PORT || '587') || 587;
  const user = (getSetting('smtp_user') || process.env.SMTP_USER || '').trim();
  let pass = (getSetting('smtp_pass') || process.env.SMTP_PASS || '').trim().replace(/^["']|["']$/g, '');
  let from = (getSetting('smtp_from') || process.env.SMTP_FROM || '').trim();

  // If service is gmail or host is smtp.gmail.com, remove spaces and zero-width chars from App Password
  if ((service === 'gmail' || host.includes('gmail.com')) && pass) {
    pass = pass.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
  }

  // Ensure 'from' header is clean and includes a valid email address
  if (!from) {
    from = user ? `"AgentBlazer Club • SJEC CSE" <${user}>` : '"AgentBlazer Club • SJEC CSE" <agentblazer@sjec.ac.in>';
  } else if (!from.includes('@') && user) {
    from = `"${from.replace(/"/g, '')}" <${user}>`;
  }

  const isPlaceholder = !pass || pass === 'your-16-character-app-password' || pass.includes('app-password');
  const isConfigured = Boolean(resendApiKey || ((service || host) && user && pass && !isPlaceholder));

  return {
    service,
    host,
    port,
    user,
    pass, // internal
    hasPassword: Boolean(pass && !isPlaceholder),
    resendApiKey,
    hasResend: Boolean(resendApiKey),
    from,
    isConfigured,
  };
}

/**
 * Save email settings to SQLite app_settings
 */
export function saveEmailConfig({ service, host, port, user, pass, from, resendApiKey, resend_api_key }) {
  const setSetting = db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  if (service !== undefined) setSetting.run('smtp_service', service.trim());
  if (host !== undefined) setSetting.run('smtp_host', host.trim());
  if (port !== undefined) setSetting.run('smtp_port', String(port).trim());
  if (user !== undefined) setSetting.run('smtp_user', user.trim());
  if (pass !== undefined && pass !== '') {
    const trimmedPass = pass.trim().replace(/^["']|["']$/g, '');
    const cleanPass = (service === 'gmail' || (host && host.includes('gmail.com')))
      ? trimmedPass.replace(/[\s\u200B-\u200D\uFEFF]/g, '')
      : trimmedPass;
    setSetting.run('smtp_pass', cleanPass);
  }
  if (from !== undefined) setSetting.run('smtp_from', from.trim());

  const apiKeyVal = resendApiKey !== undefined ? resendApiKey : resend_api_key;
  if (apiKeyVal !== undefined) {
    setSetting.run('resend_api_key', apiKeyVal.trim());
  }

  return getEmailConfig();
}

/**
 * Build Nodemailer Transporter based on active or provided config
 */
function getTransporter(overrideConfig = null) {
  const config = overrideConfig ? { ...getEmailConfig(), ...overrideConfig } : getEmailConfig();

  if (!config.user || !config.pass) {
    return null;
  }

  const cleanPass = config.pass ? config.pass.replace(/\s+/g, '') : '';

  // Gmail SMTP: Host: smtp.gmail.com, Port: 587, Secure: false, requireTLS: true (STARTTLS)
  if (config.service === 'gmail' || (config.host && config.host.includes('gmail.com'))) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      family: 4,
      auth: {
        user: config.user.trim(),
        pass: cleanPass,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 7000,
    });
  }

  if (config.host && config.user && config.pass) {
    const port = Number(config.port) || 587;
    return nodemailer.createTransport({
      host: config.host.trim(),
      port,
      secure: port === 465,
      requireTLS: port === 587,
      family: 4,
      auth: {
        user: config.user.trim(),
        pass: cleanPass,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 7000,
    });
  }

  return null;
}

/**
 * Universal dispatcher that uses Resend HTTPS API (Port 443, never blocked by cloud hosts)
 * or falls back to Nodemailer SMTP (Port 587/465).
 */
export async function sendRawEmail({ to, subject, html, fromOverride = null, configOverride = null }) {
  const config = configOverride || getEmailConfig();
  const from = fromOverride || config.from;

  // 1. Resend HTTPS API (Port 443) — Works everywhere including Render free tier
  if (config.resendApiKey) {
    console.log(`[Email] Dispatching via Resend HTTPS API to <${to}>...`);
    try {
      const fromHeader = from && from.includes('@') ? from : 'AgentBlazer Club <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromHeader,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Resend API returned status ${res.status}`);
      }
      console.log(`[Resend SUCCESS] Email delivered to <${to}> (Id: ${data.id})`);
      return {
        success: true,
        deliveryStatus: 'sent',
        deliveryDetails: `Delivered via Resend HTTPS API (Id: ${data.id})`,
      };
    } catch (err) {
      console.error('[Resend Error]:', err.message);
      return {
        success: false,
        deliveryStatus: 'failed',
        deliveryDetails: `Resend HTTPS API Error: ${err.message}`,
      };
    }
  }

  // 2. Nodemailer SMTP (Port 587/465)
  const transporter = getTransporter(config);
  if (transporter) {
    console.log(`[SMTP] Attempting delivery to <${to}> via ${config.service || config.host}...`);
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      console.log(`[SMTP SUCCESS] Delivered email to <${to}> (MessageId: ${info.messageId})`);
      return {
        success: true,
        deliveryStatus: 'sent',
        deliveryDetails: `Delivered via SMTP (MessageId: ${info.messageId || 'sent'})`,
      };
    } catch (err) {
      const errorDetails = formatSmtpError(err);
      console.error(`[SMTP ERROR] Failed sending to <${to}>:`, errorDetails);
      return {
        success: false,
        deliveryStatus: 'failed',
        deliveryDetails: errorDetails,
      };
    }
  }

  return {
    success: false,
    deliveryStatus: 'simulated',
    deliveryDetails: 'No email service or SMTP credentials configured; notification recorded in database.',
  };
}

/**
 * Verify transporter connection or send test email
 */
export async function testEmailConnection(testRecipient = null, customConfig = null) {
  let activeConfig = getEmailConfig();
  if (customConfig) {
    activeConfig = {
      ...activeConfig,
      ...customConfig,
      pass: (customConfig.pass && customConfig.pass.trim() !== '') ? customConfig.pass : activeConfig.pass,
      resendApiKey: (customConfig.resendApiKey !== undefined && customConfig.resendApiKey.trim() !== '')
        ? customConfig.resendApiKey.trim()
        : activeConfig.resendApiKey,
    };
  }

  // If using Resend API Key:
  if (activeConfig.resendApiKey) {
    try {
      const testTo = testRecipient || 'delivered@resend.dev';
      const fromHeader = activeConfig.from && activeConfig.from.includes('@') ? activeConfig.from : 'AgentBlazer Club <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeConfig.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromHeader,
          to: [testTo],
          subject: '🧪 AgentBlazer Club Resend API Verification Test',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 10px;">
              <h2 style="color: #38bdf8;">✓ Resend HTTPS API Verification Successful!</h2>
              <p>This is a verification test email from the AgentBlazer Club Admin Console dispatched via Resend HTTPS API (Port 443).</p>
              <p>All automated approval, rejection, and inquiry reply notifications will be delivered live reliably from cloud hosts like Render.</p>
              <hr style="border-color: #334155;" />
              <small style="color: #94a3b8;">Sent via Resend API to ${testTo}</small>
            </div>
          `,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Resend API returned status ${res.status}`);
      }
      return {
        success: true,
        message: testRecipient ? `Connected! Resend test email sent to ${testRecipient}.` : 'Resend API key verified successfully.',
      };
    } catch (err) {
      console.error('[Resend Verification Error]:', err.message);
      return { success: false, error: `Resend API Error: ${err.message}` };
    }
  }

  const transporter = getTransporter(activeConfig);

  if (!transporter) {
    return {
      success: false,
      error: 'SMTP credentials or Resend API key not configured yet. Please enter your email and App Password.',
    };
  }

  try {
    await transporter.verify();

    if (testRecipient) {
      await transporter.sendMail({
        from: activeConfig.from,
        to: testRecipient,
        subject: '🧪 AgentBlazer Club Email Verification Test',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 10px;">
            <h2 style="color: #38bdf8;">✓ SMTP Email Configuration Successful!</h2>
            <p>This is a verification test email from the AgentBlazer Club Admin Console.</p>
            <p>All automated approval and rejection notifications to applicants will now be delivered live to their inboxes.</p>
            <hr style="border-color: #334155;" />
            <small style="color: #94a3b8;">Sent from ${activeConfig.from}</small>
          </div>
        `,
      });
      return { success: true, message: `Connected! Verification test email sent to ${testRecipient}.` };
    }

    return { success: true, message: 'SMTP server connection verified successfully.' };
  } catch (err) {
    const errorDetails = formatSmtpError(err);
    console.error('[SMTP Verification Error]:', errorDetails);
    return { success: false, error: errorDetails };
  }
}

/**
 * Send an email notification for application status change
 * @param {Object} application - { id, name, email, year }
 * @param {'approved' | 'rejected'} status
 */
export async function sendApplicationStatusEmail(application, status) {
  const { id, name, email, year } = application;
  const isApproved = status === 'approved';
  const config = getEmailConfig();

  const subject = isApproved
    ? '🎉 Congratulations! Your AgentBlazer Club Application is Approved'
    : 'Update on your AgentBlazer Club Membership Application';

  const htmlContent = isApproved
    ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 32px 24px; text-align: center; border-bottom: 2px solid #6366f1; }
    .badge { display: inline-block; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 800; color: #ffffff; margin: 0; }
    .content { padding: 32px 28px; line-height: 1.7; color: #cbd5e1; font-size: 15px; }
    .highlight-card { background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; padding: 16px 20px; border-radius: 0 10px 10px 0; margin: 20px 0; }
    .steps { list-style: none; padding: 0; margin: 20px 0; }
    .steps li { margin-bottom: 14px; display: flex; align-items: flex-start; gap: 10px; }
    .steps li span { background: #312e81; color: #818cf8; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; }
    .footer { background: #0b0f19; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Application Approved</div>
      <h1 class="title">Welcome to AgentBlazer Club!</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${name}</strong> (${year}),</p>
      <p>We are thrilled to inform you that your application for membership in the <strong>AgentBlazer Club</strong> at St Joseph Engineering College (Department of CSE) has been <strong>approved</strong>!</p>
      
      <div class="highlight-card">
        <strong style="color: #ffffff;">🌟 What awaits you:</strong>
        <p style="margin: 6px 0 0 0; font-size: 14px;">Hands-on autonomous agent development, Salesforce Trailhead developer org credits, collaborative AI workshops, and masterclasses with industry leaders.</p>
      </div>

      <p><strong>Next Steps to Complete Your Onboarding:</strong></p>
      <ul class="steps">
        <li><span>1</span> <div><strong>Join the Official Community Group:</strong> Keep an eye out for an invite to our exclusive communication channel.</div></li>
        <li><span>2</span> <div><strong>Attend Orientation:</strong> Our team will reach out with the date and venue for the upcoming new members meet.</div></li>
        <li><span>3</span> <div><strong>Set Up Your Developer Org:</strong> Review the Trailhead agent foundations on the club website.</div></li>
      </ul>

      <p>If you have any questions, feel free to reply directly to this email or reach us at <a href="mailto:agentblazer@sjec.ac.in" style="color: #38bdf8;">agentblazer@sjec.ac.in</a>.</p>

      <p style="margin-top: 28px;">Warm regards,<br>
      <strong>Core Working Committee &amp; Faculty Coordinators</strong><br>
      AgentBlazer Club • Dept of CSE<br>
      St Joseph Engineering College, Mangaluru</p>
    </div>
    <div class="footer">
      AgentBlazer Club • SJEC Vamanjoor, Mangaluru – 575028, India<br>
      This is an automated notification regarding your membership application.
    </div>
  </div>
</body>
</html>
`
    : `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #1e1b4b, #1f2937); padding: 32px 24px; text-align: center; border-bottom: 2px solid #4b5563; }
    .badge { display: inline-block; background: rgba(148, 163, 184, 0.15); border: 1px solid #64748b; color: #94a3b8; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px; }
    .title { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0; }
    .content { padding: 32px 28px; line-height: 1.7; color: #cbd5e1; font-size: 15px; }
    .info-card { background: rgba(30, 41, 59, 0.6); border: 1px solid #334155; padding: 16px 20px; border-radius: 10px; margin: 20px 0; font-size: 14px; }
    .footer { background: #0b0f19; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Application Update</div>
      <h1 class="title">AgentBlazer Club Application Status</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${name}</strong>,</p>
      <p>Thank you very much for your interest in joining the <strong>AgentBlazer Club</strong> and for taking the time to submit your application.</p>
      
      <p>We received an overwhelming number of highly qualified applicants for this academic intake. Due to limited project spots and lab workstation capacity, we are unable to offer you a core membership spot at this moment.</p>

      <div class="info-card">
        <strong style="color: #ffffff;">💡 Stay Involved:</strong>
        <p style="margin: 6px 0 0 0;">All AgentBlazer open workshops, hackathons, and public technical seminars remain completely open to you. We encourage you to participate in upcoming events and re-apply during our next intake cycle!</p>
      </div>

      <p>We truly appreciate your enthusiasm for AI and autonomous agent systems, and we wish you the very best in your ongoing academic and technical journey.</p>

      <p style="margin-top: 28px;">Warm regards,<br>
      <strong>Core Working Committee &amp; Faculty Coordinators</strong><br>
      AgentBlazer Club • Dept of CSE<br>
      St Joseph Engineering College, Mangaluru</p>
    </div>
    <div class="footer">
      AgentBlazer Club • SJEC Vamanjoor, Mangaluru – 575028, India<br>
      This is an automated notification regarding your membership application.
    </div>
  </div>
</body>
</html>
`;

  const sendResult = await sendRawEmail({
    to: email,
    subject,
    html: htmlContent,
  });

  const deliveryStatus = sendResult.deliveryStatus;
  const deliveryDetails = sendResult.deliveryDetails;

  // Record in database email_logs
  try {
    db.prepare(`
      INSERT INTO email_logs (recipient_email, recipient_name, subject, type, status, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(email, name, subject, status, deliveryStatus, deliveryDetails, new Date().toISOString());

    // Update application record with precise email delivery status and error
    if (deliveryStatus === 'sent') {
      db.prepare(`
        UPDATE membership_applications
        SET email_notified = 1, email_notified_at = ?, email_status = 'sent', email_error = NULL
        WHERE id = ?
      `).run(new Date().toISOString(), id);
    } else if (deliveryStatus === 'failed') {
      db.prepare(`
        UPDATE membership_applications
        SET email_notified = 0, email_status = 'failed', email_error = ?
        WHERE id = ?
      `).run(deliveryDetails, id);
    } else {
      db.prepare(`
        UPDATE membership_applications
        SET email_notified = 0, email_status = 'not_configured', email_error = ?
        WHERE id = ?
      `).run(deliveryDetails, id);
    }
  } catch (err) {
    console.error('[Email DB Log Error]:', err.message);
  }

  return {
    success: deliveryStatus === 'sent',
    emailSent: deliveryStatus === 'sent',
    status: deliveryStatus,
    emailStatus: deliveryStatus,
    details: deliveryDetails,
    emailError: deliveryStatus === 'failed' ? deliveryDetails : null,
    recipient: email,
    subject,
  };
}

/**
 * Send 6-digit password reset verification code to administrator
 */
export async function sendPasswordResetEmail(recipientEmail, resetCode) {
  const transporter = getTransporter();
  const config = getEmailConfig();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #0b1120; color: #f8fafc; border-radius: 14px; padding: 32px; border: 1px solid #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #38bdf8; margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">AgentBlazer Club</h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">Department of Computer Science & Engineering • SJEC</p>
      </div>

      <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #ffffff; margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">Admin Password Reset Request</h3>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 18px 0;">
          A request was received to reset the password for administrator account <strong>${recipientEmail}</strong>. Use the 6-digit verification code below to set a new password:
        </p>

        <div style="text-align: center; margin: 20px 0;">
          <div style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; background: #020617; padding: 14px 28px; border-radius: 10px; border: 1px solid #334155; font-family: monospace;">
            ${resetCode}
          </div>
        </div>

        <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center; line-height: 1.5;">
          This code is strictly confidential and expires in <strong>15 minutes</strong>.<br/>
          If you did not request this, you can safely ignore this email.
        </p>
      </div>

      <div style="text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 16px;">
        St Joseph Engineering College, Mangaluru • Autonomous AI Society
      </div>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: config.from,
        to: recipientEmail,
        subject: `🔐 AgentBlazer Admin Password Reset Code: ${resetCode}`,
        html,
      });
      console.log(`[SMTP SUCCESS] Password reset code sent to <${recipientEmail}>`);
      return { success: true };
    } catch (err) {
      const errorDetails = formatSmtpError(err);
      console.error(`[SMTP ERROR] Failed to send reset code to <${recipientEmail}>:`, errorDetails);
      return { success: false, error: errorDetails };
    }
  } else {
    console.log(`[SMTP Simulated] SMTP not configured. Reset code for ${recipientEmail}: ${resetCode}`);
    return {
      success: true,
      simulated: true,
      code: resetCode,
      note: 'SMTP not configured; code printed to server console.',
    };
  }
}

/**
 * Send an email response to a student/visitor query
 * @param {Object} queryRecord - { id, name, email, year, query }
 * @param {string} replyMessage - Admin response message
 */
export async function sendQueryReplyEmail(queryRecord, replyMessage) {
  const { id, name, email, year, query } = queryRecord;
  const config = getEmailConfig();
  const subject = `Response to your Inquiry: Department of CSE • AgentBlazer Club`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 28px 24px; text-align: center; border-bottom: 2px solid #38bdf8; }
    .badge { display: inline-block; background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #38bdf8; font-weight: 700; font-size: 11px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 10px; }
    .title { font-size: 20px; font-weight: 800; color: #ffffff; margin: 0; }
    .sub { font-size: 13px; color: #94a3b8; margin: 4px 0 0 0; }
    .content { padding: 28px 24px; line-height: 1.7; color: #cbd5e1; font-size: 14px; }
    .query-box { background: rgba(30, 41, 59, 0.6); border-left: 4px solid #64748b; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .reply-box { background: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981; padding: 16px 18px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .box-label { font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 6px; }
    .footer { background: #0b0f19; padding: 18px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Inquiry Response</div>
      <h1 class="title">Department of Computer Science &amp; Engineering</h1>
      <p class="sub">St Joseph Engineering College, Mangaluru • AgentBlazer Club</p>
    </div>
    <div class="content">
      <p>Dear <strong>${name}</strong>${year ? ` (${year})` : ''},</p>
      <p>Thank you for reaching out to the Department of Computer Science &amp; Engineering (AgentBlazer Club) at St Joseph Engineering College. Here is the response to your inquiry:</p>

      <div class="query-box">
        <div class="box-label" style="color: #94a3b8;">Your Original Inquiry:</div>
        <div style="color: #e2e8f0; font-style: italic;">"${query}"</div>
      </div>

      <div class="reply-box">
        <div class="box-label" style="color: #34d399;">Response from CSE / AgentBlazer Team:</div>
        <div style="color: #f1f5f9; white-space: pre-wrap; font-size: 14px;">${replyMessage}</div>
      </div>

      <p style="margin-top: 24px;">If you have any further questions or follow-up inquiries, feel free to reply directly to this email or visit our department.</p>

      <p style="margin-top: 24px; color: #94a3b8;">
        Warm regards,<br/>
        <strong style="color: #f1f5f9;">Department of Computer Science &amp; Engineering</strong><br/>
        St Joseph Engineering College, Vamanjoor, Mangaluru – 575028<br/>
        Direct inquiries: <a href="mailto:agentblazer@sjec.ac.in" style="color: #38bdf8;">agentblazer@sjec.ac.in</a>
      </p>
    </div>
    <div class="footer">
      AgentBlazer Club • Dept of CSE • St Joseph Engineering College, Mangaluru<br/>
      This email was dispatched via the AgentBlazer Admin Portal.
    </div>
  </div>
</body>
</html>
  `;

  const sendResult = await sendRawEmail({
    to: email,
    subject,
    html,
  });

  const deliveryStatus = sendResult.deliveryStatus;
  const deliveryDetails = sendResult.deliveryDetails;

  // Record in database email_logs & queries table
  try {
    db.prepare(`
      INSERT INTO email_logs (recipient_email, recipient_name, subject, type, status, details, created_at)
      VALUES (?, ?, ?, 'query_reply', ?, ?, ?)
    `).run(email, name, subject, deliveryStatus, deliveryDetails, new Date().toISOString());

    db.prepare(`
      UPDATE queries
      SET admin_reply = ?,
          status = 'replied',
          replied_at = ?,
          reply_email_status = ?,
          reply_email_error = ?
      WHERE id = ?
    `).run(
      replyMessage,
      new Date().toISOString(),
      deliveryStatus,
      deliveryStatus === 'failed' ? deliveryDetails : null,
      id
    );
  } catch (err) {
    console.error('[Query DB Update Error]:', err.message);
  }

  return {
    success: deliveryStatus === 'sent' || deliveryStatus === 'simulated',
    emailSent: deliveryStatus === 'sent',
    emailStatus: deliveryStatus,
    emailError: deliveryStatus === 'failed' ? deliveryDetails : null,
    details: deliveryDetails,
  };
}


