const router = require('express').Router();
const { getAll, getById, create, update, remove } = require('../controllers/categoryController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roles');

router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getById);
router.post('/', authenticate, authorize('admin'), create);
router.put('/:id', authenticate, authorize('admin'), update);
router.delete('/:id', authenticate, authorize('admin'), remove);

module.exports = router;
