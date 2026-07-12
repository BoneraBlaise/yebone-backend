const BaseApiController = require("./BaseApiController");
const { CheckoutRequest } = require("../dto");
const { CheckoutRequestValidator } = require("../validators");
const { CheckoutResponseMapper } = require("../responses");

class CheckoutController extends BaseApiController {
  constructor(facade) {
    super(facade);
  }

  checkout(req, res, next) {
    return this._handle(req, res, next, {
      dtoFactory: CheckoutRequest.from,
      validator: CheckoutRequestValidator,
      facadeMethod: "checkout",
      responseMapper: CheckoutResponseMapper.map,
      action: "checkout",
    });
  }
}

module.exports = CheckoutController;
