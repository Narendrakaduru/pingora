const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = require('./User');

const Status = sequelize.define('Status', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('text', 'image', 'video'),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT, // For text statuses, this is the text. For media, it's the file path.
    allowNull: false,
  },
  backgroundColor: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  viewers: {
    type: DataTypes.JSON,
    defaultValue: []
  },
}, {
  timestamps: true,
});

Status.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(Status, { as: 'statuses', foreignKey: 'userId' });

module.exports = Status;
