const Book = require('../models/Book');
const Author = require('../models/Author');
const { isValidId, checkPriceAndYear } = require('../utils/validators');

// Case-insensitive duplicate check for one author (Rule 2).
// excludeId lets us ignore the book being updated.
const titleExistsForAuthor = async (authorId, title, excludeId) => {
  const filter = { author: authorId, title: title.trim() };
  if (excludeId) filter._id = { $ne: excludeId };
  const found = await Book.findOne(filter).collation({ locale: 'en', strength: 2 });
  return Boolean(found);
};

// POST /books
exports.createBook = async (req, res, next) => {
  try {
    const { title, genre, price, publishedYear, author } = req.body;

    // Missing fields -> 400
    const missing = ['title', 'genre', 'price', 'publishedYear', 'author'].filter(
      (f) => req.body[f] === undefined || req.body[f] === null || req.body[f] === ''
    );
    if (missing.length) {
      return res.status(400).json({ message: `Missing required field(s): ${missing.join(', ')}` });
    }

    // Rule 1: no orphan books -> 400
    if (!isValidId(author) || !(await Author.exists({ _id: author }))) {
      return res.status(400).json({ message: 'Author does not exist. Create the author first.' });
    }

    // Rule 3: price / year -> 422
    const problem = checkPriceAndYear({ price, publishedYear });
    if (problem) return res.status(422).json({ message: problem });

    // Rule 2: duplicate title for this author -> 409
    if (await titleExistsForAuthor(author, String(title))) {
      return res.status(409).json({ message: 'This author already has a book with that title' });
    }

    const book = await Book.create({ title, genre, price, publishedYear, author });
    await book.populate('author');
    res.status(201).json(book);
  } catch (err) {
    next(err);
  }
};

// GET /books  (dynamic filter + sort + optional pagination)
exports.getBooks = async (req, res, next) => {
  try {
    const { genre, minPrice, maxPrice, author, search, sort, order, page, limit } = req.query;
    const filter = {};

    // Only add a condition when its param is actually present
    if (genre) filter.genre = new RegExp(`^${escapeRegex(genre)}$`, 'i');

    if (author) {
      if (!isValidId(author)) return res.status(400).json({ message: 'Invalid author id' });
      filter.author = author;
    }

    if (search) filter.title = new RegExp(escapeRegex(search), 'i');

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) {
        if (isNaN(Number(minPrice))) return res.status(400).json({ message: 'minPrice must be a number' });
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined) {
        if (isNaN(Number(maxPrice))) return res.status(400).json({ message: 'maxPrice must be a number' });
        filter.price.$lte = Number(maxPrice);
      }
    }

    // Sorting: only allow known fields
    const sortableFields = ['price', 'title', 'publishedYear'];
    let sortOption = { createdAt: -1 };
    if (sort !== undefined) {
      if (!sortableFields.includes(sort)) {
        return res.status(400).json({ message: `sort must be one of: ${sortableFields.join(', ')}` });
      }
      sortOption = { [sort]: order === 'desc' ? -1 : 1 };
    }

    const total = await Book.countDocuments(filter);
    let query = Book.find(filter).sort(sortOption).populate('author');

    // Pagination (only when page or limit is sent; otherwise everything is returned)
    let pageNum = 1;
    let limitNum = total;
    if (page !== undefined || limit !== undefined) {
      pageNum = parseInt(page, 10) || 1;
      limitNum = parseInt(limit, 10) || 10;
      if (pageNum < 1 || limitNum < 1) {
        return res.status(400).json({ message: 'page and limit must be positive numbers' });
      }
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const results = await query;
    res.json({ page: pageNum, limit: limitNum, total, results });
  } catch (err) {
    next(err);
  }
};

// GET /books/:id
exports.getBook = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid book id' });
    const book = await Book.findById(req.params.id).populate('author');
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(book);
  } catch (err) {
    next(err);
  }
};

// PUT /books/:id
exports.updateBook = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid book id' });
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });

    const { title, genre, price, publishedYear, author } = req.body;

    // If the author changes, the new one must exist (Rule 1)
    if (author !== undefined && String(author) !== String(book.author)) {
      if (!isValidId(author) || !(await Author.exists({ _id: author }))) {
        return res.status(400).json({ message: 'Author does not exist.' });
      }
    }

    // Rule 3
    const problem = checkPriceAndYear({ price, publishedYear });
    if (problem) return res.status(422).json({ message: problem });

    // Rule 2 (uses the final title + final author)
    const finalTitle = title !== undefined ? String(title) : book.title;
    const finalAuthor = author !== undefined ? author : book.author;
    if (await titleExistsForAuthor(finalAuthor, finalTitle, book._id)) {
      return res.status(409).json({ message: 'This author already has a book with that title' });
    }

    if (title !== undefined) book.title = title;
    if (genre !== undefined) book.genre = genre;
    if (price !== undefined) book.price = price;
    if (publishedYear !== undefined) book.publishedYear = publishedYear;
    if (author !== undefined) book.author = author;

    await book.save();
    await book.populate('author');
    res.json(book);
  } catch (err) {
    next(err);
  }
};

// DELETE /books/:id
exports.deleteBook = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid book id' });
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json({ message: 'Book deleted' });
  } catch (err) {
    next(err);
  }
};

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
