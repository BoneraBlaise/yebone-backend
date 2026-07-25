/** Issue seller JWT cookie + JSON payload (extension helper for shop routes). */
const issueShopSessionResponse = (res, seller, statusCode, extra = {}) => {
  const token = seller.getJwtToken();
  const isProduction = process.env.NODE_ENV === "production";
  const options = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  };

  return res.status(statusCode).cookie("seller_token", token, options).json({
    success: true,
    token,
    ...extra,
  });
};

module.exports = issueShopSessionResponse;
