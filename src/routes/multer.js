// middlewares/upload.js
import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const allowedTypes = /jpeg|jpg|png|gif|webp|glb|gltf|mp4|mkv|avi/;

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB por archivo
  },
  fileFilter: (req, file, cb) => {
    const mimetypeValid = allowedTypes.test(file.mimetype);
    const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetypeValid && extValid) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes, videos o archivos .glb/.gltf'));
    }
  }
}).fields([
  { name: 'images', maxCount: 55 },
  { name: 'videos', maxCount: 1 },
  { name: 'glbs', maxCount: 1 },
]);

export default upload;
