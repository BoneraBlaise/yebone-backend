const BaseApiController = require("./BaseApiController");
const { CreateOrderPaymentRequest, CapturePaymentRequest } = require("../dto");
const { CreateOrderPaymentValidator, CapturePaymentValidator } = require("../validators");
const { PaymentResponseMapper } = require("../responses");

class PaymentController extends BaseApiController {
  constructor(facade) {
    super(facade);
  }

  create(req, res, next) {
    return this._handle(req, res, next, {
      dtoFactory: CreateOrderPaymentRequest.from,
      validator: CreateOrderPaymentValidator,
      facadeMethod: "orderPayment",
      responseMapper: PaymentResponseMapper.map,
      action: "create",
    });
  }

  capture(req, res, next) {
    return this._handle(req, res, next, {
      dtoFactory: CapturePaymentRequest.from,
      validator: CapturePaymentValidator,
      facadeMethod: "orderPayment",
      responseMapper: PaymentResponseMapper.map,
      action: "capture",
    });
  }
}

module.exports = PaymentController;
