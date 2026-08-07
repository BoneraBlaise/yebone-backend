const { BRAND, getLogoUrl, getShopUrl } = require("./emailBrand");

function buildWelcomeEmail({ userName }) {
  const greeting = userName ? `Hi ${userName},` : "Hi,";
  const logoUrl = getLogoUrl();
  const shopUrl = getShopUrl();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to YEBONE</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.background};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:${BRAND.primary};padding:28px 32px;text-align:center;">
              <img src="${logoUrl}" alt="${BRAND.name}" width="56" height="56" style="display:block;margin:0 auto 12px;border-radius:12px;" />
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Welcome to ${BRAND.name}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;text-align:center;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${greeting}</p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:${BRAND.muted};">
                Your account is ready. Discover premium products from verified sellers across Africa's AI-powered marketplace.
              </p>
              <a href="${shopUrl}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">
                Start Shopping
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:#f3f4f6;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:${BRAND.muted};">&copy; ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${greeting}

Welcome to YEBONE! Your account is ready.

Start shopping: ${shopUrl}`;

  return {
    subject: "Welcome to YEBONE",
    html,
    text,
  };
}

module.exports = { buildWelcomeEmail };
