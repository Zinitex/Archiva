const { Comment, Document, User, DocumentHistory } = require('../models');

const COMMENT_ROLES = ['reviewer', 'approver', 'admin'];

const getComments = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    const isOwner = document.user_id === req.user.id;
    if (!COMMENT_ROLES.includes(req.user.role) && !isOwner) {
      return res.status(403).json({ message: 'Tidak diizinkan melihat komentar dokumen ini' });
    }

    const comments = await Comment.findAll({
      where: { document_id: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['createdAt', 'ASC']],
    });

    return res.json({ data: comments });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const addComment = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    const isOwner = document.user_id === req.user.id;
    if (!COMMENT_ROLES.includes(req.user.role) && !isOwner) {
      return res.status(403).json({ message: 'Tidak diizinkan menambah komentar pada dokumen ini' });
    }

    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'content komentar wajib diisi' });

    const comment = await Comment.create({
      document_id: document.id,
      user_id: req.user.id,
      content,
    });

    await DocumentHistory.create({
      document_id: document.id,
      user_id: req.user.id,
      action: 'commented',
      old_status: document.status,
      new_status: document.status,
      note: content,
    });

    const result = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }],
    });

    return res.status(201).json({ message: 'Komentar berhasil ditambahkan', data: result });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getComments, addComment };
