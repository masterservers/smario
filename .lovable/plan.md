# Putin vs Trump — Live Battle Arena

Un joc live tip "TikTok battle": doi luptători în ring, scor Rusia vs USA, spectatori care trimit cadouri prin chat, arbitru și crainic care comentează în 5 limbi.

## Ce construim

### 1. Ecranul de joc (pagina principală)
- Scoreboard sus: steag Rusia + scor | VS | steag USA + scor, exact ca în imagine.
- Ringul de wrestling cu Putin (stânga) și Trump (dreapta), animați.
- Când un cadou intră pentru o tabără, luptătorul respectiv execută o lovitură (pumn, kick, slam), celălalt încasează și pierde HP; bare de viață deasupra fiecăruia.
- Efecte: floating gifts, combo "+10 WIN", shake la impact, sunete.
- Arbitrul în ring: numără knockdown-urile, semnalizează runda, oprește lupta la KO.
- Overlay chat live jos, cu mesajele și cadourile primite în timp real.

### 2. Cadouri și comenzi din chat
- Utilizatorii scriu în chat: `RUSIA` / `PUTIN` → cadoul merge la Putin; `USA` / `TRUMP` → cadoul merge la Trump.
- Butoane rapide de cadouri (Trandafir, Donut, TikTok, Gift box), fiecare cu valoare diferită = damage diferit.
- Fiecare cadou: +puncte la scorul taberei, animație de lovitură, contor de combo.

### 3. Crainic + arbitru multilingv
- Comentator care vorbește permanent (text pe ecran + voce), reacționând la lovituri, combo-uri, KO, schimbări de lider.
- Limbi: engleză, germană, sârbă, română, rusă.
- Limba se alege din URL: `/?lang=ro`, `/?lang=ru`, `/?lang=en`, `/?lang=de`, `/?lang=sr` — schimbarea se aplică instant, fără reload.
- Voce prin sinteză vocală în limba selectată; comentariile sunt generate din șabloane variate ca să nu se repete.

### 4. Live / multi-user
- Camera live: oricine deschide link-ul vede aceeași luptă, același scor, aceleași cadouri, în timp real.
- Backend Lovable Cloud: tabel pentru meciul curent (scor, HP, rundă) și tabel pentru evenimente (cadouri/mesaje), sincronizate live între toți vizitatorii.
- Istoric: clasament zilnic (cine a trimis cele mai multe cadouri) și rezultatul meciurilor.

### 5. Verificare în browser (background)
La final rulez verificări automate în browser pe pagina live: pornesc o luptă simulată, trimit cadouri pentru ambele tabere, verific scorul, animațiile, comentariul în fiecare limbă și fac capturi de ecran pe care ți le arăt.

## Ordinea de lucru
1. Design system + scoreboard și ring static (arată exact ca în imagine).
2. Animații luptători + cadouri + bare de viață + arbitru.
3. Sistem multilingv + crainic cu voce.
4. Lovable Cloud: sincronizare live între utilizatori, chat, clasament.
5. Verificare în browser + capturi.

## Detalii tehnice
- TanStack Start + React, Tailwind, animații CSS/Framer-style; personaje generate ca imagini (sprite pe poziții: idle, punch, kick, hit, KO) pentru calitate vizuală fără cost 3D.
- Lovable Cloud (Postgres + realtime) pentru starea meciului și fluxul de cadouri; RLS: citire publică, scriere doar prin server functions validate.
- Comentariul: motor de șabloane pe limbă + Web Speech API pentru voce; fallback text dacă vocea nu e disponibilă în limbă.
- Limba din query param, sincronizată cu starea aplicației.

## De confirmat
- Cadourile sunt gratuite (doar simbolice, pentru distracție) — fără plăți reale, corect?
- Vrei ca lupta să ruleze non-stop (reset automat după KO) sau doar când pornești tu un meci?
