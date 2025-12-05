import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { userQuery } from "../entities/user/user.query";

const UserInfoContext = createContext();

export const UserInfoProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null);
  const { data, isLoading, isFetching } = useQuery(userQuery.getUserProfile());

  useEffect(() => {
    if (data?.user) {
      setUserInfo(data.user);
    } else {
      setUserInfo(null);
    }
  }, [data]);

  const logout = async () => {
    try {
      await axios.post("/api/logout");
    } catch (err) {
    } finally {
      setUserInfo(null);
    }
  };

  const value = useMemo(
    () => ({
      userInfo,
      logout,
      loading: isLoading || isFetching,
    }),
    [userInfo, isLoading, isFetching]
  );

  return (
    <UserInfoContext.Provider value={value}>
      {children}
    </UserInfoContext.Provider>
  );
};

export const useUserInfo = () => {
  const context = useContext(UserInfoContext);
  if (!context) {
    throw new Error("useUserInfo must be used within an UserInfoProvider");
  }
  return context;
};
