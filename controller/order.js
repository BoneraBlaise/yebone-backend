const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const Order = require("../model/order");
const Shop = require("../model/shop");
const Product = require("../model/product");
const Commission = require("../model/commission");
const calculateCommissionRate = require("../utils/calculateCommission");
const { processOrderCommission, updateCommissionStatus } = require("../utils/referralUtils");


// create new order
router.post(
  "/create-order",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { 
        cart, 
        wonBid, 
        shippingAddress, 
        user, 
        totalPrice, 
        paymentInfo, 
        shipping = 0, 
        subTotalPrice,
        referralCode 
      } = req.body;

      if (!shippingAddress || !user) {
        return next(new ErrorHandler("Missing required fields: shippingAddress or user", 400));
      }

      if (!paymentInfo) {
        return next(new ErrorHandler("Payment information is required", 400));
      }

      const calculatedSubTotal = subTotalPrice || totalPrice - shipping;
      const orders = [];

      // HANDLE WON BID ORDER
      if (wonBid) {
        const order = await Order.create({
          cart: [{
            ...wonBid,
            shopId: wonBid.sellerId,
            shop: wonBid.sellerId,
            price: wonBid.price,
            qty: 1
          }],
          shippingAddress,
          user,
          totalPrice: wonBid.price + shipping,
          subTotalPrice: wonBid.price,
          shipping,
          paymentInfo: {
            ...paymentInfo,
            status: "Pending"
          },
          orderType: "won_bid",
          referralCode
        });

        if (referralCode) {
          await processOrderCommission(order, referralCode);
        }

        return res.status(201).json({ success: true, orders: [order] });
      }

      // HANDLE REGULAR MULTI-SHOP CART ORDER
      if (!Array.isArray(cart) || cart.length === 0) {
        return next(new ErrorHandler("Cart must be a non-empty array", 400));
      }

      const shopItemsMap = new Map();

      for (const item of cart) {
        const itemPrice = item.discountPrice || item.originalPrice;
        if (!item.shopId || !itemPrice || !item.qty) continue;

        const normalizedItem = {
          ...item,
          price: Number(itemPrice),
          qty: Number(item.qty)
        };

        if (!shopItemsMap.has(item.shopId)) {
          shopItemsMap.set(item.shopId, []);
        }

        shopItemsMap.get(item.shopId).push(normalizedItem);
      }

      for (const [shopId, items] of shopItemsMap) {
        const shopTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

        const order = await Order.create({
          cart: items.map(item => ({
            ...item,
            total: item.price * item.qty
          })),
          shippingAddress,
          user,
          totalPrice: shopTotal + shipping,
          shipping,
          subTotalPrice: shopTotal,
          paymentInfo: {
            ...paymentInfo,
            status: "Pending"
          },
          orderType: "regular",
          referralCode
        });

        if (referralCode) {
          await processOrderCommission(order, referralCode);
        }

        orders.push(order);
      }

      if (orders.length === 0) {
        return next(new ErrorHandler("Failed to create any orders", 500));
      }

      res.status(201).json({
        success: true,
        orders
      });
    } catch (error) {
      console.error("Order creation error:", error);
      return next(new ErrorHandler(error.message || "Internal server error", 500));
    }
  })
);

module.exports = router;


// get all orders of user
router.get(
  "/get-all-orders/:userId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find({ "user._id": req.params.userId }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get all orders of seller
router.get(
  "/get-seller-all-orders/:shopId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find({
        "cart.shopId": req.params.shopId,
      }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update order status for seller
router.put(
  "/update-order-status/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }
      if (req.body.status === "Transferred to delivery partner") {
        order.cart.forEach(async (o) => {
          await updateOrder(o._id, o.qty);
        });
      }

      order.status = req.body.status;

      if (req.body.status === "Delivered") {
        order.deliveredAt = Date.now();
        order.paymentInfo.status = "Succeeded";
        
        // Calculate service charge and commission
        const serviceCharge = order.totalPrice * 0.10;
        
        // If order has referral code, update commission status
        if (order.referralCode) {
          const commission = await Commission.findOne({ referralCode: order.referralCode });
          if (commission) {
            let orderCommission = 0;
            
            // Update each sale status and shop stats
            for (const sale of commission.sales) {
              if (sale.order.toString() === order._id.toString()) {
                sale.status = "paid";
                orderCommission += sale.commission;
                
                // Update shop stats for this sale
                await commission.updateShopStats(sale.shop, sale.commission, 'paid');
              }
            }
            
            // Update user's commission balance
            commission.balance.pending -= orderCommission;
            commission.balance.available += orderCommission;
            
            await commission.save();
          }
        }

        await updateSellerInfo(order.totalPrice - serviceCharge);

        if (order.referralCode && req.body.status === "Delivered") {
          await updateCommissionStatus(order._id, order.referralCode, 'paid');
        }
      }

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
      });

      async function updateOrder(id, qty) {
        const product = await Product.findById(id);

        product.stock -= qty;
        product.sold_out += qty;

        await product.save({ validateBeforeSave: false });
      }

      async function updateSellerInfo(amount) {
        const seller = await Shop.findById(req.seller.id);
        
        seller.availableBalance = amount;

        await seller.save();
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// give a refund ----- user
router.put(
  "/order-refund/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      order.status = req.body.status;

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
        message: "Order Refund Request successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// accept the refund ---- seller
router.put(
  "/order-refund-success/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      order.status = req.body.status;

      await order.save();

      res.status(200).json({
        success: true,
        message: "Order Refund successfull!",
      });

      if (req.body.status === "Refund Success") {
        order.cart.forEach(async (o) => {
          await updateOrder(o._id, o.qty);
        });
      }

      async function updateOrder(id, qty) {
        const product = await Product.findById(id);

        product.stock += qty;
        product.sold_out -= qty;

        await product.save({ validateBeforeSave: false });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all orders --- for admin
router.get(
  "/admin-all-orders",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find().sort({
        deliveredAt: -1,
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
