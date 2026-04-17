const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Product name is required'], trim: true },
  slug: { type: String, unique: true, lowercase: true },  // unique: true already creates an index
  description: { type: String, required: [true, 'Description is required'] },
  shortDescription: { type: String, maxlength: 200 },
  price: { type: Number, required: [true, 'Price is required'], min: 0 },
  comparePrice: { type: Number, min: 0 },
  category: {
    type: String,
    required: true,
    enum: ['earrings', 'necklaces', 'bracelets', 'rings', 'wristwatches', 'lipgloss', 'anklets', 'brooches', 'hair-accessories', 'other']
  },
  subcategory: { type: String, trim: true },
  images: [{
    url: { type: String, required: true },
    publicId: { type: String },
    alt: { type: String }
  }],
  colors: [{ name: String, hex: String }],
  sizes: [String],
  material: { type: String },
  brand: { type: String, default: 'TobegemStore' },
  sku: { type: String, unique: true },
  stock: { type: Number, required: true, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  weight: { type: Number }, // in grams
  tags: [String],
  features: [String],
  isFeatured: { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: true },   // renamed from isNew (reserved by Mongoose)
  isBestseller: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  reviews: [reviewSchema],
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  totalSold: { type: Number, default: 0 },
  shippingInfo: {
    freeShipping: { type: Boolean, default: false },
    estimatedDays: { type: String, default: '3-7 business days' }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discount percentage
productSchema.virtual('discountPercent').get(function() {
  if (this.comparePrice && this.comparePrice > this.price) {
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
  }
  return 0;
});

// Virtual for in-stock status
productSchema.virtual('inStock').get(function() {
  return this.stock > 0;
});

// Virtual for low stock
productSchema.virtual('isLowStock').get(function() {
  return this.stock <= this.lowStockThreshold && this.stock > 0;
});

const CATEGORY_SKU_CODES = {
  earrings: 'EAR',
  necklaces: 'NEC',
  bracelets: 'BRA',
  rings: 'RIN',
  wristwatches: 'WAT',
  lipgloss: 'LIP',
  anklets: 'ANK',
  brooches: 'BRO',
  'hair-accessories': 'HAI',
  other: 'OTH'
};

// Generate slug before save
productSchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // Auto-generate SKU when it's not provided.
  if (!this.sku || !this.sku.trim()) {
    const prefix = CATEGORY_SKU_CODES[this.category] || 'PRD';
    let generatedSku = '';
    let isUnique = false;

    while (!isUnique) {
      const dateCode = Date.now().toString().slice(-6);
      const randomCode = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      generatedSku = `${prefix}-${dateCode}-${randomCode}`;
      // eslint-disable-next-line no-await-in-loop
      const existing = await mongoose.models.Product.exists({ sku: generatedSku });
      isUnique = !existing;
    }

    this.sku = generatedSku;
  }

  next();
});

// Update rating after review
productSchema.methods.updateRating = function() {
  if (this.reviews.length === 0) {
    this.rating = 0;
    this.numReviews = 0;
  } else {
    const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
    this.rating = Math.round((total / this.reviews.length) * 10) / 10;
    this.numReviews = this.reviews.length;
  }
};

// Compound index for filtering — slug index already exists via unique:true above, don't repeat it
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1, rating: -1 });

module.exports = mongoose.model('Product', productSchema);
