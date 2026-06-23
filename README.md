# Cari Makan - Backend

Ini adalah repositori Backend untuk aplikasi "Cari Makan" (Pesan Makan). Backend ini dibangun menggunakan **Node.js** dan **Express.js** serta menggunakan **PostgreSQL** sebagai basis datanya. Backend ini bertanggung jawab atas pengelolaan data (makanan, pesanan, promo, pengguna), autentikasi, integrasi payment gateway, dan update secara real-time menggunakan WebSockets.

## 🚀 Fitur Utama

* **Authentication & Authorization:** Login untuk admin menggunakan JWT (JSON Web Token) dan enkripsi password dengan bcrypt.
* **Food Management:** Endpoint REST API untuk membuat, membaca, memperbarui, dan menghapus (CRUD) daftar makanan. Mendukung *image upload* yang terintegrasi dengan Multer dan Cloudinary.
* **Order Management:** Mengelola alur dan siklus pesanan dari pelanggan, mulai dari proses *checkout* hingga pesanan diselesaikan.
* **Promo Management:** Sistem manajemen kode promo dan potongan diskon.
* **Payment Integration:** Endpoint *webhook* untuk menerima notifikasi status pembayaran otomatis dari payment gateway (Midtrans).
* **Real-time Notifications:** Dukungan WebSockets (Socket.io) untuk memperbarui status pesanan dari pelanggan secara langsung tanpa perlu me-refresh halaman.

## 🛠️ Teknologi yang Digunakan

* **Runtime:** [Node.js](https://nodejs.org/)
* **Framework API:** [Express.js](https://expressjs.com/)
* **Database:** PostgreSQL (Driver: `pg`)
* **Real-time Engine:** Socket.io & `ws`
* **Payment Gateway:** Midtrans Client
* **Image Processing & Upload:** Multer, Sharp, Cloudinary
* **Security & Auth:** JSONWebToken (JWT), BcryptJS, CORS, Dotenv

## 📁 Struktur Direktori Utama

```text
backend/
├── src/
│   ├── config/       # Konfigurasi koneksi Database (db.js) dan WebSockets (websocket.js)
│   ├── middlewares/  # Custom Middleware seperti autentikasi (auth.js) dan upload gambar (upload.js)
│   ├── routes/       # Route endpoint API (auth, food, order, promo, webhook)
│   ├── scripts/      # Script bantu untuk migrasi database (migrate.js)
│   └── server.js     # Entry point utama (menjalankan server Express)
├── .env.example      # Contoh kerangka file environment variables
├── package.json      # Konfigurasi project dan daftar dependensi npm
└── README.md         # Dokumentasi panduan project
```

## ⚙️ Cara Menjalankan Project Secara Lokal

### Prasyarat
* [Node.js](https://nodejs.org/) (disarankan versi LTS) sudah terinstal.
* PostgreSQL database sudah terinstal dan berjalan.

### Langkah-langkah Instalasi

1. Buka terminal dan arahkan masuk ke direktori backend:
   ```bash
   cd backend
   ```

2. Instal seluruh dependensi yang dibutuhkan menggunakan npm:
   ```bash
   npm install
   ```

3. Konfigurasi Environment Variables:
   * Salin file `.env.example` dan ubah namanya menjadi `.env` (atau buat file `.env` baru jika tidak ada).
   * Isi konfigurasi di dalam file `.env` dengan kredensial milik Anda, seperti:
     - Konfigurasi URL Database PostgreSQL.
     - Secret key untuk JWT.
     - API Key untuk Cloudinary (jika menggunakan fitur upload gambar).
     - Server Key untuk Midtrans (jika menggunakan fitur payment gateway).

4. Jalankan Migrasi Database (untuk membuat tabel yang dibutuhkan secara otomatis):
   ```bash
   npm run migrate
   ```

5. Jalankan development server:
   ```bash
   npm run dev
   ```

6. Server akan berjalan dan siap menerima request (biasanya berjalan di port `5000` atau sesuai konfigurasi `PORT` di dalam `.env`).

## 📦 Scripts yang Tersedia di `package.json`

* `npm start`       : Menjalankan server Node.js untuk tahap production.
* `npm run dev`     : Menjalankan aplikasi dengan mode *watch* (server akan otomatis direstart jika ada perubahan file).
* `npm run migrate` : Mengeksekusi script untuk menjalankan migrasi dan pembuatan skema database.
