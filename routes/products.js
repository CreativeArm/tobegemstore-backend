const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

// @route   GET /api/products
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 12, category, minPrice, maxPrice,
    sort = '-createdAt', search, featured, new: isNewArrival,
    bestseller, color, rating, inStock
  } = req.query;

  const query = { isActive: true };

  if (category) query.category = category;
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }
  if (search) query.$text = { $search: search };
  if (featured === 'true') query.isFeatured = true;
  if (isNewArrival === 'true') query.isNewArrival = true;
  if (bestseller === 'true') query.isBestseller = true;
  if (rating) query.rating = { $gte: Number(rating) };
  if (inStock === 'true') query.stock = { $gt: 0 };

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .select('-reviews');

  res.json({
    success: true,
    count: products.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    products
  });
}));

// @route   GET /api/products/featured
router.get('/featured', asyncHandler(async (req, res) => {
  const products = await Product.find({ isFeatured: true, isActive: true }).limit(8).select('-reviews');
  res.json({ success: true, products });
}));

// @route   GET /api/products/categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  res.json({ success: true, categories });
}));

// @route   GET /api/products/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('reviews.user', 'firstName lastName avatar');
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json({ success: true, product });
}));

// @route   GET /api/products/slug/:slug
router.get('/slug/:slug', asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json({ success: true, product });
}));

// @route   POST /api/products/:id/reviews
router.post('/:id/reviews', protect, asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user._id.toString());
  if (alreadyReviewed) {
    res.status(400);
    throw new Error('You have already reviewed this product');
  }

  product.reviews.push({
    user: req.user._id,
    name: req.user.fullName,
    rating: Number(rating),
    comment
  });

  product.updateRating();
  await product.save();

  res.status(201).json({ success: true, message: 'Review added successfully' });
}));

// Admin routes
// @route   POST /api/products (admin)
router.post('/', protect, admin, asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, product });
}));

// @route   PUT /api/products/:id (admin)
router.put('/:id', protect, admin, asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json({ success: true, product });
}));

// @route   DELETE /api/products/:id (admin)
router.delete('/:id', protect, admin, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  product.isActive = false;
  await product.save();
  res.json({ success: true, message: 'Product deactivated' });
}));

module.exports = router;
