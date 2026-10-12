import { connectToDatabase, jsonResponse } from './db.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('orders');

    if (req.method === 'GET') {
      const orders = await collection.find({}).sort({ createdAt: -1 }).toArray();
      const normalized = orders.map(o => ({
        ...o,
        id: o.id || o._id.toString()
      }));
      return jsonResponse(res, 200, normalized);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body) {
        return jsonResponse(res, 400, { error: 'Order details required' });
      }

      const newOrder = {
        id: body.id || `order_${Date.now()}`,
        customerId: body.customerId || 'cust_1',
        artisanId: body.artisanId || 'artisan_1',
        productId: body.productId,
        quantity: Number(body.quantity) || 1,
        price: Number(body.price) || 0,
        customizationNotes: body.customizationNotes || '',
        customizationImage: body.customizationImage || null,
        status: 'placed',
        shippingAddress: body.shippingAddress || {},
        paymentStatus: 'paid',
        createdAt: new Date().toISOString()
      };

      await collection.insertOne(newOrder);
      return jsonResponse(res, 201, newOrder);
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { id, status } = body;
      if (!id || !status) {
        return jsonResponse(res, 400, { error: 'Order ID and status are required' });
      }

      const result = await collection.findOneAndUpdate(
        { id },
        { $set: { status } },
        { returnDocument: 'after' }
      );
      return jsonResponse(res, 200, result);
    }

    return jsonResponse(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('API /orders error:', err);
    return jsonResponse(res, 500, { error: err.message });
  }
}
