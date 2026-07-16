# Healing Mart Mini Game Sound Pack

Healing Mart 미니게임에서 공통으로 사용하는 **단일 통합 효과음 팩**입니다.
기존 게임 URL을 바꾸지 않도록 모든 음원을 `docs/sfx/core/v1/` 한 곳에 합쳤습니다.

## 구성

- 통합 효과음: **88개**
- 웹 배포용 MP3: 44.1kHz 모노
- 편집·교체용 WAV 원본 포함
- 관리자: `docs/js/hm-audio-manager.v1.js` 하나만 사용
- 활성 사운드 경로: `docs/sfx/core/v1/` 하나만 사용
- 사운드 설정 저장 키: `hm-mini-game-sound-enabled`
- 기본 상태: 사용자가 켜기 전까지 무음
- 기본 전체 음량: 0.75
- 최대 동시 재생 수: 24

## 폴더 구조

```text
hm-mini-game-sound-pack/
├── README.md
├── CHANGELOG.md
├── SOUND-ID-GUIDE.md
├── docs/
│   ├── .nojekyll
│   ├── index.html
│   ├── js/
│   │   └── hm-audio-manager.v1.js
│   └── sfx/core/v1/
│       ├── sounds.json
│       └── 88개 MP3
└── source-wav/
    └── 88개 WAV
```

## GitHub 업로드

1. 기존 `hm-mini-game-sound-pack` 저장소의 파일을 새 압축 내용으로 교체합니다.
2. 저장소 최상단에 `docs`, `source-wav`, `README.md` 등이 바로 보여야 합니다.
3. GitHub Pages는 `main → /docs` 설정을 그대로 유지합니다.
4. 예전에 만들었던 `docs/sfx/core/v2`와 `hm-audio-manager.v2.js`가 있다면 삭제합니다.

## 게임 연결 코드

```html
<script src="https://healingmart.github.io/hm-mini-game-sound-pack/js/hm-audio-manager.v1.js"></script>
<script>
  HMAudio.init({
    baseUrl: "https://healingmart.github.io/hm-mini-game-sound-pack/sfx/core/v1/",
    volume: 0.75,
    maxVoices: 24
  });
</script>
```

기존 게임에서 이미 위 URL을 사용한다면 코드를 수정할 필요가 없습니다.

## 타이머 사용 예시

```javascript
function playTimerSound(secondsLeft) {
  if (secondsLeft <= 0) {
    HMAudio.play("timer-timeout", { force: true });
  } else if (secondsLeft <= 5) {
    HMAudio.play("timer-urgent");
  } else {
    HMAudio.play("timer-tick");
  }
}
```

## 운영 원칙

게임 코드에는 파일 경로가 아니라 `HMAudio.play("사운드-ID")`만 사용합니다.
나중에 음색을 개선할 때 같은 파일명으로 MP3와 WAV를 교체하면 게임 코드는 그대로 유지됩니다.

이 팩은 UI, 타이머, 퀴즈, 퍼즐, 반응속도, 룰렛, 카드, 블록, 이동, 결과 발표 등 대부분의 공통 이벤트를 처리합니다. 자동차 브레이크, 활 발사처럼 특정 게임에서만 쓰는 효과음은 각 게임 전용 폴더로 별도 추가하는 것이 좋습니다.

## 저작권

수학적 파형과 노이즈 합성으로 제작한 Healing Mart용 원본 초안입니다. 외부 효과음 파일은 포함하지 않았습니다.
