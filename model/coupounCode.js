const mongoose = require("mongoose");

const coupounCodeSchema = new mongoose.Schema({
    name:{
        type: String,
        required:[true,"Please enter your coupoun code name!"],
        unique: true,
    },
    value:{
        type: Number,
        required: true,
    },
    minAmount:{
        type: Number,
    },
    maxAmount:{
        type: Number,
    },
    shopId:{
     type: String,
     required: true,
    },
    selectedProduct:{
     type: String,
    },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    usageCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    discountType: { type: String, enum: ["FIXED", "PERCENTAGE"], default: "FIXED" },
    maxDiscount: { type: Number, default: null },
    category: { type: String, default: null },
    createdAt:{
        type: Date,
        default: Date.now(),
    }
});

module.exports = mongoose.model("CoupounCode", coupounCodeSchema);