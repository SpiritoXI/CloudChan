# CrustShare

<div align="center">

**Decentralized File Storage and Sharing Platform based on Crust Network**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Crust Network](https://img.shields.io/badge/Crust-Network-orange)](https://crust.network/)
[![GitHub stars](https://img.shields.io/github/stars/SpiritoXI/CrustShare?style=social)](https://github.com/SpiritoXI/CrustShare/stargazers)

English | [简体中文](./README.md)

</div>

---

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Introduction

CrustShare is an open-source decentralized file storage and sharing platform that leverages [Crust Network](https://crust.network/) and [IPFS](https://ipfs.tech/) technologies to provide users with a **free, permanent, and secure** file storage solution.

### Why CrustShare?

| Feature | Description |
|---------|-------------|
| 🆓 **Free Permanent Storage** | Based on crustfiles.io developer service, no payment required |
| 🔒 **Decentralized Storage** | Files distributed on Crust Network, permanently stored |
| 🌐 **Smart Gateway** | Automatically tests multiple IPFS gateways and selects the optimal node |
| 🔐 **Password Protection** | Share links can be password protected |
| 📁 **Folder Management** | Create folders to organize files |
| 📦 **Batch Operations** | Batch move, copy, delete files |
| 🎬 **Multimedia Support** | Image preview, video/audio online playback |
| 📱 **Responsive Design** | Perfectly adapted for desktop, tablet, and mobile |
| ⚡ **Performance Optimized** | React Context + lazy loading + useMemo optimization |
| 🚀 **Smart Download** | Multi-gateway auto-switching, resume support |

---

## Features

| Feature | Description |
|---------|-------------|
| File Management Dashboard | File list, upload, batch operations, folder management |
| File Sharing Page | File preview, download, password protection |
| Gateway Management | Gateway testing, health scoring, automatic optimal selection |
| Media Playback | Image preview, video playback, audio playback |

---

## Quick Start

### Requirements

- Node.js 18.0 or higher
- pnpm (recommended) or npm

### Installation

```bash
# Clone repository
git clone https://github.com/SpiritoXI/CrustShare.git
cd CrustShare

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local and fill in required configuration

# Start development server
pnpm dev
```

The application will start at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Crust Access Token (Required)
# Get Developer Profile Access Token from https://crustfiles.io
CRUST_ACCESS_TOKEN=your_access_token_here

# Redis Configuration (Optional, for data persistence)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### Getting Access Token

1. Visit [crustfiles.io](https://crustfiles.io)
2. Connect wallet (MetaMask, Coinbase Wallet, etc.)
3. Create Developer Profile
4. Copy Access Token

> ⚠️ **Security Warning**: Access Token contains your private key. Keep it secure and never commit it to public repositories!

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| [Next.js](https://nextjs.org/) | 14 | React full-stack framework |
| [React](https://react.dev/) | 18 | UI component library |
| [TypeScript](https://www.typescriptlang.org/) | 5 | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | 3 | Atomic CSS |
| [shadcn/ui](https://ui.shadcn.com/) | - | UI component library |
| [Zustand](https://github.com/pmndrs/zustand) | 4 | State management |
| [Framer Motion](https://www.framer.com/motion/) | 10 | Animation effects |
| [TanStack Query](https://tanstack.com/query) | 5 | Data fetching management |

### Backend Services

| Service | Purpose |
|---------|---------|
| [Crust Network](https://crust.network/) | Decentralized file storage |
| [IPFS](https://ipfs.tech/) | Distributed file system |
| [Upstash Redis](https://upstash.com/) | Data persistence (optional) |

---

## Directory Structure

```
crustshare/
├── app/                      # Next.js App Router
│   ├── dashboard/           # File management dashboard
│   ├── share/               # File sharing page
│   ├── styles/              # Global styles
│   └── providers.tsx        # Global providers
├── components/              # React components
│   ├── ui/                  # shadcn/ui base components
│   ├── dashboard/           # Dashboard components
│   ├── media/               # Media player module
│   ├── modals/              # Modal components
│   └── share/               # Share page components
├── contexts/                # React Context
├── functions/               # Cloudflare Functions
├── hooks/                   # Custom hooks
├── lib/                     # Core library
│   ├── api/                 # API modules
│   │   ├── index.ts         # Unified export
│   │   ├── base.ts          # Base API
│   │   ├── download.ts      # Download API
│   │   ├── file.ts          # File API
│   │   ├── gateway.ts       # Gateway API
│   │   ├── propagation.ts   # Propagation API
│   │   ├── share.ts         # Share API
│   │   └── upload.ts        # Upload API
│   ├── db/                  # Database module
│   │   ├── index.ts         # Unified export
│   │   └── upstash.ts       # Upstash Redis
│   ├── utils/               # Utility functions
│   │   ├── index.ts         # Unified export
│   │   ├── format.ts        # Formatting tools
│   │   ├── security.ts      # Security tools
│   │   └── error.ts         # Error handling
│   ├── api.ts               # API entry point
│   ├── config.ts            # Configuration
│   ├── store.ts             # Zustand Store
│   ├── utils.ts             # Utils entry point
│   └── index.ts             # lib entry point
├── types/                   # TypeScript type definitions
├── tests/                   # Test scripts
│   ├── api/                 # API tests
│   └── gateway/             # Gateway tests
├── scripts/                 # Script tools
│   └── build/               # Build scripts
├── public/                  # Static assets
└── docs/                    # Documentation
```

---

## Deployment

### Cloudflare Pages (Recommended)

```bash
# Build project
pnpm build

# Deploy to Cloudflare Pages
wrangler pages deploy .next --project-name=crustshare
```

See [DEPLOY.md](./DEPLOY.md) for detailed instructions.

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SpiritoXI/CrustShare)

### Docker

```bash
# Build image
docker build -t crustshare .

# Run container
docker run -p 3000:3000 -e CRUST_ACCESS_TOKEN=your_token crustshare
```

---

## API Documentation

See [API.md](./API.md) for detailed API documentation.

### Core API Overview

| API | Description |
|-----|-------------|
| `uploadApi.uploadToCrust(file)` | Upload file to Crust Network |
| `fileApi.loadFiles()` | Load file list |
| `gatewayApi.testAllGateways()` | Test all gateways |
| `shareApi.createShare(cid, options)` | Create share link |
| `downloadApi.downloadWithAutoSwitch()` | Download with auto gateway switching |
| `propagationApi.smartPropagate()` | Smart file propagation |

---

## FAQ

<details>
<summary><b>Is file storage free?</b></summary>

Yes! crustfiles.io provides **free permanent storage** for Developer Profiles, no CRU tokens required.
</details>

<details>
<summary><b>Will files be permanently stored?</b></summary>

Yes, files are permanently stored on the Crust Network. crustfiles.io backend automatically handles file storage and renewal.
</details>

<details>
<summary><b>What if Access Token is leaked?</b></summary>

If Access Token is leaked, immediately regenerate a new token at crustfiles.io. Since the token contains your private key, leakage may allow others to access your files.
</details>

<details>
<summary><b>What file types are supported?</b></summary>

All file types are supported. For common formats (images, videos, audio, PDF, text), online preview is provided.
</details>

<details>
<summary><b>Is there a file size limit?</b></summary>

Maximum 1GB file upload is supported by default. For larger files, you can modify the configuration.
</details>

<details>
<summary><b>How to select the optimal gateway?</b></summary>

The system automatically tests multiple IPFS gateways for latency and availability, intelligently selecting the optimal node. You can also manually select a gateway in settings.
</details>

---

## Contributing

Issues and Pull Requests are welcome!

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

### Development Commands

```bash
# Start development server
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build
```

---

## License

This project is licensed under the [MIT](../LICENSE) License.

---

## Acknowledgments

- [Crust Network](https://crust.network/) - Decentralized storage network
- [IPFS](https://ipfs.tech/) - Distributed file system
- [crustfiles.io](https://crustfiles.io) - Free permanent storage service
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI component library

---

<div align="center">

**⭐ If this project helps you, please give it a Star! ⭐**

[Report Issue](https://github.com/SpiritoXI/CrustShare/issues) · [Feature Request](https://github.com/SpiritoXI/CrustShare/issues) · [Contribute](https://github.com/SpiritoXI/CrustShare/pulls)

</div>
