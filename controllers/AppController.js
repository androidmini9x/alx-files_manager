import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  static getStatus(req, res) {
    const data = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    res.status(200).send(data);
  }

  static async getStats(req, res) {
    const data = {
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    };
    res.status(200).send(data);
  }
}

export default AppController;
