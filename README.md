# aireels

해외 미제·범죄사건을 애니메이션과 TTS로 만드는 세로형(9:16) 숏폼 제작 엔진입니다.
그림은 모두 코드(Canvas)로 그리고, 배경음악과 효과음은 직접 합성합니다. 외부 이미지나 음원을 쓰지 않아 저작권 걱정이 없습니다.

## 구조

```
engine/
  lib.js        캔버스 그리기 기본 도구 (카메라, 그레인, 비, 도장, 문서, 경로 그리기, 자막, 전환 효과)
  figures.js    포즈를 바꿀 수 있는 누아르 실루엣 인물
  player.js     장면 합성기 (전환 구간에서는 두 장면을 버퍼에 그려 합성)
  render.cjs    Playwright로 프레임을 렌더링해 ffmpeg로 인코딩 (병렬 워커, 스틸, 커버 모드)
  build.py      TTS → 타임라인/자막 → 오디오 → 렌더 → 최종 mp4
  audio.py      배경음악 베드, 효과음 합성, 덕킹, -14 LUFS 마스터링
  asr_check.py  Whisper로 TTS를 다시 받아써서 숫자·이름을 잘못 읽었는지 확인
projects/<name>/
  script.json   내레이션(say: 자막용 / tts: 읽기용), 하이라이트, 전환, 효과음 큐, 음악 자동화
  scenes.js     장면별 그림 함수 (scene id와 같은 이름)
  research.json 사건 조사·팩트체크 기록
  UPLOAD.md     업로드용 제목·캡션·출처
```

## 사용법

```bash
scripts/fetch_fonts.sh                 # 폰트(OFL) 내려받기, 처음 한 번
pip install edge-tts scipy soundfile   # faster-whisper는 asr_check용(선택)

python3 engine/build.py projects/klimt tts        # 장면별 TTS + 단어 타이밍 → build/timeline.json
python3 engine/build.py projects/klimt sheet 16   # 장면 미리보기 시트
python3 engine/build.py projects/klimt all        # TTS → 오디오 → 렌더 → out/<name>.mp4
node engine/render.cjs projects/klimt --stills 3.25 --cover   # 커버 이미지
python3 engine/asr_check.py projects/klimt medium             # 발음 검수
```

## script.json 요점

- `say`는 자막에 보이는 문장이고, `tts`는 읽기용 문장입니다(숫자는 한글로 풀어 씀). 둘은 띄어쓰기 단어 수가 같아야 자막 싱크가 정확합니다.
- 효과음 큐는 `{"type": "stamp", "word": "진품", "off": 0.08}`처럼 단어에 맞춰 넣습니다.
- 음악 자동화 키프레임은 `"@scene"`, `"@scene+0.5"`, `"@scene:단어-0.1"`, `"@scene:end"` 형식으로 시점을 지정합니다.
- 문장 중간의 마침표는 TTS에서 약 0.6초 쉼이 생깁니다. 길이를 줄여야 하면 쉼표를 쓰세요.

## 프로젝트

| 프로젝트 | 길이 | 내용 |
|---|---|---|
| `projects/klimt` | 30초 | 클림트 「여인의 초상」 도난 사건, 핵심 요약판 |
| `projects/klimt_long` | 약 70초 | 같은 사건의 전체 경위판 (1996년 발견부터 2021년 종결까지) |
