/**
 * What's new, newest first. The first entry must match `package.json` / `app.json` version
 * and the git tag `v{version}` (run `npm run release:check`).
 * Keep each note to one plain sentence a non-technical user would understand.
 */
export interface ChangelogEntry {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  en: string[];
  id: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.4',
    date: '2026-11-18',
    en: [
      'On the home screen, tap Overdue, Due soon, On track or No schedule to show only those assets. Tap more to add them, and “Show all” brings everything back.',
      'With 3 assets per row, the pictures are now bigger.',
      'A ✅ now appears next to “Email verified”.',
      'The asset page shows “-” when there are no reminders.',
      'Fixed: something you saved while the app was syncing could be lost. It is now always kept and sent to the cloud right after.',
    ],
    id: [
      'Di layar utama, ketuk Terlambat, Segera, Aman, atau Belum jadwal untuk menampilkan aset itu saja. Ketuk yang lain untuk menambah, dan “Tampilkan semua” mengembalikan semuanya.',
      'Dengan 3 aset per baris, gambarnya kini lebih besar.',
      '✅ kini muncul di samping “Email terverifikasi”.',
      'Halaman aset menampilkan “-” jika belum ada pengingat.',
      'Diperbaiki: data yang kamu simpan saat aplikasi sedang sinkronisasi bisa hilang. Kini selalu tersimpan dan langsung dikirim ke cloud sesudahnya.',
    ],
  },
  {
    version: '1.2.3',
    date: '2026-11-18',
    en: [
      'When you verify your email, your phone can now suggest the code from the email above the keyboard, so you can fill it in with one tap.',
    ],
    id: [
      'Saat memverifikasi email, ponselmu kini bisa menyarankan kode dari email di atas keyboard, jadi cukup satu ketukan untuk mengisinya.',
    ],
  },
  {
    version: '1.2.2',
    date: '2026-11-18',
    en: [
      'The quick month buttons (+1m to +6m) now fit on one row, even on small phones.',
      'Removed the “Add schedule” button from the asset page. You can still set reminders from Edit.',
    ],
    id: [
      'Tombol bulan cepat (+1bln sampai +6bln) kini muat dalam satu baris, juga di ponsel kecil.',
      'Tombol “Tambah jadwal” dihapus dari halaman aset. Pengingat tetap bisa diatur lewat Ubah.',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-11-18',
    en: [
      'After saving a service record, the back arrow now takes you to Home instead of back to the form.',
      'Same fix after saving a km update, editing an asset, or archiving one.',
      'New accounts no longer see the “What’s new” pop-up on their first visit.',
      'Service records on an asset are now listed by service date, newest first.',
    ],
    id: [
      'Setelah menyimpan catatan servis, tombol kembali kini membawamu ke Beranda, bukan ke formulir lagi.',
      'Perbaikan yang sama setelah menyimpan km, mengubah aset, atau mengarsipkannya.',
      'Akun baru tidak lagi melihat pop-up “Yang baru” saat pertama kali masuk.',
      'Catatan servis pada aset kini diurutkan menurut tanggal servis, yang terbaru di atas.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-11-18',
    en: [
      'Press Enter to continue after typing your email, and to verify your code.',
      'Signing in with an email you already registered now loads your data automatically.',
      'New “What’s new” page in Account, so you can see what changed in each version.',
    ],
    id: [
      'Tekan Enter untuk lanjut setelah mengetik email, dan untuk memverifikasi kode.',
      'Masuk dengan email yang sudah terdaftar kini memuat datamu secara otomatis.',
      'Halaman “Yang baru” di Akun, supaya kamu tahu apa yang berubah di tiap versi.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-11-05',
    en: [
      'Your assets now sync across devices after you verify your email.',
      'Receipt and service tag photos are saved in the cloud and follow you to a new device.',
      'You can add, change, or remove photos on a past service record.',
      'Simpler asset details and editing, and a tidier home screen.',
      'Servizio now lives at servizio.ai.id.',
    ],
    id: [
      'Asetmu kini tersinkron di semua perangkat setelah email diverifikasi.',
      'Foto nota dan stiker servis tersimpan di cloud dan ikut ke perangkat baru.',
      'Kamu bisa menambah, mengganti, atau menghapus foto di catatan servis lama.',
      'Detail dan pengeditan aset lebih sederhana, tampilan beranda lebih rapi.',
      'Servizio kini ada di servizio.ai.id.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-08-20',
    en: [
      'First release: track cars, motorcycles, AC, water heaters, and more in one place.',
      'See what is due soon or overdue, by date, by km, or both.',
      'Log services and odometer readings, with cost, vendor, and photos.',
      'Protected by a PIN on your device. English and Indonesian.',
    ],
    id: [
      'Rilis pertama: catat mobil, motor, AC, water heater, dan lainnya di satu tempat.',
      'Lihat mana yang segera jatuh tempo atau terlambat, berdasarkan tanggal, km, atau keduanya.',
      'Catat servis dan odometer, lengkap dengan biaya, bengkel, dan foto.',
      'Dilindungi PIN di perangkatmu. Tersedia dalam bahasa Inggris dan Indonesia.',
    ],
  },
];
