export type VideoTopicGroup = 'Công nghệ' | 'Học tập' | 'Khoa học' | 'Sáng tạo & giải trí';
export type VideoTopicIcon =
  | 'brain'
  | 'code'
  | 'robot'
  | 'math'
  | 'science'
  | 'language'
  | 'graduation'
  | 'space'
  | 'design'
  | 'film'
  | 'music'
  | 'gaming'
  | 'sports'
  | 'history';

export interface VideoTopic {
  id: string;
  label: string;
  description: string;
  query: string;
  group: VideoTopicGroup;
  icon: VideoTopicIcon;
}

export const VIDEO_TOPIC_GROUPS: Array<'Tất cả' | VideoTopicGroup> = [
  'Tất cả',
  'Công nghệ',
  'Học tập',
  'Khoa học',
  'Sáng tạo & giải trí',
];

export const VIDEO_TOPICS: VideoTopic[] = [
  {
    id: 'artificial-intelligence',
    label: 'AI & Machine Learning',
    description: 'LLM, AI agents, mô hình và ứng dụng mới',
    query: 'AI trí tuệ nhân tạo machine learning LLM AI agents',
    group: 'Công nghệ',
    icon: 'brain',
  },
  {
    id: 'software-development',
    label: 'Lập trình & phần mềm',
    description: 'Python, JavaScript, kiến trúc và kỹ thuật',
    query: 'lập trình Python JavaScript software engineering tutorial',
    group: 'Công nghệ',
    icon: 'code',
  },
  {
    id: 'robotics',
    label: 'Robotics & phần cứng',
    description: 'Robot, điện tử, vi điều khiển và chế tạo',
    query: 'robotics humanoid robots electronics engineering',
    group: 'Công nghệ',
    icon: 'robot',
  },
  {
    id: 'mathematics',
    label: 'Toán học',
    description: 'Tư duy toán, lời giải và bài giảng trực quan',
    query: 'toán học tư duy toán nâng cao mathematics visual explanation',
    group: 'Học tập',
    icon: 'math',
  },
  {
    id: 'physics',
    label: 'Vật lý & thí nghiệm',
    description: 'Mô phỏng, thí nghiệm và hiện tượng tự nhiên',
    query: 'vật lý thí nghiệm physics experiments explained',
    group: 'Khoa học',
    icon: 'science',
  },
  {
    id: 'science',
    label: 'Khoa học khám phá',
    description: 'Sinh học, hóa học và những phát hiện mới',
    query: 'khoa học khám phá science discoveries biology chemistry',
    group: 'Khoa học',
    icon: 'science',
  },
  {
    id: 'space',
    label: 'Vũ trụ & thiên văn',
    description: 'NASA, hành tinh, thiên hà và khám phá không gian',
    query: 'space astronomy universe NASA planets documentary',
    group: 'Khoa học',
    icon: 'space',
  },
  {
    id: 'english-learning',
    label: 'Tiếng Anh',
    description: 'Nghe, nói, phát âm và giao tiếp thực tế',
    query: 'English listening speaking pronunciation practice',
    group: 'Học tập',
    icon: 'language',
  },
  {
    id: 'ielts',
    label: 'IELTS',
    description: 'Writing, Speaking và chiến lược học tập',
    query: 'IELTS writing speaking band 8 study tips',
    group: 'Học tập',
    icon: 'graduation',
  },
  {
    id: 'design',
    label: 'Thiết kế & UI/UX',
    description: 'Product design, đồ họa và trải nghiệm số',
    query: 'UI UX product design visual design tutorial',
    group: 'Sáng tạo & giải trí',
    icon: 'design',
  },
  {
    id: 'filmmaking',
    label: 'Làm phim & dựng video',
    description: 'Cinematography, storytelling và hậu kỳ',
    query: 'filmmaking cinematography video editing storytelling',
    group: 'Sáng tạo & giải trí',
    icon: 'film',
  },
  {
    id: 'music',
    label: 'Âm nhạc',
    description: 'Live performance, khám phá nghệ sĩ và thể loại',
    query: 'live music performance acoustic sessions new music',
    group: 'Sáng tạo & giải trí',
    icon: 'music',
  },
  {
    id: 'gaming',
    label: 'Gaming',
    description: 'Gameplay, hướng dẫn và khám phá trò chơi',
    query: 'gaming gameplay walkthrough best games',
    group: 'Sáng tạo & giải trí',
    icon: 'gaming',
  },
  {
    id: 'sports',
    label: 'Thể thao',
    description: 'Highlights, phân tích và câu chuyện thể thao',
    query: 'sports highlights analysis football basketball',
    group: 'Sáng tạo & giải trí',
    icon: 'sports',
  },
  {
    id: 'history',
    label: 'Lịch sử & tư liệu',
    description: 'Lịch sử thế giới, nhân vật và phim tài liệu',
    query: 'history documentary historical events explained',
    group: 'Khoa học',
    icon: 'history',
  },
];
