const BaseApiController = require("./BaseApiController");
const { VendorPayoutRequest } = require("../dto");
const { VendorPayoutRequestValidator } = require("../validators");
const { VendorPayoutResponseMapper } = require("../responses");

class VendorPayoutController extends BaseApiController {
  constructor(facade) {
    super(facade);
  }

  request(req, res, next) {
    req.body = { ...req.body, action: "request" };
    return this._handle(req, res, next, {
      dtoFactory: VendorPayoutRequest.from,
      validator: VendorPayoutRequestValidator,
      facadeMethod: "vendorPayout",
      responseMapper: VendorPayoutResponseMapper.map,
      action: "request",
    });
  }

  approve(req, res, next) {
    req.body = { ...req.body, action: "approve" };
    return this._handle(req, res, next, {
      dtoFactory: VendorPayoutRequest.from,
      validator: VendorPayoutRequestValidator,
      facadeMethod: "vendorPayout",
      responseMapper: VendorPayoutResponseMapper.map,
      action: "approve",
    });
  }
}

module.exports = VendorPayoutController;
