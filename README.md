# Venue

A minimal macOS menubar app for monitoring Vercel deployments.

▲ Green = Ready · Yellow = Building · Red = Failed

![venue-demo](https://github.com/user-attachments/assets/87c96a22-9cac-4e5e-8420-395fc31c6fee)

## Install

Requires [Rust](https://rustup.rs/) and [Bun](https://bun.sh/).

```bash
git clone https://github.com/bayking/venue.git
cd venue
bun install
bun tauri build
```

App will be in `src-tauri/target/release/bundle/macos/`.

## Usage

1. Click the triangle in your menubar
2. Paste a [Vercel Personal Access Token](https://vercel.com/account/tokens)
3. Select a project

## License

MIT
