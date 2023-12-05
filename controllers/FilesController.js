import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fs = require('fs');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const sessionID = req.header('X-Token');

    if (!sessionID) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const userID = await redisClient.get(`auth_${sessionID}`);
    const user = await dbClient.db.collection('users').findOne({
      _id: ObjectId(userID),
    });

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const { name, type, data } = req.body;
    const parentId = req.body.parentId ? req.body.parentId : 0;
    const isPublic = req.body.isPublic ? req.body.isPublic : false;

    if (!name) { return res.status(400).send({ error: 'Missing name' }); }
    if (!type || !['folder', 'file', 'image'].includes(type)) { return res.status(400).send({ error: 'Missing type' }); }
    if (!data && type !== 'folder') { return res.status(400).send({ error: 'Missing data' }); }
    if (parentId) {
      const parent = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
      if (!parent) {
        return res.status(400).send({ error: 'Parent not found' });
      }
      if (parent.type !== 'folder') {
        return res.status(400).send({ error: 'Parent is not a folder' });
      }
    }

    const abstractFile = {
      userId: userID,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === 'folder') {
      const fd = dbClient.db.collection('files').insertOne({ ...abstractFile });
      return res.status(201).send({ id: fd.insertedId, ...abstractFile });
    }

    if (!fs.existsSync(FOLDER_PATH)) {
      fs.mkdirSync(FOLDER_PATH, { recursive: true });
    }
    const fileuuid = uuidv4();
    const buffer = Buffer.from(data, 'base64').toString('utf-8');

    await fs.writeFile(`${FOLDER_PATH}/${fileuuid}`, buffer, (error) => {
      if (error) {
        return res.status(400).send({ error: error.message });
      }
      return true;
    });

    abstractFile.localPath = `${FOLDER_PATH}/${fileuuid}`;
    const fl = await dbClient.db.collection('files').insertOne({ ...abstractFile });
    return res.status(201).send({ id: fl.insertedId, ...abstractFile });
  }
}

export default FilesController;
