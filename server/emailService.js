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
  if (msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
    return `Connection error: Could not reach SMTP host (${err.code || 'Network timeout'}). Please check your SMTP host and port.`;
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

  const service = (getSetting('smtp_service') || process.env.SMTP_SERVICE || '').trim().toLowerCase();
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

  const isConfigured = Boolean((service || host) && user && pass);

  return {
    service,
    host,
    port,
    user,
    pass, // internal
    hasPassword: Boolean(pass),
    from,
    isConfigured,
  };
}

/**
 * Save email settings to SQLite app_settings
 */
export function saveEmailConfig({ service, host, port, user, pass, from }) {
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

  return getEmailConfig();
}

/**
 * Build Nodemailer Transporter based on active or provided config
 */
function getTransporter(overrideConfig = null) {
  const config = overrideConfig ? { ...getEmailConfig(), ...overrideConfig } : getEmailConfig();

  if (!config.isConfigured && (!config.user || !config.pass)) {
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
 * Verify transporter connection or send test email
 */
export async function testEmailConnection(testRecipient = null, customConfig = null) {
  let activeConfig = getEmailConfig();
  if (customConfig && (customConfig.user || customConfig.pass || customConfig.service || customConfig.host)) {
    activeConfig = {
      ...activeConfig,
      ...customConfig,
      pass: (customConfig.pass && customConfig.pass.trim() !== '') ? customConfig.pass : activeConfig.pass,
    };
  }

  const transporter = getTransporter(activeConfig);

  if (!transporter) {
    return {
      success: false,
      error: 'SMTP credentials not configured yet. Please enter your email and App Password.',
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

  let deliveryStatus = 'simulated';
  let deliveryDetails = '';

  const transporter = getTransporter();

  if (transporter) {
    console.log(`[SMTP] Attempting to deliver ${status} notification to "${name}" <${email}> via ${config.service || config.host}...`);
    try {
      const info = await transporter.sendMail({
        from: config.from,
        to: email,
        subject,
        html: htmlContent,
      });
      deliveryStatus = 'sent';
      deliveryDetails = `Delivered via SMTP (MessageId: ${info.messageId || 'sent'})`;
      console.log(`[SMTP SUCCESS] Delivered ${status} email to <${email}> (MessageId: ${info.messageId})`);
    } catch (err) {
      deliveryStatus = 'failed';
      deliveryDetails = formatSmtpError(err);
      console.error(`[SMTP ERROR] Failed sending ${status} email to <${email}>:`, deliveryDetails);
    }
  } else {
    deliveryStatus = 'simulated';
    deliveryDetails = 'SMTP not configured in environment or settings; notification recorded in database.';
    console.log(`[SMTP Simulated] No SMTP credentials configured. Notification for "${name}" <${email}> recorded in database.`);
  }

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
    emailError: deliveryStatus !== 'sent' ? deliveryDetails : null,
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


