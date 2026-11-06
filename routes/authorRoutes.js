const express = require('express');
const c = require('../controllers/authorController');

const router = express.Router();

router.post('/', c.createAuthor);
router.get('/', c.getAuthors);
router.get('/:id/books', c.getAuthorBooks);
router.get('/:id/stats', c.getAuthorStats);
router.get('/:id', c.getAuthor);
router.put('/:id', c.updateAuthor);
router.delete('/:id', c.deleteAuthor);

module.exports = router;
