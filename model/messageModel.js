import { DataTypes } from "sequelize";

const createMessageModel = (sequelize) => {
  const Message = sequelize.define(
    "Message",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      groupId: { type: DataTypes.INTEGER, allowNull: false },
      sender: { type: DataTypes.INTEGER, allowNull: false },
      senderName: { type: DataTypes.STRING, allowNull: false },
      type: {
        type: DataTypes.ENUM("text", "file", "voice"),
        allowNull: false,
        defaultValue: "text",
      },
      content: { type: DataTypes.TEXT, allowNull: false },
      fileType: { type: DataTypes.STRING, allowNull: true },
      fileSize: { type: DataTypes.STRING, allowNull: true },
      fileName: { type: DataTypes.STRING, allowNull: true },
      duration: { type: DataTypes.STRING, allowNull: true },
      fileUrl: { type: DataTypes.STRING, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: false },
      lastModifiedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      timestamps: true,
      createdAt: "createdOnUTC",
      updatedAt: "lastModifiedOnUTC",
    }
  );

  return Message;
};

export default createMessageModel;
