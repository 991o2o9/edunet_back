require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Favorite = require('./models/Favorite');
const Course = require('./models/Course');
const Lesson = require('./models/Lesson');
const Enrollment = require('./models/Enrollment');
const Homework = require('./models/Homework');
const CourseReview = require('./models/CourseReview');
const CourseApplication = require('./models/CourseApplication');
const Payment = require('./models/Payment');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Middleware to check if user is admin
function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// Middleware to check if user is teacher
function isTeacher(req, res, next) {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Teacher access required' });
  }
  next();
}

// Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      role,
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add course to favorites
app.post('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.userId;

    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    const favorite = new Favorite({
      userId,
      courseId,
    });

    await favorite.save();

    const userFavorites = await Favorite.find({ userId });
    res.json({
      message: 'Course added to favorites',
      favorites: userFavorites.map((f) => f.courseId),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Course already in favorites' });
    }
    console.error('Add to favorites error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove course from favorites
app.delete('/api/favorites/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    await Favorite.findOneAndDelete({ userId, courseId });

    const userFavorites = await Favorite.find({ userId });
    res.json({
      message: 'Course removed from favorites',
      favorites: userFavorites.map((f) => f.courseId),
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's favorites
app.get('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const favorites = await Favorite.find({ userId });
    res.json(favorites.map((f) => f.courseId));
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Course endpoints
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find().populate('teacherId', 'name email');
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      'teacherId',
      'name email'
    );
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/courses', authenticateToken, isTeacher, async (req, res) => {
  try {
    const course = new Course({
      ...req.body,
      teacherId: req.user.userId,
    });
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Lesson endpoints
app.get('/api/courses/:courseId/lessons', async (req, res) => {
  try {
    const lessons = await Lesson.find({ courseId: req.params.courseId }).sort(
      'order'
    );
    res.json(lessons);
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/lessons', authenticateToken, isTeacher, async (req, res) => {
  try {
    const lesson = new Lesson(req.body);
    await lesson.save();
    res.status(201).json(lesson);
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Enrollment endpoints
app.post('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.body;
    const enrollment = new Enrollment({
      userId: req.user.userId,
      courseId,
    });
    await enrollment.save();
    res.status(201).json(enrollment);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: 'Already enrolled in this course' });
    }
    console.error('Enrollment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      userId: req.user.userId,
    }).populate('courseId');
    res.json(enrollments);
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Homework endpoints
app.get('/api/lessons/:lessonId/homework', async (req, res) => {
  try {
    const homework = await Homework.find({ lessonId: req.params.lessonId });
    res.json(homework);
  } catch (error) {
    console.error('Get homework error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/homework', authenticateToken, isTeacher, async (req, res) => {
  try {
    const homework = new Homework(req.body);
    await homework.save();
    res.status(201).json(homework);
  } catch (error) {
    console.error('Create homework error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Course Review endpoints
app.post(
  '/api/courses/:courseId/reviews',
  authenticateToken,
  async (req, res) => {
    try {
      const review = new CourseReview({
        userId: req.user.userId,
        courseId: req.params.courseId,
        ...req.body,
      });
      await review.save();
      res.status(201).json(review);
    } catch (error) {
      if (error.code === 11000) {
        return res
          .status(400)
          .json({ message: 'Already reviewed this course' });
      }
      console.error('Create review error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

app.get('/api/courses/:courseId/reviews', async (req, res) => {
  try {
    const reviews = await CourseReview.find({
      courseId: req.params.courseId,
    }).populate('userId', 'name');
    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Course Application endpoints
app.post(
  '/api/courses/:courseId/applications',
  authenticateToken,
  async (req, res) => {
    try {
      const application = new CourseApplication({
        userId: req.user.userId,
        courseId: req.params.courseId,
        ...req.body,
      });
      await application.save();
      res.status(201).json(application);
    } catch (error) {
      if (error.code === 11000) {
        return res
          .status(400)
          .json({ message: 'Already applied to this course' });
      }
      console.error('Create application error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

app.get('/api/applications', authenticateToken, isTeacher, async (req, res) => {
  try {
    const applications = await CourseApplication.find()
      .populate('userId', 'name email')
      .populate('courseId', 'title');
    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Payment endpoints
app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const payment = new Payment({
      userId: req.user.userId,
      ...req.body,
    });
    await payment.save();
    res.status(201).json(payment);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.userId }).populate(
      'courseId',
      'title'
    );
    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
