const express = require('express');
const router = express.Router();
const { listTags, createTag, updateTag, deleteTag } = require('../controllers/tag.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/', listTags);
router.post('/', createTag);
router.put('/:id', updateTag);
router.delete('/:id', deleteTag);

module.exports = router;
