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

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<SchoolProfile>(defaultSeed.school_profile);
  const [letterhead, setLetterhead] = useState<SchoolLetterhead>(defaultSeed.school_letterhead);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSchoolData = useCallback(async () => {
    try {
      const [profData, letData] = await Promise.all([
        api.getSchoolProfile(),
        api.getSchoolLetterhead(),
      ]);
      if (profData) setProfile(profData);
      if (letData) setLetterhead(letData);
    } catch (err) {
      console.warn('Could not fetch school data from API, using cached/seed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSchoolData();
  }, [refreshSchoolData]);

  const updateProfile = async (data: Partial<SchoolProfile>) => {
    const res = await api.updateSchoolProfile(data);
    setProfile(res);
    return res;
  };

  const updateLetterhead = async (data: Partial<SchoolLetterhead>) => {
    const res = await api.updateSchoolLetterhead(data);
    setLetterhead(res);
    return res;
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
