# Venue

A minimal macOS menubar app for monitoring Vercel deployments.

▲ Green = Ready · Yellow = Building · Red = Failed

![venue-demo](https://github.com/user-attachments/assets/e9f44f6d-e4ae-455e-a81b-c74f63d3ec87)

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
