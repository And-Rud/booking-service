// Validate Booking Data
const Joi = require('joi');

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

module.exports = { validateBooking };
