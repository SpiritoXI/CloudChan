"use client";

import { motion } from "framer-motion";
import { Search, Settings, List, Grid3X3, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DashboardHeaderProps {
  currentFolderName: string;
  searchQuery: string;
  viewMode: "list" | "grid";
  showBackButton: boolean;
  onSearchChange: (value: string) => void;
  onViewModeChange: (mode: "list" | "grid") => void;
  onBack: () => void;
  onSettingsClick: () => void;
}

export function DashboardHeader({
  currentFolderName,
  searchQuery,
  viewMode,
  showBackButton,
  onSearchChange,
  onViewModeChange,
  onBack,
  onSettingsClick,
}: DashboardHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/20 bg-white/40 px-6 backdrop-blur-md shadow-sm">
      <div className="flex items-center flex-1">
        {showBackButton && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="mr-2 hover:bg-white/60 transition-all duration-200"
              onClick={onBack}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
          </motion.div>
        )}
        <motion.h2
          key={currentFolderName}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-semibold mr-4 flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-cloudchan-purple" />
          {currentFolderName}
        </motion.h2>
        <div className="flex items-center flex-1 max-w-xl relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            placeholder="搜索文件名或CID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 h-10 bg-white/60 border-white/30 focus:bg-white/80 focus:border-cloudchan-purple/30 focus:ring-cloudchan-purple/20 transition-all duration-200 rounded-full"
          />
          {searchQuery && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <span className="text-xs bg-cloudchan-purple/10 text-cloudchan-purple px-2 py-0.5 rounded-full">
                搜索中
              </span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1 bg-white/40 rounded-full p-1">
        <Button
          variant={viewMode === "list" ? "default" : "ghost"}
          size="icon"
          onClick={() => onViewModeChange("list")}
          className={`h-8 w-8 rounded-full transition-all duration-200 ${viewMode === "list" ? "bg-white shadow-sm" : "hover:bg-white/50"}`}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "grid" ? "default" : "ghost"}
          size="icon"
          onClick={() => onViewModeChange("grid")}
          className={`h-8 w-8 rounded-full transition-all duration-200 ${viewMode === "grid" ? "bg-white shadow-sm" : "hover:bg-white/50"}`}
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-white/30 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          className="h-8 w-8 rounded-full hover:bg-white/50 hover:rotate-90 transition-all duration-300"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
