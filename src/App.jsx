import React, { useState, useEffect } from 'react';
import { 
  storage 
} from './utils/storage';
import { 
  MapPin, 
  User, 
  ShoppingBag, 
  ShoppingCart, 
  Heart, 
  MessageSquare, 
  Bookmark, 
  CheckCircle, 
  Award, 
  ArrowLeft, 
  Clock, 
  Star, 
  BookOpen, 
  Calendar, 
  Globe, 
  LogIn, 
  LogOut, 
  UserPlus,
  Camera,
  Edit3,
  Upload,
  X,
  Check,
  Sparkles,
  Video
} from 'lucide-react';
import './App.css';
import AuthView from './components/AuthView';
import t2tLogo from './assets/t2t-logo.jpg';
import SplashScreen from './components/SplashScreen';
import CameraModal from './components/CameraModal';
import { compressImageFile } from './utils/imageUtils';
import { sendLoginNotification } from './services/api';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=600&fit=crop&q=80';

const handleImageError = (e) => {
  if (e.target.dataset.fallbackTried) return;
  e.target.dataset.fallbackTried = 'true';
  e.target.src = FALLBACK_IMAGE;
};

function App() {
  // Navigation & Router
  const [view, setView] = useState({ name: 'feed', params: null });
  const [currentUser, setCurrentUser] = useState(null);
  
  // Cinematic Opening Splash State (once per session)
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return !sessionStorage.getItem('t2t_splash_seen');
    }
    return true;
  });

  useEffect(() => {
    window.__replayT2TSplash = () => {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem('t2t_splash_seen');
      }
      setShowSplash(true);
    };
  }, []);
  
  // Data States (loaded from localStorage on mount & changes)
  const [artisans, setArtisans] = useState([]);
  const [products, setProducts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [follows, setFollows] = useState([]);
  const [cart, setCart] = useState([]);
  
  // Filtering & Search
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modal / Form States
  const [commentInput, setCommentInput] = useState('');
  const [activePostCommentsId, setActivePostCommentsId] = useState(null);
  const [reviewFormOrderId, setReviewFormOrderId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewImage, setReviewImage] = useState('');
  
  // Order Customization & Photo Editing States
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editOrderDescription, setEditOrderDescription] = useState('');
  const [editOrderImage, setEditOrderImage] = useState('');
  const [orderToastMessage, setOrderToastMessage] = useState(null);

  // Checkout Customization States
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [checkoutImage, setCheckoutImage] = useState('');
  
  // Camera Viewfinder Modal State
  const [cameraModalConfig, setCameraModalConfig] = useState({
    isOpen: false,
    target: null, // 'checkout' | 'orderEdit' | 'productImage1' | 'productImage2' | 'postMedia' | 'reviewImage'
    title: 'Capture Scrap Material Photo'
  });

  const handleCameraCapture = (dataUrl) => {
    if (cameraModalConfig.target === 'checkout') {
      setCheckoutImage(dataUrl);
    } else if (cameraModalConfig.target === 'orderEdit') {
      setEditOrderImage(dataUrl);
    } else if (cameraModalConfig.target === 'productImage1') {
      setNewProduct(prev => ({ ...prev, image1: dataUrl }));
    } else if (cameraModalConfig.target === 'productImage2') {
      setNewProduct(prev => ({ ...prev, image2: dataUrl }));
    } else if (cameraModalConfig.target === 'postMedia') {
      setNewPost(prev => ({ ...prev, mediaUrl: dataUrl }));
    } else if (cameraModalConfig.target === 'reviewImage') {
      setReviewImage(dataUrl);
    } else if (cameraModalConfig.target?.startsWith('diaryEntry_')) {
      const idx = parseInt(cameraModalConfig.target.split('_')[1], 10);
      setNewPost(prev => {
        const updated = [...prev.diaryEntries];
        if (updated[idx]) {
          updated[idx].media = dataUrl;
        }
        return { ...prev, diaryEntries: updated };
      });
    }
  };

  // Artisan Form States
  const [newProduct, setNewProduct] = useState({
    title: '', description: '', price: '', stock: '', category: 'Pottery',
    materials: '', timeToCreate: '', craftTechnique: '', image1: '', image2: '', isMadeToOrder: false
  });
  const [newPost, setNewPost] = useState({
    type: 'photo', mediaUrl: '', caption: '', craftStory: '', linkedProductId: '',
    diaryEntries: [{ dayNumber: 1, title: '', media: '', caption: '' }]
  });
  
  // Artisan Onboarding States
  const [artisanOnboardData, setArtisanOnboardData] = useState({
    displayName: '', bio: '', craftTypes: 'Pottery', location: '', yearsExperience: '', coverPhoto: '', fileUploaded: false
  });

  // Categories list
  const categories = ['All', 'Pottery', 'Weaving', 'Woodwork', 'Jewelry', 'Embroidery'];

  // Load and refresh state from LocalStorage
  const loadState = () => {
    setArtisans(storage.getArtisans());
    setProducts(storage.getProducts());
    setPosts(storage.getPosts());
    setOrders(storage.getOrders());
    setReviews(storage.getReviews());
    setFollows(storage.getFollows());
    setCart(storage.getCart());
    setCurrentUser(storage.getCurrentUser());
  };

  useEffect(() => {
    loadState();
    // Non-blocking sync with MongoDB Atlas when available
    storage.syncWithServer().then(() => {
      loadState();
    }).catch(() => {});
  }, []);

  // Sync Cart badge and status helper
  const addToCart = (product) => {
    const updatedCart = [...cart];
    const existing = updatedCart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      updatedCart.push({ ...product, quantity: 1 });
    }
    setCart(updatedCart);
    storage.setCart(updatedCart);
    setView({ name: 'cart', params: null });
  };

  const removeFromCart = (productId) => {
    const updatedCart = cart.filter(item => item.id !== productId);
    setCart(updatedCart);
    storage.setCart(updatedCart);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    loadState();
    if (user?.email) {
      sendLoginNotification({
        email: user.email,
        name: user.name,
        role: user.role
      }).catch((err) => console.warn('Login notification email warning:', err));
    }
    if (user.role === 'artisan') {
      setView({ name: 'artisan-dashboard', params: null });
    } else {
      setView({ name: 'feed', params: null });
    }
  };

  const handleLogout = () => {
    storage.logoutUser();
    setCurrentUser(null);
    setView({ name: 'auth', params: { tab: 'signin', message: 'You have been signed out.' } });
  };

  // Toggle user role between Customer and Artisan for current user
  const toggleUserRole = () => {
    if (!currentUser) {
      setView({ name: 'auth', params: { tab: 'signin' } });
      return;
    }
    const newRole = currentUser.role === 'customer' ? 'artisan' : 'customer';
    const updatedUser = {
      ...currentUser,
      role: newRole,
      craftTypes: currentUser.craftTypes || ['Handmade Craft'],
      location: currentUser.location || 'India',
      yearsExperience: currentUser.yearsExperience || 3
    };
    storage.saveCurrentUser(updatedUser);
    setCurrentUser(updatedUser);
    loadState();
    if (newRole === 'artisan') {
      setView({ name: 'artisan-dashboard', params: null });
    } else {
      setView({ name: 'feed', params: null });
    }
  };

  // Social interactions
  const handleLike = (postId) => {
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        // Toggle simulated likes
        const hasLiked = post.hasLiked;
        return {
          ...post,
          likesCount: hasLiked ? post.likesCount - 1 : post.likesCount + 1,
          hasLiked: !hasLiked
        };
      }
      return post;
    });
    setPosts(updatedPosts);
    // Write back to local storage
    const targetPost = updatedPosts.find(p => p.id === postId);
    storage.savePost(targetPost);
  };

  const handleFollow = (artisanId) => {
    if (!currentUser) {
      setView({ name: 'auth', params: { tab: 'signin', message: 'Please sign in to follow artisans.' } });
      return;
    }
    storage.toggleFollow(currentUser.id, artisanId);
    setFollows(storage.getFollows());
  };

  const isFollowing = (artisanId) => {
    if (!currentUser) return false;
    return follows.some(f => f.followerId === currentUser.id && f.followingId === artisanId);
  };

  const handleAddComment = (postId) => {
    if (!commentInput.trim()) return;
    if (!currentUser) {
      setView({ name: 'auth', params: { tab: 'signin', message: 'Please sign in to join the conversation.' } });
      return;
    }
    const postToUpdate = posts.find(p => p.id === postId);
    if (!postToUpdate) return;

    const newComment = {
      id: `comm_${Date.now()}`,
      userName: currentUser.name || 'Anonymous User',
      text: commentInput,
      createdAt: new Date().toISOString()
    };

    const updatedComments = [...(postToUpdate.comments || []), newComment];
    const updatedPost = { ...postToUpdate, comments: updatedComments };
    storage.savePost(updatedPost);
    setCommentInput('');
    loadState();
  };

  // Customer Checkout
  const handleCheckout = (e) => {
    e.preventDefault();
    if (!currentUser) {
      setView({ name: 'auth', params: { tab: 'signin', message: 'Please sign in or create an account to complete checkout.' } });
      return;
    }
    if (cart.length === 0) return;

    const defaultAddress = currentUser.addresses?.[0] || {
      id: 'addr_default',
      name: currentUser.name,
      street: '12, Kasturba Gandhi Marg',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110001',
      phone: currentUser.phone || '+91 98765 43210'
    };

    // Create orders for each artisan's product in the cart
    cart.forEach(item => {
      const newOrder = {
        id: `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        customerId: currentUser.id,
        artisanId: item.artisanId,
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
        customizationNotes: checkoutNotes.trim() || item.customizationNotes || 'Standard order.',
        customizationImage: checkoutImage.trim() || null,
        status: 'placed', // placed, confirmed, shipped, delivered, cancelled
        shippingAddress: defaultAddress,
        paymentStatus: 'paid',
        createdAt: new Date().toISOString()
      };
      storage.saveOrder(newOrder);
      
      // Update product stock
      const prod = products.find(p => p.id === item.id);
      if (prod) {
        storage.saveProduct({
          ...prod,
          stock: Math.max(0, prod.stock - item.quantity)
        });
      }
    });

    // Clear cart and checkout customization inputs
    storage.setCart([]);
    setCart([]);
    setCheckoutNotes('');
    setCheckoutImage('');
    setView({ name: 'customer-dashboard', params: null });
    loadState();
  };

  // Order Editing Handlers (Customer Updating Order Notes & Photo)
  const startEditingOrder = (order) => {
    setEditingOrderId(order.id);
    setEditOrderDescription(order.customizationNotes || '');
    setEditOrderImage(order.customizationImage || '');
    setReviewFormOrderId(null);
  };

  const cancelEditingOrder = () => {
    setEditingOrderId(null);
    setEditOrderDescription('');
    setEditOrderImage('');
  };

  const handleOrderImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      if (compressed) {
        setEditOrderImage(compressed);
      }
    } catch (err) {
      console.warn('Error reading mobile camera photo:', err);
    }
    e.target.value = '';
  };

  const handleCheckoutImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      if (compressed) {
        setCheckoutImage(compressed);
      }
    } catch (err) {
      console.warn('Error reading mobile camera photo:', err);
    }
    e.target.value = '';
  };

  const handleSaveOrderUpdate = (e, orderId) => {
    e.preventDefault();
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    const updated = {
      ...orderToUpdate,
      customizationNotes: editOrderDescription.trim() || 'Standard order.',
      customizationImage: editOrderImage.trim() || null,
      updatedAt: new Date().toISOString()
    };
    storage.saveOrder(updated);
    setOrders(storage.getOrders());
    setEditingOrderId(null);
    setOrderToastMessage(`Order #${orderToUpdate.id.split('_')[1]} updated with new customization notes and photo!`);
    setTimeout(() => {
      setOrderToastMessage(null);
    }, 4500);
  };

  // Review Submit
  const handleReviewSubmit = (e) => {
    e.preventDefault();
    const order = orders.find(o => o.id === reviewFormOrderId);
    if (!order) return;

    const newReview = {
      id: `rev_${Date.now()}`,
      orderId: order.id,
      customerId: currentUser.id,
      artisanId: order.artisanId,
      productId: order.productId,
      rating: reviewRating,
      text: reviewText,
      images: reviewImage ? [reviewImage] : [],
      createdAt: new Date().toISOString()
    };

    storage.saveReview(newReview);
    // Mark order as reviewed or update status if needed
    storage.saveOrder({
      ...order,
      isReviewed: true
    });

    setReviewFormOrderId(null);
    setReviewText('');
    setReviewImage('');
    setReviewRating(5);
    loadState();
  };

  // Artisan Actions
  const handleCreateProduct = (e) => {
    e.preventDefault();
    const prodId = `prod_${Date.now()}`;
    const productData = {
      id: prodId,
      artisanId: currentUser.id,
      title: newProduct.title,
      description: newProduct.description,
      price: parseFloat(newProduct.price),
      stock: parseInt(newProduct.stock),
      category: newProduct.category,
      materials: newProduct.materials.split(',').map(m => m.trim()),
      timeToCreate: newProduct.timeToCreate,
      craftTechnique: newProduct.craftTechnique,
      images: [
        newProduct.image1 || 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&h=600&fit=crop&q=80',
        newProduct.image2 || 'https://images.unsplash.com/photo-1576016770956-debb63d900ef?w=800&h=600&fit=crop&q=80'
      ],
      isMadeToOrder: newProduct.isMadeToOrder,
      status: 'active'
    };

    storage.saveProduct(productData);
    setNewProduct({
      title: '', description: '', price: '', stock: '', category: 'Pottery',
      materials: '', timeToCreate: '', craftTechnique: '', image1: '', image2: '', isMadeToOrder: false
    });
    setView({ name: 'artisan-dashboard', params: 'shop' });
    loadState();
  };

  const handleAddDiaryDay = () => {
    setNewPost({
      ...newPost,
      diaryEntries: [
        ...newPost.diaryEntries,
        { dayNumber: newPost.diaryEntries.length + 1, title: '', media: '', caption: '' }
      ]
    });
  };

  const handleCreatePost = (e) => {
    e.preventDefault();
    const postId = `post_${Date.now()}`;
    const postData = {
      id: postId,
      artisanId: currentUser.id,
      type: newPost.type,
      media: [newPost.mediaUrl || 'https://images.unsplash.com/photo-1565192647048-f997ed87f5e2?w=800&h=600&fit=crop&q=80'],
      caption: newPost.caption,
      craftStory: newPost.craftStory,
      linkedProductId: newPost.linkedProductId || null,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      savesCount: 0,
      comments: []
    };

    if (newPost.type === 'making_diary') {
      postData.diaryEntries = newPost.diaryEntries.map((entry, idx) => ({
        ...entry,
        dayNumber: idx + 1,
        media: entry.media || 'https://images.unsplash.com/photo-1565192647048-f997ed87f5e2?w=800&h=600&fit=crop&q=80'
      }));
      postData.media = [postData.diaryEntries[0].media]; // Main card image
    }

    storage.savePost(postData);
    setNewPost({
      type: 'photo', mediaUrl: '', caption: '', craftStory: '', linkedProductId: '',
      diaryEntries: [{ dayNumber: 1, title: '', media: '', caption: '' }]
    });
    setView({ name: 'feed', params: null });
    loadState();
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    storage.saveOrder({
      ...order,
      status: newStatus
    });
    loadState();
  };

  const handleArtisanOnboardingSubmit = (e) => {
    e.preventDefault();
    const updatedUser = {
      ...currentUser,
      role: 'artisan',
      name: artisanOnboardData.displayName,
      bio: artisanOnboardData.bio,
      craftTypes: [artisanOnboardData.craftTypes],
      location: artisanOnboardData.location,
      yearsExperience: parseInt(artisanOnboardData.yearsExperience),
      coverPhoto: artisanOnboardData.coverPhoto || 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&h=400&fit=crop&q=80'
    };
    storage.saveCurrentUser(updatedUser);
    setCurrentUser(updatedUser);
    setView({ name: 'artisan-dashboard', params: null });
    loadState();
  };

  // Helper selectors
  const getArtisanForProduct = (prod) => artisans.find(a => a.id === prod.artisanId);
  const getProductForPost = (post) => products.find(p => p.id === post.linkedProductId);
  const getArtisanForPost = (post) => artisans.find(a => a.id === post.artisanId);
  const getReviewsForProduct = (productId) => reviews.filter(r => r.productId === productId);

  // Compute stats for Customer Impact Dashboard
  const customerOrders = orders.filter(o => o.customerId === currentUser?.id);
  const distinctArtisansSupported = new Set(customerOrders.map(o => o.artisanId)).size;
  const distinctStatesSupported = new Set(
    customerOrders.map(o => {
      const art = artisans.find(a => a.id === o.artisanId);
      return art ? art.location.split(',').pop().trim() : null;
    }).filter(Boolean)
  ).size;
  const totalPatronSpend = customerOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);

  // Filtered lists
  const filteredProducts = products.filter(p => {
    if (selectedCategory === 'All') return p.status === 'active';
    return p.status === 'active' && p.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const filteredPosts = posts.filter(post => {
    if (selectedCategory === 'All') return true;
    // Check if the linked product is of the selected category
    const linkedProd = getProductForPost(post);
    if (linkedProd && linkedProd.category.toLowerCase() === selectedCategory.toLowerCase()) {
      return true;
    }
    // Alternatively check if artisan craft matches
    const postArtisan = getArtisanForPost(post);
    return postArtisan?.craftTypes.some(c => c.toLowerCase() === selectedCategory.toLowerCase());
  });

  return (
    <div className="app-container">
      {/* Cinematic Opening Splash Animation (Preloads app behind overlay) */}
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      {/* Live Camera Viewfinder Modal */}
      <CameraModal
        isOpen={cameraModalConfig.isOpen}
        title={cameraModalConfig.title}
        onClose={() => setCameraModalConfig(prev => ({ ...prev, isOpen: false }))}
        onCapture={handleCameraCapture}
      />

      {/* Header Chrome (Quiet & Clean) */}
      <header className="main-header">
        <div className="container header-inner">
          <div className="logo-section" onClick={() => setView({ name: 'feed', params: null })}>
            <img src={t2tLogo} alt="T2T - Trash to Treasure" className="header-logo-image" />
            <div className="logo-text-group">
              <h1 className="logo-title">T2T</h1>
              <span className="logo-tagline">Trash to Treasure</span>
            </div>
          </div>
          
          <nav className="header-nav">
            <button 
              className={`nav-link ${view.name === 'feed' ? 'active' : ''}`}
              onClick={() => setView({ name: 'feed', params: null })}
            >
              Stories Feed
            </button>
            <button 
              className={`nav-link ${view.name === 'shop' ? 'active' : ''}`}
              onClick={() => setView({ name: 'shop', params: null })}
            >
              Market
            </button>
            
            {currentUser && currentUser.role === 'customer' && (
              <button 
                className={`nav-link ${view.name === 'customer-dashboard' ? 'active' : ''}`}
                onClick={() => setView({ name: 'customer-dashboard', params: null })}
              >
                My Patronage
              </button>
            )}

            {currentUser && currentUser.role === 'artisan' && (
              <button 
                className={`nav-link ${view.name === 'artisan-dashboard' ? 'active' : ''}`}
                onClick={() => setView({ name: 'artisan-dashboard', params: null })}
              >
                Artisan Studio
              </button>
            )}

            <button 
              className={`nav-link cart-btn ${view.name === 'cart' ? 'active' : ''}`}
              onClick={() => setView({ name: 'cart', params: null })}
              aria-label="View Cart"
            >
              <ShoppingCart size={18} />
              {cart.length > 0 && <span className="cart-badge">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}
            </button>
          </nav>

          <div className="role-switch-zone">
            {currentUser ? (
              <>
                <div className="user-indicator">
                  <User size={14} />
                  <span>{currentUser.name} ({currentUser.role})</span>
                </div>
                <button className="btn btn-secondary btn-small" onClick={toggleUserRole} title="Switch between Customer and Artisan view">
                  Switch Mode
                </button>
                <button 
                  className="btn btn-secondary btn-small" 
                  onClick={() => setView({ name: 'auth', params: { tab: 'signin' } })}
                  title="Switch account"
                >
                  <LogIn size={13} />
                  <span>Switch</span>
                </button>
                <button 
                  className="btn btn-secondary btn-small" 
                  onClick={handleLogout}
                  title="Sign Out"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button 
                  className={`btn ${view.name === 'auth' && view.params?.tab === 'signin' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                  onClick={() => setView({ name: 'auth', params: { tab: 'signin' } })}
                >
                  <LogIn size={14} />
                  <span>Sign In</span>
                </button>
                <button 
                  className={`btn ${view.name === 'auth' && view.params?.tab === 'signup' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                  onClick={() => setView({ name: 'auth', params: { tab: 'signup' } })}
                >
                  <UserPlus size={14} />
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="container">
          
          {/* CATEGORY BAR (Visible on Feed and Shop) */}
          {(view.name === 'feed' || view.name === 'shop') && (
            <div className="category-scroll-bar">
              <div className="category-scroll-inner">
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: AUTHENTICATION (SIGN IN & SIGN UP) */}
          {(view.name === 'auth' || view.name === 'login') && (
            <AuthView 
              onLoginSuccess={handleLoginSuccess}
              onGuestContinue={() => setView({ name: 'feed', params: null })}
              initialTab={view.params?.tab || 'signin'}
              bannerMessage={view.params?.message || ''}
            />
          )}

          {/* VIEW: STORIES FEED */}
          {view.name === 'feed' && (
            <div className="feed-view-layout fade-in">
              <div className="feed-main-col">
                {filteredPosts.length === 0 ? (
                  <div className="empty-state">
                    <BookOpen size={48} className="empty-icon" />
                    <p>No stories found in this category. Be the first to share an origin story!</p>
                  </div>
                ) : (
                  filteredPosts.map(post => {
                    const postArtisan = getArtisanForPost(post);
                    const linkedProduct = getProductForPost(post);
                    const showComments = activePostCommentsId === post.id;

                    return (
                      <article key={post.id} className="story-card">
                        {/* Card Header */}
                        <div className="card-header">
                          <div 
                            className="artisan-meta-trigger"
                            onClick={() => setView({ name: 'artisan-profile', params: post.artisanId })}
                          >
                            <img 
                              src={postArtisan?.profilePhoto} 
                              alt={postArtisan?.displayName} 
                              className="avatar-img" 
                              onError={handleImageError}
                            />
                            <div className="artisan-details">
                              <h3 className="artisan-name">{postArtisan?.displayName}</h3>
                              <span className="artisan-loc"><MapPin size={12} /> {postArtisan?.location}</span>
                            </div>
                          </div>
                          
                          {/* Verification Badge */}
                          <div className="verification-badge-container">
                            {postArtisan?.verificationTier === 'heritage_keeper' && (
                              <span className="tier-badge heritage" title="Heritage Keeper: Preserves 50+ year old crafts">
                                <Award size={12} /> Heritage Keeper
                              </span>
                            )}
                            {postArtisan?.verificationTier === 'master' && (
                              <span className="tier-badge master" title="Master Craftsman: 10+ years active practice">
                                <Award size={12} /> Master Artisan
                              </span>
                            )}
                            {postArtisan?.verificationTier === 'verified' && (
                              <span className="tier-badge verified" title="Verified Artisan identity">
                                <CheckCircle size={12} /> Verified
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Media (Carousel / Static) */}
                        <div className="card-media">
                          <img 
                            src={post.media[0]} 
                            alt="Post visual content" 
                            className="post-main-image" 
                            onError={handleImageError}
                          />
                          
                          {post.type === 'making_diary' && (
                            <div className="making-diary-banner">
                              <BookOpen size={14} />
                              <span>Making Diary • {post.diaryEntries?.length} Days Documented</span>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="card-actions-bar">
                          <div className="left-actions">
                            <button 
                              className={`action-btn ${post.hasLiked ? 'liked' : ''}`}
                              onClick={() => handleLike(post.id)}
                              aria-label="Like post"
                            >
                              <Heart size={20} fill={post.hasLiked ? "var(--color-terracotta)" : "transparent"} />
                              <span>{post.likesCount}</span>
                            </button>
                            <button 
                              className="action-btn"
                              onClick={() => setActivePostCommentsId(showComments ? null : post.id)}
                              aria-label="View comments"
                            >
                              <MessageSquare size={20} />
                              <span>{post.comments?.length || 0}</span>
                            </button>
                          </div>
                          <button className="action-btn" aria-label="Save post">
                            <Bookmark size={20} />
                          </button>
                        </div>

                        {/* Card Body */}
                        <div className="card-body-content">
                          <p className="post-caption">
                            <strong>{postArtisan?.displayName}</strong> {post.caption}
                          </p>

                          {/* Human Story section (Differentiator) */}
                          <div className="story-provenance-box">
                            <h4 className="story-box-title">The Craft Story</h4>
                            <p className="story-text-body">{post.craftStory}</p>
                          </div>

                          {/* Making Diary Expanded (Timeline) */}
                          {post.type === 'making_diary' && post.diaryEntries && (
                            <div className="making-timeline-section">
                              <h4 className="timeline-title"><Calendar size={14} /> Production Chronology</h4>
                              <div className="timeline-stepper">
                                {post.diaryEntries.map((entry, index) => (
                                  <div key={index} className="timeline-step">
                                    <div className="timeline-node">
                                      <span className="node-day">D{entry.dayNumber}</span>
                                    </div>
                                    <div className="timeline-content-card">
                                      <div className="timeline-img-wrap">
                                        <img src={entry.media} alt={entry.title} onError={handleImageError} />
                                      </div>
                                      <div className="timeline-details">
                                        <h5>{entry.title}</h5>
                                        <p>{entry.caption}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Linked Product Card */}
                          {linkedProduct && (
                            <div className="linked-product-card">
                              <div className="linked-prod-img-wrap">
                                <img src={linkedProduct.images[0]} alt={linkedProduct.title} onError={handleImageError} />
                              </div>
                              <div className="linked-prod-details">
                                <span className="product-category-tag">{linkedProduct.category}</span>
                                <h4 className="product-card-title">{linkedProduct.title}</h4>
                                <div className="product-pricing">
                                  <span className="price-tag">₹{linkedProduct.price}</span>
                                  <span className="time-tag"><Clock size={12} /> {linkedProduct.timeToCreate.split(' ')[0]} {linkedProduct.timeToCreate.split(' ')[1] || 'days'}</span>
                                </div>
                              </div>
                              <button 
                                className="btn btn-primary btn-small"
                                onClick={() => setView({ name: 'product-detail', params: linkedProduct.id })}
                              >
                                View Product
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Comments Drawer / Drawer UI */}
                        {showComments && (
                          <div className="comments-drawer">
                            <div className="comments-list">
                              {post.comments && post.comments.length > 0 ? (
                                post.comments.map(c => (
                                  <div key={c.id} className="comment-item">
                                    <strong>{c.userName}</strong>
                                    <p>{c.text}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="no-comments-msg">No comments yet. Write a note to encourage the artisan!</p>
                              )}
                            </div>
                            <div className="comment-form-bar">
                              <input 
                                type="text" 
                                placeholder="Add a thoughtful comment..." 
                                value={commentInput}
                                onChange={(e) => setCommentInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                              />
                              <button className="btn btn-primary btn-small" onClick={() => handleAddComment(post.id)}>Post</button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>

              {/* Feed Sidebar (Quiet Showcase) */}
              <aside className="feed-sidebar">
                <div className="sidebar-widget welcome-widget">
                  <div className="sidebar-brand-showcase">
                    <img src={t2tLogo} alt="T2T - Trash to Treasure" className="sidebar-brand-logo" />
                    <div className="sidebar-brand-text">
                      <span className="sidebar-brand-title">T2T</span>
                      <span className="sidebar-brand-tagline">Trash to Treasure</span>
                    </div>
                  </div>
                  <h3>Our Philosophy</h3>
                  <p>Every reclaimed timber cut, salvaged textile scrap, and riverbed silt holds a renewed life. T2T (Trash to Treasure) ensures full provenance traceability directly from the upcycling creator's hands to yours.</p>
                </div>
                
                <div className="sidebar-widget featured-artisans-widget">
                  <h3>Featured Artisans</h3>
                  <div className="featured-artisans-list">
                    {artisans.slice(0, 3).map(art => (
                      <div 
                        key={art.id} 
                        className="featured-art-item"
                        onClick={() => setView({ name: 'artisan-profile', params: art.id })}
                      >
                        <img src={art.profilePhoto} alt={art.displayName} onError={handleImageError} />
                        <div className="feat-details">
                          <h4>{art.displayName}</h4>
                          <span>{art.location}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* VIEW: SHOP MARKET */}
          {view.name === 'shop' && (
            <div className="shop-view-layout fade-in">
              <div className="shop-header">
                <h2>The Handcrafted Market</h2>
                <p>Support creators directly. Every purchase comes with a physical card containing the provenance certificate.</p>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="empty-state">
                  <ShoppingBag size={48} className="empty-icon" />
                  <p>No products available in this category. Check back soon for fresh creations!</p>
                </div>
              ) : (
                <div className="product-grid">
                  {filteredProducts.map(prod => {
                    const prodArtisan = getArtisanForProduct(prod);
                    return (
                      <div 
                        key={prod.id} 
                        className="product-card-item"
                        onClick={() => setView({ name: 'product-detail', params: prod.id })}
                      >
                        <div className="prod-card-image-wrap">
                          <img src={prod.images[0]} alt={prod.title} onError={handleImageError} />
                          {prod.isMadeToOrder && (
                            <span className="order-type-badge">Made to Order</span>
                          )}
                        </div>
                        
                        <div className="prod-card-meta">
                          <span className="prod-card-artisan-name">by {prodArtisan?.displayName}</span>
                          <h3 className="prod-card-title">{prod.title}</h3>
                          <p className="prod-card-technique">{prod.craftTechnique}</p>
                          <div className="prod-card-footer">
                            <span className="prod-card-price">₹{prod.price}</span>
                            <span className="prod-card-time"><Clock size={12} /> {prod.timeToCreate}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW: PRODUCT DETAIL */}
          {view.name === 'product-detail' && (() => {
            const product = products.find(p => p.id === view.params);
            if (!product) return <div className="error-message">Product not found.</div>;
            const artisanInfo = getArtisanForProduct(product);
            const productReviews = getReviewsForProduct(product.id);
            const avgRating = productReviews.length > 0 
              ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
              : null;

            return (
              <div className="product-detail-layout fade-in">
                <button className="back-link-btn" onClick={() => setView({ name: 'shop', params: null })}>
                  <ArrowLeft size={16} /> Back to Market
                </button>

                <div className="detail-cols-grid">
                  {/* Media Gallery Col */}
                  <div className="detail-media-gallery">
                    <div className="main-image-wrap">
                      <img src={product.images[0]} alt={product.title} onError={handleImageError} />
                    </div>
                    {product.images.length > 1 && (
                      <div className="secondary-images-strip">
                        {product.images.slice(1).map((img, idx) => (
                          <div key={idx} className="secondary-image-wrap">
                            <img src={img} alt={`${product.title} secondary`} onError={handleImageError} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions & Buying Details Col */}
                  <div className="detail-buying-actions">
                    <span className="detail-category-tag">{product.category}</span>
                    <h2 className="detail-product-title">{product.title}</h2>
                    
                    {/* Star aggregate */}
                    <div className="rating-summary-strip">
                      {avgRating ? (
                        <>
                          <div className="stars-row">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={14} fill={i < Math.round(avgRating) ? "var(--color-terracotta)" : "transparent"} color="var(--color-terracotta)" />
                            ))}
                          </div>
                          <span className="rating-number">{avgRating} ({productReviews.length} reviews)</span>
                        </>
                      ) : (
                        <span className="rating-number">No reviews yet</span>
                      )}
                    </div>

                    <div className="detail-price-box">
                      <span className="detail-price">₹{product.price}</span>
                      <span className="detail-stock-status">
                        {product.stock > 0 ? `${product.stock} items remaining` : 'Out of stock (Made to order)'}
                      </span>
                    </div>

                    <p className="detail-description-p">{product.description}</p>

                    <div className="detail-tech-specs">
                      <div className="tech-spec-item">
                        <span className="spec-label">Technique:</span>
                        <span className="spec-val">{product.craftTechnique}</span>
                      </div>
                      <div className="tech-spec-item">
                        <span className="spec-label">Time to Create:</span>
                        <span className="spec-val">{product.timeToCreate}</span>
                      </div>
                    </div>

                    <div className="buy-button-wrapper">
                      {(!currentUser || currentUser.role === 'customer') ? (
                        <button 
                          className="btn btn-primary btn-large btn-full-width"
                          onClick={() => addToCart(product)}
                          disabled={product.stock === 0 && !product.isMadeToOrder}
                        >
                          <ShoppingCart size={18} />
                          Add to Patronage Cart
                        </button>
                      ) : (
                        <div className="artisan-preview-notice">
                          <p>You are viewing this product in Artisan Mode. Switch to Customer Mode to buy.</p>
                        </div>
                      )}
                    </div>

                    {/* PROVENANCE CERTIFICATE BADGE (Simplified differentiator) */}
                    <div className="provenance-badge-box">
                      <div className="badge-header-row">
                        <Globe size={18} className="cert-globe" />
                        <h4>Verified Origin Certificate</h4>
                      </div>
                      <p>Every piece is stamped with a unique physical QR certificate linking to this digital ledger of the artisan's workspace. Certified reclaimed materials and verified upcycling provenance by T2T standards.</p>
                      
                      <div className="simulated-qr-box">
                        <div className="qr-img-mock">
                          <img src={t2tLogo} alt="T2T Verified" className="qr-t2t-logo-img" />
                          <div className="qr-text">T2T VERIFIED</div>
                        </div>
                        <div className="qr-details">
                          <span className="cert-num">CERT ID: #T2T-{product.id.split('_').pop()}</span>
                          <span className="cert-status-tag">Status: Active Ledger</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* THE "MADE BY" CARD (Signature Core Differentiator) */}
                <section className="made-by-card-section">
                  <div className="made-by-card-wrapper">
                    <div className="card-decor-accent"></div>
                    <div className="made-by-card-inner">
                      <div className="made-by-header">
                        <div className="made-by-logo">MADE BY IDENTITY CARD</div>
                        <span className="prov-tag">PROVENANCE LOG</span>
                      </div>

                      <div className="made-by-body-grid">
                        {/* Bio & Face */}
                        <div className="mb-profile-col">
                          <img src={artisanInfo?.profilePhoto} alt={artisanInfo?.displayName} className="mb-avatar" onError={handleImageError} />
                          <div className="mb-meta">
                            <h3>{artisanInfo?.displayName}</h3>
                            <span className="mb-loc"><MapPin size={12} /> {artisanInfo?.location}</span>
                            <span className="mb-exp">{artisanInfo?.yearsExperience} Years Experience</span>
                          </div>
                        </div>

                        {/* Craft Background */}
                        <div className="mb-story-col">
                          <h4>The Creator's Story</h4>
                          <p className="mb-story-text">"{artisanInfo?.bio}"</p>
                        </div>

                        {/* Materials Log */}
                        <div className="mb-materials-col">
                          <h4>Material & Technique Traceability</h4>
                          <ul className="mb-materials-list">
                            <li>
                              <strong>Technique:</strong> {product.craftTechnique}
                            </li>
                            <li>
                              <strong>Materials Used:</strong> {product.materials.join(', ')}
                            </li>
                            <li>
                              <strong>Time Investment:</strong> {product.timeToCreate}
                            </li>
                          </ul>
                          <div className="verif-tier-stamp">
                            <Award size={14} />
                            <span>Verification Level: {artisanInfo?.verificationTier.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* REVIEWS SECTION */}
                <section className="product-reviews-section">
                  <h3 className="reviews-section-title">Customer Appraisals</h3>
                  {productReviews.length === 0 ? (
                    <p className="no-reviews-p">No reviews have been written for this craftwork yet.</p>
                  ) : (
                    <div className="reviews-stack">
                      {productReviews.map(rev => (
                        <div key={rev.id} className="review-card-item">
                          <div className="review-header">
                            <span className="reviewer-name">Patron Reviewer</span>
                            <div className="review-stars">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={12} fill={i < rev.rating ? "var(--color-terracotta)" : "transparent"} color="var(--color-terracotta)" />
                              ))}
                            </div>
                            <span className="review-date">{new Date(rev.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="review-text">{rev.text}</p>
                          {rev.images && rev.images.length > 0 && (
                            <div className="review-images-grid">
                              {rev.images.map((img, idx) => (
                                <img key={idx} src={img} alt="Customer product snapshot" className="review-snapshot-img" onError={handleImageError} />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            );
          })()}

          {/* VIEW: CART AND CHECKOUT */}
          {view.name === 'cart' && (
            <div className="cart-view-layout fade-in">
              <div className="cart-header">
                <h2>Patronage Shopping Cart</h2>
                <p>Support local weavers, potters, and carpenters. Every product goes directly to sustaining their craft.</p>
              </div>

              {cart.length === 0 ? (
                <div className="empty-cart-state">
                  <ShoppingCart size={64} className="empty-cart-icon" />
                  <p>Your cart is empty. Explore the stories feed or market to discover beautiful artisan crafts.</p>
                  <button className="btn btn-primary" onClick={() => setView({ name: 'shop', params: null })}>Go to Market</button>
                </div>
              ) : (
                <div className="cart-cols-grid">
                  {/* Items List */}
                  <div className="cart-items-list">
                    {cart.map(item => {
                      const itemArtisan = getArtisanForProduct(item);
                      return (
                        <div key={item.id} className="cart-item-row">
                          <div className="cart-item-img-wrap">
                            <img src={item.images[0]} alt={item.title} onError={handleImageError} />
                          </div>
                          <div className="cart-item-details">
                            <h3 className="cart-item-title">{item.title}</h3>
                            <span className="cart-item-artisan">by {itemArtisan?.displayName}</span>
                            <span className="cart-item-price">₹{item.price} each</span>
                          </div>
                          <div className="cart-item-actions">
                            <div className="quantity-badge">Qty: {item.quantity}</div>
                            <button 
                              className="btn-text btn-small remove-item-btn" 
                              onClick={() => removeFromCart(item.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Checkout Form */}
                  <div className="checkout-form-container">
                    <h3>Shipping & Checkout</h3>
                    <div className="order-summary-box">
                      <div className="summary-row">
                        <span>Craft Total</span>
                        <span>₹{cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
                      </div>
                      <div className="summary-row">
                        <span>Platform Shipping Support</span>
                        <span>₹150</span>
                      </div>
                      <div className="summary-row total-row">
                        <span>Total Due</span>
                        <span>₹{cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 150}</span>
                      </div>
                    </div>

                    <form onSubmit={handleCheckout} className="checkout-form-element">
                      <h4 className="form-section-title">Delivery Address</h4>
                      {currentUser ? (
                        <div className="saved-address-card">
                          <strong>{currentUser.addresses?.[0]?.name || currentUser.name}</strong>
                          <p>{currentUser.addresses?.[0]?.street || 'Main Craft Way'}</p>
                          <p>{currentUser.addresses?.[0]?.city || 'New Delhi'}, {currentUser.addresses?.[0]?.state || 'Delhi'} - {currentUser.addresses?.[0]?.zipCode || '110001'}</p>
                          <p>Phone: {currentUser.addresses?.[0]?.phone || currentUser.phone || '+91 98765 43210'}</p>
                        </div>
                      ) : (
                        <div className="saved-address-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                          <p style={{ marginBottom: '0.6rem', color: 'var(--color-charcoal-muted)', fontSize: '0.88rem' }}>
                            Please sign in or create an account to provide shipping details and confirm order.
                          </p>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-small"
                            onClick={() => setView({ name: 'auth', params: { tab: 'signin', message: 'Sign in to complete your checkout.' } })}
                          >
                            <LogIn size={14} />
                            <span>Sign In / Register</span>
                          </button>
                        </div>
                      )}

                      {/* TRASH TO TREASURE (T2T) CUSTOMIZATION & PHOTO ATTACHMENT */}
                      <div className="checkout-custom-card">
                        <div className="checkout-custom-header">
                          <Sparkles size={16} className="sparkle-icon" />
                          <h4>Trash to Treasure (T2T) Scrap Notes & Photo (Optional)</h4>
                        </div>
                        <p className="checkout-custom-desc">
                          Have raw scrap materials (textile scraps, reclaimed timber, broken pottery) or a custom upcycling vision? Add notes and attach a photo for the maker.
                        </p>

                        <div className="form-group">
                          <label htmlFor="checkout-notes">Customization Description / Scrap Notes</label>
                          <textarea
                            id="checkout-notes"
                            rows="2"
                            placeholder="e.g., I will send 2 pairs of vintage denim for upcycling; please use the contrast back pockets for the outer pouch..."
                            value={checkoutNotes}
                            onChange={(e) => setCheckoutNotes(e.target.value)}
                          ></textarea>
                        </div>

                        <div className="form-group">
                          <label>Attach Scrap Material or Reference Photo</label>
                          <div className="order-photo-uploader-box">
                            <div className="order-photo-actions-row">
                              <label className="btn btn-primary btn-camera-trigger file-input-label" title="Snap photo using mobile camera">
                                <Camera size={16} />
                                <span>Mobile Camera</span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  capture="environment" 
                                  onChange={handleCheckoutImageFileUpload} 
                                  style={{ display: 'none' }}
                                />
                              </label>

                              <label className="btn btn-secondary file-input-label" title="Upload from photo album or files">
                                <Upload size={16} />
                                <span>Choose from Gallery</span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={handleCheckoutImageFileUpload} 
                                  style={{ display: 'none' }}
                                />
                              </label>

                              <button
                                type="button"
                                className="btn btn-secondary btn-small live-webcam-btn"
                                onClick={() => setCameraModalConfig({
                                  isOpen: true,
                                  target: 'checkout',
                                  title: 'Capture Scrap Material Photo'
                                })}
                                title="Open live webcam viewfinder (laptop/desktop)"
                              >
                                <Video size={14} />
                                <span>Live Webcam</span>
                              </button>
                            </div>

                            {checkoutImage && (
                              <div className="order-photo-preview-card">
                                <img 
                                  src={checkoutImage} 
                                  alt="Checkout scrap material preview" 
                                  className="order-photo-preview-img" 
                                  onError={handleImageError} 
                                />
                                <div className="order-photo-preview-info">
                                  <span className="preview-label"><Check size={13} /> Photo attached to order</span>
                                  <div className="preview-action-btns">
                                    <label className="btn-text btn-small retake-photo-btn file-input-label" title="Retake with mobile camera">
                                      <Camera size={13} />
                                      <span>Retake Camera</span>
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment" 
                                        onChange={handleCheckoutImageFileUpload} 
                                        style={{ display: 'none' }}
                                      />
                                    </label>
                                    <button 
                                      type="button" 
                                      className="btn-text btn-small remove-photo-btn"
                                      onClick={() => setCheckoutImage('')}
                                    >
                                      <X size={13} />
                                      <span>Remove</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="payment-simulation-notice">
                        <p>Simulating Razorpay/Stripe checkout. No actual money will be charged.</p>
                      </div>

                      <button type="submit" className="btn btn-primary btn-large btn-full-width">
                        {currentUser ? 'Confirm & Place Order' : 'Sign In & Place Order'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: CUSTOMER DASHBOARD */}
          {view.name === 'customer-dashboard' && (
            !currentUser ? (
              <div className="empty-state" style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                <User size={48} className="empty-icon" />
                <h3>Patronage Dashboard</h3>
                <p>Please sign in to view your craft support map, patronage impact, and orders.</p>
                <button 
                  className="btn btn-primary" 
                  style={{ marginTop: '1.25rem' }} 
                  onClick={() => setView({ name: 'auth', params: { tab: 'signin' } })}
                >
                  <LogIn size={16} />
                  <span>Sign In</span>
                </button>
              </div>
            ) : (
              <div className="customer-dashboard-layout fade-in">
                {/* IMPACT DASHBOARD SECTION (Core loop value) */}
              <section className="impact-dashboard">
                <div className="impact-header">
                  <h2>Your Craft Support Map</h2>
                  <p>Every transaction on T2T (Trash to Treasure) directly prevents waste and feeds into sustaining indigenous upcycling artisans.</p>
                </div>
                
                <div className="impact-stats-grid">
                  <div className="impact-stat-card">
                    <span className="impact-stat-number">{distinctArtisansSupported}</span>
                    <span className="impact-stat-label">Artisans Sustained</span>
                  </div>
                  <div className="impact-stat-card">
                    <span className="impact-stat-number">{distinctStatesSupported}</span>
                    <span className="impact-stat-label">States Supported</span>
                  </div>
                  <div className="impact-stat-card">
                    <span className="impact-stat-number">₹{totalPatronSpend}</span>
                    <span className="impact-stat-label">Direct Contribution</span>
                  </div>
                </div>
              </section>

              {/* ORDERS LIST */}
              <section className="customer-orders-section">
                <div className="orders-section-header-row">
                  <h3>Your Ordered Provenance Logs</h3>
                  <span className="orders-section-sub">Customize your orders with scrap material notes and photos for the artisan</span>
                </div>

                {orderToastMessage && (
                  <div className="order-update-toast fade-in">
                    <CheckCircle size={16} />
                    <span>{orderToastMessage}</span>
                  </div>
                )}

                {customerOrders.length === 0 ? (
                  <p className="no-orders-p">No orders placed yet. Start supporting artisans in the market!</p>
                ) : (
                  <div className="orders-stack">
                    {customerOrders.map(order => {
                      const orderProd = products.find(p => p.id === order.productId);
                      const orderArt = artisans.find(a => a.id === order.artisanId);
                      
                      return (
                        <div key={order.id} className="order-ledger-card">
                          <div className="order-ledger-header">
                            <span className="order-id-label">ORDER ID: {order.id.split('_')[1]}</span>
                            <span className="order-date-label">Placed: {new Date(order.createdAt).toLocaleDateString()}</span>
                            <span className={`status-badge-val ${order.status}`}>
                              {order.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="order-ledger-body">
                            <div className="order-product-info">
                              <img src={orderProd?.images[0]} alt={orderProd?.title} className="order-thumbnail-img" onError={handleImageError} />
                              <div className="order-prod-meta">
                                <h4>{orderProd?.title}</h4>
                                <span>Artisan: {orderArt?.displayName}</span>
                                <span>Quantity: {order.quantity} | Total: ₹{order.price * order.quantity}</span>
                              </div>
                            </div>

                            <div className="order-actions-zone">
                              {order.status === 'delivered' && !order.isReviewed && (
                                <button 
                                  className="btn btn-secondary btn-small"
                                  onClick={() => setReviewFormOrderId(order.id)}
                                >
                                  Submit Craft Appraisal
                                </button>
                              )}
                              {order.isReviewed && (
                                <span className="reviewed-badge-indicator">Appraisal Submitted</span>
                              )}

                              <button 
                                className="btn btn-secondary btn-small"
                                onClick={() => startEditingOrder(order)}
                                title="Update order notes and attach photo of your scrap material"
                              >
                                <Edit3 size={13} />
                                <span>{order.customizationImage || (order.customizationNotes && order.customizationNotes !== 'Standard order.') ? 'Update Photo & Notes' : 'Add Photo & Notes'}</span>
                              </button>
                              
                              <button 
                                className="btn btn-text btn-small"
                                onClick={() => setView({ name: 'product-detail', params: order.productId })}
                              >
                                View Traceability
                              </button>
                            </div>
                          </div>

                          {/* CUSTOM SPEC & ATTACHED SCRAP PHOTO DISPLAY */}
                          {(order.customizationNotes || order.customizationImage) && (
                            <div className="order-customization-preview">
                              <div className="order-custom-spec-head">
                                <Sparkles size={13} className="sparkle-icon" />
                                <strong>Custom Scrap Material & Instructions:</strong>
                              </div>
                              {order.customizationNotes && (
                                <p className="order-custom-notes-text">"{order.customizationNotes}"</p>
                              )}
                              {order.customizationImage && (
                                <div className="order-custom-photo-row">
                                  <div className="order-custom-photo-box">
                                    <img 
                                      src={order.customizationImage} 
                                      alt="Customer attached scrap material" 
                                      className="order-custom-pic" 
                                      onError={handleImageError} 
                                    />
                                  </div>
                                  <div className="order-custom-pic-caption">
                                    <Camera size={13} />
                                    <span>Attached Scrap / Inspiration Photo</span>
                                    <a 
                                      href={order.customizationImage} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="view-full-pic-link"
                                    >
                                      View Full Photo
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* INLINE EDIT ORDER FORM */}
                          {editingOrderId === order.id && (
                            <form onSubmit={(e) => handleSaveOrderUpdate(e, order.id)} className="order-edit-dropdown-form fade-in">
                              <div className="order-edit-form-header">
                                <div className="order-edit-title-group">
                                  <Edit3 size={16} />
                                  <h4>Update Order #{order.id.split('_')[1]} — Notes & Material Photo</h4>
                                </div>
                                <span className="order-edit-hint">Describe your raw trash/scraps or attach reference photos for the artisan</span>
                              </div>

                              <div className="form-group">
                                <label htmlFor={`order-notes-${order.id}`}>Customization Description & Scrap Notes</label>
                                <textarea
                                  id={`order-notes-${order.id}`}
                                  rows="3"
                                  placeholder="Describe how you'd like your piece made, dimensions, scrap material condition, or specific artisan instructions..."
                                  value={editOrderDescription}
                                  onChange={(e) => setEditOrderDescription(e.target.value)}
                                  required
                                ></textarea>
                              </div>

                              <div className="form-group">
                                <label>Attached Photo (Scrap Material / Design Reference)</label>
                                <div className="order-photo-uploader-box">
                                  <div className="order-photo-actions-row">
                                    <label className="btn btn-primary btn-camera-trigger file-input-label" title="Snap photo using mobile camera">
                                      <Camera size={16} />
                                      <span>Mobile Camera</span>
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment" 
                                        onChange={handleOrderImageFileUpload} 
                                        style={{ display: 'none' }}
                                      />
                                    </label>

                                    <label className="btn btn-secondary file-input-label" title="Upload from photo album or files">
                                      <Upload size={16} />
                                      <span>Choose from Gallery</span>
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleOrderImageFileUpload} 
                                        style={{ display: 'none' }}
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-small live-webcam-btn"
                                      onClick={() => setCameraModalConfig({
                                        isOpen: true,
                                        target: 'orderEdit',
                                        title: `Take Photo for Order #${order.id.split('_')[1]}`
                                      })}
                                      title="Open live webcam viewfinder (laptop/desktop)"
                                    >
                                      <Video size={14} />
                                      <span>Live Webcam</span>
                                    </button>
                                  </div>

                                  {editOrderImage && (
                                    <div className="order-photo-preview-card">
                                      <img 
                                        src={editOrderImage} 
                                        alt="Photo attachment preview" 
                                        className="order-photo-preview-img" 
                                        onError={handleImageError} 
                                      />
                                      <div className="order-photo-preview-info">
                                        <span className="preview-label"><Check size={13} /> Photo ready to attach</span>
                                        <div className="preview-action-btns">
                                          <label className="btn-text btn-small retake-photo-btn file-input-label" title="Retake with mobile camera">
                                            <Camera size={13} />
                                            <span>Retake Camera</span>
                                            <input 
                                              type="file" 
                                              accept="image/*" 
                                              capture="environment" 
                                              onChange={handleOrderImageFileUpload} 
                                              style={{ display: 'none' }}
                                            />
                                          </label>
                                          <button 
                                            type="button" 
                                            className="btn-text btn-small remove-photo-btn"
                                            onClick={() => setEditOrderImage('')}
                                          >
                                            <X size={13} />
                                            <span>Remove</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="form-actions-row">
                                <button type="submit" className="btn btn-primary btn-small">
                                  <Check size={14} />
                                  <span>Save Order Updates</span>
                                </button>
                                <button 
                                  type="button" 
                                  className="btn btn-secondary btn-small" 
                                  onClick={cancelEditingOrder}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Appraise Form Toggle */}
                          {reviewFormOrderId === order.id && (
                            <form onSubmit={handleReviewSubmit} className="review-dropdown-form fade-in">
                              <h4>Write a Craft Appraisal</h4>
                              <div className="form-group">
                                <label>Appraisal Rating</label>
                                <select 
                                  value={reviewRating} 
                                  onChange={(e) => setReviewRating(parseInt(e.target.value))}
                                >
                                  <option value="5">5 Stars — Excellent Craftsmanship</option>
                                  <option value="4">4 Stars — Very Good Quality</option>
                                  <option value="3">3 Stars — Satisfactory</option>
                                  <option value="2">2 Stars — Needs Improvement</option>
                                  <option value="1">1 Star — Unsatisfactory</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label>Write Your Experience</label>
                                <textarea 
                                  rows="3"
                                  placeholder="Describe the tactile quality, finish, packaging, and beauty of this product..."
                                  value={reviewText}
                                  onChange={(e) => setReviewText(e.target.value)}
                                  required
                                ></textarea>
                              </div>
                              <div className="form-group">
                                <label>Snapshot of Received Treasure (Optional)</label>
                                <div className="order-photo-actions-row">
                                  <label className="btn btn-secondary btn-small file-input-label" title="Snap photo of piece with mobile camera">
                                    <Camera size={14} />
                                    <span>Mobile Camera</span>
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      capture="environment" 
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const compressed = await compressImageFile(file);
                                        if (compressed) setReviewImage(compressed);
                                        e.target.value = '';
                                      }} 
                                      style={{ display: 'none' }}
                                    />
                                  </label>

                                  <label className="btn btn-secondary btn-small file-input-label" title="Upload from photo album">
                                    <Upload size={14} />
                                    <span>From Gallery</span>
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const compressed = await compressImageFile(file);
                                        if (compressed) setReviewImage(compressed);
                                        e.target.value = '';
                                      }} 
                                      style={{ display: 'none' }}
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-small live-webcam-btn"
                                    onClick={() => setCameraModalConfig({
                                      isOpen: true,
                                      target: 'reviewImage',
                                      title: 'Snap Photo of Your Received Piece'
                                    })}
                                    title="Open live webcam viewfinder"
                                  >
                                    <Video size={13} />
                                    <span>Webcam</span>
                                  </button>
                                </div>

                                {reviewImage && (
                                  <div className="order-photo-preview-card" style={{ marginTop: '0.4rem' }}>
                                    <img src={reviewImage} alt="Review snapshot preview" className="order-photo-preview-img" onError={handleImageError} />
                                    <div className="order-photo-preview-info">
                                      <span className="preview-label"><Check size={13} /> Photo attached</span>
                                      <div className="preview-action-btns">
                                        <label className="btn-text btn-small retake-photo-btn file-input-label" title="Retake with mobile camera">
                                          <Camera size={13} />
                                          <span>Retake Camera</span>
                                          <input 
                                            type="file" 
                                            accept="image/*" 
                                            capture="environment" 
                                            onChange={async (e) => {
                                              const file = e.target.files?.[0];
                                              if (!file) return;
                                              const compressed = await compressImageFile(file);
                                              if (compressed) setReviewImage(compressed);
                                              e.target.value = '';
                                            }} 
                                            style={{ display: 'none' }}
                                          />
                                        </label>
                                        <button 
                                          type="button" 
                                          className="btn-text btn-small remove-photo-btn"
                                          onClick={() => setReviewImage('')}
                                        >
                                          <X size={13} />
                                          <span>Remove</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="form-actions-row">
                                <button type="submit" className="btn btn-primary btn-small">Submit Appraisal</button>
                                <button type="button" className="btn btn-secondary btn-small" onClick={() => setReviewFormOrderId(null)}>Cancel</button>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          ))}

          {/* VIEW: ARTISAN STUDIO DASHBOARD */}
          {view.name === 'artisan-dashboard' && (
            !currentUser ? (
              <div className="empty-state" style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                <User size={48} className="empty-icon" />
                <h3>Artisan Studio Sign-In Required</h3>
                <p>Sign in with your master artisan account to manage inventory, fulfill craft orders, and log chronicles.</p>
                <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={() => setView({ name: 'auth', params: { tab: 'signin' } })}>
                    <LogIn size={16} />
                    <span>Sign In</span>
                  </button>
                  <button className="btn btn-secondary" onClick={() => setView({ name: 'auth', params: { tab: 'signup' } })}>
                    <UserPlus size={16} />
                    <span>Join as Artisan</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="artisan-dashboard-layout fade-in">
                <div className="studio-header">
                  <h2>Artisan Studio</h2>
                  <p>Add products, share raw workshops stories, and check order requests.</p>
                </div>

              {/* Sub-navigation inside studio */}
              <div className="studio-sub-nav">
                <button 
                  className={`studio-tab-btn ${!view.params || view.params === 'overview' ? 'active' : ''}`}
                  onClick={() => setView({ name: 'artisan-dashboard', params: 'overview' })}
                >
                  Overview & Listings
                </button>
                <button 
                  className={`studio-tab-btn ${view.params === 'create-product' ? 'active' : ''}`}
                  onClick={() => setView({ name: 'artisan-dashboard', params: 'create-product' })}
                >
                  Add Product
                </button>
                <button 
                  className={`studio-tab-btn ${view.params === 'create-post' ? 'active' : ''}`}
                  onClick={() => setView({ name: 'artisan-dashboard', params: 'create-post' })}
                >
                  Share Story/Diary
                </button>
              </div>

              {/* TAB: OVERVIEW & LISTINGS */}
              {(!view.params || view.params === 'overview') && (
                <div className="studio-overview-grid">
                  {/* Left Column: Orders */}
                  <div className="studio-orders-col">
                    <h3>Patronage Orders Inbox</h3>
                    {orders.filter(o => o.artisanId === currentUser.id).length === 0 ? (
                      <p className="no-orders-p">No orders received yet.</p>
                    ) : (
                      <div className="studio-orders-list">
                        {orders.filter(o => o.artisanId === currentUser.id).map(order => {
                          const orderProd = products.find(p => p.id === order.productId);
                          return (
                            <div key={order.id} className="studio-order-card">
                              <div className="order-details-header">
                                <strong>Order #{order.id.split('_')[1]}</strong>
                                <span className={`status-badge-val ${order.status}`}>{order.status}</span>
                              </div>
                              <div className="order-details-body">
                                <p><strong>Product:</strong> {orderProd?.title}</p>
                                <p><strong>Quantity:</strong> {order.quantity} | <strong>Total:</strong> ₹{order.price * order.quantity}</p>
                                {order.customizationNotes && (
                                  <div className="artisan-order-spec-block">
                                    <strong>Customer Scrap Notes:</strong>
                                    <p className="artisan-spec-notes">"{order.customizationNotes}"</p>
                                  </div>
                                )}
                                {order.customizationImage && (
                                  <div className="artisan-order-photo-block">
                                    <strong>Customer Attached Material Photo:</strong>
                                    <div className="artisan-order-photo-wrap">
                                      <img 
                                        src={order.customizationImage} 
                                        alt="Customer scrap material photo" 
                                        className="artisan-order-pic"
                                        onError={handleImageError} 
                                      />
                                      <a 
                                        href={order.customizationImage} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="artisan-view-photo-link"
                                      >
                                        <Camera size={12} /> View Full Photo
                                      </a>
                                    </div>
                                  </div>
                                )}
                                <p className="cust-shipping-txt">
                                  <strong>Ship To:</strong> {order.shippingAddress?.name}, {order.shippingAddress?.street}, {order.shippingAddress?.city}
                                </p>
                              </div>
                              <div className="order-status-actions">
                                {order.status === 'placed' && (
                                  <button 
                                    className="btn btn-primary btn-small"
                                    onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                                  >
                                    Accept & Confirm
                                  </button>
                                )}
                                {order.status === 'confirmed' && (
                                  <button 
                                    className="btn btn-primary btn-small"
                                    onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                                  >
                                    Mark as Shipped
                                  </button>
                                )}
                                {order.status === 'shipped' && (
                                  <button 
                                    className="btn btn-secondary btn-small"
                                    onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                  >
                                    Confirm Delivery
                                  </button>
                                )}
                                {order.status === 'delivered' && (
                                  <span className="success-txt-indicator"><CheckCircle size={14} /> Completed</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Profile & Analytics */}
                  <div className="studio-profile-col">
                    <div className="studio-card profile-card">
                      <h3>Studio Profile</h3>
                      <div className="studio-profile-meta">
                        <img src={currentUser.profilePhoto} alt={currentUser.name} className="studio-profile-avatar" onError={handleImageError} />
                        <div>
                          <h4>{currentUser.name}</h4>
                          <p>{currentUser.location}</p>
                          <span className="studio-exp-tag">{currentUser.yearsExperience} Years Exp</span>
                        </div>
                      </div>
                      <div className="verification-status-panel">
                        <Award size={18} className="icon-award" />
                        <div>
                          <strong>Verification Queue Tracker</strong>
                          <p>Your studio is approved. Status: Master Artisan.</p>
                        </div>
                      </div>
                    </div>

                    <div className="studio-card products-list-card">
                      <h3>Active Craft Listings</h3>
                      <div className="studio-products-list">
                        {products.filter(p => p.artisanId === currentUser.id).map(p => (
                          <div key={p.id} className="studio-product-item">
                            <img src={p.images[0]} alt={p.title} onError={handleImageError} />
                            <div>
                              <h4>{p.title}</h4>
                              <span>Stock: {p.stock} | Price: ₹{p.price}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: ADD PRODUCT */}
              {view.params === 'create-product' && (
                <div className="studio-form-container">
                  <h3>List a New Handmade Creation</h3>
                  <p className="form-info-txt">Every product listing requires detail fields about techniques and raw materials to automatically populate the "Made By" identity card and provenance certification.</p>
                  
                  <form onSubmit={handleCreateProduct} className="studio-form-element">
                    <div className="grid grid-cols-2 gap-md">
                      <div className="form-group">
                        <label>Product Title</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Ganges Clay Terracotta Pitcher"
                          value={newProduct.title}
                          onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Category</label>
                        <select 
                          value={newProduct.category}
                          onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                        >
                          <option value="Pottery">Pottery</option>
                          <option value="Weaving">Weaving</option>
                          <option value="Woodwork">Woodwork</option>
                          <option value="Jewelry">Jewelry</option>
                          <option value="Embroidery">Embroidery</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Product Story Description</label>
                      <textarea 
                        rows="3" 
                        placeholder="Write details about the texture, origin, packaging, and utility of this specific item..."
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                        required
                      ></textarea>
                    </div>

                    <div className="grid grid-cols-2 gap-md">
                      <div className="form-group">
                        <label>Base Price (INR)</label>
                        <input 
                          type="number" 
                          placeholder="1850"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Quantity In Stock</label>
                        <input 
                          type="number" 
                          placeholder="5"
                          value={newProduct.stock}
                          onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Raw Materials Used (Comma Separated)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Silt Clay, Iron Oxide glazes, Oak wood shaving firings"
                        value={newProduct.materials}
                        onChange={(e) => setNewProduct({...newProduct, materials: e.target.value})}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-md">
                      <div className="form-group">
                        <label>Time Taken to Create</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 3 days (throwing, drying, wood firing)"
                          value={newProduct.timeToCreate}
                          onChange={(e) => setNewProduct({...newProduct, timeToCreate: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Specific Craft Technique</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Wheel-thrown terracotta, pit-fired"
                          value={newProduct.craftTechnique}
                          onChange={(e) => setNewProduct({...newProduct, craftTechnique: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-md">
                      <div className="form-group">
                        <label>Primary Craft Photo (Camera / Upload)</label>
                        <div className="product-image-input-lockup">
                          <div className="order-photo-actions-row" style={{ marginBottom: '0.4rem' }}>
                            <label className="btn btn-secondary btn-small file-input-label" title="Snap photo using mobile camera">
                              <Camera size={14} />
                              <span>Camera</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const compressed = await compressImageFile(file);
                                  if (compressed) setNewProduct(prev => ({ ...prev, image1: compressed }));
                                  e.target.value = '';
                                }} 
                                style={{ display: 'none' }}
                              />
                            </label>
                            <label className="btn btn-secondary btn-small file-input-label" title="Upload from files/gallery">
                              <Upload size={14} />
                              <span>Upload</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const compressed = await compressImageFile(file);
                                  if (compressed) setNewProduct(prev => ({ ...prev, image1: compressed }));
                                  e.target.value = '';
                                }} 
                                style={{ display: 'none' }}
                              />
                            </label>
                            <button
                              type="button"
                              className="btn btn-secondary btn-small"
                              onClick={() => setCameraModalConfig({
                                isOpen: true,
                                target: 'productImage1',
                                title: 'Capture Primary Product Photo'
                              })}
                              title="Open live webcam viewfinder"
                            >
                              <Video size={13} />
                              <span>Webcam</span>
                            </button>
                          </div>
                          {newProduct.image1 && (
                            <div className="order-photo-preview-card" style={{ marginTop: '0.4rem' }}>
                              <img src={newProduct.image1} alt="Primary preview" className="order-photo-preview-img" onError={handleImageError} />
                              <div className="order-photo-preview-info">
                                <span className="preview-label"><Check size={13} /> Photo ready</span>
                                <button type="button" className="btn-text btn-small remove-photo-btn" onClick={() => setNewProduct({...newProduct, image1: ''})}>
                                  <X size={13} />
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Secondary Craft Photo (Camera / Upload)</label>
                        <div className="product-image-input-lockup">
                          <div className="order-photo-actions-row" style={{ marginBottom: '0.4rem' }}>
                            <label className="btn btn-secondary btn-small file-input-label" title="Snap photo using mobile camera">
                              <Camera size={14} />
                              <span>Camera</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const compressed = await compressImageFile(file);
                                  if (compressed) setNewProduct(prev => ({ ...prev, image2: compressed }));
                                  e.target.value = '';
                                }} 
                                style={{ display: 'none' }}
                              />
                            </label>
                            <label className="btn btn-secondary btn-small file-input-label" title="Upload from files/gallery">
                              <Upload size={14} />
                              <span>Upload</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const compressed = await compressImageFile(file);
                                  if (compressed) setNewProduct(prev => ({ ...prev, image2: compressed }));
                                  e.target.value = '';
                                }} 
                                style={{ display: 'none' }}
                              />
                            </label>
                            <button
                              type="button"
                              className="btn btn-secondary btn-small"
                              onClick={() => setCameraModalConfig({
                                isOpen: true,
                                target: 'productImage2',
                                title: 'Capture Secondary Product Photo'
                              })}
                              title="Open live webcam viewfinder"
                            >
                              <Video size={13} />
                              <span>Webcam</span>
                            </button>
                          </div>
                          {newProduct.image2 && (
                            <div className="order-photo-preview-card" style={{ marginTop: '0.4rem' }}>
                              <img src={newProduct.image2} alt="Secondary preview" className="order-photo-preview-img" onError={handleImageError} />
                              <div className="order-photo-preview-info">
                                <span className="preview-label"><Check size={13} /> Photo ready</span>
                                <button type="button" className="btn-text btn-small remove-photo-btn" onClick={() => setNewProduct({...newProduct, image2: ''})}>
                                  <X size={13} />
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="checkbox-group">
                      <input 
                        type="checkbox" 
                        id="isMadeToOrder"
                        checked={newProduct.isMadeToOrder}
                        onChange={(e) => setNewProduct({...newProduct, isMadeToOrder: e.target.checked})}
                      />
                      <label htmlFor="isMadeToOrder" className="checkbox-label">This item is Made to Order (Stock can be custom made if sold out)</label>
                    </div>

                    <button type="submit" className="btn btn-primary btn-large">Publish Craft Listing</button>
                  </form>
                </div>
              )}

              {/* TAB: SHARE STORY / DIARY */}
              {view.params === 'create-post' && (
                <div className="studio-form-container">
                  <h3>Share an Origin Story or Making Diary</h3>
                  <p className="form-info-txt">Post a standard photo/video story about your craft, or document a step-by-step Making Diary spanning multiple days of creation.</p>
                  
                  <form onSubmit={handleCreatePost} className="studio-form-element">
                    <div className="grid grid-cols-2 gap-md">
                      <div className="form-group">
                        <label>Story Type</label>
                        <select 
                          value={newPost.type}
                          onChange={(e) => setNewPost({...newPost, type: e.target.value})}
                        >
                          <option value="photo">Standard Photo Post</option>
                          <option value="making_diary">Making Diary (Multi-Day Timeline)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Link to Product Listing (Optional)</label>
                        <select 
                          value={newPost.linkedProductId}
                          onChange={(e) => setNewPost({...newPost, linkedProductId: e.target.value})}
                        >
                          <option value="">No Product Linked</option>
                          {products.filter(p => p.artisanId === currentUser.id).map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Story Cover Photo (Camera / Upload)</label>
                      <div className="product-image-input-lockup">
                        <div className="order-photo-actions-row" style={{ marginBottom: '0.4rem' }}>
                          <label className="btn btn-secondary btn-small file-input-label" title="Snap photo using mobile camera">
                            <Camera size={14} />
                            <span>Camera</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const compressed = await compressImageFile(file);
                                if (compressed) setNewPost(prev => ({ ...prev, mediaUrl: compressed }));
                                e.target.value = '';
                              }} 
                              style={{ display: 'none' }}
                            />
                          </label>
                          <label className="btn btn-secondary btn-small file-input-label" title="Upload from files/gallery">
                            <Upload size={14} />
                            <span>Upload</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const compressed = await compressImageFile(file);
                                if (compressed) setNewPost(prev => ({ ...prev, mediaUrl: compressed }));
                                e.target.value = '';
                              }} 
                              style={{ display: 'none' }}
                            />
                          </label>
                          <button
                            type="button"
                            className="btn btn-secondary btn-small"
                            onClick={() => setCameraModalConfig({
                              isOpen: true,
                              target: 'postMedia',
                              title: 'Capture Story Cover Photo'
                            })}
                            title="Open live webcam viewfinder"
                          >
                            <Video size={13} />
                            <span>Webcam</span>
                          </button>
                        </div>
                        {newPost.mediaUrl && (
                          <div className="order-photo-preview-card" style={{ marginTop: '0.4rem' }}>
                            <img src={newPost.mediaUrl} alt="Story cover preview" className="order-photo-preview-img" onError={handleImageError} />
                            <div className="order-photo-preview-info">
                              <span className="preview-label"><Check size={13} /> Story cover ready</span>
                              <button type="button" className="btn-text btn-small remove-photo-btn" onClick={() => setNewPost({...newPost, mediaUrl: ''})}>
                                <X size={13} />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Post Summary Caption</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Refining the clay bodies for our upcoming pottery kiln launch..."
                        value={newPost.caption}
                        onChange={(e) => setNewPost({...newPost, caption: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>The Human Craft Story (Behind-the-Scenes detail)</label>
                      <textarea 
                        rows="4" 
                        placeholder="Share the struggles, material search, technique challenges, or local history behind this effort..."
                        value={newPost.craftStory}
                        onChange={(e) => setNewPost({...newPost, craftStory: e.target.value})}
                        required
                      ></textarea>
                    </div>

                    {/* MAKING DIARY BUILDER */}
                    {newPost.type === 'making_diary' && (
                      <div className="diary-entries-builder">
                        <h4>Configure Diary Timeline Days</h4>
                        {newPost.diaryEntries.map((entry, index) => (
                          <div key={index} className="diary-day-card">
                            <h5>Day {entry.dayNumber} Entry</h5>
                            <div className="grid grid-cols-2 gap-md">
                              <div className="form-group">
                                <label>Day Activity Title</label>
                                <input 
                                  type="text" 
                                  placeholder="e.g. Clay preparation & wedging"
                                  value={entry.title}
                                  onChange={(e) => {
                                    const updated = [...newPost.diaryEntries];
                                    updated[index].title = e.target.value;
                                    setNewPost({...newPost, diaryEntries: updated});
                                  }}
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label>Day Photo (Camera / Upload)</label>
                                <div className="product-image-input-lockup">
                                  <div className="order-photo-actions-row" style={{ marginBottom: '0.4rem' }}>
                                    <label className="btn btn-secondary btn-small file-input-label" title="Snap photo using mobile camera">
                                      <Camera size={14} />
                                      <span>Camera</span>
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment" 
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const compressed = await compressImageFile(file);
                                          if (compressed) {
                                            const updated = [...newPost.diaryEntries];
                                            updated[index].media = compressed;
                                            setNewPost({...newPost, diaryEntries: updated});
                                          }
                                          e.target.value = '';
                                        }} 
                                        style={{ display: 'none' }}
                                      />
                                    </label>
                                    <label className="btn btn-secondary btn-small file-input-label" title="Upload from files/gallery">
                                      <Upload size={14} />
                                      <span>Upload</span>
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const compressed = await compressImageFile(file);
                                          if (compressed) {
                                            const updated = [...newPost.diaryEntries];
                                            updated[index].media = compressed;
                                            setNewPost({...newPost, diaryEntries: updated});
                                          }
                                          e.target.value = '';
                                        }} 
                                        style={{ display: 'none' }}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-small"
                                      onClick={() => setCameraModalConfig({
                                        isOpen: true,
                                        target: `diaryEntry_${index}`,
                                        title: `Capture Day ${entry.dayNumber} Photo`
                                      })}
                                      title="Open live webcam viewfinder"
                                    >
                                      <Video size={13} />
                                      <span>Webcam</span>
                                    </button>
                                  </div>
                                  {entry.media && (
                                    <div className="order-photo-preview-card" style={{ marginTop: '0.4rem' }}>
                                      <img src={entry.media} alt={`Day ${entry.dayNumber} preview`} className="order-photo-preview-img" onError={handleImageError} />
                                      <div className="order-photo-preview-info">
                                        <span className="preview-label"><Check size={13} /> Day photo ready</span>
                                        <button 
                                          type="button" 
                                          className="btn-text btn-small remove-photo-btn"
                                          onClick={() => {
                                            const updated = [...newPost.diaryEntries];
                                            updated[index].media = '';
                                            setNewPost({...newPost, diaryEntries: updated});
                                          }}
                                        >
                                          <X size={13} />
                                          <span>Remove</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="form-group">
                              <label>Day Detail description</label>
                              <input 
                                type="text" 
                                placeholder="Detail what happened on this day of production..."
                                value={entry.caption}
                                onChange={(e) => {
                                  const updated = [...newPost.diaryEntries];
                                  updated[index].caption = e.target.value;
                                  setNewPost({...newPost, diaryEntries: updated});
                                }}
                                required
                              />
                            </div>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-small" 
                          onClick={handleAddDiaryDay}
                        >
                          + Add Next Production Day
                        </button>
                      </div>
                    )}

                    <button type="submit" className="btn btn-primary btn-large">Publish Craft Story</button>
                  </form>
                </div>
              )}
            </div>
          ))}

          {/* VIEW: ARTISAN PUBLIC PROFILE */}
          {view.name === 'artisan-profile' && (() => {
            const artisan = artisans.find(a => a.id === view.params);
            if (!artisan) return <div className="error-message">Artisan profile not found.</div>;
            
            const artisanProducts = products.filter(p => p.artisanId === artisan.id && p.status === 'active');
            const artisanPosts = posts.filter(p => p.artisanId === artisan.id);

            return (
              <div className="artisan-profile-view fade-in">
                {/* Profile Cover & Header Banner */}
                <div className="profile-cover-banner">
                  <img src={artisan.coverPhoto} alt="Artisan workspace cover" onError={handleImageError} />
                </div>

                <div className="profile-header-details">
                  <div className="header-meta-row">
                    <img src={artisan.profilePhoto} alt={artisan.displayName} className="profile-large-avatar" onError={handleImageError} />
                    <div className="header-text-block">
                      <div className="title-and-tier">
                        <h2>{artisan.displayName}</h2>
                        {artisan.verificationTier === 'heritage_keeper' && (
                          <span className="tier-badge-large heritage"><Award size={14} /> Heritage Keeper</span>
                        )}
                        {artisan.verificationTier === 'master' && (
                          <span className="tier-badge-large master"><Award size={14} /> Master Artisan</span>
                        )}
                        {artisan.verificationTier === 'verified' && (
                          <span className="tier-badge-large verified"><CheckCircle size={14} /> Verified Artisan</span>
                        )}
                      </div>
                      <span className="loc-text"><MapPin size={14} /> {artisan.location}</span>
                      <span className="exp-text">{artisan.yearsExperience} years honing this craft</span>
                    </div>

                    <div className="profile-follow-zone">
                      {(!currentUser || currentUser.role === 'customer') && (
                        <button 
                          className={`btn ${isFollowing(artisan.id) ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => handleFollow(artisan.id)}
                        >
                          {isFollowing(artisan.id) ? 'Following Artisan' : 'Follow Artisan'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="artisan-long-story">
                    <h3>The Artisan's Journey</h3>
                    <p className="journey-text">"{artisan.bio}"</p>
                  </div>
                </div>

                {/* Grid Split: Listings and Content */}
                <div className="artisan-catalog-layout">
                  <div className="catalog-tabs">
                    <h3>Craft Shop Catalog</h3>
                  </div>

                  <div className="artisan-product-grid">
                    {artisanProducts.map(p => (
                      <div 
                        key={p.id} 
                        className="product-card-item"
                        onClick={() => setView({ name: 'product-detail', params: p.id })}
                      >
                        <div className="prod-card-image-wrap">
                          <img src={p.images[0]} alt={p.title} onError={handleImageError} />
                        </div>
                        <div className="prod-card-meta">
                          <h4 className="prod-card-title">{p.title}</h4>
                          <span className="prod-card-price">₹{p.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="catalog-tabs posts-tab-head">
                    <h3>Studio Chronicles & Process</h3>
                  </div>

                  <div className="artisan-posts-grid">
                    {artisanPosts.map(post => (
                      <div 
                        key={post.id} 
                        className="profile-post-thumbnail"
                        onClick={() => setView({ name: 'feed', params: null })} // Redirect to feed to read
                      >
                        <img src={post.media[0]} alt="Process diary image" onError={handleImageError} />
                        <div className="post-thumbnail-overlay">
                          <p>{post.caption.substring(0, 60)}...</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </main>

      {/* Footer (Quiet Editorial Footer) */}
      <footer className="main-footer">
        <div className="container footer-inner">
          <div className="footer-copyright">
            <div className="footer-brand-lockup">
              <img src={t2tLogo} alt="T2T - Trash to Treasure" className="footer-logo-image" />
              <div>
                <h4>T2T</h4>
                <p>Trash to Treasure — Upcycled with Craft and Purpose.</p>
              </div>
            </div>
            <span>&copy; {new Date().getFullYear()} T2T (Trash to Treasure). All rights reserved.</span>
          </div>
          <div className="footer-links">
            <a href="#replay-intro" onClick={(e) => { e.preventDefault(); if (typeof window !== 'undefined' && window.__replayT2TSplash) { window.__replayT2TSplash(); } }}>Replay Intro 🎬</a>
            <a href="#about" onClick={(e) => { e.preventDefault(); alert("T2T (Trash to Treasure) connects patrons directly with regional artisans who transform discarded and reclaimed materials into handcrafted treasures with verified provenance."); }}>About T2T</a>
            <a href="#standards" onClick={(e) => { e.preventDefault(); alert("Our standards ensure fair compensation, authentic material upcycling, zero-waste practices, and fully traceable supply chains."); }}>Verification Standards</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
