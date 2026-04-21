---
name: location-and-city-priority
description: City/state on profile, GPS reverse-geocoding, and city priority chain for the feed
type: feature
---
## Cidade do usuário no feed

**Campos no perfil:** `profiles.city` e `profiles.state` são opcionais. Coletados (sem obrigar) no `Cadastro.tsx` e editáveis em `ProfileSettings.tsx`. Endereço completo NÃO é coletado para participantes — só cidade/UF, para evitar fricção e respeitar LGPD.

**Hierarquia da cidade ativa (`useUserLocation`)**:
1. **Manual** — usuário escolheu via "Mudar cidade" (`upplin_manual_city`)
2. **GPS** — coordenadas atuais + reverse-geocode (Nominatim, cache 7d)
3. **Perfil** — `profile.city` salvo no banco
4. **Padrão** — null (chamador decide)

**Priorização no feed (Index.tsx)**: eventos com lat/lng dentro de 80km do GPS vêm primeiro; depois eventos cujo `address_text`/`venue_name` contém o nome normalizado da cidade ativa; o restante segue a ordem de "não vistos".

**Banners (não-bloqueantes, dismissíveis):**
- `LocationPrompt` — pede permissão GPS na 1ª visita (TTL dismiss 7d)
- `CityChangePrompt` — confirma mudança de cidade detectada por GPS (TTL skip 12h)
- `ProfileCityBanner` — só pra logados sem `profile.city` (TTL dismiss 14d, delay 4s)
