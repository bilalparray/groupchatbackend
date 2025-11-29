// models/Guest.js
import { DataTypes } from "sequelize";

const createGuestModel = (sequelize) => {
  const Guest = sequelize.define("Guest", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    name: { type: DataTypes.STRING, allowNull: false },

    guestKeyId: { type: DataTypes.INTEGER, allowNull: false },

    status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      defaultValue: "Active",
    },
  },
  {
    timestamps: true,
    createdAt: "createdOnUTC",
    updatedAt: "lastModifiedOnUTC",
  });

  return Guest;
};

export default createGuestModel;
