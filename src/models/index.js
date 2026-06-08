const User = require('./User');
const Category = require('./Category');
const Document = require('./Document');

// User <-> Document
User.hasMany(Document, { foreignKey: 'user_id', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Category <-> Document
Category.hasMany(Document, { foreignKey: 'category_id', as: 'documents' });
Document.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

module.exports = { User, Category, Document };
