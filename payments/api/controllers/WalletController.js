const BaseApiController = require("./BaseApiController");
const { WalletCreditRequest, WalletDebitRequest } = require("../dto");
const { WalletCreditValidator, WalletDebitValidator } = require("../validators");
const { WalletResponseMapper } = require("../responses");

class WalletController extends BaseApiController {
  constructor(facade) {
    super(facade);
  }

  credit(req, res, next) {
    return this._handle(req, res, next, {
      dtoFactory: WalletCreditRequest.from,
      validator: WalletCreditValidator,
      facadeMethod: "wallet",
      responseMapper: WalletResponseMapper.map,
      action: "credit",
    });
  }

  debit(req, res, next) {
    return this._handle(req, res, next, {
      dtoFactory: WalletDebitRequest.from,
      validator: WalletDebitValidator,
      facadeMethod: "wallet",
      responseMapper: WalletResponseMapper.map,
      action: "debit",
    });
  }
}

module.exports = WalletController;
