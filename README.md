# NexaTop — Web Top Up Game

Web top up game dengan Node.js, deploy Vercel, database GitHub JSON.

## Stack
- **Backend**: Node.js + Express
- **Frontend**: HTML/CSS/JS vanilla
- **Database**: GitHub Repository (JSON files)
- **Payment**: Digital Pedia (QRIS)
- **Provider**: ZXuan TopUp API

## Fitur
- ✅ List & detail game dari ZXuan API
- ✅ Top up dengan saldo (deposit via QRIS)
- ✅ Markup Rp1.000 per transaksi
- ✅ Registrasi & login user
- ✅ Dashboard transaksi & deposit
- ✅ Program reseller (Rp15.000 permanen)
- ✅ API docs untuk reseller
- ✅ Database otomatis di GitHub (JSON)

---

## Setup

### 1. Clone & Install
```bash
git clone <repo>
cd topup-web
npm install
```

### 2. Buat GitHub Repo untuk Database
1. Buat repo baru di GitHub (contoh: `nexatop-db`)
2. Buat folder `db/` di dalam repo tersebut
3. Buat 4 file JSON kosong: `users.json`, `transactions.json`, `deposits.json`, `resellers.json`
   - Isi masing-masing dengan: `[]`
4. Buat **Personal Access Token** di https://github.com/settings/tokens
   - Centang permission: `repo` (full)

### 3. Environment Variables
Copy `.env.example` ke `.env` dan isi:

```env
ZXUAN_API_KEY=zxt_live_prd_98a2c1d4e5f6a7b8c9d0
JWT_SECRET=random-secret-panjang-banget
GITHUB_REPO=username/nexatop-db
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_BRANCH=main
```

### 4. Deploy ke Vercel

**Via CLI:**
```bash
npm install -g vercel
vercel
```

**Via Dashboard:**
1. Push ke GitHub
2. Import di vercel.com
3. Tambahkan Environment Variables di Settings → Environment Variables

### 5. Set Environment Variables di Vercel
Di dashboard Vercel → Project → Settings → Environment Variables, tambahkan semua variable dari `.env.example`.

---

## Struktur Project
```
topup-web/
├── api/
│   ├── server.js           # Entry point
│   └── routes/
│       ├── auth.js         # Register & login
│       ├── games.js        # List/detail game
│       ├── order.js        # Buat order & cek status
│       ├── deposit.js      # Deposit QRIS
│       ├── user.js         # Profil user
│       ├── reseller.js     # Daftar reseller
│       └── reseller-api.js # Public API reseller
├── lib/
│   ├── github-db.js        # Database via GitHub API
│   └── auth.js             # JWT helper
├── public/
│   ├── index.html          # Beranda - list game
│   ├── game.html           # Detail game & pilih produk
│   ├── order.html          # Konfirmasi order
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html      # Riwayat transaksi & deposit
│   ├── deposit.html        # Deposit QRIS
│   ├── reseller.html       # Daftar reseller
│   └── docs.html           # API documentation
├── vercel.json
├── package.json
└── .env.example
```

---

## Reseller API

Reseller mendapat API Key dengan daftar di `/reseller` (Rp15.000 sekali bayar).

**Base URL:** `https://yourdomain.vercel.app/api/v1`

**Header:** `X-Api-Key: rsl_xxxxx`

**Endpoints:**
- `GET /game/list` — List game
- `GET /game/:slug/detail` — Detail & produk
- `GET /game/:slug/product/:code` — Cek produk
- `POST /game/order` — Buat order
- `POST /game/status` — Cek status
- `POST /deposit/create` — Buat deposit QRIS
- `POST /deposit/status` — Cek status deposit

Semua harga sudah termasuk markup Rp1.000.

---

## Database GitHub

Database disimpan sebagai JSON di GitHub repo:
- `db/users.json` — Data user
- `db/transactions.json` — Riwayat transaksi
- `db/deposits.json` — Riwayat deposit
- `db/resellers.json` — Data reseller

Setiap perubahan data otomatis commit ke GitHub.
