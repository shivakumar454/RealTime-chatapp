import axios from "axios";


export const axiosInstance = axios.create({
    baseURL: import.meta.env.MODE==="developmet" ? "http://localhost:5001/api": "/api",
    withCredentials:true,
})  

 