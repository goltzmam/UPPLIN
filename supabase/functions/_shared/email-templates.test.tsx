import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { RecoveryEmail } from './email-templates/recovery.tsx';
import { SignupEmail } from './email-templates/signup.tsx';
import { MagicLinkEmail } from './email-templates/magic-link.tsx';
import { InviteEmail } from './email-templates/invite.tsx';
import { EmailChangeEmail } from './email-templates/email-change.tsx';
Deno.test('all auth CTA templates retain inline styling and the complete supplied dynamic URL',async()=>{
 const url='https://www.upplin.com/redefinir-senha#token_hash=fixture-digest&type=recovery';
 const props={siteName:'UPPLIN',siteUrl:'https://www.upplin.com',recipient:'fixture@example.invalid',confirmationUrl:url,email:'fixture@example.invalid',newEmail:'new@example.invalid'};
 for(const Template of [RecoveryEmail,SignupEmail,MagicLinkEmail,InviteEmail,EmailChangeEmail]){
  const html=await renderAsync(React.createElement<typeof props>(Template,props));
  assertEquals(html.includes('hsl('),false);
  assertStringIncludes(html,'bgcolor="#EF4444"');
  assertStringIncludes(html,'padding:16px 24px');
  assertStringIncludes(html,'color:#FFFFFF');
  assertStringIncludes(html,url.replaceAll('&','&amp;'));
 }
});
