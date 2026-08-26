const express = require('express');
const router = express.Router();
const { listShares, revokeShare } = require('../controllers/share.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/', listShares);
router.delete('/:id', revokeShare);

module.exports = router;
