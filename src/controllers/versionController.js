const { DocumentVersion, Document, User } = require('../models');

const VISIBLE_ROLES = ['reviewer', 'approver', 'admin'];

const getVersions = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    if (!VISIBLE_ROLES.includes(req.user.role) && document.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Tidak diizinkan melihat versi dokumen ini' });
    }

    const versions = await DocumentVersion.findAll({
      where: { document_id: req.params.id },
      include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'email'] }],
      order: [['version_number', 'ASC']],
    });

    return res.json({ data: versions });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getVersions };
