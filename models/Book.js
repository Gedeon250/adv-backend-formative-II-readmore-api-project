const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'title is required'], trim: true },
    genre: { type: String, required: [true, 'genre is required'], trim: true },
    price: { type: Number, required: [true, 'price is required'] },
    publishedYear: { type: Number, required: [true, 'publishedYear is required'] },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
      required: [true, 'author is required'],
    },
  },
  { timestamps: true }
);

// Safety net: one title per author, case-insensitive.
// (The controller checks first to give a friendly 409; this index stops race conditions.)
bookSchema.index(
  { author: 1, title: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model('Book', bookSchema);
