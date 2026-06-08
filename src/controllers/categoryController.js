const { Category, Document } = require('../models');

const getAll = async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    return res.json({ data: categories });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    return res.json({ data: category });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Nama kategori wajib diisi' });

    const category = await Category.create({ name, description });
    return res.status(201).json({ message: 'Kategori berhasil dibuat', data: category });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Nama kategori sudah ada' });
    }
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    await category.update(req.body);
    return res.json({ message: 'Kategori berhasil diupdate', data: category });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    const docCount = await Document.count({ where: { category_id: req.params.id } });
    if (docCount > 0) {
      return res.status(409).json({ message: 'Kategori tidak bisa dihapus, masih digunakan oleh dokumen' });
    }

    await category.destroy();
    return res.json({ message: 'Kategori berhasil dihapus' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
