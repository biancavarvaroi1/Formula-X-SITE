# Editor lecții Formula X (2026-11-06)

**GitHub:** codul editorului și integrarea sunt deja în acest repository. **Supabase:** trebuie activat manual de administrator.

## Ce trebuie să faci în Supabase
1. Deschide proiectul Supabase al Formula X → SQL Editor → New query.
2. Copiază și rulează integral fișierul [SUPABASE-EDITOR-TOATE-LECTIILE.sql](../SUPABASE-EDITOR-TOATE-LECTIILE.sql).
3. După mesajul de reușită, intră în /profesori/ → Lecții → **Editează lecția**.
4. Fă o modificare de test, apasă **Salvează modificările**, reîncarcă pagina și verifică într-un cont de elev autorizat.

Profesorul mentor poate salva doar pentru materia lui; administratorul poate salva pentru toate materiile. Drepturile sunt impuse și în politicile Supabase. Nu introduce chei service_role în JavaScript.

## Fișiere
- `assets/fx-editor-all.js` — editor comun pentru pagini cu texte și imagini; acolo unde există un model JS expus, permite și schimbarea datelor structurate
- `assets/fx-course-existing-editor.js` — lecții din biblioteca /cursuri/
- `assets/formula-x-lesson-teacher.js` — buton „Editează lecția” în portal
- `SUPABASE-EDITOR-TOATE-LECTIILE.sql` — stocare, acces RLS, imagini

## Limite și precauții
- Această integrare **nu transformă orice HTML într-un constructor vizual**. Texte, imagini, întrebări și răspunsuri se pot modifica doar în măsura în care pagina le expune editorului. Schimbările structurale majore rămân în cod.
- Pagina mare `lectii/romana/harap-alb.html` (peste 40 MB) nu a fost rescrisă de această integrare: se editează prin modelul protejat al site-ului, dacă acesta este disponibil. Varianta demonstrativă `assets/lectii/romana/harap-alb.html` are editorul de text/imagine.
- Editorul universal este **inactiv la salvare** până când rulezi SQL-ul. Lecțiile existente pot fi citite în continuare fără SQL.
- Pentru lecțiile private trebuie păstrat accesul prin `fx_open_lesson`. Testează cu un cont de profesor și un cont de elev înainte de a publica schimbări importante.
- Conținutul modificat este memorat ca diferențe (patches) în Supabase. Nu suprascrie fișierul original din GitHub.

