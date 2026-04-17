const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const { protect, admin } = require("../middleware/auth");

// @route   PUT /api/users/profile
router.put(
  "/profile",
  protect,
  asyncHandler(async (req, res) => {
    const { firstName, lastName, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      user.phone = phone || user.phone;
      if (avatar) user.avatar = avatar;
      await user.save();
      res.json({ success: true, message: "Profile updated", user });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  }),
);

// @route   POST /api/users/addresses
router.post(
  "/addresses",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    user.addresses.push(req.body);
    if (user.addresses.length === 1) {
      user.defaultAddress = user.addresses[0]._id;
    }
    await user.save();
    res.status(201).json({ success: true, addresses: user.addresses });
  }),
);

// @route   PUT /api/users/addresses/:addressId
router.put(
  "/addresses/:addressId",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      res.status(404);
      throw new Error("Address not found");
    }
    Object.assign(address, req.body);
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  }),
);

// @route   DELETE /api/users/addresses/:addressId
router.delete(
  "/addresses/:addressId",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    user.addresses.pull(req.params.addressId);
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  }),
);

// @route   PUT /api/users/wishlist/:productId
router.put(
  "/wishlist/:productId",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const productId = req.params.productId;
    const isInWishlist = user.wishlist.includes(productId);

    if (isInWishlist) {
      user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
    } else {
      user.wishlist.push(productId);
    }

    await user.save();
    res.json({
      success: true,
      wishlist: user.wishlist,
      action: isInWishlist ? "removed" : "added",
    });
  }),
);

// @route   GET /api/users/wishlist
router.get(
  "/wishlist",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate("wishlist");
    res.json({ success: true, wishlist: user.wishlist });
  }),
);

// @route   GET /api/users/all  (admin)
router.get(
  "/all",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const users = await User.find().select("-password").sort("-createdAt");
    res.json({ success: true, users, total: users.length });
  }),
);

// @route   PUT /api/users/:id/toggle-active  (admin)
router.put(
  "/:id/toggle-active",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, user });
  }),
);

module.exports = router;
