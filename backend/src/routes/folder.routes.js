const express = require('express');
const router = express.Router();
const { listFolders, createFolder, renameFolder, deleteFolder } = require('../controllers/folder.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/', listFolders);
router.post('/', createFolder);
router.put('/:id', renameFolder);
router.delete('/:id', deleteFolder);

module.exports = router;
