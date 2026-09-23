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
 * Retrieve current email configuration from Database or ENV fallback
 */
export function getEmailConfig() {
  const getSetting = (key) => {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
    return row ? row.value : null;
  };

  const service = getSetting('smtp_service') || process.env.SMTP_SERVICE || '';
  const host = getSetting('smtp_host') || process.env.SMTP_HOST || '';
  const port = getSetting('smtp_port') || process.env.SMTP_PORT || '587';
  const user = getSetting('smtp_user') || process.env.SMTP_USER || '';
  const pass = getSetting('smtp_pass') || process.env.SMTP_PASS || '';
  const from = getSetting('smtp_from') || process.env.SMTP_FROM || '"AgentBlazer Club • SJEC CSE" <agentblazer@sjec.ac.in>';

  const isConfigured = Boolean((service || host) && user && pass);

  return {
    service,
    host,
    port: Number(port) || 587,
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
  if (pass !== undefined && pass !== '') setSetting.run('smtp_pass', pass.trim());
  if (from !== undefined) setSetting.run('smtp_from', from.trim());

  return getEmailConfig();
}

/**
 * Build Nodemailer Transporter based on active config
 */
function getTransporter() {
  const config = getEmailConfig();

  if (!config.isConfigured) {
    return null;
  }

  if (config.service && config.user && config.pass) {
    return nodemailer.createTransport({
      service: config.service,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  if (config.host && config.user && config.pass) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  return null;
}

/**
 * Verify transporter connection or send test email
 */
export async function testEmailConnection(testRecipient = null) {
  const transporter = getTransporter();
  const config = getEmailConfig();

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
        from: config.from,
        to: testRecipient,
        subject: '🧪 AgentBlazer Club Email Verification Test',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 10px;">
            <h2 style="color: #38bdf8;">✓ SMTP Email Configuration Successful!</h2>
            <p>This is a verification test email from the AgentBlazer Club Admin Console.</p>
            <p>All automated approval and rejection notifications to applicants will now be delivered live to their inboxes.</p>
            <hr style="border-color: #334155;" />
            <small style="color: #94a3b8;">Sent from ${config.from}</small>
          </div>
        `,
      });
      return { success: true, message: `Connected! Verification test email sent to ${testRecipient}.` };
    }

    return { success: true, message: 'SMTP server connection verified successfully.' };
  } catch (err) {
    return { success: false, error: err.message || 'SMTP Authentication failed' };
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
    try {
      const info = await transporter.sendMail({
        from: config.from,
        to: email,
        subject,
        html: htmlContent,
      });
      deliveryStatus = 'sent';
      deliveryDetails = `MessageId: ${info.messageId || 'sent'}`;
      console.log(`[Email] Successfully delivered ${status} email to ${email} (MessageId: ${info.messageId})`);
    } catch (err) {
      deliveryStatus = 'failed';
      deliveryDetails = err.message || 'SMTP transmission error';
      console.error(`[Email Error] Failed to send via SMTP to ${email}:`, err.message);
    }
  } else {
    deliveryStatus = 'simulated';
    deliveryDetails = 'SMTP not configured in environment or settings; email notification recorded in database log.';
    console.log(`[Email Simulated] No SMTP credentials provided. Notification for "${name}" <${email}> recorded.`);
  }

  // Record in database email_logs
  try {
    db.prepare(`
      INSERT INTO email_logs (recipient_email, recipient_name, subject, type, status, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(email, name, subject, status, deliveryStatus, deliveryDetails, new Date().toISOString());

    // Update application record
    db.prepare(`
      UPDATE membership_applications
      SET email_notified = 1, email_notified_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), id);
  } catch (err) {
    console.error('[Email DB Log Error]:', err.message);
  }

  return {
    success: deliveryStatus !== 'failed',
    status: deliveryStatus,
    details: deliveryDetails,
    recipient: email,
    subject,
  };
}
