import { connectToDatabase, jsonResponse } from './db.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('artisans');

    if (req.method === 'GET') {
      const artisans = await collection.find({}).toArray();
      const normalized = artisans.map(a => ({
        ...a,
        id: a.id || a._id.toString()
      }));
      return jsonResponse(res, 200, normalized);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || !body.displayName) {
        return jsonResponse(res, 400, { error: 'Artisan display name is required' });
      }

      const newArtisan = {
        id: body.id || `artisan_${Date.now()}`,
        displayName: body.displayName,
        bio: body.bio || '',
        craftTypes: Array.isArray(body.craftTypes) ? body.craftTypes : [body.craftTypes || 'Upcycling'],
        location: body.location || '',
        yearsExperience: Number(body.yearsExperience) || 1,
        verificationTier: body.verificationTier || 'verified',
        profilePhoto: body.profilePhoto || '',
        coverPhoto: body.coverPhoto || '',
        payoutDetails: body.payoutDetails || '',
        joinedDate: body.joinedDate || new Date().toISOString().split('T')[0]
      };

      await collection.updateOne(
        { id: newArtisan.id },
        { $set: newArtisan },
        { upsert: true }
      );

      return jsonResponse(res, 200, newArtisan);
    }

    return jsonResponse(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('API /artisans error:', err);
    return jsonResponse(res, 500, { error: err.message });
  }
}
