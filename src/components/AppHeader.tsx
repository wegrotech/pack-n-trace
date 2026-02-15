import { Link, useLocation } from "react-router-dom";
import { Package, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const AppHeader = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            HQ Inventory
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/">
              <Button variant={isActive("/") ? "secondary" : "ghost"} size="sm" className="gap-2">
                <Package className="h-4 w-4" />
                Products
              </Button>
            </Link>
            <Link to="/logs">
              <Button variant={isActive("/logs") ? "secondary" : "ghost"} size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                Logs
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};
