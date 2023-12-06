import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fs = require('fs');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    // Extract & Check the token is valid
    const token = req.header('X-Token');

    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const userID = await redisClient.get(`auth_${token}`);
    if (!userID) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    // Get the user from database
    const user = await dbClient.db.collection('users').findOne({
      _id: ObjectId(userID),
    });

    const allowedFileType = ['folder', 'file', 'image'];
    // Extract data from request
    const {
      name, type, data, parentId,
    } = req.body;
    const isPublic = req.body.isPublic || false;

    if (!name) { return res.status(400).send({ error: 'Missing name' }); }
    if (!type || !allowedFileType.includes(type)) { return res.status(400).send({ error: 'Missing type' }); }
    if (!data && type !== 'folder') { return res.status(400).send({ error: 'Missing data' }); }

    // Create root folder if it not exists
    if (!fs.existsSync(FOLDER_PATH)) {
      fs.mkdirSync(FOLDER_PATH, { recursive: true });
    }

    // Handle parent value if it used
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
      userId: user._id,
      name,
      type,
      isPublic,
      parentId: 0,
    };

    if (type === 'folder') {
      if (parentId) abstractFile.parentId = ObjectId(parentId);
      const fd = await dbClient.db.collection('files').insertOne({ ...abstractFile });
      return res.status(201).send({ id: fd.insertedId, ...abstractFile });
    }

    const fileuuid = uuidv4();
    const buffer = Buffer.from(data, 'base64');

    fs.writeFile(`${FOLDER_PATH}/${fileuuid}`, buffer, (error) => {
      if (error) throw error;
    });
    if (parentId) abstractFile.parentId = ObjectId(parentId);
    abstractFile.localPath = `${FOLDER_PATH}/${fileuuid}`;
    const fl = await dbClient.db.collection('files').insertOne({ ...abstractFile });
    delete abstractFile.localPath;
    abstractFile.parentId = abstractFile.parentId === '0' ? 0 : abstractFile.parentId;
    return res.status(201).send({ id: fl.insertedId, ...abstractFile });
  }
}

export default FilesController;
