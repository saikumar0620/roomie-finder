import { Toaster } from "react-hot-toast";
// import React from "react";

import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";



const queryClient = new QueryClient();
if (localStorage.getItem("theme") === "dark") {
  document.documentElement.classList.add("dark");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  // Wrap your application with ThemeProvider
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster position="top-right" reverseOrder={false} />
  </QueryClientProvider>
);