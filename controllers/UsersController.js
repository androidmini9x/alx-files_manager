import dbClient from '../utils/db';

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
}

export default UsersController;
