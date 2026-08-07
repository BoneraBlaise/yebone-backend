const nodemailer = require("nodemailer");
const isSmtpConfigured = require("./isSmtpConfigured");

function getMailFromAddress() {
  const from = String(process.env.EMAIL_FROM || "").trim();
  if (from) return from;
  return process.env.SMPT_MAIL;
}

function createSmtpTransporter() {
  const port = Number(process.env.SMPT_PORT || 587);
  const service = String(process.env.SMPT_SERVICE || "").trim().toLowerCase();

  const baseConfig = {
    auth: {
      user: process.env.SMPT_MAIL,
      pass: process.env.SMPT_PASSWORD,
    },
  };

  if (service === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      ...baseConfig,
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMPT_HOST,
    port,
    secure: port === 465,
    ...baseConfig,
  });
}

const sendMail = async (options) => {
  if (!isSmtpConfigured()) {
    console.warn(
      "[sendMail] SMTP not configured — skipping email to",
      options?.email || "(unknown)"
    );
    return { skipped: true, reason: "SMTP not configured" };
  }

  if (!options?.email) {
    return { skipped: true, reason: "missing_recipient" };
  }

  try {
    const transporter = createSmtpTransporter();

    const mailOptions = {
      from: getMailFromAddress(),
      to: options.email,
      subject: options.subject,
      text: options.message,
    };

    if (options.html) {
      mailOptions.html = options.html;
    }

    await transporter.sendMail(mailOptions);
    return { skipped: false, sent: true };
  } catch (error) {
    console.error("[sendMail] Delivery failed:", error.message);
    return { skipped: false, sent: false, error: error.message };
  }
};

module.exports = sendMail;
module.exports.getMailFromAddress = getMailFromAddress;
module.exports.createSmtpTransporter = createSmtpTransporter;
