# Healing Mart Mini Game Sound Pack

GitHub Pages 배포용 최종 통합본입니다.

## 배포

압축을 푼 뒤 저장소 최상단에 다음 항목을 그대로 업로드합니다.

```text
docs/
source-wav/
README.md
SOUND-ID-GUIDE.md
```

GitHub Pages 설정:

```text
Branch: main
Folder: /docs
```

Vercel은 사용하지 않으므로 `vercel.json`은 필요하지 않습니다.

## 공개 주소

```text
https://healingmart.github.io/hm-mini-game-sound-pack/
https://healingmart.github.io/hm-mini-game-sound-pack/js/hm-audio-manager.v1.js
https://healingmart.github.io/hm-mini-game-sound-pack/sfx/core/v1/sounds.json
```

## 게임 연결

```html
<script src="https://healingmart.github.io/hm-mini-game-sound-pack/js/hm-audio-manager.v1.js?v=1.2.0"></script>
<script>
HMAudio.init({
  baseUrl: "https://healingmart.github.io/hm-mini-game-sound-pack/sfx/core/v1/",
  volume: 0.75
});
</script>
```

재생:

```javascript
HMAudio.unlock();
HMAudio.play("ui-tap");
HMAudio.play("timer-tick");
HMAudio.play("random-reveal");
HMAudio.play("sadari");
```

## 구성

- 관리자: `docs/js/hm-audio-manager.v1.js`
- 매니페스트: `docs/sfx/core/v1/sounds.json`
- MP3: 89개
- WAV 원본: `source-wav/`
- 미리듣기: `docs/index.html`

`docs/index.html`은 실제 게임과 동일하게 HMAudio 관리자와 `sounds.json`을 통해 재생합니다.
