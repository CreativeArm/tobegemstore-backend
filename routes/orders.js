const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, admin } = require("../middleware/auth");

// @route   POST /api/orders
router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const {
      items,
      shippingAddress,
      paymentMethod,
      pricing,
      couponCode,
      notes,
      isGift,
      giftMessage,
    } = req.body;

    if (!items || items.length === 0) {
      res.status(400);
      throw new Error("No order items");
    }

    // Verify stock
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) throw new Error(`Product ${item.product} not found`);
      if (product.stock < item.quantity)
        throw new Error(`Insufficient stock for ${product.name}`);
    }

    const order = await Order.create({
      user: req.user._id,
      items,
      shippingAddress,
      paymentMethod,
      pricing,
      couponCode,
      notes,
      isGift,
      giftMessage,
    });

    // Add initial tracking event
    order.trackingEvents.push({
      status: "pending",
      description: "Order placed successfully",
      location: "TobegemStore",
    });
    await order.save();

    // Reduce stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, totalSold: item.quantity },
      });
    }

    const populatedOrder = await Order.findById(order._id).populate(
      "user",
      "firstName lastName email",
    );
    res.status(201).json({ success: true, order: populatedOrder });
  }),
);

// @route   GET /api/orders/my-orders
router.get(
  "/my-orders",
  protect,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const query = { user: req.user._id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Order.countDocuments(query);

    res.json({ success: true, orders, total, pages: Math.ceil(total / limit) });
  }),
);

// @route   GET /api/orders/track/:orderNumber
router.get(
  "/track/:orderNumber",
  protect,
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({
      orderNumber: req.params.orderNumber,
      user: req.user._id,
    });

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    res.json({ success: true, order });
  }),
);

// @route   GET /api/orders/admin/stats (admin)
router.get(
  "/admin/stats",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const [orderTotals, statusTotals, recentOrders] = await Promise.all([
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $eq: ["$paymentStatus", "paid"] },
                  "$pricing.total",
                  0,
                ],
              },
            },
          },
        },
      ]),
      Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Order.find({})
        .populate("user", "firstName lastName email")
        .sort("-createdAt")
        .limit(5),
    ]);

    const totals = orderTotals[0] || { totalOrders: 0, totalRevenue: 0 };
    const statusMap = statusTotals.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.json({
      success: true,
      stats: {
        totalOrders: totals.totalOrders || 0,
        totalRevenue: totals.totalRevenue || 0,
        pending: statusMap.pending || 0,
        processing: statusMap.processing || 0,
        shipped: statusMap.shipped || 0,
        delivered: statusMap.delivered || 0,
      },
      recentOrders,
    });
  }),
);

// @route   GET /api/orders/:id
router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "firstName lastName email phone",
    );

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      res.status(403);
      throw new Error("Not authorized to view this order");
    }

    res.json({ success: true, order });
  }),
);

// @route   PUT /api/orders/:id/cancel
router.put(
  "/:id/cancel",
  protect,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (order.user.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Not authorized");
    }

    if (!["pending", "confirmed"].includes(order.status)) {
      res.status(400);
      throw new Error("Order cannot be cancelled at this stage");
    }

    order.addTrackingEvent("cancelled", "Order cancelled by customer");

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity, totalSold: -item.quantity },
      });
    }

    await order.save();
    res.json({ success: true, message: "Order cancelled successfully", order });
  }),
);

// Admin routes
// @route   GET /api/orders (admin)
router.get(
  "/",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, paymentStatus } = req.query;
    const query = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const orders = await Order.find(query)
      .populate("user", "firstName lastName email")
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Order.countDocuments(query);
    res.json({ success: true, orders, total });
  }),
);

// @route   PUT /api/orders/:id/status (admin)
router.put(
  "/:id/status",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { status, description, location, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    order.addTrackingEvent(status, description, location);
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (status === "delivered") order.deliveredAt = new Date();

    await order.save();
    res.json({ success: true, order });
  }),
);

// @route   PUT /api/orders/:id/confirm-payment  (admin)
router.put(
  "/:id/confirm-payment",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }
    order.paymentStatus = "paid";
    order.paymentDetails = { ...order.paymentDetails, paidAt: new Date() };
    order.addTrackingEvent("confirmed", "Payment confirmed by admin");
    await order.save();
    res.json({ success: true, order });
  }),
);

module.exports = router;
