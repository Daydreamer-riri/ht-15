import { atom, getDefaultStore } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const nameAtom = atomWithStorage('name', '');
export const avatarAtom = atom<null | File>(null);
export const highlightAtom = atomWithStorage('highlight', '');
export const jobAchievementAtom = atomWithStorage('jobAchievement', '');
export const travelExperienceAtom = atomWithStorage('travelExperience', '');
export const serviceExperienceAtom = atomWithStorage('serviceExperience', '');
export const qrcodeAtom = atom<null | File>(null);

export const store = getDefaultStore();
