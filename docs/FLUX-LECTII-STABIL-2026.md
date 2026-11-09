# Formula X: navigare, editor comun și salvare în Supabase

Analiză pornită de la `main`, commit `85fb069f4c54b5afeebbab279046e13caf08a757`, din 8 noiembrie 2026. Constatările privesc sursa și fluxul de publicare din GitHub; nu presupun că SQL-ul din repository a fost deja executat în proiectul Supabase.

## Cauzele identificate

| Problemă | Locul exact în versiunea analizată | Efect |
| --- | --- | --- |
| Corecția navigării putea dispărea la publicare | `.github/workflows/static.yml`, pasul `Prepare verified Formula X lesson files`: `release.extractall('.')`, urmat de restaurarea a numai patru fișiere JS | Arhiva veche înlocuia `index.html`, `profesori/index.html`, `assets/formula-x-portal.js` și pagina bibliotecii. Mesajul workflow-ului spunea că pagina principală era păstrată, dar codul nu o păstra. |
| Redirecționarea era legată istoric de autentificare | `index.html`, `redirectStaffToPortal()`, apelurile din `signIn`, `bootstrapSession` și `onAuthStateChange` | În commitul analizat există deja `if (!force) return false;`. Acea corecție este corectă în sursă, dar nu era protejată de suprascrierea de mai sus. Numai clickul explicit pe butonul contului trebuie să deschidă portalul profesorului. |
| Profilul de elev putea întrerupe navigarea profesorului | `index.html`, `renderAuthState()` → `openOnboarding(false)` | Un profesor fără profil de elev primea formularul de completare inclusiv peste teste. Rolul este acum verificat separat; formularul automat se deschide numai în pagina de cont, pentru utilizatorii fără rol didactic. |
| Verificarea portalului închidea sesiunea comună | `assets/formula-x-portal.js`, eșecul `openPortal()` după login și în bootstrap | O eroare RPC sau un cont fără rol de profesor producea `auth.signOut()`, afectând și accesul normal la teste din celelalte pagini. |
| Portalul din sursă nu monta administrarea lecțiilor | `profesori/index.html` și `assets/formula-x-portal.js` | Integrarea disponibilă la publicare depindea de HTML și JS scoase din arhivă. Fișierele urmărite în GitHub nu conțineau tabul și legătura completă cu `FormulaXLessonTeacher`. |
| Ruta comună nu exista în repository | `assets/formula-x-lessons-core.js`, `lessonUrl()` → `/cursuri/lectie.html` | Fișierul apărea numai după extragerea arhivei. O lecție nouă depindea de o resursă absentă din sursa proiectului. |
| Biblioteca citea direct corpul lecției și îl afișa ca text | `cursuri/app.js`, `openLesson()` | Pentru Studio apărea JSON brut; pentru lecțiile protejate, citirea nu urma același contract `fx_open_lesson` ca paginile dedicate. |
| Editarea era împărțită între mecanisme incompatibile | `fx-course-existing-editor.js`, `fx-editor-all.js`, `fx-lesson-studio.js`, legăturile din `formula-x-lesson-teacher.js` | Studio refuza formatele vechi; unele linkuri foloseau editorul DOM, altele Studio. |
| Salvarea putea fi parțială | `fx-course-existing-editor.js`, `save()` | Corpul lecției și metadatele se actualizau prin două cereri. Eșecul celei de-a doua lăsa conținutul deja modificat. |
| Crearea unei lecții putea pierde identitatea | `fx-lesson-studio.js`, `save()` | Slugul era dedus dintr-un catalog filtrat după titlu. Două titluri identice puteau lăsa `state.slug` necompletat și următoarea salvare putea crea încă o lecție. |
| Suprascrierile unei lecții private puteau fi citite anonim | `SUPABASE-UNIVERSAL-LECTII-2026.sql`, `private.fx_editor_can_read()` | `romana/ultima-noapte` era în lista de excepții publice, deși pagina lecției verifică accesul prin Supabase. |
| Validarea SQL folosea comparații vulnerabile la valori NULL | `fx_studio_update_lesson()` | Compararea `<>` cu un câmp JSON absent întoarce NULL. Verificarea formatului și a materiei folosește acum `IS DISTINCT FROM`. |

## Fluxul rezultat

Profesorul se autentifică și poate naviga între pagina principală, Teste BAC, bibliotecă și portal. Evenimentele sesiunii nu redirecționează către portal. Ruta privată verifică rolul; o eroare de verificare afișează mesajul în pagina respectivă.

Portal → **Lecții și acces** → **Editează lecția** deschide `/profesori/studio.html?slug=IDENTIFICATOR`. Același Studio folosește adaptoare pentru:

- lecțiile `formula-x-blocks-v1`: blocuri, imagini, grile și previzualizare;
- lecțiile simple: textul existent este preluat într-un bloc, cu păstrarea conținutului;
- modelele structurate, inclusiv Ion, Baltagul și Ultima noapte: formular pentru repere, scene și întrebări, cu păstrarea formatului cerut de pagina originală;
- materialele criptate vechi, Harap-Alb și Moara cu noroc: decriptare prin mecanismul de acces existent și salvarea modificărilor prin suprascrieri de model.

Fișa **Progresii**, care este o pagină statică fără corp de lecție în baza de date, își păstrează adaptorul de editare pe pagină. Nu este prezentată drept o lecție Studio deja migrată. Pentru toate lecțiile noi, pagina generică și Studio funcționează fără adăugarea unui nume în cod.

Previzualizarea modelelor vechi arată structura și textele editate; pentru aspectul original se folosește **Vezi lecția salvată**. Lecțiile Studio au previzualizarea vizuală completă. În modelele vechi, listele de întrebări cu număr fix și variantele lor își păstrează lungimea cerută de cititorul existent.

## Salvarea și protecția datelor

`fx_editor_load_lesson` verifică pe server sesiunea și materia profesorului înainte să returneze conținutul editabil. `fx_editor_create_lesson` primește un UUID păstrat de ciornă și returnează identitatea exactă, inclusiv slugul. Repetarea aceleiași cereri nu dublează lecția.

`fx_editor_save_lesson` blochează rândul lecției, verifică `editor_revision` și salvează corpul plus titlul și descrierea într-o singură tranzacție. O eroare la metadate anulează și modificarea corpului. Un editor deschis pe o versiune veche primește o eroare de conflict, cu păstrarea ciornei. Modificările făcute în timpul unei salvări rămân marcate pentru o salvare ulterioară.

Trigger-ele actualizează versiunea și când scriu adaptoarele vechi. Pentru lecțiile cu corp JSON, suprascrierile de model sunt integrate în corp și apoi eliminate din suprascrieri; astfel nu ascund o editare ulterioară. Pentru lecțiile criptate, suprascrierile se cumulează între salvări.

`fx_open_lesson`, regulile existente pentru grupe/elevi și RLS-ul pentru citirea lecțiilor rămân autoritatea accesului elevilor. Ascunderea butonului de editare este doar comportament UI. Funcțiile noi verifică explicit drepturile și folosesc `search_path=''`, calificarea schemelor și granturi de execuție limitate.

Ciornele sunt legate de UUID-ul real al utilizatorului. Deconectarea blochează salvarea și elimină conținutul privat din editor. Lecțiile noi se creează cu `published=false`, `is_demo=false`; accesul se acordă separat din portal.

## Fișiere de adăugat

| Fișier | Rol |
| --- | --- |
| `assets/fx-lesson-store.js` | Client comun pentru verificarea profesorului, încărcare, creare, salvare și adaptoare de format. |
| `assets/fx-lesson-model-editor.js` | Formular reutilizabil pentru modelele existente; editare de texte, scene, grile și imagini. |
| `cursuri/lectie.html` | Ruta generică, urmărită în GitHub, pentru lecțiile viitoare. |
| `scripts/prepare-lesson-release.py` | Extragerea verificată a arhivei, cu păstrarea codului actual al aplicației. |
| `tests/stable-lessons.cjs` | Regresii pentru identitate, salvări repetate, versiuni, adaptoare și deconectare. |
| `tests/release-source.py` | Demonstrează că arhiva nu poate înlocui fișierele actuale ale aplicației. |
| `tests/fixtures/stable-lessons-schema.sql` | Bază de date de test, izolată; nu se execută în proiectul real. |
| `tests/stable-lessons.sql` | Teste PostgreSQL pentru autorizare, tranzacții, reluarea creării, conflicte și citire anonimă. |
| `docs/FLUX-LECTII-STABIL-2026.md` | Această analiză și pașii de aplicare. |

## Fișiere de înlocuit

| Fișiere | Schimbare |
| --- | --- |
| `index.html` | Expune clientul comun de sesiune, păstrează navigarea explicită spre portal și limitează formularul automat de elev la pagina de cont. |
| `profesori/index.html`, `assets/formula-x-portal.js` | Tabul Lecții și acces, integrarea cu administrarea lecțiilor, butoane pe elev/grupă, verificare de sesiune fără deconectare forțată. |
| `assets/formula-x-lessons-core.js`, `assets/formula-x-lesson-teacher.js` | Rute comune spre cititor și editor; păstrează rutele istorice pentru citirea lecțiilor existente. |
| `profesori/studio.html`, `assets/fx-lesson-studio.js`, `assets/fx-lesson-studio.css` | Același editor pentru formatele din bază, identitate stabilă, ciorne per utilizator, protecție la conflicte. |
| `assets/fx-editor-all.js` | Adaptor de compatibilitate și trimitere spre editorul complet; editarea statică rămâne pentru Progresii. |
| `assets/fx-course-existing-editor.js` | Punct de compatibilitate spre editorul comun; vechile cereri de salvare separate sunt eliminate. |
| `cursuri/index.html`, `cursuri/app.js`, `cursuri/style.css` | Bibliotecă prin catalogul de acces, linkuri spre cititor și administrarea comună. |
| `assets/formula-x-lesson-page.js`, `lectii/romana/ion.html`, `lectii/romana/baltagul.html` | Imaginile editate pot folosi și URL-uri HTTPS sau `/assets/`, păstrând imaginile originale ca variantă implicită. |
| `SUPABASE-UNIVERSAL-LECTII-2026.sql` | Instalatorul unic actualizat: funcții atomice, versiuni, drepturi și corecțiile de validare/citire. |
| `scripts/install-lesson-editor.py` | Versiuni de cache pentru modulele comune, portal și Studio. |
| `.github/workflows/static.yml` | Publicare cu sursa actuală păstrată și teste după extragerea arhivei. |
| `.github/workflows/verify-lesson-editor.yml`, `tests/lesson-editor.cjs` | Verificări pentru noile rute și teste PostgreSQL într-un serviciu CI izolat. |

## Aplicare

1. În Supabase → SQL Editor, execută integral versiunea actuală a `SUPABASE-UNIVERSAL-LECTII-2026.sql`. Acesta este singurul SQL destinat proiectului real. Necesită schema de lecții deja folosită de Formula X; dacă lipsește, se oprește explicit.
2. După verificarea CI, integrează ramura modificărilor în `main`. GitHub Pages publică prin workflow-ul corectat.
3. Profesor → Lecții și acces → Editează lecția. Pentru o lecție nouă: Creează o lecție → Salvează → acordă acces elevilor/grupelor.
4. Verifică în proiectul real contul de Română, un profesor de altă materie și un elev cu/fără acces. Aceste verificări folosesc conturile reale; nu sunt simulate ca fiind deja efectuate.

Instalatorul poate fi rulat din nou, fără ștergerea lecțiilor, grupelor sau regulilor de acces. Nu se mai execută SQL separat la crearea fiecărei lecții. Fișierele SQL din `tests/` sunt exclusiv pentru CI.

## Verificare

Local: scenariile de editor, bibliotecă, adaptoare și salvare, testul arhivei, lecțiile lirice, rendererul Studio, accesul lecțiilor, continuitatea chestionarelor, imaginile publice Harap-Alb și exercițiile pe repere. Sunt verificate și sintaxa modulelor și scripturile inline modificate.

CI include PostgreSQL 16: instalarea repetată a migrației, drepturi pe materie, respingerea elevului/anonimului, salvare atomică inclusiv eșec după scrierea corpului, conflicte de versiune, creare reluată și păstrarea funcției originale de acces. Testele folosesc o schemă contractuală izolată; nu substituie verificarea configurației efective din proiectul Supabase.


Rezultate verificate în GitHub Actions pentru commitul `5a644fba5df5f288acdef9d995be7da925d10711`: ambele joburi, `syntax` și `database`, au trecut. Verificările ulterioare ale PR-ului apar în fila Checks; configurația Supabase reală rămâne de verificat prin pașii de aplicare.
