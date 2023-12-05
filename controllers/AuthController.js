import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const sha1 = require('sha1');

class AuthController {
  static async getConnect(req, res) {
    const auth = req.header('Authorization');
    if (!auth) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const [protocol, token] = auth.split(' ');

    if (protocol != 'Basic' || !token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const decodeToken = Buffer.from(token, 'base64').toString('utf-8');
    const [email, password] = decodeToken.split(':');

    if (!email || !password) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await dbClient.db.collection('users').findOne({
      email,
      password: sha1(password)
    })

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const sessionID = uuidv4();
    redisClient.set(`auth_${sessionID}`, user._id.toString(), 24 * 60 * 60);

    return res.status(200).send({ 'token': sessionID });
  }
  static getDisconnect(req, res) {
    const sessionID = req.header('X-Token');

    if (!sessionID) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    redisClient.del(`auth_${sessionID}`);

    return res.status(204).send();
  }
}

export default AuthController;