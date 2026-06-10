const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DocumentHistory = sequelize.define('DocumentHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  document_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  action: {
    type: DataTypes.ENUM('created', 'updated', 'reviewed', 'approved', 'rejected', 'archived', 'resubmitted', 'commented'),
    allowNull: false,
  },
  old_status: {
    type: DataTypes.ENUM('draft', 'reviewed', 'approved', 'rejected', 'archived'),
    allowNull: true,
  },
  new_status: {
    type: DataTypes.ENUM('draft', 'reviewed', 'approved', 'rejected', 'archived'),
    allowNull: true,
  },
  note: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'document_histories',
  timestamps: true,
});

module.exports = DocumentHistory;
