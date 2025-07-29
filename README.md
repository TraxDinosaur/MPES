# 🎬 Media Player Embed System

A lightweight, secure, and stylish media player that drops right into your site with a single `<script>` tag. Designed with a Material You aesthetic and built to run seamlessly on modern browsers — mobile and desktop alike.

Built for developers, content creators, and educators who want **great UX**, **easy integration**, and **touch-friendly controls** out of the box.

---

## 🚀 Features

### 🎮 Intuitive Controls

* Double-tap to seek (left/right)
* Hold to toggle 2x speed
* Swipe up/down for volume & brightness
* Keyboard shortcuts and spacebar to play/pause

### 💎 Material You Inspired

* Gorgeous glassmorphism UI
* Fully responsive and touch-optimized
* Dynamic theme support with live color switching

### ⚡ Easy to Use

* Embed with just one script tag
* No external dependencies
* Supports multiple players per page
* Customizable with theme color attributes

---

## 🛠️ Quick Start

### 📥 Embed the Player

Add this wherever you want your player to show up:

```html
<script src="https://mpestrax.vercel.app/player.js" data-src="https://example.com/video.mp4"></script>
```

That’s it. The player handles the rest.

---

## 🎨 Theming

You can customize the appearance using data attributes:

```html
<script src="https://mpestrax.vercel.app/player.js"
  data-src="https://example.com/video.mp4"
  data-primary="#ff6b6b"
  data-accent="#4ecdc4"
  data-surface="rgba(255, 255, 255, 0.2)"
  data-text="#ffffff"
  data-outline="rgba(255, 255, 255, 0.3)">
</script>
```

### Available Attributes

* `data-primary` — Main accent (buttons, bars)
* `data-accent` — Secondary color for gradients
* `data-surface` — Background surface tint
* `data-text` — Foreground/text color
* `data-outline` — Border/outline tint

---

## 📦 Multiple Players

Want more than one on a page? No problem:

```html
<script src="https://mpestrax.vercel.app/player.js" data-src="video1.mp4" data-primary="#e74c3c"></script>
<script src="https://mpestrax.vercel.app/player.js" data-src="video2.mp4" data-primary="#3498db"></script>
```

---

## 📚 Controls Overview

### Mouse & Keyboard

* Click to play/pause
* Spacebar to toggle playback
* F for fullscreen
* Arrow keys for volume/seek

### Touch Gestures

* Double tap left/right to seek ±10s
* Hold to toggle fast-forward
* Swipe sides to adjust volume/brightness

---

## 📄 License

Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)
