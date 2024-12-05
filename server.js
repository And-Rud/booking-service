const express = require('express');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { validateBooking } = require('./utils/validation');
const { isSlotAvailable } = require('./utils/conflict-check');
const Booking = require('./models/Booking');

dotenv.config();

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://issumbosi:XZ7FOi29hsQc81IO@cluster0.9za9v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB...'))
  .catch(err => {
    console.error('Could not connect to MongoDB...', err);
    process.exit(1); // Exit the process if database connection fails
  });

// Helper function for JWT verification
function authenticateJWT(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(403).send('Access denied.');
  console.log("token", token, process.env.JWT_SECRET);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send(`Invalid token. ${err}`);
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

    if (!await isSlotAvailable(date, startTime, endTime, Booking)) {
      return res.status(400).json({ error: 'Time slot is already booked.' });
    }

    const booking = new Booking({ user, date, startTime, endTime });
    await booking.save(); // Save the booking to the database and return the unique ID
    res.status(201).json(booking);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'An error occurred while creating the booking.' });
  }
});

// Update an existing Booking (requires JWT authentication)
app.patch('/bookings/:id', authenticateJWT, async (req, res) => {
    console.log("req", req);
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

// Delete a booking by ID (requires JWT authentication)
app.delete('/bookings/:id', authenticateJWT, async (req, res) => {
    try {
      const booking = await Booking.findByIdAndDelete(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  
      res.json({ message: 'Booking deleted successfully.', booking });
    } catch (err) {
      console.error('Error deleting booking:', err);
      res.status(500).json({ error: 'Failed to delete the booking.' });
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

// Handle SIGINT for graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.disconnect();
    console.log('MongoDB connection closed due to app termination.');
    process.exit(0);
  });

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
