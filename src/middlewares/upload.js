import multer from 'multer';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Konfigurasi Cloudinary (bisa kosong jika menggunakan fallback lokal)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer untuk menangkap file ke memori (RAM)
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Middleware pemrosesan gambar
export const processImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    // Kompresi WebP (500x500px, kualitas 80%) menggunakan Sharp
    const processedBuffer = await sharp(req.file.buffer)
      .resize(500, 500, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY;

    if (isCloudinaryConfigured) {
      // Stream ke Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'resto_menu', format: 'webp' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            return res.status(500).json({ error: 'Failed to upload image to Cloudinary' });
          }
          req.file.publicUrl = result.secure_url;
          next();
        }
      );
      // Akhiri stream dengan mengirimkan buffer
      uploadStream.end(processedBuffer);
    } else {
      // Fallback ke penyimpanan lokal
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `menu_${Date.now()}.webp`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, processedBuffer);
      
      // Simpan URL lokal untuk digunakan di controller (diasumsikan folder uploads terekspos via static middleware)
      req.file.publicUrl = `/uploads/${filename}`;
      next();
    }
  } catch (error) {
    console.error('Image Processing Error:', error);
    return res.status(500).json({ error: 'Failed to process image' });
  }
};
