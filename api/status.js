import { connectToDatabase, jsonResponse } from './db.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true });
  }

  if (!process.env.MONGODB_URI) {
    return jsonResponse(res, 200, {
      connected: false,
      message: 'MONGODB_URI is not configured in environment variables. Falling back to client-side localStorage mode.',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { db } = await connectToDatabase();
    await db.command({ ping: 1 });

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    return jsonResponse(res, 200, {
      connected: true,
      database: db.databaseName,
      collections: collectionNames,
      message: 'Successfully connected to MongoDB Atlas cluster!',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('MongoDB Atlas connection test failed:', err);
    return jsonResponse(res, 500, {
      connected: false,
      error: err.message,
      message: 'Failed to connect to MongoDB Atlas cluster. Please check connection string, credentials, or IP whitelist (0.0.0.0/0).'
    });
  }
}
