import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

// Models
import createUserModel from "../model/userModel.js";
import createGuestKeyModel from "../model/guestKeyModel.js"
import createGuestModel from "../model/guestModel.js"
import createGroupModel from "../model/groupModel.js";
import createMessageModel from "../model/messageModel.js";
import createGroupMemberModel from "../model/groupMemberModel.js";



// Variables
let User = null;
let GuestKey=null;
let Guest=null;
let Group = null;
let Message = null;
let GroupMember = null;


// DB Connection
export const dbConnection = async (database, username, password) => {
  const sequelize = new Sequelize(database, username, password, {
    host: "localhost",
    dialect: "postgres",
  });
//  Production DB connection (commented)
  // export const dbConnection = async () => {
  //   console.log("DATABASE_URL:", process.env.DATABASE_URL);
  //   const sequelize = new Sequelize(process.env.DATABASE_URL, {
  //     dialect: "postgres",
  //     protocol: "postgres",
  //     dialectOptions: {
  //       ssl: {
  //         require: true,
  //         rejectUnauthorized: false, // Required for Railway PostgreSQL SSL
  //       },
  //     },
  //   });
  try {
    await sequelize.authenticate();
    console.log("✅ DB Authenticated");

    // Initialize models
    User = await createUserModel(sequelize);
    GuestKey=await createGuestKeyModel(sequelize);
    Guest=await createGuestModel(sequelize);
    Group = await createGroupModel(sequelize);
    Message = await createMessageModel(sequelize);
    GroupMember = await createGroupMemberModel(sequelize);
 
    // Define relationships
    GuestKey.hasMany(Guest, { foreignKey: "guestKeyId" });
    Guest.belongsTo(GuestKey, { foreignKey: "guestKeyId" });

    // Group relationships
    User.hasMany(Group, { foreignKey: "owner", as: "ownedGroups" });
    Group.belongsTo(User, { foreignKey: "owner", as: "ownerUser" });
    
    Group.hasMany(Message, { foreignKey: "groupId", as: "messages" });
    Message.belongsTo(Group, { foreignKey: "groupId", as: "group" });
    
    Group.hasMany(GroupMember, { foreignKey: "groupId", as: "members" });
    GroupMember.belongsTo(Group, { foreignKey: "groupId", as: "group" });
    
    User.hasMany(GroupMember, { foreignKey: "userId", as: "groupMemberships" });
    GroupMember.belongsTo(User, { foreignKey: "userId", as: "user" });
    
    User.hasMany(Message, { foreignKey: "sender", as: "sentMessages" });
    Message.belongsTo(User, { foreignKey: "sender", as: "senderUser" });

    // Database Sync
    await sequelize.sync({ alter: true });
    console.log("✅ Connection has been established successfully.");

    return {
      sequelize,
      models: {
        User,
        GuestKey,
        Guest,
        Group,
        Message,
        GroupMember
      },
    };
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    throw error;
  }
};

// Export models
export {
  User,
  GuestKey,
  Guest,
  Group,
  Message,
  GroupMember
};
