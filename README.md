# Venue

A minimal macOS menubar app for monitoring Vercel deployment status.

## Features

- **Menubar status indicator** - Triangle icon shows deployment status at a glance
  - Green: Deployment successful
  - Yellow: Building/Queued
  - Red: Failed/Error
  - Gray: Idle/No project selected
- **Smart polling** - 5s during active builds, 30s when idle
- **Click to view** - See recent deployments with commit messages and branches
- **Click to open** - Open any deployment directly in Vercel
- **Lightweight** - Single binary, no external dependencies

## Installation

### From Source

Prerequisites:
- [Rust](https://rustup.rs/)
- [Bun](https://bun.sh/)

```bash
git clone https://github.com/user/venue.git
cd venue
bun install
bun tauri dev
```

### Build for Production

```bash
bun tauri build
```

The built app will be in `src-tauri/target/release/bundle/`.

## Setup

1. Click the gray triangle in your menubar
2. Create a [Personal Access Token](https://vercel.com/account/tokens) on Vercel
3. Paste the token and click Connect
4. Select a project to monitor

## Tech Stack

- [Tauri 2](https://tauri.app/) - Rust + WebView desktop framework
- TypeScript - Frontend logic
- Vanilla CSS - Geist Mono font

## License

[MIT](./LICENSE)
