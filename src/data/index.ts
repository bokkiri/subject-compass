// JSON 데이터를 타입에 맞춰 불러오는 곳.
// 실제 데이터로 교체할 때는 옆에 있는 *.json 파일 내용만 바꾸면 됩니다.
// (형식 설명은 README.md 참고)

import type {
  Career,
  CareerGroup,
  MajorField,
  Question,
} from '../lib/types';

import careerGroupsJson from './careerGroups.json';
import careersJson from './careers.json';
import questionsJson from './questions.json';
import contentJson from './content.json';
import majorFieldsJson from './majorFields.json';

export const careerGroups = careerGroupsJson as CareerGroup[];
export const careers = careersJson as Career[];
export const questions = questionsJson as Question[];
export const content = contentJson;

/** 계열 목록 (설문 산정 축) */
export const majorFields = majorFieldsJson as MajorField[];
export const fieldById = new Map(majorFields.map((f) => [f.fieldId, f]));
export const fieldByName = new Map(majorFields.map((f) => [f.name, f]));

// 대용량 데이터는 첫 로딩을 가볍게 하려고 별도 모듈에서 '지연 로딩'으로 다룬다.
//  · 학과 후보 풀(대학교별 학과)  → src/lib/majorData.ts
//  · 편제표(offerings/curriculum 등) → src/lib/schoolData.ts
// (여기서 eager import 하지 않는다)

// 빠른 조회를 위한 인덱스 (작은 데이터만)
export const careerById = new Map(careers.map((c) => [c.careerId, c]));
export const groupById = new Map(careerGroups.map((g) => [g.groupId, g]));
