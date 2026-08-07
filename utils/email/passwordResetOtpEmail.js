const { BRAND, getLogoUrl } = require("./emailBrand");

function buildPasswordResetOtpEmail({ otp, backupResetUrl, userName }) {
  const greeting = userName ? `Hi ${userName},` : "Hi,";
  const logoUrl = getLogoUrl();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your YEBONE password</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.background};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:${BRAND.primary};padding:28px 32px;text-align:center;">
              <img src="${logoUrl}" alt="${BRAND.name}" width="56" height="56" style="display:block;margin:0 auto 12px;border-radius:12px;" />
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">${BRAND.name}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BRAND.muted};">
                You requested to reset your password. Use the verification code below to continue.
              </p>
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.muted};">
                Your verification code is
              </p>
              <div style="background:${BRAND.background};border:2px solid ${BRAND.primary};border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
                <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:${BRAND.primary};font-family:'Courier New',monospace;">${otp}</span>
              </div>
              <p style="margin:0 0 24px;font-size:13px;color:${BRAND.muted};text-align:center;">
                This code expires in <strong>10 minutes</strong>.
              </p>
              ${
                backupResetUrl
                  ? `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;">Or use this secure backup link:</p>
              <p style="margin:0 0 24px;">
                <a href="${backupResetUrl}" style="color:${BRAND.primary};font-weight:600;word-break:break-all;">Reset password securely</a>
              </p>`
                  : ""
              }
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
              <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.muted};">
                If you didn't request this, you can safely ignore this email. Your password will not be changed.
              </p>
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

Your YEBONE password reset verification code is: ${otp}

This code expires in 10 minutes.
${backupResetUrl ? `\nSecure backup link: ${backupResetUrl}\n` : ""}
If you didn't request this, ignore this email.`;

  return {
    subject: "Reset your YEBONE password",
    html,
    text,
  };
}

function buildPasswordChangedEmail({ userName }) {
  const greeting = userName ? `Hi ${userName},` : "Hi,";
  const logoUrl = getLogoUrl();

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:${BRAND.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="background:${BRAND.primary};padding:24px;text-align:center;">
          <img src="${logoUrl}" alt="YEBONE" width="48" height="48" style="border-radius:10px;" />
          <h1 style="margin:12px 0 0;color:#fff;font-size:20px;">Password changed</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;">${greeting}</p>
          <p style="margin:0;font-size:15px;color:${BRAND.muted};line-height:1.6;">
            Your YEBONE account password was successfully updated. If you did not make this change, contact support immediately.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return {
    subject: "Your YEBONE password was changed",
    html,
    text: `${greeting}\n\nYour YEBONE account password was successfully updated.`,
  };
}

module.exports = {
  buildPasswordResetOtpEmail,
  buildPasswordChangedEmail,
};
