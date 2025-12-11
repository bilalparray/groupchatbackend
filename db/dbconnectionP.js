// db/dbconnectionP.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

// Model factories
import createUserModel from "../model/userModel.js";
import createGuestKeyModel from "../model/guestKeyModel.js";
import createGuestModel from "../model/guestModel.js";

/**
 * Establish DB connection and initialize models.
 * Returns: { sequelize, models: { User, GuestKey, Guest } }
 *
 * IMPORTANT: Do NOT export model variables at top-level.
 */
    let User = null;
    let GuestKey = null;
    let Guest =null;

export const dbConnection = async () => {
  console.log("DATABASE_URL:", !!process.env.DATABASE_URL);

  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    protocol: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log("✅ DB Authenticated");

    // Initialize models (model factories should return the model synchronously)
     User = createUserModel(sequelize);
     GuestKey = createGuestKeyModel(sequelize);
     Guest = createGuestModel(sequelize);

    // Define associations AFTER models are created
    GuestKey.hasMany(Guest, { foreignKey: "guestKeyId" });
    Guest.belongsTo(GuestKey, { foreignKey: "guestKeyId" });

    // Sync (use alter/migrate carefully in production)
    await sequelize.sync();
    console.log("✅ Models synced and connection ready.");

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

// NOTE: Do NOT export User/GuestKey/Guest here as top-level exports.
// Controllers should get models from the returned `models` object (or req.models).
