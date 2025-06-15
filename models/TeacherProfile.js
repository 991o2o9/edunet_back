const mongoose = require('mongoose');

const teacherProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  bio: {
    type: String,
    default: '',
  },
  specialization: {
    type: String,
    default: '',
  },
  experience: {
    type: Number,
    default: 0,
  },
  education: {
    type: String,
    default: '',
  },
  avatar: {
    type: String,
    default: '',
  },
  rating: {
    type: Number,
    default: 0,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('TeacherProfile', teacherProfileSchema);
