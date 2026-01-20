import { Link } from "react-router-dom";
import { Instagram, Twitter, Mail, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/20 hidden md:block">
      <div className="container py-20 lg:py-24">
        <div className="grid grid-cols-2 gap-12 lg:gap-16 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-6">
            <Link to="/" className="inline-block">
              <span className="font-display text-3xl font-bold">UPPLIN</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              A plataforma social de eventos do Brasil. Descubra, conecte e viva experiências únicas.
            </p>
            <div className="flex gap-3">
              <a 
                href="#" 
                className="w-11 h-11 rounded-2xl bg-muted hover:bg-foreground hover:text-background flex items-center justify-center transition-all duration-300 hover:scale-105"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="w-11 h-11 rounded-2xl bg-muted hover:bg-foreground hover:text-background flex items-center justify-center transition-all duration-300 hover:scale-105"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="w-11 h-11 rounded-2xl bg-muted hover:bg-foreground hover:text-background flex items-center justify-center transition-all duration-300 hover:scale-105"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm mb-6 uppercase tracking-wider text-muted-foreground">Plataforma</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <Link to="/eventos" className="text-foreground/80 hover:text-foreground transition-colors">
                  Explorar Eventos
                </Link>
              </li>
              <li>
                <Link to="/explorar-organizadores" className="text-foreground/80 hover:text-foreground transition-colors">
                  Organizadores
                </Link>
              </li>
              <li>
                <Link to="/organizadores" className="text-foreground/80 hover:text-foreground transition-colors">
                  Para Organizadores
                </Link>
              </li>
              <li>
                <Link to="/precos" className="text-foreground/80 hover:text-foreground transition-colors">
                  Preços
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-6 uppercase tracking-wider text-muted-foreground">Suporte</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <Link to="/ajuda" className="text-foreground/80 hover:text-foreground transition-colors">
                  Central de Ajuda
                </Link>
              </li>
              <li>
                <Link to="/contato" className="text-foreground/80 hover:text-foreground transition-colors">
                  Contato
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-foreground/80 hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-6 uppercase tracking-wider text-muted-foreground">Legal</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <Link to="/termos" className="text-foreground/80 hover:text-foreground transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-foreground/80 hover:text-foreground transition-colors">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-foreground/80 hover:text-foreground transition-colors">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} UPPLIN. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
            Feito com <Heart className="h-3 w-3 text-destructive fill-destructive" /> no Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
