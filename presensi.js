// Auto-login + buka halaman presensi sampai siap di-scan.
// TIDAK melakukan submit/scan otomatis - langkah scan QR fisik tetap manual.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const PRESENSI_URL = "https://smkcokrowanadadi.cazh.id/presensi";
const USER_DATA_DIR = path.join(__dirname, ".browser-profile");

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    console.error('File ".env" tidak ditemukan. Salin ".env.example" jadi ".env" lalu isi kredensialnya.');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

function disablePasswordManagerPrompt() {
  const profileDir = path.join(USER_DATA_DIR, "Default");
  fs.mkdirSync(profileDir, { recursive: true });
  const prefsPath = path.join(profileDir, "Preferences");
  let prefs = {};
  if (fs.existsSync(prefsPath)) {
    try {
      prefs = JSON.parse(fs.readFileSync(prefsPath, "utf8"));
    } catch {
      prefs = {};
    }
  }
  prefs.credentials_enable_service = false;
  prefs.profile = prefs.profile || {};
  prefs.profile.password_manager_enabled = false;
  fs.writeFileSync(prefsPath, JSON.stringify(prefs));
}

async function main() {
  const env = loadEnv();
  if (!env.PRESENSI_EMAIL || !env.PRESENSI_PASSWORD) {
    console.error("PRESENSI_EMAIL / PRESENSI_PASSWORD kosong di .env");
    process.exit(1);
  }

  // Matikan popup "Simpan password?" bawaan Chrome sebelum browser dibuka.
  disablePasswordManagerPrompt();

  // Persistent context: menyimpan cookie login & izin kamera antar-run,
  // jadi kalau sesi masih valid, tidak perlu login ulang tiap hari.
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: null,
    args: ["--start-fullscreen"],
  });

  const page = context.pages()[0] || (await context.newPage());

  await page.goto(PRESENSI_URL, { waitUntil: "domcontentloaded" });

  // Form login ada di komponen Livewire yang nempel di /presensi juga
  // (URL-nya gak pernah pindah ke /login), jadi deteksinya berdasarkan
  // ada-tidaknya field email di layar, bukan dari URL.
  const emailBox = page.getByRole("textbox", { name: "Email" });
  const loginVisible = await emailBox
    .waitFor({ state: "visible", timeout: 10000 })
    .then(() => true)
    .catch(() => false);

  if (loginVisible) {
    await emailBox.fill(env.PRESENSI_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(env.PRESENSI_PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();
  }

  // Hasil rekaman: cuma ada satu instansi jadi langsung klik "Selanjutnya"
  // sampai masuk ke halaman scan QR.
  await page.getByRole("button", { name: "Selanjutnya" }).click({ timeout: 30000 });

  // Scanner RFID/kartu ngirim data sebagai keystroke ke elemen yang lagi
  // fokus. Kalau fokusnya masih di address bar (bukan di halaman), hasil
  // scan bisa nyasar jadi pencarian Google. Jadi pastikan jendela browser
  // di depan DAN kursor difokuskan ke field scan-nya sebelum dibiarkan idle.
  await page.bringToFront();

  const scanBox = page.getByRole("textbox", { name: "Nomor kartu atau nomor RFID" });
  await scanBox.waitFor({ state: "visible", timeout: 15000 });
  await scanBox.click();

  console.log("Browser dibiarkan terbuka di halaman presensi, field scan sudah fokus. Siap discan.");
  // Browser sengaja TIDAK ditutup (context.close() tidak dipanggil)
  // supaya tetap standby untuk proses scan.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
