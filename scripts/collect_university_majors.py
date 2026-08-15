# -*- coding: utf-8 -*-
# ============================================================================
# 커리어넷 오픈 API - 대학교 '학과 리스트' 수집 스크립트
#
# [실행 전에 딱 한 번만] 아래 명령어를 터미널(명령 프롬프트/PowerShell)에 붙여넣어
# 필요한 라이브러리를 설치하세요. (이 스크립트는 'requests' 하나만 있으면 됩니다.)
#
#     pip install requests
#
# [실행 방법]
#   1) 인증키를 '환경 변수'로 등록합니다. (코드에 직접 적지 않습니다)
#        · 윈도우 PowerShell:  setx CAREERNET_API_KEY "본인_인증키"   (영구)
#          (지금 창에서만:      $env:CAREERNET_API_KEY = "본인_인증키")
#        · macOS / Linux    :  export CAREERNET_API_KEY="본인_인증키"
#   2) 터미널에서 이 파일이 있는 폴더로 이동한 뒤 아래처럼 실행합니다.
#
#     python collect_university_majors.py
#
# [무엇을 하나요?]
#   1단계) 커리어넷에서 대학교 학과 '목록'(계열/학과)을 안전하게 내려받아
#          → ../src/data/universityMajors.json 로 저장
#   2단계) 각 학과의 '상세'를 호출해 그 학과를 개설한 '대학교 목록'을 모아
#          → ../src/data/universityDepartments.json 로 저장 (대학교 + 학과)
#   - 원본 백업(JSON)과 사람이 보기 편한 CSV도 ./output/ 폴더에 함께 남깁니다.
#
#   ※ 처음엔 아래 LIMIT_MAJORS 를 3 정도로 두고 한 번 돌려 결과를 확인한 뒤,
#     0(전체)으로 바꿔 다시 실행하는 걸 권장해요. (전체 2단계는 약 15~25분)
# ============================================================================

import csv
import json
import os
import random
import sys
import time

import requests  # pip install requests

# 윈도우 터미널에서 한글이 깨지지 않도록 출력 인코딩을 UTF-8로 맞춥니다.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


# ----------------------------------------------------------------------------
# 1) 설정값 (여기만 본인 상황에 맞게 바꾸면 됩니다)
# ----------------------------------------------------------------------------

# 인증키는 코드에 직접 적지 않고, '실제 기기의 환경 변수'에서 읽어옵니다.
# 이렇게 하면 키가 코드/깃(Git)에 실수로 올라가지 않아 안전합니다.
#
# 읽어오는 환경 변수 이름: CAREERNET_API_KEY
#
# [환경 변수 등록 방법]
#   · 윈도우 PowerShell (이번 창에서만 임시로):
#       $env:CAREERNET_API_KEY = "본인_인증키"
#     영구 등록(다음부터 자동 적용, 새 터미널부터):
#       setx CAREERNET_API_KEY "본인_인증키"
#   · macOS / Linux (이번 창에서만 임시로):
#       export CAREERNET_API_KEY="본인_인증키"
#
# 등록 후 이 스크립트를 실행하면 아래 한 줄이 그 값을 자동으로 읽어옵니다.
API_KEY_ENV_NAME = "CAREERNET_API_KEY"
API_KEY = os.environ.get(API_KEY_ENV_NAME, "").strip()

# API 기본 주소
BASE_URL = "https://www.career.go.kr/cnet/openapi/getOpenApi"

# 어떤 학교 구분의 학과를 받을지.
#  - 커리어넷 학과 API는 한글 "대학교"가 아니라 아래 '코드값'을 받습니다.
#    · "univ_list"    → 대학교(4년제)  ← 기본값
#    · "college_list" → 전문대학
#  - 혹시 응답이 0건이면 이 값을 바꿔서 다시 시도해 보세요.
GUBUN = "univ_list"

# 한 페이지에 몇 개씩 받아올지 (100이면 서버·네트워크 부담이 적당합니다)
PER_PAGE = 100

# 매 페이지 요청 사이에 쉬는 시간(초) - 서버 부하 방지를 위해 1~3초 사이 랜덤
MIN_SLEEP = 1.0
MAX_SLEEP = 3.0

# 네트워크 오류 시 한 페이지를 최대 몇 번까지 다시 시도할지
MAX_RETRY = 3

# 한 번 요청을 보낸 뒤 응답을 최대 몇 초까지 기다릴지 (초)
REQUEST_TIMEOUT = 20

# 무한루프 방지용 안전장치: 페이지가 이 숫자를 넘으면 강제로 멈춥니다.
MAX_PAGE_LIMIT = 1000

# ── 2단계: 대학교별 학과 수집 설정 ──────────────────────────────────
# 1단계에서 모은 학과(카테고리) 하나하나에 대해 '상세' API를 호출해서
# "그 학과를 어느 대학교에서 개설하는지" 목록을 받아옵니다.
# 그래야 화면에 '○○대학교 · 학과명'처럼 대학교와 함께 보여줄 수 있어요.
COLLECT_UNIVERSITIES = True        # False로 두면 1단계(학과 목록)만 수집합니다.

# 처음엔 3 정도로 두고 한 번 돌려서 결과가 잘 나오는지 확인한 뒤,
# 0으로 바꿔 전체(약 500개)를 수집하는 걸 권장해요. (전체는 약 15~25분 소요)
LIMIT_MAJORS = 0                   # 0 = 전체, 그 외 숫자 = 그 개수만 (테스트용)

MAJOR_VIEW_SVCCODE = "MAJOR_VIEW"  # 학과 상세(개설 대학 목록) 서비스 코드


# ----------------------------------------------------------------------------
# 2) 저장 경로 계산
#    - 이 스크립트가 어디에서 실행되든 항상 같은 위치에 저장되도록,
#      '스크립트 파일 위치'를 기준으로 경로를 잡습니다.
# ----------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))          # .../scripts
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)                        # 프로젝트 루트
DATA_DIR = os.path.join(PROJECT_ROOT, "src", "data")             # 앱 데이터 폴더
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "output")                  # 백업 폴더

# 앱이 실제로 불러 쓸 파일 (핵심 결과물)
APP_JSON_PATH = os.path.join(DATA_DIR, "universityMajors.json")
# 안전용 백업 파일들
RAW_JSON_PATH = os.path.join(OUTPUT_DIR, "universityMajors.raw.json")
CSV_PATH = os.path.join(OUTPUT_DIR, "universityMajors.csv")

# 2단계(대학교별 학과) 결과 파일
DEPT_JSON_PATH = os.path.join(DATA_DIR, "universityDepartments.json")   # 앱용 핵심 결과물
DEPT_CSV_PATH = os.path.join(OUTPUT_DIR, "universityDepartments.csv")   # 사람이 보기 편한 백업
# 상세 응답이 예상과 다를 때 대비해, 맨 처음 상세 응답 1건의 원본을 그대로 저장해 둡니다.
DEPT_RAW_SAMPLE_PATH = os.path.join(OUTPUT_DIR, "major_view_sample.json")


# ----------------------------------------------------------------------------
# 3) 응답(JSON)에서 학과 목록을 유연하게 찾아내는 도우미 함수들
#    - 커리어넷 응답의 감싸는 형태가 조금씩 다를 수 있어서,
#      'majorSeq'를 가진 딕셔너리들의 리스트를 알아서 찾아냅니다.
# ----------------------------------------------------------------------------

def find_record_list(data):
    """응답 전체(data)에서 학과 레코드(dict)들의 리스트를 재귀적으로 찾습니다."""
    # (1) 자주 쓰이는 위치를 먼저 직접 확인
    if isinstance(data, dict):
        for key in ("dataSearch", "data"):
            if key in data and isinstance(data[key], dict):
                content = data[key].get("content")
                if isinstance(content, list) and content:
                    return content
        if isinstance(data.get("content"), list) and data["content"]:
            return data["content"]

    # (2) 못 찾으면 전체를 뒤져서 'majorSeq'를 가진 dict들의 리스트를 찾음
    def walk(node):
        if isinstance(node, list):
            if node and all(isinstance(x, dict) for x in node) and \
               any(("majorSeq" in x or "facilName" in x) for x in node):
                return node
            for item in node:
                found = walk(item)
                if found is not None:
                    return found
        elif isinstance(node, dict):
            for value in node.values():
                found = walk(value)
                if found is not None:
                    return found
        return None

    return walk(data) or []


def find_total_count(data):
    """전체 개수(totalCount)를 찾아 정수로 돌려줍니다. 못 찾으면 None."""
    def walk(node):
        if isinstance(node, dict):
            for key in ("totalCount", "total", "totalCnt", "count"):
                if key in node:
                    try:
                        return int(node[key])
                    except (TypeError, ValueError):
                        pass
            for value in node.values():
                found = walk(value)
                if found is not None:
                    return found
        return None

    return walk(data)


# ----------------------------------------------------------------------------
# 4) 한 페이지를 요청하는 함수 (재시도 포함)
#    - 네트워크 오류/일시적 서버 지연이 나면 MAX_RETRY 번까지 다시 시도합니다.
#    - 끝까지 실패하면 예외를 던져서 바깥에서 처리하게 합니다.
# ----------------------------------------------------------------------------

def fetch_page(this_page):
    """this_page 번째 페이지를 받아서, 파싱한 JSON(dict)을 돌려줍니다."""
    params = {
        "apiKey": API_KEY,
        "svcType": "api",
        "svcCode": "MAJOR",       # 학과 리스트 조회용
        "contentType": "json",
        "gubun": GUBUN,           # 대학교=univ_list (위 설정에서 변경 가능)
        "thisPage": this_page,
        "perPage": PER_PAGE,
    }

    last_error = None
    for attempt in range(1, MAX_RETRY + 1):
        try:
            resp = requests.get(BASE_URL, params=params, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()          # 200이 아니면 예외 발생
            return resp.json()               # JSON 파싱해서 반환
        except Exception as err:
            last_error = err
            # 마지막 시도가 아니면 잠깐 쉬었다가 다시 시도 (점점 더 길게 대기)
            if attempt < MAX_RETRY:
                wait = attempt * 2
                print(f"    ⚠️  {this_page}쪽 요청 실패({attempt}/{MAX_RETRY}): {err}")
                print(f"       {wait}초 후 다시 시도합니다...")
                time.sleep(wait)

    # 여기까지 오면 MAX_RETRY 번 모두 실패한 것
    raise RuntimeError(f"{this_page}쪽을 {MAX_RETRY}번 시도했지만 실패했습니다: {last_error}")


# ----------------------------------------------------------------------------
# 5) 원본 레코드 한 개를 '앱에서 쓰기 좋은 형태'로 변환
#    - 요구하신 4개 항목만 뽑고, 앱의 다른 데이터처럼 camelCase 키 + 안정적 id 부여
#      majorSeq  → majorSeq (그대로, 고유 id로 사용)
#      lClass    → field    (계열)
#      mClass    → category (학과/중분류)
#      facilName → name     (세부학과명, 화면 표시용)
# ----------------------------------------------------------------------------

def to_app_record(raw):
    def clean(value):
        # None이면 빈 문자열로, 문자열이면 앞뒤 공백 제거
        return (value or "").strip() if isinstance(value, str) else (value or "")

    major_seq = str(clean(raw.get("majorSeq")))
    return {
        # 앱의 다른 id들(CR-..., CG-...)과 통일감을 주기 위해 접두사를 붙인 id
        "majorId": f"MJ-{major_seq}" if major_seq else "",
        "majorSeq": major_seq,
        "field": clean(raw.get("lClass")),      # 계열
        "category": clean(raw.get("mClass")),   # 학과(중분류)
        "name": clean(raw.get("facilName")),    # 세부학과명 (화면 표시용)
    }


# ----------------------------------------------------------------------------
# 6) 저장 함수들
#    - 앱용 JSON은 '깔끔한 객체 배열'로 저장 (universityMajors.json)
#    - 중간에 죽더라도 데이터가 남도록, 이 함수를 finally에서도 호출합니다.
# ----------------------------------------------------------------------------

def save_all(app_records, raw_records):
    """지금까지 모은 데이터를 앱용 JSON + 백업 JSON + CSV로 저장합니다."""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # (1) 중복 제거: 같은 majorSeq가 두 번 들어오면 하나만 남깁니다.
    seen = set()
    deduped = []
    for rec in app_records:
        key = rec.get("majorSeq")
        if key and key in seen:
            continue
        seen.add(key)
        deduped.append(rec)

    # (2) 보기 좋게 정렬: 계열 → 학과 → 학과명 순
    deduped.sort(key=lambda r: (r["field"], r["category"], r["name"]))

    # (3) 앱이 그대로 import하는 핵심 결과물 (객체 배열 JSON)
    with open(APP_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(deduped, f, ensure_ascii=False, indent=2)

    # (4) 원본 백업 (혹시 나중에 다른 항목이 더 필요할 때 대비)
    with open(RAW_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(raw_records, f, ensure_ascii=False, indent=2)

    # (5) 사람이 엑셀에서 열어보기 좋은 CSV (엑셀에서 한글이 깨지지 않도록 utf-8-sig)
    with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["majorId", "majorSeq", "계열(field)", "학과(category)", "세부학과명(name)"])
        for rec in deduped:
            writer.writerow([rec["majorId"], rec["majorSeq"], rec["field"], rec["category"], rec["name"]])

    return len(deduped)


# ----------------------------------------------------------------------------
# 6-2) 2단계: 대학교별 학과 수집 (학과 상세 API)
# ----------------------------------------------------------------------------

def fetch_major_view(major_seq):
    """학과 하나(major_seq)의 상세 응답(개설 대학 목록 포함)을 받아옵니다. 재시도 포함."""
    params = {
        "apiKey": API_KEY,
        "svcType": "api",
        "svcCode": MAJOR_VIEW_SVCCODE,
        "contentType": "json",
        "gubun": GUBUN,
        "majorSeq": major_seq,
    }
    last_error = None
    for attempt in range(1, MAX_RETRY + 1):
        try:
            resp = requests.get(BASE_URL, params=params, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            return resp.json()
        except Exception as err:
            last_error = err
            if attempt < MAX_RETRY:
                wait = attempt * 2
                print(f"    ⚠️  학과 {major_seq} 상세 실패({attempt}/{MAX_RETRY}): {err} → {wait}초 후 재시도")
                time.sleep(wait)
    raise RuntimeError(f"학과 {major_seq} 상세를 {MAX_RETRY}번 시도했지만 실패: {last_error}")


def _looks_like_univ_item(d):
    """이 딕셔너리가 '대학교 항목'처럼 보이는지(학교/대학/캠퍼스 관련 키가 있는지) 판단."""
    if not isinstance(d, dict):
        return False
    for k in d.keys():
        kl = str(k).lower()
        if any(h in kl for h in ("school", "univ", "campus")):
            return True
        if any(h in str(k) for h in ("학교", "대학")):
            return True
    return False


def find_university_list(data):
    """상세 응답 어딘가에 있는 '개설 대학 목록(dict들의 리스트)'을 유연하게 찾아냅니다."""
    best = None

    def walk(node):
        nonlocal best
        if isinstance(node, list):
            if node and any(_looks_like_univ_item(x) for x in node):
                if best is None or len(node) > len(best):
                    best = node
            for item in node:
                walk(item)
        elif isinstance(node, dict):
            for value in node.values():
                walk(value)

    walk(data)
    return best or []


def _pick(d, keys):
    """딕셔너리에서 후보 키들 중 처음으로 값이 있는 것을 골라 문자열로 돌려줍니다(대소문자 무시)."""
    for k in keys:
        if k in d and str(d[k]).strip():
            return str(d[k]).strip()
    lower = {str(k).lower(): v for k, v in d.items()}
    for k in keys:
        v = lower.get(k.lower())
        if v is not None and str(v).strip():
            return str(v).strip()
    return ""


# 상세 응답의 대학 항목에서 값을 뽑을 때 시도할 키 후보들 (커리어넷 표기가 조금씩 달라도 잡히도록)
_SCHOOL_KEYS = ["schoolName", "school", "univName", "universityName", "uNvNm", "schoolNm", "fac_name", "학교명"]
_DEPT_KEYS = ["major", "majorName", "department", "deptName", "facilName", "mClass", "학과명"]
_REGION_KEYS = ["region", "area", "adres", "addr", "지역"]
_CAMPUS_KEYS = ["campusName", "campus", "캠퍼스"]


def to_dept_records(major_seq, field, category, univ_list):
    """한 학과의 대학 목록 → 앱용 (대학교, 학과) 레코드들로 변환."""
    records = []
    for i, u in enumerate(univ_list):
        if not isinstance(u, dict):
            continue
        school = _pick(u, _SCHOOL_KEYS)
        if not school:
            continue  # 대학교 이름이 없으면 건너뜀
        department = _pick(u, _DEPT_KEYS) or category  # 학교별 학과명이 없으면 카테고리명 사용
        records.append({
            "deptId": f"UD-{major_seq}-{i}",
            "majorSeq": major_seq,
            "field": field,          # 계열
            "category": category,    # 학과 카테고리(mClass)
            "university": school,    # 대학교 이름
            "campus": _pick(u, _CAMPUS_KEYS),
            "region": _pick(u, _REGION_KEYS),
            "department": department,  # 그 대학교에서의 학과명
        })
    return records


def save_departments(dept_records):
    """대학교별 학과 데이터를 앱용 JSON + CSV로 저장합니다. (중복 제거 + 정렬)"""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    seen = set()
    deduped = []
    for r in dept_records:
        key = (r.get("university"), r.get("department"), r.get("majorSeq"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(r)

    deduped.sort(key=lambda r: (r["field"], r["category"], r["university"], r["department"]))

    with open(DEPT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(deduped, f, ensure_ascii=False, indent=2)

    with open(DEPT_CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["deptId", "majorSeq", "계열", "학과카테고리", "대학교", "캠퍼스", "지역", "학과명"])
        for r in deduped:
            writer.writerow([r["deptId"], r["majorSeq"], r["field"], r["category"],
                             r["university"], r["campus"], r["region"], r["department"]])

    return len(deduped)


def collect_universities(raw_records):
    """1단계에서 모은 학과들 각각에 대해 상세 API로 '개설 대학'을 수집합니다.
       - 중간에 멈춰도 지금까지 모은 데이터는 저장됩니다(finally).
       - 다시 실행하면 이미 끝난 학과는 건너뛰고 이어서 진행합니다(resume)."""
    # 1단계 결과에서 (majorSeq, 계열, 카테고리) 목록 만들기
    majors, seen = [], set()
    for r in raw_records:
        seq = str(r.get("majorSeq") or "").strip()
        if not seq or seq in seen:
            continue
        seen.add(seq)
        majors.append((seq, (r.get("lClass") or "").strip(), (r.get("mClass") or "").strip()))

    if LIMIT_MAJORS and LIMIT_MAJORS > 0:
        majors = majors[:LIMIT_MAJORS]
        print(f"⚠️  테스트 모드: 앞 {LIMIT_MAJORS}개 학과만 상세 수집합니다 (LIMIT_MAJORS=0으로 바꾸면 전체).")

    # 이어받기: 기존 결과가 있으면 불러와서 이미 끝난 학과는 건너뜀
    dept_records, done = [], set()
    if os.path.exists(DEPT_JSON_PATH):
        try:
            with open(DEPT_JSON_PATH, encoding="utf-8") as f:
                existing = json.load(f)
            if isinstance(existing, list):
                dept_records = existing
                done = {str(r.get("majorSeq")) for r in existing}
        except Exception:
            pass

    todo = [m for m in majors if m[0] not in done]
    print(f"대상 학과 {len(majors)}개 중 {len(todo)}개를 상세 수집합니다. (이미 완료 {len(majors) - len(todo)}개)")

    sample_dumped = os.path.exists(DEPT_RAW_SAMPLE_PATH)

    try:
        for idx, (seq, field, category) in enumerate(todo, 1):
            data = fetch_major_view(seq)

            # 맨 처음 상세 응답 1건은 원본 그대로 저장 (구조 확인용)
            if not sample_dumped:
                with open(DEPT_RAW_SAMPLE_PATH, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                sample_dumped = True
                print(f"    📝 첫 상세 응답 원본을 저장했어요: {DEPT_RAW_SAMPLE_PATH}")

            univ_list = find_university_list(data)
            recs = to_dept_records(seq, field, category, univ_list)
            dept_records.extend(recs)
            print(f"[{idx}/{len(todo)}] {category or seq} → 대학 {len(recs)}곳 (누적 {len(dept_records)})")

            # 25개마다 중간 저장 (중간에 죽어도 손실 최소화)
            if idx % 25 == 0:
                save_departments(dept_records)

            time.sleep(random.uniform(MIN_SLEEP, MAX_SLEEP))

    except KeyboardInterrupt:
        print("\n⏹️  사용자가 중단했습니다. 지금까지 모은 대학교별 학과를 저장합니다.")
    except Exception as err:
        print(f"\n❌ 상세 수집 중 오류로 멈춥니다: {err}")
        print("   지금까지 모은 데이터는 아래에서 저장합니다.")
    finally:
        if dept_records:
            n = save_departments(dept_records)
            print("-" * 60)
            print(f"✅ 대학교별 학과 저장 완료! (중복 제거 후 {n}건)")
            print(f"   • 앱용 JSON : {DEPT_JSON_PATH}")
            print(f"   • CSV 백업  : {DEPT_CSV_PATH}")
            print("-" * 60)
        else:
            print("⚠️  대학교별 학과가 하나도 수집되지 않았어요.")
            print(f"   → {DEPT_RAW_SAMPLE_PATH} 파일(첫 상세 응답 원본)을 열어 구조를 확인해 주세요.")
            print("     그 내용을 알려주시면 추출 방식을 맞춰 드릴게요.")


# ----------------------------------------------------------------------------
# 7) 메인 실행부
#    - try : 페이지를 돌면서 수집
#    - except : 치명적 오류가 나도 프로그램이 조용히 죽지 않고 메시지를 보여줌
#    - finally : 어떤 경우에도 '그때까지 모은 데이터'를 무조건 저장
# ----------------------------------------------------------------------------

def main():
    if not API_KEY:
        print(f"❌ 환경 변수 '{API_KEY_ENV_NAME}' 가 비어 있습니다.")
        print("   먼저 아래처럼 인증키를 환경 변수로 등록한 뒤 다시 실행해 주세요.")
        print(f'   · 윈도우 PowerShell:  $env:{API_KEY_ENV_NAME} = "본인_인증키"')
        print(f'   · macOS / Linux    :  export {API_KEY_ENV_NAME}="본인_인증키"')
        return

    print("=" * 60)
    print("커리어넷 대학교 학과 리스트 수집을 시작합니다.")
    print(f"한 페이지당 {PER_PAGE}개씩, 요청 사이 {MIN_SLEEP}~{MAX_SLEEP}초 대기")
    print("=" * 60)

    app_records = []   # 앱용으로 변환한 레코드
    raw_records = []   # 원본 레코드(백업용)
    total_count = None
    this_page = 1

    try:
        while this_page <= MAX_PAGE_LIMIT:
            print(f"[{this_page}쪽] 요청 중...")
            data = fetch_page(this_page)

            # 전체 개수는 첫 페이지에서 한 번만 확인
            if total_count is None:
                total_count = find_total_count(data)
                if total_count:
                    print(f"    → 전체 학과 수: 약 {total_count}개")

            records = find_record_list(data)

            # 더 이상 받아올 게 없으면(빈 페이지) 종료
            if not records:
                print("    → 더 받아올 데이터가 없습니다. 수집을 마칩니다.")
                break

            # 원본 저장 + 앱용으로 변환
            raw_records.extend(records)
            for raw in records:
                app_records.append(to_app_record(raw))

            print(f"    → {len(records)}개 수집 (누적 {len(app_records)}개)")

            # 전체 개수를 알고, 이미 다 모았으면 종료
            if total_count and len(raw_records) >= total_count:
                print("    → 전체 학과를 모두 수집했습니다.")
                break

            # 다음 페이지로 넘어가기 전, 서버 부하 방지를 위해 랜덤 대기
            wait = random.uniform(MIN_SLEEP, MAX_SLEEP)
            print(f"    → 서버 배려를 위해 {wait:.1f}초 대기...")
            time.sleep(wait)

            this_page += 1

    except KeyboardInterrupt:
        # 사용자가 Ctrl+C로 직접 멈춘 경우
        print("\n⏹️  사용자가 중단했습니다. 지금까지 모은 데이터를 저장합니다.")
    except Exception as err:
        # 그 외 예상치 못한 치명적 오류
        print(f"\n❌ 오류가 발생해 수집을 멈춥니다: {err}")
        print("   하지만 지금까지 모은 데이터는 아래에서 안전하게 저장합니다.")
    finally:
        # ★ 성공/실패/중단 무엇이든 여기 finally는 반드시 실행됩니다 ★
        if app_records:
            saved = save_all(app_records, raw_records)
            print("-" * 60)
            print(f"✅ 저장 완료! (중복 제거 후 {saved}개)")
            print(f"   • 앱용 JSON : {APP_JSON_PATH}")
            print(f"   • 원본 백업 : {RAW_JSON_PATH}")
            print(f"   • CSV 백업  : {CSV_PATH}")
            print("-" * 60)
        else:
            print("⚠️  수집된 데이터가 없어 저장할 내용이 없습니다.")
            print("   인증키가 올바른지, 인터넷 연결이 되는지 확인해 주세요.")

    # ── 2단계: 대학교별 학과 수집 ──
    if COLLECT_UNIVERSITIES and raw_records:
        print("\n" + "=" * 60)
        print("2단계: 학과별 '개설 대학' 상세 수집을 시작합니다.")
        print(f"요청 사이 {MIN_SLEEP}~{MAX_SLEEP}초 대기 · 오류 시 최대 {MAX_RETRY}번 재시도")
        print("=" * 60)
        collect_universities(raw_records)


if __name__ == "__main__":
    main()
