import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  variant?: "default" | "dark";
}

export function Breadcrumb({ items, className, variant = "default" }: BreadcrumbProps) {
  const allItems = [{ label: "Início", href: "/" }, ...items];

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-1.5 text-sm overflow-x-auto scrollbar-hide",
        variant === "dark" ? "text-white/60" : "text-muted-foreground",
        className
      )}
      aria-label="Breadcrumb"
    >
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        const isFirst = index === 0;

        return (
          <div key={index} className="flex items-center gap-1.5 shrink-0">
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-1 hover:text-primary transition-colors",
                  variant === "dark" ? "hover:text-white" : ""
                )}
              >
                {isFirst && <Home className="h-3.5 w-3.5" />}
                <span className={isFirst ? "hidden sm:inline" : ""}>{item.label}</span>
              </Link>
            ) : (
              <span
                className={cn(
                  "font-medium truncate max-w-[200px]",
                  variant === "dark" ? "text-white" : "text-foreground"
                )}
              >
                {isFirst && !item.href && <Home className="h-3.5 w-3.5 inline mr-1" />}
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight className={cn(
                "h-3.5 w-3.5 shrink-0",
                variant === "dark" ? "text-white/40" : "text-muted-foreground/50"
              )} />
            )}
          </div>
        );
      })}
    </motion.nav>
  );
}

// Hook to generate breadcrumbs based on current route
export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  
  const routeLabels: Record<string, string> = {
    eventos: "Eventos",
    evento: "Evento",
    perfil: "Perfil",
    mensagens: "Mensagens",
    "meus-ingressos": "Meus Ingressos",
    "eventos-salvos": "Eventos Salvos",
    checkout: "Checkout",
    organizador: "Organizador",
    login: "Entrar",
    cadastro: "Cadastrar",
    "recuperar-senha": "Recuperar Senha",
    "explorar-organizadores": "Explorar Organizadores",
    organizadores: "Organizadores",
    precos: "Preços",
  };

  const items: BreadcrumbItem[] = [];
  let currentPath = "";

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    
    // Skip UUID-like segments or slug-like segments for display but keep in path
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
    const isEventSlug = /^[a-z0-9-]+-\d{4}$/i.test(segment); // Match slug pattern like "festa-do-ano-1234"
    
    if (!isUUID && !isEventSlug) {
      items.push({
        label: routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: isLast ? undefined : currentPath,
      });
    }
  });

  return items;
}
