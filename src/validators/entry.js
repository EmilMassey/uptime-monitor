const Joi = require('joi')

module.exports = Joi.object({
  name: Joi.string().alphanum().min(3).max(30).required(),
  url: Joi.string().uri().required(),
})
