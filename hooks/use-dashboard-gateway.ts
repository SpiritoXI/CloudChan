"use client";

import { useState, useCallback, useRef } from "react";
import { gatewayApi } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import type { Gateway, GatewayTestProgress, GatewayHealthTrend } from "@/types";

export function useGatewayManager(
  gateways: Gateway[],
  setGateways: (gateways: Gateway[]) => void,
  showToast: (message: string, type: "success" | "error" | "info" | "warning") => void
) {
  const [gatewayModalOpen, setGatewayModalOpen] = useState(false);
  const [isTestingGateways, setIsTestingGateways] = useState(false);
  const [isFetchingPublicGateways, setIsFetchingPublicGateways] = useState(false);
  const [addGatewayModalOpen, setAddGatewayModalOpen] = useState(false);
  const [isAddingGateway, setIsAddingGateway] = useState(false);
  const [newGatewayName, setNewGatewayName] = useState("");
  const [newGatewayUrl, setNewGatewayUrl] = useState("");
  const [newGatewayRegion, setNewGatewayRegion] = useState<"CN" | "INTL">('CN');
  const [testProgress, setTestProgress] = useState<GatewayTestProgress | null>(null);
  const [healthTrends, setHealthTrends] = useState<Record<string, GatewayHealthTrend>>({});

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleTestGateways = useCallback(async () => {
    setGatewayModalOpen(true);
  }, []);

  const handleStartTestGateways = useCallback(async () => {
    if (isTestingGateways) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsTestingGateways(true);
    showToast("开始检测网关...", "info");

    try {
      const allGateways = gateways.length > 0 ? [...gateways] : [...CONFIG.DEFAULT_GATEWAYS];
      
      const results = await gatewayApi.testAllGatewaysWithProgress(allGateways, {
        onOverallProgress: (progress) => {
          setTestProgress({ ...progress });
        },
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) {
        showToast("网关测试已暂停", "warning");
        return;
      }

      setGateways(results);
      gatewayApi.cacheResults(results);
      
      const trends = gatewayApi.loadHealthTrends();
      setHealthTrends(trends);

      const availableCount = results.filter(g => g.available).length;
      const highQualityCount = results.filter(g => g.available && (g.healthScore || 0) >= 70).length;
      
      showToast(
        `网关测试完成，${availableCount} 个可用，${highQualityCount} 个高质量`,
        "success"
      );
    } catch {
      if (!abortController.signal.aborted) {
        showToast("测试网关失败", "error");
      }
    } finally {
      setIsTestingGateways(false);
      setTestProgress(null);
      abortControllerRef.current = null;
    }
  }, [gateways, setGateways, showToast, isTestingGateways]);

  const handlePauseTestGateways = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsTestingGateways(false);
      setTestProgress(null);
      showToast("正在取消网关测试...", "warning");
    }
  }, [showToast]);

  const handleRefreshGateways = useCallback(async () => {
    if (isTestingGateways) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsTestingGateways(true);
    showToast("正在刷新网关...", "info");

    try {
      const allGateways = gateways.length > 0 ? [...gateways] : [...CONFIG.DEFAULT_GATEWAYS];
      const results = await gatewayApi.testAllGatewaysWithProgress(allGateways, {
        onOverallProgress: (progress) => {
          setTestProgress({ ...progress });
        },
        signal: abortController.signal,
      });

      if (!abortController.signal.aborted) {
        setGateways(results);
        gatewayApi.cacheResults(results);
        
        const trends = gatewayApi.loadHealthTrends();
        setHealthTrends(trends);
        
        showToast("网关刷新完成", "success");
      }
    } catch {
      if (!abortController.signal.aborted) {
        showToast("刷新网关失败", "error");
      }
    } finally {
      setIsTestingGateways(false);
      setTestProgress(null);
      abortControllerRef.current = null;
    }
  }, [gateways, setGateways, showToast, isTestingGateways]);

  const handleFetchPublicGateways = useCallback(async () => {
    setIsFetchingPublicGateways(true);
    try {
      const publicGateways = await gatewayApi.fetchPublicGateways();

      if (publicGateways.length === 0) {
        showToast("未获取到新的公共网关", "info");
        return;
      }

      setIsTestingGateways(true);
      showToast(`获取到 ${publicGateways.length} 个公共网关，正在检测...`, "info");

      const testedPublicGateways = await gatewayApi.testAllGateways(publicGateways);

      const allGateways = [...gateways, ...testedPublicGateways];
      const uniqueGateways = allGateways.filter(
        (gateway, index, self) => index === self.findIndex((g) => g.url === gateway.url)
      );

      setGateways(uniqueGateways);
      gatewayApi.cacheResults(uniqueGateways);

      const trends = gatewayApi.loadHealthTrends();
      setHealthTrends(trends);

      const availableCount = testedPublicGateways.filter(g => g.available).length;
      showToast(`公共网关获取完成，${availableCount} 个可用`, "success");
    } catch {
      showToast("获取公共网关失败", "error");
    } finally {
      setIsFetchingPublicGateways(false);
      setIsTestingGateways(false);
    }
  }, [gateways, setGateways, showToast]);

  const handleTestSingleGateway = useCallback(async (gateway: Gateway) => {
    showToast(`正在测试 ${gateway.name}...`, "info");
    
    try {
      const testResult = await gatewayApi.testGateway(gateway);
      
      const result: Gateway = {
        ...gateway,
        available: testResult.available,
        latency: testResult.latency,
        reliability: testResult.reliability,
        healthScore: testResult.healthScore,
        rangeSupport: testResult.rangeSupport,
        corsEnabled: testResult.corsEnabled,
        lastChecked: Date.now(),
      };
      
      const updatedGateways = gateways.map((g) => {
        if (g.url === gateway.url) {
          return result;
        }
        return g;
      });
      
      setGateways(updatedGateways);
      gatewayApi.cacheResults(updatedGateways);
      
      showToast(
        result.available 
          ? `${gateway.name} 可用，延迟 ${result.latency}ms`
          : `${gateway.name} 不可用`,
        result.available ? "success" : "warning"
      );
    } catch {
      showToast("测试网关失败", "error");
    }
  }, [gateways, setGateways, showToast]);

  const handleValidateGatewayUrl = useCallback((url: string) => {
    return gatewayApi.validateGatewayUrl(url);
  }, []);

  const handleAddCustomGateway = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (!newGatewayName || !newGatewayUrl) {
      showToast("请填写网关名称和URL", "error");
      return { success: false, message: "请填写网关名称和URL" };
    }

    setIsAddingGateway(true);

    try {
      const validation = gatewayApi.validateGatewayUrl(newGatewayUrl);
      if (!validation.valid) {
        showToast(validation.error || "URL 格式无效", "error");
        return { success: false, message: validation.error || "URL 格式无效" };
      }

      const normalizedUrl = validation.normalizedUrl;
      const exists = gateways.some(g => g.url === normalizedUrl);
      if (exists) {
        showToast("该网关已存在", "error");
        return { success: false, message: "该网关已存在" };
      }

      const testResult = await gatewayApi.testGateway({
        name: newGatewayName,
        url: normalizedUrl,
        region: newGatewayRegion,
        icon: "🌐",
        priority: 100 + gateways.length,
      } as Gateway, {
        retries: 2,
        samples: 3,
      });

      const newGateway: Gateway = {
        name: newGatewayName,
        url: normalizedUrl,
        region: newGatewayRegion,
        available: testResult.available,
        latency: testResult.latency,
        reliability: testResult.reliability,
        corsEnabled: testResult.corsEnabled,
        rangeSupport: testResult.rangeSupport,
        healthScore: testResult.available ? 70 : 20,
        lastChecked: Date.now(),
        icon: "🌐",
        priority: 100 + gateways.length,
      };

      const updatedGateways = [...gateways, newGateway];
      setGateways(updatedGateways);
      gatewayApi.cacheResults(updatedGateways);
      
      setAddGatewayModalOpen(false);
      setNewGatewayName("");
      setNewGatewayUrl("");
      setNewGatewayRegion('CN');

      const message = testResult.available
        ? `网关添加成功，延迟 ${testResult.latency}ms，可靠性 ${testResult.reliability}%`
        : "网关添加成功，但当前不可用";

      showToast(message, testResult.available ? "success" : "warning");
      return { success: true, message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "添加网关失败";
      showToast(errorMessage, "error");
      return { success: false, message: errorMessage };
    } finally {
      setIsAddingGateway(false);
    }
  }, [newGatewayName, newGatewayUrl, newGatewayRegion, gateways, setGateways, showToast]);

  const handleRemoveCustomGateway = useCallback((gateway: Gateway) => {
    const updatedGateways = gateways.filter((g) => g.url !== gateway.url);
    setGateways(updatedGateways);
    gatewayApi.cacheResults(updatedGateways);
    showToast("网关已删除", "success");
  }, [gateways, setGateways, showToast]);

  const handleDownload = useCallback(async (cid: string, filename: string) => {
    try {
      const { url } = await gatewayApi.getBestGatewayUrl();
      const downloadUrl = `${url}${cid}?filename=${encodeURIComponent(filename)}&download=true`;
      window.open(downloadUrl, '_blank');
      showToast(`开始下载 ${filename}`, "success");
    } catch {
      showToast(`下载 ${filename} 失败`, "error");
    }
  }, [showToast]);

  const handleDownloadWithGateway = useCallback((cid: string, filename: string, gateway: Gateway) => {
    const downloadUrl = `${gateway.url}${cid}?filename=${encodeURIComponent(filename)}&download=true`;
    window.open(downloadUrl, '_blank');
    showToast(`使用 ${gateway.name} 下载 ${filename}`, "success");
  }, [showToast]);

  return {
    gatewayModalOpen,
    setGatewayModalOpen,
    isTestingGateways,
    isFetchingPublicGateways,
    isAddingGateway,
    addGatewayModalOpen,
    setAddGatewayModalOpen,
    newGatewayName,
    setNewGatewayName,
    newGatewayUrl,
    setNewGatewayUrl,
    newGatewayRegion,
    setNewGatewayRegion,
    testProgress,
    healthTrends,
    handleTestGateways,
    handleStartTestGateways,
    handlePauseTestGateways,
    handleRefreshGateways,
    handleFetchPublicGateways,
    handleTestSingleGateway,
    handleValidateGatewayUrl,
    handleAddCustomGateway,
    handleRemoveCustomGateway,
    handleDownload,
    handleDownloadWithGateway,
  };
}
