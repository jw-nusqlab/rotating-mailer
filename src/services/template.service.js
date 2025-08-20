// src/services/template.service.js
const Handlebars = require('handlebars');

module.exports = {
  render: function (templateString, data) {
    try {
      const fn = Handlebars.compile(templateString || '{{body}}');
      return fn(data || {});
    } catch (err) {
      // fallback: simple interpolation
      return templateString;
    }
  }
};
