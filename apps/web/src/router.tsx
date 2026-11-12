import { createBrowserRouter } from "react-router";
import { ClerkRoot } from "./clerk-root";
import { AdminPage } from "./pages/admin-page";
import { ChangePasswordPage } from "./pages/change-password-page";
import { HomePage } from "./pages/home-page";
import { LoginPage } from "./pages/login-page";
import { NotFoundPage } from "./pages/not-found-page";
import { PanelPage } from "./pages/panel-page";
import { RegisterPage } from "./pages/register-page";

export const router = createBrowserRouter([
  {
    element: <ClerkRoot />,
    children: [
      { path: "/", element: <HomePage /> },
      // The Clerk sign-in flow uses sub-paths (/login/factor-one, ...).
      { path: "/login/*", element: <LoginPage /> },
      // Clerk's sign-up flow also uses sub-paths (/registro/verify-email-address, ...).
      { path: "/registro/*", element: <RegisterPage /> },
      { path: "/panel", element: <PanelPage /> },
      { path: "/panel/contrasena", element: <ChangePasswordPage /> },
      { path: "/admin", element: <AdminPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
