import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { emailButtonHtml } from "./email-button.ts";
Deno.test("email CTA keeps the complete dynamic URL and uses table/inline HEX styling", () => {
  const url = "https://www.upplin.com/redefinir-senha#token_hash=real-dynamic-value&type=recovery";
  const html = emailButtonHtml(url, "Redefinir minha senha");
  assertStringIncludes(html, 'role="presentation"');
  assertStringIncludes(html, 'bgcolor="#EF4444"');
  assertStringIncludes(html, 'color:#FFFFFF');
  assertStringIncludes(html, 'border-radius:12px');
  assertStringIncludes(html, 'padding:16px 24px');
  assertEquals(html.match(/href="([^"]+)"/)?.[1].replaceAll('&amp;', '&'), url);
  assertEquals(html.includes('hsl('),false);
});
Deno.test("email CTA escapes attribute and label markup", () => {
  const html = emailButtonHtml('https://www.upplin.com/?v="&x=<a>', '<script>');
  assertEquals(html.includes('v="&'),false);
  assertEquals(html.includes('<script>'),false);
  assertStringIncludes(html,'&lt;script&gt;');
});
