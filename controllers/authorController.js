const Author = require('../models/Author');
const Book = require('../models/Book');
const { isValidId } = require('../utils/validators');

// POST /authors
exports.createAuthor = async (req, res, next) => {
  try {
    const { name, country, bio } = req.body;
    const author = await Author.create({ name, country, bio });
    res.status(201).json(author);
  } catch (err) {
    next(err);
  }
};

// GET /authors
exports.getAuthors = async (req, res, next) => {
  try {
    const authors = await Author.find().sort({ name: 1 });
    res.json(authors);
  } catch (err) {
    next(err);
  }
};

// GET /authors/:id
exports.getAuthor = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid author id' });
    const author = await Author.findById(req.params.id);
    if (!author) return res.status(404).json({ message: 'Author not found' });
    res.json(author);
  } catch (err) {
    next(err);
  }
};

// PUT /authors/:id
exports.updateAuthor = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid author id' });
    const { name, country, bio } = req.body;
    const author = await Author.findByIdAndUpdate(
      req.params.id,
      { name, country, bio },
      { new: true, runValidators: true }
    );
    if (!author) return res.status(404).json({ message: 'Author not found' });
    res.json(author);
  } catch (err) {
    next(err);
  }
};

// DELETE /authors/:id
// Policy (Option A - BLOCK): an author who still has books cannot be deleted.
exports.deleteAuthor = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid author id' });
    const author = await Author.findById(req.params.id);
    if (!author) return res.status(404).json({ message: 'Author not found' });

    const bookCount = await Book.countDocuments({ author: author._id });
    if (bookCount > 0) {
      return res.status(409).json({
        message: `Cannot delete ${author.name}: they still have ${bookCount} book(s). Delete or move those books first.`,
        bookCount,
      });
    }

    await author.deleteOne();
    res.json({ message: 'Author deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /authors/:id/books
exports.getAuthorBooks = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid author id' });
    const author = await Author.findById(req.params.id);
    if (!author) return res.status(404).json({ message: 'Author not found' });
    const books = await Book.find({ author: author._id }).populate('author');
    res.json(books);
  } catch (err) {
    next(err);
  }
};

// GET /authors/:id/stats
exports.getAuthorStats = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid author id' });
    const author = await Author.findById(req.params.id);
    if (!author) return res.status(404).json({ message: 'Author not found' });

    const books = await Book.find({ author: author._id });

    // No books: return safe values instead of crashing
    if (books.length === 0) {
      return res.json({
        author: author.name,
        bookCount: 0,
        averagePrice: 0,
        cheapestBook: null,
        mostExpensiveBook: null,
      });
    }

    const total = books.reduce((sum, b) => sum + b.price, 0);
    const cheapest = books.reduce((min, b) => (b.price < min.price ? b : min));
    const priciest = books.reduce((max, b) => (b.price > max.price ? b : max));

    res.json({
      author: author.name,
      bookCount: books.length,
      averagePrice: Math.round((total / books.length) * 100) / 100,
      cheapestBook: cheapest.title,
      mostExpensiveBook: priciest.title,
    });
  } catch (err) {
    next(err);
  }
};
