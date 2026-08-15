# 데이터 교체 안내 (실제 자료 넣기)

이 폴더의 JSON 파일들이 앱의 **모든 내용**을 결정합니다.
지금은 **예시(가상) 데이터**로 채워져 있어요. 실제 학교·대학 자료를 확보하면
아래 파일의 내용만 같은 형식으로 바꾸면 코드 수정 없이 반영됩니다.

> ⚠️ 예시 학교/대학 자료는 실제와 무관한 가상 데이터입니다.
> 학생에게 실제로 보여주기 전에 반드시 검수된 실제 데이터로 교체하세요.

## 파일 목록

| 파일 | 내용 | 실제 데이터로 바꿀 때 |
|---|---|---|
| `careerGroups.json` | 진로군(큰 분야) | 학교/교사가 다루는 분야에 맞게 조정 |
| `careers.json` | 검색용 진로·학과 목록 | 직업·학과명과 유사어 추가 |
| `questions.json` | 진로 탐색 질문·배점 | 교사 검수 문항으로 교체 |
| `courses.json` | 표준 과목 사전 | 교육과정 과목명·선수관계 정리 |
| `schools.json` | 학교 목록 | 실제 학교명·학년도·검수일 |
| `offerings.json` | 학교별 개설 과목(편제표) | **가장 중요** — 편제표 원문 기준으로 작성 |
| `careerCourseMap.json` | 진로군 ↔ 추천 과목 + 근거 | 대학 공식 권장자료 기준으로 작성 |
| `content.json` | 화면 문구·면책 문구 | 필요시 문구만 수정 |
| `schoolRules.json` | 학교별 학년·학기 선택 이수 학점 규정 | 편제표의 학기별 선택 학점으로 갱신(`exact:true`) |
| `selectionGroups.json` | 학교별 선택군(택N) 규정 | 편제표 선택군 표를 교과블록·학기·택N으로 입력(있으면 학점규정보다 우선) |

## 핵심 연결 키

모든 파일은 **ID로 서로 연결**됩니다. ID가 어긋나면 매칭이 안 돼요.

- `courseId` : `courses.json`에 정의 → `offerings.json`, `careerCourseMap.json`에서 그대로 사용
- `schoolId` : `schools.json`에 정의 → `offerings.json`에서 사용
- `groupId` : `careerGroups.json`에 정의 → `careers.json`(진로 소속), `careerCourseMap.json`(추천 대상 targetId)에서 사용

## 자주 하는 실수

- `offerings.json`의 `rawCourseName`이 `courses.json`의 `standardName`과 **다르면**
  화면에서 "유사 과목명으로 개설 확인"으로 표시됩니다. 같은 과목이면 이름을 맞추세요.
- `availabilityStatus`가 `verify` 또는 `planned`이면 "개설 여부 확인 필요"로 표시됩니다.
- 편제표에 아예 없는 과목은 "이 학교에서는 미개설"로 표시됩니다.
- 과목의 `prerequisites`(선수과목)를 나중 학기보다 뒤에 배치하면 점검에서 경고가 뜹니다.

## 엑셀/CSV로 받은 경우

엑셀·CSV로 자료를 주시면 위 JSON 형식으로 변환해 드릴 수 있어요.
파일을 주시면서 "이 편제표를 offerings.json 형식으로 바꿔줘"라고 요청하세요.
