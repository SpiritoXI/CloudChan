"use client";

import { useDashboardContext } from "@/contexts/dashboard-context";

/**
 * @deprecated 请使用 `useDashboardContext()` 代替
 * 此 hook 现在是 Context 的包装器，保持向后兼容
 */
export function useDashboard() {
  return useDashboardContext();
}
