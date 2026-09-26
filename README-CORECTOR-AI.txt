FORMULA X — CORECTOR AI HARAP-ALB
===================================

CE ESTE DEJA FĂCUT
- lectii/romana/harap-alb.html conține noua secțiune „Corectitudinea informațiilor”.
- Butonul „Verifică” rulează mai întâi corectorul local existent, apoi corectorul factual AI.
- Dacă funcția Supabase nu este încă activată, pagina intră automat în MOD DEMONSTRATIV LOCAL pentru câteva erori tipice.
- Am adăugat butonul „Exemplu cu informații greșite”, ca să vezi imediat interfața.

ACTIVAREA AI-ULUI REAL
1. În Supabase creează/deployează Edge Function cu numele:
   corecteaza-harap-alb
   Codul este în: supabase/functions/corecteaza-harap-alb/index.ts

2. Funcția trebuie să fie publică, deoarece lecția Harap-Alb este publică.
   Cu CLI:
   supabase functions deploy corecteaza-harap-alb --no-verify-jwt

3. Supabase Dashboard -> Edge Functions -> Secrets
   adaugă:
   OPENAI_API_KEY = cheia ta OpenAI

   Opțional:
   OPENAI_MODEL = gpt-5.6-luna
   ALLOWED_ORIGINS = https://formula-x.ro,https://www.formula-x.ro

4. În GitHub înlocuiește:
   lectii/romana/harap-alb.html
   cu fișierul din acest pachet.

TEST RAPID
- Deschide lecția -> „Scrie și verifică”.
- Apasă „Exemplu cu informații greșite”.
- Apasă „Verifică”.
- Dacă Edge Function este activă: apare „Analiză semantică realizată prin motorul AI”.
- Dacă nu este activă: apare „Mod demonstrativ local”.

IMPORTANT
- OPENAI_API_KEY nu se pune în HTML și nu se urcă pe GitHub.
- Cheia rămâne în Supabase Secrets.
- Funcția folosește ghidul Formula X ca sursă de adevăr și este instruită să nu marcheze interpretări drept greșite dacă nu sunt contrazise clar de ghid.
- În această versiune de test, erorile factuale NU scad automat punctajul. După ce validăm comportamentul pe lucrări reale, putem lega verificarea de punctajul pe reper.
