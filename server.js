require('dotenv').config();
console.log('Using MONGODB_URI:', process.env.MONGODB_URI); // Debug log
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { body, validationResult, check } = require('express-validator');
const path = require('path');
const csv = require('csv-parser');
const fs = require('fs');
const fetch = require('node-fetch'); // Add node-fetch for making HTTP requests

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eduvlm-bench';
const CSV_PATH = 'D:/eduvlm-app/gsm8k_wrong_answers_with_missing_prerequisites_enhanced (1).csv'.replace(/\\/g, '/');

console.log('Attempting to load CSV from:', CSV_PATH); // Debug log for path verification

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(__dirname));

// MongoDB Connection with retry
const connectWithRetry = () => {
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    setTimeout(connectWithRetry, 5000);
  });
};
connectWithRetry();

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Annotation Schema
const annotationSchema = new mongoose.Schema({
  question_id: { type: String, required: true },
  question: { type: String, required: true },
  annotated_prerequisite: { type: String, required: true },
  annotator_name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Annotation = mongoose.model('Annotation', annotationSchema);

// Auth Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.username !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error checking admin status' });
  }
};

// Load CSV data with error handling
let questions = [];
const loadCSV = () => {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV file not found at:', CSV_PATH);
    console.log('Please ensure the CSV file exists and the path is correct.');
    return; // Exit without attempting to read if file doesn't exist
  }

  const stream = fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', (row) => {
      const prerequisites = row.all_prerequisites
        ? row.all_prerequisites
            .replace(/[\[\]"]+/g, '')
            .split(',')
            .map(item => item.trim())
        : [];
      questions.push({
        question_id: row.question_id,
        question: row.question,
        correct_answer: row.correct_answer,
        all_prerequisites: prerequisites,
        wrong_answer: row.wrong_answer
      });
    })
    .on('end', () => {
      console.log('CSV file loaded successfully with', questions.length, 'questions');
    })
    .on('error', (err) => {
      console.error('Error loading CSV:', err.message);
      questions = []; // Reset to empty array on error
    });
};

// Check CSV path and load data
loadCSV();

// Routes

// Register
app.post('/api/register', [
  body('username').isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, firstName, lastName } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.email === email ? 'Email already registered' : 'Username already taken' 
      });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName
    });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
app.post('/api/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

// Get current user
app.get('/api/user', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName
    }
  });
});

// Get questions
app.get('/api/questions', authenticateToken, (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const random = req.query.random === '1';
  if (questions.length === 0) {
    return res.status(500).json({ error: 'No questions available. Check CSV loading or ensure file exists.' });
  }
  if (random) {
    const randomIndex = Math.floor(Math.random() * questions.length);
    return res.json([questions[randomIndex]]);
  }
  res.json(questions.slice(0, limit));
});

// Save annotation
app.post('/api/annotations', authenticateToken, [
  body('question_id').notEmpty().withMessage('Question ID is required'),
  body('question').notEmpty().withMessage('Question is required'),
  body('annotated_prerequisite').notEmpty().withMessage('Annotated prerequisite is required'),
  body('annotator_name').notEmpty().withMessage('Annotator name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const annotation = new Annotation(req.body);
    await annotation.save();
    res.status(201).json({ message: 'Annotation saved successfully' });
  } catch (error) {
    console.error('Annotation save error:', error.message);
    res.status(500).json({ error: 'Server error saving annotation' });
  }
});

// Updated detect prerequisites endpoint to use Gemini Flash via Flask
app.post('/api/detect-prereqs', authenticateToken, async (req, res) => {
  try {
    const { question, correct_answer, wrong_answer } = req.body;
    console.log('Received /api/detect-prereqs request:', { question, correct_answer, wrong_answer }); // Debug log
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Forward request to Flask server (gemini_prerequisites.py)
    const pythonApiUrl = 'http://localhost:5000/api/detect-prereqs';
    const pythonResponse = await fetch(pythonApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, correct_answer, wrong_answer })
    });

    const data = await pythonResponse.json();
    console.log('Flask API response:', data); // Debug log
    if (pythonResponse.ok) {
      res.json({
        question: data.question,
        all_prerequisites: Array.isArray(data.all_prerequisites) ? data.all_prerequisites : data.all_prerequisites.split(', ').map(item => item.trim()),
        single_missing_prerequisite: typeof data.single_missing_prerequisite === 'string' ? data.single_missing_prerequisite : 'None'
      });
      console.log('Sent response to frontend:', {
        question: data.question,
        all_prerequisites: Array.isArray(data.all_prerequisites) ? data.all_prerequisites : data.all_prerequisites.split(', ').map(item => item.trim()),
        single_missing_prerequisite: typeof data.single_missing_prerequisite === 'string' ? data.single_missing_prerequisite : 'None'
      }); // Debug log
    } else {
      console.error('Flask API error:', data);
      res.status(pythonResponse.status).json({ error: `Flask API error: ${data.error || 'Unknown error'}` });
    }
  } catch (error) {
    console.error('Error detecting prerequisites:', error.message);
    res.status(500).json({ error: `Server error detecting prerequisites: ${error.message}` });
  }
});

// Admin Routes
app.get('/api/admin/questions', [authenticateToken, isAdmin], (req, res) => {
  res.json(questions);
});

app.post('/api/admin/questions', [
  authenticateToken,
  isAdmin,
  body('question_id').notEmpty().withMessage('Question ID is required'),
  body('question').notEmpty().withMessage('Question is required'),
  body('correct_answer').notEmpty().withMessage('Correct answer is required'),
  body('wrong_answer').notEmpty().withMessage('Wrong answer is required'),
  body('all_prerequisites').isArray().withMessage('Prerequisites must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { question_id, question, correct_answer, wrong_answer, all_prerequisites } = req.body;
    const newQuestion = {
      question_id,
      question,
      correct_answer,
      wrong_answer,
      all_prerequisites
    };
    questions.push(newQuestion);
    res.status(201).json({ message: 'Question added successfully', question: newQuestion });
  } catch (error) {
    console.error('Error adding question:', error.message);
    res.status(500).json({ error: 'Server error adding question' });
  }
});

app.put('/api/admin/questions/:question_id', [
  authenticateToken,
  isAdmin,
  body('question').notEmpty().withMessage('Question is required'),
  body('correct_answer').notEmpty().withMessage('Correct answer is required'),
  body('wrong_answer').notEmpty().withMessage('Wrong answer is required'),
  body('all_prerequisites').isArray().withMessage('Prerequisites must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { question_id } = req.params;
    const { question, correct_answer, wrong_answer, all_prerequisites } = req.body;
    const index = questions.findIndex(q => q.question_id === question_id);
    if (index === -1) {
      return res.status(404).json({ error: 'Question not found' });
    }

    questions[index] = { ...questions[index], question, correct_answer, wrong_answer, all_prerequisites };
    res.json({ message: 'Question updated successfully', question: questions[index] });
  } catch (error) {
    console.error('Error updating question:', error.message);
    res.status(500).json({ error: 'Server error updating question' });
  }
});

app.delete('/api/admin/questions/:question_id', [authenticateToken, isAdmin], async (req, res) => {
  try {
    const { question_id } = req.params;
    const index = questions.findIndex(q => q.question_id === question_id);
    if (index === -1) {
      return res.status(404).json({ error: 'Question not found' });
    }

    questions.splice(index, 1);
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error.message);
    res.status(500).json({ error: 'Server error deleting question' });
  }
});

app.get('/api/admin/annotations', [authenticateToken, isAdmin], async (req, res) => {
  try {
    const annotations = await Annotation.find();
    res.json(annotations);
  } catch (error) {
    console.error('Error fetching annotations:', error.message);
    res.status(500).json({ error: 'Server error fetching annotations' });
  }
});

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'leaderboard.html'));
});

app.get('/annotator', (req, res) => {
  res.sendFile(path.join(__dirname, 'annotator.html'));
});

app.get('/prerequisite_detection', (req, res) => {
  res.sendFile(path.join(__dirname, 'prerequisite_detection.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
});