const express = require('express');
const { getGlobalLFG, getHubLFG, updateLFGStatus } = require('../controllers/lfg.controller');
const { protect } = require('../middleware/auth');

// Mounted at /api/lfg
const lfgRouter = express.Router();
lfgRouter.get('/',                  getGlobalLFG);
lfgRouter.patch('/:postId/status',  protect, updateLFGStatus);

// Mounted at /api/hubs/:hubId/lfg — mergeParams carries :hubId down
const lfgHubRouter = express.Router({ mergeParams: true });
lfgHubRouter.get('/', getHubLFG);

module.exports = { lfgRouter, lfgHubRouter };
