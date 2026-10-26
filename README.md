# Kos Popo — Prototipe Sistem Informasi Manajemen Kos

Prototipe web front-end sistem informasi manajemen kos **"Kos Popo"** dirancang dengan antarmuka bersih, responsif, dan ramah pengguna berbahasa Indonesia. Aplikasi ini menyediakan 3 portal peran: **Penghuni**, **Admin Kos**, dan **Pemilik Kos**.

> **Catatan Proyek:** Produk sistem informasi yang sesungguhnya adalah modul Odoo 19 `kos_popo`. Aplikasi web ini merupakan prototipe antarmuka UI/UX dan simulasi aturan bisnis untuk Proyek Akhir Manajemen Proyek. Semua nama penghuni, nomor telepon, kontak darurat, dan rincian fasilitas di dalam sistem ini merupakan data contoh simulasi.

---

## Fitur Utama (F1 – F5)

### F1: Autentikasi & Keamanan Prototipe
- **Login Terpadu**: Masuk menggunakan email resmi (`admin@kospopo.id`, `pemilik@kospopo.id`) atau nomor kamar penghuni (`K01`–`K20`).
- **Normalisasi Nomor Kamar**: Input nomor kamar dinormalisasi secara otomatis (`K5`, `k5`, `k05` dipetakan ke format standar 2 digit `K05`) sebelum verifikasi.
- **Deteksi Peran Real-Time**: Chip pemilih peran "Masuk sebagai Penghuni (K05)" muncul dinamis dan hanya tampil apabila kamar tersebut benar-benar terdaftar di dalam sistem kos.
- **Pesan Kesalahan Seragam**: Menampilkan satu pesan ramah yang aman: *"Akun atau kata sandi belum cocok. Coba cek lagi ya."* untuk mencegah pembocoran keberadaan akun atau status kamar.
- **Opsi "Ingat Saya"**: Sesi disimpan di `localStorage` jika dicentang, atau di `sessionStorage` (berakhir saat tab ditutup) jika tidak dicentang.
- **PIN Penghuni Acak & Reset PIN**: Penghuni baru mendapatkan PIN 4-digit acak yang ditampilkan sekali kepada admin dengan tombol salin, serta aksi "Reset PIN" mandiri di menu detail penghuni yang menghasilkan 4 digit baru secara acak.

### F2: Manajemen Kamar & Penghuni
- **Entitas Tipe Kamar**: Tipe kamar menjadi entitas mandiri (`Tipe 1`: Rp700.000, `Tipe 2`: Rp800.000, `Tipe 3`: Rp900.000). Harga sewa kamar selalu diturunkan secara dinamis dari tipenya.
- **Kapasitas Dinamis**: Seluruh kartu dan header menampilkan kapasitas kamar secara dinamis (`rooms.length`), bukan teks statis.
- **Validasi Kamar Ketat**: Format kamar wajib huruf `K` + 2 digit (contoh: `K01`, `K20`), unik (tidak peka huruf besar/kecil). Logika `addRoomDomain` menolak format salah dan nomor kembar.
- **Aturan Hunian**: Satu kamar hanya dapat ditempati oleh 1 penghuni aktif.
- **Status Kamar Otomatis**: Otomatis berubah menjadi *Terisi* saat penghuni ditambahkan dan kembali *Kosong* saat penghuni dinonaktifkan.
- **Field `deactivatedDate`**: Saat admin menonaktifkan penghuni (`deactivateTenant`), sistem mencatat tanggal penonaktifan ke dalam field `deactivatedDate` (format `YYYY-MM-DD` sesuai tanggal demo aktif `getToday()`).
- **Aturan Okupansi Akhir Bulan**: Pada fungsi `calculateOccupancyForPeriod`, penghuni berstatus *Nonaktif* tidak dihitung pada bulan dinonaktifkannya (`deactivatedDate`) maupun bulan-bulan sesudahnya, melainkan hanya dihitung pada bulan-bulan sebelum penonaktifannya. Dengan demikian, tingkat okupansi pada periode berjalan selalu sinkron dan sama persis dengan jumlah kamar berstatus *Terisi*.
- **Pindah Kamar Konsisten**: Memperbarui nomor kamar dan tarif sewa pada tagihan *Belum*, tanpa mengubah tagihan yang sudah *Lunas*.
- **Penghapusan Kamar Aman (`deleteRoomDomain`)**: Kamar hanya dapat dihapus jika berstatus kosong serta tidak memiliki riwayat penghuni maupun transaksi tagihan.

### F3: Manajemen Tagihan & Pembayaran
- **Pencocokan Tagihan Berbasis Penghuni**: Tagihan diidentifikasi murni berdasarkan `tenantId`. Penghuni baru di kamar bekas tidak akan mewarisi tagihan penghuni lama.
- **Integritas Periode**: Penghuni tidak dapat memiliki tagihan sebelum bulan tanggal mulai sewanya (`startDate`).
- **Pencegahan Tagihan Ganda**: Satu penghuni hanya memiliki tepat satu tagihan per periode bulan sewa.
- **Status "Telat" Dinamis**: Status keterlambatan merupakan tampilan turunan (*derived view*) dari tagihan berstatus *Belum* yang melewati tanggal jatuh tempo berdasarkan tanggal sistem demo. Struktur data internal tetap jujur hanya menyimpan status *Lunas* dan *Belum*.
- **Riwayat Transaksi Realistis**: Dilengkapi riwayat pembayaran Mei–September 2026 yang realistis dengan variasi tanggal bayar, metode pembayaran, serta beberapa tunggakan riil.

### F4: Penanganan Komplain & Laporan Kerusakan
- Penghuni dapat melaporkan kerusakan fasilitas kamar atau kos beserta foto dan kategori keluhan.
- Admin dapat menindaklanjuti status laporan (*Dilaporkan*, *Diproses*, *Selesai*) dan mencatat biaya perbaikan aktual.

### F5: Rekap Laporan & Analisis Pemilik
- **Kalkulasi Data Murni (Tanpa Angka Tetap)**: Seluruh grafik dan kartu ringkasan dihitung secara dinamis dari data pembayaran dan sewa menggunakan formula `calculatePeriodSummary` yang konsisten (angka kartu dan grafik untuk periode yang sama 100% identik).
- **Kartu "Tunggakan Lewat Tempo" per Periode**: Menghitung tagihan belum lunas pada bulan yang sedang dipilih yang telah melewati tanggal jatuh tempo (tanggal 10).
- **Kartu "Total Belum Lunas Semua Periode"**: Menampilkan baris/kartu ringkasan kumulatif seluruh tagihan berstatus *Belum* yang telah melewati jatuh tempo menurut tanggal demo tanpa filter periode (pada data awal bernilai Rp4.700.000 dari 6 tagihan telat).
  - *Definisi:* Tunggakan periode adalah tagihan belum lunas pada bulan terpilih, sedangkan total belum lunas semua periode merangkum seluruh tagihan lewat tempo sejak kos beroperasi.
- **Daftar Kamar Kosong Dinamis**: Kartu Tingkat Okupansi menampilkan seluruh nomor kamar kosong secara dinamis dari data `rooms` tanpa cadangan teks statis.
- **Halaman Rekap Laporan Pemilik (`/pemilik/rekap`)**:
  - Filter periode (pilihan bulan tertentu atau opsi "Semua Periode").
  - Ringkasan pendapatan, tunggakan, persentase okupansi, dan biaya perbaikan selesai.
  - Tabel rincian pembayaran per kamar.
  - **Unduh CSV**: Standar UTF-8 dengan BOM (`\uFEFF`) dan pemisah titik koma (`;`) yang langsung rapi dibuka di Microsoft Excel.
  - **Cetak Laporan**: Terintegrasi `window.print()` dengan `@media print` rapi tanpa navigasi sidebar/tombol.

---

## Mode Demo & Tanggal Sistem Stabil

Untuk menjaga konsistensi demonstrasi presentasi:
- **Tanggal Demo Default**: Sistem menggunakan tanggal stabil **13 Oktober 2026** yang tersimpan di `localStorage`.
- **Kontrol Mode Demo**: Terletak di bagian bawah sidebar portal Admin:
  - Tampilan tanggal demo aktif.
  - Pemilih tanggal kustom untuk menguji perubahan periode dan penghitungan keterlambatan tagihan.
  - Tombol untuk kembali ke tanggal asli komputer.
  - Tombol "Reset Data Demo" dengan dialog konfirmasi untuk mengembalikan data awal.

---

## Akun Demo

| Peran | Identitas Login | Kata Sandi / PIN | Keterangan |
| :--- | :--- | :--- | :--- |
| **Admin Kos** | `admin@kospopo.id` | `admin123` | Mbak Sarah (Pengelola Operasional) |
| **Pemilik Kos** | `pemilik@kospopo.id` | `pemilik123` | Pak Hendra (Pemilik Modal) |
| **Penghuni Demo** | `K05` | `1234` | Rian Pratama (Kamar K05, Tipe 2) |
| **Penghuni Lain** | `K01` s.d. `K20` | PIN terdaftar | Gunakan tombol login cepat di halaman Login |

*Peringatan: Kredensial dan PIN di atas hanya untuk keperluan demonstrasi prototipe lokal.*

---

## Cara Menjalankan

### 1. Prasyarat
- Node.js versi 18 atau lebih baru
- NPM atau Bun package manager

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Menjalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi berjalan pada `http://localhost:3000`.

### 4. Menjalankan Pengujian Otomatis
```bash
npm run test
```
Menjalankan seluruh **18 unit test** Vitest untuk memverifikasi logika bisnis murni:
1. Harga sewa mengikuti tipe kamar dari entitas `roomTypes` (F2).
2. Satu kamar hanya dapat dihuni oleh satu penghuni aktif (F2).
3. Status kamar otomatis: *Terisi* saat tambah, *Kosong* saat nonaktif (F2).
4. Tagihan dicocokkan dengan `tenantId` dan tidak boleh ada tagihan sebelum `startDate` (F3).
5. Pencegahan tagihan ganda per penghuni per periode (F3).
6. Status "Telat" dihitung dinamis dari tanggal jatuh tempo terhadap tanggal demo (F3).
7. Pindah kamar memperbarui nomor kamar dan tarif tagihan *Belum*, tanpa mengubah tagihan *Lunas* (F3).
8. Riwayat pembayaran lengkap Mei–September 2026 realistis (F3).
9. Konsistensi pendapatan & tunggakan: formula rekap dan grafik identik (F5).
10. Login nomor kamar: normalisasi `K5`/`k5`/`k05`/`K05` -> `K05`, cek kamar ada, dan pesan kesalahan seragam (F1).
11. Okupansi: nonaktifkan satu penghuni pada 2026-10-13 -> okupansi Oktober = 18 dan November = 18.
12. Tunggakan: Total belum lunas semua periode pada data awal bernilai Rp4.700.000.
13. Manajemen Kamar: `addRoomDomain` memvalidasi format, nomor kembar, dan sukses menambah kamar.
14. Manajemen Kamar: `deleteRoomDomain` menolak kamar berriwayat dan menghapus kamar kosong bersih.
15. Keamanan: `resetTenantPinDomain` menghasilkan PIN 4 digit baru yang berbeda.
16. Tanggal demo: `getToday` membaca tanggal demo stabil dan sinkron dengan `localStorage`.
17. Unduh CSV Rekap: menggunakan UTF-8 BOM dan pemisah titik koma (F5).
18. Okupansi historis: penghuni nonaktif tetap dihitung pada bulan-bulan sebelum dinonaktifkan (September = 19).

### 5. Memeriksa Sintaks & Tipe (Linting)
```bash
npm run lint
```

### 6. Build Produksi
```bash
npm run build
```

---

## Struktur Folder

```
kos-popo/
├── src/
│   ├── components/
│   │   ├── charts/          # Grafik analitik pemilik (OwnerCharts.tsx)
│   │   ├── common/          # Komponen UI bersama (Badge, Card, StatBlock, Skeleton, dll.)
│   │   ├── ui/              # Modal, Toast, dll.
│   │   └── ProtectedRoute.tsx
│   ├── context/
│   │   └── AppContext.tsx   # State global & sinkronisasi localStorage
│   ├── data/
│   │   └── mockData.ts      # Data inisial 20 kamar, tipe kamar, & riwayat pembayaran
│   ├── pages/
│   │   ├── admin/           # Portal Admin: Kamar, Penghuni, Pembayaran, Kerusakan
│   │   ├── pemilik/         # Portal Pemilik: Dashboard Analitik & Rekap Laporan
│   │   ├── penghuni/        # Portal Penghuni: Dashboard, Info Kamar, Tagihan, Komplain
│   │   └── Login.tsx        # Halaman autentikasi terpadu
│   ├── types/
│   │   └── index.ts         # TypeScript definitions
│   ├── utils/
│   │   ├── auth.ts          # Helper autentikasi demo
│   │   ├── domain.ts        # Logika bisnis murni (F1-F5)
│   │   ├── domain.test.ts   # 18 pengujian otomatis Vitest
│   │   └── formatters.ts    # Format mata uang rupiah, tanggal, & periode
│   ├── App.tsx              # Router aplikasi
│   ├── main.tsx             # Entry point React
│   └── index.css            # Desain Tailwind CSS & tema gelap
├── vitest.config.ts         # Konfigurasi pengujian Vitest
├── vite.config.ts           # Konfigurasi bundler Vite
├── metadata.json            # Konfigurasi AI Studio
├── package.json             # Dependensi dan skrip proyek
└── README.md                # Dokumentasi proyek
```

---

## Batasan Prototipe

1. **Penyimpanan Lokal**: Prototipe ini beroperasi sepenuhnya di sisi klien (*client-side*). Data tersimpan di `localStorage` peramban web pengguna dan tidak terhubung ke basis data server eksternal.
2. **Kredensial Sisi Klien**: Kredensial dan PIN diverifikasi langsung di sisi browser untuk keperluan simulasi prototipe.
3. **Status Keterlambatan**: Status "Telat" dihitung secara dinamis dari tanggal jatuh tempo terhadap tanggal demo yang aktif; basis data hanya menyimpan status biner *Lunas* atau *Belum*.
4. **Data Fiktif**: Seluruh profil penghuni, nomor kontak, nomor rekening, dan fasilitas kos disediakan semata-mata sebagai data contoh simulasi.
