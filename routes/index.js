import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const { Router } = require('express');

const routes = Router();

routes.get('/status', (req, res) => AppController.getStatus(req, res));
routes.get('/stats', (req, res) => AppController.getStats(req, res));
routes.post('/users', (req, res) => UsersController.postNew(req, res));

module.exports = routes;
