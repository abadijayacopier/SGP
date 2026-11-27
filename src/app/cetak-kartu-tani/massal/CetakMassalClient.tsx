'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Printer,
  ArrowLeft,
  Filter,
  CreditCard,
  Sprout,
  ShieldCheck,
  Scissors,
  Layers,
  CheckCircle2,
  Palette,
} from 'lucide-react';
import QrCodeView from '@/components/ui/QrCodeView';
import { KartuTaniTemaNasional } from '@/components/ui/KartuTaniTemaNasional';

interface PetaniItem {
  id: string;
  nik: string;
  nama: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  totalLuasLahan: number;
  fotoUrl: string | null;
  nomorKta?: string | null;
  jabatan?: string | null;
  poktanNama: string;
  poktanId: string | null;
  lahanCount: number;
}

interface PoktanItem {
  id: string;
  nama: string;
  desa: string;
}

interface Props {
  petaniList: PetaniItem[];
  poktanList: PoktanItem[];
}

export function CetakMassalClient({ petaniList, poktanList }: Props) {
  const [selectedPoktan, setSelectedPoktan] = useState<string>('SEMUA');
  const [selectedDesa, setSelectedDesa] = useState<string>('SEMUA');
  const [printSide, setPrintSide] = useState<'DEPAN' | 'BELAKANG' | 'SEMUA'>('DEPAN');
  const [cardTheme, setCardTheme] = useState<'KTA_POKTAN' | 'EMERALD'>('KTA_POKTAN');

  // Daftar unik desa
  const daftarDesa = useMemo(() => {
    const s = new Set<string>();
    petaniList.forEach((p) => {
      if (p.desa) s.add(p.desa);
    });
    return Array.from(s).sort();
  }, [petaniList]);

  // Filter Petani
  const filteredPetani = useMemo(() => {
    return petaniList.filter((p) => {
      if (selectedDesa !== 'SEMUA' && p.desa !== selectedDesa) return false;
      if (selectedPoktan !== 'SEMUA' && p.poktanId !== selectedPoktan) return false;
      return true;
    });
  }, [petaniList, selectedDesa, selectedPoktan]);

  // Chunk ke per 10 kartu per halaman A4
  const pages = useMemo(() => {
    const chunks: PetaniItem[][] = [];
    for (let i = 0; i < filteredPetani.length; i += 10) {
      chunks.push(filteredPetani.slice(i, i + 10));
    }
    return chunks;
  }, [filteredPetani]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full">
      {/* TOOLBAR KONTROL ATAS (HANYA DITAMPILKAN DI LAYAR, DISEMBUNYIKAN SAAT CETAK) */}
      <div className="no-print max-w-7xl mx-auto px-4 mb-6">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href="/laporan"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Laporan
                </Link>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  10 Kartu per Lembar A4
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-emerald-600" />
                Pusat Cetak Massal Kartu Tani Standar CR-80 (86 x 54 mm)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Layout pas 2 kolom &times; 5 baris pada kertas A4 (210 &times; 297 mm) dilengkapi garis potong plong kartu dan area bleed anti-tepi putih.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
              >
                <Printer className="w-4 h-4" />
                Cetak Halaman ({pages.length} Lembar A4)
              </button>
            </div>
          </div>

          {/* OPSI FILTER & SISI CETAK */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pilihan Desain Kartu:</label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCardTheme('KTA_POKTAN')}
                  className={`py-1.5 px-2 text-center font-bold text-[11px] rounded-lg transition ${
                    cardTheme === 'KTA_POKTAN'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tema 2: KTA Poktan
                </button>
                <button
                  type="button"
                  onClick={() => setCardTheme('EMERALD')}
                  className={`py-1.5 px-2 text-center font-bold text-[11px] rounded-lg transition ${
                    cardTheme === 'EMERALD'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tema 1: Emerald
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Filter Kelompok Tani:</label>
              <select
                value={selectedPoktan}
                onChange={(e) => setSelectedPoktan(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="SEMUA">Semua Kelompok Tani</option>
                {poktanList.map((pok) => (
                  <option key={pok.id} value={pok.id}>
                    {pok.nama} ({pok.desa})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Pilihan Sisi Kartu:</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPrintSide('DEPAN')}
                  className={`py-1.5 text-center font-bold text-[11px] rounded-lg transition ${
                    printSide === 'DEPAN'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Depan Saja
                </button>
                <button
                  type="button"
                  onClick={() => setPrintSide('BELAKANG')}
                  className={`py-1.5 text-center font-bold text-[11px] rounded-lg transition ${
                    printSide === 'BELAKANG'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Belakang Saja
                </button>
                <button
                  type="button"
                  onClick={() => setPrintSide('SEMUA')}
                  className={`py-1.5 text-center font-bold text-[11px] rounded-lg transition ${
                    printSide === 'SEMUA'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bolak-Balik
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Filter Desa:</label>
              <select
                value={selectedDesa}
                onChange={(e) => setSelectedDesa(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="SEMUA">Semua Desa ({petaniList.length} Petani)</option>
                {daftarDesa.map((d) => (
                  <option key={d} value={d}>
                    Desa {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* CONTAINER HALAMAN CETAK */}
      <div className="print-area">
        <style jsx global>{`
          @media print {
            body {
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .print-area {
              display: block !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            @page {
              size: A4 portrait;
              margin: 8mm 9.5mm 8mm 9.5mm;
            }
            .a4-page {
              page-break-after: always;
              break-after: page;
              margin-bottom: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
          }

          /* Tampilan Lembar A4 di layar monitor */
          .a4-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto 20mm auto;
            background: white;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            box-sizing: border-box;
            padding: 8mm 9.5mm;
          }

          /* Grid 2 kolom x 5 baris */
          .card-grid {
            display: grid;
            grid-template-columns: repeat(2, 88mm);
            grid-template-rows: repeat(5, 56mm);
            gap: 0;
            justify-content: center;
          }

          /* Kartu dengan area bleed (88 x 56 mm) dan batas potong mesin plong (86 x 54 mm) */
          .card-cell {
            width: 88mm;
            height: 56mm;
            box-sizing: border-box;
            position: relative;
            padding: 1mm;
          }

          .card-inner-box {
            width: 86mm;
            height: 54mm;
            border-radius: 3.18mm;
            overflow: hidden;
            position: relative;
            box-sizing: border-box;
          }

          /* Garis potong panduan mesin plong */
          .cut-guide {
            position: absolute;
            inset: 0.5mm;
            border: 0.25mm dashed rgba(100, 116, 139, 0.5);
            pointer-events: none;
            border-radius: 3.5mm;
            z-index: 30;
          }
        `}</style>

        {filteredPetani.length === 0 ? (
          <div className="no-print max-w-md mx-auto text-center py-16 bg-white rounded-3xl border border-slate-200">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700">Tidak ada data petani sesuai filter.</p>
            <p className="text-xs text-slate-400 mt-1">Silakan ganti pilihan desa atau kelompok tani.</p>
          </div>
        ) : (
          pages.map((pagePetani, pageIndex) => {
            return (
              <React.Fragment key={`page-wrapper-${pageIndex}`}>
                {/* 1. LEMBAR SISI DEPAN (JIKA 'DEPAN' ATAU 'SEMUA') */}
                {(printSide === 'DEPAN' || printSide === 'SEMUA') && (
                  <div className="a4-page">
                    <div className="no-print flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-xs text-slate-400">
                      <span>
                        Halaman {pageIndex + 1} dari {pages.length} - <strong>SISI DEPAN</strong> (10 Kartu)
                      </span>
                      <span>Ukuran per kartu: 86 &times; 54 mm (Bleed: 88 &times; 56 mm)</span>
                    </div>

                    <div className="card-grid">
                      {pagePetani.map((p, idx) => {
                        const nomorKartu = p.nomorKta || `KT-3509-${p.nik.slice(-4)}`;
                        const qrPayload =
                          typeof window !== 'undefined'
                            ? `${window.location.origin}/verifikasi?q=KARTUTANI:${p.nik}`
                            : `/verifikasi?q=KARTUTANI:${p.nik}`;
                        const fotoPetani =
                          p.fotoUrl ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                            p.nama
                          )}`;

                        return (
                          <div key={`front-${p.id}`} className="card-cell">
                            {/* Garis batas plong / die-cut guide */}
                            <div className="cut-guide" />

                            {/* Inner Box Kartu Sisi Depan */}
                            <div className="card-inner-box">
                              {cardTheme === 'KTA_POKTAN' ? (
                                <KartuTaniTemaNasional
                                  compact
                                  petani={{
                                    nama: p.nama,
                                    nik: p.nik,
                                    desa: p.desa,
                                    kecamatan: p.kecamatan,
                                    kabupaten: p.kabupaten,
                                    totalLuasLahan: p.totalLuasLahan,
                                    lahanCount: p.lahanCount,
                                    poktanNama: p.poktanNama,
                                    fotoPetani: fotoPetani,
                                    nomorKartu: nomorKartu,
                                    qrPayload: qrPayload,
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-950 text-white p-2.5 flex flex-col justify-between shadow-xs">
                                  {/* Background Accent */}
                                  <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-emerald-400/10 pointer-events-none" />

                                  {/* Header Kartu */}
                                  <div className="flex items-start justify-between gap-1 border-b border-emerald-700/80 pb-1">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-md bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0">
                                        <Sprout className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <div className="text-[8.5px] font-black tracking-wider uppercase text-amber-300 leading-none">
                                          KARTU TANI DIGITAL
                                        </div>
                                        <div className="text-[6.5px] text-emerald-200 font-medium leading-none mt-0.5">
                                          KEC. LEMBEYAN &bull; e-ALOKASI
                                        </div>
                                      </div>
                                    </div>
                                    <span className="font-mono text-[7px] font-bold bg-emerald-950/90 px-1 py-0.2 rounded border border-emerald-600/50 text-emerald-200">
                                      {nomorKartu}
                                    </span>
                                  </div>

                                  {/* Konten Tengah: Foto, Chip & Info */}
                                  <div className="flex items-center justify-between gap-1.5 my-auto">
                                    <div className="flex items-center gap-2">
                                      {/* Foto Petani */}
                                      <div className="w-11 h-14 rounded-lg bg-white p-0.5 shadow-2xs shrink-0 overflow-hidden border border-amber-300">
                                        <img
                                          src={fotoPetani}
                                          alt={p.nama}
                                          className="w-full h-full object-cover rounded-md bg-slate-100"
                                        />
                                      </div>

                                      {/* Teks Identitas */}
                                      <div className="space-y-0.5">
                                        {/* Chip Emas */}
                                        <div className="w-5 h-3 rounded bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-amber-700/40" />
                                        <div className="text-[10px] font-black tracking-tight text-white uppercase leading-tight line-clamp-1">
                                          {p.nama}
                                        </div>
                                        <div className="text-[8px] font-mono text-amber-300 font-bold leading-none">
                                          NIK: {p.nik}
                                        </div>
                                        <div className="text-[7.5px] text-emerald-100 font-semibold line-clamp-1 leading-none mt-0.5">
                                          {p.poktanNama}
                                        </div>
                                        <div className="text-[7px] text-emerald-300/90 line-clamp-1 leading-none">
                                          Desa {p.desa}, Kec. {p.kecamatan}
                                        </div>
                                      </div>
                                    </div>

                                    {/* QR Code Cepat */}
                                    <div className="shrink-0 bg-white p-0.5 rounded-md shadow-2xs">
                                      <QrCodeView value={qrPayload} size={46} />
                                    </div>
                                  </div>

                                  {/* Footer Kartu */}
                                  <div className="pt-1 border-t border-emerald-700/80 flex items-center justify-between text-[7.5px]">
                                    <div>
                                      <span className="text-emerald-300">Luas: </span>
                                      <strong className="text-amber-300 font-black">
                                        {p.totalLuasLahan.toFixed(2)} Ha ({p.lahanCount} Blok)
                                      </strong>
                                    </div>
                                    <span className="inline-flex items-center gap-0.5 text-[6.5px] font-bold bg-emerald-500/20 text-emerald-200 px-1 py-0.2 rounded-full border border-emerald-400/30">
                                      <ShieldCheck className="w-2.5 h-2.5 text-amber-300" /> RESMI
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. LEMBAR SISI BELAKANG (JIKA 'BELAKANG' ATAU 'SEMUA') */}
                {(printSide === 'BELAKANG' || printSide === 'SEMUA') && (
                  <div className="a4-page">
                    <div className="no-print flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-xs text-slate-400">
                      <span>
                        Halaman {pageIndex + 1} dari {pages.length} - <strong>SISI BELAKANG</strong> (Tata Tertib & Aturan Standar)
                      </span>
                      <span>Posisi kartu disesuaikan simetris untuk cetak bolak-balik</span>
                    </div>

                    <div className="card-grid">
                      {pagePetani.map((p) => {
                        return (
                          <div key={`back-${p.id}`} className="card-cell">
                            {/* Garis batas plong / die-cut guide */}
                            <div className="cut-guide" />

                            {/* Inner Box Kartu Sisi Belakang */}
                            <div className="card-inner-box bg-white border border-slate-300 p-2 text-slate-800 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between border-b border-emerald-700/30 pb-1 mb-1">
                                  <div className="flex items-center gap-1">
                                    <div className="w-4 h-4 rounded bg-emerald-700 text-white flex items-center justify-center">
                                      <Sprout className="w-2.5 h-2.5" />
                                    </div>
                                    <div>
                                      <span className="text-[7.5px] font-black uppercase tracking-wider text-emerald-900 block leading-tight">
                                        TATA TERTIB KARTU TANI
                                      </span>
                                      <span className="text-[5.5px] text-slate-500 block leading-none">
                                        KEMENTERIAN PERTANIAN RI
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[6.5px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 py-0.2 rounded">
                                    PERMENTAN
                                  </span>
                                </div>

                                <ol className="list-decimal list-outside pl-3 space-y-0.5 text-[6.5px] leading-[1.25] text-slate-700">
                                  <li>
                                    <strong className="text-slate-900">Hak Pemegang:</strong> Identitas resmi penerima pupuk subsidi & bantuan saprodi e-RDKK.
                                  </li>
                                  <li>
                                    <strong className="text-slate-900">Penebusan Resmi:</strong> Wajib membawa kartu ini beserta <strong>e-KTP asli</strong> di KPL terdaftar.
                                  </li>
                                  <li>
                                    <strong className="text-slate-900">Larangan Keras:</strong> Kartu ini <strong>dilarang dipindahtangankan</strong> atau digadaikan kepada pihak lain.
                                  </li>
                                  <li>
                                    <strong className="text-slate-900">Sesuai Alokasi:</strong> Penebusan dilayani sesuai alokasi kuota e-RDKK musim tanam aktif.
                                  </li>
                                  <li>
                                    <strong className="text-slate-900">Kehilangan:</strong> Apabila hilang/rusak, segera lapor ke Pengurus Poktan atau Balai Penyuluhan Pertanian (BPP).
                                  </li>
                                </ol>
                              </div>

                              <div className="pt-0.5 border-t border-slate-200 flex items-end justify-between text-[6px] text-slate-500">
                                <div>
                                  <span className="block font-medium text-slate-600">Layanan e-RDKK:</span>
                                  <span className="font-mono text-emerald-800 font-bold block">BPP Kec. Lembeyan</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="block text-slate-400">Diterbitkan oleh:</span>
                                  <strong className="text-slate-800 font-bold block text-[6.5px]">BPP Kec. Lembeyan</strong>
                                  <span className="font-mono text-slate-500">Kabupaten Magetan</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
