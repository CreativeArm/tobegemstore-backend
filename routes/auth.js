const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"TobegemStore" <${process.env.EMAIL_FROM}>`,
    to, subject, html
  });
};

const getFrontendUrl = () =>
  (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

// @route   POST /api/auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body;

  if (!firstName || !lastName || !email || !password) {
    res.status(400);
    throw new Error('Please fill all required fields');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('Email already registered');
  }

  const user = await User.create({ firstName, lastName, email, password, phone });
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Registration successful! Welcome to TobegemStore.',
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    }
  });
}));

// @route   POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      phone: user.phone
    }
  });
}));

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('No account found with that email');
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${getFrontendUrl()}/reset-password/${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a0a2e, #6b21a8); padding: 30px; text-align: center;">
        <h1 style="color: #f0c060; margin: 0;">TobegemStore</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2>Reset Your Password</h2>
        <p>Hi ${user.firstName},</p>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #6b21a8; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; margin: 20px 0;">Reset Password</a>
        <p style="color: #666; font-size: 14px;">This link expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    </div>
  `;

  try {
    await sendEmail(user.email, 'TobegemStore - Password Reset', html);
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500);
    throw new Error('Email could not be sent');
  }
}));

// @route   PUT /api/auth/reset-password/:token
router.put('/reset-password/:token', asyncHandler(async (req, res) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  const token = generateToken(user._id);
  res.json({ success: true, message: 'Password reset successful', token });
}));

// @route   PUT /api/auth/change-password
router.put('/change-password', protect, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.matchPassword(currentPassword))) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
}));

// @route   GET /api/auth/me
router.get('/me', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
}));

module.exports = router;
