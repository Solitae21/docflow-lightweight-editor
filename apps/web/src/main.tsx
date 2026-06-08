import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { UserProvider } from "./auth/UserContext";
import { ToastProvider } from "./toast/ToastContext";
import { Toaster } from "./components/Toaster";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <UserProvider>
          <App />
        </UserProvider>
        <Toaster />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
