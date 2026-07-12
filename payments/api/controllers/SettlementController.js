const BaseApiController = require("./BaseApiController");
const { SettlementRequest } = require("../dto");
const { SettlementRequestValidator } = require("../validators");
const { SettlementResponseMapper } = require("../responses");

class SettlementController extends BaseApiController {
  constructor(facade) {
    super(facade);
  }

  settle(req, res, next) {
    req.body = { ...req.body, action: "settle" };
    return this._handle(req, res, next, {
      dtoFactory: SettlementRequest.from,
      validator: SettlementRequestValidator,
      facadeMethod: "settlement",
      responseMapper: SettlementResponseMapper.map,
      action: "settle",
    });
  }

  preview(req, res, next) {
    req.body = { ...req.body, action: "preview" };
    return this._handle(req, res, next, {
      dtoFactory: SettlementRequest.from,
      validator: SettlementRequestValidator,
      facadeMethod: "settlement",
      responseMapper: SettlementResponseMapper.map,
      action: "preview",
    });
  }
}

module.exports = SettlementController;
