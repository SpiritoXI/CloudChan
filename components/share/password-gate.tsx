"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, AlertCircle, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PasswordGateProps {
  cid: string;
  onVerify: (password: string) => Promise<boolean>;
}

export function PasswordGate({ cid, onVerify }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (!password) {
      setError("请输入密码");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const success = await onVerify(password);
      if (!success) {
        setError("密码错误，请重试");
      }
    } catch {
      setError("验证失败，请重试");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            需要密码访问
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            此分享已设置密码保护
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="请输入访问密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              className={error ? "border-red-500" : ""}
            />
            {error && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </p>
            )}
          </div>

          <Button
            onClick={handleVerify}
            disabled={isVerifying || !password}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                验证中...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                验证密码
              </>
            )}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            CID: {cid.slice(0, 16)}...{cid.slice(-8)}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
