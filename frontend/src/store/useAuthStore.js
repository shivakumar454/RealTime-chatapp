import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import axios from "axios";


const BASE_URL = import.meta.env.VITE_API_URL;



export const useAuthStore = create((set,get) => ({
  authUser: null,
  isSignUp: false,
  isLoggingin: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket:null,

  // isCheckAuth:true,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });

    try {
      const res = await axiosInstance.post("/auth/signup", data);
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

      set({ authUser: res.data });
      toast.success("Account created successfully");
    } catch (error) {
      toast.error(error.response.data.message);

      get().connectSocket();
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      localStorage.removeItem("token");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.message.data.message);
    }
  },

  updateprofile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile", error);
      const errorMessage =
        error?.response?.data?.message || "Something went wrong. Try again.";
      toast.error(errorMessage);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket:()=>{
    const {authUser}=get();
    if(!authUser || get().socket?.connected) return ;

    const socket = io(BASE_URL, {
  withCredentials: true,
  extraHeaders: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
  query: { userId: authUser._id },
});

    socket.connect()

    set({socket:socket});

    socket.on("getOnlineUsers" ,(usersIds) =>{
      set({ onlineUsers: usersIds })
    });
  },
  disconnectSocket:()=>{
    if(get().socket ?.connected) get().socket.disconnect();
  }
}));
