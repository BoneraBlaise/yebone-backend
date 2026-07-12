const { ValidationError } = require("../errors");

class ValidationMiddleware {
  static create({ dtoFactory, validator }) {
    return (req, res, next) => {
      try {
        const dto = dtoFactory(req.body || {}, req.headers || {});
        const validation = validator.validate(dto);
        if (!validation.valid) {
          return next(new ValidationError(validation.errors));
        }
        req.dto = dto;
        return next();
      } catch (error) {
        return next(error);
      }
    };
  }
}

module.exports = ValidationMiddleware;
