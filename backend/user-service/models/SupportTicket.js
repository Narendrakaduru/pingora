const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SupportTicket = sequelize.define('SupportTicket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  topic: {
    type: DataTypes.ENUM('Bug report', 'Feature request', 'Account issue', 'Billing question', 'Other'),
    allowNull: false,
    defaultValue: 'Other',
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
    allowNull: false,
    defaultValue: 'open',
  },
  adminFeedback: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

}, {
  timestamps: true,
  tableName: 'support_tickets',
});

module.exports = SupportTicket;
