const express = require('express');
const c = require('../controllers/bookController');

const router = express.Router();

router.post('/', c.createBook);
router.get('/', c.getBooks);
router.get('/:id', c.getBook);
router.put('/:id', c.updateBook);
router.delete('/:id', c.deleteBook);

module.exports = router;
