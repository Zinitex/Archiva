const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { Document, Category, User } = require('../models');

const getAll = async (req, res) => {
  try {
    const { search, category_id, status, page = 1, limit = 10 } = req.query;
    const where = {};

    if (search) where.title = { [Op.like]: `%${search}%` };
    if (category_id) where.category_id = category_id;
    if (status) where.status = status;

    if (req.user.role !== 'admin') {
      where.user_id = req.user.id;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Document.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({
      data: rows,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!document) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    return res.json({ data: document });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { title, description, category_id, status } = req.body;

    if (!title) return res.status(400).json({ message: 'title wajib diisi' });
    if (!category_id) return res.status(400).json({ message: 'category_id wajib diisi' });

    const category = await Category.findByPk(category_id);
    if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    const fileData = {};
    if (req.file) {
      fileData.file_path = req.file.path.replace(/\\/g, '/');
      fileData.original_filename = req.file.originalname;
      fileData.file_size = req.file.size;
      fileData.mime_type = req.file.mimetype;
    }

    const document = await Document.create({
      title,
      description,
      category_id,
      user_id: req.user.id,
      status: status || 'draft',
      ...fileData,
    });

    return res.status(201).json({ message: 'Dokumen berhasil dibuat', data: document });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    if (req.user.role !== 'admin' && document.user_id !== req.user.id) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ message: 'Tidak diizinkan mengubah dokumen ini' });
    }

    const { title, description, category_id, status } = req.body;

    if (category_id) {
      const category = await Category.findByPk(category_id);
      if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    }

    const updateData = { title, description, category_id, status };

    if (req.file) {
      if (document.file_path && fs.existsSync(document.file_path)) {
        fs.unlink(document.file_path, () => {});
      }
      updateData.file_path = req.file.path.replace(/\\/g, '/');
      updateData.original_filename = req.file.originalname;
      updateData.file_size = req.file.size;
      updateData.mime_type = req.file.mimetype;
    }

    await document.update(updateData);
    return res.json({ message: 'Dokumen berhasil diupdate', data: document });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    if (req.user.role !== 'admin' && document.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Tidak diizinkan menghapus dokumen ini' });
    }

    if (document.file_path && fs.existsSync(document.file_path)) {
      fs.unlink(document.file_path, () => {});
    }

    await document.destroy();
    return res.json({ message: 'Dokumen berhasil dihapus' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
