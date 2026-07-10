const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, path.join(process.cwd(), 'public', 'uploads'));
  },
  filename: (_req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${uniqueSuffix}-${file.originalname.replace(/\s+/g, '-').toLowerCase()}`);
  }
});

const imageUpload = multer({
  storage,
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith('image/')) {
      callback(null, true);
      return;
    }

    callback(new Error('Only image files are allowed.'));
  }
});

module.exports = { imageUpload };