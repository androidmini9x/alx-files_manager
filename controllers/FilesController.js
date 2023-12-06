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

  static async getShow(req, res) {
    // Extract & Check the token is valid
    const token = req.header('X-Token');

    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const userID = await redisClient.get(`auth_${token}`);
    if (!userID) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const fileID = req.params.id;
    const fileExists = await dbClient.db.collection('files').findOne({
      userId: ObjectId(userID),
      _id: ObjectId(fileID),
    });

    if (!fileExists) return res.status(404).send({ error: 'Not found' });
    fileExists.id = fileExists._id;
    delete fileExists.localPath;
    delete fileExists._id;
    return res.status(200).send({ ...fileExists });
  }

  static async getIndex(req, res) {
    // check for x-token header
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    // verify token
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let parentId = req.query.parentId || '0';
    if (parentId === '0') parentId = 0;
    let page = Number(req.query.page) || 0;

    if (Number.isNaN(page)) page = 0;

    if (parentId !== 0 && parentId !== '0') {
      parentId = ObjectId(parentId);
      const folder = await dbClient.db.collection('files').findOne({
        _id: parentId,
      });

      if (!folder || folder.type !== 'folder') return res.status(200).send([]);
    }

    let pipeline = [
      { $match: { parentId } },
      { $skip: page * 20 },
      { $limit: 20 },
    ];
    if (parentId === 0 || parentId === '0') {
      pipeline = [{ $skip: page * 20 }, { $limit: 20 }];
    }
    const fileCursor = await dbClient.db.collection('files').aggregate(pipeline);
    const fileList = [];
    await fileCursor.forEach((doc) => {
      const document = { id: doc._id, ...doc };
      delete document.localPath;
      delete document._id;
      fileList.push(document);
    });

    return res.status(200).json(fileList);
  }
}

export default FilesController;
