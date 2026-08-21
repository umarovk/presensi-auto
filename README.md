# Presensi Auto

Script buat auto-login ke sistem presensi SMK Cokroaminoto Wanadadi
(`smkcokrowanadadi.cazh.id`) dan buka halaman presensi sampai siap di-scan,
lalu dijadwalkan jalan otomatis tiap hari lewat Windows Task Scheduler.

**Penting:** script ini **tidak** melakukan submit/scan presensi secara
otomatis. Dia cuma login otomatis lalu klik "Selanjutnya" sampai halaman
scan QR kebuka — proses scan barcode fisik tetap harus dilakukan manual.
Ini disengaja: barcode di sistem ini dipakai untuk membuktikan kehadiran
fisik, jadi mengotomasi bagian itu berarti mencatat "hadir" tanpa benar-benar
hadir.

## Syarat

- Windows 10/11
- [Node.js](https://nodejs.org/) (LTS terbaru, sudah termasuk `npm`)
- Koneksi internet (buat install dependency & saat script jalan)
- Akun presensi (email + password) yang valid

> Catatan PowerShell: kalau `npm`/`npx` gagal dengan error
> "running scripts is disabled on this system", panggil versi `.cmd`-nya:
> `npm.cmd` dan `npx.cmd` (bukan ubah execution policy).

## Instalasi

1. Clone/copy folder ini, lalu buka terminal di dalamnya.
2. Install dependency:
   ```
   npm.cmd install
   ```
3. Install browser Chromium buat Playwright (sekali aja per PC):
   ```
   npx.cmd playwright install chromium
   ```
4. Salin `.env.example` jadi `.env`:
   ```
   copy .env.example .env
   ```
5. Edit `.env`, isi email & password akun presensi kamu:
   ```
   PRESENSI_EMAIL=email_kamu@example.com
   PRESENSI_PASSWORD=password_kamu
   ```
   File `.env` ini **jangan pernah** di-share atau di-commit ke git — isinya
   password. Sudah otomatis di-ignore lewat `.gitignore`.

## Coba jalankan manual

```
node presensi.js
```

Browser Chromium bakal kebuka, login otomatis, lalu berhenti di halaman
scan QR. Biarkan terbuka dan scan barcode fisik seperti biasa.

Kalau ini pertama kali dijalankan di PC tersebut, sesi login akan disimpan
di folder `.browser-profile/` supaya run berikutnya nggak perlu login ulang
selama sesinya masih valid.

## Jadwalkan otomatis (Windows Task Scheduler)

Script dipanggil lewat `run.bat` (bukan langsung `presensi.js`), karena
`run.bat` yang mengurus pindah folder kerja & simpan log ke `run.log`.

### Lewat GUI

1. Buka Start → ketik **Task Scheduler** → buka aplikasinya.
2. Klik **Create Task...** (bukan "Create Basic Task").
3. Tab **General**:
   - Name: `Presensi Auto`
   - Centang **Run only when user is logged on** (browser perlu tampil di
     layar biar bisa discan)
4. Tab **Triggers** → **New...**:
   - Begin the task: **On a schedule**
   - Pilih **Daily** atau **Weekly** (kalau cuma hari kerja, pilih Weekly
     lalu centang Senin–Jumat)
   - Set jam di **Start**
5. Tab **Actions** → **New...**:
   - Action: **Start a program**
   - Program/script: path lengkap ke `run.bat`, contoh:
     `C:\Users\umar\presensi-auto\run.bat`
   - Start in (optional): folder project-nya, contoh:
     `C:\Users\umar\presensi-auto`
6. Tab **Conditions**: kalau ini laptop, uncheck "Start the task only if
   the computer is on AC power" biar tetap jalan walau nggak dicas.
7. Klik **OK**, masukkan password Windows kalau diminta.
8. Test dulu: klik kanan task-nya di daftar → **Run**, pastikan browser
   kebuka dan sampai ke halaman scan sebelum dibiarkan jalan otomatis.

### Lewat command (opsional)

```
schtasks /Create /TN "Presensi Auto" /TR "C:\Users\umar\presensi-auto\run.bat" /SC WEEKLY /D MON,TUE,WED,THU,FRI /ST 06:30
```

Ganti hari (`/D`) dan jam (`/ST`) sesuai kebutuhan. Hapus task kalau perlu:

```
schtasks /Delete /TN "Presensi Auto" /F
```

## Pindah ke PC lain

Yang perlu dibawa: seluruh folder project (**kecuali** `node_modules/` dan
`.browser-profile/`, biar diinstall ulang di PC tujuan) plus file `.env`
(dibuat manual lagi di sana, jangan copy-paste plaintext lewat media yang
gak aman). Di PC baru, ulangi langkah **Instalasi** di atas dari awal.

## Struktur file

| File | Fungsi |
|---|---|
| `presensi.js` | Script utama: login otomatis + buka halaman scan |
| `run.bat` | Wrapper buat dipanggil dari Task Scheduler |
| `.env` | Kredensial login (tidak di-commit ke git) |
| `.env.example` | Template `.env` |
| `.browser-profile/` | Profil Chrome (cookie sesi, izin kamera) — tidak di-commit |
| `run.log` | Log hasil run terakhir dari `run.bat` — tidak di-commit |
