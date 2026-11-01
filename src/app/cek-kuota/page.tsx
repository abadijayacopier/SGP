'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  QrCode,
  ShieldCheck,
  Sprout,
  MapPin,
  CreditCard,
  Printer,
  Calendar,
  Calculator,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  UserCheck,
  Clock,
  Sparkles,
  Code2,
  MessageCircle,
  Send,
  Share2,
  Check,
  Copy,
  Info,
  ExternalLink,
} from 'lucide-react';
import QrScannerModal from '@/components/ui/QrScannerModal';
import QrCodeView from '@/components/ui/QrCodeView';
import { hitungRekomendasiPupuk, formatRupiah } from '@/lib/calculations';
import { copyToClipboard } from '@/lib/clipboard';
import { useAuth } from '@/lib/auth-context';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export default function CekKuotaPage() {
  const { currentUser, isMounted } = useAuth();

  // Privasi Petani: Akun Petani dikunci hanya ke data dan kuotanya sendiri
  const isPetaniLocked = isMounted && currentUser.role === 'PETANI';

  // NIK / ID milik Petani yang sedang login
  const myFarmerKey =
    currentUser.nik ||
    (currentUser.username && /^\d{16}$/.test(currentUser.username) ? currentUser.username : null) ||
    (currentUser.nip?.replace(/[^0-9]/g, '')?.length === 16
      ? currentUser.nip.replace(/[^0-9]/g, '')
      : null) ||
    currentUser.petaniId ||
    '3509012304750001';
  const [activeTab, setActiveTab] = useState<'verifikasi' | 'kalkulator'>('verifikasi');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultData, setResultData] = useState<any | null>(null);
  const [samplePetani, setSamplePetani] = useState<any[]>([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Kalkulator Cerdas Musim Tanam (MT-1, MT-2, MT-3) & Dosis Presisi BPP Lembeyan
  const [calcMusimTanam, setCalcMusimTanam] = useState<'MT-1' | 'MT-2' | 'MT-3'>('MT-1');
  const [calcKomoditas, setCalcKomoditas] = useState('Padi');
  const [calcLuasHa, setCalcLuasHa] = useState('1.0');
  const [calcTanggalTanam, setCalcTanggalTanam] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [allLahanList, setAllLahanList] = useState<any[]>([]);
  const [selectedLahanId, setSelectedLahanId] = useState<string>('MANUAL');
  const [selectedLahanObj, setSelectedLahanObj] = useState<any | null>(null);
  const [copiedWa, setCopiedWa] = useState(false);

  // Muat data awal: petani terkunci -> data miliknya; selain itu daftar sampel
  useEffect(() => {
    if (!isMounted) return;

    // Muat seluruh lahan GIS untuk dropdown kalkulator
    fetch('/api/lahan')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setAllLahanList(json.data);

          // Cek URL query params (misal dari peta GIS atau link langsung)
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            const lahanIdParam = params.get('lahanId');
            const mtParam = params.get('mt') as 'MT-1' | 'MT-2' | 'MT-3' | null;

            if (tabParam === 'kalkulator') {
              setActiveTab('kalkulator');
            }
            if (mtParam && ['MT-1', 'MT-2', 'MT-3'].includes(mtParam)) {
              setCalcMusimTanam(mtParam);
            }
            if (lahanIdParam) {
              const matched = json.data.find((l: any) => l.id === lahanIdParam);
              if (matched) {
                setSelectedLahanId(matched.id);
                setSelectedLahanObj(matched);
                setCalcKomoditas(matched.komoditas);
                setCalcLuasHa(matched.luasHa.toString());
                setActiveTab('kalkulator');
              }
            }
          }
        }
      })
      .catch((err) => console.error(err));

    if (isPetaniLocked) {
      setSamplePetani([]);
      handleSearch(myFarmerKey);
      return;
    }
    const loadSamples = async () => {
      try {
        const res = await fetch('/api/cek-kuota');
        const json = await res.json();
        if (json.success && json.samples) {
          setSamplePetani(json.samples);
          if (json.samples.length > 0) {
            handleSearch(json.samples[0].nik);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadSamples();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, isPetaniLocked, myFarmerKey]);

  const handleSearch = async (overrideQuery?: string) => {
    let target = (overrideQuery !== undefined ? overrideQuery : query).trim();

    // Privasi Petani: Akun Petani hanya boleh melihat kuota miliknya sendiri
    if (isPetaniLocked) {
      const isSearchingOwn =
        !target ||
        target === myFarmerKey ||
        target === currentUser.petaniId ||
        target === currentUser.nik ||
        (currentUser.name && target.toLowerCase() === currentUser.name.toLowerCase());

      if (!isSearchingOwn) {
        Swal.fire({
          icon: 'warning',
          title: 'Akses Kuota Terbatas',
          html: `
            <div style="font-size: 13px; text-align: left; color: #334155; line-height: 1.6;">
              <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 12px; margin-bottom: 12px;">
                <p style="color: #92400e; font-weight: bold; margin: 0;">Pemberitahuan Hak Akses Mandiri</p>
                <p style="color: #78350f; font-size: 12px; margin: 4px 0 0 0;">
                  Anda saat ini login sebagai Petani <strong>${currentUser.name}</strong>.
                </p>
              </div>
              <p>Berdasarkan ketentuan privasi data petani penerima pupuk subsidi e-RDKK, Anda <strong>hanya berhak melihat kuota dan dokumen milik Anda sendiri</strong>.</p>
            </div>
          `,
          confirmButtonColor: '#059669',
          confirmButtonText: 'Tampilkan Kuota Saya',
          customClass: {
            popup: 'rounded-3xl shadow-2xl',
            confirmButton: 'rounded-xl text-xs font-bold px-4 py-2.5',
          },
        });
        target = myFarmerKey;
      } else if (!target) {
        target = myFarmerKey;
      }
    }

    if (!target) {
      setErrorMsg('Silakan masukkan 16 Digit NIK KTP Petani terdaftar.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      if (overrideQuery !== undefined) {
        setQuery(overrideQuery);
      }
      const roleParam = isPetaniLocked
        ? `&callerRole=PETANI&callerNik=${encodeURIComponent(myFarmerKey)}`
        : '';
      const res = await fetch(`/api/cek-kuota?q=${encodeURIComponent(target)}${roleParam}`);
      const json = await res.json();
      if (json.success) {
        setResultData(json);
      } else {
        setResultData(null);
        setErrorMsg(json.error || 'Data tidak ditemukan.');

        // Tampilkan modal notifikasi modern jika NIK tidak terdaftar
        Swal.fire({
          icon: 'warning',
          title: 'NIK Tidak Terdaftar di e-RDKK',
          html: `
            <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.6;">
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 14px; padding: 14px; margin-bottom: 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 11px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Nomor Identitas</span>
                  <span style="background-color: #fee2e2; color: #991b1b; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 9999px;">Tidak Ditemukan</span>
                </div>
                <p style="font-family: monospace; font-size: 16px; font-weight: bold; color: #7f1d1d; margin: 2px 0 6px 0;">${target}</p>
                <p style="color: #991b1b; font-size: 12px; margin: 0;">Nomor KTP ini belum tercatat pada daftar alokasi kuota pupuk bersubsidi e-RDKK Kecamatan Lembeyan Tahun Anggaran 2026.</p>
              </div>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; font-size: 12px;">
                <p style="font-weight: 800; color: #1e293b; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
                  📌 Langkah Verifikasi & Pendaftaran:
                </p>
                <ul style="margin: 0; padding-left: 18px; color: #475569;">
                  <li style="margin-bottom: 4px;">Periksa kembali 16 digit NIK pada e-KTP Anda, pastikan tidak ada kesalahan angka.</li>
                  <li style="margin-bottom: 4px;">Pastikan Anda telah terdaftar sebagai anggota resmi Kelompok Tani (Poktan) di desa Anda.</li>
                  <li>Hubungi <strong>Penyuluh Lapangan (BPP Lembeyan)</strong> atau Pengurus Poktan setempat untuk proses pengusulan ke sistem e-RDKK.</li>
                </ul>
              </div>
            </div>
          `,
          confirmButtonText: 'Periksa NIK Lain',
          confirmButtonColor: '#059669',
          showCloseButton: true,
          focusConfirm: false,
          customClass: {
            popup: 'rounded-3xl shadow-2xl border border-slate-100',
            confirmButton: 'rounded-xl text-xs font-bold px-5 py-2.5 shadow-sm',
          },
        });
      }
    } catch (err: any) {
      setErrorMsg('Gagal menghubungi server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Perhitungan Kalkulator BPP Kecamatan Lembeyan
  const numericLuas = Math.max(0.05, parseFloat(calcLuasHa) || 0);
  const rekomendasiCalc = {
    ...hitungRekomendasiPupuk(calcKomoditas, numericLuas),
    estimasiBiayaRp:
      Math.round(hitungRekomendasiPupuk(calcKomoditas, numericLuas).ureaKg * 2250) +
      Math.round(hitungRekomendasiPupuk(calcKomoditas, numericLuas).npkKg * 2300) +
      Math.round(hitungRekomendasiPupuk(calcKomoditas, numericLuas).organikKg * 800),
  };

  const addDays = (dateStr: string, days: number) => {
    const d = new Date(dateStr || new Date());
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const masaPanenHari =
    calcKomoditas === 'Padi'
      ? 105
      : calcKomoditas === 'Jagung'
      ? 95
      : calcKomoditas === 'Kedelai'
      ? 85
      : calcKomoditas === 'Tebu'
      ? 300
      : 90;

  const MUSIM_TANAM_INFO = {
    'MT-1': {
      title: 'MT-1 (Walikan - Padi)',
      period: 'Februari – Mei',
      desc: 'Musim tanam walikan padi sawah setelah panen rendengan, memanfaatkan pasokan air sisa penghujan dengan varietas padi unggul.',
      badgeClass: 'bg-emerald-600 text-white',
    },
    'MT-2': {
      title: 'MT-2 (Kemarau - Jagung, Palawija dll)',
      period: 'Juni – September',
      desc: 'Musim kemarau, optimal untuk komoditas palawija (Jagung Hibrida, Kedelai, Bawang Merah, Kacang Tanah, dan Tembakau) guna memutus siklus hama.',
      badgeClass: 'bg-amber-600 text-white',
    },
    'MT-3': {
      title: 'MT-3 (Rendeng - Padi)',
      period: 'Oktober – Januari',
      desc: 'Musim rendengan (musim hujan utama), pasokan air melimpah dari jaringan irigasi Kali Gandong & Waduk, sangat ideal untuk padi sawah produktivitas tinggi.',
      badgeClass: 'bg-emerald-700 text-white',
    },
  };

  const getFaseData = () => {
    if (calcKomoditas === 'Padi') {
      return [
        {
          fase: 'FASE 1: 0–7 HST',
          judul: 'Pemupukan Dasar (Olah Lahan & Awal Tanam)',
          dosis: `Organik ${rekomendasiCalc.organikKg} Kg + Urea ${Math.round(rekomendasiCalc.ureaKg * 0.3)} Kg + NPK ${Math.round(rekomendasiCalc.npkKg * 0.5)} Kg`,
          hari: 5,
          tgl: addDays(calcTanggalTanam, 5),
          badge: 'bg-emerald-600',
          catatan: 'Ditebar merata saat air sawah macak-macak (1-2 cm). Memacu pertumbuhan akar tunjang & anakan awal.',
        },
        {
          fase: 'FASE 2: 21–25 HST',
          judul: 'Pemupukan Susulan I (Vegetatif Aktif / Anakan Rumpun)',
          dosis: `Urea ${Math.round(rekomendasiCalc.ureaKg * 0.4)} Kg + NPK ${Math.round(rekomendasiCalc.npkKg * 0.5)} Kg`,
          hari: 21,
          tgl: addDays(calcTanggalTanam, 21),
          badge: 'bg-blue-600',
          catatan: 'Tutup pintu saluran air 2 hari agar pupuk terserap optimal. Target 25-30 anakan produktif.',
        },
        {
          fase: 'FASE 3: 35–42 HST',
          judul: 'Pemupukan Susulan II (Fase Primordia / Bunting)',
          dosis: `Urea ${Math.round(rekomendasiCalc.ureaKg * 0.3)} Kg`,
          hari: 38,
          tgl: addDays(calcTanggalTanam, 38),
          badge: 'bg-amber-600',
          catatan: 'Pengisian bulir padi, mencegah gabah hampa. Bersihkan rumput liar sebelum menabur pupuk.',
        },
      ];
    } else if (calcKomoditas === 'Jagung') {
      return [
        {
          fase: 'FASE 1: 7–10 HST',
          judul: 'Pemupukan Dasar (Awal Pertumbuhan)',
          dosis: `Organik ${rekomendasiCalc.organikKg} Kg + Urea ${Math.round(rekomendasiCalc.ureaKg * 0.3)} Kg + NPK ${Math.round(rekomendasiCalc.npkKg * 0.5)} Kg`,
          hari: 8,
          tgl: addDays(calcTanggalTanam, 8),
          badge: 'bg-emerald-600',
          catatan: 'Ditugal samping tanaman jarak 5-7 cm, tutup tanah tipis agar pupuk tidak menguap terkena sinar matahari.',
        },
        {
          fase: 'FASE 2: 21–28 HST',
          judul: 'Pemupukan Susulan I (Vegetatif Cepat)',
          dosis: `Urea ${Math.round(rekomendasiCalc.ureaKg * 0.4)} Kg + NPK ${Math.round(rekomendasiCalc.npkKg * 0.5)} Kg`,
          hari: 25,
          tgl: addDays(calcTanggalTanam, 25),
          badge: 'bg-blue-600',
          catatan: 'Ditugal jarak 10 cm dari pangkal batang diikuti pembubunan tanah untuk memperkokoh tegakan pohon.',
        },
        {
          fase: 'FASE 3: 42–45 HST',
          judul: 'Pemupukan Susulan II (Pembungaan & Pengisian Biji Tongkol)',
          dosis: `Urea ${Math.round(rekomendasiCalc.ureaKg * 0.3)} Kg`,
          hari: 43,
          tgl: addDays(calcTanggalTanam, 43),
          badge: 'bg-amber-600',
          catatan: 'Memaksimalkan biji jagung penuh sampai ke ujung tongkol. Menghindarkan tongkol kosong atau kerdil.',
        },
      ];
    } else if (calcKomoditas === 'Kedelai') {
      return [
        {
          fase: 'FASE 1: 0–7 HST',
          judul: 'Pemupukan Dasar (Tanam)',
          dosis: `Organik ${rekomendasiCalc.organikKg} Kg + NPK ${Math.round(rekomendasiCalc.npkKg * 0.5)} Kg`,
          hari: 4,
          tgl: addDays(calcTanggalTanam, 4),
          badge: 'bg-emerald-600',
          catatan: 'Kedelai mengikat nitrogen mandiri via bintil akar. Utamakan fosfat & kalium untuk perakaran kokoh.',
        },
        {
          fase: 'FASE 2: 20–25 HST',
          judul: 'Pemupukan Susulan I (Pra-Bunga & Cabang Produktif)',
          dosis: `NPK ${Math.round(rekomendasiCalc.npkKg * 0.5)} Kg`,
          hari: 21,
          tgl: addDays(calcTanggalTanam, 21),
          badge: 'bg-blue-600',
          catatan: 'Memperbanyak kuntum bunga dan cabang produktif agar polong tumbuh seragam.',
        },
        {
          fase: 'FASE 3: 40–45 HST',
          judul: 'Pemupukan Susulan II (Fase Pengisian Polong)',
          dosis: `Urea ${rekomendasiCalc.ureaKg} Kg`,
          hari: 42,
          tgl: addDays(calcTanggalTanam, 42),
          badge: 'bg-amber-600',
          catatan: 'Dosis pemacu pengisian biji polong kedelai agar bernas dan tidak kisut.',
        },
      ];
    } else if (calcKomoditas === 'Tebu') {
      return [
        {
          fase: 'FASE 1: 0–15 HST',
          judul: 'Pemupukan Dasar / Keprasan',
          dosis: `Organik ${rekomendasiCalc.organikKg} Kg + Urea ${Math.round(rekomendasiCalc.ureaKg * 0.3)} Kg + NPK ${Math.round(rekomendasiCalc.npkKg * 0.4)} Kg`,
          hari: 10,
          tgl: addDays(calcTanggalTanam, 10),
          badge: 'bg-emerald-600',
          catatan: 'Ditabur di juringan tanam / dekat keprasan, ditutup tanah olahan.',
        },
        {
          fase: 'FASE 2: 45–60 HST',
          judul: 'Pemupukan Susulan I (Pertumbuhan Batang & Anakan)',
          dosis: `Urea ${Math.round(rekomendasiCalc.ureaKg * 0.4)} Kg + NPK ${Math.round(rekomendasiCalc.npkKg * 0.6)} Kg`,
          hari: 50,
          tgl: addDays(calcTanggalTanam, 50),
          badge: 'bg-blue-600',
          catatan: 'Ditabur di larikan, diikuti pembumbunan I untuk menopang tegakan tebu.',
        },
        {
          fase: 'FASE 3: 90–120 HST',
          judul: 'Pemupukan Susulan II (Pemanjangan Ruas & Sukrosa)',
          dosis: `Urea ${Math.round(rekomendasiCalc.ureaKg * 0.3)} Kg`,
          hari: 100,
          tgl: addDays(calcTanggalTanam, 100),
          badge: 'bg-amber-600',
          catatan: 'Meningkatkan bobot tebu dan rendemen kristal gula sebelum fase kemasakan tebang.',
        },
      ];
    } else {
      return [
        {
          fase: 'FASE 1: 0–7 HST',
          judul: 'Pemupukan Dasar Olah Lahan',
          dosis: `Organik ${rekomendasiCalc.organikKg} Kg + NPK ${Math.round(rekomendasiCalc.npkKg * 0.5)} Kg + Urea ${Math.round(rekomendasiCalc.ureaKg * 0.3)} Kg`,
          hari: 5,
          tgl: addDays(calcTanggalTanam, 5),
          badge: 'bg-emerald-600',
          catatan: 'Aplikasi dasar pada guludan / bedengan.',
        },
        {
          fase: 'FASE 2: 21–25 HST',
          judul: 'Pemupukan Susulan I',
          dosis: `NPK ${Math.round(rekomendasiCalc.npkKg * 0.5)} Kg + Urea ${Math.round(rekomendasiCalc.ureaKg * 0.4)} Kg`,
          hari: 21,
          tgl: addDays(calcTanggalTanam, 21),
          badge: 'bg-blue-600',
          catatan: 'Aplikasi kocor atau tabur di parit bedengan.',
        },
        {
          fase: 'FASE 3: 40–50 HST',
          judul: 'Pemupukan Susulan II',
          dosis: `Urea ${Math.round(rekomendasiCalc.ureaKg * 0.3)} Kg`,
          hari: 45,
          tgl: addDays(calcTanggalTanam, 45),
          badge: 'bg-amber-600',
          catatan: 'Pengisian buah dan penyuburan hasil panen.',
        },
      ];
    }
  };

  const generateWaText = () => {
    const namaPetani = selectedLahanObj?.petani?.nama || (petani ? petani.nama : 'Bpk/Ibu Petani');
    const namaBlok = selectedLahanObj
      ? `${selectedLahanObj.namaLahan} (${selectedLahanObj.kodeLahan})`
      : 'Simulasi Petak Sawah';
    const desa = selectedLahanObj?.petani?.desa || (petani ? petani.desa : 'Kecamatan Lembeyan');
    const poktan = selectedLahanObj?.petani?.poktan?.nama || (petani?.poktan?.nama || '-');
    const tglTanamStr = addDays(calcTanggalTanam, 0);
    const faseList = getFaseData();

    let text = `🌾 *JADWAL KALENDER TANAM & PEMUPUKAN PRESISI*\n`;
    text += `*BALAI PENYULUHAN PERTANIAN (BPP) KEC. LEMBEYAN*\n`;
    text += `Kabupaten Magetan - Jawa Timur\n\n`;
    text += `👤 *Petani:* ${namaPetani}\n`;
    text += `👥 *Poktan:* ${poktan} (${desa})\n`;
    text += `📍 *Petak Lahan:* ${namaBlok}\n`;
    text += `🌱 *Komoditas / Musim:* ${calcKomoditas} (${calcMusimTanam})\n`;
    text += `📐 *Luas Lahan:* ${numericLuas} Ha (${(numericLuas * 10000).toLocaleString('id-ID')} m²)\n`;
    text += `🗓️ *Mulai Tanam (0 HST):* ${tglTanamStr}\n\n`;
    text += `📦 *TOTAL KEBUTUHAN PUPUK BERSUBSIDI:*\n`;
    text += `• Urea: *${rekomendasiCalc.ureaKg} Kg* (~${(rekomendasiCalc.ureaKg / 50).toFixed(1)} Sak)\n`;
    text += `• NPK Phonska: *${rekomendasiCalc.npkKg} Kg* (~${(rekomendasiCalc.npkKg / 50).toFixed(1)} Sak)\n`;
    text += `• Organik Petroganik: *${rekomendasiCalc.organikKg} Kg* (~${(rekomendasiCalc.organikKg / 40).toFixed(1)} Sak)\n`;
    text += `💰 *Estimasi Tebus HET Resmi:* ${formatRupiah(rekomendasiCalc.estimasiBiayaRp)}\n\n`;
    text += `📅 *MATRIKS APLIKASI PEMUPUKAN 3 FASE:*\n`;
    faseList.forEach((f, idx) => {
      text += `${idx + 1}. *${f.fase}* (Tgl: *${f.tgl}*)\n`;
      text += `   👉 Dosis: ${f.dosis}\n`;
      text += `   💡 Petunjuk: ${f.catatan}\n\n`;
    });
    text += `🎯 *ESTIMASI PANEN RAYA (~${masaPanenHari} HST):* *${addDays(calcTanggalTanam, masaPanenHari)}*\n`;
    text += `📊 Potensi Hasil Panen: ~${(numericLuas * (calcKomoditas === 'Padi' ? 6.5 : 5.8)).toFixed(1)} Ton\n\n`;
    text += `_Diterbitkan secara resmi oleh Balai Penyuluhan Pertanian (BPP) Kec. Lembeyan_\n`;
    text += `_Sistem Informasi Pertanian Terpadu (GIS & e-RDKK) Lembeyan - Developer: Supriyanto Abadi Jaya_`;
    return text;
  };

  const handleShareWhatsApp = () => {
    const text = generateWaText();
    const noHp =
      (selectedLahanObj?.petani as any)?.telepon ||
      (petani as any)?.telepon ||
      (selectedLahanObj?.petani as any)?.noHp ||
      (petani as any)?.noHp;
    const cleanPhone = noHp ? String(noHp).replace(/[^0-9]/g, '').replace(/^0/, '62') : '';

    if (cleanPhone && cleanPhone.length > 8) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleCopySchedule = async () => {
    const text = generateWaText();
    await copyToClipboard(text);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 3000);
  };

  const petani = resultData?.petani;
  const alokasi = petani?.alokasiPupuk?.[0];
  const verifiedDoc = resultData?.verifiedDocument;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* Header Portal */}
      <div className="bg-emerald-950 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-800/50">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/90 border border-emerald-600/60 text-emerald-100 text-xs font-semibold shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                Portal Layanan Mandiri &bull; Pemerintah Kecamatan Lembeyan
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/60 text-amber-300 text-xs font-bold shadow-2xs">
                <Code2 className="w-3.5 h-3.5 text-amber-300" />
                Pengembang: Supriyanto Abadi Jaya
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-xs">
              Cek Kuota Mandiri, Verifikasi QR & Kalkulator Dosis BPP
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
              Periksa jatah & sisa kuota pupuk bersubsidi berdasarkan NIK KTP, verifikasi keaslian
              Kartu Tani / Nota Kios / Kartu Lahan GIS dengan kamera QR, serta hitung jadwal dosis
              pemupukan presisi BPP Kecamatan Lembeyan.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="bg-emerald-950/90 p-1.5 rounded-2xl border border-emerald-700/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 self-start w-full sm:w-auto shadow-md">
            <button
              type="button"
              onClick={() => setActiveTab('verifikasi')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'verifikasi'
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                  : 'text-emerald-100 hover:bg-emerald-800/60'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Cek NIK & Verifikasi QR</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('kalkulator')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'kalkulator'
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                  : 'text-emerald-100 hover:bg-emerald-800/60'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Kalkulator Dosis & Kalender Tanam</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: CEK KUOTA MANDIRI & VERIFIKASI DOKUMEN QR */}
      {activeTab === 'verifikasi' && (
        <div className="space-y-6">
          {/* Kotak Pencarian / Banner Privasi Petani */}
          {isPetaniLocked ? (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70 border border-emerald-200/90 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-emerald-950">
                      Portal Mandiri Petani e-RDKK
                    </span>
                    <span className="bg-emerald-200/80 text-emerald-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300">
                      Privasi Dilindungi
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
                    Login Aktif: <strong>{currentUser.name}</strong> ({currentUser.nik ? `NIK: ${currentUser.nik}` : currentUser.nip || 'Terdaftar'}).
                    Sesuai ketentuan kerahasiaan data e-RDKK, portal ini hanya menampilkan alokasi kuota pupuk, jadwal dosis pemupukan, dan sertifikat lahan milik Anda sendiri.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSearch(myFarmerKey)}
                disabled={loading}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition shrink-0 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                {loading ? 'Memuat Data...' : 'Segarkan Kuota Saya'}
              </button>
            </div>
          ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Masukkan 16 Digit NIK KTP Petani Terdaftar e-RDKK (atau Kode Lahan / No. Nota)..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-sm transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                {loading ? 'Memeriksa NIK...' : 'Cek Kuota NIK'}
              </button>

              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-sm transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-amber-400" />
                Scan QR Kartu / Nota
              </button>
            </form>

            {/* Pilihan Cepat Sampel Petani & Dokumen */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Uji Cepat Data Kecamatan Lembeyan:
              </span>
              {samplePetani.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => handleSearch(sp.nik)}
                  className={`text-xs px-3 py-1 rounded-xl border font-semibold transition cursor-pointer ${
                    petani?.id === sp.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {sp.nama} ({sp.desa})
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleSearch('LHN-2026-001')}
                className="text-xs px-3 py-1 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-mono font-bold transition cursor-pointer"
              >
                Cek Lahan: LHN-2026-001
              </button>
              <button
                type="button"
                onClick={() => handleSearch('REG-ERDKK-2026-002')}
                className="text-xs px-3 py-1 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 font-mono font-bold transition cursor-pointer"
              >
                Cek Berkas: REG-ERDKK-2026-002
              </button>
            </div>
          </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-800 text-xs sm:text-sm font-semibold">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Hasil Verifikasi & Rincian Kuota Petani */}
          {petani && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Kolom Kiri (4 Kolom): Sertifikat Verifikasi & Profil Petani */}
              <div className="lg:col-span-4 space-y-6">
                {/* Banner Status Keaslian Dokumen */}
                {verifiedDoc && (
                  <div className="bg-emerald-950 text-white rounded-3xl p-5 border border-emerald-800 shadow-lg space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" /> {verifiedDoc.status}
                        </span>
                        <h3 className="font-black text-sm text-amber-300 mt-2">
                          {verifiedDoc.jenis}
                        </h3>
                        <p className="text-xs font-mono text-emerald-100 mt-0.5">
                          No. Dokumen: <strong>{verifiedDoc.nomor}</strong>
                        </p>
                      </div>
                      <QrCodeView
                        value={`https://pertanian.lembeyan.go.id/cek-kuota?q=${verifiedDoc.nomor}`}
                        size={60}
                      />
                    </div>
                    <div className="border-t border-emerald-800/80 pt-3 text-[11px] text-emerald-200/90 space-y-1">
                      <div>
                        Unit / Kios / Poktan: <strong className="text-white">{verifiedDoc.kios}</strong>
                      </div>
                      <div>
                        Otoritas Verifikasi:{' '}
                        <strong className="text-white">{verifiedDoc.verifikator}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Kartu Profil Petani */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Profil Petani Terdaftar
                      </span>
                      <h2 className="text-lg font-black text-slate-900 mt-1">{petani.nama}</h2>
                      <p className="text-xs font-mono text-slate-500">NIK: {petani.nik}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-base flex items-center justify-center border border-emerald-300">
                      {petani.nama.slice(0, 2).toUpperCase()}
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Nomor KK</span>
                      <span className="font-mono font-semibold text-slate-800">{petani.noKk}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Kelompok Tani (Poktan)</span>
                      <span className="font-bold text-emerald-700">{petani.poktan?.nama}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Desa / Kecamatan</span>
                      <span className="font-semibold text-slate-800">
                        Desa {petani.desa}, Kec. {petani.kecamatan}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Total Luas Baku Sawah</span>
                      <span className="font-black text-slate-900">
                        {petani.totalLuasLahan} Ha ({petani.lahan?.length || 0} Blok)
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Status e-RDKK</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {petani.statusVerifikasi}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Link
                      href={`/cetak-kartu-tani/${petani.id}`}
                      target="_blank"
                      className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-2xs"
                    >
                      <CreditCard className="w-4 h-4 text-amber-300" />
                      Cetak Kartu Tani Digital (ID Card CR-80)
                    </Link>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan (8 Kolom): Sisa Kuota Pupuk, Rekomendasi Fase Pemupukan & Daftar Blok Sawah */}
              <div className="lg:col-span-8 space-y-6">
                {/* 1. Rincian Kuota Pupuk Bersubsidi */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                        <Sprout className="w-5 h-5 text-emerald-600" />
                        Status Kuota Pupuk Bersubsidi Tahun {alokasi?.tahun || 2026}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Musim Tanam: <strong>{alokasi?.musimTanam || 'MT 1 (Walikan - Padi)'}</strong> &bull;
                        Komoditas: <strong>{alokasi?.komoditas || 'Padi'}</strong>
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-300">
                      KUOTA AKTIF DAPAT DITEBUS
                    </span>
                  </div>

                  {alokasi ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      {/* Urea */}
                      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-emerald-950">PUPUK UREA</span>
                          <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-700">
                            {(alokasi.sisaUreaKg / 50).toFixed(1)} Sak
                          </span>
                        </div>
                        <div className="text-2xl font-black text-emerald-700">
                          {alokasi.sisaUreaKg} <span className="text-xs font-normal">Kg</span>
                        </div>
                        <div className="w-full bg-emerald-200/70 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (alokasi.sisaUreaKg / Math.max(1, alokasi.jatahUreaKg)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Ditebus: {alokasi.jatahUreaKg - alokasi.sisaUreaKg} Kg</span>
                          <span>Jatah: {alokasi.jatahUreaKg} Kg</span>
                        </div>
                      </div>

                      {/* NPK Phonska */}
                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-amber-950">NPK PHONSKA</span>
                          <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-700">
                            {(alokasi.sisaNpkKg / 50).toFixed(1)} Sak
                          </span>
                        </div>
                        <div className="text-2xl font-black text-amber-700">
                          {alokasi.sisaNpkKg} <span className="text-xs font-normal">Kg</span>
                        </div>
                        <div className="w-full bg-amber-200/70 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-600 h-full rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (alokasi.sisaNpkKg / Math.max(1, alokasi.jatahNpkKg)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Ditebus: {alokasi.jatahNpkKg - alokasi.sisaNpkKg} Kg</span>
                          <span>Jatah: {alokasi.jatahNpkKg} Kg</span>
                        </div>
                      </div>

                      {/* Petroganik */}
                      <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-teal-950">ORGANIK</span>
                          <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-teal-200 text-teal-700">
                            {(alokasi.sisaOrganikKg / 40).toFixed(1)} Sak
                          </span>
                        </div>
                        <div className="text-2xl font-black text-teal-700">
                          {alokasi.sisaOrganikKg} <span className="text-xs font-normal">Kg</span>
                        </div>
                        <div className="w-full bg-teal-200/70 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-teal-600 h-full rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (alokasi.sisaOrganikKg / Math.max(1, alokasi.jatahOrganikKg)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Ditebus: {alokasi.jatahOrganikKg - alokasi.sisaOrganikKg} Kg</span>
                          <span>Jatah: {alokasi.jatahOrganikKg} Kg</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-4">
                      Belum ada alokasi kuota pupuk aktif untuk musim tanam ini.
                    </div>
                  )}

                  {/* Rekomendasi Jadwal Aplikasi 3 Fase untuk Petani Ini */}
                  {alokasi && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        Panduan Dosis Aplikasi 3 Fase (Sesuai Kuota {alokasi.luasTanamHa} Ha) — BPP
                        Kecamatan Lembeyan:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">
                            Fase 1: Pupuk Dasar (0–7 HST)
                          </span>
                          <div className="font-bold text-slate-800 mt-1">
                            Organik: {alokasi.jatahOrganikKg} Kg + Urea:{' '}
                            {Math.round(alokasi.jatahUreaKg * 0.3)} Kg + NPK:{' '}
                            {Math.round(alokasi.jatahNpkKg * 0.5)} Kg
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-blue-700 uppercase">
                            Fase 2: Susulan I (21 HST)
                          </span>
                          <div className="font-bold text-slate-800 mt-1">
                            Urea: {Math.round(alokasi.jatahUreaKg * 0.4)} Kg + NPK:{' '}
                            {Math.round(alokasi.jatahNpkKg * 0.5)} Kg
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-amber-700 uppercase">
                            Fase 3: Susulan II (35–42 HST)
                          </span>
                          <div className="font-bold text-slate-800 mt-1">
                            Urea: {Math.round(alokasi.jatahUreaKg * 0.3)} Kg (Pembentukan Malai/Biji)
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Daftar Blok Sawah GIS Terdaftar */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-600" />
                    Daftar Blok Sawah GIS Terverifikasi ({petani.lahan?.length || 0} Petak)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {petani.lahan?.map((l: any, idx: number) => (
                      <div
                        key={l.id}
                        className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-400 transition bg-slate-50/60 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold bg-emerald-700 text-white px-2 py-0.5 rounded">
                              BLOK #{idx + 1}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-600">
                              {l.kodeLahan}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs mt-1.5">{l.namaLahan}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Komoditas: <strong>{l.komoditas}</strong> &bull; Luas:{' '}
                            <strong className="text-emerald-700">{l.luasHa} Ha</strong> ({l.statusIrigasi})
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-mono">
                            Pipil: {l.nomorPipil || '-'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLahanId(l.id);
                                setSelectedLahanObj({ ...l, petani });
                                setCalcKomoditas(l.komoditas);
                                setCalcLuasHa(l.luasHa.toString());
                                setActiveTab('kalkulator');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 transition"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              Kalender Tanam
                            </button>
                            <Link
                              href={`/cetak-lahan/${l.id}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
                            >
                              <Printer className="w-3.5 h-3.5" /> Cetak Lahan
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KALKULATOR CERDAS KALENDER MUSIM TANAM (MT-1, MT-2, MT-3) & PEMUPUKAN PRESISI */}
      {activeTab === 'kalkulator' && (
        <div className="space-y-6">
          {/* Banner Pilihan Musim Tanam (MT-1, MT-2, MT-3) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-block">
                  Kalender Pola Tanam Terpadu &bull; BPP Kecamatan Lembeyan
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
                  Kalkulator Kalender Musim Tanam & Dosis Pemupukan Presisi
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pilih Musim Tanam (MT) dan hubungkan dengan Petak Sawah GIS untuk penjadwalan pemupukan berimbang otomatis per fase.
                </p>
              </div>

              {/* Selector Musim Tanam (MT-1, MT-2, MT-3) - Sejajar Card & Responsif */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/90 w-full lg:w-auto shrink-0">
                {(['MT-1', 'MT-2', 'MT-3'] as const).map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setCalcMusimTanam(mt)}
                    className={`px-2 sm:px-3.5 py-2.5 rounded-xl text-xs font-black transition text-center flex flex-col items-center justify-center cursor-pointer ${
                      calcMusimTanam === mt
                        ? MUSIM_TANAM_INFO[mt].badgeClass + ' shadow-sm'
                        : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-black">{mt}</span>
                    <span className="block text-[10px] font-medium opacity-90 truncate max-w-full">
                      {mt === 'MT-1' ? 'Walikan (Padi)' : mt === 'MT-2' ? 'Kemarau (Palawija)' : 'Rendeng (Padi)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Info Kotak Edukasi Musim Tanam Aktif */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row items-start gap-3 text-xs">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-emerald-950 flex flex-wrap items-center gap-2">
                  <span>{MUSIM_TANAM_INFO[calcMusimTanam].title}</span>
                  <span className="text-[11px] font-mono font-semibold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                    Periode: {MUSIM_TANAM_INFO[calcMusimTanam].period}
                  </span>
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  {MUSIM_TANAM_INFO[calcMusimTanam].desc}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Panel Input Parameter Lahan & Sawah Terdaftar */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Parameter Petak Lahan & Tanaman
                </h3>
                <p className="text-[11px] text-slate-400">
                  Pilih petak sawah terdaftar di peta GIS atau lakukan simulasi manual mandiri.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* 1. Pilih Petak Sawah Terdaftar GIS */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>1. Hubungkan Petak Sawah GIS (Opsional)</span>
                    {selectedLahanId !== 'MANUAL' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Data Terhubung
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedLahanId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedLahanId(val);
                      if (val === 'MANUAL') {
                        setSelectedLahanObj(null);
                      } else {
                        const matched = allLahanList.find((l) => l.id === val);
                        if (matched) {
                          setSelectedLahanObj(matched);
                          setCalcKomoditas(matched.komoditas);
                          setCalcLuasHa(matched.luasHa.toString());
                        }
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="MANUAL">
                      -- Simulasi Bebas / Input Mandiri (Tanpa Lahan Terdaftar) --
                    </option>
                    {allLahanList.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.kodeLahan} &bull; {l.namaLahan} ({l.petani?.nama || 'Petani'}) - {l.luasHa} Ha ({l.komoditas})
                      </option>
                    ))}
                  </select>

                  {/* Kartu Ringkas Lahan Terpilih */}
                  {selectedLahanObj && (
                    <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950">{selectedLahanObj.namaLahan}</span>
                        <span className="font-mono text-[10px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">
                          {selectedLahanObj.kodeLahan}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Petani: <strong>{selectedLahanObj.petani?.nama || '-'}</strong> (NIK: {selectedLahanObj.petani?.nik || '-'})
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Kelompok Tani: <strong>{selectedLahanObj.petani?.poktan?.nama || '-'}</strong> ({selectedLahanObj.petani?.desa || 'Kediren'}, Lembeyan)
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Pilih Komoditas Tanaman */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    2. Pilih Komoditas Tanaman *
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {['Padi', 'Jagung', 'Kedelai', 'Tebu', 'Cabai'].map((kom) => (
                      <button
                        key={kom}
                        type="button"
                        onClick={() => setCalcKomoditas(kom)}
                        className={`py-2 px-2.5 rounded-xl font-bold border text-xs transition ${
                          calcKomoditas === kom
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {kom}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Luas Lahan Garapan */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    3. Luas Lahan Garapan (Hektar / Ha) *
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="50"
                    value={calcLuasHa}
                    onChange={(e) => setCalcLuasHa(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['0.25', '0.50', '1.00', '1.50', '2.00'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCalcLuasHa(preset)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 transition"
                      >
                        {preset} Ha ({parseFloat(preset) * 10000} m²)
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Tanggal Mulai Tanam (0 HST) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    4. Tanggal Mulai Tanam (0 HST) *
                  </label>
                  <input
                    type="date"
                    value={calcTanggalTanam}
                    onChange={(e) => setCalcTanggalTanam(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    *Semua jadwal pemupukan dan tanggal panen akan dihitung otomatis dari tanggal ini.
                  </p>
                </div>
              </div>

              {/* Ringkasan Estimasi Biaya HET Subsidi */}
              <div className="bg-emerald-950 text-white rounded-2xl p-4 space-y-2">
                <div className="text-[11px] text-emerald-300 font-semibold">
                  Estimasi Total Biaya Tebus HET Pupuk Bersubsidi ({numericLuas} Ha &bull; {calcMusimTanam}):
                </div>
                <div className="text-2xl font-black text-amber-300">
                  {formatRupiah(rekomendasiCalc.estimasiBiayaRp)}
                </div>
                <p className="text-[10px] text-emerald-200/80">
                  * Dihitung berdasarkan Harga Eceran Tertinggi (HET) Resmi Kementan: Urea Rp 2.250/kg, NPK Phonska Rp 2.300/kg, dan Petroganik Rp 800/kg.
                </p>
              </div>

              {/* Action Buttons: WhatsApp & Print */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-2xl shadow-sm transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  Kirim Jadwal via WhatsApp ke Petani
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {selectedLahanId !== 'MANUAL' ? (
                    <Link
                      href={`/cetak-kalender-tanam/${selectedLahanId}?mt=${calcMusimTanam}&tgl=${calcTanggalTanam}`}
                      target="_blank"
                      className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition shadow-xs text-center"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-300" />
                      Cetak Surat Resmi
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition shadow-xs cursor-pointer text-center"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-300" />
                      Cetak Lembar Ini
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopySchedule}
                    className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 px-3 rounded-xl border border-slate-200 transition cursor-pointer"
                  >
                    {copiedWa ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        Salin Teks Agenda
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Panel Hasil Rekomendasi & Matriks Kalender 3 Fase */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Rekomendasi Dosis & Jadwal Pemupukan ({calcKomoditas} &bull; {numericLuas} Ha)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Berdasarkan Pedoman Teknis Balai Penyuluhan Pertanian (BPP) Wilayah Kecamatan Lembeyan.
                  </p>
                </div>

                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 self-start">
                  {calcMusimTanam}
                </span>
              </div>

              {/* 3 Kotak Total Kebutuhan Pupuk */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Total Urea</span>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {rekomendasiCalc.ureaKg} Kg
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-900 mt-0.5">
                    Setara {(rekomendasiCalc.ureaKg / 50).toFixed(1)} Sak (@50 Kg)
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">
                    Total NPK Phonska
                  </span>
                  <div className="text-2xl font-black text-amber-700 mt-1">
                    {rekomendasiCalc.npkKg} Kg
                  </div>
                  <div className="text-[11px] font-semibold text-amber-900 mt-0.5">
                    Setara {(rekomendasiCalc.npkKg / 50).toFixed(1)} Sak (@50 Kg)
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
                  <span className="text-[10px] font-bold text-teal-800 uppercase">
                    Total Organik
                  </span>
                  <div className="text-2xl font-black text-teal-700 mt-1">
                    {rekomendasiCalc.organikKg} Kg
                  </div>
                  <div className="text-[11px] font-semibold text-teal-900 mt-0.5">
                    Setara {(rekomendasiCalc.organikKg / 40).toFixed(1)} Sak (@40 Kg)
                  </div>
                </div>
              </div>

              {/* Timeline Kalender Tanam & Jadwal Aplikasi 3 Fase */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Jadwal Aplikasi Pemupukan Berimbang Presisi
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Mulai Tanam: {addDays(calcTanggalTanam, 0)}
                  </span>
                </div>

                <div className="space-y-3">
                  {getFaseData().map((fase, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <span className={`text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full ${fase.badge}`}>
                          {fase.fase}
                        </span>
                        <h5 className="font-bold text-slate-900 text-xs mt-1">
                          {fase.judul}
                        </h5>
                        <p className="text-[11px] text-emerald-900 font-semibold">
                          Dosis: {fase.dosis}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {fase.catatan}
                        </p>
                      </div>
                      <div className="text-right shrink-0 bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-medium">Tanggal Pelaksanaan</span>
                        <span className="text-xs font-black text-emerald-900 font-mono">
                          {fase.tgl}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Estimasi Panen Raya */}
                  <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold bg-emerald-900 text-amber-300 px-2.5 py-0.5 rounded-full">
                        ESTIMASI PANEN RAYA &bull; ~{masaPanenHari} HST
                      </span>
                      <h5 className="font-bold text-emerald-950 text-xs mt-1">
                        Perkiraan Waktu Panen Komoditas {calcKomoditas} ({calcMusimTanam})
                      </h5>
                      <p className="text-[11px] text-emerald-800">
                        Potensi Produksi Wilayah Lembeyan: ~
                        {(numericLuas * (calcKomoditas === 'Padi' ? 6.5 : 5.8)).toFixed(1)} Ton Gabah / Pipilan Kering
                      </p>
                    </div>
                    <div className="text-right shrink-0 bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-emerald-200">
                      <span className="text-[10px] text-emerald-700 block font-semibold">Target Panen Raya</span>
                      <span className="text-sm font-black text-emerald-950 font-mono">
                        {addDays(calcTanggalTanam, masaPanenHari)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pemindai QR Code */}
      <QrScannerModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        petaniList={samplePetani}
        onSelectPetani={(petaniId) => {
          setQrModalOpen(false);
          handleSearch(petaniId);
        }}
      />
    </div>
  );
}
