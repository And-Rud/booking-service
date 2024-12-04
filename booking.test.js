const request = require('supertest');
const app = require('./app'); // Замість './app' вкажіть шлях до вашого основного файлу

const mongoose = require('mongoose');
const Booking = require('./models/Booking'); // Замість './models/Booking' вкажіть правильний шлях до моделі

beforeAll(async () => {
  // Підключення до бази даних перед виконанням тестів
  await mongoose.connect('mongodb://localhost:27017/testBookingsDB', { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  // Закриття підключення до бази даних після виконання тестів
  await mongoose.connection.close();
});

describe('Bookings API', () => {
  // Тест на створення бронювання
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
      .expect(201); // Перевірка, що статус відповіді - 201 (Created)

    // Перевірка, чи відповідає структура створеного бронювання
    expect(response.body).toHaveProperty('_id');
    expect(response.body.user).toBe(bookingData.user);
    expect(response.body.date).toBe(bookingData.date);
    expect(response.body.startTime).toBe(bookingData.startTime);
    expect(response.body.endTime).toBe(bookingData.endTime);
  });

  // Тест на перевірку помилки створення бронювання з неправильними часами
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
      .expect(400); // Перевірка на 400 статус (Bad Request)

    expect(response.body.error).toBe('startTime must be earlier than endTime');
  });

  // Тест на перевірку бронювання на вже зайнятий час
  it('should return an error when the time slot is already booked', async () => {
    const existingBookingData = {
      user: 'Alice',
      date: '2024-12-05',
      startTime: '10:00',
      endTime: '11:00'
    };

    // Спочатку створимо одне бронювання
    await request(app)
      .post('/bookings')
      .send(existingBookingData)
      .expect(201);

    // Тепер спробуємо створити ще одне бронювання на той самий час
    const conflictingBookingData = { ...existingBookingData };

    const response = await request(app)
      .post('/bookings')
      .send(conflictingBookingData)
      .expect(400); // Перевірка на 400 статус

    expect(response.body.error).toBe('Time slot is already booked.');
  });

  // Тест на отримання всіх бронювань
  it('should return all bookings', async () => {
    const response = await request(app)
      .get('/bookings')
      .expect(200); // Перевірка на 200 статус (OK)

    // Перевірка, що повертається масив бронювань
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Тест на отримання бронювання за ID
  it('should return a booking by ID', async () => {
    const newBooking = {
      user: 'Bob',
      date: '2024-12-06',
      startTime: '14:00',
      endTime: '15:00'
    };

    // Створимо бронювання перед тим, як запитати його по ID
    const createdBooking = await request(app)
      .post('/bookings')
      .send(newBooking)
      .expect(201);

    const response = await request(app)
      .get(`/bookings/${createdBooking.body._id}`)
      .expect(200); // Перевірка на 200 статус

    expect(response.body._id).toBe(createdBooking.body._id);
    expect(response.body.user).toBe(newBooking.user);
  });

  // Тест на випадок, коли бронювання не знайдено за ID
  it('should return 404 if booking is not found by ID', async () => {
    const nonExistingId = '60c72b2f9e0d9e8b88b8b8b8'; // Вигадане ID

    const response = await request(app)
      .get(`/bookings/${nonExistingId}`)
      .expect(404); // Перевірка на 404 статус

    expect(response.body.error).toBe('Booking not found.');
  });

  // Тест на видалення бронювання
  it('should delete a booking by ID', async () => {
    const newBooking = {
      user: 'Charlie',
      date: '2024-12-07',
      startTime: '09:00',
      endTime: '10:00'
    };

    // Створимо бронювання
    const createdBooking = await request(app)
      .post('/bookings')
      .send(newBooking)
      .expect(201);

    const response = await request(app)
      .delete(`/bookings/${createdBooking.body._id}`)
      .expect(200); // Перевірка на 200 статус

    expect(response.body.message).toBe('Booking deleted successfully.');

    // Перевірка, чи бронювання видалене
    const deletedBooking = await Booking.findById(createdBooking.body._id);
    expect(deletedBooking).toBeNull();
  });

  // Тест на випадок, коли бронювання для видалення не знайдено
  it('should return 404 if booking to delete is not found', async () => {
    const nonExistingId = '60c72b2f9e0d9e8b88b8b8b8'; // Вигадане ID

    const response = await request(app)
      .delete(`/bookings/${nonExistingId}`)
      .expect(404); // Перевірка на 404 статус

    expect(response.body.error).toBe('Booking not found.');
  });
});
