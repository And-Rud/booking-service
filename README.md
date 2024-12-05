# Booking System

A simple booking system API that allows users to make and manage bookings with specific date and time slots.

## Instructions to Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/booking-system.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the application:
   ```bash
   npm start
   ```
   The server will be running on http://localhost:3000.

## Features Implemented
- Users can create a booking by providing user, date, startTime, and endTime.
- The system checks for overlapping bookings before creating a new one.
- Users can retrieve all bookings or fetch a specific booking by its ID.
- Bookings can be deleted by ID.
- Input validation using Joi for the booking data.
- Error handling for database connection and booking creation.

## Notes and Assumptions
- MongoDB must be running on `mongodb://localhost:27017/bookingsDB`.
- The system assumes the input data for date and time are in a specific format (YYYY-MM-DD for date and HH:mm for time).
- The API does not handle authentication/authorization (this can be added later).

License
This project is licensed under the MIT License - see the LICENSE file for details.