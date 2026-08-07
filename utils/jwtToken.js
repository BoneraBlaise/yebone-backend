const { getJwtExpiresDate } = require("./jwtExpires");

const getTokenCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    expires: getJwtExpiresDate(),
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/",
  };
};

const clearTokenCookie = (res) => {
  const options = getTokenCookieOptions();
  res.cookie("token", null, { ...options, expires: new Date(0) });
};

const setTokenCookie = (res, token) => {
  res.cookie("token", token, getTokenCookieOptions());
};

// create token and saving that in cookies
const sendToken = (user, statusCode, res) => {
  const token = user.getJwtToken();
  res.status(statusCode);
  setTokenCookie(res, token);
  res.json({
    success: true,
    user,
    token,
  });
};

module.exports = sendToken;
module.exports.getTokenCookieOptions = getTokenCookieOptions;
module.exports.setTokenCookie = setTokenCookie;
module.exports.clearTokenCookie = clearTokenCookie;
