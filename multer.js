const multer = require('multer');

// Set up multer for file storage and size limit
const storage = multer.memoryStorage(); // or diskStorage for saving to disk
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB limit
});
