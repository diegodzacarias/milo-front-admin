import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/authContext";
import { useToast } from "@/hooks/use-toast";
import { normalizeApiError } from "@/lib/apiError";

interface LoginFormProps {
  onSuccess?: () => void;
  submitLabel?: string;
}

const LoginForm = ({ onSuccess, submitLabel = "Entrar" }: LoginFormProps) => {
  const { login, isLoading, error } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    try {
      await login(username, password);
      setUsername("");
      setPassword("");
      toast({
        title: "Éxito",
        description: "Sesión iniciada correctamente",
      });
      onSuccess?.();
    } catch (err) {
      const apiError = normalizeApiError(err, "Error al iniciar sesión");
      toast({
        title: "Error de login",
        description: apiError.message,
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        placeholder="Usuario"
        type="text"
        autoComplete="username"
        className="bg-muted border-border"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={isLoading}
      />
      <Input
        placeholder="Contraseña"
        type="password"
        autoComplete="current-password"
        className="bg-muted border-border"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={isLoading}
      >
        {isLoading ? "Ingresando..." : submitLabel}
      </Button>
    </form>
  );
};

export default LoginForm;
