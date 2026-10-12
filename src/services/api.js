/**
 * API Service Layer for Trash to Treasure
 * Automatically uses Vercel Serverless + MongoDB Atlas endpoints (/api/*)
 * when available, with resilient fallback to localStorage and mockData.
 */

import {
  INITIAL_PRODUCTS,
  INITIAL_ARTISANS,
  INITIAL_POSTS,
  INITIAL_ORDERS
} from '../data/mockData';

const API_BASE = '/api';

/**
 * Check MongoDB Atlas Connection Status
 */
export async function checkDbStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('Status check failed');
    return await res.json();
  } catch (err) {
    return {
      connected: false,
      message: 'Running in offline/localStorage mode'
    };
  }
}

/**
 * Products
 */
export async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.info('API unavailable, falling back to local products store');
  }

  // Fallback to localStorage or mockData
  const local = localStorage.getItem('t2t_products');
  return local ? JSON.parse(local) : INITIAL_PRODUCTS;
}

export async function createProduct(productData) {
  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('API product creation failed, saving locally:', e);
  }
  return productData;
}

/**
 * Artisans
 */
export async function fetchArtisans() {
  try {
    const res = await fetch(`${API_BASE}/artisans`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.info('API unavailable, falling back to local artisans store');
  }

  const local = localStorage.getItem('t2t_artisans');
  return local ? JSON.parse(local) : INITIAL_ARTISANS;
}

export async function saveArtisan(artisanData) {
  try {
    const res = await fetch(`${API_BASE}/artisans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(artisanData),
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('API artisan save failed, saving locally:', e);
  }
  return artisanData;
}

/**
 * Posts & Upcycling Stories
 */
export async function fetchPosts() {
  try {
    const res = await fetch(`${API_BASE}/posts`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.info('API unavailable, falling back to local posts store');
  }

  const local = localStorage.getItem('t2t_posts');
  return local ? JSON.parse(local) : INITIAL_POSTS;
}

export async function createPost(postData) {
  try {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('API post creation failed, saving locally:', e);
  }
  return postData;
}

export async function likePost(postId) {
  try {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId, action: 'like' }),
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('API like failed:', e);
  }
  return null;
}

export async function addCommentToPost(postId, comment) {
  try {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId, action: 'comment', comment }),
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('API comment failed:', e);
  }
  return null;
}

/**
 * Orders
 */
export async function fetchOrders() {
  try {
    const res = await fetch(`${API_BASE}/orders`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.info('API unavailable, falling back to local orders store');
  }

  const local = localStorage.getItem('t2t_orders');
  return local ? JSON.parse(local) : INITIAL_ORDERS;
}

export async function createOrder(orderData) {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('API order creation failed, saving locally:', e);
  }
  return orderData;
}

/**
 * Real OTP Email Dispatch
 */
export async function sendOtpEmail({ email, name, flowType, code }) {
  try {
    const res = await fetch(`${API_BASE}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, flowType, code }),
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      error: errData.error || 'Server failed to send email'
    };
  } catch (err) {
    console.warn('sendOtpEmail network or timeout error:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Verify OTP on Server
 */
export async function verifyRemoteOtp({ email, code }) {
  try {
    const res = await fetch(`${API_BASE}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('verifyRemoteOtp network error:', err);
  }
  return null;
}

/**
 * Send Login Notification Email
 */
export async function sendLoginNotification({ email, name, role }) {
  try {
    const res = await fetch(`${API_BASE}/send-login-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role, loginTime: new Date().toLocaleString() }),
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('sendLoginNotification error (non-fatal):', err);
  }
  return null;
}

