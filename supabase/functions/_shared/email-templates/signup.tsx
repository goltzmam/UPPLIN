import { EmailButton } from './email-button.tsx'
/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu e-mail para ativar sua conta na {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>UPPLIN</Text>
        <Heading style={h1}>Confirme seu e-mail</Heading>
        <Text style={text}>
          Que bom ter você com a gente na{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          .
        </Text>
        <Text style={text}>
          Para ativar sua conta com o e-mail{' '}
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          , confirme o endereço clicando no botão abaixo.
        </Text>
        <EmailButton href={confirmationUrl}>
          Confirmar meu e-mail
        </EmailButton>
        <Text style={text}>
          Depois da confirmação, você verá a tela de boas-vindas e poderá entrar para continuar seu cadastro.
        </Text>
        <Text style={footer}>
          Se você não criou uma conta, pode ignorar esta mensagem com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, Arial, sans-serif',
  margin: '0',
  padding: '32px 16px',
}

const container = {
  maxWidth: '520px',
  margin: '0 auto',
  padding: '32px',
  borderRadius: '16px',
  border: '1px solid #E6E6E6',
  borderTop: '6px solid #EE2F2F',
  boxShadow: '0 18px 40px rgba(0, 0, 0, 0.08)',
}

const eyebrow = {
  fontSize: '12px',
  fontWeight: '700' as const,
  letterSpacing: '1.6px',
  textTransform: 'uppercase' as const,
  color: '#EE2F2F',
  margin: '0 0 16px',
}

const h1 = {
  fontFamily: 'Space Grotesk, Inter, Arial, sans-serif',
  fontSize: '28px',
  lineHeight: '1.2',
  fontWeight: '700' as const,
  color: '#0F0F0F',
  margin: '0 0 16px',
}

const text = {
  fontSize: '15px',
  color: '#383838',
  lineHeight: '1.7',
  margin: '0 0 18px',
}

const link = {
  color: '#EE2F2F',
  textDecoration: 'underline',
}


const footer = {
  fontSize: '13px',
  color: '#616161',
  lineHeight: '1.6',
  margin: '24px 0 0',
}
