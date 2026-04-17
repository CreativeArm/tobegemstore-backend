const mongoose = require('mongoose');
const { randomUUID } = require('crypto'); // Node built-in, no package needed

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  color: String,
  size: String
});

const trackingEventSchema = new mongoose.Schema({
  status: { type: String, required: true },
  description: { type: String, required: true },
  location: String,
  timestamp: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  shippingAddress: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    zipCode: String
  },
  pricing: {
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  couponCode: String,
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'paystack', 'paypal'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: String,
    reference: String,
    paidAt: Date,
    gatewayResponse: String
  },
  bankTransferDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    proofOfPayment: String,
    confirmedAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  trackingNumber: String,
  trackingEvents: [trackingEventSchema],
  estimatedDelivery: Date,
  deliveredAt: Date,
  notes: String,
  isGift: { type: Boolean, default: false },
  giftMessage: String
}, { timestamps: true });

// Generate order number before save
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `TBG-${timestamp}-${random}`;
  }
  next();
});

// Add tracking event
orderSchema.methods.addTrackingEvent = function(status, description, location = '') {
  this.trackingEvents.push({ status, description, location });
  this.status = status;
};

module.exports = mongoose.model('Order', orderSchema);
