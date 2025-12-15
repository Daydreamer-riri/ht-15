import { atom, getDefaultStore } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { Language } from '@/lib/i18n';

export const nameAtom = atomWithStorage('name', '');
export const avatarAtom = atom<null | File>(null);
export const highlightAtom = atomWithStorage('highlight', '');
export const jobAchievementAtom = atomWithStorage('jobAchievement', '');
export const travelExperienceAtom = atomWithStorage('travelExperience', '');
export const serviceExperienceAtom = atomWithStorage('serviceExperience', '');
export const qrcodeAtom = atom<null | File>(null);
export const languageAtom = atomWithStorage<Language>('language', 'zh');

export const store = getDefaultStore();
