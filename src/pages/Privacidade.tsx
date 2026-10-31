import { Link } from "react-router-dom";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { PRIVACY_POLICY } from "@/content/privacy-policy";

export default function Privacidade() {
  return (
    <LegalLayout
      title={PRIVACY_POLICY.title}
      metaTitle="Política de Privacidade Geral | UPPLIN"
      metaDescription={PRIVACY_POLICY.description}
      canonical="https://www.upplin.com/privacidade"
      badge="LGPD · UPPLIN"
      updatedAt={PRIVACY_POLICY.updatedAt}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">{PRIVACY_POLICY.introduction}</p>
      <nav aria-label="Nesta política" className="rounded-2xl border border-border bg-card/40 p-5">
        <h2 className="mb-3 font-semibold">Nesta política</h2>
        <ul className="space-y-2 text-sm">
          {PRIVACY_POLICY.sections.map(section => <li key={section.id}><a className="text-primary underline underline-offset-4" href={`#${section.id}`}>{section.title}</a></li>)}
        </ul>
      </nav>
      {PRIVACY_POLICY.sections.map(section => (
        <section key={section.id} id={section.id} className="scroll-mt-6 space-y-3">
          <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            {section.links && <ul className="space-y-2">{section.links.map(link => <li key={link.href}>{link.href.startsWith("/")
              ? <Link to={link.href} className="text-primary underline underline-offset-4">{link.label}</Link>
              : <a href={link.href} className="text-primary underline underline-offset-4">{link.label}</a>}</li>)}</ul>}
          </div>
        </section>
      ))}
    </LegalLayout>
  );
}
