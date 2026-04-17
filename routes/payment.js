const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const https = require("https");
const Order = require("../models/Order");
const { protect } = require("../middleware/auth");

// Bank Transfer Details
const BANK_DETAILS = {
  accountName: "Tobegems",
  accountNumber: "4180105770",
  bankName: "Ecobank Nigeria",
  sortCode: "050150256",
};

// @route   GET /api/payment/bank-details
router.get("/bank-details", (req, res) => {
  res.json({ success: true, bankDetails: BANK_DETAILS });
});

// @route   POST /api/payment/paystack/initialize
router.post(
  "/paystack/initialize",
  protect,
  asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order || order.user.toString() !== req.user._id.toString()) {
      res.status(404);
      throw new Error("Order not found");
    }

    const params = JSON.stringify({
      email: req.user.email,
      amount: Math.round(order.pricing.total * 100), // kobo
      currency: "NGN",
      reference: order.orderNumber,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerName: `${req.user.firstName} ${req.user.lastName}`,
      },
      callback_url: `${process.env.FRONTEND_URL}/order-confirmation/${order._id}`,
    });

    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: "/transaction/initialize",
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const paystackReq = https.request(options, (paystackRes) => {
      let data = "";
      paystackRes.on("data", (chunk) => (data += chunk));
      paystackRes.on("end", () => {
        let response;
        try {
          response = JSON.parse(data);
        } catch {
          return res.status(502).json({
            success: false,
            message: "Invalid response from payment provider",
          });
        }
        if (response.status) {
          // Spread Paystack fields (authorization_url, access_code, reference) so clients can use body.authorization_url
          res.json({ success: true, ...response.data });
        } else {
          res.status(400).json({
            success: false,
            message: response.message || "Paystack initialization failed",
          });
        }
      });
    });

    paystackReq.on("error", (err) => {
      res
        .status(500)
        .json({ success: false, message: "Payment initialization failed" });
    });

    paystackReq.write(params);
    paystackReq.end();
  }),
);

// @route   POST /api/payment/paystack/verify
router.post(
  "/paystack/verify",
  protect,
  asyncHandler(async (req, res) => {
    const { reference } = req.body;

    const encodedRef = encodeURIComponent(String(reference));

    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: `/transaction/verify/${encodedRef}`,
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    };

    const paystackReq = https.request(options, (paystackRes) => {
      let data = "";
      paystackRes.on("data", (chunk) => (data += chunk));
      paystackRes.on("end", async () => {
        let response;
        try {
          response = JSON.parse(data);
        } catch {
          return res.status(502).json({
            success: false,
            message: "Invalid response from payment provider",
          });
        }
        if (response.status && response.data.status === "success") {
          const order = await Order.findOne({ orderNumber: reference });
          if (order) {
            order.paymentStatus = "paid";
            order.paymentDetails = {
              transactionId: response.data.id.toString(),
              reference: response.data.reference,
              paidAt: new Date(),
              gatewayResponse: response.data.gateway_response,
            };
            order.addTrackingEvent(
              "confirmed",
              "Payment received via Paystack",
            );
            await order.save();
          }
          res.json({ success: true, message: "Payment verified", order });
        } else {
          res
            .status(400)
            .json({ success: false, message: "Payment verification failed" });
        }
      });
    });

    paystackReq.on("error", () => {
      res.status(500).json({ success: false, message: "Verification error" });
    });

    paystackReq.end();
  }),
);

// @route   POST /api/payment/bank-transfer/confirm
router.post(
  "/bank-transfer/confirm",
  protect,
  asyncHandler(async (req, res) => {
    const { orderId, proofOfPayment } = req.body;
    const order = await Order.findById(orderId);

    if (!order || order.user.toString() !== req.user._id.toString()) {
      res.status(404);
      throw new Error("Order not found");
    }

    order.bankTransferDetails = {
      ...BANK_DETAILS,
      proofOfPayment,
    };
    order.paymentStatus = "pending"; // Admin will confirm
    order.addTrackingEvent(
      "confirmed",
      "Bank transfer submitted, awaiting confirmation",
    );
    await order.save();

    res.json({
      success: true,
      message:
        "Bank transfer details submitted. We will confirm within 24 hours.",
      order,
    });
  }),
);

// @route   POST /api/payment/paypal/create-order
router.post(
  "/paypal/create-order",
  protect,
  asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    // PayPal order creation - simplified response for frontend to handle with PayPal SDK
    res.json({
      success: true,
      amount: order.pricing.total,
      currency: "USD",
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  }),
);

// @route   POST /api/payment/paypal/verify
router.post(
  "/paypal/verify",
  protect,
  asyncHandler(async (req, res) => {
    const { orderId, paypalOrderId, paypalDetails } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    order.paymentStatus = "paid";
    order.paymentDetails = {
      transactionId: paypalOrderId,
      reference: paypalDetails.id,
      paidAt: new Date(),
      gatewayResponse: "COMPLETED",
    };
    order.addTrackingEvent("confirmed", "Payment received via PayPal");
    await order.save();

    res.json({ success: true, message: "PayPal payment confirmed", order });
  }),
);

module.exports = router;
