# Healing Mart Mini Game Sound Pack

원래 v1 관리자 구조를 유지하고 사운드 파일과 sounds.json만 확장한 GitHub Pages용 통합본입니다.

## GitHub Pages
- Settings > Pages
- Deploy from a branch
- Branch: main
- Folder: /docs

## 기존 게임 연결 주소
```html
<script src="https://healingmart.github.io/hm-mini-game-sound-pack/js/hm-audio-manager.v1.js"></script>
```

```javascript
HMAudio.init({
  baseUrl: "https://healingmart.github.io/hm-mini-game-sound-pack/sfx/core/v1/",
  volume: 0.75
});
```

## 호환 원칙
- `docs/js/hm-audio-manager.v1.js`는 업로드된 원본과 동일합니다.
- 기존 19개 MP3도 원본과 동일합니다.
- 새 MP3는 동일한 `docs/sfx/core/v1/` 폴더에 추가했습니다.
- `sounds.json`에 새 ID만 추가했습니다.
- `docs/index.html`은 GitHub Pages 프로젝트 경로에 맞게 상대 경로를 사용합니다.
