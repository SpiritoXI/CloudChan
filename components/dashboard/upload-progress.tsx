"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Upload, Cloud, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface UploadProgressProps {
  progress: number;
}

export function UploadProgress({ progress }: UploadProgressProps) {
  const isComplete = progress >= 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="border-b border-white/20 bg-gradient-to-r from-cloudchan-blue/5 via-white/40 to-cloudchan-purple/5 px-6 py-4 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <motion.div
              animate={isComplete ? { scale: [1, 1.2, 1] } : { rotate: 360 }}
              transition={isComplete ? { duration: 0.5 } : { duration: 2, repeat: Infinity, ease: "linear" }}
              className={`flex items-center justify-center h-8 w-8 rounded-full ${isComplete ? "bg-green-100" : "bg-cloudchan-purple/10"}`}
            >
              {isComplete ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Upload className="h-4 w-4 text-cloudchan-purple" />
              )}
            </motion.div>
            <div>
              <span className="text-sm font-medium">
                {isComplete ? "上传完成！" : "正在上传..."}
              </span>
              <p className="text-xs text-muted-foreground">
                {isComplete ? "文件已成功上传到 IPFS" : "请稍候，文件正在上传中"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.span
              key={progress}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className={`text-lg font-bold ${isComplete ? "text-green-600" : "gradient-text"}`}
            >
              {progress}%
            </motion.span>
          </div>
        </div>
        <div className="relative">
          <Progress value={progress} className="h-2 bg-white/30" />
          <motion.div
            className="absolute top-0 left-0 h-2 rounded-full overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          >
            <div className={`h-full w-full ${isComplete ? "bg-green-500" : "progress-bar-animated"}`} />
          </motion.div>
        </div>
        {!isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"
          >
            <Cloud className="h-3 w-3" />
            <span>正在上传到 IPFS 网络...</span>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
