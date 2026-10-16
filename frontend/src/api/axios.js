import axios from "axios";

const api = axios.create({
  // VITE_API_URL=/api/ en développement local (proxy Vite), sinon l'API de production
  baseURL: import.meta.env.VITE_API_URL || "https://api.movecash.site/api/",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
