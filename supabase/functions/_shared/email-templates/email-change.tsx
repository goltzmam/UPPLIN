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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme a alteração do seu e-mail na {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>UPPLIN</Text>
        <Heading style={h1}>Confirmar alteração de e-mail</Heading>
        <Text style={text}>
          Recebemos um pedido para trocar o e-mail da sua conta na {siteName} de{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          para{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Se foi você, confirme a alteração no botão abaixo.
        </Text>
        <EmailButton href={confirmationUrl}>
          Confirmar alteração
        </EmailButton>
        <Text style={footer}>
          Se você não reconhece essa solicitação, proteja sua conta imediatamente e ignore este e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
