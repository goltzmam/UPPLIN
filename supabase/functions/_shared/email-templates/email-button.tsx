import * as React from 'npm:react@18.3.1'
import { emailButtonHtml } from '../email-button.ts'
export function EmailButton({ href, children }: { href: string; children: string }) {
  return <div dangerouslySetInnerHTML={{ __html: emailButtonHtml(href, children) }} />
}
