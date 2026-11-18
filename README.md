# My FACE for Mac

My FACE macOS 앱의 다운로드 웹사이트입니다. GitHub Pages는 `dist/`의 정적
파일을 제공하고, 설치 ZIP은 GitHub Releases에 첨부합니다.

## 미리 보기

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist
```

브라우저에서 `http://127.0.0.1:8765/`를 엽니다. 잠금 화면은 카메라 없는
시뮬레이션입니다. 첫 화면은 확인 중 링을 잠깐 유지하고, 모션 체험의 재생
막대는 앱 모션의 2초 타임라인을 그대로 표시합니다.

## 설치 파일 연결

1. Apple 공증과 Gatekeeper 검증을 마친 ZIP과 SHA-256 파일을 GitHub Release에 첨부합니다.
2. `dist/release.json`의 `version`, `build`, `downloadUrl`, `sha256`을
   해당 공개 릴리스 정보로 바꿉니다. `downloadUrl`에는 GitHub의 실제 ZIP URL을 넣습니다.
3. `main`에 변경을 반영하면 Pages에서 다운로드 버튼과 체크섬이 업데이트됩니다.

`downloadUrl`이 비어 있으면 사이트는 배포 준비 상태와 Releases 페이지를
안내합니다. `dist/credits.html`에서 모션의 출처와 라이선스를 볼 수 있습니다.
