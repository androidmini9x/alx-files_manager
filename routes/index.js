import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import UsersController from '../controllers/UsersController';

const { Router } = require('express');

const routes = Router();

routes.get('/status', (req, res) => AppController.getStatus(req, res));
routes.get('/stats', (req, res) => AppController.getStats(req, res));
routes.post('/users', (req, res) => UsersController.postNew(req, res));
routes.get('/connect', (req, res) => AuthController.getConnect(req, res));
routes.get('/disconnect', (req, res) => AuthController.getDisconnect(req, res));
routes.get('/users/me', (req, res) => UsersController.getMe(req, res));

module.exports = routes;
