// 학과 데이터를 지연 로딩해서 컴포넌트에 넘겨주는 훅.
// 최초 호출 시 큰 JSON을 동적 import 하고, 로딩이 끝나면 data가 채워진다.

import { useEffect, useState } from 'react';
import { loadMajorData, getMajorDataSync, type MajorData } from './majorData';

export function useMajorData(): { data: MajorData | null; loading: boolean } {
  const [data, setData] = useState<MajorData | null>(() => getMajorDataSync());

  useEffect(() => {
    if (data) return; // 이미 로딩됨
    let alive = true;
    loadMajorData().then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [data]);

  return { data, loading: data === null };
}
