const mongoose = require('mongoose');

const teacherProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  teacherName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
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
    type: String,
    default: '0',
  },
  education: {
    type: String,
    default: '',
  },
  avatar: {
    type: String,
    default: '',
  },
  certifications: [
    {
      type: String,
    },
  ],
  expertise: [
    {
      type: String,
    },
  ],
  socialLinks: {
    linkedin: {
      type: String,
      default: '',
    },
    github: {
      type: String,
      default: '',
    },
    twitter: {
      type: String,
      default: '',
    },
    website: {
      type: String,
      default: '',
    },
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
