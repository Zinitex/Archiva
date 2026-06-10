const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DocumentVersion = sequelize.define('DocumentVersion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  document_id: { type: DataTypes.INTEGER, allowNull: false },
  version_number: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  file_path: { type: DataTypes.STRING(500), allowNull: true },
  original_filename: { type: DataTypes.STRING(255), allowNull: true },
  file_size: { type: DataTypes.INTEGER, allowNull: true },
  mime_type: { type: DataTypes.STRING(100), allowNull: true },
  uploaded_by: { type: DataTypes.INTEGER, allowNull: false },
  note: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'document_versions',
  timestamps: true,
});

module.exports = DocumentVersion;
