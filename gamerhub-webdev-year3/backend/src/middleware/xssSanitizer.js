const sanitizeHtml = require('sanitize-html');

/**
 * Middleware to sanitize HTML in request body fields.
 * Primarily targets 'content' and 'title' to prevent XSS.
 */
const xssSanitizer = (req, res, next) => {
  if (req.body) {
    const fieldsToSanitize = ['content', 'title', 'body', 'bio'];
    
    fieldsToSanitize.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = sanitizeHtml(req.body[field], {
          allowedTags: [
            'b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'br', 'code', 'pre'
          ],
          allowedAttributes: {
            'a': ['href', 'target', 'rel']
          },
          allowedSchemes: ['http', 'https', 'mailto'],
        });
      }
    });
  }
  next();
};

module.exports = xssSanitizer;
