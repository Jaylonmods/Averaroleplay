# avera Website

En FiveM server hjemmeside bygget med Next.js og Tailwind CSS.

## Funktioner

- Discord OAuth login
- Moderne design med chrome gray farver
- Responsivt layout
- Baggrundsbilleder fra billed mappen

## Installation

1. Installer dependencies:
```bash
npm install
```

2. Opret en `.env.local` fil med følgende indhold:
```
DISCORD_CLIENT_ID=din_discord_client_id
DISCORD_CLIENT_SECRET=din_discord_client_secret
DISCORD_BOT_TOKEN=din_discord_bot_token
DISCORD_GUILD_ID=din_discord_guild_id
DISCORD_ADMIN_ROLE_IDS=1433218423160180787,1450205502599463133
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=din_random_secret_her
```

For at få Discord credentials:

**OAuth2 credentials (til login):**
- Gå til https://discord.com/developers/applications
- Opret en ny application eller vælg din eksisterende
- Gå til "OAuth2" sektionen
- Under "Redirects", tilføj følgende URLs:
  - `http://localhost:3000/api/auth/callback/discord` (til lokal udvikling)
  - Hvis du deployer til produktion, tilføj også: `https://dit-domain.com/api/auth/callback/discord`
- Kopier "Client ID" og "Client Secret" fra OAuth2 sektionen

**Bot Token:**
- I samme Discord application, gå til "Bot" sektionen
- Klik på "Reset Token" eller "Copy" for at se din bot token
- Kopier tokenet og sæt det som `DISCORD_BOT_TOKEN` i `.env.local`
- **Vigtigt:** Hold dit bot token hemmeligt og del det aldrig!

**Guild ID:**
- Gå til din Discord server
- Højreklik på server navnet → "Server ID" (hvis Developer Mode er aktiveret)
- Ellers: Aktiver Developer Mode i Discord indstillinger → Advanced → Developer Mode
- Kopier Guild ID og sæt det som `DISCORD_GUILD_ID` i `.env.local`

**Admin Role IDs:**
- Gå til din Discord server
- Højreklik på admin rollen → "Copy ID" (hvis Developer Mode er aktiveret)
- Tilføj alle admin role IDs som kommaseparerede værdier: `DISCORD_ADMIN_ROLE_IDS=role_id_1,role_id_2`
- Eksempel: `DISCORD_ADMIN_ROLE_IDS=1433218423160180787,1450205502599463133`

**OAuth2 URL Generator:**
- Gå til "OAuth2" → "URL Generator"
- Vælg scopes: `identify` og `email`
- Vælg redirect URL: `http://localhost:3000/api/auth/callback/discord`
- Den genererede URL kan bruges til at teste OAuth flowet

3. Kør udviklingsserveren:
```bash
npm run dev
```

4. Åbn [http://localhost:3000](http://localhost:3000) i din browser.

## Upload til egen server (standalone)

Build laver en **selvstændig mappe** du kan uploade til enhver server med Node.js:

1. **Byg projektet:**
   ```bash
   npm run build
   ```

2. **Upload mappen** `build/standalone` til din server (FTP, SSH, filmanager osv.). Hele mappen skal med – inkl. `server.js`, `node_modules`, `.next`, `build`, `public`.

3. **Sæt miljøvariabler** på serveren (samme som i `.env.local`). Fx:
   ```bash
   export NEXTAUTH_URL=https://dit-domain.dk
   export NEXTAUTH_SECRET=din_secret
   export DISCORD_CLIENT_ID=...
   export DISCORD_CLIENT_SECRET=...
   # osv.
   ```

4. **Start serveren** fra `build/standalone`:
   ```bash
   cd build/standalone
   node server.js
   ```
   Port er 3000 som standard. Anden port: `PORT=8080 node server.js`.

Så har du en komplet hjemmeside i én mappe – login, API og admin virker som normalt.

## Deployment til Render.com

### Forberedelse

1. **Push dit projekt til GitHub/GitLab/Bitbucket**
   - Sørg for at alle dine ændringer er committet og pushet

2. **Opdater Discord OAuth Redirect URLs**
   - Gå til https://discord.com/developers/applications
   - Vælg din application
   - Gå til "OAuth2" → "Redirects"
   - Tilføj din Render URL: `https://dit-app-navn.onrender.com/api/auth/callback/discord`
   - **Vigtigt:** Du skal vente med at tilføje den endelige URL, indtil du har fået den fra Render

### Deployment på Render

1. **Opret en ny Web Service på Render**
   - Gå til https://render.com og log ind
   - Klik på "New +" → "Web Service"
   - Forbind dit GitHub/GitLab/Bitbucket repository
   - Vælg dit repository og branch

2. **Konfigurer service indstillinger**
   - **Name:** Vælg et navn (fx `nyhjemmeisde`)
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Vælg en plan (Free tier er fint til start)

3. **Sæt miljøvariabler**
   I Render dashboard, under "Environment" sektionen, tilføj følgende:
   
   ```
   NODE_ENV=production
   NEXTAUTH_URL=https://dit-app-navn.onrender.com
   NEXTAUTH_SECRET=din_random_secret_her (brug en lang tilfældig streng)
   DISCORD_CLIENT_ID=din_discord_client_id
   DISCORD_CLIENT_SECRET=din_discord_client_secret
   DISCORD_BOT_TOKEN=din_discord_bot_token
   DISCORD_GUILD_ID=din_discord_guild_id
   DISCORD_ADMIN_ROLE_IDS=1433218423160180787,1450205502599463133
   ```
   
   **Vigtigt:**
   - `NEXTAUTH_URL` skal være din fulde Render URL (fx `https://nyhjemmeisde.onrender.com`)
   - `NEXTAUTH_SECRET` kan genereres med: `openssl rand -base64 32` eller en online generator
   - Efter første deployment, opdater `NEXTAUTH_URL` med den faktiske URL Render giver dig

4. **Deploy**
   - Klik på "Create Web Service"
   - Render vil nu bygge og deploye din app
   - Det tager typisk 5-10 minutter første gang

5. **Opdater Discord OAuth efter deployment**
   - Når din app er deployet, kopier den fulde URL fra Render
   - Gå tilbage til Discord Developer Portal
   - Tilføj callback URL: `https://dit-app-navn.onrender.com/api/auth/callback/discord`
   - Opdater `NEXTAUTH_URL` i Render environment variables hvis nødvendigt

### Automatisk deployment

Render deployer automatisk når du pusher til din main/master branch. Du kan også manuelt trigger en deployment fra Render dashboard.

### Troubleshooting

- **Build fejler:** Tjek build logs i Render dashboard
- **App starter ikke:** Tjek at `startCommand` er `npm start` og at alle miljøvariabler er sat
- **OAuth virker ikke:** Tjek at callback URL i Discord matcher din Render URL præcist
- **Timeout:** Free tier har en 15 minutters timeout hvis der ikke er aktivitet. Overvej at opgradere til en betalt plan for at undgå dette

#### "Ugyldig URL til OAuth2-omdirigering" (Discord)

1. **Render – Environment:** `NEXTAUTH_URL` skal være **uden** afsluttende `/`, fx `https://averarp.onrender.com` (ikke `https://averarp.onrender.com/`).
2. **Discord Developer Portal** → din app → **OAuth2** → **Redirects** → tilføj **præcis** én redirect:
   - `https://averarp.onrender.com/api/auth/callback/discord`  
   (ingen mellemrum, ingen `/` efter `discord`, kun `https`).
3. **Samme app:** Den Discord-app hvor du tilføjede redirect ovenfor skal have **samme Client ID** som `DISCORD_CLIENT_ID` på Render. Hvis du har flere Discord-apps, tilføj redirect i den app hvis Client ID du bruger på Render.
4. Gem i Discord, vent 1–2 minutter, prøv login igen (evt. i inkognitovindue eller efter at have slettet cookies for discord.com og din side).

## Struktur

- `app/` - Next.js App Router filer
- `components/` - React komponenter
- `public/billed/` - Billeder til baggrund
- `app/api/auth/` - NextAuth API routes
- `render.yaml` - Render deployment konfiguration