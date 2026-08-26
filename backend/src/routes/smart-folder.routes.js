const express = require('express');
const router = express.Router();
const { listSmartFolders, createSmartFolder, deleteSmartFolder } = require('../controllers/smart-folder.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/', listSmartFolders);
router.post('/', createSmartFolder);
router.delete('/:id', deleteSmartFolder);

module.exports = router;
