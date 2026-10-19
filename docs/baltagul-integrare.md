# Formula X — integrare „Baltagul”

## Stare
Lecția are două eseuri și 36 de întrebări (18 per eseu, 6 per reper), ilustrații extrase din PDF-ul furnizat de profesor, recapitulări și niveluri de ascundere a textului.

Această ramură schimbă exclusiv motorul de chestionare pentru a accepta întrebări personalizate în pachetul deja criptat al lecției. Nu schimbă autorizarea, accesul elevilor sau chestionarele existente pentru „Harap-Alb” și „Moara cu noroc”.

**Nu introduceți materialul integral sau cheia de decriptare în acest depozit public.** Pachetul necriptat al lecției este un fișier de import privat, livrat separat profesorului.

## Integrarea rămasă în Supabase

1. Înregistrați slug-ul baltagul și materia romana prin mecanismul privat actual de lecții.
2. Importați și criptați pachetul JSON cu imaginile și cele 36 de întrebări. În essays.particularitati.quizQuestions și essays.caracterizare.quizQuestions sunt câte 18 întrebări.
3. Configurați accesul profesor/elev/grupă în Supabase. Nu faceți primul eseu public fără decizie explicită; excepția de acces public de la „Harap-Alb” nu se extinde la „Baltagul”.
4. Afișați lecția în catalogul profesorului și în cel al elevului cu acces.
5. Verificați: autentificare, lipsa accesului pentru anonim, comutarea între eseuri, deschiderea imaginilor, chestionar per reper, păstrarea testului la refresh/focus și expirarea permisiunilor.

## Compatibilitate

Când un eseu are quizQuestions, funcția makeQuestions validează 18 întrebări, exact 6 pentru fiecare din cele 3 repere. Fiecare întrebare are id, reper, prompt, choices (4 variante), correct (index 0–3) și explanation; image este opțional. Variantele sunt amestecate la afișare, iar explicația rămâne legată de răspunsul corect.

În lipsa quizQuestions, motorul folosește chestionarele existente, neschimbate. Pentru lecțiile protejate, verificarea accesului rămâne în fx_open_lesson și decryptBundle, nu în JavaScript-ul de afișare.

## Publicare

Nu comasați în main înainte de verificarea fluxului în contul profesorului și al unui elev de test. Integrarea în baza de date și publicarea finală necesită acces legitim la Supabase.
