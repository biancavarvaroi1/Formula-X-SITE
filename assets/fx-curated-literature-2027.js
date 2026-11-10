/* Formula X · lecții lirice 2027 · surse: PDF-urile profesorului. Conținutul se importă doar autentificat, prin RPC securizat. */
(function(){
  "use strict";
  const lessons=[
  {
    "slug": "luceafarul",
    "summary": "Eseu BAC din materialul profesoarei: romantism, folclor, genuri literare, tema geniului, două secvențe și patru tablouri.",
    "fx_format": "formula-x-blocks-v1",
    "subject": "romana",
    "theme": "ocean",
    "title": "Luceafărul — Mihai Eminescu",
    "subtitle": "Eseul explicat pas cu pas • două repere BAC • scene și relevanță • imagini și grile pentru învățare",
    "blocks": [
      {
        "type": "heading",
        "title": "Înainte să începi — datele esențiale",
        "text": "Mihai Eminescu • „Luceafărul” • romantism • prima publicare în 1883, la Viena; inclus în volumul „Poesii” din 1884."
      },
      {
        "type": "text",
        "text": "**Romantismul** este o mișcare artistică apărută în Europa la sfârșitul secolului al XVIII-lea, ca reacție împotriva rigorilor clasicismului. El promovează exprimarea liberă a imaginației și a sentimentelor. În literatura română, este pregătit de scriitorii pașoptiști și ajunge la expresia sa deplină în creația lui Mihai Eminescu."
      },
      {
        "type": "cards",
        "title": "Ce trebuie să recunoști la romantism?",
        "text": "**SURSE** — istoria, folclorul, frumusețile naturii.\n**ANTITEZA** — confruntarea contrariilor.\n**PERSPECTIVA ASUPRA TIMPULUI** — glorificarea trecutului și ironizarea prezentului.\n**LIBERTATEA CREAȚIEI** — amestecul genurilor și al speciilor."
      },
      {
        "type": "text",
        "text": "„Luceafărul” este o **alegorie despre condiția omului de geniu**, prezentată printr-o poveste de iubire imposibilă. Nu trebuie doar povestită acțiunea: la BAC, fiecare exemplu trebuie legat de semnificația lui."
      },
      {
        "type": "image",
        "image": "/assets/luceafarul-patru-tablouri.svg",
        "alt": "Patru tablouri în Luceafărul: chemarea, idila, Demiurgul și finalul",
        "caption": "Privește schema, apoi reconstruiește în ordine cele patru tablouri."
      },
      {
        "type": "heading",
        "title": "REPERUL 1 — Încadrarea în romantism",
        "text": "Două trăsături din eseul-model: folclorul ca sursă de inspirație și amestecul genurilor/speciilor."
      },
      {
        "type": "steps",
        "title": "Trăsătura 1 — FOLOSIREA FOLCLORULUI CA SURSĂ DE INSPIRAȚIE",
        "text": "**Basmul „Fata în grădina de aur”** prezintă iubirea dintre o fată de împărat și un zmeu, personaje din lumi diferite. De aici pornește nucleul fantastic al poemului.\nEminescu preia conflictul, dar **schimbă deznodământul**: în locul răzbunării din basm, Luceafărul își asumă condiția superioară și incompatibilitatea dintre lumi.\nPoemul valorifică și **mitul Zburătorului**, prin chemarea nocturnă, visarea fetei și tulburarea provocată de iubire."
      },
      {
        "type": "callout",
        "title": "De ce este relevant folclorul?",
        "text": "Povestea fantastică nu este preluată mecanic: ea devine o meditație romantică despre sacrificiu, iubire și destinul geniului.",
        "label": "RELEVANȚĂ",
        "variant": "important"
      },
      {
        "type": "quiz",
        "id": "l-r1-1",
        "question": "Care este sursa folclorică principală invocată în lecție?",
        "options": [
          "„Fata în grădina de aur”",
          "„Moara cu noroc”",
          "„Miorița”",
          "„Amintiri din copilărie”"
        ],
        "correct": 0,
        "explanation": "Basmul „Fata în grădina de aur” îi oferă poetului punctul de plecare pentru iubirea între lumi incompatibile."
      },
      {
        "type": "quiz",
        "id": "l-r1-2",
        "question": "Ce schimbare de semnificație aduce Eminescu față de deznodământul basmului?",
        "options": [
          "Luceafărul se răzbună pe îndrăgostiți.",
          "Geniul acceptă imposibilitatea iubirii fără răzbunare.",
          "Cătălin devine nemuritor.",
          "Demiurgul dispare din poveste."
        ],
        "correct": 1,
        "explanation": "Finalul poemului accentuează superioritatea și singurătatea geniului, nu răzbunarea."
      },
      {
        "type": "cards",
        "title": "Imagine de reținut: basmul și mitul",
        "text": "**BASMUL** → fata de împărat + ființa fantastică + două lumi incompatibile.\n**PRELUCRAREA EMINESCIANĂ** → geniul renunță la răzbunare și rămâne în lumea sa.\n**ZBURĂTORUL** → neliniștea îndrăgostirii și întâlnirea prin vis."
      },
      {
        "type": "steps",
        "title": "Trăsătura 2 — AMESTECUL GENURILOR ȘI AL SPECIILOR",
        "text": "**Epic:** există un fir narativ, întâmplări și personaje (fata, Luceafărul, Cătălin, Demiurgul).\n**Liric:** textul este scris în versuri, iar imaginile artistice exprimă sentimente și idei.\n**Dramatic:** dialogurile dintre fata de împărat și Luceafăr, Cătălin și Cătălina, respectiv Hyperion și Demiurg confruntă perspective diferite.\n**Specific basmului:** formula de început „A fost odată ca-n povești” introduce întâmplările într-un cadru fantastic."
      },
      {
        "type": "callout",
        "title": "De ce contează amestecul?",
        "text": "Romantismul depășește limitele stricte ale genurilor: poemul poate spune o poveste, poate exprima trăiri și poate problematiza prin dialog destinul geniului.",
        "label": "RELEVANȚĂ",
        "variant": "important"
      },
      {
        "type": "quiz",
        "id": "l-r1-3",
        "question": "Ce element este specific dramaticului în poem?",
        "options": [
          "Rima versurilor",
          "Dialogurile dintre personaje",
          "Descrierea cerului",
          "Numărul tablourilor"
        ],
        "correct": 1,
        "explanation": "Dialogurile dintre personaje aparțin componentei dramatice."
      },
      {
        "type": "heading",
        "title": "Harta celor patru tablouri",
        "text": "Învață întâi structura, apoi cele două idei poetice analizate în eseu."
      },
      {
        "type": "cards",
        "title": "I — Atracția dintre lumi",
        "text": "Fata de împărat îl cheamă pe Luceafăr; el se metamorfozează de două ori; diferența cosmic–terestru împiedică iubirea."
      },
      {
        "type": "cards",
        "title": "II — Iubirea pământeană",
        "text": "Pajul Cătălin o curtează pe Cătălina. Cei doi aparțin aceleiași lumi și pot trăi o iubire firească."
      },
      {
        "type": "cards",
        "title": "III — Drumul către Demiurg",
        "text": "Hyperion cere să fie dezlegat de nemurire, dar Demiurgul îi arată că nu poate renunța la propria condiție cosmică."
      },
      {
        "type": "cards",
        "title": "IV — Finalul",
        "text": "Hyperion vede cuplul Cătălin–Cătălina; fata îi cere să îi lumineze norocul; el rămâne „nemuritor și rece”."
      },
      {
        "type": "quiz",
        "id": "l-r2-1",
        "question": "În ce tablou apare dialogul dintre Hyperion și Demiurg?",
        "options": [
          "I",
          "II",
          "III",
          "IV"
        ],
        "correct": 2,
        "explanation": "În tabloul al III-lea, Hyperion îi solicită Demiurgului dezlegarea de nemurire."
      },
      {
        "type": "quiz",
        "id": "l-r2-2",
        "question": "Ce exprimă tabloul al II-lea?",
        "options": [
          "Călătoria cosmică",
          "Idila Cătălin–Cătălina",
          "Cele două metamorfoze",
          "Întâlnirea cu Demiurgul"
        ],
        "correct": 1,
        "explanation": "Tabloul al II-lea contrastează iubirea pământeană cu aspirația spre absolut."
      },
      {
        "type": "quiz",
        "id": "l-r2-3",
        "question": "Care este succesiunea logică a celor patru tablouri?",
        "options": [
          "Cosmos – război – sat – oraș",
          "Chemare – idilă terestră – Demiurg – final",
          "Răzbunare – nuntă – plecare – întoarcere",
          "Idilă – deznodământ – expozițiune – conflict"
        ],
        "correct": 1,
        "explanation": "Cele patru tablouri alternează și confruntă lumea cosmică și pe cea terestră."
      },
      {
        "type": "heading",
        "title": "REPERUL 2 — Tema și două secvențe poetice",
        "text": "Argumentarea trebuie să arate cum faptele și imaginile din poem susțin ideea de geniu și iubirea imposibilă."
      },
      {
        "type": "text",
        "text": "**Tema principală:** condiția omului de geniu, imposibil de armonizat cu fericirea obișnuită. **Tema complementară:** iubirea imposibilă dintre două ființe aparținând unor lumi diferite, cea cosmică și cea terestră. Eseul le corelează prin două momente-cheie."
      },
      {
        "type": "split",
        "eyebrow": "SECVENȚA 1 · TABLOUL I",
        "title": "Atracția contrariilor",
        "text": "Fata îl cheamă pe Luceafăr în lumea ei. El răspunde și capătă înfățișări umane, dar păstrează o natură inaccesibilă muritorilor. Dorința ei de a-l iubi se lovește de diferența dintre cele două condiții.",
        "image": "/assets/luceafarul-patru-tablouri.svg",
        "side": "right"
      },
      {
        "type": "steps",
        "title": "Prima idee poetică — întâlnirea dintre fată și Luceafăr",
        "text": "Fata de împărat, unică prin frumusețe, este fascinată de astrul nocturn și îl cheamă să coboare.\nLuceafărul se îndrăgostește și **se metamorfozează** pentru a răspunde chemării, însă fata îl respinge pentru că înțelege diferența dintre lumea umană și cea cosmică.\nEa îi cere să devină muritor, iar Hyperion acceptă sacrificiul și pleacă spre Demiurg pentru a cere dezlegarea de nemurire."
      },
      {
        "type": "quote",
        "text": "Tu te coboară pe pământ, / Fii muritor ca mine.",
        "author": "Mihai Eminescu, „Luceafărul”"
      },
      {
        "type": "callout",
        "title": "RELEVANȚA primei idei poetice",
        "text": "Această secvență evidențiază **incompatibilitatea dintre lumea geniului și lumea oamenilor obișnuiți**: intensitatea sentimentului nu este suficientă pentru ca iubirea să se împlinească.",
        "label": "RELEVANȚĂ",
        "variant": "important"
      },
      {
        "type": "quiz",
        "id": "l-r3-1",
        "question": "De ce îi cere fata Luceafărului să devină muritor?",
        "options": [
          "Pentru a putea trăi împreună în aceeași condiție",
          "Pentru a-l pedepsi",
          "Pentru a-l transforma în Demiurg",
          "Pentru a-l trimite la Cătălin"
        ],
        "correct": 0,
        "explanation": "Condițiile lor incompatibile stau la baza conflictului."
      },
      {
        "type": "split",
        "eyebrow": "SECVENȚA 2 · TABLOUL IV",
        "title": "Finalul și condiția geniului",
        "text": "Hyperion revine în sfera cosmică și privește spre Cătălin și Cătălina, uniți prin iubirea omenească. Chemarea fetei are acum alt sens: ea cere ocrotirea norocului lor.",
        "image": "/assets/luceafarul-patru-tablouri.svg",
        "side": "left"
      },
      {
        "type": "steps",
        "title": "A doua idee poetică — finalul",
        "text": "Revenit după dialogul cu Demiurgul, Hyperion îi vede pe Cătălin și Cătălina trăind o iubire pământeană, într-un cadru natural romantic.\nFata îl invocă din nou, **nu pentru a-i cere iubirea**, ci pentru a-i ocroti dragostea față de Cătălin. Această schimbare îi confirmă lui Hyperion distanța dintre cele două lumi.\nÎn final, el o numește „chip de lut”, simbol al condiției muritoare, în timp ce el rămâne „nemuritor și rece”."
      },
      {
        "type": "quote",
        "text": "Ce-ți pasă ție, chip de lut, / Dac-oi fi eu sau altul?",
        "author": "Mihai Eminescu, „Luceafărul”"
      },
      {
        "type": "callout",
        "title": "RELEVANȚA celei de-a doua idei poetice",
        "text": "Finalul arată **destinul geniului: superioritate, luciditate și singurătate**. El nu poate avea aceeași fericire ca ființele din lumea comună.",
        "label": "RELEVANȚĂ",
        "variant": "important"
      },
      {
        "type": "quiz",
        "id": "l-r3-2",
        "question": "Ce funcție are finalul poemului în raport cu tema?",
        "options": [
          "Anulează opoziția cosmic/terestru",
          "Confirmă incompatibilitatea și singurătatea geniului",
          "Îl transformă pe Cătălin în Demiurg",
          "Arată o răzbunare violentă"
        ],
        "correct": 1,
        "explanation": "„Nemuritor și rece” exprimă asumarea condiției superioare, dar solitare."
      },
      {
        "type": "heading",
        "title": "Două elemente de structură, compoziție și limbaj",
        "text": "Le poți folosi în ultima parte a eseului, după cele două secvențe."
      },
      {
        "type": "steps",
        "title": "Elementul 1 — ORGANIZAREA ÎN PATRU TABLOURI",
        "text": "Primul tablou prezintă iubirea dintre fata de împărat și Luceafăr; al doilea, idila Cătălin–Cătălina.\nAl treilea urmărește călătoria cosmică a lui Hyperion și dialogul cu Demiurgul; al patrulea, revenirea și despărțirea definitivă.\n**Relevanță:** alternanța planurilor cosmic și terestru accentuează opoziția dintre condiția geniului și existența umană."
      },
      {
        "type": "steps",
        "title": "Elementul 2 — ANTITEZA ȘI LIMBAJUL ARTISTIC",
        "text": "Expresia poetică eminesciană îmbină construcții populare cu neologisme și se distinge prin limpezime și rafinament.\nAntiteza esențială este cea dintre muritor și nemuritor, concentrată în replica fetei: „Căci eu sunt vie, tu ești mort”.\nAntiteza se observă și în cele două ipostaze ale Luceafărului: **angelică** și **demonică**."
      },
      {
        "type": "callout",
        "title": "Ce să argumentezi aici?",
        "text": "Cele patru tablouri arată în plan compozițional separarea lumilor, iar antiteza o exprimă în limbaj. Ambele susțin tema imposibilității iubirii.",
        "label": "RELEVANȚĂ",
        "variant": "important"
      },
      {
        "type": "quiz",
        "id": "l-r4-1",
        "question": "Care opoziție organizează poemul?",
        "options": [
          "Urban – rural",
          "Cosmic – terestru",
          "Trecut – viitor istoric",
          "Comedie – tragedie"
        ],
        "correct": 1,
        "explanation": "Cele patru tablouri alternează planurile cosmic și terestru."
      },
      {
        "type": "quiz",
        "id": "l-r4-2",
        "question": "Ce semnifică cele două metamorfoze ale Luceafărului?",
        "options": [
          "O alternanță de ipostaze angelice și demonice",
          "Schimbarea din elev în profesor",
          "Trecerea dintr-un roman în altul",
          "Căsătoria cu fata"
        ],
        "correct": 0,
        "explanation": "Ipostazele sunt imagini romantice ale unei ființe inaccesibile condiției umane."
      },
      {
        "type": "heading",
        "title": "Cum scrii eseul la BAC",
        "text": "Păstrează ordinea argumentelor din materialul profesoarei și leagă fiecare exemplu de semnificație."
      },
      {
        "type": "steps",
        "title": "Plan de redactare",
        "text": "Introducere: romantismul, Eminescu, publicarea din 1883 și includerea în „Poesii” în 1884.\nDouă trăsături: folclorul și amestecul genurilor/speciilor.\nTemele: condiția geniului și iubirea imposibilă.\nPrima secvență: chemarea și metamorfozele; apoi **RELEVANȚA**.\nA doua secvență: finalul cu Hyperion și perechea pământeană; apoi **RELEVANȚA**.\nDouă elemente: cele patru tablouri și antiteza; concluzia."
      },
      {
        "type": "callout",
        "title": "Concluzie de eseu",
        "text": "„Luceafărul” este o sinteză a universului poetic eminescian: teme și motive romantice, imagini ale eternității și o amplă alegorie despre condiția omului de geniu.",
        "label": "CONCLUZIE",
        "variant": "success"
      },
      {
        "type": "quiz",
        "id": "l-r5-1",
        "question": "Care exemplu susține cel mai bine tema iubirii imposibile?",
        "options": [
          "Metamorfozele și cererea de a deveni muritor",
          "Simpla enumerare a personajelor",
          "Data publicării, fără interpretare",
          "Numărul de strofe, fără explicație"
        ],
        "correct": 0,
        "explanation": "O secvență este relevantă când legi întâmplarea de tema și semnificația ei."
      },
      {
        "type": "callout",
        "title": "Recapitulare în 20 de secunde",
        "text": "**FOLCLOR + AMESTECUL GENURILOR** → romantism. **PRIMUL ȘI ULTIMUL TABLOU** → iubire imposibilă. **PATRU TABLOURI + ANTITEZĂ** → destinul geniului.",
        "label": "FIȘĂ RAPIDĂ",
        "variant": "success"
      }
    ]
  },
  {
    "slug": "plumb",
    "summary": "Eseu BAC din materialul profesoarei: simboluri, muzicalitate, două strofe, plumbul, titlul și relevanța secvențelor.",
    "fx_format": "formula-x-blocks-v1",
    "subject": "romana",
    "theme": "rose",
    "title": "Plumb — George Bacovia",
    "subtitle": "Eseu explicat în două repere • strofe, simboluri, interpretări numerotate și verificare prin grile",
    "blocks": [
      {
        "type": "heading",
        "title": "Înainte să începi — datele esențiale",
        "text": "George Bacovia • „Plumb” • 1916 • simbolism • poezia deschide volumul omonim."
      },
      {
        "type": "text",
        "text": "**Simbolismul** este un curent literar apărut în Franța la sfârșitul secolului al XIX-lea. Printre trăsăturile sale se numără asocierea iubirii cu moartea, evocarea orașului provincial, sugestia, sinestezia, cromatica și muzicalitatea."
      },
      {
        "type": "text",
        "text": "George Bacovia este un poet reprezentativ al simbolismului românesc, format sub influența simbolismului francez. În lirica sa revin singurătatea, dezolarea și monotonia existenței. „Plumb” concentrează acest univers apăsător și lipsit de perspectivă."
      },
      {
        "type": "image",
        "image": "/assets/plumb-doua-strofe.svg",
        "alt": "Cele două strofe din Plumb: exteriorul funerar și interiorul sufletesc",
        "caption": "Reține: strofa I = exterior funerar; strofa II = interior afectiv."
      },
      {
        "type": "cards",
        "title": "Cod vizual pentru simboluri",
        "text": "**PLUMB** → apăsare sufletească și imposibilitatea eliberării.\n**CAVOU** → spațiu închis, claustrare și izolare.\n**VÂNT / FRIG** → neliniște, ostilitate, suferință.\n**AMOR / ARIPI DE PLUMB** → iubire pierdută și zbor imposibil."
      },
      {
        "type": "heading",
        "title": "REPERUL 1 — Două trăsături simboliste",
        "text": "La BAC, menționează trăsătura, exemplul din poem și efectul obținut."
      },
      {
        "type": "steps",
        "title": "Trăsătura 1 — UTILIZAREA SIMBOLURILOR",
        "text": "Repetarea simetrică a cuvântului **„plumb”** transmite apăsarea sufletească și neputința eului liric de a evada dintr-o existență lipsită de perspectivă.\n**„Cavoul”** sugerează un spațiu închis și sufocant, care poate reprezenta societatea sau chiar propria existență.\n**„Vântul”** este semnul neliniștii interioare, al unei vieți care continuă doar ca suferință.\nReluarea expresiei **„Stam singur”** devine laitmotivul izolării și al pustiirii sufletești."
      },
      {
        "type": "callout",
        "title": "RELEVANȚA simbolurilor",
        "text": "Obiectele și imaginile nu sunt simple elemente de decor: ele sugerează **singurătatea, apăsarea și imposibilitatea ieșirii dintr-un univers al morții**.",
        "label": "RELEVANȚĂ",
        "variant": "important"
      },
      {
        "type": "quiz",
        "id": "p-r1-1",
        "question": "Ce sugerează cel mai constant simbolul „plumb”?",
        "options": [
          "Veselia copilăriei",
          "Apăsarea și închiderea",
          "Triumful iubirii",
          "Natura luminoasă"
        ],
        "correct": 1,
        "explanation": "Plumbul exprimă greutate materială transformată în apăsare sufletească."
      },
      {
        "type": "quiz",
        "id": "p-r1-2",
        "question": "De câte ori apare cuvântul „plumb” în cele două catrene?",
        "options": [
          "De două ori",
          "De patru ori",
          "De șase ori",
          "De opt ori"
        ],
        "correct": 2,
        "explanation": "Cuvântul apare de trei ori în fiecare strofă."
      },
      {
        "type": "cards",
        "title": "Laitmotivul, pe înțelesul tău",
        "text": "Un **laitmotiv** este o idee, un motiv sau o formulă care revine într-o operă.\nÎn „Plumb”, **„Stam singur”** accentuează sentimentul de izolare.\nCuvântul **„plumb”** leagă simbolic obiectele exterioare de trăirea interioară."
      },
      {
        "type": "steps",
        "title": "Trăsătura 2 — MUZICALITATEA PRIN PARALELISM SINTACTIC",
        "text": "**Paralelismul sintactic** înseamnă repetarea unor structuri asemănătoare în versuri sau enunțuri diferite.\nÎnceputurile strofelor au construcții apropiate: „Dormeau adânc sicriele de plumb” și „Dormea întors amorul meu de plumb”.\nFormula **„Stam singur”** se reia în ambele strofe, construind ritmul monoton al singurătății.\nRepetiția și simetria creează o muzicalitate apăsătoare, asemenea unui marș funebru, sugerând un univers încremenit, din care eul liric nu poate scăpa."
      },
      {
        "type": "callout",
        "title": "RELEVANȚA paralelismului",
        "text": "Prin simetria morfosintactică a celor două catrene, **planul exterior al morții se reflectă în planul interior al iubirii**, iar monotoniei îi corespunde sentimentul claustrării.",
        "label": "RELEVANȚĂ",
        "variant": "important"
      },
      {
        "type": "quiz",
        "id": "p-r1-3",
        "question": "Ce este paralelismul sintactic?",
        "options": [
          "Repetarea unei structuri asemănătoare în mai multe versuri",
          "Trecerea de la proză la dialog",
          "Eliminarea rimei",
          "O figură care descrie numai culori"
        ],
        "correct": 0,
        "explanation": "Paralelismul sintactic apropie formele versurilor pentru a întări ritmul și sensul."
      },
      {
        "type": "quiz",
        "id": "p-r1-4",
        "question": "Care este efectul reluării formulei „Stam singur”?",
        "options": [
          "Sugerează izolarea eului liric",
          "Introduce un personaj comic",
          "Anunță o călătorie",
          "Arată libertatea absolută"
        ],
        "correct": 0,
        "explanation": "Laitmotivul intensifică singurătatea."
      },
      {
        "type": "heading",
        "title": "REPERUL 2 — Tema și cele două strofe",
        "text": "Tema este singurătatea eului liric într-un univers apăsător, marcat de moarte, lipsa iubirii și imposibilitatea salvării."
      },
      {
        "type": "split",
        "eyebrow": "SECVENȚA 1 · STROFA I",
        "title": "Spațiul funerar",
        "text": "Prima strofă construiește un decor închis: sicrie, flori, coroane de plumb, cavou și vânt. Obiectele asociate morții devin oglinda suferinței eului liric.",
        "image": "/assets/plumb-doua-strofe.svg",
        "side": "right"
      },
      {
        "type": "steps",
        "title": "Prima strofă — patru idei esențiale",
        "text": "Structura „dormeau adânc”, alături de **„sicriele de plumb”**, sugerează un somn al morții și fixează un spațiu apăsător.\nVersul **„Stam singur în cavou... și era vânt...”** accentuează izolarea și neliniștea. Cavoul închide eul într-un univers funerar.\nImaginea auditivă a **coroanelor care scârțâie** întreține atmosfera sumbră, macabră, iar repetiția plumbului accentuează monotonia.\nChiar și **florile**, în mod obișnuit semne ale vieții, își pierd vitalitatea prin asocierea cu plumbul."
      },
      {
        "type": "callout",
        "title": "RELEVANȚA primei strofe",
        "text": "Strofa inițială introduce universul liric bacovian, în care decorul funerar, natura și starea de spirit se întrepătrund într-o viziune dominată de **apăsare, singurătate și moarte**.",
        "label": "RELEVANȚĂ",
        "variant": "important"
      },
      {
        "type": "quiz",
        "id": "p-r2-1",
        "question": "Ce plan domină prima strofă?",
        "options": [
          "Interiorul iubirii pierdute",
          "Decorul exterior funerar",
          "Peisajul exotic",
          "Amintirea copilăriei"
        ],
        "correct": 1,
        "explanation": "Prima strofă pune în prim-plan cavoul și obiectele funerare."
      },
      {
        "type": "quiz",
        "id": "p-r2-2",
        "question": "Ce reprezintă „aripile de plumb”?",
        "options": [
          "Eliberarea prin zbor",
          "Neputința de a evada și de a se înălța",
          "O imagine a naturii fericite",
          "Convingerea că iubirea va triumfa"
        ],
        "correct": 1,
        "explanation": "Aripile, de obicei asociate zborului, sunt îngreunate de plumb."
      },
      {
        "type": "split",
        "eyebrow": "SECVENȚA 2 · STROFA A II-A",
        "title": "Iubirea decăzută și zborul imposibil",
        "text": "În strofa a doua, perspectiva trece de la decorul funerar la trăirea interioară. Iubirea apare inertă, iar eul încearcă zadarnic să o readucă la viață.",
        "image": "/assets/plumb-doua-strofe.svg",
        "side": "left"
      },
      {
        "type": "steps",
        "title": "A doua strofă — trei idei esențiale",
        "text": "Metafora **„amorul meu de plumb”** înfățișează o iubire decăzută, lipsită de viață, dar încă dureroasă pentru eul liric.\nStructura **„și-am început să-l strig”** exprimă încercarea disperată, dar imposibilă, de recuperare a iubirii; singurătatea și frigul se intensifică.\nMetafora finală **„aripile de plumb”** sugerează neputința înălțării și imposibilitatea eliberării dintr-o lume închisă, stagnantă și dominată de moarte."
      },
      {
        "type": "callout",
        "title": "RELEVANȚA celei de-a doua strofe",
        "text": "**Spațiul exterior se transformă în spațiu interior.** Imaginea iubirii pierdute oglindește drama sufletească a eului liric și imposibilitatea eliberării.",
        "label": "RELEVANȚĂ",
        "variant": "important"
      },
      {
        "type": "quiz",
        "id": "p-r2-3",
        "question": "Care este relația dintre cele două strofe?",
        "options": [
          "Nu au nicio legătură",
          "Exterior funerar → interior sufletesc",
          "Exclusiv două anotimpuri",
          "Una este un basm și alta o comedie"
        ],
        "correct": 1,
        "explanation": "Planul funerar exterior din prima strofă este preluat interior în a doua."
      },
      {
        "type": "heading",
        "title": "Două elemente de structură și compoziție",
        "text": "După secvențele poetice, prezintă două elemente interpretate: motivul repetat al plumbului și titlul."
      },
      {
        "type": "steps",
        "title": "Elementul 1 — TROPUL „DE PLUMB”",
        "text": "Sintagma **„de plumb”** se repetă și se asociază cu sicriele, florile, coroanele, amorul și aripile.\nRepetiția conferă poeziei unitate tematică și tonală: greutatea materială devine apăsare sufletească.\nObiectele își pierd vitalitatea și devin semne ale unui univers inert, în care domină moartea și singurătatea.\n**RELEVANȚĂ:** motivul plumbului unifică cele două strofe și exprimă psihologic suferința eului liric."
      },
      {
        "type": "cards",
        "title": "Ce sugerează cele șase apariții ale plumbului?",
        "text": "**Strofa I** — sicriele, florile și coroanele: decorul exterior.\n**Strofa II** — amorul, florile și aripile: universul interior.\n**Efect comun** — paralelism, monotonie, sufocare și lipsa speranței."
      },
      {
        "type": "quiz",
        "id": "p-r3-1",
        "question": "De ce este important titlul poeziei?",
        "options": [
          "Numește un personaj real",
          "Concentrează simbolul apăsării, reluat în text",
          "Precizează un loc geografic",
          "Indică anotimpul primăverii"
        ],
        "correct": 1,
        "explanation": "Titlul anticipează atmosfera și simbolul dominant."
      },
      {
        "type": "quiz",
        "id": "p-r3-2",
        "question": "Care este structura poeziei?",
        "options": [
          "Două catrene",
          "Patru tablouri epice",
          "Un act dramatic",
          "Un roman în două părți"
        ],
        "correct": 0,
        "explanation": "Poezia este alcătuită din două strofe de câte patru versuri."
      },
      {
        "type": "steps",
        "title": "Elementul 2 — TITLUL",
        "text": "**Sens propriu:** plumbul este un metal greu, dens și cenușiu.\n**Valoare fonetică:** grupurile consonantice și vocala închisă „u” pot sugera apăsarea și lipsa de deschidere.\n**Sens simbolic:** culoarea cenușie și greutatea metalului evocă monotonia, moartea, tristețea și sufocarea.\n**Rol compozițional:** titlul reunește simbolurile poeziei și pregătește interpretarea versurilor; devine cheia universului bacovian."
      },
      {
        "type": "callout",
        "title": "De ce este important titlul?",
        "text": "Un singur cuvânt concentrează întreaga stare lirică: **plumbul transformă obiectele și sentimentele în semne ale apăsării interioare**.",
        "label": "RELEVANȚĂ",
        "variant": "important"
      },
      {
        "type": "heading",
        "title": "Cum scrii eseul la BAC",
        "text": "Urmează ordinea din materialul profesoarei și adaugă după fiecare exemplu interpretarea lui."
      },
      {
        "type": "steps",
        "title": "Planul tău de redactare",
        "text": "Introducere: definiția simbolismului, autorul, anul 1916 și volumul omonim.\nTrăsătura 1: simbolurile (plumb, cavou, vânt, „Stam singur”).\nTrăsătura 2: muzicalitatea prin paralelism sintactic.\nTema: singurătatea și apăsarea; prezintă prima strofă + **RELEVANȚĂ**.\nPrezintă a doua strofă + **RELEVANȚĂ**.\nElementele de compoziție: tropul repetat „de plumb” și titlul.\nConcluzie: poemul deschide volumul și sintetizează universul liric bacovian."
      },
      {
        "type": "callout",
        "title": "Concluzia eseului",
        "text": "Așezată în fruntea volumului omonim, poezia „Plumb” este reprezentativă pentru lirica lui George Bacovia, sugerând prin simboluri și muzicalitate o existență dominată de singurătate și apăsare.",
        "label": "CONCLUZIE",
        "variant": "success"
      },
      {
        "type": "quiz",
        "id": "p-r4-1",
        "question": "Care combinație conține două trăsături simboliste demonstrabile în poezie?",
        "options": [
          "Simboluri + muzicalitate",
          "Realism + narator omniscient",
          "Comedie + conflict comic",
          "Istorie + cronicar"
        ],
        "correct": 0,
        "explanation": "Simbolurile și muzicalitatea susțin încadrarea în simbolism."
      },
      {
        "type": "callout",
        "title": "Fișă rapidă pentru recapitulare",
        "text": "**SIMBOLURI + MUZICALITATE** → simbolism. **STROFA I** → cavou și moarte. **STROFA II** → iubire pierdută. **TROPUL „DE PLUMB” + TITLUL** → apăsare și claustrare.",
        "label": "REȚINE",
        "variant": "success"
      }
    ]
  }
];
  Object.freeze(lessons);
  window.FormulaXCuratedLiterature={version:1,lessons};
})();
