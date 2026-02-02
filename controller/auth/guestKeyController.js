import crypto from "crypto";
import { sendSuccess, sendError } from "../../Helper/response.helper.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../middlewares/auth/auth.js";
import { GuestKey, Guest, Group, GroupMember } from "../../db/dbconnection.js";

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

    // Trim the key to remove any whitespace
    const trimmedKey = guestKey.trim();

    let keyEntry = null;
    let isGroupInviteKey = false;
    let groupInviteKey = null;

    // 3️⃣ First, check if it's a group invite key (case-sensitive match)
    const group = await Group.findOne({
      where: { inviteKey: trimmedKey }
    });

    console.log(`[Guest Login] Checking key: "${trimmedKey}"`);
    console.log(`[Guest Login] Group found:`, group ? `Yes (ID: ${group.id})` : 'No');

    if (group) {
      // It's a group invite key
      isGroupInviteKey = true;
      groupInviteKey = trimmedKey;

      // Find or create a system guest key for group invites
      keyEntry = await GuestKey.findOne({
        where: { department: "Group Invite", key: "SYSTEM_GROUP_INVITE" }
      });

      if (!keyEntry) {
        // Create system guest key for group invites
        keyEntry = await GuestKey.create({
          key: "SYSTEM_GROUP_INVITE",
          createdBy: 1, // System user
          department: "Group Invite",
          status: "Enabled",
          totalGuestsRegistered: 0,
          activeGuestsCount: 0,
        });
      }
    } else {
      // 4️⃣ It's a regular guest key - validate it
      keyEntry = await GuestKey.findOne({
        where: { key: trimmedKey }
      });

      if (!keyEntry) {
        console.log(`[Guest Login] Key "${trimmedKey}" not found in GuestKey or Group tables`);
        return sendError(res, "Invalid guest key or invite key", 404);
      }

      if (keyEntry.status === "Disabled") {
        return sendError(res, "Guest key is disabled", 403);
      }
    }

    // 5️⃣ Check if guest already exists (by name and guestKeyId)
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

      // update guest count (only for non-system keys)
      if (!isGroupInviteKey) {
        await keyEntry.update({
          totalGuestsRegistered: keyEntry.totalGuestsRegistered + 1,
          activeGuestsCount: keyEntry.activeGuestsCount + 1,
        });
      } else {
        // For system keys, just update active count
        await keyEntry.update({
          activeGuestsCount: keyEntry.activeGuestsCount + 1,
        });
      }
    }

    // 6️⃣ Existing guest but inactive
    if (guestUser.status === "Inactive") {
      return sendError(res, "Your account is inactive", 403);
    }

    // 7️⃣ Build token payload
    const payload = {
      id: guestUser.id,
      name: guestUser.name,
      role: "Guest",
      guestKey: isGroupInviteKey ? groupInviteKey : keyEntry.key,
      department: keyEntry.department,
    };

    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    // 8️⃣ Success response - include groupInviteKey if it was used
    const responseData = {
      id: guestUser.id,
      name,
      role: "Guest",
      guestKey: isGroupInviteKey ? groupInviteKey : keyEntry.key,
      department: keyEntry.department,
      accessToken,
      refreshToken,
    };

    // Include group invite key in response if it was used
    if (isGroupInviteKey) {
      responseData.groupInviteKey = groupInviteKey;
      
      // Automatically add guest to the group when logging in with group invite key
      try {
        console.log(`[Guest Login] Attempting to auto-join group ${group.id} for guest ${guestUser.id}`);
        
        // Check if guest is already a member (check both UserType possibilities to be safe)
        const existingMember = await GroupMember.findOne({
          where: {
            groupId: group.id,
            userId: guestUser.id,
          },
        });

        if (!existingMember) {
          // Add guest as member of the group
          try {
            const newMember = await GroupMember.create({
              groupId: group.id,
              userId: guestUser.id,
              userType: "Guest",
              createdBy: guestUser.id,
              lastModifiedBy: guestUser.id,
            });
            console.log(`[Guest Login] ✅ Successfully added guest ${guestUser.id} to group ${group.id} (GroupMember ID: ${newMember.id})`);
          } catch (createError) {
            // Handle unique constraint violations
            if (createError.name === 'SequelizeUniqueConstraintError' || createError.original?.code === '23505') {
              console.log(`[Guest Login] Unique constraint violation - checking for existing member`);
              const existing = await GroupMember.findOne({
                where: { groupId: group.id, userId: guestUser.id }
              });
              if (existing) {
                if (existing.userType !== "Guest") {
                  await existing.update({ userType: "Guest" });
                }
                console.log(`[Guest Login] Guest ${guestUser.id} is already a member (updated userType)`);
              }
            } else {
              throw createError;
            }
          }
        } else {
          // Update userType to Guest if it was set incorrectly
          if (existingMember.userType !== "Guest") {
            await existingMember.update({ userType: "Guest" });
            console.log(`[Guest Login] Updated userType to Guest for member ${existingMember.id}`);
          }
          console.log(`[Guest Login] Guest ${guestUser.id} is already a member of group ${group.id} (userType: ${existingMember.userType})`);
        }
      } catch (joinError) {
        // Log error but don't fail login - user can still join manually later
        console.error(`[Guest Login] ❌ Error auto-joining group:`, joinError);
        console.error(`[Guest Login] Error details:`, {
          message: joinError.message,
          stack: joinError.stack,
          groupId: group.id,
          guestId: guestUser.id
        });
      }
    }

    return sendSuccess(res, responseData);

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



