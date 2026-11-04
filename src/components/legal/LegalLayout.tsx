import { Helmet } from "react-helmet-async";
import { BackBar } from "./BackBar";
import { Shield } from "lucide-react";

interface LegalLayoutProps {
  title: string;
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  badge: string;
  updatedAt: string;
  backTo?: string;
  children: React.ReactNode;
}

export function LegalLayout({
  title,
  metaTitle,
  metaDescription,
  canonical,
  badge,
  updatedAt,
  backTo = "/",
  children,
}: LegalLayoutProps) {
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
        <BackBar fallback={backTo} sidebarGap />
        <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 pt-4 lg:py-12 lg:pt-8">
          <header className="mt-2 mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              {badge}
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
            <p className="text-sm text-muted-foreground">Última atualização: {updatedAt}</p>
          </header>

          <div className="space-y-10">{children}</div>
        </div>
      </main>
    </>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="text-sm leading-relaxed text-muted-foreground space-y-3">{children}</div>
    </section>
  );
}
