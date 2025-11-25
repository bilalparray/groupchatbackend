import { DataTypes } from 'sequelize';

const createUserModel = (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING, allowNull: false },

    // Allow null or string only
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isString(value) {
          if (value !== null && typeof value !== 'string') {
            throw new Error('refreshToken must be a string');
          }
        },
      },
    },

    role: { type: DataTypes.ENUM('SuperAdmin','Admin', 'endUser','Guest'), allowNull: false, defaultValue: 'SuperAdmin' },
    createdBy: { type: DataTypes.INTEGER, allowNull: true },
    lastModifiedBy: { type: DataTypes.INTEGER, allowNull: true },
    resetToken: { type: DataTypes.STRING, allowNull: true },
    resetTokenExpiry: { type: DataTypes.DATE, allowNull: true },
  }, {
    timestamps: true,
    createdAt: 'createdOnUTC',
    updatedAt: 'lastModifiedOnUTC',
  });

  return User;
};

export default createUserModel;
