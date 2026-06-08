const router = require('express').Router();
const { getAll, getById, create, update, remove } = require('../controllers/documentController');
const { authenticate } = require('../middlewares/auth');
const upload = require('../config/multer');

router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getById);
router.post('/', authenticate, upload.single('file'), create);
router.put('/:id', authenticate, upload.single('file'), update);
router.delete('/:id', authenticate, remove);

module.exports = router;
