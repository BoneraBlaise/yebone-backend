const BaseApiController = require("./BaseApiController");
const { SubscriptionRequest } = require("../dto");
const { SubscriptionRequestValidator } = require("../validators");
const { SubscriptionResponseMapper } = require("../responses");

class VendorSubscriptionController extends BaseApiController {
  constructor(facade) {
    super(facade);
  }

  create(req, res, next) {
    req.body = { ...req.body, action: "create" };
    return this._handle(req, res, next, {
      dtoFactory: SubscriptionRequest.from,
      validator: SubscriptionRequestValidator,
      facadeMethod: "subscription",
      responseMapper: SubscriptionResponseMapper.map,
      action: "create",
    });
  }

  activate(req, res, next) {
    req.body = { ...req.body, action: "activate" };
    return this._handle(req, res, next, {
      dtoFactory: SubscriptionRequest.from,
      validator: SubscriptionRequestValidator,
      facadeMethod: "subscription",
      responseMapper: SubscriptionResponseMapper.map,
      action: "activate",
    });
  }
}

module.exports = VendorSubscriptionController;
