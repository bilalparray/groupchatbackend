// 📁 controllers/authController.js
import { User } from "../../db/dbconnection.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Op } from "sequelize";
import { sendSuccess, sendError } from "../../Helper/response.helper.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../middlewares/auth/auth.js";
import sendEmail from "../../middlewares/utills/sendEmail.js";

// ✅ REGISTER
export const registerController = async (req, res) => {
  const { reqData } = req.body;
  const { username, email, password, role } = reqData || {};
  const validRoles = ["SuperAdmin", "Admin", "User", "Guest"];

  if (!role || !validRoles.includes(role)) {
    return sendError(res, "Invalid or missing role", 400);
  }

  try {
    const { User } = req.models || {};
    const existUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }],
      },
    });
    if (existUser)
      return sendError(res, "Username or email already exists", 409);

    const hashedPass = await bcryptjs.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPass,
      role,
      refreshToken: null,
    });

    return sendSuccess(
      res,
      {
        username: user.username,
        email: user.email,
        role: user.role,
      },
      201
    );
  } catch (error) {
    return sendError(res, error.message);
  }
};

// ✅ CHECK EMAIL
export const checkEmailExistsController = async (req, res) => {
  const { reqData } = req.body;
  const { email } = reqData || {};
  try {
    const user = await User.findOne({ where: { email } });
    if (user) return sendError(res, "Email already exists", 409);
    return sendSuccess(res, { message: "Email is available" });
  } catch (err) {
    return sendError(res, err.message || "Internal Error");
  }
};

// ✅ LOGIN
export const loginController = async (req, res) => {
  const { User } = req.models || {};
  debugger;

  if (!User) {
    console.error("User model not available on req.models");
    return sendError(res, "Server misconfiguration: models not loaded", 500);
  }
  const { reqData } = req.body;
  const { username, password } = reqData || {};
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) return sendError(res, "User not found", 404);

    const isValid = await bcryptjs.compare(password, user.password);
    if (!isValid) return sendError(res, "Invalid credentials", 401);

    const accessToken = await generateAccessToken(user.dataValues);
    const refreshToken = await generateRefreshToken(user.dataValues); // ✅ FIXED

    await user.update({ refreshToken, lastLoginAt: new Date() });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
    });

    return sendSuccess(res, {
      username: user.username,
      role: user.role,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return sendError(res, error.message || "Internal Error");
  }
};

// ✅ FORGOT PASSWORD
export const forgotPasswordController = async (req, res) => {
  const { reqData } = req.body;
  const { email } = reqData || {};
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return sendError(res, "User not found", 404);

    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = Date.now() + 1000 * 60 * 15;

    await user.update({ resetToken: token, resetTokenExpiry: tokenExpiry });

    const resetLink = `https://your-frontend.com/reset-password/${token}`;
    await sendEmail(
      user.email,
      "Reset Password",
      `<p>Click <a href='${resetLink}'>here</a> to reset your password.</p>`
    );

    return sendSuccess(res, { message: "Reset link sent to email." });
  } catch (err) {
    return sendError(res, err.message || "Something went wrong.");
  }
};

// ✅ RESET PASSWORD
export const resetPasswordController = async (req, res) => {
  const { token } = req.params;
  const { reqData } = req.body;
  const { newPassword } = reqData || {};

  try {
    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [Op.gt]: new Date() },
      },
    });

    if (!user) return sendError(res, "Invalid or expired token", 400);

    const hashedPass = await bcryptjs.hash(newPassword, 10);
    await user.update({
      password: hashedPass,
      resetToken: null,
      resetTokenExpiry: null,
    });

    return sendSuccess(res, { message: "Password reset successful." });
  } catch (err) {
    return sendError(res, err.message || "Something went wrong.");
  }
};

// ✅ REFRESH TOKEN
export const refreshController = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return sendError(res, "Token is empty", 403);

  try {
    const user = await User.findOne({ where: { refreshToken } });
    if (!user) return sendError(res, "User not found", 403);

    jwt.verify(refreshToken, process.env.REFRESH_SECRET, (err, decoded) => {
      if (err) return sendError(res, "Invalid token", 403);
      const accessToken = generateAccessToken(user.dataValues);
      return sendSuccess(res, { accessToken });
    });
  } catch (e) {
    return sendError(res, e.message || "Internal Error");
  }
};

// ✅ LOGOUT
export const logoutController = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return sendError(res, "Token is empty", 403);

  try {
    const user = await User.findOne({ where: { refreshToken } });
    if (user) await user.update({ refreshToken: null });
    res.clearCookie("refreshToken");
    return sendSuccess(res, { message: "Logged out successfully" });
  } catch (e) {
    return sendError(res, e.message || "Internal Error");
  }
};
