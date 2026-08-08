import { ReactNode } from "react";
import { useAuth } from "@/lib/authContext";
import LoginForm from "@/components/LoginForm";

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">Acceso restringido</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Necesitas iniciar sesión para acceder a esta sección de administración.
            </p>
          </div>
          <div className="mt-5">
            <LoginForm />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
