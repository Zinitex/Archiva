# Dokumentasi Project: Archiva

### Sistem Manajemen Dokumen dengan Version Control

---

## 1. Deskripsi Project

**Archiva** adalah aplikasi backend berbasis **Node.js** dan **Express.js** yang berfungsi sebagai sistem manajemen dokumen. Aplikasi ini dilengkapi dengan fitur autentikasi pengguna menggunakan JWT, hashing password dengan bcrypt, serta sistem role untuk mengatur hak akses pengguna.

---

## 2. Teknologi yang Digunakan

| Teknologi    | Versi   | Kegunaan                       |
| ------------ | ------- | ------------------------------ |
| Node.js      | -       | Runtime JavaScript             |
| Express.js   | ^5.2.1  | Web framework                  |
| MySQL        | -       | Database relasional            |
| Sequelize    | ^6.37.8 | ORM untuk MySQL                |
| bcryptjs     | ^3.0.3  | Hash password                  |
| jsonwebtoken | ^9.0.3  | JWT authentication             |
| dotenv       | ^17.4.2 | Manajemen environment variable |
| multer       | ^2.1.1  | Upload file                    |
| cors         | ^2.8.6  | Cross-Origin Resource Sharing  |
| nodemon      | ^3.1.4  | Auto-restart saat development  |

---

## 3. Struktur Folder

```
Archiva/
├── src/
│   ├── config/
│   │   └── database.js          # Konfigurasi koneksi Sequelize + MySQL
│   ├── controllers/
│   │   └── authController.js    # Logic register, login, profile
│   ├── middlewares/
│   │   ├── auth.js              # Middleware verifikasi JWT token
│   │   └── roles.js             # Middleware otorisasi berdasarkan role
│   ├── models/
│   │   ├── index.js             # Ekspor semua model
│   │   └── User.js              # Model tabel users
│   ├── routes/
│   │   ├── index.js             # Router utama (/api)
│   │   └── auth.js              # Router autentikasi (/api/auth)
│   └── app.js                   # Inisialisasi Express & middleware global
├── server.js                    # Entry point, koneksi DB & start server
├── package.json
└── .env                         # Environment variables (tidak di-commit)
```

---

## 4. Koneksi Database MySQL

Koneksi ke database menggunakan **Sequelize ORM** yang dikonfigurasi di `src/config/database.js`.

```js
// src/config/database.js
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

module.exports = sequelize;
```

Konfigurasi disimpan di file `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=archiva_db
DB_USER=root
DB_PASSWORD=password

JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

PORT=3000
NODE_ENV=development
```

Koneksi diuji dan tabel disinkronkan otomatis saat server dijalankan melalui `server.js`:

```js
await sequelize.authenticate(); // Uji koneksi
await sequelize.sync({ alter: true }); // Sinkronisasi model ke tabel
```

---

## 5. Model User

Model `User` didefinisikan di `src/models/User.js` dan memetakan ke tabel `users` di MySQL.

```js
const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: {
      type: DataTypes.ENUM("uploader", "reviewer", "approver", "admin"),
      allowNull: false,
      defaultValue: "uploader",
    },
  },
  { tableName: "users", timestamps: true },
);
```

### Kolom Tabel `users`

| Kolom       | Tipe         | Keterangan                                        |
| ----------- | ------------ | ------------------------------------------------- |
| `id`        | INT (PK, AI) | Primary key, auto increment                       |
| `name`      | VARCHAR(100) | Nama lengkap pengguna                             |
| `email`     | VARCHAR(150) | Email unik pengguna                               |
| `password`  | VARCHAR(255) | Password yang telah di-hash dengan bcrypt         |
| `role`      | ENUM         | Role: `uploader`, `reviewer`, `approver`, `admin` |
| `createdAt` | DATETIME     | Waktu dibuat (otomatis oleh Sequelize)            |
| `updatedAt` | DATETIME     | Waktu diperbarui (otomatis oleh Sequelize)        |

---

## 6. Fitur Autentikasi

### 6.1 Register

Endpoint untuk mendaftarkan pengguna baru. Password di-hash menggunakan **bcrypt** sebelum disimpan ke database.

**Alur:**

1. Validasi input (`name`, `email`, `password` wajib diisi)
2. Cek apakah email sudah terdaftar
3. Hash password dengan `bcrypt.hash(password, 10)`
4. Simpan data user ke database

```js
const hashed = await bcrypt.hash(password, 10);
const user = await User.create({ name, email, password: hashed, role });
```

---

### 6.2 Login

Endpoint untuk autentikasi pengguna. Menghasilkan **JWT token** jika kredensial valid.

**Alur:**

1. Validasi input (`email`, `password` wajib diisi)
2. Cari user berdasarkan email
3. Verifikasi password dengan `bcrypt.compare()`
4. Generate JWT token dengan payload `{ id, email, role }`

```js
const valid = await bcrypt.compare(password, user.password);

const token = jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
);
```

---

## 7. Hash Password (bcrypt)

**bcrypt** digunakan untuk mengamankan password sebelum disimpan ke database. Hash bersifat satu arah (tidak bisa di-dekripsi).

| Operasi    | Fungsi                          | Keterangan                                                  |
| ---------- | ------------------------------- | ----------------------------------------------------------- |
| Hash       | `bcrypt.hash(password, 10)`     | Salt rounds = 10 (semakin tinggi, semakin aman tapi lambat) |
| Verifikasi | `bcrypt.compare(plain, hashed)` | Mengembalikan `true` jika cocok                             |

---

## 8. JWT Authentication

**JSON Web Token (JWT)** digunakan sebagai mekanisme autentikasi stateless. Token dikirim di header setiap request yang membutuhkan autentikasi.

### Struktur JWT

```
Header.Payload.Signature

Payload berisi: { id, email, role, iat, exp }
```

### Cara Penggunaan

Client menyertakan token di header request:

```
Authorization: Bearer <token>
```

---

## 9. Middleware

### 9.1 Middleware Verifikasi Token (`src/middlewares/auth.js`)

Middleware `authenticate` memvalidasi JWT token dari header `Authorization` sebelum request diteruskan ke controller.

```js
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token tidak ditemukan" });
  }

  const token = header.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findByPk(decoded.id, {
    attributes: { exclude: ["password"] },
  });

  req.user = user; // user tersedia di controller via req.user
  next();
};
```

**Kondisi error yang ditangani:**

- Header `Authorization` tidak ada → `401 Token tidak ditemukan`
- Token sudah kadaluarsa (`TokenExpiredError`) → `401 Token sudah kadaluarsa`
- Token tidak valid → `401 Token tidak valid`
- User tidak ditemukan di database → `401 User tidak ditemukan`

---

### 9.2 Middleware Otorisasi Role (`src/middlewares/roles.js`)

Middleware `authorize` memastikan bahwa user yang sudah login memiliki role yang sesuai untuk mengakses suatu endpoint.

```js
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Akses ditolak. Role '${req.user.role}' tidak diizinkan.`,
      });
    }
    next();
  };
};
```

**Contoh penggunaan:**

```js
// Hanya admin yang boleh akses
router.get("/users", authenticate, authorize("admin"), getAllUsers);

// Admin dan approver boleh akses
router.put(
  "/approve/:id",
  authenticate,
  authorize("admin", "approver"),
  approveDoc,
);
```

---

## 10. Role User

Terdapat **4 role** dalam sistem Archiva:

| Role       | Deskripsi                                            |
| ---------- | ---------------------------------------------------- |
| `uploader` | Role default. Dapat mengunggah dokumen.              |
| `reviewer` | Dapat meninjau dan memberi komentar pada dokumen.    |
| `approver` | Dapat menyetujui atau menolak dokumen.               |
| `admin`    | Akses penuh ke seluruh fitur dan manajemen pengguna. |

---

## 11. Endpoint API

Base URL: `http://localhost:3000/api`

### Auth Routes (`/api/auth`)

| Method | Endpoint             | Middleware     | Deskripsi                           |
| ------ | -------------------- | -------------- | ----------------------------------- |
| POST   | `/api/auth/register` | -              | Dfatar akun baru                    |
| POST   | `/api/auth/login`    | -              | Login dan dapatkan JWT token        |
| GET    | `/api/auth/me`       | `authenticate` | Lihat profil user yang sedang login |

---

### Detail Endpoint

#### POST `/api/auth/register`

**Request Body:**

```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "rahasia123",
  "role": "uploader"
}
```

**Response (201 Created):**

```json
{
  "message": "Registrasi berhasil",
  "data": {
    "id": 1,
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "role": "uploader"
  }
}
```

**Response Error (409 Conflict):**

```json
{
  "message": "Email sudah terdaftar"
}
```

---

#### POST `/api/auth/login`

**Request Body:**

```json
{
  "email": "budi@example.com",
  "password": "rahasia123"
}
```

**Response (200 OK):**

```json
{
  "message": "Login berhasil",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "role": "uploader"
    }
  }
}
```

**Response Error (401 Unauthorized):**

```json
{
  "message": "Email atau password salah"
}
```

---

#### GET `/api/auth/me`

**Header:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "data": {
    "id": 1,
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "role": "uploader",
    "createdAt": "2026-05-04T10:00:00.000Z",
    "updatedAt": "2026-05-04T10:00:00.000Z"
  }
}
```

**Response Error (401 Unauthorized):**

```json
{
  "message": "Token tidak ditemukan"
}
```

---

## 12. Cara Menjalankan Project

### 1. Clone dan install dependencies

```bash
git clone <url-repo>
cd Archiva
npm install
```

### 2. Buat file `.env`

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=archiva_db
DB_USER=root
DB_PASSWORD=your_password

JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

PORT=3000
NODE_ENV=development
```

### 3. Buat database MySQL

```sql
CREATE DATABASE archiva_db;
```

### 4. Jalankan server

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server akan berjalan di `http://localhost:3000`. Tabel akan dibuat otomatis oleh Sequelize.

---

## 13. Ringkasan Alur Sistem

```
Client
  │
  ├─ POST /register ──────────────────► authController.register
  │                                         │ validasi input
  │                                         │ cek email duplikat
  │                                         │ bcrypt.hash(password)
  │                                         └─► simpan ke DB
  │
  ├─ POST /login ─────────────────────► authController.login
  │                                         │ cari user by email
  │                                         │ bcrypt.compare()
  │                                         └─► jwt.sign() → kembalikan token
  │
  └─ GET /me ─── [Bearer Token] ──────► middleware authenticate
                                            │ jwt.verify(token)
                                            │ cari user by id
                                            └─► authController.me → kembalikan profil
```

---

## 14. Kesimpulan

Project **Archiva** berhasil mengimplementasikan sistem autentikasi backend yang aman dan terstruktur menggunakan Node.js, Express.js, dan MySQL. Beberapa poin penting dari implementasi ini:

- **Keamanan password** dijaga dengan bcrypt (salt rounds 10), sehingga password tidak pernah disimpan dalam bentuk teks biasa di database.
- **JWT** digunakan sebagai mekanisme autentikasi stateless, memungkinkan server tidak perlu menyimpan session — cukup memverifikasi token pada setiap request.
- **Middleware** dirancang modular: `authenticate` untuk verifikasi token dan `authorize` untuk pembatasan akses berdasarkan role, sehingga mudah diterapkan di endpoint manapun.
- **Sistem 4 role** (`uploader`, `reviewer`, `approver`, `admin`) memberikan fleksibilitas kontrol akses yang sesuai dengan alur kerja manajemen dokumen.
- **Sequelize ORM** mempermudah pengelolaan database dengan sinkronisasi model otomatis, sehingga tidak perlu membuat tabel secara manual.

Dengan fondasi ini, sistem siap dikembangkan lebih lanjut dengan fitur-fitur seperti manajemen dokumen, version control file, notifikasi, dan sebagainya.
