import crypto from "crypto";
import { sendSuccess, sendError } from "../../Helper/response.helper.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../middlewares/auth/auth.js";
import { GuestKey,Guest } from "../../db/dbconnection.js";

// ✅ GENERATE GUEST KEY (Admin / SuperAdmin only)
export const generateGuestKeyController = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !["Admin", "SuperAdmin"].includes(user.role)) {
      return sendError(res, "Forbidden", 403);
    }

    const { reqData } = req.body;
    const { department } = reqData || {};

    if (!department) return sendError(res, "Department is required", 400);

    const randomKey = crypto.randomBytes(16).toString("hex");

    const guestKey = await GuestKey.create({
      key: randomKey,
      createdBy: user.id,
      department,
      status: "Enabled",
      totalGuestsRegistered: 0,
      activeGuestsCount: 0,
    });

    return sendSuccess(res, guestKey);
  } catch (err) {
    return sendError(res, err.message || "Failed to generate guest key");
  }
};



export const guestLoginWithKeyController = async (req, res) => {
  try {
    const { reqData } = req.body;
    const { guestKey, guestName, role } = reqData || {};

    const name = guestName;

    // 1️⃣ Validate required fields
    if (!guestKey || !name || !role) {
      return sendError(res, "Guest name, key & role are required", 400);
    }

    // 2️⃣ Only a guest can use guest login
    if (role !== "Guest") {
      return sendError(res, "Invalid role. Only Guest login allowed", 403);
    }

    // 3️⃣ Validate Guest Key
    const keyEntry = await GuestKey.findOne({
      where: { key: guestKey }
    });

    if (!keyEntry) return sendError(res, "Invalid guest key", 404);

    if (keyEntry.status === "Disabled") {
      return sendError(res, "Guest key is disabled", 403);
    }

    // 4️⃣ Check if guest already exists
    let guestUser = await Guest.findOne({
      where: { name, guestKeyId: keyEntry.id }
    });

    // FIRST TIME LOGIN → create new guest
    if (!guestUser) {
      guestUser = await Guest.create({
        name,
        guestKeyId: keyEntry.id,
        status: "Active"
      });

      // update guest count
      await keyEntry.update({
        totalGuestsRegistered: keyEntry.totalGuestsRegistered + 1,
        activeGuestsCount: keyEntry.activeGuestsCount + 1,
      });
    }

    // 5️⃣ Existing guest but inactive
    if (guestUser.status === "Inactive") {
      return sendError(res, "Your account is inactive", 403);
    }

    // 6️⃣ Build token payload
    const payload = {
      id: guestUser.id,
      name: guestUser.name,
      role: "Guest",
      guestKey: keyEntry.key,
      department: keyEntry.department,
    };

    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    // 7️⃣ Success response
    return sendSuccess(res, {
      name,
      role: "Guest",
      guestKey: keyEntry.key,
      department: keyEntry.department,
      accessToken,
      refreshToken,
    });

  } catch (err) {
    return sendError(res, err.message || "Guest login failed");
  }
};


export const updateGuestStatusController = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !["Admin", "SuperAdmin"].includes(user.role))
      return sendError(res, "Unauthorized", 403);

    const { reqData } = req.body;
    const { guestId, status } = reqData;

    if (!guestId || !["Active", "Inactive"].includes(status))
      return sendError(res, "Invalid input", 400);

    const guest = await Guest.findByPk(guestId);
    if (!guest) return sendError(res, "Guest not found", 404);

    const guestKey = await GuestKey.findByPk(guest.guestKeyId);

    if (guest.status !== status) {
      if (status === "Active") {
        guestKey.activeGuestsCount += 1;
      } else {
        guestKey.activeGuestsCount -= 1;
      }
      await guestKey.save();
    }

    await guest.update({ status });

    return sendSuccess(res, { message: "Guest status updated" });
  } catch (err) {
    return sendError(res, err.message || "Failed to update status");
  }
};



