# CrustShare

<div align="center">

**Decentralized File Storage & Sharing Platform based on Crust Network**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Crust Network](https://img.shields.io/badge/Crust-Network-orange)](https://crust.network/)

English | [简体中文](./README.md)

</div>

---

## Overview

CrustShare is an open-source decentralized file storage and sharing platform. Using [Crust Network](https://crust.network/) and [IPFS](https://ipfs.tech/), it provides **free, permanent, and secure** file storage solution.

### Key Features

| Feature | Description |
|---------|-------------|
| 🆓 **Free Permanent Storage** | Based on crustfiles.io developer service, no payment required |
| 🔒 **Decentralized Storage** | Files distributed on Crust Network, permanently stored |
| 🌐 **Smart Gateway** | Auto-test multiple IPFS gateways, select optimal node |
| 🔐 **Password Protection** | Share links can be password protected |
| 📁 **Folder Management** | Create folders to organize files easily |
| 📦 **Batch Operations** | Batch move, copy, delete files |
| 🎬 **Multimedia Support** | Image preview, video/audio online playback |
| 📱 **Responsive Design** | Perfectly adapted for desktop, tablet, and mobile |

## Quick Start

### Requirements

- Node.js 18+
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
# Edit .env.local with your configuration

# Start development server
pnpm dev
```

### Environment Variables

```env
# Crust Access Token (Required)
# Get Developer Profile Access Token from https://crustfiles.io
CRUST_ACCESS_TOKEN=your_access_token_here

# Redis Configuration (Optional, for data persistence)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

## Getting Access Token

1. Visit [crustfiles.io](https://crustfiles.io)
2. Connect wallet (MetaMask, Coinbase Wallet, etc.)
3. Create Developer Profile
4. Copy Access Token

> **Note**: Access Token contains your private key. Keep it secure and never share it!

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| [Next.js](https://nextjs.org/) | 14 | React full-stack framework |
| [React](https://react.dev/) | 18 | UI library |
| [TypeScript](https://www.typescriptlang.org/) | 5 | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | 3 | Utility-first CSS |
| [shadcn/ui](https://ui.shadcn.com/) | - | UI components |
| [Zustand](https://github.com/pmndrs/zustand) | 4 | State management |

### Backend Services

| Service | Purpose |
|---------|---------|
| [Crust Network](https://crust.network/) | Decentralized file storage |
| [IPFS](https://ipfs.tech/) | Distributed file system |
| [Upstash Redis](https://upstash.com/) | Data persistence (optional) |

## Deployment

### Cloudflare Pages (Recommended)

```bash
pnpm build
# See DEPLOY.md for detailed steps
```

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SpiritoXI/CrustShare)

### Docker

```bash
docker build -t crustshare .
docker run -p 3000:3000 crustshare
```

## FAQ

<details>
<summary><b>Is file storage free?</b></summary>

Yes! crustfiles.io provides **free permanent storage** for Developer Profiles. No CRU tokens required.
</details>

<details>
<summary><b>Will files be stored permanently?</b></summary>

Yes, files are permanently stored on Crust Network. crustfiles.io backend automatically handles file storage and renewal.
</details>

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

This project is licensed under the [MIT](./LICENSE) License.

## Acknowledgments

- [Crust Network](https://crust.network/) - Decentralized storage network
- [IPFS](https://ipfs.tech/) - Distributed file system
- [crustfiles.io](https://crustfiles.io) - Free permanent storage service
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components

---

<div align="center">

**⭐ If this project helps you, please give it a Star! ⭐**

</div>
