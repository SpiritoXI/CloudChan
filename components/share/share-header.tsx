"use client";

import { Globe } from "lucide-react";

export function ShareHeader() {
  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">CrustShare</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">去中心化文件分享</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <a
            href="/"
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            返回首页
          </a>
        </div>
      </div>
    </header>
  );
}
