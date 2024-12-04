const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/bookingsDB', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB...'))
  .catch(err => {
    console.error('Could not connect to MongoDB...', err);
    process.exit(1); // Exit the process if database connection fails
  });

// Define Booking Schema
const bookingSchema = new mongoose.Schema({
  user: { type: String, required: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true }
});

// Create Booking Model
const Booking = mongoose.model('Booking', bookingSchema);

// Validate Booking Data
const validateBooking = (booking) => {
  const schema = Joi.object({
    user: Joi.string().required(),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/).required(),
    endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/).required(),
  }).custom((value, helpers) => {
    const { startTime, endTime } = value;
    if (startTime >= endTime) {
      return helpers.message('startTime must be earlier than endTime');
    }
    return value;
  }, 'Custom Time Validation');
  
  return schema.validate(booking);
};

// Helper function to check for overlapping bookings
async function isSlotAvailable(date, startTime, endTime) {
  try {
    const bookings = await Booking.find({ date });
    return !bookings.some(booking => 
      (startTime >= booking.startTime && startTime < booking.endTime) || 
      (endTime > booking.startTime && endTime <= booking.endTime) || 
      (startTime <= booking.startTime && endTime >= booking.endTime)
    );
  } catch (err) {
    console.error('Error checking availability:', err);
    throw new Error('Failed to check slot availability.');
  }
}

// Helper function for JWT verification
function authenticateJWT(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(403).send('Access denied.');
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send('Invalid token.');
    req.user = user;
    next();
  });
}

// Create a new Booking (requires JWT authentication)
app.post('/bookings', authenticateJWT, async (req, res) => {
  try {
    const { error, value } = validateBooking(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { user, date, startTime, endTime } = value;

    if (!await isSlotAvailable(date, startTime, endTime)) {
      return res.status(400).json({ error: 'Time slot is already booked.' });
    }

    const booking = new Booking({ user, date, startTime, endTime });
    await booking.save();
    res.status(201).json(booking);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'An error occurred while creating the booking.' });
  }
});

// Update an existing Booking (requires JWT authentication)
app.patch('/bookings/:id', authenticateJWT, async (req, res) => {
  try {
    const { error, value } = validateBooking(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { user, date, startTime, endTime } = value;

    if (!await isSlotAvailable(date, startTime, endTime)) {
      return res.status(400).json({ error: 'Time slot is already booked.' });
    }

    const booking = await Booking.findByIdAndUpdate(req.params.id, { user, date, startTime, endTime }, { new: true });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    res.json(booking);
  } catch (err) {
    console.error('Error updating booking:', err);
    res.status(500).json({ error: 'Failed to update the booking.' });
  }
});

// Get all bookings
app.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

// Generate JWT Token for authentication
app.post('/login', (req, res) => {
  const { username } = req.body;
  const user = { username };
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
