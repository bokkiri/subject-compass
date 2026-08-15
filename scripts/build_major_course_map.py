# -*- coding: utf-8 -*-
"""
2028학년도 권역별 대학별 권장과목(반영과목).xlsx → src/data/majorCourseMap.json 생성.

정책(사용자 확정):
  - 학과명(모집단위) 기준으로 통합. 대학 구분 안 함.
  - '명시된 구체 과목명'만 courses.json의 courseId로 변환. 넓은 표기(수학/과학/국어/
    영어/사회 등)와 서술형은 무시(=매핑 안 되면 자동 스킵).
  - 핵심과목(F) → core, 권장과목(G) → recommended(핵심에 이미 있으면 core 우선).

openpyxl은 이 HCell 저작 파일의 스타일에서 IndexError가 나므로 xlsx zip의 XML을 직접 파싱한다.
산출: src/data/majorCourseMap.json, scripts/output/major_course_report.txt
"""
import json, io, os, re, zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                       # subject-compass
XLSX = os.path.join(os.path.dirname(ROOT), '2028학년도 권역별 대학별 권장과목(반영과목).xlsx')
COURSES = os.path.join(ROOT, 'src', 'data', 'courses.json')
OUT_JSON = os.path.join(ROOT, 'src', 'data', 'majorCourseMap.json')
OUT_DIR = os.path.join(HERE, 'output')
OUT_REPORT = os.path.join(OUT_DIR, 'major_course_report.txt')

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'

# ---- 정규화: 공백 제거, 로마숫자→아라비아, 소문자 ----
ROMAN = {'Ⅰ': '1', 'Ⅱ': '2', 'Ⅲ': '3', 'Ⅳ': '4', 'Ⅴ': '5'}
def norm(s):
    if s is None:
        return ''
    s = str(s)
    for k, v in ROMAN.items():
        s = s.replace(k, v)
    s = re.sub(r'\s+', '', s)
    return s.lower()

# ---- courses.json → 정규화명/별칭 → courseId ----
def load_courses():
    courses = json.load(io.open(COURSES, encoding='utf-8'))
    lookup = {}          # norm(name) -> courseId
    id2name = {}
    for c in courses:
        cid = c['courseId']
        id2name[cid] = c['standardName']
        names = [c['standardName']] + list(c.get('aliases') or [])
        for nm in names:
            key = norm(nm)
            # 표준명이 이미 잡혀 있으면 별칭이 덮어쓰지 않도록: 표준명 우선
            if key and (key not in lookup or nm == c['standardName']):
                lookup[key] = cid
    return lookup, id2name

# ---- xlsx 파싱 ----
def read_sheet():
    with zipfile.ZipFile(XLSX) as z:
        ss = []
        with z.open('xl/sharedStrings.xml') as f:
            root = ET.parse(f).getroot()
            for si in root:
                ss.append(''.join(n.text or '' for n in si.iter(NS + 't')))
        with z.open('xl/worksheets/sheet1.xml') as f:
            root = ET.parse(f).getroot()
    sd = root.find(NS + 'sheetData')
    rows = []
    for row in sd.findall(NS + 'row'):
        cells = {}
        for c in row.findall(NS + 'c'):
            ref = c.get('r'); col = ''.join(ch for ch in ref if ch.isalpha())
            v = c.find(NS + 'v'); val = v.text if v is not None else None
            if c.get('t') == 's' and val is not None:
                val = ss[int(val)]
            cells[col] = val
        rows.append((int(row.get('r')), cells))
    return rows

# ---- 셀 텍스트 → 구체 과목 courseId 집합 (매핑 안 되는 토큰은 자동 스킵) ----
# 구체 과목명처럼 보이지만 매핑 실패한 토큰을 경고로 모은다.
CONCRETE_HINT = re.compile(r'(물리|화학|생명|지구|미적분|기하|대수|확률|역학|전자기|세포|정보|한문|경제|물질대사|양자)')
# 순수 서술/넓은 표기 토큰(경고 대상에서 제외)
_SPLIT = re.compile(r'[,/()\[\]·:\-]|및|또는|포함|이상|과목|교과|영역|중|등|특히|일반선택|권장')
def split_tokens(text):
    if not text or text.strip() in ('-', ''):
        return []
    # 괄호/대괄호/콜론/서술 접두어로 분리(예: [수학(확률과 통계) 포함] → 확률과 통계,
    # "특히 미적분" → 미적분, "-일반선택: 대수" → 대수). 다어절 과목명은 공백을 유지한다.
    parts = _SPLIT.split(text)
    return [p.strip() for p in parts if p.strip()]

def map_tokens(text, lookup, warn):
    ids = []
    for tok in split_tokens(text):
        cid = lookup.get(norm(tok))
        if cid:
            ids.append(cid)
        elif CONCRETE_HINT.search(tok) and len(norm(tok)) <= 8:
            warn[tok] += 1   # 구체 과목처럼 보이는데 매핑 실패 → 점검 필요
    return ids

def main():
    lookup, id2name = load_courses()
    rows = read_sheet()

    core_by_dept = defaultdict(Counter)
    reco_by_dept = defaultdict(Counter)
    univ_by_dept = defaultdict(set)
    skipped_broad = 0          # 구체 과목이 하나도 안 잡힌 데이터 행 수
    total_data = 0
    warn = Counter()
    # 계열 기본 산출용: 대학명 dept 문자열 키워드로 대충 STEM/의약/사회/인문 클러스터 빈도
    cluster_core = defaultdict(Counter)
    def cluster_of(dept):
        d = dept
        if re.search(r'(공학|공과|기계|전자|전기|반도체|소프트|컴퓨터|정보통신|건축|토목|화공|신소재|로봇|에너지|IT|AI|인공지능|데이터)', d): return '공학계열'
        if re.search(r'(의예|치의|한의|약학|간호|보건|물리치료|치위생|임상병리|방사선|재활|응급구조|수의)', d): return '의약계열'
        if re.search(r'(수학|물리|화학|생명|생물|지구|천문|통계|식품영양|환경|지질|과학)', d): return '자연계열'
        if re.search(r'(경영|경제|회계|무역|통상|행정|법|사회복지|사회학|정치|정책|미디어|신문방송|광고|관광|호텔|금융|부동산)', d): return '사회계열'
        if re.search(r'(교육|사범)', d): return '교육계열'
        if re.search(r'(체육|음악|미술|디자인|무용|연극|영화|실용음악|성악|작곡|사진|만화|애니|예술|스포츠)', d): return '예체능계열'
        return '인문계열'

    for rn, cells in rows:
        if rn < 5:
            continue
        dept = (cells.get('D') or '').strip()
        if not dept:
            continue
        total_data += 1
        core_ids = map_tokens(cells.get('F'), lookup, warn)
        reco_ids = map_tokens(cells.get('G'), lookup, warn)
        if not core_ids and not reco_ids:
            skipped_broad += 1
            continue
        for cid in core_ids:
            core_by_dept[dept][cid] += 1
            cluster_core[cluster_of(dept)][cid] += 1
        for cid in reco_ids:
            reco_by_dept[dept][cid] += 1
        univ = (cells.get('C') or '').strip()
        if univ:
            univ_by_dept[dept].add(univ)

    # majorCourseMap 조립: 빈도 내림차순, recommended에서 core 중복 제거
    out = {}
    all_depts = set(core_by_dept) | set(reco_by_dept)
    for dept in sorted(all_depts):
        core = [cid for cid, _ in core_by_dept[dept].most_common()]
        reco = [cid for cid, _ in reco_by_dept[dept].most_common() if cid not in core]
        if not core and not reco:
            continue
        out[dept] = {
            'core': core,
            'recommended': reco,
            'sourceUniv': len(univ_by_dept[dept]),
        }

    os.makedirs(OUT_DIR, exist_ok=True)
    # JSON: 안정적 정렬, 한글 그대로
    with io.open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write('\n')

    # 리포트
    def names(ids):
        return ', '.join(id2name.get(i, i) for i in ids)
    with io.open(OUT_REPORT, 'w', encoding='utf-8') as f:
        f.write('=== majorCourseMap 생성 리포트 ===\n')
        f.write('총 데이터 행: %d  |  구체 과목 매핑된 학과: %d  |  구체 과목 0개라 스킵된 행: %d\n\n'
                % (total_data, len(out), skipped_broad))
        f.write('--- 매핑 실패(구체 과목처럼 보이는 토큰) 경고 ---\n')
        if warn:
            for tok, cnt in warn.most_common():
                f.write('  %4d  %s\n' % (cnt, tok))
        else:
            f.write('  (없음)\n')
        f.write('\n--- 계열 클러스터별 상위 core 과목(계열 기본 프로파일 참고용) ---\n')
        for cl in ['공학계열', '자연계열', '의약계열', '사회계열', '교육계열', '인문계열', '예체능계열']:
            top = cluster_core[cl].most_common(10)
            f.write('  [%s]\n' % cl)
            for cid, cnt in top:
                f.write('      %4d  %s\n' % (cnt, id2name.get(cid, cid)))
        f.write('\n--- 학과별 매핑 (총 %d) ---\n' % len(out))
        for dept in sorted(out):
            e = out[dept]
            f.write('  %s  (대학 %d곳)\n' % (dept, e['sourceUniv']))
            f.write('      핵심: %s\n' % (names(e['core']) or '-'))
            if e['recommended']:
                f.write('      권장: %s\n' % names(e['recommended']))

    print('OK  depts=%d  skipped_broad=%d  warnings=%d' % (len(out), skipped_broad, len(warn)))
    print('  ->', OUT_JSON)
    print('  ->', OUT_REPORT)

if __name__ == '__main__':
    main()
