import { connectToDatabase, jsonResponse } from './db.js';

const INITIAL_ARTISANS = [
  {
    id: "artisan_1",
    displayName: "Ananya Sen",
    bio: "I am a third-generation clay artist based in Kumartuli. My craft focuses on reviving ancient terracotta molding techniques, blending them with minimalist contemporary forms.",
    craftTypes: ["Pottery", "Ceramics"],
    location: "Kolkata, West Bengal",
    yearsExperience: 14,
    verificationTier: "master",
    profilePhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&q=80",
    coverPhoto: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&h=600&fit=crop&q=80",
    payoutDetails: "GPay / UPI: ananyasen@oksbi",
    joinedDate: "2024-02-15"
  },
  {
    id: "artisan_2",
    displayName: "Kabir Khan",
    bio: "Specializing in handloom wool and linen weaving, I work from a small cooperative workshop in the hills of Himachal.",
    craftTypes: ["Weaving", "Textiles"],
    location: "Kullu, Himachal Pradesh",
    yearsExperience: 22,
    verificationTier: "heritage_keeper",
    profilePhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80",
    coverPhoto: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&h=600&fit=crop&q=80",
    payoutDetails: "UPI: kabirweaver@okaxis",
    joinedDate: "2023-11-10"
  },
  {
    id: "artisan_3",
    displayName: "Meera Dev",
    bio: "Working with native timber and hand tools, I craft wooden bowls, utensils, and boxes that celebrate the natural grain of reclaimed teak and rosewood.",
    craftTypes: ["Woodwork", "Home Decor"],
    location: "Mysuru, Karnataka",
    yearsExperience: 8,
    verificationTier: "verified",
    profilePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&q=80",
    coverPhoto: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&h=600&fit=crop&q=80",
    payoutDetails: "UPI: meeracrafts@okicici",
    joinedDate: "2024-05-01"
  }
];

const INITIAL_PRODUCTS = [
  {
    id: "prod_1",
    artisanId: "artisan_1",
    title: "Ganges Clay Terracotta Pitcher",
    description: "A hand-thrown pitcher crafted from raw, unglazed riverbed clay. Perfect for serving cool water or holding dry botanicals.",
    price: 1850,
    stock: 5,
    category: "Pottery",
    materials: ["Ganges Silt Clay", "Natural Oxide Stains"],
    timeToCreate: "3 days (throwing, sun-drying, and 12-hour wood firing)",
    craftTechnique: "Wheel-thrown, pit-fired terracotta",
    images: [
      "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&h=600&fit=crop&q=80"
    ],
    isMadeToOrder: false,
    status: "active"
  },
  {
    id: "prod_2",
    artisanId: "artisan_1",
    title: "Minimalist Earth Ochre Bowl Set",
    description: "A pair of shallow ceramic bowls finished in a warm, textured iron ochre glaze. Double-fired to ensure durability.",
    price: 2400,
    stock: 3,
    category: "Pottery",
    materials: ["Stoneware Clay", "Local Ochre Glaze"],
    timeToCreate: "5 days including glaze testing",
    craftTechnique: "Hand-pinched and slab-formed stoneware",
    images: [
      "https://images.unsplash.com/photo-1535401991746-da3d9055713e?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&h=600&fit=crop&q=80"
    ],
    isMadeToOrder: false,
    status: "active"
  },
  {
    id: "prod_3",
    artisanId: "artisan_2",
    title: "Indigo Herringbone Linen Throw",
    description: "Woven in the traditional herringbone pattern, this versatile linen and merino wool throw is naturally dyed using local Himalayan wild indigo.",
    price: 4200,
    stock: 2,
    category: "Weaving",
    materials: ["Organic Linen Yarn", "Himalayan Merino Wool", "Natural Indigo dye"],
    timeToCreate: "14 hours on a manual 4-shaft countermarch loom",
    craftTechnique: "Handloom shuttle-weaving",
    images: [
      "https://images.unsplash.com/photo-1606744824163-985d376605aa?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&h=600&fit=crop&q=80"
    ],
    isMadeToOrder: true,
    status: "active"
  },
  {
    id: "prod_4",
    artisanId: "artisan_3",
    title: "Reclaimed Rosewood Live-Edge Tray",
    description: "Carved from solid slabs of reclaimed Southern Indian rosewood, this tray retains the raw, organic live edge on one side.",
    price: 3100,
    stock: 4,
    category: "Woodwork",
    materials: ["Reclaimed Rosewood", "Natural Beeswax", "Walnut Oil"],
    timeToCreate: "1.5 days of hand carving and fine sanding",
    craftTechnique: "Gouge-carving and hand-planing",
    images: [
      "https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&h=600&fit=crop&q=80"
    ],
    isMadeToOrder: false,
    status: "active"
  }
];

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true });
  }

  try {
    const { db } = await connectToDatabase();

    const productsCollection = db.collection('products');
    const artisansCollection = db.collection('artisans');

    const productsCount = await productsCollection.countDocuments();
    let seededProducts = 0;
    if (productsCount === 0) {
      const result = await productsCollection.insertMany(INITIAL_PRODUCTS);
      seededProducts = result.insertedCount;
    }

    const artisansCount = await artisansCollection.countDocuments();
    let seededArtisans = 0;
    if (artisansCount === 0) {
      const result = await artisansCollection.insertMany(INITIAL_ARTISANS);
      seededArtisans = result.insertedCount;
    }

    return jsonResponse(res, 200, {
      message: 'Database check and seed completed',
      existingProducts: productsCount,
      seededProducts,
      existingArtisans: artisansCount,
      seededArtisans
    });
  } catch (err) {
    console.error('Seed error:', err);
    return jsonResponse(res, 500, { error: err.message });
  }
}
