const router = require('express').Router();
const { getStats } = require('../controllers/dashboardController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roles');

router.get('/', authenticate, authorize('reviewer', 'approver', 'admin'), getStats);

module.exports = router;
