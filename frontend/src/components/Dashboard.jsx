import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState, useRef, useEffect } from "react";
import { createSwapy } from "swapy";
import MonitorCard from "./MonitorCard";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import {
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { useUserInfo } from "../providers/userInfoProviders.jsx";
import { useForm } from "react-hook-form";
import MonitorUserDialog from "./MonitorUserDialog";

const Dashboard = ({ registerRefresh }) => {
  const queryClient = useQueryClient();
  const { userInfo } = useUserInfo();
  console.log("Dashboard rendered, userInfo =", userInfo);
  const [activeTab, setActiveTab] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  //const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const containerRef = useRef(null);
  const swapyRef = useRef(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const {
    formState: { errors },
  } = useForm({
    defaultValues: {
      loginId: "",
      password: "",
    },
  });

  const {
    data: monitors = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["monitors", userInfo?.id],
    queryFn: () => {
      return axios.get("/api/monitors").then((res) => res.data);
    },
    enabled: !!userInfo,
    refetchInterval: 30000,
  });

  const { data: users = [], loading: isUserDataLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => {
      return axios.get("/api/users").then((res) => res.data);
    },
    enabled: !!userInfo,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["monitor-uptime"] });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    if (registerRefresh) {
      registerRefresh(handleRefresh, isRefreshing);
    }
  }, [isRefreshing]);

  const deleteMonitorMutation = useMutation({
    mutationFn: (id) => axios.delete(`/api/monitors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
    },
    onError: (error) => {
      console.error("Error deleting monitor:", error);
    },
  });

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this monitor?")) {
      deleteMonitorMutation.mutate(id);
    }
  };

  // Aggregate statistics
  const stats = {
    userCnt: users.length,
    total: monitors.length,
    up: monitors.filter((m) => m.status === "up").length,
    down: monitors.filter((m) => m.status === "down").length,
    slow: monitors.filter((m) => m.status === "slow").length,
    avgResponseTime:
      monitors.length > 0
        ? Math.round(
            monitors.reduce((acc, m) => acc + m.response_time, 0) /
              monitors.length
          )
        : 0,
  };

  stats.issues = stats.down + stats.slow;

  const computePercentile = (arr, p) => {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    const weight = idx - lower;
    return Math.round(sorted[lower] * (1 - weight) + sorted[upper] * weight);
  };

  const responseTimes = monitors
    .map((m) => (typeof m.response_time === "number" ? m.response_time : 0))
    .filter((x) => x > 0);
  stats.p95Response = computePercentile(responseTimes, 95) || 0;
  const uptimePercent =
    monitors.length > 0 ? (stats.up / stats.total) * 100 : 0;
  const issuesPercent =
    monitors.length > 0 ? (stats.issues / stats.total) * 100 : 0;
  const maxLatency = 2000;
  const latencyNormalized = Math.max(
    0,
    Math.min(1, 1 - stats.p95Response / maxLatency)
  );
  const weights = { uptime: 0.5, issues: 0.3, latency: 0.2 };
  const healthRaw =
    monitors.length > 0
      ? (uptimePercent / 100) * weights.uptime +
        (1 - issuesPercent / 100) * weights.issues +
        latencyNormalized * weights.latency
      : null;
  stats.healthScore = healthRaw === null ? null : Math.round(healthRaw * 100);

  const uptime =
    monitors.length > 0 ? ((stats.up / stats.total) * 100).toFixed(1) : 0;

  const getFilteredMonitors = () => {
    switch (activeTab) {
      case "up":
        return monitors.filter((m) => m.status === "up");
      case "down":
        return monitors.filter((m) => m.status === "down");
      case "slow":
        return monitors.filter((m) => m.status === "slow");
      default:
        return monitors;
    }
  };

  const filteredMonitors = getFilteredMonitors();

  const getSavedOrder = () => {
    try {
      const raw = localStorage.getItem("monitorOrder") || "[]";
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const deduped = Array.from(new Set(parsed.map((x) => Number(x)))).map(
        Number
      );
      return deduped;
    } catch (e) {
      return [];
    }
  };

  const applySavedOrder = (monitorsList) => {
    const saved = getSavedOrder();
    if (!Array.isArray(saved) || saved.length === 0) return monitorsList;
    const savedSet = new Set(saved.map((s) => Number(s)));
    const ordered = [];
    saved.forEach((id) => {
      const found = monitorsList.find((m) => Number(m.id) === Number(id));
      if (found) ordered.push(found);
    });
    monitorsList.forEach((m) => {
      if (!savedSet.has(Number(m.id))) ordered.push(m);
    });
    return ordered;
  };

  const orderedMonitors = applySavedOrder(filteredMonitors);

  // Helper to update saved order
  const updateSavedOrderForSwap = (swappedArray) => {
    const currentIds = monitors.map((m) => Number(m.id));
    try {
      if (!Array.isArray(swappedArray)) return;
      const saved = getSavedOrder();
      const dedupedSwapped = Array.from(new Set(swappedArray.map(Number))).map(
        Number
      );
      const newOrder = [
        ...dedupedSwapped,
        ...saved.filter((id) => !dedupedSwapped.includes(id)),
        ...currentIds.filter(
          (id) => !dedupedSwapped.includes(id) && !saved.includes(id)
        ),
      ];
      localStorage.setItem("monitorOrder", JSON.stringify(newOrder));
    } catch (e) {
      localStorage.setItem("monitorOrder", JSON.stringify(swappedArray));
    }
  };

  useEffect(() => {
    if (isLoading || monitors.length === 0) return;
    const currentIds = monitors.map((m) => Number(m.id));
    const saved = getSavedOrder();
    const newSaved = [
      ...saved.filter((id) => currentIds.includes(id)),
      ...currentIds.filter((id) => !saved.includes(id)),
    ];
    const deduped = Array.from(new Set(newSaved));
    localStorage.setItem("monitorOrder", JSON.stringify(deduped));
  }, [monitors, isLoading]);

  useEffect(() => {
    if (!containerRef.current) return;
    const hasSlot = containerRef.current.querySelector("[data-swapy-slot]");
    const hasItem = containerRef.current.querySelector("[data-swapy-item]");
    if (!hasSlot || !hasItem) return;
    swapyRef.current?.destroy?.();
    let rafId;
    rafId = requestAnimationFrame(() => {
      try {
        swapyRef.current = createSwapy(containerRef.current, {
          animation: "dynamic",
        });
        swapyRef.current.onSwap((event) => {
          const arr = (event?.newSlotItemMap?.asArray || []).map((x) =>
            Number(x.item)
          );
          if (arr && arr.length) updateSavedOrderForSwap(arr);
        });
      } catch (e) {
        console.error("Swapy init error:", e);
      }
    });
    return () => {
      cancelAnimationFrame(rafId);
      swapyRef.current?.destroy?.();
      swapyRef.current = null;
    };
  }, [containerRef, activeTab, monitors.length]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading monitors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingDown className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Error Loading Monitors
              </h3>
              <p className="text-muted-foreground mb-4">
                Unable to connect to the backend server
              </p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {monitors.length > 0 && (
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-6">
            <div
              className={`grid grid-cols-2 ${
                userInfo.role == "admin" ? "md:grid-cols-6" : "md:grid-cols-5"
              } gap-4`}
            >
              {userInfo?.role == "admin" && (
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setUserDialogOpen(true)}
                >
                  <CardContent className="pt-14">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">
                        Total Users
                      </p>
                      <p className="text-3xl font-bold">{stats.userCnt}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-14">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      Total Monitors
                    </p>
                    <p className="text-3xl font-bold">{stats.total}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-14">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      Operational
                    </p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      {stats.up}
                    </p>
                    <Progress
                      value={(stats.up / stats.total) * 100}
                      className="mt-2 h-1.5"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-14">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Down</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {stats.down}
                    </p>
                    <Progress
                      value={(stats.down / stats.total) * 100}
                      className="mt-2 h-1.5 bg-red-100 dark:bg-red-950 [&>div]:bg-red-600"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-14">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Uptime</p>
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-3xl font-bold">{uptime}%</p>
                      {uptime >= 99 ? (
                        <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <Progress
                      value={parseFloat(uptime)}
                      className="mt-2 h-1.5"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-14">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      Health Score
                    </p>
                    {stats.healthScore === null ? (
                      <p className="text-3xl font-bold">—</p>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <p
                          className={`text-3xl font-bold ${
                            stats.healthScore >= 90
                              ? "text-emerald-600 dark:text-emerald-400"
                              : stats.healthScore >= 75
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {stats.healthScore}
                        </p>
                        <p className="text-sm ml-1 align-baseline">/100</p>
                      </div>
                    )}
                    <div className="mt-2">
                      <Progress
                        value={stats.healthScore || 0}
                        className="h-1.5"
                      />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {stats.healthScore === null
                              ? "No monitors"
                              : `${uptimePercent.toFixed(1)}% uptime · ${
                                  stats.p95Response
                                }ms P95 · ${stats.issues} issues`}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Health Score = 50% uptime + 30% issue count + 20%
                          latency (P95)
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}{" "}
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {monitors.length === 0 ? (
          <div className="text-center py-16">
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-12 pb-12">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center">
                  <Activity className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-3">No Monitors Yet</h2>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Start monitoring your websites and services by adding your
                  first monitor.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid w-full max-w-md grid-cols-4">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  All
                  <Badge variant="secondary" className="ml-1">
                    {stats.total}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="up" className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Up
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-emerald-100 dark:bg-emerald-950"
                  >
                    {stats.up}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="slow" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Slow
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-amber-100 dark:bg-amber-950"
                  >
                    {stats.slow}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="down" className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Down
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-red-100 dark:bg-red-950"
                  >
                    {stats.down}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-6">
              {filteredMonitors.length === 0 ? (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <p className="text-muted-foreground">
                      No monitors in this category
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div
                  ref={containerRef}
                  className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6"
                  data-swapy-container
                >
                  {orderedMonitors.map((monitor) => (
                    <div key={monitor.id} data-swapy-slot={String(monitor.id)}>
                      <div data-swapy-item={String(monitor.id)}>
                        <MonitorCard
                          key={monitor.id}
                          monitor={monitor}
                          onDelete={handleDelete}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <MonitorUserDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        //monitor={monitor}
        loading={isUserDataLoading}
        userList={users}
      />
    </div>
  );
};

export default Dashboard;
