export type Language = 'zh' | 'yue' | 'en' | 'ja' | 'ko' | 'th';

export const languages: { value: Language; label: string }[] = [
  { value: 'zh', label: '中文' },
  { value: 'yue', label: '粤语' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'th', label: 'ไทย' },
];

export const translations: Record<Language, {
  title: string;
  jobAchievement: string;
  travelExperience: string;
  serviceExperience: string;
}> = {
  zh: {
    title: '携程官方推荐导购',
    jobAchievement: '岗位成就',
    travelExperience: '旅行经历',
    serviceExperience: '服务经历',
  },
  yue: {
    title: '携程官方推荐购物向导',
    jobAchievement: '岗位成就',
    travelExperience: '旅行经历',
    serviceExperience: '服务经历',
  },
  en: {
    title: 'Ctrip Official Shopping Guide',
    jobAchievement: 'Career Achievements',
    travelExperience: 'Travel Experience',
    serviceExperience: 'Service Experience',
  },
  ja: {
    title: 'トリップドットコム公式おすすめショッピングガイド',
    jobAchievement: '職務実績',
    travelExperience: '旅行経験',
    serviceExperience: 'サービス経験',
  },
  ko: {
    title: '트립닷컴 공식 추천 쇼핑 가이드',
    jobAchievement: '직무 성과',
    travelExperience: '여행 경험',
    serviceExperience: '서비스 경험',
  },
  th: {
    title: 'ไกด์ช้อปปิ้งแนะนำอย่างเป็นทางการจาก Trip.com',
    jobAchievement: 'ความสำเร็จในหน้าที่การงาน',
    travelExperience: 'ประสบการณ์การเดินทาง',
    serviceExperience: 'ประสบการณ์การบริการ',
  },
};
