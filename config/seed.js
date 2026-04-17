const mongoose = require("mongoose");
const Product = require("../models/Product");
const User = require("../models/User");
require("dotenv").config();

mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/tobegemstore",
);

const sampleProducts = [
  {
    name: "Gold Hoop Earrings Set",
    shortDescription:
      "Elegant 18k gold-plated hoop earrings, perfect for any occasion",
    description:
      "Our signature Gold Hoop Earrings are crafted with premium 18k gold plating over sterling silver. Available in 3 sizes, these hoops add the perfect touch of elegance to any outfit. Hypoallergenic and tarnish-resistant.",
    price: 8500,
    comparePrice: 12000,
    category: "earrings",
    images: [
      {
        url: "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=600",
        alt: "Gold Hoop Earrings",
      },
    ],
    stock: 45,
    isFeatured: true,
    isNewArrival: true,
    tags: ["gold", "hoops", "earrings", "classic"],
    material: "18k Gold Plated Sterling Silver",
    sku: "EAR-GH-001",
    rating: 4.8,
    numReviews: 124,
  },
  {
    name: "Crystal Drop Earrings",
    shortDescription: "Sparkling Swarovski crystal drops for special occasions",
    description:
      "These stunning Crystal Drop Earrings feature genuine Swarovski crystals set in rhodium-plated brass. The elegant drop design catches light beautifully, making them perfect for weddings and formal events.",
    price: 15500,
    comparePrice: 22000,
    category: "earrings",
    images: [
      {
        url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600",
        alt: "Crystal Earrings",
      },
    ],
    stock: 28,
    isFeatured: true,
    isBestseller: true,
    tags: ["crystal", "drop", "formal", "wedding"],
    material: "Rhodium-Plated Brass, Swarovski Crystals",
    sku: "EAR-CD-002",
    rating: 4.9,
    numReviews: 89,
  },
  {
    name: "Pearl Strand Necklace",
    shortDescription: "Lustrous freshwater pearl necklace, 18-inch strand",
    description:
      "A timeless classic — our Pearl Strand Necklace features genuine freshwater pearls hand-selected for their luster and uniformity. The sterling silver clasp ensures security while adding a touch of elegance.",
    price: 35000,
    comparePrice: 50000,
    category: "necklaces",
    images: [
      {
        url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600",
        alt: "Pearl Necklace",
      },
    ],
    stock: 15,
    isFeatured: true,
    isBestseller: true,
    tags: ["pearl", "necklace", "classic", "luxury"],
    material: "Freshwater Pearls, Sterling Silver",
    sku: "NEC-PS-001",
    rating: 5.0,
    numReviews: 67,
  },
  {
    name: "Gold Chain Necklace",
    shortDescription: "Delicate 14k gold-filled chain necklace",
    description:
      "This delicate Gold Chain Necklace is crafted from 14k gold-filled wire, offering the luxury look of solid gold at a fraction of the price. Adjustable length from 16-18 inches.",
    price: 18000,
    category: "necklaces",
    images: [
      {
        url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600",
        alt: "Gold Chain Necklace",
      },
    ],
    stock: 32,
    isNewArrival: true,
    tags: ["gold", "chain", "minimal", "everyday"],
    material: "14k Gold-Filled",
    sku: "NEC-GC-002",
    rating: 4.7,
    numReviews: 45,
  },
  {
    name: "Rose Gold Bracelet Set",
    shortDescription: "3-piece rose gold stackable bracelet set",
    description:
      "This beautiful 3-piece stackable bracelet set in rose gold features different textures — a plain band, twisted wire, and bead detail — that work together or separately.",
    price: 12500,
    comparePrice: 18000,
    category: "bracelets",
    images: [
      {
        url: "https://images.unsplash.com/photo-1573408301185-9519f94816fe?w=600",
        alt: "Rose Gold Bracelets",
      },
    ],
    stock: 50,
    isFeatured: true,
    isBestseller: true,
    tags: ["rose gold", "bracelet", "stackable", "set"],
    material: "Rose Gold Plated Brass",
    sku: "BRA-RG-001",
    rating: 4.6,
    numReviews: 112,
  },
  {
    name: "Luxury Women's Wristwatch",
    shortDescription: "Elegant quartz watch with rose gold case and mesh band",
    description:
      "A statement timepiece that combines functionality with fashion. Features a Japanese quartz movement, rose gold stainless steel case, and elegant mesh band. Water resistant to 30m.",
    price: 85000,
    comparePrice: 120000,
    category: "wristwatches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
        alt: "Luxury Wristwatch",
      },
    ],
    stock: 12,
    isFeatured: true,
    tags: ["watch", "luxury", "rose gold", "quartz"],
    material: "Stainless Steel, Mineral Crystal",
    sku: "WAT-LW-001",
    rating: 4.8,
    numReviews: 34,
  },
  {
    name: "Lip Gloss Collection - 6 Pack",
    shortDescription: "High-shine, long-lasting lip gloss in 6 gorgeous shades",
    description:
      "Our bestselling Lip Gloss Collection comes in 6 beautiful shades from nude to berry. Enriched with vitamin E and argan oil for hydration. Non-sticky formula that lasts 8+ hours.",
    price: 9500,
    comparePrice: 14000,
    category: "lipgloss",
    images: [
      {
        url: "https://images.unsplash.com/photo-1631214524020-3c69b6b7f4dc?w=600",
        alt: "Lip Gloss",
      },
    ],
    stock: 75,
    isFeatured: true,
    isBestseller: true,
    isNewArrival: true,
    tags: ["lipgloss", "makeup", "beauty", "collection"],
    sku: "LIP-CL-001",
    rating: 4.9,
    numReviews: 203,
  },
  {
    name: "Diamond Ring Sterling Silver",
    shortDescription: "CZ diamond solitaire ring in sterling silver",
    description:
      "Our elegant Diamond Ring features a brilliant-cut cubic zirconia stone set in polished sterling silver. Available in sizes 5-10. The perfect gift for someone special.",
    price: 22000,
    comparePrice: 30000,
    category: "rings",
    images: [
      {
        url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600",
        alt: "Diamond Ring",
      },
    ],
    sizes: ["5", "6", "7", "8", "9", "10"],
    stock: 38,
    isFeatured: true,
    tags: ["ring", "diamond", "silver", "solitaire"],
    material: "Sterling Silver, CZ Diamond",
    sku: "RIN-DR-001",
    rating: 4.7,
    numReviews: 91,
  },
  {
    name: "Beaded Anklet Set",
    shortDescription: "Bohemian beaded anklets with shell charms",
    description:
      "Embrace beach vibes with our Beaded Anklet Set. Comes with 3 anklets featuring colorful beads and natural shell charms. Adjustable fit for all ankle sizes.",
    price: 5500,
    category: "anklets",
    images: [
      {
        url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600",
        alt: "Beaded Anklets",
      },
    ],
    stock: 60,
    isNewArrival: true,
    tags: ["anklet", "beaded", "bohemian", "beach"],
    material: "Natural Beads, Shell, Cotton Thread",
    sku: "ANK-BA-001",
    rating: 4.5,
    numReviews: 78,
  },
  {
    name: "Statement Collar Necklace",
    shortDescription: "Bold statement collar with geometric gold design",
    description:
      "Make a bold fashion statement with this geometric collar necklace. Hand-crafted with precision, this piece features interlocking hexagonal shapes in 18k gold plating.",
    price: 28000,
    comparePrice: 38000,
    category: "necklaces",
    images: [
      {
        url: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600",
        alt: "Statement Necklace",
      },
    ],
    stock: 20,
    isFeatured: true,
    tags: ["statement", "collar", "geometric", "bold"],
    material: "18k Gold Plated Brass",
    sku: "NEC-SC-003",
    rating: 4.8,
    numReviews: 56,
  },
  {
    name: "Hair Pin Set - Vintage Gold",
    shortDescription:
      "Set of 6 vintage-style gold hair pins with pearl accents",
    description:
      "Add vintage charm to your hairstyle with these elegant hair pins. Set of 6 includes 3 styles — flowers, leaves, and geometric — all in vintage gold with pearl accents.",
    price: 7200,
    comparePrice: 10000,
    category: "hair-accessories",
    images: [
      {
        url: "https://images.unsplash.com/photo-1596944924591-0b9e1c15fd11?w=600",
        alt: "Hair Pins",
      },
    ],
    stock: 44,
    isNewArrival: true,
    tags: ["hair", "pins", "vintage", "pearl"],
    material: "Zinc Alloy, Faux Pearl",
    sku: "HAI-HP-001",
    rating: 4.6,
    numReviews: 88,
  },
  {
    name: "Minimalist Silver Stud Earrings",
    shortDescription: "Simple geometric silver studs for everyday elegance",
    description:
      "Perfect for everyday wear, these minimalist silver studs come in a set of 3 pairs — circle, square, and triangle. Made from hypoallergenic surgical steel.",
    price: 4500,
    category: "earrings",
    images: [
      {
        url: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600",
        alt: "Silver Studs",
      },
    ],
    stock: 80,
    isBestseller: true,
    tags: ["studs", "silver", "minimal", "everyday"],
    material: "Surgical Steel",
    sku: "EAR-SS-003",
    rating: 4.7,
    numReviews: 155,
  },
];

const seedDatabase = async () => {
  try {
    console.log("🌱 Seeding database...");

    // Clear existing data
    await Product.deleteMany({});
    await User.deleteMany({});

    // Drop the slug index to avoid null conflicts, then recreate
    try {
      await mongoose.connection.collection("products").dropIndex("slug_1");
      console.log("🗑️  Dropped old slug index");
    } catch (e) {
      // Index might not exist yet, that's fine
    }

    // Create admin user
    const admin = await User.create({
      firstName: "Tobegem",
      lastName: "Admin",
      email: "admin@tobegemstore.com",
      password: "Admin@123456",
      role: "admin",
      isEmailVerified: true,
      isActive: true,
    });
    console.log(`✅ Admin created: ${admin.email}`);

    // Generate slug for each product and save individually
    // so the pre('save') hook runs and sets the slug properly
    let count = 0;
    for (const productData of sampleProducts) {
      const product = new Product(productData);
      await product.save();
      count++;
    }
    console.log(`✅ ${count} products seeded`);

    console.log("🎉 Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
};

seedDatabase();
