import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

// Models
import createUserModel from "../model/userModel.js";
import createGuestKeyModel from "../model/guestKeyModel.js";
import createGuestModel from "../model/guestModel.js";

//import refundModel from "../model/refund.model.js";

// Variables
let User = null;
let GuestKey = null;
let Guest = null;

// DB Connection
// export const dbConnection = async (database, username, password) => {
//   const sequelize = new Sequelize(database, username, password, {
//     host: "localhost",
//     dialect: "postgres",
//   });
//  Production DB connection (commented)
export const dbConnection = async () => {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    protocol: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Required for Railway PostgreSQL SSL
      },
    },
  });
  try {
    await sequelize.authenticate();
    console.log("✅ DB Authenticated");

    // Initialize models
    User = await createUserModel(sequelize);
    GuestKey = await createGuestKeyModel(sequelize);
    Guest = await createGuestModel(sequelize);

    //Refund = await refundModel(sequelize);

    //Check this

    // Database Sync
    await sequelize.sync();
    console.log("✅ Connection has been established successfully.");

    return {
      sequelize,
      models: {
        User,
        GuestKey,
        Guest,
      },
    };
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    throw error;
  }
};

// Export models
export { User, GuestKey, Guest };
