const Shop = require("../../model/shop");

class ShopService {
  async findById(shopId) {
    return Shop.findById(shopId);
  }
}

module.exports = ShopService;
