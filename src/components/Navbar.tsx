import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, User, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePreferences, type CurrencyCode } from "@/lib/preferences";
import { useAuth } from "@/lib/authContext";
import { useToast } from "@/hooks/use-toast";
import { normalizeApiError } from "@/lib/apiError";

const Navbar = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showWorkMenu, setShowWorkMenu] = useState(false);
  const [showFigureAdminMenu, setShowFigureAdminMenu] = useState(false);
  const [showCharacterAdminMenu, setShowCharacterAdminMenu] = useState(false);
  const { currencyCode, setCurrencyCode } = usePreferences();
  const { token, username: authUsername, role, login, logout, isLoading, error } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const closeMenus = () => {
    setShowWorkMenu(false);
    setShowFigureAdminMenu(false);
    setShowCharacterAdminMenu(false);
  };

  const toggleWorkMenu = () => {
    setShowWorkMenu((current) => !current);
    setShowFigureAdminMenu(false);
    setShowCharacterAdminMenu(false);
  };

  const toggleFigureAdminMenu = () => {
    setShowFigureAdminMenu((current) => !current);
    setShowWorkMenu(false);
    setShowCharacterAdminMenu(false);
  };

  const toggleCharacterAdminMenu = () => {
    setShowCharacterAdminMenu((current) => !current);
    setShowWorkMenu(false);
    setShowFigureAdminMenu(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
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
      setShowLogin(false);
      toast({
        title: "Éxito",
        description: "Sesión iniciada correctamente",
      });
    } catch (err) {
      const apiError = normalizeApiError(err, "Error al iniciar sesión");
      toast({
        title: "Error de login",
        description: apiError.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="container flex h-20 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">⛩️</span>
          <span className="text-xl font-bold text-foreground">
            Anime<span className="text-primary">Figures</span>
          </span>
          </Link>

          <Select
            value={currencyCode}
            onValueChange={(value) => setCurrencyCode(value as CurrencyCode)}
          >
            <SelectTrigger className="h-9 w-[76px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="JPY">JPY</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Inicio
          </Link>
          <Link to="/color-test" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            ColorTest
          </Link>
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={toggleWorkMenu}
            >
              Work
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {showWorkMenu && (
              <div className="absolute left-0 top-full mt-3 min-w-40 rounded-lg border border-border bg-card p-2 shadow-card">
                <Link
                  to="/work/figure"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Figure
                </Link>
                <Link
                  to="/work/figure-alias"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Figure Alias
                </Link>
                <Link
                  to="/work/figure-source-listing"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Figure Source Listing
                </Link>
                <Link
                  to="/work/franchises"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Franchises
                </Link>
                <Link
                  to="/work/sources"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Sources
                </Link>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={toggleFigureAdminMenu}
            >
              FigureAdmin
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {showFigureAdminMenu && (
              <div className="absolute left-0 top-full mt-3 min-w-48 rounded-lg border border-border bg-card p-2 shadow-card">
                <Link
                  to="/figure-admin/candidate-review"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Candidate Review
                </Link>
                <Link
                  to="/figure-admin/discovery-candidates"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Discovery Candidates
                </Link>
                <Link
                  to="/figure-admin/alias-generator"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Alias Generator
                </Link>
                <Link
                  to="/figure-admin/scraping-runner"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Scraping Runner
                </Link>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={toggleCharacterAdminMenu}
            >
              CharacterAdmin
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {showCharacterAdminMenu && (
              <div className="absolute left-0 top-full mt-3 min-w-56 rounded-lg border border-border bg-card p-2 shadow-card">
                <Link
                  to="/character-admin/characters"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Characters
                </Link>
                <Link
                  to="/character-admin/character-aliases"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Character Aliases
                </Link>
                <Link
                  to="/character-admin/character-forms"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Character Forms
                </Link>
                <Link
                  to="/character-admin/character-form-aliases"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Character Form Aliases
                </Link>
                <Link
                  to="/character-admin/figure-characters"
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={closeMenus}
                >
                  Figure Characters
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="uppercase tracking-wide">
            Beta
          </Badge>

          {token && authUsername ? (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full border-border text-foreground hover:bg-muted"
                onClick={() => setShowLogin(!showLogin)}
              >
                <User className="h-4 w-4" />
                {authUsername}
              </Button>

              {showLogin && (
                <div className="absolute right-0 top-12 z-50 w-48 rounded-lg border border-border bg-card p-3 shadow-airbnb">
                  <div className="mb-3 border-b border-border pb-3">
                    <p className="text-sm font-medium text-foreground">{authUsername}</p>
                    <Badge variant="secondary" className="mt-1 text-[10px] uppercase tracking-wide">
                      {role}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full border-border text-foreground hover:bg-muted"
              onClick={() => setShowLogin(!showLogin)}
            >
              <User className="h-4 w-4" />
              Login
            </Button>
          )}
        </div>
      </div>

      {/* Login dropdown */}
      {showLogin && !token && (
        <div className="absolute right-4 top-20 z-50 w-72 rounded-2xl border border-border bg-card p-5 shadow-airbnb">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Iniciar Sesión</h3>
          <form onSubmit={handleLogin} className="space-y-3">
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
              {isLoading ? "Ingresando..." : "Entrar"}
            </Button>
          </form>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
