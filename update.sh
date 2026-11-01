#!/bin/bash
# Script Pembaruan Otomatis (Auto Update) untuk VPS Linux (Ubuntu/Debian)
# Jalankan dengan perintah: bash update.sh

echo "=========================================================="
echo "🚀 MEMULAI UPDATE APLIKASI PERTANIAN KECAMATAN LEMBEYAN"
echo "=========================================================="

# 1. Menarik kode terbaru dari GitHub
echo "📥 1. Menarik commit terbaru dari GitHub..."
git pull origin main

# 2. Update dependensi jika ada penambahan package baru
echo "📦 2. Memeriksa dependensi package..."
npm install

# 3. Sinkronisasi skema database Prisma (tanpa menghapus data riil)
echo "🗄️ 3. Menyinkronkan struktur database..."
npx prisma generate
npx prisma db push

# 4. Build aplikasi Next.js untuk produksi
echo "⚙️ 4. Mengompilasi Next.js production build..."
npm run build

# 5. Reload server PM2 tanpa downtime (Zero Downtime)
echo "🔄 5. Me-reload proses PM2..."
if pm2 list | grep -q "pertanian-app"; then
    pm2 reload pertanian-app
    echo "✅ Aplikasi berhasil di-reload dengan versi terbaru!"
else
    pm2 start npm --name "pertanian-app" -- start
    pm2 save
    echo "✅ Aplikasi berhasil dijalankan pertama kali dengan PM2!"
fi

echo "=========================================================="
echo "🎉 UPDATE SELESAI 100%! FITUR BARU SUDAH LANGSUNG AKTIF"
echo "=========================================================="
