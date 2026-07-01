import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');

function ensureUploadsDir(): void {
  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export const imageUploadOptions = {
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      ensureUploadsDir();
      callback(null, UPLOADS_DIR);
    },
    filename: (_request, file, callback) => {
      const extension = extname(file.originalname) || '.png';
      const name = `${Date.now()}-${Math.round(Math.random() * 1_000_000_000)}${extension}`;
      callback(null, name);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
};

export function buildUploadUrl(filename: string): string {
  return `/uploads/${filename}`;
}
