# Magic Wheel Auth & Subscription Demo

This repository contains a minimal demonstration of authentication and subscription modules.

## Modules

- **auth/**: Google and Apple sign-in stubs with an `AuthRepository` exposing a `signIn(provider)` method.
- **server/**: In-memory `UserRepository`, subscription validation endpoint, and renewal checker.
- **subscription/**: `SubscriptionService` with `purchaseSubscription` and `restorePurchases`.
- **ui/**: Placeholder `LoginScreen` and `SubscriptionScreen` functions.

A basic test validates the authentication flow:

```sh
npm test
```

## Encoding videos for TikTok

The project now includes a small helper, `encodeTikTok.js`, which uses
`ffmpeg` to re‑encode a source video with settings tuned for TikTok,
Instagram Reels and YouTube Shorts:

- MP4 container with moov atom at the start (`+faststart`)
- H.264 video (High profile level 4.1)
- Regenerates timestamps and enforces constant 30 fps (CFR) using
  `-fflags +genpts`, `-r 30` on input and output, and `-vsync cfr`; GOP
  size 60
- Scales and pads to 1080×1920 (vertical) while preserving aspect ratio
  and removes rotation metadata
- Pixel format `yuv420p` and BT.709 colors
- Target video bitrate ~8 Mb/s
- AAC audio at 44.1 kHz stereo, 192 kb/s; inserts a silent track if the
  source has no audio

This can help when a video plays locally but fails to upload correctly.

Usage:

```sh
node encodeTikTok.js input.mp4 output.mp4
```

Ensure that `ffmpeg` is installed and available in your system's PATH.
