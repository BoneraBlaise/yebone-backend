const BaseApiController = require("./BaseApiController");
const { EscrowRequest } = require("../dto");
const { EscrowRequestValidator } = require("../validators");
const { EscrowResponseMapper } = require("../responses");

class EscrowController extends BaseApiController {
  constructor(facade) {
    super(facade);
  }

  hold(req, res, next) {
    req.body = { ...req.body, action: "hold" };
    return this._handle(req, res, next, {
      dtoFactory: EscrowRequest.from,
      validator: EscrowRequestValidator,
      facadeMethod: "escrow",
      responseMapper: EscrowResponseMapper.map,
      action: "hold",
    });
  }

  release(req, res, next) {
    req.body = { ...req.body, action: "release" };
    return this._handle(req, res, next, {
      dtoFactory: EscrowRequest.from,
      validator: EscrowRequestValidator,
      facadeMethod: "escrow",
      responseMapper: EscrowResponseMapper.map,
      action: "release",
    });
  }
}

module.exports = EscrowController;
