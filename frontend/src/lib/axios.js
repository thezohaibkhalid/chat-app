import axios from "axios";

const BASE_URL = import.meta.env.NODE_ENV === "development" ? "http://localhost:3000/api" : `${import.meta.env.VITE_BASE_URL}`;

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send cookies with the request
});
