import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import LoginPage from "./pages/LoginPage.jsx";
import Layout from "./components/Layout.jsx";
import { TooltipProvider } from "./components/ui/tooltip";
import { UserInfoProvider } from "./providers/userInfoProviders.jsx";
import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const queryClient = new QueryClient();

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  const [onRefresh, setOnRefresh] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(
      "dark",
      "theme-midnight",
      "theme-forest",
      "theme-cosmic",
      "theme-claude"
    );

    if (theme !== "light") {
      root.classList.add("dark");
      if (theme !== "dark") {
        root.classList.add(theme);
      }
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer position="top-right" theme="colored" />
      <TooltipProvider>
        <UserInfoProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/dashboard"
                element={
                  <Layout
                    theme={theme}
                    setTheme={setTheme}
                    onRefresh={onRefresh}
                    isRefreshing={isRefreshing}
                  >
                    <Dashboard
                      registerRefresh={(fn, refreshingState) => {
                        setOnRefresh(() => fn);
                        setIsRefreshing(refreshingState);
                      }}
                    />
                  </Layout>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </BrowserRouter>
        </UserInfoProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
