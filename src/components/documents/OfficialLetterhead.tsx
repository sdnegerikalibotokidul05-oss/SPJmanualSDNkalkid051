import React from 'react';
import { SchoolLetterhead, SchoolProfile } from '../../types';

interface OfficialLetterheadProps {
  letterhead: SchoolLetterhead;
  profile: SchoolProfile;
  className?: string;
}

export const OfficialLetterhead: React.FC<OfficialLetterheadProps> = ({
  letterhead,
  profile,
  className = '',
}) => {
  const logoSrc = profile.logoUrl || '/src/assets/images/logo_sdn_kaliboto_kidul_05_1791253078034.jpg';

  return (
    <div className={`w-full select-none ${className}`} style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Grid layout for logo on left and centered text on right */}
      <div className="grid grid-cols-[3cm_1fr] items-center gap-2 pb-2">
        {/* Logo Container: fixed 2cm x 3cm */}
        <div className="flex items-center justify-center" style={{ width: '3cm', height: '3.2cm' }}>
          <img
            src={logoSrc}
            alt="Logo Sekolah"
            className="object-contain"
            style={{ width: `${letterhead.logoWidthCm || 2}cm`, height: `${letterhead.logoHeightCm || 3}cm` }}
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fallback to stylized SVG shield if image load has issue
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* Text Area: Arial font, Baris 1: 18pt bold, Baris 2: 18pt bold, Baris 3: 24pt bold */}
        <div className="text-center px-2 flex flex-col justify-center overflow-hidden">
          {/* Baris 1: 18pt Bold Center No Wrap */}
          <div
            className="font-bold tracking-wide uppercase leading-tight text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ fontSize: '18pt' }}
            title={letterhead.pemerintahDaerah}
          >
            {letterhead.pemerintahDaerah}
          </div>

          {/* Baris 2: 18pt Bold Center No Wrap */}
          <div
            className="font-bold tracking-wide uppercase leading-tight text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis mt-0.5"
            style={{ fontSize: '18pt' }}
            title={letterhead.dinasTerkait}
          >
            {letterhead.dinasTerkait}
          </div>

          {/* Baris 3: 24pt Bold Center No Wrap */}
          <div
            className="font-bold tracking-wider uppercase leading-tight text-slate-950 whitespace-nowrap overflow-hidden text-ellipsis mt-1"
            style={{ fontSize: '24pt' }}
            title={letterhead.namaUnitSekolah || profile.namaSekolah}
          >
            {letterhead.namaUnitSekolah || profile.namaSekolah}
          </div>

          {/* Sublines: Alamat & Kontak */}
          <div className="text-[10pt] text-slate-700 leading-tight mt-1.5 whitespace-normal">
            {letterhead.alamatBaris || `${profile.alamatSekolah}, ${profile.desaKelurahan}, Kec. ${profile.kecamatan}, Kab. ${profile.kabupatenKota} ${profile.kodePos}`}
          </div>
          <div className="text-[9.5pt] text-slate-700 leading-tight mt-0.5 whitespace-normal">
            {letterhead.kontakBaris || `Telepon: ${profile.nomorTelepon} | Email: ${profile.emailSekolah}`}
          </div>
        </div>
      </div>

      {/* Official Government Double Horizontal Line */}
      <div className="w-full mt-1">
        <div className="w-full border-t-[2.5px] border-black"></div>
        <div className="w-full border-t-[1px] border-black mt-[1.5px]"></div>
      </div>
    </div>
  );
};
