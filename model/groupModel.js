import { DataTypes } from "sequelize";

const createGroupModel = (sequelize) => {
  const Group = sequelize.define(
    "Group",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      owner: { type: DataTypes.INTEGER, allowNull: false },
      inviteKey: { type: DataTypes.STRING, allowNull: false, unique: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: false },
      lastModifiedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      timestamps: true,
      createdAt: "createdOnUTC",
      updatedAt: "lastModifiedOnUTC",
    }
  );

  return Group;
};

export default createGroupModel;
