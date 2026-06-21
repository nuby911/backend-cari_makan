# Resto Order Backend

Sistem Pemesanan Mandiri Restoran v1.5 Backend Central Engine.
Repositori ini merupakan backend dari sistem pemesanan restoran ("Cari Makan"). 

## Teknologi

Backend ini dibangun menggunakan teknologi berikut:
- **Node.js** & **Express.js** untuk server backend
- **PostgreSQL** untuk database relasional
- **WebSocket (ws)** untuk komunikasi real-time
- **JSON Web Token (JWT)** untuk autentikasi dan otorisasi
- **Cloudinary** & **Multer** & **Sharp** untuk manajemen file/gambar
- **Bcryptjs** untuk hashing password

## Persyaratan Sistem

Pastikan Anda telah menginstal beberapa alat berikut sebelum memulai:
- [Node.js](https://nodejs.org/) (Versi 16 atau lebih baru)
- [PostgreSQL](https://www.postgresql.org/)
- Akun [Cloudinary](https://cloudinary.com/)
- Akun [Midtrans](https://midtrans.com/) (Jika mengaktifkan payment gateway)

## Instalasi

1. Kloning repositori ini (atau unduh zip-nya):
   ```bash
   git clone https://github.com/nuby911/backend-cari_makan.git
   cd backend
   ```

2. Instal semua dependensi:
   ```bash
   npm install
   ```

3. Salin file `.env.example` menjadi `.env` dan konfigurasikan isinya sesuai dengan environment Anda:
   ```bash
   cp .env.example .env
   ```

## Konfigurasi Environment (`.env`)

Atur variabel environment berikut pada file `.env` Anda:

```env
PORT=5000
DATABASE_URL=postgres://username:password@localhost:5432/RestoOrderDB
JWT_SECRET=supersecretkey_kasir123
MIDTRANS_SERVER_KEY=SB-Mid-Server-xxxxxx
CLOUDINARY_CLOUD_NAME=nama_cloud_kamu
CLOUDINARY_API_KEY=key_api_cloudinary
CLOUDINARY_API_SECRET=secret_api_cloudinary
```
*(Ganti nilai-nilai di atas dengan kredensial database dan API Anda yang sebenarnya)*

## Migrasi Database

Jalankan perintah berikut untuk membuat/migrasi tabel ke database PostgreSQL:
```bash
npm run migrate
```

## Menjalankan Server

- **Mode Development** (dengan watch menggunakan fitur bawaan Node.js):
  ```bash
  npm run dev
  ```
- **Mode Production**:
  ```bash
  npm start
  ```

Server akan berjalan pada port yang telah dikonfigurasikan di `.env` (secara default `http://localhost:5000`).

## Struktur Proyek

- `src/` - Berisi seluruh kode sumber (controllers, routes, services, middleware, models).
- `src/server.js` - Titik masuk (entry point) utama untuk menjalankan server backend.
- `src/scripts/migrate.js` - Script untuk migrasi skema database.
