const sendMail = require("./sendMail");
const { buildWelcomeEmail } = require("./email/welcomeEmail");
const { logAuthEvent } = require("./authAuditLog");

/**
 * Send welcome email after successful registration (non-blocking for auth flows).
 * Failures are logged; never throws to caller.
 */
async function sendWelcomeEmail(user) {
  if (!user?.email) {
    return { sent: false, skipped: true, reason: "missing_email" };
  }

  try {
    const content = buildWelcomeEmail({ userName: user.name });
    const result = await sendMail({
      email: user.email,
      subject: content.subject,
      message: content.text,
      html: content.html,
    });

    logAuthEvent("welcome_email_sent", {
      userId: user._id,
      email: user.email,
      success: Boolean(result.sent),
      reason: result.skipped ? result.reason : result.error,
    });

    return result;
  } catch (error) {
    console.error("[authEmail] Welcome email failed:", error.message);
    logAuthEvent("welcome_email_sent", {
      userId: user._id,
      email: user.email,
      success: false,
      reason: error.message,
    });
    return { sent: false, error: error.message };
  }
}

module.exports = { sendWelcomeEmail };
