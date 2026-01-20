import { Link } from "react-router-dom";
import { Instagram, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/30 hidden md:block">
      <div className="container py-16">
        <div className="grid grid-cols-2 gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-5">
            <Link to="/" className="inline-block">
              <span className="font-display text-2xl font-bold">UPPLIN</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A plataforma social de eventos do Brasil. Descubra, conecte e viva experiências únicas.
            </p>
            <div className="flex gap-3">
              <a 
                href="#" 
                className="w-10 h-10 rounded-xl bg-muted hover:bg-foreground hover:text-background flex items-center justify-center transition-all duration-200"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-xl bg-muted hover:bg-foreground hover:text-background flex items-center justify-center transition-all duration-200"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm mb-5">Plataforma</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link to="/eventos" className="hover:text-foreground transition-colors">
                  Explorar Eventos
                </Link>
              </li>
              <li>
                <Link to="/organizadores" className="hover:text-foreground transition-colors">
                  Para Organizadores
                </Link>
              </li>
              <li>
                <Link to="/precos" className="hover:text-foreground transition-colors">
                  Preços
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-5">Suporte</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link to="/ajuda" className="hover:text-foreground transition-colors">
                  Central de Ajuda
                </Link>
              </li>
              <li>
                <Link to="/contato" className="hover:text-foreground transition-colors">
                  Contato
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-5">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link to="/termos" className="hover:text-foreground transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="hover:text-foreground transition-colors">
                  Privacidade
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} UPPLIN. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Feito com ❤️ no Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
