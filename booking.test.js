const request = require('supertest');
const app = require('./server');

const mongoose = require('mongoose');
const Booking = require('./models/Booking');

beforeAll(async () => {
  // Connect to the database before running tests
  await mongoose.connect('mongodb://localhost:27017/testBookingsDB', { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  // Close the database connection after running tests
  await mongoose.connection.close();
});

describe('Bookings API', () => {
  // Test for creating a booking
  it('should create a new booking', async () => {
    const bookingData = {
      user: 'John Doe',
      date: '2024-12-05',
      startTime: '10:00',
      endTime: '11:00'
    };

    const response = await request(app)
      .post('/bookings')
      .send(bookingData)
      .expect(201); // Check that the response status is 201 (Created)

    // Check that the structure of the created booking matches
    expect(response.body).toHaveProperty('_id');
    expect(response.body.user).toBe(bookingData.user);
    expect(response.body.date).toBe(bookingData.date);
    expect(response.body.startTime).toBe(bookingData.startTime);
    expect(response.body.endTime).toBe(bookingData.endTime);
  });

  // Test for error when creating a booking with invalid times
  it('should return an error when startTime is later than endTime', async () => {
    const invalidBookingData = {
      user: 'Jane Doe',
      date: '2024-12-05',
      startTime: '12:00',
      endTime: '11:00'
    };

    const response = await request(app)
      .post('/bookings')
      .send(invalidBookingData)
      .expect(400); // Check for 400 status (Bad Request)

    expect(response.body.error).toBe('startTime must be earlier than endTime');
  });

  // Test for error when the time slot is already booked
  it('should return an error when the time slot is already booked', async () => {
    const existingBookingData = {
      user: 'Alice',
      date: '2024-12-05',
      startTime: '10:00',
      endTime: '11:00'
    };

    // First, create one booking
    await request(app)
      .post('/bookings')
      .send(existingBookingData)
      .expect(201);

    // Now try to create another booking for the same time
    const conflictingBookingData = { ...existingBookingData };

    const response = await request(app)
      .post('/bookings')
      .send(conflictingBookingData)
      .expect(400); // Check for 400 status

    expect(response.body.error).toBe('Time slot is already booked.');
  });

  // Test for getting all bookings
  it('should return all bookings', async () => {
    const response = await request(app)
      .get('/bookings')
      .expect(200); // Check for 200 status (OK)

    // Check that an array of bookings is returned
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Test for getting a booking by ID
  it('should return a booking by ID', async () => {
    const newBooking = {
      user: 'Bob',
      date: '2024-12-06',
      startTime: '14:00',
      endTime: '15:00'
    };

    // Create a booking before requesting it by ID
    const createdBooking = await request(app)
      .post('/bookings')
      .send(newBooking)
      .expect(201);

    const response = await request(app)
      .get(`/bookings/${createdBooking.body._id}`)
      .expect(200); // Check for 200 status

    expect(response.body._id).toBe(createdBooking.body._id);
    expect(response.body.user).toBe(newBooking.user);
  });

  // Test for case when booking is not found by ID
  it('should return 404 if booking is not found by ID', async () => {
    const nonExistingId = '60c72b2f9e0d9e8b88b8b8b8'; // Fake ID

    const response = await request(app)
      .get(`/bookings/${nonExistingId}`)
      .expect(404); // Check for 404 status

    expect(response.body.error).toBe('Booking not found.');
  });

  // Test for deleting a booking
  it('should delete a booking by ID', async () => {
    const newBooking = {
      user: 'Charlie',
      date: '2024-12-07',
      startTime: '09:00',
      endTime: '10:00'
    };

    // Create a booking
    const createdBooking = await request(app)
      .post('/bookings')
      .send(newBooking)
      .expect(201);

    const response = await request(app)
      .delete(`/bookings/${createdBooking.body._id}`)
      .expect(200); // Check for 200 status

    expect(response.body.message).toBe('Booking deleted successfully.');

    // Check if the booking is deleted
    const deletedBooking = await Booking.findById(createdBooking.body._id);
    expect(deletedBooking).toBeNull();
  });

  // Test for case when booking to delete is not found
  it('should return 404 if booking to delete is not found', async () => {
    const nonExistingId = '60c72b2f9e0d9e8b88b8b8b8'; // Fake ID

    const response = await request(app)
      .delete(`/bookings/${nonExistingId}`)
      .expect(404); // Check for 404 status

    expect(response.body.error).toBe('Booking not found.');
  });
});
