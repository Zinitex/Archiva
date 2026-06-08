const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  category_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  file_path: { type: DataTypes.STRING(500), allowNull: true },
  original_filename: { type: DataTypes.STRING(255), allowNull: true },
  file_size: { type: DataTypes.INTEGER, allowNull: true },
  mime_type: { type: DataTypes.STRING(100), allowNull: true },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
  },
}, {
  tableName: 'documents',
  timestamps: true,
});

module.exports = Document;
