import { DataTypes } from "sequelize";

const createGroupMemberModel = (sequelize) => {
  const GroupMember = sequelize.define(
    "GroupMember",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      groupId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      userType: {
        type: DataTypes.ENUM("User", "Guest"),
        allowNull: false,
        defaultValue: "User",
      },
      createdBy: { type: DataTypes.INTEGER, allowNull: false },
      lastModifiedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      timestamps: true,
      createdAt: "createdOnUTC",
      updatedAt: "lastModifiedOnUTC",
      indexes: [
        {
          unique: true,
          fields: ["groupId", "userId"], // One membership per user per group (regardless of type)
        },
      ],
    }
  );

  return GroupMember;
};

export default createGroupMemberModel;
