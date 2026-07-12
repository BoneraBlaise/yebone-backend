const BaseApiController = require("./BaseApiController");
const { RefundRequest } = require("../dto");
const { RefundRequestValidator } = require("../validators");
const { RefundResponseMapper } = require("../responses");

class RefundController extends BaseApiController {
  constructor(facade) {
    super(facade);
  }

  request(req, res, next) {
    req.body = { ...req.body, action: "request" };
    return this._handle(req, res, next, {
      dtoFactory: RefundRequest.from,
      validator: RefundRequestValidator,
      facadeMethod: "refund",
      responseMapper: RefundResponseMapper.map,
      action: "request",
    });
  }

  approve(req, res, next) {
    req.body = { ...req.body, action: "approve" };
    return this._handle(req, res, next, {
      dtoFactory: RefundRequest.from,
      validator: RefundRequestValidator,
      facadeMethod: "refund",
      responseMapper: RefundResponseMapper.map,
      action: "approve",
    });
  }
}

module.exports = RefundController;
