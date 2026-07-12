const { ValidationError } = require("../errors");

class BaseApiController {
  constructor(facade) {
    this.facade = facade;
  }

  _validate(validation) {
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }
  }

  async _handle(req, res, next, { dtoFactory, validator, facadeMethod, responseMapper, action }) {
    try {
      const dto = dtoFactory(req.body || {}, req.headers || {});
      const validation = validator.validate(dto);
      this._validate(validation);
      const result = await this.facade[facadeMethod](dto.toPayload());
      return res.status(200).json(responseMapper(result, action));
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = BaseApiController;
