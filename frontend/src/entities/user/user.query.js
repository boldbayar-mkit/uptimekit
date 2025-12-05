import { queryOptions } from "@tanstack/react-query";
//import { axiosInstance } from "@/shared/api/baseAxiosApi";
import axios from "axios";

export const userQuery = {
  all: () => ["users"],
  getUserProfile: () =>
    queryOptions({
      queryKey: [...userQuery.all(), "profileInfo"],
      queryFn: async () => {
        const response = await axios.get(`/api/me`);
        return response.data;
      },
    }),
};
