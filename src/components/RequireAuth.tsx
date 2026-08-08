import { ReactNode } from "react";
import { useAuth } from "@/lib/authContext";

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          <h2 className="text-lg font-semibold text-foreground">Acceso restringido</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Necesitas iniciar sesión para acceder a esta sección de administración.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
