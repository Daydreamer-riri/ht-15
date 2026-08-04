export type Language = 'zh' | 'yue' | 'en' | 'ja' | 'ko' | 'th';

export const languages: { value: Language; label: string }[] = [
  { value: 'zh', label: '中文' },
  { value: 'yue', label: '粤语' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'th', label: 'ไทย' },
];

export type ServiceRole = 'shopping_guide' | 'vacation_manager';

export const serviceRoles: { value: ServiceRole; label: string }[] = [
  { value: 'shopping_guide', label: '携程官方旅行顾问' },
  { value: 'vacation_manager', label: '携程度假旅游管家' },
];

export const translations: Record<Language, {
  title: string;
  jobAchievement: string;
  travelExperience: string;
  serviceExperience: string;
  visa: string;
  quoteStart: string;
  quoteEnd: string;
  colon: string;
}> = {
  zh: {
    title: '携程官方旅行顾问',
    jobAchievement: '岗位成就',
    travelExperience: '旅行经历',
    serviceExperience: '服务经历',
    visa: '签证专长',
    quoteStart: '“',
    quoteEnd: '”',
    colon: '：',
  },
  yue: {
    title: 'Trip.com 官方售前支援',
    jobAchievement: '岗位成就',
    travelExperience: '旅行经历',
    serviceExperience: '服务经历',
    visa: '簽證專長',
    quoteStart: '“',
    quoteEnd: '”',
    colon: '：',
  },
  en: {
    title: 'Trip.com official pre-sales support',
    jobAchievement: 'Career Achievements',
    travelExperience: 'Travel Experience',
    serviceExperience: 'Service Experience',
    visa: 'Visa Expertise',
    quoteStart: '"',
    quoteEnd: '"',
    colon: ':',
  },
  ja: {
    title: 'Trip.com公式事前販売サポート',
    jobAchievement: '職務実績',
    travelExperience: '旅行経験',
    serviceExperience: 'サービス経験',
    visa: 'ビザ専門分野',
    quoteStart: '「',
    quoteEnd: '」',
    colon: '：',
  },
  ko: {
    title: '트립닷컴 공식 사전판매 지원',
    jobAchievement: '직무 성과',
    travelExperience: '여행 경험',
    serviceExperience: '서비스 경험',
    visa: '비자 전문 분야',
    quoteStart: '"',
    quoteEnd: '"',
    colon: ':',
  },
  th: {
    title: 'ฝ่ายบริการก่อนการขายอย่างเป็นทางการของ Trip.com',
    jobAchievement: 'ความสำเร็จในหน้าที่การงาน',
    travelExperience: 'ประสบการณ์การเดินทาง',
    serviceExperience: 'ประสบการณ์การบริการ',
    visa: 'ความเชี่ยวชาญด้านวีซ่า',
    quoteStart: '"',
    quoteEnd: '"',
    colon: ':',
  },
};
