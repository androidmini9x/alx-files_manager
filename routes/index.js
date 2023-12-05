import AppController from '../controllers/AppController';

const { Router } = require('express');

const routes = Router();

routes.get('/status', (req, res) => AppController.getStatus(req, res));
routes.get('/stats', (req, res) => AppController.getStats(req, res));

module.exports = routes;
