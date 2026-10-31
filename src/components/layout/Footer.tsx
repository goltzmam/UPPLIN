import { Capacitor } from "@capacitor/core";
import { Link } from "react-router-dom";
import { ArrowUpRight, Instagram, Mail } from "lucide-react";
import { APP_ORIGIN, PLANS_ORIGIN, webSurface } from "@/lib/web-surfaces";
import { cn } from "@/lib/utils";

const linkClass = "text-sm leading-6 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background rounded-sm";
function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return webSurface(window.location.hostname) === "plans"
    ? <a className={linkClass} href={APP_ORIGIN + to}>{children}</a>
    : <Link className={linkClass} to={to}>{children}</Link>;
}
function TikTokIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true"><path d="M12.53.02h3.98c.26 2.27 1.53 4.31 3.45 5.52 1.1.7 2.39 1.08 3.69 1.09v4.01a11.5 11.5 0 0 1-7.12-2.37v8.34a7.4 7.4 0 1 1-6.38-7.32v4.1a3.35 3.35 0 1 0 2.38 3.22V.02Z" /></svg>;
}

export function Footer({ inset = false, bottomNavigation = false }: { inset?: boolean; bottomNavigation?: boolean }) {
  if (Capacitor.isNativePlatform() || webSurface(window.location.hostname) === "admin") return null;
  return <footer id="rodape" aria-label="Rodapé UPPLIN" className={cn("relative border-t border-border/60 bg-[#09090b] text-foreground",inset && "lg:ml-[72px]")}>
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" aria-hidden="true" />
    <div className="mx-auto max-w-7xl px-5 pt-12 sm:px-8 sm:pt-14 lg:px-12">
      <div className="grid grid-cols-1 gap-9 pb-10 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:gap-12">
        <div className="space-y-4">
          <a href={APP_ORIGIN + "/"} aria-label="UPPLIN — início" className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="font-display text-3xl font-bold tracking-tight bg-gradient-to-r from-[#FF6A00] via-[#FF2D2D] to-[#FF007A] bg-clip-text text-transparent">UPPLIN</span></a>
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">Descubra eventos perto de você, acompanhe organizadores e encontre sua próxima experiência.</p>
          <a href={PLANS_ORIGIN + "/"} className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm">Quer organizar um evento?<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
        </div>
        <nav aria-label="Rodapé: seja organizador" className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Seja organizador</h2>
          <ul className="space-y-2.5">
            <li><a href={PLANS_ORIGIN + "/"} className={linkClass}>Conheça a plataforma</a></li>
            <li><a href={PLANS_ORIGIN + "/#precos"} className={linkClass}>Planos e recursos</a></li>
            <li><FooterLink to="/organizador/cadastro">Crie sua conta de organizador</FooterLink></li>
            <li><FooterLink to="/organizador/login">Entrar no painel</FooterLink></li>
            <li><details className="group"><summary className={cn(linkClass,"cursor-pointer marker:text-muted-foreground/50")}>Políticas dos planos</summary><ul className="mt-2 space-y-2 border-l border-border pl-3"><li><FooterLink to="/politica/standart">Plano Standart</FooterLink></li><li><FooterLink to="/politica/pro">Plano Pro</FooterLink></li><li><FooterLink to="/politica/enterprise">Plano Enterprise</FooterLink></li></ul></details></li>
          </ul>
        </nav>
        <nav aria-label="Rodapé: explore a UPPLIN" className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Explore a UPPLIN</h2>
          <ul className="space-y-2.5"><li><FooterLink to="/eventos">Encontre eventos</FooterLink></li><li><FooterLink to="/por-perto">Eventos por perto</FooterLink></li><li><FooterLink to="/explorar-organizadores">Conheça os organizadores</FooterLink></li><li><FooterLink to="/meus-ingressos">Meus ingressos</FooterLink></li></ul>
        </nav>
        <nav aria-label="Rodapé: ajuda e atendimento" className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Ajuda e atendimento</h2>
          <ul className="space-y-2.5"><li><FooterLink to="/suporte">Central de suporte</FooterLink></li><li><FooterLink to="/suporte">Segurança e denúncias</FooterLink></li><li><FooterLink to="/excluir-conta">Excluir minha conta</FooterLink></li><li><a href="mailto:suporte@upplin.com" className={cn(linkClass,"inline-flex items-center gap-2 break-all")}><Mail className="h-4 w-4 shrink-0" aria-hidden="true" />suporte@upplin.com</a></li></ul>
        </nav>
      </div>
      <div className="border-t border-border/60 py-6">
        <nav aria-label="Termos e políticas da UPPLIN" className="flex flex-wrap gap-x-5 gap-y-3"><FooterLink to="/termos">Termos de uso</FooterLink><FooterLink to="/privacidade">Política de privacidade</FooterLink><a href={APP_ORIGIN + "/sitemap.xml"} className={linkClass}>Mapa do site</a>
          <details className="basis-full sm:basis-auto"><summary className={cn(linkClass,"cursor-pointer marker:text-muted-foreground/50")}>Documentos por perfil</summary><div className="mt-3 flex flex-col gap-2"><FooterLink to="/termos/participante">Termos do participante</FooterLink><FooterLink to="/privacidade/participante">Privacidade do participante</FooterLink><FooterLink to="/termos/organizador">Termos do organizador</FooterLink><FooterLink to="/privacidade/organizador">Privacidade do organizador</FooterLink></div></details>
        </nav>
      </div>
      <div className={cn("flex flex-col justify-between gap-6 border-t border-border/40 pt-6 sm:flex-row sm:items-start", bottomNavigation ? "pb-28 lg:pb-8" : "pb-8")}>
        <div className="min-w-0 space-y-2 text-xs leading-6 text-muted-foreground">
          <p><span className="font-semibold text-foreground/80">Upplin LTDA © Copyright {new Date().getFullYear()}</span><span className="px-1.5" aria-hidden="true">·</span><strong className="font-medium">CNPJ:</strong> 64.948.872/0001-69</p>
          <address className="not-italic">Rua Barbosa de Freitas, nº 1741 - Sala 04 - Aldeota.<br className="sm:hidden" /> Fortaleza/CE - 60170-021</address>
          <p>Precisa de ajuda? <FooterLink to="/suporte">Entre em contato com o suporte</FooterLink></p>
        </div>
        <div className="shrink-0 space-y-2"><p className="text-xs text-muted-foreground">Siga @upplin.app</p><div className="flex gap-2">
          <a href="https://www.instagram.com/upplin.app/" target="_blank" rel="noopener noreferrer" aria-label="Instagram da UPPLIN (@upplin.app)" className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Instagram className="h-5 w-5" aria-hidden="true" /></a>
          <a href="https://www.tiktok.com/@upplin.app" target="_blank" rel="noopener noreferrer" aria-label="TikTok da UPPLIN (@upplin.app)" className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><TikTokIcon /></a>
        </div></div>
      </div>
    </div>
  </footer>;
}
