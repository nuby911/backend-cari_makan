import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// Impor konfigurasi dan rute
import { initWebSocket } from './config/websocket.js';
import authRoutes from './routes/auth.routes.js';
import promoRoutes from './routes/promo.routes.js';
import foodRoutes from './routes/food.routes.js';
import orderRoutes from './routes/order.routes.js';
import webhookRoutes from './routes/webhook.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Middleware dasar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mengekspos direktori 'uploads' untuk fallback penyimpanan lokal
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhook', webhookRoutes);

// Endpoint kesehatan
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Backend is running correctly.' });
});

// Inisialisasi WebSocket menggunakan HTTP server
initWebSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
