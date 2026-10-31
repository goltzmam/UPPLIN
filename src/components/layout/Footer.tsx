import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { APP_ORIGIN, PLANS_ORIGIN, webSurface } from "@/lib/web-surfaces";
import { cn } from "@/lib/utils";

const linkClass = "rounded-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
function FooterLink({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) {
  return webSurface(window.location.hostname) === "plans"
    ? <a className={linkClass} href={APP_ORIGIN + to} onClick={onClick}>{children}</a>
    : <Link className={linkClass} to={to} onClick={onClick}>{children}</Link>;
}
function TikTokIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true"><path d="M12.53.02h3.98c.26 2.27 1.53 4.31 3.45 5.52 1.1.7 2.39 1.08 3.69 1.09v4.01a11.5 11.5 0 0 1-7.12-2.37v8.34a7.4 7.4 0 1 1-6.38-7.32v4.1a3.35 3.35 0 1 0 2.38 3.22V.02Z" /></svg>;
}

export function Footer({ inset = false, bottomNavigation = false, feed = false, id = "rodape" }: { inset?: boolean; bottomNavigation?: boolean; feed?: boolean; id?: string }) {
  const [open, setOpen] = useState(false);
  if (Capacitor.isNativePlatform() || webSurface(window.location.hostname) === "admin") return null;
  const close = () => setOpen(false);
  return <footer id={id} aria-label="Rodapé UPPLIN" className={cn("shrink-0 border-t border-border/40 bg-background text-foreground", inset && "lg:ml-[72px]", bottomNavigation && "pb-[calc(var(--app-bottom-offset,100px)+8px)] lg:pb-0")}>
    <div className={cn("mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 px-3 text-[11px] leading-4 sm:gap-x-5", feed ? "min-h-8" : "gap-y-1 py-3 sm:justify-between sm:px-6")}>
      {!feed && <p className="text-[10px] text-muted-foreground">Upplin LTDA © {new Date().getFullYear()}</p>}
      <nav aria-label="Termos e informações da UPPLIN" className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5">
        <FooterLink to="/privacidade">Privacidade</FooterLink>
        <FooterLink to="/termos">Termos de uso</FooterLink>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><button type="button" className={cn(linkClass,"min-h-8 text-[11px]")}>Sobre a UPPLIN</button></DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-left font-display text-xl">Sobre a UPPLIN</DialogTitle>
              <DialogDescription className="text-left leading-relaxed">Descubra eventos, acompanhe organizadores e encontre sua próxima experiência.</DialogDescription>
            </DialogHeader>
            <nav aria-label="Informações e suporte" className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <a href={PLANS_ORIGIN + "/"} className="text-primary hover:underline">Quero organizar um evento</a>
              <a href={PLANS_ORIGIN + "/#precos"} className={linkClass}>Planos e recursos</a>
              <FooterLink to="/organizador/cadastro" onClick={close}>Cadastro de organizador</FooterLink>
              <FooterLink to="/organizador/login" onClick={close}>Login do organizador</FooterLink>
              <FooterLink to="/suporte" onClick={close}>Central de suporte</FooterLink>
              <FooterLink to="/excluir-conta" onClick={close}>Excluir minha conta</FooterLink>
              <FooterLink to="/privacidade" onClick={close}>Política de privacidade</FooterLink>
              <FooterLink to="/termos" onClick={close}>Termos de uso</FooterLink>
              <FooterLink to="/privacidade/participante" onClick={close}>Privacidade do participante</FooterLink>
              <FooterLink to="/privacidade/organizador" onClick={close}>Privacidade do organizador</FooterLink>
              <FooterLink to="/termos/participante" onClick={close}>Termos do participante</FooterLink>
              <FooterLink to="/termos/organizador" onClick={close}>Termos do organizador</FooterLink>
              <FooterLink to="/politica/standart" onClick={close}>Política do plano Standart</FooterLink>
              <FooterLink to="/politica/pro" onClick={close}>Política do plano Pro</FooterLink>
              <FooterLink to="/politica/enterprise" onClick={close}>Política do plano Enterprise</FooterLink>
              <a href={APP_ORIGIN + "/sitemap.xml"} className={linkClass}>Mapa do site</a>
            </nav>
            <div className="space-y-2 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
              <p><strong className="text-foreground">Upplin LTDA © Copyright {new Date().getFullYear()}</strong><br />CNPJ: 64.948.872/0001-69</p>
              <address className="not-italic">Rua Barbosa de Freitas, nº 1741 - Sala 04 - Aldeota. Fortaleza/CE - 60170-021</address>
              <a href="mailto:suporte@upplin.com" className={cn(linkClass,"inline-block")}>suporte@upplin.com</a>
              <div className="flex items-center gap-3"><span>@upplin.app</span>
                <a href="https://www.instagram.com/upplin.app/" target="_blank" rel="noopener noreferrer" aria-label="Instagram da UPPLIN (@upplin.app)" className={cn(linkClass,"flex h-11 w-11 items-center justify-center rounded-xl border border-border")}><Instagram className="h-4 w-4" aria-hidden="true" /></a>
                <a href="https://www.tiktok.com/@upplin.app" target="_blank" rel="noopener noreferrer" aria-label="TikTok da UPPLIN (@upplin.app)" className={cn(linkClass,"flex h-11 w-11 items-center justify-center rounded-xl border border-border")}><TikTokIcon /></a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </nav>
      {!feed && <a href={PLANS_ORIGIN + "/"} className={cn(linkClass,"text-[11px]")}>Seja organizador</a>}
    </div>
  </footer>;
}
