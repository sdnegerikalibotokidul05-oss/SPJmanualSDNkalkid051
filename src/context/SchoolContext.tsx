import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiClient';
import { SchoolProfile, SchoolLetterhead } from '../types';
import { getInitialSeedData } from '../utils/seedData';

interface SchoolContextType {
  profile: SchoolProfile;
  letterhead: SchoolLetterhead;
  isLoading: boolean;
  refreshSchoolData: () => Promise<void>;
  updateProfile: (data: Partial<SchoolProfile>) => Promise<SchoolProfile>;
  updateLetterhead: (data: Partial<SchoolLetterhead>) => Promise<SchoolLetterhead>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

const defaultSeed = getInitialSeedData();

const getInitialProfile = (): SchoolProfile => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('school_db_profile') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.namaSekolah) return parsed;
    }
  } catch {
    // ignore
  }
  return defaultSeed.school_profile;
};

const getInitialLetterhead = (): SchoolLetterhead => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('school_db_letterhead') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.namaProvinsi) return parsed;
    }
  } catch {
    // ignore
  }
  return defaultSeed.school_letterhead;
};

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<SchoolProfile>(getInitialProfile);
  const [letterhead, setLetterhead] = useState<SchoolLetterhead>(getInitialLetterhead);
  const [isLoading, setIsLoading] = useState(false);

  const refreshSchoolData = useCallback(async () => {
    try {
      const [profData, letData] = await Promise.all([
        api.getSchoolProfile(),
        api.getSchoolLetterhead(),
      ]);
      if (profData && profData.namaSekolah) {
        setProfile(profData);
        try {
          localStorage.setItem('school_db_profile', JSON.stringify(profData));
        } catch {
          // ignore
        }
      }
      if (letData) {
        setLetterhead(letData);
        try {
          localStorage.setItem('school_db_letterhead', JSON.stringify(letData));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Could not fetch school data from API, using cached/seed:', err);
    }
  }, []);

  useEffect(() => {
    refreshSchoolData();
  }, [refreshSchoolData]);

  const updateProfile = async (data: Partial<SchoolProfile>) => {
    const updated = { ...profile, ...data, updatedAt: new Date().toISOString() };
    setProfile(updated as SchoolProfile);
    try {
      localStorage.setItem('school_db_profile', JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      const res = await api.updateSchoolProfile(data);
      if (res && res.namaSekolah) {
        setProfile(res);
        try {
          localStorage.setItem('school_db_profile', JSON.stringify(res));
        } catch {
          // ignore
        }
        return res;
      }
    } catch (err) {
      console.warn('Gagal simpan ke API, state lokal tetap diperbarui:', err);
    }
    return updated as SchoolProfile;
  };

  const updateLetterhead = async (data: Partial<SchoolLetterhead>) => {
    const updated = { ...letterhead, ...data, updatedAt: new Date().toISOString() };
    setLetterhead(updated as SchoolLetterhead);
    try {
      localStorage.setItem('school_db_letterhead', JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      const res = await api.updateSchoolLetterhead(data);
      if (res) {
        setLetterhead(res);
        try {
          localStorage.setItem('school_db_letterhead', JSON.stringify(res));
        } catch {
          // ignore
        }
        return res;
      }
    } catch (err) {
      console.warn('Gagal simpan kop surat ke API, state lokal tetap diperbarui:', err);
    }
    return updated as SchoolLetterhead;
  };

  return (
    <SchoolContext.Provider
      value={{
        profile,
        letterhead,
        isLoading,
        refreshSchoolData,
        updateProfile,
        updateLetterhead,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const ctx = useContext(SchoolContext);
  if (!ctx) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return ctx;
};
