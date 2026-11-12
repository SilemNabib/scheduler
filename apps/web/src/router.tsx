import { createBrowserRouter } from "react-router";
import { ClerkRoot } from "./clerk-root";
import { HomePage } from "./pages/home-page";
import { LoginPage } from "./pages/login-page";
import { NotFoundPage } from "./pages/not-found-page";
import { PanelPage } from "./pages/panel-page";

export const router = createBrowserRouter([
  {
    element: <ClerkRoot />,
    children: [
      { path: "/", element: <HomePage /> },
      // The Clerk sign-in flow uses sub-paths (/login/factor-one, ...).
      { path: "/login/*", element: <LoginPage /> },
      { path: "/panel", element: <PanelPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
