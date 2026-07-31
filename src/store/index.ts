import type { Language, ServiceRole } from '@/lib/i18n';
import { atom, getDefaultStore } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const nameAtom = atomWithStorage('name', '');
export const avatarAtom = atom<null | File>(null);
export const highlightAtom = atomWithStorage('highlight', '');
export const jobAchievementAtom = atomWithStorage('jobAchievement', '');
export const travelExperienceAtom = atomWithStorage('travelExperience', '');
export const serviceExperienceAtom = atomWithStorage('serviceExperience', '');
export const visaAtom = atomWithStorage('visaAtom', '');
export const qrcodeAtom = atom<null | File>(null);
export const languageAtom = atomWithStorage<Language>('language', 'zh');
export const serviceRoleAtom = atomWithStorage<ServiceRole>('serviceRole', 'shopping_guide');

export const store = getDefaultStore();
