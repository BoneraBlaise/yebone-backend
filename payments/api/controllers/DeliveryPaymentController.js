const BaseApiController = require("./BaseApiController");
const { DeliveryPaymentRequest } = require("../dto");
const { DeliveryPaymentRequestValidator } = require("../validators");
const { DeliveryResponseMapper } = require("../responses");

class DeliveryPaymentController extends BaseApiController {
  constructor(facade) {
    super(facade);
  }

  prepare(req, res, next) {
    req.body = { ...req.body, action: "prepare" };
    return this._handle(req, res, next, {
      dtoFactory: DeliveryPaymentRequest.from,
      validator: DeliveryPaymentRequestValidator,
      facadeMethod: "delivery",
      responseMapper: DeliveryResponseMapper.map,
      action: "prepare",
    });
  }

  settle(req, res, next) {
    req.body = { ...req.body, action: "settle" };
    return this._handle(req, res, next, {
      dtoFactory: DeliveryPaymentRequest.from,
      validator: DeliveryPaymentRequestValidator,
      facadeMethod: "delivery",
      responseMapper: DeliveryResponseMapper.map,
      action: "settle",
    });
  }
}

module.exports = DeliveryPaymentController;
