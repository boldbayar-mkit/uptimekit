import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Clock, UserCheck, UserX } from "lucide-react";
import axios from "axios";
import { parseUTC } from "../lib/timezone";

// User status configurations
const USER_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

const getStatusConfig = (status) => {
  switch (status) {
    case USER_STATUS.APPROVED:
      return {
        icon: UserCheck,
        label: "Approved",
        color:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        badgeColor: "bg-emerald-500 text-white",
      };
    case USER_STATUS.REJECTED:
      return {
        icon: UserX,
        label: "Rejected",
        color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        badgeColor: "bg-red-500 text-white",
      };
    case USER_STATUS.PENDING:
    default:
      return {
        icon: Clock,
        label: "Pending",
        color:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        badgeColor: "bg-amber-500 text-white",
      };
  }
};

// Tab component
const Tabs = ({ tabs, activeTab, onTabChange, counts }) => {
  return (
    <div className="flex space-x-1 border-b border-border mb-6">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        const count = counts[tab.value] || 0;
        const statusConfig = getStatusConfig(tab.value);

        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200
              border-b-2 -mb-px rounded-t-lg
              ${
                isActive
                  ? "text-primary border-primary bg-primary/5"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
              }
            `}
          >
            <span>{tab.label}</span>
            <Badge
              variant="secondary"
              className={`
                text-xs px-2 py-0.5
                ${
                  isActive
                    ? statusConfig.badgeColor
                    : "bg-muted text-muted-foreground"
                }
              `}
            >
              {count}
            </Badge>
          </button>
        );
      })}
    </div>
  );
};

const MonitorUserDialog = ({ open, onOpenChange, userList = [], loading }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(USER_STATUS.PENDING);

  // Define tabs
  const tabs = [
    { value: USER_STATUS.PENDING, label: "Pending" },
    { value: USER_STATUS.APPROVED, label: "Approved" },
    { value: USER_STATUS.REJECTED, label: "Rejected" },
  ];

  // Group users by status and count them
  const userCounts = userList.reduce((acc, user) => {
    const status = user.status || USER_STATUS.PENDING; // Default to pending if no status
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Filter users by active tab
  const filteredUsers = userList.filter(
    (user) => (user.status || USER_STATUS.PENDING) === activeTab
  );

  // Handle user actions
  const handleApprove = async (userId) => {
    try {
      // Implement approve API call
      await axios.post(`/api/approve/${userId}`);
      // Update local state or trigger refresh
      console.log(`User ${userId} approved`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error) {
      console.error("Error approving user:", error);
    }
  };

  const handleReject = async (userId) => {
    try {
      // Implement reject API call
      await axios.post(`/api/reject/${userId}`);
      // Update local state or trigger refresh
      console.log(`User ${userId} rejected`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error) {
      console.error("Error rejecting user:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500 scrollbar-track-muted">
        <style>{`
          .scrollbar-thin::-webkit-scrollbar {
            width: 8px;
          }
          .scrollbar-thin::-webkit-scrollbar-track {
            background: hsl(var(--muted));
            border-radius: 10px;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb {
            background: #10b981;
            border-radius: 10px;
            transition: background 0.3s;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background: #059669;
          }
        `}</style>
        <DialogHeader>
          <DialogTitle>User list</DialogTitle>
          <DialogDescription>Manage user approval status</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={userCounts}
        />

        {/* User List with Animation */}
        <div className="space-y-3 min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground animate-pulse">
                Loading users...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="text-muted-foreground/50 mb-2">
                {(() => {
                  const StatusIcon = getStatusConfig(activeTab).icon;
                  return <StatusIcon className="w-12 h-12 mx-auto" />;
                })()}
              </div>
              <p className="text-muted-foreground font-medium">
                No users found
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {activeTab === USER_STATUS.PENDING &&
                  "No users waiting for approval"}
                {activeTab === USER_STATUS.APPROVED && "No approved users"}
                {activeTab === USER_STATUS.REJECTED && "No rejected users"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in-0 duration-300">
              {filteredUsers.map((user, index) => {
                const userStatus = user.status || USER_STATUS.PENDING;
                const statusConfig = getStatusConfig(userStatus);
                const StatusIcon = statusConfig.icon;

                return (
                  <Card
                    key={index}
                    className={`border-l-4 ${statusConfig.color}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="w-4 h-4" />
                            {/* <Badge variant="secondary" className="text-xs">
                              {statusConfig.label}
                            </Badge> */}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Created{" "}
                              {parseUTC(user.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {userStatus === USER_STATUS.APPROVED && (
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {user.cnt || 0}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                monitors
                              </p>
                            </div>
                          )}
                          {userStatus === USER_STATUS.PENDING && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(user.id)}
                                className="h-8 px-3 text-emerald-600 border-emerald-600 hover:bg-emerald-600 hover:text-white"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(user.id)}
                                className="h-8 px-3 text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonitorUserDialog;
