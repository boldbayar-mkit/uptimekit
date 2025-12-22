import { useState } from "react";
import { useUserInfo } from "../providers/userInfoProviders.jsx";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Palette, LogOut, Menu, X } from "lucide-react";
import AddMonitorDialog from "./AddMonitorDialog";

const Header = ({ theme, setTheme }) => {
  const { userInfo, logout } = useUserInfo();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                LsWatch
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {userInfo ? `Hello, ${userInfo.loginId}!` : ""}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {userInfo && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${
                          isRefreshing ? "animate-spin" : ""
                        }`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh monitors</TooltipContent>
                </Tooltip>
                <AddMonitorDialog />
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Palette className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("theme-midnight")}>
                  Midnight
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("theme-forest")}>
                  Forest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("theme-cosmic")}>
                  Cosmic
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("theme-claude")}>
                  Claude
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {userInfo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    disabled={isRefreshing}
                  >
                    <LogOut className="h-4 w-4 ml-2" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Logout</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            {userInfo && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${
                          isRefreshing ? "animate-spin" : ""
                        }`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh monitors</TooltipContent>
                </Tooltip>
                <AddMonitorDialog />
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-9 w-9 p-0"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-4 w-4" />
                <span className="text-sm font-medium">Theme</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                >
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                >
                  Dark
                </Button>
                <Button
                  variant={theme === "theme-midnight" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("theme-midnight")}
                >
                  Midnight
                </Button>
                <Button
                  variant={theme === "theme-forest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("theme-forest")}
                >
                  Forest
                </Button>
                <Button
                  variant={theme === "theme-cosmic" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("theme-cosmic")}
                >
                  Cosmic
                </Button>
                <Button
                  variant={theme === "theme-claude" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("theme-claude")}
                >
                  Claude
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
