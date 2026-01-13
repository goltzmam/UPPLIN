import { Link } from "react-router-dom";
import { Calendar, Instagram, Twitter, Facebook } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">Influente</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              A plataforma completa para criar, gerenciar e vender ingressos para seus eventos.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Plataforma</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/eventos" className="hover:text-foreground transition-colors">Explorar Eventos</Link></li>
              <li><Link to="/organizador" className="hover:text-foreground transition-colors">Para Organizadores</Link></li>
              <li><Link to="/precos" className="hover:text-foreground transition-colors">Preços</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/ajuda" className="hover:text-foreground transition-colors">Central de Ajuda</Link></li>
              <li><Link to="/contato" className="hover:text-foreground transition-colors">Contato</Link></li>
              <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/termos" className="hover:text-foreground transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link></li>
              <li><Link to="/cookies" className="hover:text-foreground transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Influente Eventos. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
