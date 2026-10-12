import { 
  INITIAL_ARTISANS, 
  INITIAL_PRODUCTS, 
  INITIAL_POSTS, 
  INITIAL_ORDERS, 
  INITIAL_REVIEWS 
} from '../data/mockData';
import {
  createProduct as apiCreateProduct,
  saveArtisan as apiSaveArtisan,
  createPost as apiCreatePost,
  createOrder as apiCreateOrder,
  likePost as apiLikePost,
  addCommentToPost as apiAddCommentToPost,
  fetchProducts as apiFetchProducts,
  fetchArtisans as apiFetchArtisans,
  fetchPosts as apiFetchPosts,
  fetchOrders as apiFetchOrders
} from '../services/api';

const KEYS = {
  ARTISANS: 't2t_artisans',
  PRODUCTS: 't2t_products',
  POSTS: 't2t_posts',
  ORDERS: 't2t_orders',
  REVIEWS: 't2t_reviews',
  CURRENT_USER: 't2t_current_user',
  FOLLOWS: 't2t_follows',
  CART: 't2t_cart',
  USERS: 't2t_users'
};

const LEGACY_KEYS = {
  ARTISANS: 'origins_artisans',
  PRODUCTS: 'origins_products',
  POSTS: 'origins_posts',
  ORDERS: 'origins_orders',
  REVIEWS: 'origins_reviews',
  CURRENT_USER: 'origins_current_user',
  FOLLOWS: 'origins_follows',
  CART: 'origins_cart',
  USERS: 'origins_users'
};

// Initialize Storage with mock data if empty
export const initStorage = () => {
  // Migrate any previous origins_* keys seamlessly to t2t_*
  try {
    Object.keys(KEYS).forEach(k => {
      const newKey = KEYS[k];
      const oldKey = LEGACY_KEYS[k];
      if (!localStorage.getItem(newKey) && localStorage.getItem(oldKey)) {
        localStorage.setItem(newKey, localStorage.getItem(oldKey));
      }
    });
  } catch (_e) {
    // Ignore migration errors
  }

  if (!localStorage.getItem(KEYS.ARTISANS)) {
    localStorage.setItem(KEYS.ARTISANS, JSON.stringify(INITIAL_ARTISANS));
  }
  if (!localStorage.getItem(KEYS.PRODUCTS)) {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem(KEYS.POSTS)) {
    localStorage.setItem(KEYS.POSTS, JSON.stringify(INITIAL_POSTS));
  }
  if (!localStorage.getItem(KEYS.ORDERS)) {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
  }
  if (!localStorage.getItem(KEYS.REVIEWS)) {
    localStorage.setItem(KEYS.REVIEWS, JSON.stringify(INITIAL_REVIEWS));
  }
  if (!localStorage.getItem(KEYS.FOLLOWS)) {
    localStorage.setItem(KEYS.FOLLOWS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify([]));
  }
  // Automatically clean out legacy demo accounts
  try {
    const existingUsers = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const realUsersOnly = existingUsers.filter(u => u.id !== 'cust_1' && u.id !== 'artisan_1');
    if (realUsersOnly.length !== existingUsers.length) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(realUsersOnly));
    }
    const current = JSON.parse(localStorage.getItem(KEYS.CURRENT_USER) || 'null');
    if (current && (current.id === 'cust_1' || current.id === 'artisan_1')) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(null));
    }

    // Automatically heal/sync any cached 404 or outdated image URLs in localStorage
    const storedPosts = JSON.parse(localStorage.getItem(KEYS.POSTS) || '[]');
    let postsChanged = false;
    storedPosts.forEach(sp => {
      const initial = INITIAL_POSTS.find(ip => ip.id === sp.id);
      if (initial) {
        if (JSON.stringify(sp.media) !== JSON.stringify(initial.media)) {
          sp.media = initial.media;
          postsChanged = true;
        }
        if (JSON.stringify(sp.diaryEntries) !== JSON.stringify(initial.diaryEntries)) {
          sp.diaryEntries = initial.diaryEntries;
          postsChanged = true;
        }
      }
    });
    if (postsChanged) {
      localStorage.setItem(KEYS.POSTS, JSON.stringify(storedPosts));
    }

    const storedArtisans = JSON.parse(localStorage.getItem(KEYS.ARTISANS) || '[]');
    let artisansChanged = false;
    storedArtisans.forEach(sa => {
      const initial = INITIAL_ARTISANS.find(ia => ia.id === sa.id);
      if (initial) {
        if (sa.profilePhoto !== initial.profilePhoto) {
          sa.profilePhoto = initial.profilePhoto;
          artisansChanged = true;
        }
        if (sa.coverPhoto !== initial.coverPhoto) {
          sa.coverPhoto = initial.coverPhoto;
          artisansChanged = true;
        }
      }
    });
    if (artisansChanged) {
      localStorage.setItem(KEYS.ARTISANS, JSON.stringify(storedArtisans));
    }

    const storedProducts = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
    let productsChanged = false;
    storedProducts.forEach(sp => {
      const initial = INITIAL_PRODUCTS.find(ip => ip.id === sp.id);
      if (initial) {
        if (JSON.stringify(sp.images) !== JSON.stringify(initial.images)) {
          sp.images = initial.images;
          productsChanged = true;
        }
      }
    });
    if (productsChanged) {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(storedProducts));
    }

    const storedOrders = JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');
    let ordersChanged = false;
    storedOrders.forEach(so => {
      if (so.shippingAddress && so.shippingAddress.name && (so.shippingAddress.name.includes('Madhav') || so.shippingAddress.name.includes('Madhu'))) {
        so.shippingAddress.name = 'Aarav Sharma';
        ordersChanged = true;
      }
      const initialOrder = INITIAL_ORDERS.find(io => io.id === so.id);
      if (initialOrder && initialOrder.customizationImage && !so.customizationImage) {
        so.customizationImage = initialOrder.customizationImage;
        ordersChanged = true;
      }
    });
    if (ordersChanged) {
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(storedOrders));
    }
  } catch (_e) {
    // Ignore JSON errors
  }
  if (localStorage.getItem(KEYS.CURRENT_USER) === null) {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(null));
  }
  if (!localStorage.getItem(KEYS.CART)) {
    localStorage.setItem(KEYS.CART, JSON.stringify([]));
  }
};

// Generic Getter / Setter
const get = (key) => {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch (e) {
    console.error('Error reading localStorage key', key, e);
    return [];
  }
};

const set = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// API Helpers
export const storage = {
  getArtisans: () => get(KEYS.ARTISANS),
  saveArtisan: (artisan) => {
    const artisans = get(KEYS.ARTISANS);
    const index = artisans.findIndex(a => a.id === artisan.id);
    if (index >= 0) {
      artisans[index] = { ...artisans[index], ...artisan };
    } else {
      artisans.push(artisan);
    }
    set(KEYS.ARTISANS, artisans);
    apiSaveArtisan(artisan).catch(() => {});
    return artisan;
  },

  getProducts: () => get(KEYS.PRODUCTS),
  saveProduct: (product) => {
    const products = get(KEYS.PRODUCTS);
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = { ...products[index], ...product };
    } else {
      products.push(product);
    }
    set(KEYS.PRODUCTS, products);
    apiCreateProduct(product).catch(() => {});
    return product;
  },

  getPosts: () => get(KEYS.POSTS),
  savePost: (post) => {
    const posts = get(KEYS.POSTS);
    const index = posts.findIndex(p => p.id === post.id);
    if (index >= 0) {
      posts[index] = { ...posts[index], ...post };
    } else {
      posts.unshift(post); // New posts first
    }
    set(KEYS.POSTS, posts);
    apiCreatePost(post).catch(() => {});
    return post;
  },

  getOrders: () => get(KEYS.ORDERS),
  saveOrder: (order) => {
    const orders = get(KEYS.ORDERS);
    const index = orders.findIndex(o => o.id === order.id);
    if (index >= 0) {
      orders[index] = { ...orders[index], ...order };
    } else {
      orders.unshift(order);
    }
    set(KEYS.ORDERS, orders);
    apiCreateOrder(order).catch(() => {});
    return order;
  },

  syncWithServer: async () => {
    try {
      const [remoteProducts, remoteArtisans, remotePosts, remoteOrders] = await Promise.allSettled([
        apiFetchProducts(),
        apiFetchArtisans(),
        apiFetchPosts(),
        apiFetchOrders()
      ]);
      if (remoteProducts.status === 'fulfilled' && Array.isArray(remoteProducts.value) && remoteProducts.value.length > 0) {
        set(KEYS.PRODUCTS, remoteProducts.value);
      }
      if (remoteArtisans.status === 'fulfilled' && Array.isArray(remoteArtisans.value) && remoteArtisans.value.length > 0) {
        set(KEYS.ARTISANS, remoteArtisans.value);
      }
      if (remotePosts.status === 'fulfilled' && Array.isArray(remotePosts.value) && remotePosts.value.length > 0) {
        set(KEYS.POSTS, remotePosts.value);
      }
      if (remoteOrders.status === 'fulfilled' && Array.isArray(remoteOrders.value) && remoteOrders.value.length > 0) {
        set(KEYS.ORDERS, remoteOrders.value);
      }
      return true;
    } catch (e) {
      console.warn('Sync with MongoDB Atlas skipped:', e);
      return false;
    }
  },

  getReviews: () => get(KEYS.REVIEWS),
  saveReview: (review) => {
    const reviews = get(KEYS.REVIEWS);
    reviews.unshift(review);
    set(KEYS.REVIEWS, reviews);
    return review;
  },

  getCurrentUser: () => {
    initStorage();
    try {
      return JSON.parse(localStorage.getItem(KEYS.CURRENT_USER));
    } catch (e) {
      return null;
    }
  },
  saveCurrentUser: (user) => {
    set(KEYS.CURRENT_USER, user);
    // If the role is artisan, ensure they have an artisan profile in our list
    if (user.role === 'artisan') {
      const artisans = get(KEYS.ARTISANS);
      const exists = artisans.some(a => a.id === user.id);
      if (!exists) {
        const newArtisanProfile = {
          id: user.id,
          displayName: user.name,
          bio: user.bio || 'Co-creating natural products with ancient traditions.',
          craftTypes: user.craftTypes || ['Other'],
          location: user.location || 'India',
          yearsExperience: user.yearsExperience || 0,
          verificationTier: 'new',
          profilePhoto: user.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&q=80',
          coverPhoto: 'https://images.unsplash.com/photo-1595273670150-db0d3bf3b765?w=1200&h=400&fit=crop&q=80',
          joinedDate: new Date().toISOString().split('T')[0]
        };
        artisans.push(newArtisanProfile);
        set(KEYS.ARTISANS, artisans);
      }
    }
    return user;
  },

  getFollows: () => get(KEYS.FOLLOWS),
  toggleFollow: (followerId, followingId) => {
    const follows = get(KEYS.FOLLOWS);
    const index = follows.findIndex(f => f.followerId === followerId && f.followingId === followingId);
    if (index >= 0) {
      follows.splice(index, 1); // unfollow
      set(KEYS.FOLLOWS, follows);
      return false; // followed is now false
    } else {
      follows.push({ followerId, followingId }); // follow
      set(KEYS.FOLLOWS, follows);
      return true; // followed is now true
    }
  },

  getCart: () => get(KEYS.CART),
  setCart: (cart) => {
    set(KEYS.CART, cart);
  },

  getUsers: () => get(KEYS.USERS),

  findUser: (identifier) => {
    const users = get(KEYS.USERS);
    if (!identifier) return null;
    const cleanId = identifier.trim().toLowerCase();
    const cleanPhone = cleanId.replace(/\D/g, '');
    return users.find(u => {
      const userEmail = (u.email || '').toLowerCase();
      const userPhone = (u.phone || '').replace(/\D/g, '');
      if (userEmail === cleanId) return true;
      if (cleanPhone.length >= 7 && userPhone.includes(cleanPhone)) return true;
      return false;
    });
  },

  authenticateUser: (identifier, password) => {
    initStorage();
    const user = storage.findUser(identifier);
    if (!user) {
      return { success: false, error: 'No account found with this email or phone number. Please sign up.' };
    }
    if (user.password && user.password !== password) {
      return { success: false, error: 'Incorrect password. Please verify and try again.' };
    }
    storage.saveCurrentUser(user);
    return { success: true, user };
  },

  // Gmail OTP Generation & Verification
  generateOtp: (email) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    // 6-digit cryptographic-style OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 mins validity
    const otps = JSON.parse(localStorage.getItem('t2t_otps') || localStorage.getItem('origins_otps') || '{}');
    otps[cleanEmail] = { code, expiry, createdAt: Date.now() };
    localStorage.setItem('t2t_otps', JSON.stringify(otps));
    return code;
  },

  getLatestOtp: (email) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const otps = JSON.parse(localStorage.getItem('t2t_otps') || localStorage.getItem('origins_otps') || '{}');
    const record = otps[cleanEmail];
    if (record && Date.now() <= record.expiry) {
      return record.code;
    }
    return null;
  },

  verifyOtp: (email, code) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const otps = JSON.parse(localStorage.getItem('t2t_otps') || localStorage.getItem('origins_otps') || '{}');
    const record = otps[cleanEmail];
    if (!record) {
      return { success: false, error: 'No verification code requested for this Gmail address. Please request a new code.' };
    }
    if (Date.now() > record.expiry) {
      return { success: false, error: 'Verification code has expired. Please request a new code.' };
    }
    if (record.code !== (code || '').trim()) {
      return { success: false, error: 'Invalid 6-digit verification code. Please check your email and try again.' };
    }
    delete otps[cleanEmail];
    localStorage.setItem('t2t_otps', JSON.stringify(otps));
    return { success: true };
  },

  registerUser: ({ name, email, phone, password, role = 'customer', isVerified = false }) => {
    initStorage();
    const users = get(KEYS.USERS) || [];
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();

    // Check if user already exists
    const existing = users.find(u => {
      const uEmail = (u.email || '').toLowerCase();
      const uPhone = (u.phone || '').replace(/\D/g, '');
      const inputPhone = cleanPhone.replace(/\D/g, '');
      return uEmail === cleanEmail || (inputPhone && uPhone === inputPhone);
    });

    if (existing) {
      return { success: false, error: 'An account with this email or phone already exists. Please sign in.' };
    }

    const newId = role === 'artisan' ? `artisan_${Date.now()}` : `user_${Date.now()}`;
    const newUser = {
      id: newId,
      role,
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password,
      isVerified,
      emailVerifiedAt: isVerified ? new Date().toISOString() : null,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}&backgroundColor=d4724c`,
      preferences: ['Pottery', 'Weaving'],
      addresses: [
        {
          id: `addr_${Date.now()}`,
          name: name.trim(),
          street: 'Main Craft Boulevard',
          city: 'New Delhi',
          state: 'Delhi',
          zipCode: '110001',
          phone: cleanPhone,
          isDefault: true
        }
      ],
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    set(KEYS.USERS, users);
    storage.saveCurrentUser(newUser);
    return { success: true, user: newUser };
  },

  loginWithGoogle: ({ name, email, avatar, role = 'customer' }) => {
    initStorage();
    const users = get(KEYS.USERS) || [];
    const cleanEmail = (email || '').trim().toLowerCase();
    let user = users.find(u => (u.email || '').toLowerCase() === cleanEmail);

    if (!user) {
      const newId = role === 'artisan' ? `artisan_${Date.now()}` : `user_${Date.now()}`;
      user = {
        id: newId,
        role,
        name: name || cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: '',
        password: null,
        provider: 'google',
        isVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || cleanEmail)}&backgroundColor=4285F4`,
        preferences: ['Pottery', 'Weaving', 'Jewelry'],
        addresses: [
          {
            id: `addr_${Date.now()}`,
            name: name || cleanEmail.split('@')[0],
            street: 'Craft Enclave',
            city: 'New Delhi',
            state: 'Delhi',
            zipCode: '110001',
            phone: '',
            isDefault: true
          }
        ],
        createdAt: new Date().toISOString()
      };
      users.push(user);
      set(KEYS.USERS, users);
    } else {
      user.isVerified = true;
      user.emailVerifiedAt = user.emailVerifiedAt || new Date().toISOString();
      const idx = users.findIndex(u => u.id === user.id);
      if (idx >= 0) users[idx] = user;
      set(KEYS.USERS, users);
    }

    storage.saveCurrentUser(user);
    return { success: true, user };
  },

  logoutUser: () => {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(null));
  },

  clearAll: () => {
    localStorage.removeItem(KEYS.ARTISANS);
    localStorage.removeItem(KEYS.PRODUCTS);
    localStorage.removeItem(KEYS.POSTS);
    localStorage.removeItem(KEYS.ORDERS);
    localStorage.removeItem(KEYS.REVIEWS);
    localStorage.removeItem(KEYS.CURRENT_USER);
    localStorage.removeItem(KEYS.FOLLOWS);
    localStorage.removeItem(KEYS.CART);
    localStorage.removeItem(KEYS.USERS);
    initStorage();
  }
};
