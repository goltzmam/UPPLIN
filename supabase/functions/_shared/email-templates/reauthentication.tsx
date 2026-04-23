/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação da UPPLIN</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>UPPLIN</Text>
        <Heading style={h1}>Confirme sua identidade</Heading>
        <Text style={text}>
          Use o código abaixo para concluir esta verificação com segurança.
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Esse código expira em breve. Se você não iniciou essa ação, ignore este e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "Inter, Arial, sans-serif",
  margin: '0',
  padding: '32px 16px',
}

const container = {
  maxWidth: '520px',
  margin: '0 auto',
  padding: '32px',
  borderRadius: '16px',
  border: '1px solid hsl(0 0% 90%)',
  borderTop: '6px solid hsl(0 85% 56%)',
  boxShadow: '0 18px 40px rgba(0, 0, 0, 0.08)',
}

const eyebrow = {
  fontSize: '12px',
  fontWeight: '700' as const,
  letterSpacing: '1.6px',
  textTransform: 'uppercase' as const,
  color: 'hsl(0 85% 56%)',
  margin: '0 0 16px',
}

const h1 = {
  fontSize: '28px',
  lineHeight: '1.2',
  fontWeight: '700' as const,
  color: 'hsl(0 0% 6%)',
  margin: '0 0 16px',
}

const text = {
  fontSize: '15px',
  color: 'hsl(0 0% 22%)',
  lineHeight: '1.7',
  margin: '0 0 18px',
}

const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: '700' as const,
  color: 'hsl(0 0% 6%)',
  letterSpacing: '4px',
  margin: '0 0 24px',
}

const footer = {
  fontSize: '13px',
  color: 'hsl(0 0% 38%)',
  lineHeight: '1.6',
  margin: '24px 0 0',
}
