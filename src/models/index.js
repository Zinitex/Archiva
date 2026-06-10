const User = require('./User');
const Category = require('./Category');
const Document = require('./Document');
const DocumentVersion = require('./DocumentVersion');
const DocumentHistory = require('./DocumentHistory');
const Comment = require('./Comment');

// User <-> Document
User.hasMany(Document, { foreignKey: 'user_id', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Category <-> Document
Category.hasMany(Document, { foreignKey: 'category_id', as: 'documents' });
Document.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Document <-> DocumentVersion
Document.hasMany(DocumentVersion, { foreignKey: 'document_id', as: 'versions' });
DocumentVersion.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });
User.hasMany(DocumentVersion, { foreignKey: 'uploaded_by', as: 'uploadedVersions' });
DocumentVersion.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// Document <-> DocumentHistory
Document.hasMany(DocumentHistory, { foreignKey: 'document_id', as: 'histories' });
DocumentHistory.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });
User.hasMany(DocumentHistory, { foreignKey: 'user_id', as: 'histories' });
DocumentHistory.belongsTo(User, { foreignKey: 'user_id', as: 'actor' });

// Document <-> Comment
Document.hasMany(Comment, { foreignKey: 'document_id', as: 'comments' });
Comment.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });
User.hasMany(Comment, { foreignKey: 'user_id', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = { User, Category, Document, DocumentVersion, DocumentHistory, Comment };
