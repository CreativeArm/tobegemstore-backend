const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");

// Cart is managed client-side for guests, server validates product details
// @route   POST /api/cart/validate
router.post(
  "/validate",
  asyncHandler(async (req, res) => {
    const { items } = req.body;
    const validatedItems = [];
    let hasErrors = false;

    for (const item of items) {
      const product = await Product.findById(item.productId).select(
        "name price stock images isActive comparePrice",
      );

      if (!product || !product.isActive) {
        validatedItems.push({
          ...item,
          error: "Product no longer available",
          valid: false,
        });
        hasErrors = true;
        continue;
      }

      if (product.stock < item.quantity) {
        validatedItems.push({
          ...item,
          maxQuantity: product.stock,
          error:
            product.stock === 0
              ? "Out of stock"
              : `Only ${product.stock} left in stock`,
          valid: false,
        });
        hasErrors = true;
        continue;
      }

      validatedItems.push({
        productId: item.productId,
        name: product.name,
        price: product.price,
        comparePrice: product.comparePrice,
        image: product.images[0]?.url || "",
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        stock: product.stock,
        valid: true,
      });
    }

    const subtotal = validatedItems
      .filter((i) => i.valid)
      .reduce((sum, i) => sum + i.price * i.quantity, 0);

    res.json({
      success: true,
      items: validatedItems,
      hasErrors,
      subtotal,
      shipping: subtotal > 50000 ? 0 : 2500, // Free shipping over ₦50,000
      total: subtotal + (subtotal > 50000 ? 0 : 2500),
    });
  }),
);

// @route   GET /api/cart/shipping-cost
router.get("/shipping-cost", (req, res) => {
  const { subtotal } = req.query;
  const shipping = Number(subtotal) > 50000 ? 0 : 2500;
  res.json({
    success: true,
    shipping,
    freeShippingThreshold: 50000,
    message:
      shipping === 0
        ? "Free shipping!"
        : `Add ₦${(50000 - Number(subtotal)).toLocaleString()} more for free shipping`,
  });
});

module.exports = router;
