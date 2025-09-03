const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Filter = require('bad-words');
const multer = require('multer');
const util = require('util');

// Initialize filter
const profanityFilter = new Filter();

// Set up multer for file uploads (in memory)
const upload = multer({ storage: multer.memoryStorage() });
const uploadMiddleware = upload.single('image');

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define Meme Schema
const memeSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  imageUrl: String,
  timestamp: { type: Date, default: Date.now },
});
const Meme = mongoose.model('Meme', memeSchema);

// Express App
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

// Google Cloud Vision Client
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const visionClient = new ImageAnnotatorClient({
  keyFilename: 'google-vision-key.json' // ← You'll create this
});

// Async wrapper for middleware
const asyncMiddleware = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Upload route with moderation
app.post('/upload', uploadMiddleware, asyncMiddleware(async (req, res) => {
  const { x, y } = req.body;
  const file = req.file;

  if (!file || !x || !y) {
    return res.status(400).send("Missing data");
  }

  // Check filename for profanity
  if (profanityFilter.isProfane(file.originalname)) {
    return res.status(400).send("Profane filename detected");
  }

  // Step 1: Run Google Vision moderation
  const [result] = await visionClient.safeSearchDetection(file.buffer);
  const { adult, violence, racy } = result.safeSearchAnnotation;

  const likelihood = ['VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
  if (likelihood.indexOf(adult) >= 3 || likelihood.indexOf(violence) >= 3 || likelihood.indexOf(racy) >= 3) {
    return res.status(400).send("Inappropriate image content detected");
  }

  // Step 2: Upload to Cloudinary (you'll do this next)
  // For now, we'll simulate it. Replace with real Cloudinary upload later.
  // ⚠️ In real version, upload buffer to Cloudinary and get URL

  // TEMP: Mock URL (replace later)
 // After moderation passes:
const uploadResponse = await cloudinary.uploader.upload_stream(
  { resource_type: 'image' },
  async (error, result) => {
    if (error) throw error;
    const imageUrl = result.secure_url;

    const meme = new Meme({ x, y, imageUrl });
    await meme.save();
    io.emit('newMeme', { x, y, imageUrl });
    res.json({ success: true, imageUrl });
  }
).end(file.buffer);

  // Step 3: Save to DB
  const meme = new Meme({ x, y, imageUrl });
  await meme.save();

  // Step 4: Broadcast to all clients
  io.emit('newMeme', { x, y, imageUrl });

  res.json({ success: true, imageUrl });
}));

// Get all memes (on load)
app.get('/memes', async (req, res) => {
  const memes = await Meme.find({});
  res.json(memes);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('User connected');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});