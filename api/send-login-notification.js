import nodemailer from 'nodemailer';
import { jsonResponse } from './db.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, name, role, loginTime } = body || {};

    if (!email) {
      return jsonResponse(res, 400, { error: 'Email address is required' });
    }

    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

    if (!emailUser || !emailPass) {
      return jsonResponse(res, 200, {
        success: false,
        reason: 'missing_credentials',
        message: 'Email credentials not configured in environment variables.'
      });
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = process.env.SMTP_SECURE !== 'false';

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || (host.includes('gmail') ? 'gmail' : undefined),
      host,
      port,
      secure,
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const cleanEmail = email.trim().toLowerCase();
    const displayName = name || cleanEmail.split('@')[0];
    const roleLabel = role === 'artisan' ? 'Artisan / Maker' : 'Community Member / Buyer';
    const timestampStr = loginTime || new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F6F1E7; margin: 0; padding: 20px; color: #2B2B2B; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E2D9C8; }
          .header { background: #2F5D3A; color: #F6F1E7; padding: 28px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
          .body { padding: 32px 24px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #2F5D3A; }
          .message { font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 20px; }
          .info-box { background: #F6F1E7; border-radius: 8px; padding: 16px 20px; margin: 20px 0; border-left: 4px solid #7A9A6B; }
          .info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px dashed #E2D9C8; }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #666666; }
          .info-val { font-weight: 600; color: #2B2B2B; }
          .action-btn { display: inline-block; background: #2F5D3A; color: #F6F1E7; text-decoration: none; padding: 12px 28px; border-radius: 30px; font-weight: 600; font-size: 14px; margin: 16px 0; text-align: center; }
          .security-note { font-size: 12px; color: #888888; line-height: 1.5; margin-top: 24px; border-top: 1px solid #EEEEEE; padding-top: 16px; }
          .footer { background: #FAF7F2; padding: 20px 24px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #ECE4D8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>♻️ Trash to Treasure</h1>
            <p>Upcycled Handcrafted Living</p>
          </div>
          <div class="body">
            <div class="greeting">Welcome, ${displayName}! 🎉</div>
            <div class="message">
              You have successfully logged in to your <strong>Trash to Treasure (T2T)</strong> account. You're all set to explore upcycled crafts, follow makers, or manage your creations!
            </div>
            
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Account Mail:</span>
                <span class="info-val">${cleanEmail}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Account Role:</span>
                <span class="info-val">${roleLabel}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Login Time:</span>
                <span class="info-val">${timestampStr}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Security Status:</span>
                <span class="info-val" style="color: #2F5D3A;">✓ Verified Session</span>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="https://origins-co.vercel.app" class="action-btn">Open Trash to Treasure →</a>
            </div>

            <div class="security-note">
              <strong>Security Notice:</strong> If you did not perform this login, please secure your email account immediately or reach out to support at <a href="mailto:madhu007official@gmail.com">madhu007official@gmail.com</a>.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Trash to Treasure (T2T) · Connecting makers, upcyclers, and conscious living.
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `Hello ${displayName},\n\nYou have successfully logged into Trash to Treasure (T2T).\n\nAccount: ${cleanEmail}\nRole: ${roleLabel}\nTime: ${timestampStr}\n\nExplore at: https://origins-co.vercel.app\n\nIf this was not you, please secure your account immediately.`;

    await transporter.sendMail({
      from: `"Trash to Treasure (T2T)" <${emailUser}>`,
      to: cleanEmail,
      subject: `🎉 You are logged in to Trash to Treasure!`,
      text: textContent,
      html: htmlContent
    });

    return jsonResponse(res, 200, {
      success: true,
      message: `Login notification email delivered to ${cleanEmail}`
    });
  } catch (err) {
    console.error('Error sending login notification email:', err);
    return jsonResponse(res, 500, {
      success: false,
      error: err.message
    });
  }
}
