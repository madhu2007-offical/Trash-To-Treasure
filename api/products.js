import { connectToDatabase, jsonResponse } from './db.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('products');

    if (req.method === 'GET') {
      const products = await collection.find({}).sort({ _id: -1 }).toArray();
      // Transform _id to id if needed
      const normalized = products.map(p => ({
        ...p,
        id: p.id || p._id.toString()
      }));
      return jsonResponse(res, 200, normalized);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || !body.title) {
        return jsonResponse(res, 400, { error: 'Product title is required' });
      }

      const newProduct = {
        id: body.id || `prod_${Date.now()}`,
        artisanId: body.artisanId || 'artisan_1',
        title: body.title,
        description: body.description || '',
        price: Number(body.price) || 0,
        stock: Number(body.stock) || 1,
        category: body.category || 'Upcycled',
        materials: Array.isArray(body.materials) ? body.materials : [body.materials || 'Reclaimed Material'],
        timeToCreate: body.timeToCreate || '1 day',
        craftTechnique: body.craftTechnique || 'Handcrafted upcycling',
        images: Array.isArray(body.images) ? body.images : [body.image1, body.image2].filter(Boolean),
        isMadeToOrder: Boolean(body.isMadeToOrder),
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await collection.insertOne(newProduct);
      return jsonResponse(res, 201, newProduct);
    }

    return jsonResponse(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('API /products error:', err);
    return jsonResponse(res, 500, { error: err.message });
  }
}
