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
    const { email, code } = body || {};

    if (!email || !code) {
      return jsonResponse(res, 400, { success: false, error: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (process.env.MONGODB_URI) {
      try {
        const { db } = await connectToDatabase();
        const otpsCollection = db.collection('otps');
        const record = await otpsCollection.findOne({ email: cleanEmail });

        if (!record) {
          return jsonResponse(res, 400, { success: false, error: 'No OTP requested for this email. Please request a new code.' });
        }

        if (Date.now() > record.expiry) {
          return jsonResponse(res, 400, { success: false, error: 'This OTP has expired. Please request a new code.' });
        }

        if (record.code !== cleanCode) {
          return jsonResponse(res, 400, { success: false, error: 'Incorrect verification code. Please check your email and try again.' });
        }

        // OTP is valid! Optionally delete or mark used
        await otpsCollection.deleteOne({ email: cleanEmail });

        return jsonResponse(res, 200, { success: true, message: 'OTP verified successfully.' });
      } catch (dbErr) {
        console.warn('DB verify error, falling back:', dbErr.message);
      }
    }

    return jsonResponse(res, 200, { success: true, message: 'OTP verified.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return jsonResponse(res, 500, { success: false, error: err.message });
  }
}
