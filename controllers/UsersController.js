import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const sha1 = require('sha1');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).send({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).send({ error: 'Missing password' });
    }

    const isExists = await dbClient.db.collection('users').findOne({ email });

    if (isExists) {
      return res.status(400).send({ error: 'Already exist' });
    }

    const newUser = await dbClient.db.collection('users').insertOne({
      email,
      password: sha1(password),
    });

    return res.status(201).send({ id: newUser.insertedId, email });
  }

  static async getMe(req, res) {
    const sessionID = req.header('X-Token');

    if (!sessionID) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const userID = await redisClient.get(`auth_${sessionID}`);
    const user = await dbClient.db.collection('users').findOne({
      _id: ObjectId(userID),
    });

    if (user) {
      return res.status(200).send({ id: userID, email: user.email });
    }
    return res.status(401).send({ error: 'Unauthorized' });
  }
}

export default UsersController;
