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
    // Always check if sender is a guest and fetch name from database to ensure accuracy
    const formattedMessages = await Promise.all(
      messages.map(async (msg) => {
        let senderName = msg.senderName || "Unknown";
        const originalSenderName = senderName;
        
        // Always check if sender is a guest by looking up in Guest table
        // This ensures we get the correct name even if message was stored with "Guest"
        try {
          console.log(`[GetMessages] Processing message ${msg.id}, sender: ${msg.sender}, stored senderName: "${senderName}"`);
          
          // Try to find guest by sender ID - use multiple strategies
          let guestRecord = null;
          const senderId = parseInt(msg.sender);
          
          // Strategy 1: Integer ID
          if (!isNaN(senderId)) {
            guestRecord = await Guest.findByPk(senderId);
            console.log(`[GetMessages] Strategy 1 - Guest lookup by int ID ${senderId}:`, guestRecord ? `FOUND - ${guestRecord.name}` : 'NOT FOUND');
          }
          
          // Strategy 2: String ID
          if (!guestRecord) {
            guestRecord = await Guest.findByPk(msg.sender.toString());
            console.log(`[GetMessages] Strategy 2 - Guest lookup by string ID "${msg.sender}":`, guestRecord ? `FOUND - ${guestRecord.name}` : 'NOT FOUND');
          }
          
          // Strategy 3: Try all guests and match by ID (last resort)
          if (!guestRecord) {
            const allGuests = await Guest.findAll();
            guestRecord = allGuests.find(g => g.id === senderId || g.id.toString() === msg.sender.toString());
            console.log(`[GetMessages] Strategy 3 - Searched ${allGuests.length} guests, found:`, guestRecord ? `YES - ${guestRecord.name}` : 'NO');
          }
          
          if (guestRecord) {
            console.log(`[GetMessages] Found guest record for sender ${msg.sender}:`, JSON.stringify(guestRecord.toJSON(), null, 2));
            if (guestRecord.name && guestRecord.name.trim() && guestRecord.name.trim() !== "Guest") {
              // Format as "guestName (Guest)" to identify it's a guest
              const guestName = guestRecord.name.trim();
              senderName = `${guestName} (Guest)`;
              if (originalSenderName !== senderName) {
                console.log(`[GetMessages] ✅ Updated senderName for message ${msg.id} from "${originalSenderName}" to "${senderName}"`);
              } else {
                console.log(`[GetMessages] ✅ SenderName already correct: "${senderName}"`);
              }
            } else {
              console.log(`[GetMessages] ⚠️ Guest record found but name is empty/invalid for sender ${msg.sender}`);
              // If stored name is "Guest", try to use a better default
              if (originalSenderName === "Guest" || originalSenderName === "guest" || originalSenderName === "Guest (Guest)") {
                senderName = "Unknown Guest (Guest)";
                console.log(`[GetMessages] 🔧 Updated empty guest name to: "${senderName}"`);
              }
            }
          } else {
            // Not a guest, check if it's a regular user
            console.log(`[GetMessages] No guest record found for sender ${msg.sender}, checking User table...`);
            const userRecord = await User.findByPk(senderId || msg.sender);
            if (userRecord) {
              senderName = userRecord.username || userRecord.email || senderName;
              console.log(`[GetMessages] Found user record, senderName: "${senderName}"`);
            } else {
              console.log(`[GetMessages] ⚠️ No guest or user record found for sender ${msg.sender}`);
              // If it was stored as "Guest" and we can't find the record, at least format it properly
              if (originalSenderName === "Guest" || originalSenderName === "guest") {
                senderName = "Unknown Guest (Guest)";
                console.log(`[GetMessages] 🔧 Updated unknown guest to: "${senderName}"`);
              }
            }
          }
        } catch (error) {
          console.error(`[GetMessages] ❌ Error fetching sender name for message ${msg.id}:`, error);
          // Keep the stored senderName if lookup fails
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
      })
    );

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
      // For guests, always fetch from database to ensure we have the correct name
      // This is more reliable than relying on the token
      console.log(`[SendMessage] Looking up guest with ID: ${user.id} (type: ${typeof user.id}), user object:`, JSON.stringify(user, null, 2));
      
      let guestRecord = null;
      let guestName = null;
      
      try {
        // Try multiple lookup strategies to ensure we find the guest
        // Strategy 1: Lookup by primary key (convert to integer)
        const guestId = parseInt(user.id);
        if (!isNaN(guestId)) {
          guestRecord = await Guest.findByPk(guestId);
          console.log(`[SendMessage] Strategy 1 - Guest record by PK (${guestId}):`, guestRecord ? JSON.stringify(guestRecord.toJSON(), null, 2) : 'NOT FOUND');
          if (guestRecord && guestRecord.name) {
            guestName = guestRecord.name.trim();
          }
        }
        
        // Strategy 2: If not found, try to find by name from token
        if (!guestName && user.name) {
          console.log(`[SendMessage] Strategy 2 - Trying to find guest by name: "${user.name}"`);
          const guestsByName = await Guest.findAll({
            where: { name: user.name.trim() },
            order: [['createdOnUTC', 'DESC']]
          });
          console.log(`[SendMessage] Found ${guestsByName.length} guests with name "${user.name}"`);
          if (guestsByName.length > 0) {
            // Use the most recent one
            guestRecord = guestsByName[0];
            if (guestRecord && guestRecord.name) {
              guestName = guestRecord.name.trim();
            }
            console.log(`[SendMessage] Using guest record from name lookup:`, JSON.stringify(guestRecord.toJSON(), null, 2));
          }
        }
        
        // Strategy 3: If still not found, try string ID
        if (!guestName) {
          console.log(`[SendMessage] Strategy 3 - Trying to find guest by string ID: "${user.id}"`);
          guestRecord = await Guest.findByPk(user.id.toString());
          console.log(`[SendMessage] Guest record by string ID:`, guestRecord ? JSON.stringify(guestRecord.toJSON(), null, 2) : 'NOT FOUND');
          if (guestRecord && guestRecord.name) {
            guestName = guestRecord.name.trim();
          }
        }
        
        // Strategy 4: Last resort - try to find ANY guest with this ID (case-insensitive)
        if (!guestName) {
          console.log(`[SendMessage] Strategy 4 - Last resort lookup for guest ID: ${user.id}`);
          const allGuests = await Guest.findAll({
            where: { id: guestId || user.id }
          });
          if (allGuests.length > 0 && allGuests[0].name) {
            guestName = allGuests[0].name.trim();
            console.log(`[SendMessage] Found guest via last resort: "${guestName}"`);
          }
        }
        
      } catch (error) {
        console.error(`[SendMessage] ❌ Error fetching guest name for ${user.id}:`, error);
      }
      
      // Determine final senderName
      if (guestName && guestName !== "Guest" && guestName.trim() !== "") {
        // Format as "guestName (Guest)" to identify it's a guest
        senderName = `${guestName} (Guest)`;
        console.log(`[SendMessage] ✅ Guest ${user.id} name from DB: "${guestName}" -> formatted as: "${senderName}"`);
      } else if (user.name && user.name.trim() && user.name.trim() !== "Guest") {
        // Use name from token if available
        senderName = `${user.name.trim()} (Guest)`;
        console.log(`[SendMessage] ⚠️ Guest ${user.id} name from token: "${user.name}" -> formatted as: "${senderName}"`);
      } else {
        // Absolute last resort - use "Unknown Guest" instead of just "Guest"
        senderName = "Unknown Guest (Guest)";
        console.error(`[SendMessage] ❌ CRITICAL: Could not find guest name for ID ${user.id}. Using "Unknown Guest (Guest)"`);
        console.error(`[SendMessage] User object:`, JSON.stringify(user, null, 2));
      }
      
      // Final safety check - NEVER allow just "Guest"
      if (!senderName || senderName === "Guest" || senderName.trim() === "" || senderName === "Guest (Guest)") {
        senderName = "Unknown Guest (Guest)";
        console.error(`[SendMessage] 🔧 CRITICAL: Final safety check triggered. Forcing senderName to: "${senderName}"`);
      }
    } else {
      const userRecord = await User.findByPk(user.id);
      senderName = userRecord
        ? userRecord.username || userRecord.email
        : user.username || "User";
    }
    
    console.log(`[SendMessage] Final senderName for user ${user.id} (${user.role}): "${senderName}"`);
    
    // Ensure we never store "Guest" - if we still have "Guest", something is wrong
    if (senderName === "Guest" && user.role === "Guest") {
      console.error(`[SendMessage] ⚠️ WARNING: Still have "Guest" as name for user ${user.id}. User object:`, JSON.stringify(user, null, 2));
      // Last resort: try to get name from token
      if (user.name && user.name.trim() && user.name.trim() !== "Guest") {
        senderName = user.name.trim();
        console.log(`[SendMessage] 🔧 Using token name as last resort: "${senderName}"`);
      }
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
    // Always check if sender is a guest and fetch name from database to ensure accuracy
    const formattedMessages = await Promise.all(
      messages.map(async (msg) => {
        let senderName = msg.senderName || "Unknown";
        const originalSenderName = senderName;
        
        // Always check if sender is a guest by looking up in Guest table
        // This ensures we get the correct name even if message was stored with "Guest"
        try {
          const guestRecord = await Guest.findByPk(msg.sender);
          if (guestRecord) {
            console.log(`[SearchMessages] Found guest record for sender ${msg.sender}:`, JSON.stringify(guestRecord.toJSON(), null, 2));
            if (guestRecord.name) {
              // Format as "guestName (Guest)" to identify it's a guest
              const guestName = guestRecord.name.trim();
              senderName = `${guestName} (Guest)`;
              if (originalSenderName !== senderName) {
                console.log(`[SearchMessages] ✅ Updated senderName for message ${msg.id} from "${originalSenderName}" to "${senderName}"`);
              } else {
                console.log(`[SearchMessages] ✅ SenderName already correct: "${senderName}"`);
              }
            } else {
              console.log(`[SearchMessages] ⚠️ Guest record found but name is empty for sender ${msg.sender}`);
              // If stored name is "Guest", format it properly
              if (originalSenderName === "Guest" || originalSenderName === "guest") {
                senderName = "Guest (Guest)";
              }
            }
          } else {
            // Not a guest, check if it's a regular user
            console.log(`[SearchMessages] No guest record found for sender ${msg.sender}, checking User table...`);
            const userRecord = await User.findByPk(msg.sender);
            if (userRecord) {
              senderName = userRecord.username || userRecord.email || senderName;
              console.log(`[SearchMessages] Found user record, senderName: "${senderName}"`);
            } else {
              console.log(`[SearchMessages] ⚠️ No guest or user record found for sender ${msg.sender}`);
            }
          }
        } catch (error) {
          console.error(`[SearchMessages] ❌ Error fetching sender name for message ${msg.id}:`, error);
          // Keep the stored senderName if lookup fails
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
      })
    );

    return sendSuccess(res, {
      messages: formattedMessages,
    });
  } catch (error) {
    return sendError(res, error.message || "Failed to search messages", 500);
  }
};
