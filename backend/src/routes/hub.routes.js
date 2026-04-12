const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getHubs, createHub, getHub, updateHub, deleteHub,
  joinHub, leaveHub, getHubMembers,
} = require('../controllers/hub.controller');
const { protect } = require('../middleware/auth');

const createRules = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Hub name must be 3–50 characters')
    .matches(/^[a-zA-Z0-9_ -]+$/)
    .withMessage('Hub name can only contain letters, numbers, spaces, underscores, and hyphens'),
  body('game')
    .trim()
    .notEmpty()
    .withMessage('Game name is required')
    .isLength({ max: 100 }),
  body('description').optional().isLength({ max: 2000 }),
  body('isPrivate').optional().isBoolean(),
];

const updateRules = [
  body('description').optional().isLength({ max: 2000 }),
  body('icon').optional().isURL().withMessage('Icon must be a valid URL'),
  body('banner').optional().isURL().withMessage('Banner must be a valid URL'),
  body('rules').optional().isArray(),
  body('isPrivate').optional().isBoolean(),
];

router.get('/',                  getHubs);
router.post('/',                 protect, createRules, createHub);
router.get('/:hubId',            getHub);
router.put('/:hubId',            protect, updateRules, updateHub);
router.delete('/:hubId',         protect,              deleteHub);
router.post('/:hubId/join',      protect,              joinHub);
router.delete('/:hubId/join',    protect,              leaveHub);
router.get('/:hubId/members',                          getHubMembers);

module.exports = router;
