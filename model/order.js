const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    cart:{
        type: Array,
        required: true,
        validate: {
            validator: function(cart) {
                return cart.every(item => {
                    const price = item.price || item.discountPrice || item.originalPrice;
                    return price && item.qty && item.shopId;
                });
            },
            message: 'Each cart item must have a price, quantity, and shop ID'
        }
    },
    shippingAddress:{
        type: Object,
        required: true,
    },
    user:{
        type: Object,
        required: true,
    },
    totalPrice:{
        type: Number,
        required: true,
    },
    shipping: {
        type: Number,
        default: 0,
    },
    subTotalPrice: {
        type: Number,
        default: function() {
            return this.totalPrice - (this.shipping || 0);
        }
    },
    status:{
        type: String,
        default: "Processing",
    },
    paymentInfo:{
        type: Object,
        required: true,
    },
    orderType: {
        type: String,
        enum: ['regular', 'won_bid'],
        default: 'regular',
        required: true,
    },
    paidAt:{
        type: Date,
        default: Date.now(),
    },
    deliveredAt: {
        type: Date,
    },
    createdAt:{
        type: Date,
        default: Date.now(),
    },
    referralCode: {
        type: String,
        default: null
    },
});

module.exports = mongoose.model("Order", orderSchema);