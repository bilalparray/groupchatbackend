import { sendSuccess, sendError } from "../../Helper/response.helper.js";
import { Group, GroupMember, User, Guest, Message } from "../../db/dbconnection.js";
import { Op } from "sequelize";
import crypto from "crypto";

// Generate unique invite key
const generateInviteKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ✅ GET ALL GROUPS (for current user)
export const getGroupsController = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return sendError(res, "User not authenticated", 401);
    }

    const userId = user.id;
    const userType = user.role === "Guest" ? "Guest" : "User";

    console.log(`[GetGroups] User ${userId} (${user.role}) requesting groups with userType: ${userType}`);
    console.log(`[GetGroups] Full user object:`, JSON.stringify(user, null, 2));

    // Get all groups where user is a member
    // Query by userId only - don't filter by userType initially
    let groupMemberships = await GroupMember.findAll({
      where: {
        userId: parseInt(userId), // Ensure it's an integer
      },
      include: [
        {
          model: Group,
          as: "group",
          include: [
            {
              model: Message,
              as: "messages",
              limit: 1,
              order: [["createdOnUTC", "DESC"]],
              separate: true,
            },
          ],
        },
      ],
    });

    console.log(`[GetGroups] Raw query found ${groupMemberships.length} memberships for userId ${userId}`);

    // Update userType for all memberships to match current user type
    // This ensures consistency and fixes any mismatches
    for (const membership of groupMemberships) {
      if (membership.userType !== userType) {
        console.log(`[GetGroups] Updating membership ${membership.id} userType from ${membership.userType} to ${userType}`);
        await membership.update({ userType });
      }
    }

    console.log(`[GetGroups] Found ${groupMemberships.length} group memberships for user ${userId}`);
    
    // Log details of each membership
    groupMemberships.forEach((m, idx) => {
      console.log(`[GetGroups] Membership ${idx + 1}: GroupId=${m.groupId}, UserId=${m.userId}, UserType=${m.userType}`);
    });

    // Format groups with member count and last message
    // Filter out any memberships where group is null (shouldn't happen, but safety check)
    const validMemberships = groupMemberships.filter(m => m.group !== null && m.group !== undefined);
    
    console.log(`[GetGroups] Valid memberships (with groups): ${validMemberships.length} out of ${groupMemberships.length}`);
    
    const groups = await Promise.all(
      validMemberships.map(async (membership) => {
        const group = membership.group;
        
        if (!group) {
          console.warn(`[GetGroups] Membership ${membership.id} has null group, skipping`);
          return null;
        }
        
        // Get all members of the group
        const allMembers = await GroupMember.findAll({
          where: { groupId: group.id },
        });
        const memberIds = allMembers.map((m) => m.userId.toString());

        const lastMessage = group.messages && group.messages.length > 0 
          ? group.messages[0] 
          : null;

        return {
          id: group.id.toString(),
          name: group.name,
          description: group.description,
          owner: group.owner.toString(),
          inviteKey: group.inviteKey,
          members: memberIds,
          created: group.createdOnUTC.toISOString(),
          lastMessage: lastMessage?.content || null,
          lastMessageTime: lastMessage?.createdOnUTC?.toISOString() || null,
          unreadCount: 0, // Can be calculated based on read receipts if needed
          createdBy: group.createdBy?.toString() || "",
          lastModifiedBy: group.lastModifiedBy?.toString() || "",
          createdOnUTC: group.createdOnUTC,
        };
      })
    );

    // Filter out any null groups (from the safety check above)
    const validGroups = groups.filter(g => g !== null);
    
    console.log(`[GetGroups] Returning ${validGroups.length} groups`);

    return sendSuccess(res, { groups: validGroups });
  } catch (error) {
    return sendError(res, error.message || "Failed to get groups", 500);
  }
};

// ✅ CREATE GROUP
export const createGroupController = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return sendError(res, "User not authenticated", 401);
    }

    if (user.role === "Guest") {
      return sendError(res, "Only registered users can create groups", 403);
    }

    const { reqData } = req.body;
    const { name, description } = reqData || {};

    if (!name || name.trim() === "") {
      return sendError(res, "Group name is required", 400);
    }

    // Generate unique invite key
    let inviteKey = generateInviteKey();
    let keyExists = true;
    while (keyExists) {
      const existing = await Group.findOne({ where: { inviteKey } });
      if (!existing) {
        keyExists = false;
      } else {
        inviteKey = generateInviteKey();
      }
    }

    // Create group
    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || "No description",
      owner: user.id,
      inviteKey,
      createdBy: user.id,
      lastModifiedBy: user.id,
    });

    // Add owner as member
    await GroupMember.create({
      groupId: group.id,
      userId: user.id,
      userType: "User",
      createdBy: user.id,
      lastModifiedBy: user.id,
    });

    return sendSuccess(
      res,
      {
        group: {
          id: group.id.toString(),
          name: group.name,
          description: group.description,
          owner: group.owner.toString(),
          inviteKey: group.inviteKey,
          members: [group.owner.toString()],
          created: group.createdOnUTC.toISOString(),
          unreadCount: 0,
          createdBy: group.createdBy?.toString() || "",
          lastModifiedBy: group.lastModifiedBy?.toString() || "",
          createdOnUTC: group.createdOnUTC,
        },
      },
      201
    );
  } catch (error) {
    return sendError(res, error.message || "Failed to create group", 500);
  }
};

// ✅ GENERATE NEW INVITE KEY
export const generateInviteKeyController = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return sendError(res, "User not authenticated", 401);
    }

    const { id } = req.params;

    // Find group and verify ownership
    const group = await Group.findByPk(id);
    if (!group) {
      return sendError(res, "Group not found", 404);
    }

    if (group.owner !== user.id && user.role !== "SuperAdmin") {
      return sendError(res, "Only group owner can generate invite keys", 403);
    }

    // Generate new unique invite key
    let inviteKey = generateInviteKey();
    let keyExists = true;
    while (keyExists) {
      const existing = await Group.findOne({ where: { inviteKey } });
      if (!existing) {
        keyExists = false;
      } else {
        inviteKey = generateInviteKey();
      }
    }

    // Update group with new invite key
    await group.update({
      inviteKey,
      lastModifiedBy: user.id,
    });

    // Calculate expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return sendSuccess(res, {
      inviteKey,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    return sendError(res, error.message || "Failed to generate invite key", 500);
  }
};

// ✅ JOIN GROUP WITH INVITE KEY
export const joinGroupWithInviteKeyController = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return sendError(res, "User not authenticated", 401);
    }

    const { inviteKey } = req.params;
    
    // Trim the invite key to remove any whitespace
    const trimmedKey = inviteKey.trim();

    console.log(`[Join Group] User ${user.id} (${user.role}) attempting to join with key: "${trimmedKey}"`);

    // Find group by invite key (case-sensitive)
    const group = await Group.findOne({ where: { inviteKey: trimmedKey } });
    if (!group) {
      console.log(`[Join Group] Group not found for key: "${trimmedKey}"`);
      return sendError(res, "Invalid invite key", 404);
    }
    
    console.log(`[Join Group] Group found: ${group.name} (ID: ${group.id})`);

    const userId = user.id;
    const userType = user.role === "Guest" ? "Guest" : "User";

    // Check if user is already a member (one membership per user per group)
    const existingMember = await GroupMember.findOne({
      where: {
        groupId: group.id,
        userId,
      },
    });
    
    // If found, update userType if it's different
    if (existingMember) {
      if (existingMember.userType !== userType) {
        await existingMember.update({ userType });
        console.log(`[Join Group] Updated userType from ${existingMember.userType} to ${userType} for member ${existingMember.id}`);
      }
      console.log(`[Join Group] User ${userId} is already a member of group ${group.id}`);
      return sendSuccess(res, { message: "Already a member of this group" });
    }

    // Add user as member
    try {
      const newMember = await GroupMember.create({
        groupId: group.id,
        userId,
        userType,
        createdBy: userId,
        lastModifiedBy: userId,
      });

      console.log(`[Join Group] ✅ Successfully added user ${userId} (${userType}) to group ${group.id} (GroupMember ID: ${newMember.id})`);

      return sendSuccess(res, { message: "Successfully joined group" });
    } catch (createError) {
      // Handle specific database errors
      console.error(`[Join Group] ❌ Error creating GroupMember:`, createError);
      
      // Check if it's a unique constraint violation
      if (createError.name === 'SequelizeUniqueConstraintError' || createError.original?.code === '23505') {
        console.log(`[Join Group] Unique constraint violation - user may already be a member`);
        // Try to find the existing member
        const existing = await GroupMember.findOne({
          where: { groupId: group.id, userId }
        });
        if (existing) {
          // Update userType if needed
          if (existing.userType !== userType) {
            await existing.update({ userType });
          }
          return sendSuccess(res, { message: "Already a member of this group" });
        }
      }
      
      // Re-throw to be caught by outer catch
      throw createError;
    }
  } catch (error) {
    console.error(`[Join Group] ❌ Unexpected error:`, error);
    console.error(`[Join Group] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      original: error.original
    });
    return sendError(res, error.message || "Failed to join group", 500);
  }
};
