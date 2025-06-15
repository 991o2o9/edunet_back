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
const TeacherProfile = require('./models/TeacherProfile');

const app = express();
// Use the PORT environment variable provided by the hosting service, or fallback to 5000 for local development
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

// Get teacher profile(s)
app.get('/api/teacherProfiles', async (req, res) => {
  try {
    const { teacherId } = req.query;

    if (teacherId) {
      // Get single teacher profile
      const user = await User.findOne({ _id: teacherId, role: 'teacher' });
      if (!user) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      let teacherProfile = await TeacherProfile.findOne({ userId: teacherId });

      if (!teacherProfile) {
        teacherProfile = new TeacherProfile({
          userId: teacherId,
          bio: '',
          specialization: '',
          experience: 0,
          education: '',
        });
        await teacherProfile.save();
      }

      await teacherProfile.populate('userId', 'name email role');
      return res.json(teacherProfile);
    } else {
      // Get all teachers
      const teachers = await User.find({ role: 'teacher' });
      const teacherIds = teachers.map((teacher) => teacher._id);

      const teacherProfiles = await TeacherProfile.find({
        userId: { $in: teacherIds },
      }).populate('userId', 'name email role');

      // Create profiles for teachers who don't have one
      const existingProfileIds = teacherProfiles.map((profile) =>
        profile.userId._id.toString()
      );
      const missingProfiles = teachers.filter(
        (teacher) => !existingProfileIds.includes(teacher._id.toString())
      );

      if (missingProfiles.length > 0) {
        const newProfiles = missingProfiles.map((teacher) => ({
          userId: teacher._id,
          bio: '',
          specialization: '',
          experience: 0,
          education: '',
        }));

        await TeacherProfile.insertMany(newProfiles);

        // Fetch all profiles again including the newly created ones
        const allProfiles = await TeacherProfile.find({
          userId: { $in: teacherIds },
        }).populate('userId', 'name email role');
        return res.json(allProfiles);
      }

      return res.json(teacherProfiles);
    }
  } catch (error) {
    console.error('Get teacher profile(s) error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create or update teacher profile
app.post(
  '/api/teacherProfiles',
  authenticateToken,
  isTeacher,
  async (req, res) => {
    try {
      // First verify that the user exists
      const user = await User.findById(req.user.userId);
      if (!user) {
        console.error('User not found:', req.user.userId);
        return res.status(404).json({ message: 'User not found' });
      }

      const {
        bio,
        specialization,
        experience,
        education,
        avatar,
        certifications,
        expertise,
        socialLinks,
        teacherName,
        email,
      } = req.body;

      console.log('Received profile data:', req.body);

      // Find existing profile or create new one
      let teacherProfile = await TeacherProfile.findOne({
        userId: req.user.userId,
      });

      if (teacherProfile) {
        console.log('Updating existing profile for user:', req.user.userId);
        // Update existing profile
        teacherProfile.teacherName = teacherName || teacherProfile.teacherName;
        teacherProfile.email = email || teacherProfile.email;
        teacherProfile.bio = bio || teacherProfile.bio;
        teacherProfile.specialization =
          specialization || teacherProfile.specialization;
        teacherProfile.experience = experience || teacherProfile.experience;
        teacherProfile.education = education || teacherProfile.education;
        teacherProfile.avatar = avatar || teacherProfile.avatar;
        teacherProfile.certifications =
          certifications || teacherProfile.certifications;
        teacherProfile.expertise = expertise || teacherProfile.expertise;
        teacherProfile.socialLinks = socialLinks || teacherProfile.socialLinks;
        teacherProfile.updatedAt = Date.now();
      } else {
        console.log('Creating new profile for user:', req.user.userId);
        // Create new profile with required fields
        teacherProfile = new TeacherProfile({
          userId: req.user.userId,
          teacherName: teacherName || user.name,
          email: email || user.email,
          bio: bio || '',
          specialization: specialization || '',
          experience: experience || '0',
          education: education || '',
          avatar: avatar || '',
          certifications: certifications || [],
          expertise: expertise || [],
          socialLinks: socialLinks || {
            linkedin: '',
            github: '',
            twitter: '',
            website: '',
          },
        });
      }

      // Validate the profile before saving
      const validationError = teacherProfile.validateSync();
      if (validationError) {
        console.error('Validation error:', validationError);
        return res.status(400).json({
          message: 'Validation error',
          error: validationError.message,
        });
      }

      await teacherProfile.save();
      await teacherProfile.populate('userId', 'name email role');
      console.log('Profile saved successfully:', teacherProfile._id);
      res.json(teacherProfile);
    } catch (error) {
      console.error('Create/Update teacher profile error:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.userId,
        body: req.body,
      });
      res.status(500).json({
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
);

// Update specific teacher profile
app.put(
  '/api/teacherProfiles/:teacherId',
  authenticateToken,
  isTeacher,
  async (req, res) => {
    try {
      const { teacherId } = req.params;
      const {
        teacherName,
        email,
        bio,
        specialization,
        experience,
        education,
        avatar,
        certifications,
        expertise,
        socialLinks,
      } = req.body;

      // Verify that the teacher is updating their own profile
      if (teacherId !== req.user.userId.toString()) {
        return res
          .status(403)
          .json({ message: 'You can only update your own profile' });
      }

      // Find the profile
      let teacherProfile = await TeacherProfile.findOne({ userId: teacherId });

      if (!teacherProfile) {
        // Create new profile if it doesn't exist
        teacherProfile = new TeacherProfile({
          userId: teacherId,
          teacherName: teacherName || '',
          email: email || '',
          bio: bio || '',
          specialization: specialization || '',
          experience: experience || '0',
          education: education || '',
          avatar: avatar || '',
          certifications: certifications || [],
          expertise: expertise || [],
          socialLinks: socialLinks || {
            linkedin: '',
            github: '',
            twitter: '',
            website: '',
          },
        });
      } else {
        // Update existing profile
        teacherProfile.teacherName = teacherName || teacherProfile.teacherName;
        teacherProfile.email = email || teacherProfile.email;
        teacherProfile.bio = bio || teacherProfile.bio;
        teacherProfile.specialization =
          specialization || teacherProfile.specialization;
        teacherProfile.experience = experience || teacherProfile.experience;
        teacherProfile.education = education || teacherProfile.education;
        teacherProfile.avatar = avatar || teacherProfile.avatar;
        teacherProfile.certifications =
          certifications || teacherProfile.certifications;
        teacherProfile.expertise = expertise || teacherProfile.expertise;
        teacherProfile.socialLinks = {
          linkedin:
            socialLinks?.linkedin || teacherProfile.socialLinks?.linkedin || '',
          github:
            socialLinks?.github || teacherProfile.socialLinks?.github || '',
          twitter:
            socialLinks?.twitter || teacherProfile.socialLinks?.twitter || '',
          website:
            socialLinks?.website || teacherProfile.socialLinks?.website || '',
        };
        teacherProfile.updatedAt = Date.now();
      }

      await teacherProfile.save();
      await teacherProfile.populate('userId', 'name email role');
      res.json(teacherProfile);
    } catch (error) {
      console.error('Update teacher profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Get all users (admin only)
app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user (admin only)
app.put('/api/users/:userId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user
    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;

    await user.save();

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user (admin only)
app.delete(
  '/api/users/:userId',
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Delete user
      await User.findByIdAndDelete(userId);

      // If user is a teacher, also delete their profile
      if (user.role === 'teacher') {
        await TeacherProfile.findOneAndDelete({ userId });
      }

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Reset user password (admin only)
app.put(
  '/api/users/:userId/reset-password',
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: 'Password is required' });
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update password
      user.password = password;
      await user.save();

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Create first admin (only if no admin exists)
app.post('/api/setup-admin', async (req, res) => {
  try {
    // Check if any admin exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(403).json({ message: 'Admin already exists' });
    }

    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Create admin user
    const admin = new User({
      email,
      password,
      name,
      role: 'admin',
    });

    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Admin created successfully',
      token,
      user: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Promote user to admin (only by existing admin)
app.put(
  '/api/users/:userId/promote',
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user is already an admin
      if (user.role === 'admin') {
        return res.status(400).json({ message: 'User is already an admin' });
      }

      // Promote user to admin
      user.role = 'admin';
      await user.save();

      res.json({
        message: 'User promoted to admin successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Promote user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Demote admin to teacher (only by existing admin)
app.put(
  '/api/users/:userId/demote',
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Prevent self-demotion
      if (userId === req.user.userId) {
        return res.status(403).json({ message: 'Cannot demote yourself' });
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user is an admin
      if (user.role !== 'admin') {
        return res.status(400).json({ message: 'User is not an admin' });
      }

      // Demote admin to teacher
      user.role = 'teacher';
      await user.save();

      res.json({
        message: 'Admin demoted to teacher successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Demote admin error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
