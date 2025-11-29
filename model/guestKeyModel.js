// models/GuestKey.js
import { DataTypes } from "sequelize";

const createGuestKeyModel = (sequelize) => {
  const GuestKey = sequelize.define(
    "GuestKey",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

      key: { type: DataTypes.STRING, allowNull: false, unique: true },

      department: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "General",
      },

      createdBy: { type: DataTypes.INTEGER, allowNull: false },

      status: {
        type: DataTypes.ENUM("Enabled", "Disabled"),
        defaultValue: "Enabled",
      },

      totalGuestsRegistered: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      activeGuestsCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      timestamps: true,
      createdAt: "createdOnUTC",
      updatedAt: "lastModifiedOnUTC",
    }
  );

  return GuestKey;
};

export default createGuestKeyModel;
