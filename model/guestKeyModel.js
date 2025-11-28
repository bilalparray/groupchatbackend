import { DataTypes } from "sequelize";

const createGuestKeyModel = (sequelize) => {
const GuestKey = sequelize.define("GuestKey", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  key: { type: DataTypes.STRING, allowNull: false, unique: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: false },
}, {
  timestamps: true,
  createdAt: "createdOnUTC",
  updatedAt: "lastModifiedOnUTC",
});


  return GuestKey;
};

export default createGuestKeyModel;
