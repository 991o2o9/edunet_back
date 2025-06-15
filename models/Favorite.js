const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  courseId: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure a user can't favorite the same course twice
favoriteSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
