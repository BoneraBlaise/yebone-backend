const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { hashPasswordIfNeeded } = require("../utils/hashPasswordIfNeeded");

const userSchema = new mongoose.Schema({
  name:{
    type: String,
    required: [true, "Please enter your name!"],
  },
  email:{
    type: String,
    required: [true, "Please enter your email!"],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password:{
    type: String,
    required: [true, "Please enter your password"],
    minLength: [4, "Password should be greater than 4 characters"],
    select: false,
  },
  phoneNumber:{
    type: Number,
  },
  addresses:[
    {
      country: {
        type: String,
      },
      city:{
        type: String,
      },
      address1:{
        type: String,
      },
      address2:{
        type: String,
      },
      zipCode:{
        type: Number,
      },
      addressType:{
        type: String,
      },
    }
  ],
  role:{
    type: String,
    default: "user",
  },
  avatar:{
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
 },
 createdAt:{
  type: Date,
  default: Date.now(),
 },
 resetPasswordToken: String,
 resetPasswordTime: Date,
 passwordResetOtpHash: {
   type: String,
   select: false,
 },
 passwordResetOtpExpires: Date,
 passwordResetOtpAttempts: {
   type: Number,
   default: 0,
 },
 passwordResetSessionTokenId: {
   type: String,
   select: false,
 },
 passwordResetRequestWindowStart: Date,
 passwordResetRequestCount: {
   type: Number,
   default: 0,
 },
 googleId: {
   type: String,
   unique: true,
   sparse: true
 },
 authProvider: {
   type: String,
   enum: ['local', 'google'],
   default: 'local'
 },
 isCommissioner: {
   type: Boolean,
   default: false
 },
 commissionProgramId: {
   type: mongoose.Schema.Types.ObjectId,
   ref: "Commission"
 },
});


// Hash password only when the password field was explicitly modified.
userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) {
      return next();
    }
    this.password = await hashPasswordIfNeeded(this.password);
    return next();
  } catch (err) {
    return next(err);
  }
});

// jwt token
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id}, process.env.JWT_SECRET_KEY,{
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
