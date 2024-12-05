// Helper function to check for overlapping bookings
async function isSlotAvailable(date, startTime, endTime, Booking) {
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

  module.exports = { isSlotAvailable };
