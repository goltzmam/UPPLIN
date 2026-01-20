import { Link } from "react-router-dom";
import { Instagram, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background hidden md:block">
      <div className="container py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link to="/" className="inline-block">
              <span className="font-display text-xl font-bold">UPPLIN</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              A plataforma social de eventos do Brasil.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Plataforma</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/eventos" className="hover:text-foreground transition-colors">Explorar</Link></li>
              <li><Link to="/organizadores" className="hover:text-foreground transition-colors">Para Organizadores</Link></li>
              <li><Link to="/precos" className="hover:text-foreground transition-colors">Preços</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Suporte</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/ajuda" className="hover:text-foreground transition-colors">Central de Ajuda</Link></li>
              <li><Link to="/contato" className="hover:text-foreground transition-colors">Contato</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/termos" className="hover:text-foreground transition-colors">Termos</Link></li>
              <li><Link to="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} UPPLIN. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
