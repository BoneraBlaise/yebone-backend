const { YEBO_AI_BRAND } = require("./ProviderMasking");

function success(data = {}, meta = {}) {
  return {
    success: true,
    data: { ...data, displayBrand: YEBO_AI_BRAND },
    meta: { ...meta, displayBrand: YEBO_AI_BRAND },
  };
}

function failure({ code, message, statusCode = 402, requestId = null, extra = {} } = {}) {
  const error = new Error(message || "YEBO AI request could not be completed.");
  error.statusCode = statusCode;
  error.code = code;
  error.reason = code;
  error.requestId = requestId;
  error.displayBrand = YEBO_AI_BRAND;
  error.publicPayload = {
    success: false,
    code,
    message: error.message,
    displayBrand: YEBO_AI_BRAND,
    requestId,
    ...extra,
  };
  return error;
}

module.exports = { success, failure, YEBO_AI_BRAND };
