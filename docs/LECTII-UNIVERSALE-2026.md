> Actualizare 9 noiembrie: vezi [analiza fluxului stabil și instalarea actuală](FLUX-LECTII-STABIL-2026.md). Se folosește versiunea actuală a instalatorului SQL din această ramură.

# Formula X · Lecții universale (8 noiembrie 2026)

## Ce s-a făcut în GitHub
- Site-ul **nu mai redirecționează automat** profesorii către portal. Profesorii pot intra în pagina principală și în **Teste BAC**, iar portalul rămâne accesibil separat.
- Profesorii au un **Studio vizual** la `/profesori/studio.html` pentru lecții noi, imagini, repere, exerciții și editări.
- Importul pentru materialele **„Luceafărul” și „Plumb”** este la `/profesori/importa-literatura.html`. Acesta creează lecții în baza de date folosind contul autorizat și nu suprascrie materiale existente.
- Lecțiile conțin scheme de memorare, explicații, planuri de eseu și teste grilă.
- S-a adăugat în portalul profesorilor un link direct **Teste BAC**.

## Pasul obligatoriu și unic în Supabase
1. Intră în proiectul Supabase Formula X → **SQL Editor** → **New query**.
2. Copiază **integral**, fără modificări, fișierul din rădăcina repository-ului:
   [SUPABASE-UNIVERSAL-LECTII-2026.sql](../SUPABASE-UNIVERSAL-LECTII-2026.sql).
3. Execută SQL-ul o singură dată; trebuie să se încheie fără eroare.
4. Dacă baza de date nu are încă funcțiile existente ale bibliotecii `fx_create_lesson`, `fx_open_lesson`, `fx_teacher_lesson_catalog`, `fx_set_lesson_enabled`, SQL-ul se oprește explicit. În acest caz trebuie instalată întâi schema de acces a lecțiilor existentă în site; scriptul universal nu înlocuiește acea migrare.
5. Reîncarcă portalul profesorului.

## Importul celor două lecții
1. Autentifică-te ca profesor de Română sau administrator.
2. Deschide `https://formula-x.ro/profesori/importa-literatura.html`.
3. Apasă **Importă în Formula X** pe fiecare lecție.
4. În `https://formula-x.ro/profesori/` → **Lecții**, activează sau oprește publicarea, selectează elevii ori grupele și stabilește intervalele de acces.
5. Deschide lecția din contul unui elev autorizat și verifică chestionarul. Elevii fără acces trebuie să primească mesajul de blocare, fără conținutul lecției.

## Pentru toate lecțiile viitoare
Nu se mai execută SQL separat. Profesorul deschide `/profesori/studio.html`, construiește lecția din blocuri și o salvează; apoi gestionează publicarea și accesul din portal. Administratorul poate administra toate materiile, iar profesorul doar materia pe care o predă. Verificarea drepturilor de acces este pe server, prin Supabase.

## Precauții
- Nu introduce niciodată cheia `service_role` în HTML sau JavaScript.
- Nu transforma în publice lecțiile, politicile sau fișierele media doar pentru a ocoli o eroare de acces.
- **Important pentru materiale cu plată:** repository-ul actual este public, iar fișierul JavaScript folosit pentru import conține sursele celor două lecții; acestea pot fi consultate în repository independent de accesul controlat pe site. Dacă materialele trebuie să fie confidențiale și în afara site-ului, importă-le și mută sursele într-un sistem privat, apoi elimină sursele publice din istoricul și fluxul de publicare. Pagina pentru elevi rămâne protejată de autorizarea serverului.
- Nu șterge baza de date și nu reexecuta migrații vechi incompatibile. SQL-ul universal poate fi rulat din nou doar pentru a reface editorul, nu pentru o lecție nouă.

## Verificare
```bash
node --check assets/fx-curated-literature-2027.js
node --check assets/fx-curated-importer.js
node tests/curated-lessons.cjs
node tests/lesson-studio.cjs
```

