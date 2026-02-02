import { sendSuccess, sendError } from "../../Helper/response.helper.js";
import { Message, Group, GroupMember, User, Guest } from "../../db/dbconnection.js";
import { Op } from "sequelize";

// ✅ GET MESSAGES
export const getMessagesController = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return sendError(res, "User not authenticated", 401);
    }

    const { groupId, skip = 0, top = 100 } = req.query;

    if (!groupId) {
      return sendError(res, "Group ID is required", 400);
    }

    // Verify user is a member of the group (check by userId first, userType is secondary)
    const userType = user.role === "Guest" ? "Guest" : "User";
    let membership = await GroupMember.findOne({
      where: {
        groupId: parseInt(groupId),
        userId: parseInt(user.id),
        userType,
      },
    });

    // If not found with userType, check without it (for backwards compatibility)
    if (!membership) {
      membership = await GroupMember.findOne({
        where: {
          groupId: parseInt(groupId),
          userId: parseInt(user.id),
        },
      });
      
      // If found but userType is wrong, update it
      if (membership && membership.userType !== userType) {
        await membership.update({ userType });
        console.log(`[GetMessages] Updated userType from ${membership.userType} to ${userType} for member ${membership.id}`);
      }
    }

    if (!membership) {
      return sendError(res, "You are not a member of this group", 403);
    }

    // Get messages with pagination
    // Note: We don't need to join with User/Guest since senderName is already stored in the message
    const messages = await Message.findAll({
      where: { groupId: parseInt(groupId) },
      order: [["createdOnUTC", "ASC"]],
      limit: parseInt(top),
      offset: parseInt(skip),
    });

    // Format messages
    // senderName is already stored in the message, so we can use it directly
    const formattedMessages = messages.map((msg) => {
      // Use stored senderName, or fallback if somehow missing
      let senderName = msg.senderName || "Unknown";
      
      // Only fetch from database if senderName is missing (shouldn't happen normally)
      // This is a safety fallback
      if (!msg.senderName) {
        console.warn(`[GetMessages] Message ${msg.id} missing senderName, will need to fetch`);
      }

      return {
        id: msg.id.toString(),
        groupId: msg.groupId.toString(),
        sender: msg.sender.toString(),
        senderName,
        type: msg.type,
        content: msg.content,
        timestamp: msg.createdOnUTC.toISOString(),
        fileType: msg.fileType || undefined,
        fileSize: msg.fileSize || undefined,
        fileName: msg.fileName || undefined,
        duration: msg.duration || undefined,
        fileUrl: msg.fileUrl || undefined,
        createdBy: msg.createdBy?.toString() || "",
        lastModifiedBy: msg.lastModifiedBy?.toString() || "",
        createdOnUTC: msg.createdOnUTC,
      };
    });

    const totalCount = await Message.count({
      where: { groupId: parseInt(groupId) },
    });

    return sendSuccess(res, {
      messages: formattedMessages,
      totalCount,
    });
  } catch (error) {
    return sendError(res, error.message || "Failed to get messages", 500);
  }
};

// ✅ SEND MESSAGE
export const sendMessageController = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return sendError(res, "User not authenticated", 401);
    }

    const { reqData } = req.body;
    const { groupId, type, content, fileType, fileSize, fileName, duration } =
      reqData || {};

    if (!groupId || !type || !content) {
      return sendError(res, "Group ID, type, and content are required", 400);
    }

    // Verify user is a member of the group (check by userId first, userType is secondary)
    const userType = user.role === "Guest" ? "Guest" : "User";
    let membership = await GroupMember.findOne({
      where: {
        groupId: parseInt(groupId),
        userId: parseInt(user.id),
        userType,
      },
    });

    // If not found with userType, check without it (for backwards compatibility)
    if (!membership) {
      membership = await GroupMember.findOne({
        where: {
          groupId: parseInt(groupId),
          userId: parseInt(user.id),
        },
      });
      
      // If found but userType is wrong, update it
      if (membership && membership.userType !== userType) {
        await membership.update({ userType });
        console.log(`[SendMessage] Updated userType from ${membership.userType} to ${userType} for member ${membership.id}`);
      }
    }

    if (!membership) {
      return sendError(res, "You are not a member of this group", 403);
    }

    // Get sender name
    let senderName = "";
    if (user.role === "Guest") {
      // For guests, name is in the token payload from guest login
      senderName = user.name || "Guest";
    } else {
      const userRecord = await User.findByPk(user.id);
      senderName = userRecord
        ? userRecord.username || userRecord.email
        : user.username || "User";
    }

    // Create message
    const message = await Message.create({
      groupId: parseInt(groupId),
      sender: user.id,
      senderName,
      type,
      content: content.trim(),
      fileType: fileType || null,
      fileSize: fileSize || null,
      fileName: fileName || null,
      duration: duration || null,
      fileUrl: null, // Can be set when file upload is implemented
      createdBy: user.id,
      lastModifiedBy: user.id,
    });

    return sendSuccess(
      res,
      {
        message: {
          id: message.id.toString(),
          groupId: message.groupId.toString(),
          sender: message.sender.toString(),
          senderName: message.senderName,
          type: message.type,
          content: message.content,
          timestamp: message.createdOnUTC.toISOString(),
          fileType: message.fileType || undefined,
          fileSize: message.fileSize || undefined,
          fileName: message.fileName || undefined,
          duration: message.duration || undefined,
          fileUrl: message.fileUrl || undefined,
          createdBy: message.createdBy?.toString() || "",
          lastModifiedBy: message.lastModifiedBy?.toString() || "",
          createdOnUTC: message.createdOnUTC,
        },
      },
      201
    );
  } catch (error) {
    return sendError(res, error.message || "Failed to send message", 500);
  }
};

// ✅ SEARCH MESSAGES
export const searchMessagesController = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return sendError(res, "User not authenticated", 401);
    }

    const { reqData } = req.body;
    const { groupId, searchText } = reqData || {};

    if (!searchText || searchText.trim() === "") {
      return sendError(res, "Search text is required", 400);
    }

    // Build where clause
    const whereClause = {
      content: {
        [Op.iLike]: `%${searchText.trim()}%`,
      },
    };

    // If groupId provided, filter by group and verify membership
    if (groupId) {
      const userType = user.role === "Guest" ? "Guest" : "User";
      const membership = await GroupMember.findOne({
        where: {
          groupId: parseInt(groupId),
          userId: user.id,
          userType,
        },
      });

      if (!membership) {
        return sendError(res, "You are not a member of this group", 403);
      }

      whereClause.groupId = parseInt(groupId);
    } else {
      // If no groupId, only search in groups user is a member of
      const userType = user.role === "Guest" ? "Guest" : "User";
      const memberships = await GroupMember.findAll({
        where: {
          userId: user.id,
          userType,
        },
      });

      const groupIds = memberships.map((m) => m.groupId);
      if (groupIds.length === 0) {
        return sendSuccess(res, { messages: [] });
      }

      whereClause.groupId = {
        [Op.in]: groupIds,
      };
    }

    // Search messages
    // Note: We don't need to join with User/Guest since senderName is already stored in the message
    const messages = await Message.findAll({
      where: whereClause,
      order: [["createdOnUTC", "DESC"]],
      limit: 100, // Limit search results
    });

    // Format messages
    // senderName is already stored in the message, so we can use it directly
    const formattedMessages = messages.map((msg) => {
      // Use stored senderName, or fallback if somehow missing
      let senderName = msg.senderName || "Unknown";
      
      // Only fetch from database if senderName is missing (shouldn't happen normally)
      // This is a safety fallback
      if (!msg.senderName) {
        console.warn(`[SearchMessages] Message ${msg.id} missing senderName, will need to fetch`);
      }

      return {
        id: msg.id.toString(),
        groupId: msg.groupId.toString(),
        sender: msg.sender.toString(),
        senderName,
        type: msg.type,
        content: msg.content,
        timestamp: msg.createdOnUTC.toISOString(),
        fileType: msg.fileType || undefined,
        fileSize: msg.fileSize || undefined,
        fileName: msg.fileName || undefined,
        duration: msg.duration || undefined,
        fileUrl: msg.fileUrl || undefined,
        createdBy: msg.createdBy?.toString() || "",
        lastModifiedBy: msg.lastModifiedBy?.toString() || "",
        createdOnUTC: msg.createdOnUTC,
      };
    });

    return sendSuccess(res, {
      messages: formattedMessages,
    });
  } catch (error) {
    return sendError(res, error.message || "Failed to search messages", 500);
  }
};
