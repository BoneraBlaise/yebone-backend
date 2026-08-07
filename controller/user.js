const express = require("express");
const User = require("../model/user");
const router = express.Router();
const cloudinary = require("cloudinary");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const crypto = require('crypto');
const sharp = require('sharp');
const normalizeEmail = require("../utils/normalizeEmail");
const {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithSession,
  resolveBackupResetToken,
  GENERIC_OTP_SENT_MESSAGE,
} = require("../utils/passwordResetService");

// Create activation token function
const createToken = (user) => {
  return jwt.sign({ user }, process.env.ACTIVATION_SECRET, {
    expiresIn: '10m' // Set the expiration time as needed
  });
};

// Create user
router.post("/create-user", async (req, res, next) => {
  try {
    const { name, password, avatar } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!name || !email || !password || !avatar) {
      return next(new ErrorHandler("Missing required fields", 400));
    }

    const userEmail = await User.findOne({ email });

    if (userEmail) {
      return next(new ErrorHandler("User already exists", 400));
    }

    let myCloud;
    try {
      myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avatars",
      });
    } catch (error) {
      return next(new ErrorHandler("Error uploading avatar", 500));
    }

    const userPayload = {
      name: name,
      email: email,
      password: password,
      avatar: {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      },
    };

    const activationToken = createToken(userPayload);
    const frontendBase = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
    const activationUrl = `${frontendBase}/activation/${activationToken}`;

    const mailResult = await sendMail({
      email: userPayload.email,
      subject: "Activate your account",
      message: `Hello ${userPayload.name}, please click the link to activate your account:\n\n${activationUrl}`,
    });

    if (mailResult?.skipped) {
      await User.create(userPayload);
      return res.status(201).json({
        success: true,
        message: `Account created successfully! You can now sign in with ${userPayload.email}.`,
        emailVerificationSkipped: true,
      });
    }

    res.status(201).json({
      success: true,
      message: `Please check your email (${userPayload.email}) to activate your account!`,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Activate user
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token } = req.body;

      if (!activation_token) {
        return next(new ErrorHandler("Activation token is missing", 400));
      }

      // Verify the token with the secret key
      const decoded = jwt.verify(activation_token, process.env.ACTIVATION_SECRET);

      if (!decoded) {
        return next(new ErrorHandler("Invalid or expired token", 400));
      }

      const { name, email, password, avatar } = decoded.user;

      let user = await User.findOne({ email });

      if (user) {
        return next(new ErrorHandler("User already exists", 400));
      }

      // Create a new user with the provided data from the token
      user = await User.create({
        name,
        email,
        avatar,
        password,
      });

      // Optionally send a response with the user's token or some success message
      sendToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Check if email is already registered
router.post("/check-email", catchAsyncErrors(async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: normalizeEmail(email) });

    if (user) {
      return res.status(200).json({
        exists: true,
        authProvider: user.authProvider
      });
    }

    res.status(200).json({
      exists: false
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Login user
router.post(
  "/login-user",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { password } = req.body;
      const email = normalizeEmail(req.body.email);

      if (!email || !password) {
        return next(new ErrorHandler("Please fill all fields!", 400));
      }

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User doesn't exist!", 400));
      }

      // Check if user is registered with Google
      if (user.authProvider === 'google') {
        return next(new ErrorHandler("Please login with Google", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(new ErrorHandler("Invalid password!", 400));
      }

      sendToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Load user
router.get(
  "/getuser",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return next(new ErrorHandler("User doesn't exist", 400));
      }

      res.status(200).json({
        success: true,
        user,
        token: user.getJwtToken(),
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Log out user
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });
      res.status(200).json({
        success: true,
        message: "Log out successful!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update user info
router.put(
  "/update-user-info",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password, phoneNumber, name } = req.body;

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User not found", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(new ErrorHandler("Invalid password!", 400));
      }

      user.name = name;
      user.email = email;
      user.phoneNumber = phoneNumber;

      await user.save();

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update user avatar
router.put(
  "/update-avatar",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const existsUser = await User.findById(req.user.id);

      if (!existsUser) {
        return next(new ErrorHandler("User not found", 404));
      }

      // Only proceed if new avatar is provided
      if (req.body.avatar) {
        try {
          // Delete old avatar if it exists
          if (existsUser.avatar && existsUser.avatar.public_id) {
            await cloudinary.v2.uploader.destroy(existsUser.avatar.public_id);
          }

          // Extract base64 data
          const base64Data = req.body.avatar.replace(/^data:image\/\w+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');

          // Compress image
          const compressedImageBuffer = await sharp(imageBuffer)
            .resize(800, 800, { // Resize to reasonable dimensions
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
            .toBuffer();

          // Upload to Cloudinary
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.v2.uploader.upload_stream(
              {
                folder: "avatars",
                format: 'jpg', // Force JPEG format
                transformation: [
                  { width: 800, height: 800, crop: "limit" }, // Additional Cloudinary-side optimization
                  { quality: "auto" } // Let Cloudinary optimize quality
                ]
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );

            streamifier.createReadStream(compressedImageBuffer).pipe(uploadStream);
          });

          // Update user avatar
          existsUser.avatar = {
            public_id: uploadResult.public_id,
            url: uploadResult.secure_url
          };

          await existsUser.save();

          res.status(200).json({
            success: true,
            user: existsUser
          });
        } catch (uploadError) {
          return next(new ErrorHandler(`Error uploading avatar: ${uploadError.message}`, 500));
        }
      } else {
        return next(new ErrorHandler("No avatar provided", 400));
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Find user information with the userId
router.get(
  "/user-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// All users --- for admin
router.get(
  "/admin-all-users",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const users = await User.find().sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        users,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete user --- admin
router.delete(
  "/delete-user/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return next(
          new ErrorHandler("User not found", 404)
        );
      }

      const imageId = user.avatar.public_id;
      await cloudinary.v2.uploader.destroy(imageId);

      await User.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: "User deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Route to send password reset OTP
router.post(
  "/forgot-password",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!email) {
        return next(new ErrorHandler("Email is required", 400));
      }

      const result = await requestPasswordResetOtp({
        email,
        User,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: result.message || GENERIC_OTP_SENT_MESSAGE,
        expiresInMs: result.expiresInMs,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Route to verify password reset OTP
router.post(
  "/verify-reset-otp",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return next(new ErrorHandler("Email and verification code are required", 400));
      }

      const result = await verifyPasswordResetOtp({
        email,
        otp,
        User,
        ip: req.ip,
      });

      if (!result.success) {
        return next(new ErrorHandler(result.message, 400));
      }

      res.status(200).json({
        success: true,
        message: result.message,
        resetSessionToken: result.resetSessionToken,
        expiresInMs: result.expiresInMs,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Route to validate backup reset link token (from email)
router.post(
  "/validate-reset-token",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { token } = req.body;

      if (!token) {
        return next(new ErrorHandler("Reset token is required", 400));
      }

      const result = await resolveBackupResetToken({
        token,
        User,
        ip: req.ip,
      });

      if (!result.success) {
        return next(new ErrorHandler(result.message, 400));
      }

      res.status(200).json({
        success: true,
        resetSessionToken: result.resetSessionToken,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Route to reset password with verified session token
router.post(
  "/reset-password",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { resetSessionToken, newPassword } = req.body;

      if (!resetSessionToken || !newPassword) {
        return next(
          new ErrorHandler("Reset session token and new password are required", 400)
        );
      }

      const result = await resetPasswordWithSession({
        resetSessionToken,
        newPassword,
        User,
        ip: req.ip,
      });

      if (!result.success) {
        return next(new ErrorHandler(result.message, 400));
      }

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Password reset error:", error);
      return next(new ErrorHandler(error.message || "Password reset failed", 500));
    }
  })
);

// Google login success handler
router.get("/login-success", catchAsyncErrors(async (req, res, next) => {
  try {
    const token = req.query.token;
    if (!token) {
      return next(new ErrorHandler("No token provided", 400));
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    sendToken(user, 200, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

module.exports = router;
