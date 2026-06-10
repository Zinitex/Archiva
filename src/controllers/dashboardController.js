const { Document, User, Category } = require('../models');
const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

const getStats = async (req, res) => {
  try {
    const statusCounts = await Document.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const statusMap = { draft: 0, reviewed: 0, approved: 0, rejected: 0, archived: 0 };
    statusCounts.forEach(({ status, count }) => {
      statusMap[status] = parseInt(count);
    });

    const totalDocuments = Object.values(statusMap).reduce((a, b) => a + b, 0);

    const categoryCounts = await Document.findAll({
      attributes: ['category_id', [sequelize.fn('COUNT', sequelize.col('Document.id')), 'count']],
      include: [{ model: Category, as: 'category', attributes: ['name'] }],
      group: ['category_id', 'category.id', 'category.name'],
      raw: true,
    });

    const totalUsers = await User.count();

    const userRoleCounts = await User.findAll({
      attributes: ['role', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['role'],
      raw: true,
    });
    const roleMap = { uploader: 0, reviewer: 0, approver: 0, admin: 0 };
    userRoleCounts.forEach(({ role, count }) => {
      roleMap[role] = parseInt(count);
    });

    return res.json({
      data: {
        documents: {
          total: totalDocuments,
          by_status: statusMap,
        },
        users: {
          total: totalUsers,
          by_role: roleMap,
        },
        documents_by_category: categoryCounts.map((row) => ({
          category_id: row.category_id,
          category_name: row['category.name'],
          count: parseInt(row.count),
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getStats };
