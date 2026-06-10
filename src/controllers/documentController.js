const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { Document, Category, User, DocumentVersion, DocumentHistory } = require('../models');

const VISIBLE_ROLES = ['reviewer', 'approver', 'admin'];

const getAll = async (req, res) => {
  try {
    const { search, category_id, status, page = 1, limit = 10 } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }
    if (category_id) where.category_id = category_id;
    if (status) where.status = status;

    if (!VISIBLE_ROLES.includes(req.user.role)) {
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

    if (!VISIBLE_ROLES.includes(req.user.role) && document.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Tidak diizinkan melihat dokumen ini' });
    }

    return res.json({ data: document });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { title, description, category_id } = req.body;

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
      status: 'draft',
      ...fileData,
    });

    if (req.file) {
      await DocumentVersion.create({
        document_id: document.id,
        version_number: 1,
        file_path: fileData.file_path,
        original_filename: fileData.original_filename,
        file_size: fileData.file_size,
        mime_type: fileData.mime_type,
        uploaded_by: req.user.id,
      });
    }

    await DocumentHistory.create({
      document_id: document.id,
      user_id: req.user.id,
      action: 'created',
      new_status: 'draft',
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

    const isOwner = document.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwner) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ message: 'Tidak diizinkan mengubah dokumen ini' });
    }

    if (!isAdmin && !['draft', 'rejected'].includes(document.status)) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'Dokumen hanya bisa diubah saat berstatus draft atau rejected' });
    }

    const { title, description, category_id } = req.body;

    if (category_id) {
      const category = await Category.findByPk(category_id);
      if (!category) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(404).json({ message: 'Kategori tidak ditemukan' });
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category_id !== undefined) updateData.category_id = category_id;

    if (req.file) {
      if (document.file_path && fs.existsSync(document.file_path)) {
        fs.unlink(document.file_path, () => {});
      }
      updateData.file_path = req.file.path.replace(/\\/g, '/');
      updateData.original_filename = req.file.originalname;
      updateData.file_size = req.file.size;
      updateData.mime_type = req.file.mimetype;

      const lastVersion = await DocumentVersion.findOne({
        where: { document_id: document.id },
        order: [['version_number', 'DESC']],
      });
      const nextVersion = lastVersion ? lastVersion.version_number + 1 : 1;

      await DocumentVersion.create({
        document_id: document.id,
        version_number: nextVersion,
        file_path: updateData.file_path,
        original_filename: updateData.original_filename,
        file_size: updateData.file_size,
        mime_type: updateData.mime_type,
        uploaded_by: req.user.id,
        note: req.body.version_note || null,
      });
    }

    await document.update(updateData);

    await DocumentHistory.create({
      document_id: document.id,
      user_id: req.user.id,
      action: 'updated',
      old_status: document.status,
      new_status: document.status,
    });

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

const review = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    if (document.status !== 'draft') {
      return res.status(400).json({ message: 'Hanya dokumen berstatus draft yang bisa direview' });
    }

    const { note } = req.body;
    const old_status = document.status;
    await document.update({ status: 'reviewed' });

    await DocumentHistory.create({
      document_id: document.id,
      user_id: req.user.id,
      action: 'reviewed',
      old_status,
      new_status: 'reviewed',
      note: note || null,
    });

    return res.json({ message: 'Dokumen berhasil direview', data: document });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const approve = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    if (document.status !== 'reviewed') {
      return res.status(400).json({ message: 'Hanya dokumen berstatus reviewed yang bisa diapprove' });
    }

    const { note } = req.body;
    const old_status = document.status;
    await document.update({ status: 'approved' });

    await DocumentHistory.create({
      document_id: document.id,
      user_id: req.user.id,
      action: 'approved',
      old_status,
      new_status: 'approved',
      note: note || null,
    });

    return res.json({ message: 'Dokumen berhasil diapprove', data: document });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const reject = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    if (!['draft', 'reviewed'].includes(document.status)) {
      return res.status(400).json({ message: 'Hanya dokumen berstatus draft atau reviewed yang bisa direject' });
    }

    const { note } = req.body;
    const old_status = document.status;
    await document.update({ status: 'rejected' });

    await DocumentHistory.create({
      document_id: document.id,
      user_id: req.user.id,
      action: 'rejected',
      old_status,
      new_status: 'rejected',
      note: note || null,
    });

    return res.json({ message: 'Dokumen berhasil direject', data: document });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const archive = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    if (document.status !== 'approved') {
      return res.status(400).json({ message: 'Hanya dokumen berstatus approved yang bisa diarsipkan' });
    }

    const { note } = req.body;
    const old_status = document.status;
    await document.update({ status: 'archived' });

    await DocumentHistory.create({
      document_id: document.id,
      user_id: req.user.id,
      action: 'archived',
      old_status,
      new_status: 'archived',
      note: note || null,
    });

    return res.json({ message: 'Dokumen berhasil diarsipkan', data: document });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const resubmit = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    if (req.user.role !== 'admin' && document.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Tidak diizinkan melakukan resubmit dokumen ini' });
    }

    if (document.status !== 'rejected') {
      return res.status(400).json({ message: 'Hanya dokumen berstatus rejected yang bisa diresubmit' });
    }

    const { note } = req.body;
    await document.update({ status: 'draft' });

    await DocumentHistory.create({
      document_id: document.id,
      user_id: req.user.id,
      action: 'resubmitted',
      old_status: 'rejected',
      new_status: 'draft',
      note: note || null,
    });

    return res.json({ message: 'Dokumen berhasil diresubmit', data: document });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    if (!VISIBLE_ROLES.includes(req.user.role) && document.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Tidak diizinkan melihat histori dokumen ini' });
    }

    const histories = await DocumentHistory.findAll({
      where: { document_id: req.params.id },
      include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['createdAt', 'ASC']],
    });

    return res.json({ data: histories });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove, review, approve, reject, archive, resubmit, getHistory };
