# Healing Mart Mini Game Sound Pack

Healing Mart 미니게임에서 공통으로 사용할 수 있는 효과음 패키지입니다.
GitHub Pages에서 정적 파일로 배포하도록 구성되어 있으며 별도의 Vercel 서버는 필요하지 않습니다.

## 폴더 구성

```text
hm-mini-game-sound-pack/
├── README.md
├── docs/
│   ├── .nojekyll
│   ├── index.html
│   ├── js/
│   │   └── hm-audio-manager.v1.js
│   └── sfx/core/v1/
│       ├── sounds.json
│       └── *.mp3
└── source-wav/
    └── *.wav
```

- `docs/`: GitHub Pages로 실제 배포되는 파일
- `docs/sfx/core/v1/*.mp3`: 게임에서 재생할 웹용 효과음
- `docs/sfx/core/v1/sounds.json`: 효과음 파일명과 용도를 정리한 매니페스트
- `docs/js/hm-audio-manager.v1.js`: 공통 사운드 재생 관리자
- `source-wav/`: 편집 및 보관용 WAV 원본이며 GitHub Pages에는 배포되지 않음

WAV 파일을 JSON 안에 넣지 않습니다. WAV와 MP3는 실제 음원이고, JSON은 음원 목록과 설명을 관리하는 파일입니다.

## GitHub에 업로드하기

1. GitHub에서 공개 저장소 `hm-mini-game-sound-pack`을 만듭니다.
2. 이 패키지의 압축을 풉니다.
3. 압축을 푼 폴더 안의 `docs`, `source-wav`, `README.md`를 저장소 첫 화면에 모두 끌어 넣습니다.
4. 아래의 `Commit changes`를 누릅니다.

저장소 첫 화면은 다음처럼 보여야 합니다.

```text
docs/
source-wav/
README.md
```

`hm-mini-game-sound-pack`이라는 폴더가 한 번 더 들어가지 않도록 주의합니다.

## GitHub Pages 켜기

저장소에서 다음 순서로 설정합니다.

```text
Settings
→ Pages
→ Source: Deploy from a branch
→ Branch: main
→ Folder: /docs
→ Save
```

배포 주소 형식:

```text
https://GITHUB_ID.github.io/hm-mini-game-sound-pack/
```

미리듣기 페이지:

```text
https://GITHUB_ID.github.io/hm-mini-game-sound-pack/
```

공통 JavaScript 주소:

```text
https://GITHUB_ID.github.io/hm-mini-game-sound-pack/js/hm-audio-manager.v1.js
```

사운드 폴더 주소:

```text
https://GITHUB_ID.github.io/hm-mini-game-sound-pack/sfx/core/v1/
```

## Blogger 또는 게임 코드에서 사용하기

아래의 `GITHUB_ID`를 실제 GitHub 아이디로 바꿉니다.

```html
<script src="https://GITHUB_ID.github.io/hm-mini-game-sound-pack/js/hm-audio-manager.v1.js"></script>
<script>
  HMAudio.init({
    baseUrl: "https://GITHUB_ID.github.io/hm-mini-game-sound-pack/sfx/core/v1/",
    volume: 0.75
  });

  // 필요한 음원을 미리 준비합니다.
  // 최초 설정은 무음이므로 사용자가 소리를 켠 뒤 실행하는 것을 권장합니다.
  HMAudio.preload([
    "ui-tap",
    "countdown",
    "go",
    "reveal-safe",
    "reveal-danger",
    "brand-finish"
  ]);
</script>
```

소리 버튼 예시:

```html
<button id="soundToggle" type="button">소리 켜기</button>

<script>
  const soundToggle = document.getElementById("soundToggle");

  function updateSoundButton() {
    soundToggle.textContent = HMAudio.isEnabled() ? "소리 끄기" : "소리 켜기";
  }

  soundToggle.addEventListener("click", () => {
    const nextEnabled = !HMAudio.isEnabled();
    HMAudio.setEnabled(nextEnabled);

    if (nextEnabled) {
      HMAudio.unlock();
      HMAudio.play("toggle-on");
    }

    updateSoundButton();
  });

  updateSoundButton();
</script>
```

게임 효과음 재생 예시:

```javascript
HMAudio.play("ui-tap");
HMAudio.play("success");
HMAudio.play("brand-finish", { volume: 0.8 });
```

## 기본 동작

- 처음 방문한 사용자는 사운드가 꺼진 상태로 시작합니다.
- 사용자가 소리를 켜거나 끈 상태는 브라우저의 `localStorage`에 저장됩니다.
- 사운드 파일을 불러오지 못하면 간단한 합성음으로 대체합니다.
- 미리듣기 페이지에서는 사용자가 사운드 버튼을 직접 누르면 소리가 켜지고 재생됩니다.

## 게임별 확장 예시

```text
docs/sfx/games/ladder/v1/
docs/sfx/games/choseong/v1/
docs/sfx/games/sudoku/v1/
```

## 버전 관리

- 기존 `v1` 파일은 가능하면 덮어쓰지 않습니다.
- 효과음을 크게 변경하면 `core/v2` 폴더를 만듭니다.
- 게임 전용 효과음은 게임별 폴더로 분리합니다.
- 새 버전을 만들 때 JavaScript 파일명도 `v2`처럼 구분하는 것이 안전합니다.

## 저작권

이 패키지 음원은 수학적 파형과 노이즈 합성으로 새로 생성한 Healing Mart용 원본 초안입니다.
외부 효과음 파일은 포함하지 않았습니다.
