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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Você recebeu um convite para entrar na {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>UPPLIN</Text>
        <Heading style={h1}>Seu convite está pronto</Heading>
        <Text style={text}>
          Você foi convidado para criar seu acesso na{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          .
        </Text>
        <Text style={text}>
          Clique no botão abaixo para aceitar o convite e continuar seu cadastro.
        </Text>
        <EmailButton href={confirmationUrl}>
          Aceitar convite
        </EmailButton>
        <Text style={footer}>
          Se você não esperava este convite, pode ignorar este e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
