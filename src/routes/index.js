const router = require('express').Router();

router.use('/auth', require('./auth'));
router.use('/categories', require('./categories'));
router.use('/documents', require('./documents'));

module.exports = router;
