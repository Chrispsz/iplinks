# Media Server Client

A web-based client for managing multiple server connections with automatic latency detection and load balancing.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔍 **Server Selection** - Automatically measures and selects the fastest server
- 🌐 **Multi-Server Support** - Configure multiple server connections
- 📺 **TV Integration** - Pairing system for TV devices without keyboard input
- 🔗 **External Player Support** - Open streams in external applications
- 📱 **Responsive UI** - Works on desktop and mobile devices

## Installation

```bash
git clone https://github.com/Chrispsz/iplinks.git
cd iplinks
bun install
bun run dev
```

## Usage

### Direct Connection
1. Enter server credentials
2. Click connect
3. Browse and select content

### TV Pairing
1. On TV: Open app and get pairing code
2. On mobile/PC: Enter code and send credentials
3. TV receives configuration automatically

## Tech Stack

| Technology | Version |
|------------|---------|
| Next.js | 16 |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | 4 |

## License

MIT
