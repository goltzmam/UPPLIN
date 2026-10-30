// Table/inline styles survive Gmail sanitization and Outlook's Word renderer.
// Escape attributes only: the original Supabase URL and token remain unchanged.
export function emailButtonHtml(href: string, label: string) {
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto;border-collapse:separate;"><tr><td align="center" bgcolor="#EF4444" style="background-color:#EF4444;border-radius:12px;mso-padding-alt:16px 24px;"><a href="${escape(href)}" target="_blank" style="display:inline-block;background-color:#EF4444;color:#FFFFFF;border:1px solid #EF4444;border-radius:12px;padding:16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;font-weight:700;text-align:center;text-decoration:none;">${escape(label)}</a></td></tr></table>`;
}
