import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Users, Building2, Shield } from "lucide-react";

interface RoleSelectorProps {
  title: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  participantHref: string;
  organizerHref: string;
}

export function RoleSelector({
  title,
  subtitle,
  metaTitle,
  metaDescription,
  canonical,
  participantHref,
  organizerHref,
}: RoleSelectorProps) {
  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
      </Helmet>

      <main className="min-h-[100dvh] bg-background text-foreground lg:ml-[72px]">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 lg:py-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          <header className="mt-6 mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              Escolha seu perfil
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            <RoleCard
              to={participantHref}
              icon={<Users className="h-5 w-5" />}
              label="Sou Participante"
              description="Comprou ou pretende comprar ingressos e usar o feed social."
            />
            <RoleCard
              to={organizerHref}
              icon={<Building2 className="h-5 w-5" />}
              label="Sou Organizador"
              description="Publica eventos, vende ingressos e gerencia compradores."
            />
          </div>
        </div>
      </main>
    </>
  );
}

function RoleCard({
  to,
  icon,
  label,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group relative rounded-2xl border border-border/60 bg-card/40 p-5 transition-all hover:border-primary/50 hover:bg-card/70"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">{label}</p>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}
