# Exerciții pentru eseurile de Română

Cele două eseuri de la fiecare operă au aceleași instrumente de memorare. Elevul selectează eseul din pagina lecției, apoi alege un nivel de ascundere sau deschide un chestionar.

## Ascunderea treptată

Sunt cinci niveluri: text complet, câteva cuvinte ascunse, mai puține indicii, aproape tot ascuns și doar imagini și repere. Cuvintele ascunse la un nivel rămân ascunse la nivelul următor. Elevul poate cere un indiciu apăsând un spațiu gol sau poate afișa temporar textul complet pentru verificare. Imaginile originale nu se decupează.

## Chestionarele

Fiecare dintre cele patru eseuri are 18 întrebări cu patru variante și un singur răspuns corect: câte șase pentru fiecare reper. Butoanele din dreptul reperelor deschid doar întrebările reperului respectiv. Butonul de deasupra schemei deschide toate cele 18 întrebări ale eseului selectat.

Ordinea întrebărilor și a variantelor se schimbă la începutul fiecărei încercări. Elevul primește explicația din lecție după verificarea răspunsului. La final vede punctajul total, punctajul pe repere și răspunsurile explicate. Poate relua numai întrebările greșite sau poate începe un chestionar nou.

Nivelul de ascundere și rezultatele sunt păstrate numai în pagina deschisă. Nu sunt salvate în cont și nu apar în portalul profesorului. Nu este necesară o migrare Supabase suplimentară.

## Acces și întreținere

Exercițiile folosesc materialul decriptat numai după verificarea existentă a accesului la lecție. Întrebările corecte și explicațiile se construiesc din eseul autorizat, fără o copie publică a materialelor sau a cheilor. Retragerea accesului și ieșirea din cont șterg starea exercițiului și închid chestionarul.

Sursa modulului este `assets/formula-x-essay-practice.js`. Ea este inclusă în `assets/formula-x-lesson-page.js` pentru a folosi încărcarea existentă a paginilor. După editarea modulului, rulează `node scripts/build-lesson-practice.cjs`, apoi verifică sincronizarea cu `node scripts/build-lesson-practice.cjs --check`.

Rulează `node tests/essay-practice.cjs` pentru verificarea nivelurilor, chestionarelor, punctajelor, reluării răspunsurilor greșite și retragerii accesului prin controlerul real al paginii. Opțional, un fișier privat JSON cu structura `{slug: bundle}` poate fi transmis ca argument pentru auditul întrebărilor folosind eseurile aprobate. Acest fișier rămâne în mediul privat de verificare.
