// src/middlewares/validateBody.js
module.exports = function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).send({ error: error.details.map(d => d.message).join(', ') });
    }
    req.body = value;
    next();
  };
};
