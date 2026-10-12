import nodemailer from 'nodemailer';
import { connectToDatabase, jsonResponse } from './db.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, name, flowType, code: clientCode } = body || {};

    if (!email) {
      return jsonResponse(res, 400, { error: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    // 6-digit numeric OTP code
    const otpCode = clientCode || Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // 1. Persist OTP in MongoDB Atlas if connected
    let dbSaved = false;
    try {
      if (process.env.MONGODB_URI) {
        const { db } = await connectToDatabase();
        const otpsCollection = db.collection('otps');
        await otpsCollection.updateOne(
          { email: cleanEmail },
          {
            $set: {
              code: otpCode,
              expiry,
              updatedAt: new Date().toISOString()
            }
          },
          { upsert: true }
        );
        dbSaved = true;
      }
    } catch (dbErr) {
      console.warn('MongoDB OTP storage warning (non-fatal):', dbErr.message);
    }

    // 2. Check if SMTP / Gmail credentials are configured
    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

    if (!emailUser || !emailPass) {
      // Credentials not yet added by user
      return jsonResponse(res, 200, {
        success: true,
        emailSent: false,
        code: otpCode,
        dbSaved,
        reason: 'missing_credentials',
        message: 'EMAIL_USER and EMAIL_PASS are not yet configured in environment variables. For testing, your code is provided below.'
      });
    }

    // 3. Configure Nodemailer Transporter
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

    const appTitle = 'Trash to Treasure (T2T)';
    const subject = `${otpCode} is your ${appTitle} Verification Code`;
    const greetingName = name || cleanEmail.split('@')[0];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F6F1E7; margin: 0; padding: 20px; color: #2B2B2B; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E2D9C8; }
          .header { background: #2F5D3A; color: #F6F1E7; padding: 28px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
          .body { padding: 32px 24px; text-align: center; }
          .greeting { font-size: 16px; margin-bottom: 16px; text-align: left; }
          .message { font-size: 14px; line-height: 1.6; color: #555555; text-align: left; margin-bottom: 24px; }
          .otp-badge { background: #F6F1E7; border: 2px dashed #7A9A6B; border-radius: 10px; padding: 18px 24px; margin: 24px 0; display: inline-block; }
          .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2F5D3A; font-family: monospace; }
          .expiry-note { font-size: 12px; color: #888888; margin-top: 8px; }
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
            <div class="greeting">Hello <strong>${greetingName}</strong>,</div>
            <div class="message">
              Use the one-time verification code below to complete your ${flowType === 'signup' ? 'registration' : 'sign-in'} on Trash to Treasure.
            </div>
            <div class="otp-badge">
              <div class="otp-code">${otpCode}</div>
              <div class="expiry-note">Valid for 10 minutes · Do not share this code with anyone</div>
            </div>
            <div class="message" style="margin-top: 20px; font-size: 13px;">
              If you did not request this verification code, you can safely ignore this email.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Trash to Treasure (T2T) · Connecting makers, upcyclers, and conscious living.
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `Your ${appTitle} verification code is: ${otpCode}\n\nThis code is valid for 10 minutes. If you did not request this, please ignore this email.`;

    await transporter.sendMail({
      from: `"Trash to Treasure (T2T)" <${emailUser}>`,
      to: cleanEmail,
      subject,
      text: textContent,
      html: htmlContent
    });

    return jsonResponse(res, 200, {
      success: true,
      emailSent: true,
      code: otpCode,
      dbSaved,
      message: `Verification code successfully sent to ${cleanEmail}!`
    });
  } catch (err) {
    console.error('Error sending OTP email:', err);
    return jsonResponse(res, 500, {
      success: false,
      error: err.message,
      message: 'Failed to send verification email. Please check your SMTP credentials or network settings.'
    });
  }
}
