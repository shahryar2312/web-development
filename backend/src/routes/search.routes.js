const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/search.controller');

// @route   GET /api/search
router.get('/', globalSearch);

module.exports = router;
