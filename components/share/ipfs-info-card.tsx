"use client";

import { ExternalLink } from "lucide-react";

interface IpfsInfoCardProps {
  cid: string;
}

export function IpfsInfoCard({ cid }: IpfsInfoCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
      <h3 className="text-lg font-semibold mb-2">关于 IPFS</h3>
      <p className="text-sm text-blue-100 mb-4">
        此文件存储在 IPFS 网络上，通过分布式网关提供访问。选择延迟最低的网关可获得最佳下载体验。
      </p>
      <a
        href={`https://ipfs.io/ipfs/${cid}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-sm text-white hover:text-blue-100 transition-colors"
      >
        <ExternalLink className="h-4 w-4 mr-1" />
        在 ipfs.io 上查看
      </a>
    </div>
  );
}
