const jwt = require("jsonwebtoken");
const Shop = require("../../model/shop");
const UploadService = require("./UploadService");

/**
 * Shop service — vendor store persistence and business rules.
 * Extracted from legacy controller/shop.js (Phase 3).
 */
class ShopService {
  constructor({ uploadService = new UploadService() } = {}) {
    this.uploadService = uploadService;
  }

  _error(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  createActivationToken(seller) {
    return jwt.sign(seller, process.env.ACTIVATION_SECRET, {
      expiresIn: "10m",
    });
  }

  async existsByEmail(email) {
    return Shop.findOne({ email });
  }

  async findById(shopId) {
    return Shop.findById(shopId);
  }

  async findByEmail(email, { withPassword = false } = {}) {
    const query = Shop.findOne({ email });
    if (withPassword) {
      query.select("+password");
    }
    return query;
  }

  async registerPending(input = {}) {
    const {
      name,
      email,
      password,
      avatar,
      address,
      phoneNumber,
      zipCode,
      paymentInfo,
    } = input;

    if (!email || !password || !name) {
      throw this._error("Please provide all required registration fields");
    }

    const sellerEmail = await this.existsByEmail(email);
    if (sellerEmail) {
      throw this._error("User already exists");
    }

    const uploadedAvatar = await this.uploadService.uploadSingle(avatar, "avatars");

    const seller = {
      name,
      email,
      password,
      avatar: uploadedAvatar,
      address,
      phoneNumber,
      zipCode,
      paymentInfo,
    };

    const activationToken = this.createActivationToken(seller);

    return {
      seller,
      activationToken,
    };
  }

  async activateFromToken(activationToken) {
    let payload;
    try {
      payload = jwt.verify(activationToken, process.env.ACTIVATION_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw this._error("Activation token has expired");
      }
      throw this._error("Invalid token");
    }

    const {
      name,
      email,
      password,
      avatar,
      zipCode,
      address,
      phoneNumber,
      paymentInfo,
    } = payload;

    const existing = await this.existsByEmail(email);
    if (existing) {
      throw this._error("User already exists");
    }

    const seller = await Shop.create({
      name,
      email,
      avatar,
      password,
      zipCode,
      address,
      phoneNumber,
      paymentInfo,
    });

    return seller;
  }

  async login(email, password) {
    if (!email || !password) {
      throw this._error("Please provide the all fields!");
    }

    const user = await this.findByEmail(email, { withPassword: true });
    if (!user) {
      throw this._error("User doesn't exists!");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw this._error("Please provide the correct information");
    }

    return user;
  }

  async getProfile(shopId) {
    const seller = await this.findById(shopId);
    if (!seller) {
      throw this._error("User doesn't exists");
    }
    return seller;
  }

  async getPublicInfo(shopId) {
    const shop = await this.findById(shopId);
    if (!shop) {
      throw this._error("Shop not found", 404);
    }
    return shop;
  }

  async updateProfile(shopId, fields = {}) {
    const shop = await this.findById(shopId);
    if (!shop) {
      throw this._error("User not found");
    }

    const { name, description, address, phoneNumber, zipCode } = fields;
    if (name !== undefined) shop.name = name;
    if (description !== undefined) shop.description = description;
    if (address !== undefined) shop.address = address;
    if (phoneNumber !== undefined) shop.phoneNumber = phoneNumber;
    if (zipCode !== undefined) shop.zipCode = zipCode;

    await shop.save();
    return shop;
  }

  async updateAvatar(shopId, avatarData) {
    const seller = await this.findById(shopId);
    if (!seller) {
      throw this._error("Seller not found");
    }

    if (seller.avatar?.public_id) {
      await this.uploadService.destroyPublicId(seller.avatar.public_id);
    }

    seller.avatar = await this.uploadService.uploadSingle(avatarData, "avatars", {
      width: 150,
    });

    await seller.save();
    return seller;
  }

  async listAll() {
    return Shop.find().sort({ createdAt: -1 });
  }

  async deleteById(shopId) {
    const seller = await this.findById(shopId);
    if (!seller) {
      throw this._error("Seller is not available with this id");
    }

    await Shop.findByIdAndDelete(shopId);
    return { deleted: true, id: shopId };
  }

  async setVerified(shopId, verified) {
    const shop = await this.findById(shopId);
    if (!shop) {
      throw this._error("Shop not found");
    }

    shop.isVerified = Boolean(verified);
    await shop.save();
    return shop;
  }

  async updateWithdrawMethod(shopId, withdrawMethod) {
    const seller = await Shop.findByIdAndUpdate(
      shopId,
      { withdrawMethod },
      { new: true }
    );

    if (!seller) {
      throw this._error("Seller not found");
    }

    return seller;
  }

  async clearWithdrawMethod(shopId) {
    const seller = await this.findById(shopId);
    if (!seller) {
      throw this._error("Seller not found with this id");
    }

    seller.withdrawMethod = null;
    await seller.save();
    return seller;
  }
}

module.exports = ShopService;
