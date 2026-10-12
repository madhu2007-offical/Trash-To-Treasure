import { connectToDatabase, jsonResponse } from './db.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('posts');

    if (req.method === 'GET') {
      const posts = await collection.find({}).sort({ createdAt: -1 }).toArray();
      const normalized = posts.map(p => ({
        ...p,
        id: p.id || p._id.toString()
      }));
      return jsonResponse(res, 200, normalized);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body) {
        return jsonResponse(res, 400, { error: 'Post payload is required' });
      }

      const newPost = {
        id: body.id || `post_${Date.now()}`,
        artisanId: body.artisanId || 'artisan_1',
        type: body.type || 'making_diary',
        media: Array.isArray(body.media) ? body.media : [body.mediaUrl].filter(Boolean),
        caption: body.caption || '',
        craftStory: body.craftStory || '',
        linkedProductId: body.linkedProductId || null,
        createdAt: new Date().toISOString(),
        likesCount: 0,
        savesCount: 0,
        comments: [],
        diaryEntries: Array.isArray(body.diaryEntries) ? body.diaryEntries : []
      };

      await collection.insertOne(newPost);
      return jsonResponse(res, 201, newPost);
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { id, action, comment } = body;
      if (!id) {
        return jsonResponse(res, 400, { error: 'Post ID is required' });
      }

      if (action === 'like') {
        const result = await collection.findOneAndUpdate(
          { id },
          { $inc: { likesCount: 1 } },
          { returnDocument: 'after' }
        );
        return jsonResponse(res, 200, result);
      }

      if (action === 'comment' && comment) {
        const commentObj = {
          id: `c_${Date.now()}`,
          userName: comment.userName || 'Anonymous Maker',
          text: comment.text || '',
          createdAt: new Date().toISOString()
        };
        const result = await collection.findOneAndUpdate(
          { id },
          { $push: { comments: commentObj } },
          { returnDocument: 'after' }
        );
        return jsonResponse(res, 200, result);
      }

      return jsonResponse(res, 400, { error: 'Unknown action' });
    }

    return jsonResponse(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('API /posts error:', err);
    return jsonResponse(res, 500, { error: err.message });
  }
}
