const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  profilePhoto: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  about: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Hey there! I am using Pingora.'
  },
  resetToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resetTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  privacy: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      lastSeen: 'everyone',
      profilePhoto: 'everyone',
      about: 'everyone',
      groups: 'everyone',
      status: 'everyone',
      acceptRequests: true,
      blockedContacts: [],
      lastSeenSelected: [],
      profilePhotoSelected: [],
      aboutSelected: [],
      groupsSelected: [],
      statusSelected: []
    }
  },
  accountType: {
    type: DataTypes.ENUM('normal', 'pro'),
    allowNull: false,
    defaultValue: 'normal'
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    allowNull: false,
    defaultValue: 'user'
  },

}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
        if (user.changed('password')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }
    }
  },
});

User.prototype.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;
