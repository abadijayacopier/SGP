'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeViewProps {
  value: string;
  size?: number;
  className?: string;
  caption?: string;
}

export default function QrCodeView({
  value,
  size = 120,
  className = '',
  caption,
}: QrCodeViewProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (value) {
      QRCode.toDataURL(value, {
        width: size * 2,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-[10px] text-slate-400 font-mono"
      >
        QR...
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <img
          src={dataUrl}
          alt="QR Code Verifikasi"
          style={{ width: size, height: size }}
          className="rounded-lg object-contain"
        />
      </div>
      {caption && (
        <span className="text-[10px] text-slate-400 mt-1 font-mono tracking-tight text-center">
          {caption}
        </span>
      )}
    </div>
  );
}
