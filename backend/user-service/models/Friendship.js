const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Friendship = sequelize.define('Friendship', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user1Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  user2Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    defaultValue: 'pending'
  },
  requestSenderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['user1Id', 'user2Id']
    }
  ]
});

// Associations
User.hasMany(Friendship, { foreignKey: 'user1Id', as: 'friendships1' });
User.hasMany(Friendship, { foreignKey: 'user2Id', as: 'friendships2' });
Friendship.belongsTo(User, { foreignKey: 'user1Id', as: 'user1' });
Friendship.belongsTo(User, { foreignKey: 'user2Id', as: 'user2' });

module.exports = Friendship;
