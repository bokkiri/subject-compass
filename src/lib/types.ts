// 앱 전체에서 쓰는 데이터 타입 정의
// 실제 데이터로 교체할 때도 이 형태(shape)를 지키면 됩니다.
// (자세한 설명은 src/data/README.md 참고)

/** 교과 영역 */
export type SubjectArea =
  | '국어'
  | '수학'
  | '영어'
  | '사회'
  | '과학'
  | '체육'
  | '예술'
  | '기술·가정'
  | '정보'
  | '제2외국어/한문'
  | '교양'
  | '기타';

/** 추천 등급 */
export type RelevanceLevel = 'core' | 'recommended' | 'exploratory';

/** 학교에서의 개설 상태 (원본 데이터 기준) */
export type AvailabilityStatus = 'confirmed' | 'planned' | 'verify';

/** 진로군: 진로 탐색(미결정) 결과로 제시되는 큰 분야 */
export interface CareerGroup {
  groupId: string;
  name: string;
  description: string;
  /** 관련 분야/직업 예시 (학생 이해용) */
  examples: string[];
}

/** 진로/학과: 검색·직접 입력으로 고르는 구체 대상 */
export interface Career {
  careerId: string;
  /** 직업 / 학과 / 계열 */
  careerType: '직업' | '학과' | '계열';
  name: string;
  /** 유사어·줄임말 (검색 매칭에 사용) */
  aliases: string[];
  description: string;
  /** 어떤 진로군에 속하는지 */
  groupId: string;
  /** 소속 계열명 (예: "공학계열") — majorFields.json / 커리어넷 lClass와 매칭 */
  field?: string;
}

/** 계열: 설문 결과의 산정 축이자 학과를 묶는 대분류 (커리어넷 lClass 기준) */
export interface MajorField {
  fieldId: string;
  /** 계열명 — 커리어넷 학과 데이터(lClass) 값과 정확히 일치해야 함 (예: "공학계열") */
  name: string;
  emoji: string;
  description: string;
  /** 이 계열에서 배우는 것 한 줄 소개 */
  blurb: string;
}

/** 커리어넷에서 수집한 '대학교별 학과' 항목
 *  (collect_university_majors.py 2단계 → universityDepartments.json) */
export interface UniversityDepartment {
  /** 안정적 id (예: "UD-21001-3") */
  deptId: string;
  /** 커리어넷 학과코드 */
  majorSeq: string;
  /** 계열 (lClass) */
  field: string;
  /** 학과 카테고리 (mClass) */
  category: string;
  /** 대학교 이름 */
  university: string;
  /** 캠퍼스 (있으면) */
  campus?: string;
  /** 지역 (있으면) */
  region?: string;
  /** 그 대학교에서의 학과명 */
  department: string;
}

/** 화면에서 다루는 '학과 후보' 통합 형태.
 *  우선순위: 대학교별 학과(universityDepartments) → 학과목록(universityMajors) → 큐레이션 학과. */
export interface MajorOption {
  /** 안정적 id (대학별: "UD-…", 학과목록: "MJ-266", 큐레이션: "CR-CSE") */
  majorId: string;
  /** 학과명 (화면 표시·검색 대상) */
  name: string;
  /** 소속 계열명 (majorFields.json name과 매칭) */
  field: string;
  /** 학과 중분류 (있으면) */
  category?: string;
  /** 개설 대학교 이름 (대학교별 학과 데이터에만 있음) */
  university?: string;
  /** 지역 (있으면) */
  region?: string;
  /** 검색 보조어 (큐레이션 학과만; 수집 데이터는 빈 배열 → 학과명만 매칭) */
  aliases: string[];
  /** 큐레이션 학과의 과목추천 연결용 진로군 (수집 데이터는 없음) */
  groupId?: string;
}

/** 커리어넷에서 수집한 대학교 학과 사전 항목
 *  (scripts/collect_university_majors.py 로 생성 → universityMajors.json) */
export interface UniversityMajor {
  /** 앱 내부용 안정적 id (예: "MJ-266") */
  majorId: string;
  /** 커리어넷 원본 학과코드(majorSeq) */
  majorSeq: string;
  /** 계열 (원본 lClass) — 예: "공학계열" */
  field: string;
  /** 학과/중분류 (원본 mClass) — 예: "컴퓨터·통신" */
  category: string;
  /** 세부학과명 (원본 facilName, 화면 표시용) — 예: "컴퓨터공학과" */
  name: string;
}

/** 진로 탐색 질문의 선택지 */
export interface QuestionOption {
  optionId: string;
  label: string;
  emoji?: string;
  /** 이 선택지가 각 진로군에 더하는 점수. { groupId: 점수 } */
  scores: Record<string, number>;
}

/** 진로 탐색 질문 */
export interface Question {
  questionId: string;
  text: string;
  /** 복수 선택 허용 여부 */
  multi: boolean;
  options: QuestionOption[];
}

/** 선택과목 유형 (2022 개정 교육과정) */
export type ElectiveType = '공통' | '일반' | '진로' | '융합';

/** 표준 과목 사전 항목 */
export interface Course {
  courseId: string;
  standardName: string;
  aliases: string[];
  subjectArea: SubjectArea;
  /** 선택과목 유형 (일반/진로/융합 선택, 공통과목) */
  electiveType?: ElectiveType;
  /** 기본 학점(단위) */
  credits: number;
  /** 선수과목 courseId 목록 */
  prerequisites: string[];
  /** 함께 듣기 어려운(상호배타) 과목 courseId 목록 */
  incompatibleWith: string[];
  /** 학생용 한 줄 설명 */
  description: string;
}

/** 학교 */
export interface School {
  schoolId: string;
  schoolName: string;
  region: string;
  /** 적용 학년도 (예: "2025") */
  curriculumYear: string;
  /** 데이터 검수/기준일 */
  lastReviewedAt: string;
  /** 편제표 원문 근거 */
  sourceDocument: string;
  /** 이 학교가 예시(가상) 데이터인지 표시 */
  isSample: boolean;
}

/** 학교별 개설 과목 (편제표) */
export interface Offering {
  schoolId: string;
  courseId: string;
  /** 원문에 적힌 과목명(표준명과 다를 수 있음) */
  rawCourseName: string;
  grade: number; // 2 또는 3
  semester?: number; // 1 또는 2 (편제표에 특정 안 되면 생략)
  credits: number;
  selectionGroup?: string;
  availabilityStatus: AvailabilityStatus;
  /** 학교지정(필수) 과목이면 true, 학생선택이면 false/undefined */
  required?: boolean;
}

/** 추천 근거 출처 */
export interface EvidenceRef {
  sourceName: string;
  sourceDetail: string;
  effectiveDate: string;
}

/** 진로(군) ↔ 추천 과목 매핑 */
export interface CareerCourseMapping {
  /** 진로군 groupId 또는 careerId */
  targetId: string;
  courseId: string;
  relevanceLevel: RelevanceLevel;
  /** 추천 가중치 (0~1) */
  weight: number;
  rationale: string;
  evidence: EvidenceRef[];
}

// ---------- 세션(학생 진행 상태) ----------

export type CareerDecisionState = 'decided' | 'undecided';

/** 화면(단계) 식별자 */
export type Screen =
  | 'start'
  | 'decision'
  | 'careerSearch'
  | 'explore'
  | 'candidates'
  | 'school'
  | 'recommend'
  | 'planner'
  | 'entrance'
  | 'curriculum'
  | 'check'
  | 'result';

/** 배치 보드의 칸(슬롯) */
export type SlotId =
  | 'g2s1'
  | 'g2s2'
  | 'g3s1'
  | 'g3s2'
  | 'unplaced';

/** 학생이 계획에 넣은 과목 + 배치 위치 */
export interface PlannedCourse {
  courseId: string;
  slot: SlotId;
}

export interface StudentSession {
  version: number;
  createdAt: string;
  updatedAt: string;
  screen: Screen;
  careerDecisionState?: CareerDecisionState;
  /** 확정된 진로군 (탐색 경로) 또는 선택 진로 소속 진로군 */
  selectedGroupId?: string;
  /** 검색 경로에서 고른 진로 */
  selectedCareerId?: string;
  /** 선택한 학과 (검색·설문 결과 공통) — majorOptions의 majorId */
  selectedMajorId?: string;
  /** 선택한 학과의 표시 라벨 ("대학교 학과명") — 큰 데이터 없이 결과 화면에서 바로 표시 */
  selectedMajorLabel?: string;
  /** 선택한 학과의 순수 학과명(대학교명 제외) — 학과별 과목 추천 매칭 키 */
  selectedMajorName?: string;
  /** 선택한 학과의 계열 (설문 산정 축) — majorFields의 fieldId */
  selectedFieldId?: string;
  /** 진로 탐색 답변: { questionId: optionId[] } */
  interestAnswers: Record<string, string[]>;
  selectedSchoolId?: string;
  plannedCourses: PlannedCourse[];
  /** 학기 여정(입학 시뮬레이션) 현재 학기 인덱스 0~5 */
  wizardStep?: number;
  /** 졸업장에 은근히 박히는 숨은 6자리 코드(나침반 이벤트 게이트) */
  raffleCode?: string;
  /** 나침반 숨은 이벤트 진행 상태 — 코드별 1회(코드를 키로 저장, result가 있으면 그 코드는 잠금) */
  raffleResults?: Record<string, RaffleAttempt>;
}

/** 나침반 이벤트 참여 1건(코드 1개당) */
export interface RaffleAttempt {
  branch?: 'mid' | 'high' | 'lecture';
  /** 중학생 퀴즈 O/X 답안 (true=O, false=X) */
  answers?: (boolean | undefined)[];
  result?: 'win' | 'lose';
}

// ---------- 계산 결과 타입 ----------

export interface CareerGroupScore {
  group: CareerGroup;
  score: number;
  /** 왜 이 결과가 나왔는지 근거 문구 */
  reasons: string[];
}

/** 추천 과목 한 개의 계산 결과 */
export type MatchStatus =
  | 'offered' // 학교 개설 확인
  | 'offered_similar' // 유사 과목명으로 개설 확인
  | 'verify' // 개설 여부 확인 필요
  | 'not_offered'; // 학교에서 미개설

export interface RecommendedCourse {
  course: Course;
  level: RelevanceLevel;
  score: number;
  rationale: string;
  evidence: EvidenceRef[];
  matchStatus: MatchStatus;
  /** 학교에서 개설되는 학년/학기들 */
  offeredAt: { grade: number; semester?: number; credits: number }[];
}

/** 편제표 한 과목 (추천 정보 선택적) */
export interface CurriculumEntry {
  course: Course;
  /** 학교지정(필수) 과목이면 true */
  required: boolean;
  recommended?: {
    level: RelevanceLevel;
    rationale: string;
    evidence: EvidenceRef[];
  };
}

/** 교과 영역별 편제표 묶음 */
export interface CurriculumArea {
  area: SubjectArea;
  entries: CurriculumEntry[];
}

/** 학기별 이수 학점 목표 */
export interface SlotTargets {
  g2s1: number;
  g2s2: number;
  g3s1: number;
  g3s2: number;
}

/** 학교별 이수 규정 */
export interface SchoolRule {
  electiveCredits: SlotTargets;
  /** 편제표에서 직접 확인한 값이면 true, 표준 추정치면 false */
  exact: boolean;
}

/** 선택군(택N) 규정: 특정 학기에 해당 풀에서 choose개 선택.
 *  courseIds가 있으면 그 과목 풀로, 없으면 areas(교과군)로 판정한다. */
export interface SelectionGroup {
  label: string;
  areas?: SubjectArea[];
  courseIds?: string[];
  slot: Exclude<SlotId, 'unplaced'>;
  choose: number;
}

/** 학기순 위저드용 선택군 정의(명시적 과목 풀). */
export interface SelectionGroupDef {
  label: string;
  choose: number;
  courseIds: string[];
}

/** 한 학기의 교육과정: 지정(자동·잠금) + 선택군(택N) */
export interface CurriculumSemester {
  slot: Exclude<SlotId, 'unplaced'>;
  /** 학교지정(필수) 과목 — 위저드에서 자동 포함·잠금 */
  required: string[];
  groups: SelectionGroupDef[];
}

/** 학교별 학기순 교육과정(g2s1→g3s2) */
export interface SchoolCurriculum {
  semesters: CurriculumSemester[];
}

export type CheckSeverity = 'error' | 'verify' | 'recommendation';

export interface CheckResult {
  severity: CheckSeverity;
  message: string;
  /** 관련 과목명(있으면) */
  courseName?: string;
}
