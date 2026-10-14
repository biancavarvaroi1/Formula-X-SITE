(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const levels=['Text complet','Câteva cuvinte ascunse','Mai puține indicii','Aproape tot ascuns','Doar imagini și repere'];
  let context=null,quiz=null,revealed=new Set(),fragments=new Map(),settings={};
  function question(id,reper,prompt,correct,distractors,explanation,image){
    const choices=[correct,...distractors].map(x=>String(x||'').trim());
    if(choices.length!==4||choices.some(x=>!x)||new Set(choices.map(x=>x.toLocaleLowerCase('ro-RO'))).size!==4)throw new Error('Întrebare invalidă: '+id);
    return {id,reper,prompt,choices,correct:0,explanation:explanation||correct,image};
  }
  function makeQuestions(slug,essay,l){
    const a=l.statusCards,s=l.scenes,t=l.structureCards,rows=[];
    const add=(r,prompt,correct,wrong,explanation,image)=>rows.push(question(essay+'-r'+r+'-'+(rows.filter(x=>x.reper===r).length+1),r,prompt,correct,wrong,explanation,image));
    const point=(card,index)=>card.points[index];
    const why=card=>card.relevance||card.takeaway||card.points.join(' ');
    const human=slug==='harap-alb',character=essay==='caracterizare';
    if(human&&!character){
      add(1,'Ce particularitate a protagonistului este analizată ca primă trăsătură a basmului?',a[0].title,[a[1].title,'IDEALIZAREA ABSOLUTĂ A EROULUI','PUTERILE SUPRANATURALE ALE EROULUI'],point(a[0],2),a[0].image);
      add(1,'Ce defecte explică reacțiile omenești ale lui Harap-Alb?',point(a[0],3),['El anticipează toate pericolele și înțelege imediat intențiile fiecărui personaj.','El este lipsit de teamă, nu poate greși și nu are nevoie de ajutor.','El este deja matur și cunoaște de la început rezultatul tuturor probelor.'],point(a[0],3));
      add(1,'Cum se numește apropierea comportamentului personajelor fabuloase de viața obișnuită?',a[1].title,['ELIMINAREA FANTASTICULUI','IDEALIZAREA TRECUTULUI','ABSENȚA MOTIVAȚIEI PSIHOLOGICE'],why(a[1]),a[1].image);
      add(1,'Cum ilustrează craiul umanizarea fantasticului?',point(a[1],0),['Își abandonează fiii și nu este interesat de alegerile sau de încercările lor.','Le garantează succesul fără probe și îi tratează pe toți ca pe eroi invulnerabili.','Le interzice orice alegere și refuză să le verifice pregătirea pentru drum.'],point(a[1],0));
      add(1,'Cum se raportează Harap-Alb la cele cinci creaturi neobișnuite?',point(a[1],1),['Le respinge din cauza înfățișării și refuză să călătorească alături de ele.','Le consideră dușmani și urmărește să le îndepărteze de pe drumul său.','Rămâne indiferent față de ele și nu stabilește nicio relație de prietenie.'],point(a[1],1));
      add(1,'Care este tema urmărită în eseul despre particularitățile basmului?',l.keyIdea,['CONDIȚIA CREATORULUI','PATIMA PENTRU BANI','CONFLICTUL DINTRE GENERAȚII'],l.memoryLine||l.secondaryIdea);
    }else if(human&&character){
      add(1,'Care este statutul social inițial al protagonistului?',point(a[0],0),['Este o slugă fără origine nobilă și fără legături cu familia craiului.','Este deja împărat și conduce împărăția unchiului său.','Este un negustor care pleacă la drum pentru a-și spori averea.'],why(a[0]),a[0].image);
      add(1,'Care este traseul social al lui Harap-Alb?',a[0].takeaway,['VIITOR ÎMPĂRAT → FIU DE CRAI → SLUGĂ','SLUGĂ → NEGUSTOR → CIZMAR','FIU DE CRAI → ÎMPĂRAT, FĂRĂ PIERDEREA STATUTULUI'],a[0].points.join(' '));
      add(1,'Ce comportamente arată carențele morale de la început?',point(a[1],0),['Respectă de la început toate sfaturile și este milostiv în fiecare întâlnire.','Refuză tovărășia Spânului și nu se lasă înșelat niciodată.','Își încheie deja formarea și nu mai are nicio greșeală de corectat.'],point(a[1],1),a[1].image);
      add(1,'Ce particularitate psihologică are adolescentul aflat la începutul formării?',point(a[2],0),['Înțelege din prima intențiile ascunse ale tuturor personajelor întâlnite.','Are experiența unui conducător matur și anticipează orice pericol.','Este invulnerabil și nu trece prin teamă, îndoială sau neputință.'],why(a[2]),a[2].image);
      add(1,'Ce eroare de percepție dovedește naivitatea sa în întâlnirile cu Spânul?',point(a[2],2),['Recunoaște imediat același om și refuză de fiecare dată ajutorul oferit.','Înțelege intenția Spânului înainte de intrarea în fântână și îl demască.','Îl recunoaște pe Spân drept craiul deghizat și îi urmează sfatul părintesc.'],point(a[2],2));
      add(1,'Care este trăsătura dominantă urmărită în caracterizare?',l.keyIdea,['BUNĂTATEA ABSOLUTĂ, FĂRĂ DEFECTE','LĂCOMIA','INVULNERABILITATEA SUPRANATURALĂ'],l.keyExplanation||l.memoryLine);
    }else if(!human&&!character){
      add(1,'Cum este construit personajul realist analizat în primul reper?',point(a[0],0),['Este un erou fabulos, cu puteri magice și fără o condiție socială precisă.','Este un personaj idealizat, care nu poate avea slăbiciuni sau interese materiale.','Este un simbol abstract, fără legături cu mediul rural și cu societatea.'],why(a[0]),a[0].image);
      add(1,'Ce tipologie umană reprezintă Ghiță?',point(a[0],1),['Tipologia omului indiferent față de bani și față de poziția socială.','Tipologia eroului invulnerabil, lipsit de conflicte și de îndoieli.','Tipologia creatorului izolat, preocupat exclusiv de artă.'],point(a[0],1));
      add(1,'De ce devine Ghiță cârciumar și ce schimbare urmează?',point(a[0],3),['Renunță la orice dorință de câștig și urmărește numai să se izoleze de oameni.','Primește cârciuma fără să își dorească un trai mai bun pentru familie.','Se mută la cârciumă doar pentru a-i demonstra bătrânei că banii nu îl interesează.'],point(a[0],4));
      add(1,'Ce mentalități se opun în conflictul exterior?',point(a[1],0),['Mentalitatea tradițională și cea capitalistă se susțin reciproc, fără tensiuni.','Conflictul opune două lumi fabuloase, separate prin obiecte și cifre magice.','Conflictul este exclusiv unul politic și nu are legătură cu moralitatea sau cu banii.'],point(a[1],1),a[1].image);
      add(1,'Între ce tendințe este prins Ghiță în conflictul interior?',point(a[1],2),['Între două dorințe identice de a părăsi familia și de a renunța la câștig.','Între aspirația de a deveni împărat și obligația de a trece probe fabuloase.','Între dragostea pentru artă și dorința de a trăi departe de societate.'],point(a[1],3));
      add(1,'Care este tema principală formulată în eseu?',l.keyIdea,['TRIUMFUL BINELUI ASUPRA RĂULUI ÎNTR-O LUME FABULOASĂ','CONDIȚIA POETULUI ÎN SOCIETATE','IDEALIZAREA COPILĂRIEI'],l.keyExplanation||l.memoryLine);
    }else{
      add(1,'Care este ocupația și condiția socială inițială a lui Ghiță?',point(a[0],0),['Este un boier bogat, fără griji materiale și fără obligații familiale.','Este un negustor înstărit care urmărește de la început să fugă din țară.','Este un conducător de porcari și stăpânește deja lumea lui Lică.'],why(a[0]),a[0].image);
      add(1,'Ce responsabilitate îl determină să caute un trai mai bun?',point(a[0],1),['Se simte responsabil doar pentru prosperitatea lui Lică și pentru afacerile acestuia.','Urmărește exclusiv să scape de orice legătură cu Ana și cu cei mici încă de la început.','Nu are nicio responsabilitate față de familie și nu ține cont de traiul ei.'],point(a[0],2));
      add(1,'Care este direcția evoluției morale a protagonistului?',a[1].takeaway,['UCIGAȘ → OM CINSTIT → PROTECTOR AL FAMILIEI','OM CINSTIT → EROU FABULOS → ÎMPĂRAT','COMPLICE → OM CINSTIT, FĂRĂ UN SFÂRȘIT TRAGIC'],a[1].points.join(' '),a[1].image);
      add(1,'Cum se manifestă Ghiță psihologic la început?',point(a[2],0),['Este deja cuprins de teamă și refuză orice decizie pentru binele familiei.','Este complet dependent de Lică încă înainte de a lua cârciuma în arendă.','Este nepăsător față de familie și urmărește numai să-și ascundă banii.'],point(a[2],0),a[2].image);
      add(1,'Ce schimbare psihologică produce influența lui Lică?',point(a[2],1),['Îl face sigur pe sine, liniștit și complet independent în toate alegerile.','Îi înlătură suspiciunea și întărește fără rezerve apropierea de familie.','Nu produce nicio schimbare în încrederea, deciziile sau comportamentul său.'],point(a[2],2));
      add(1,'Care este trăsătura dominantă a lui Ghiță?',l.keyIdea,['ALTRUISMUL CONSTANT','CURĂȚENIA MORALĂ NEȘTIRBITĂ','INVULNERABILITATEA'],l.memoryLine||l.keyExplanation);
    }
    if(human){
      add(2,'Cum îl atrage Spânul pe tânăr în fântână?',point(s[0],0),['Îl trimite să caute în fântână sălățile cerute de Împăratul Verde.','Îl obligă să sară în fântână pentru a demonstra că are puteri supranaturale.','Îi spune că în fântână se află fata Împăratului Roș și că trebuie să o elibereze.'],point(s[0],1),s[0].image);
      add(2,'Ce face tânărul pentru a-și salva viața în scena fântânii?',point(s[0],2),['Îl pedepsește imediat pe Spân și își recâștigă singur statutul de fiu de crai.','Își abandonează definitiv identitatea fără să facă niciun jurământ.','Refuză toate condițiile Spânului și iese din fântână prin propriile puteri magice.'],why(s[0]));
      add(2,'Care este relevanța scenei fântânii pentru acest eseu?',s[0].relevance,character?['Scena dovedește invulnerabilitatea eroului și absența fricii în fața oricărui pericol.','Scena arată că eroul este deja matur și nu mai are nevoie de nicio experiență.','Scena demonstrează lăcomia eroului și dorința sa de a ascunde banii familiei.']:['Scena încheie definitiv lupta dintre bine și rău, prin pedepsirea Spânului.','Scena arată victoria definitivă a binelui și încheierea tuturor probelor.','Scena elimină orice conflict și dovedește că tânărul este invulnerabil.'],s[0].relevance);
      if(character){
        add(2,'Ce îi cere Spânul în prima probă analizată în caracterizare?',point(s[1],0),['Îi poruncește să ia în arendă o cârciumă și să câștige bani pentru familie.','Îi cere să devină împărat înainte de a primi ajutorul calului.','Îi poruncește să aducă obiectele folosite pentru învierea sa din final.'],why(s[1]),s[1].image);
        add(2,'Cum reacționează eroul la proba din Grădina Ursului?',point(s[1],1),['Pornește fără ezitare, fiind convins că nu poate fi rănit și că nu are nevoie de ajutor.','Refuză definitiv proba și renunță imediat la drumul său de formare.','Rămâne indiferent și privește sarcina ca pe un exercițiu lipsit de orice pericol.'],point(s[1],2));
        add(2,'Ce demonstrează această probă despre trăsătura dominantă?',s[1].relevance,['Demonstrează că eroul nu are nicio slăbiciune și că puterile sale magice rezolvă orice încercare.','Demonstrează că eroul este dominat de patima banilor și își sacrifică familia pentru câștig.','Demonstrează absența maturizării, deoarece eroul nu acceptă niciun sfat și abandonează proba.'],point(s[1],3));
      }else{
        add(2,'Cum este dezvăluită adevărata identitate a eroului în final?',point(s[1],0),['Spânul își recunoaște singur înșelătoria și îl prezintă voluntar pe tânăr ca moștenitor.','Craiul îl găsește în fântână și îi dezvăluie identitatea înainte de toate probele.','Eroul își dezvăluie identitatea ca să primească bani de la Împăratul Roș.'],why(s[1]),s[1].image);
        add(2,'Cum este readus Harap-Alb la viață?',point(s[1],3),['Calul îl readuce la viață fără ajutorul fetei și fără obiecte magice.','Spânul îl învie pentru a păstra jurământul și a relua probele.','Împăratul Verde îl învie cu sălățile aduse din Grădina Ursului.'],point(s[1],3));
        add(2,'Ce semnificație are finalul pentru tema basmului?',s[1].relevance,['Răul câștigă definitiv, Spânul își păstrează puterea, iar eroul rămâne o slugă lipsită de identitate.','Conflictul rămâne nerezolvat, deoarece eroul nu își recapătă statutul și nu se încheie inițierea.','Finalul dovedește că binele și răul nu intră niciodată în confruntare, iar probele nu produc maturizare.'],point(s[1],4));
      }
    }else{
      add(2,'Cum se comportă Ghiță față de Ana în scena petrecerii sub arini?',point(s[0],0),['Îi ascultă grijile cu răbdare și renunță imediat la cârciumă pentru binele familiei.','Rămâne afectuos și îi oferă Anei siguranță, fără să fie preocupat de câștig.','Îi cere sprijinul pentru a-l îndepărta definitiv pe Lică și pentru a renunța la bani.'],why(s[0]),s[0].image);
      add(2,'Ce îl împiedică pe Ghiță să părăsească cârciuma?',point(s[0],1),['Dorința de a apăra exclusiv liniștea familiei, fără niciun interes pentru bani.','Lipsa oricărei posibilități de a se apropia de Lică sau de lumea câștigului.','Hotărârea de a respecta fără abatere sfatul bătrânei încă de la început.'],point(s[0],2));
      add(2,'Care este relevanța scenei de sub arini?',s[0].relevance,['Dragostea de familie învinge definitiv dorința de câștig, iar Ghiță părăsește cârciuma.','Ghiță își recapătă complet echilibrul moral și se desprinde fără ezitare de Lică.','Scena dovedește că îmbogățirea nu afectează nici familia, nici echilibrul interior al protagonistului.'],s[0].relevance);
      add(2,'Ce pretext folosește Ghiță pentru a cere o sumă mai mare lui Lică?',point(s[1],0),['Invocă plata unei nunți, deși urmărește să se împace definitiv cu Ana.','Invocă nevoia de a cumpăra o moară nouă, fără să intenționeze să ia banii lui Lică.','Invocă dorința de a-i restitui toate veniturile cârciumii și de a renunța la câștig.'],why(s[1]),s[1].image);
      add(2,'Care este intenția reală din spatele planului lui Ghiță?',point(s[1],1),['Să îi restituie banii lui Lică și să continue aceleași afaceri fără niciun risc.','Să rămână la cârciumă și să folosească banii exclusiv pentru a apăra liniștea familiei.','Să își recunoască greșelile și să îi predea lui Lică toată averea câștigată.'],point(s[1],2));
      add(2,'Ce arată trecerea de la teamă la îndrăzneala acestui plan?',s[1].relevance,['Arată vindecarea morală completă și renunțarea definitivă la patima pentru bani.','Arată un curaj eroic, lipsit de interes material și orientat exclusiv spre salvarea familiei.','Arată că Ghiță nu înțelege deloc pericolul, deoarece nu știe nimic despre violența lui Lică.'],point(s[1],2)+' '+s[1].relevance);
    }
    if(human&&!character){
      add(3,'Ce tipuri de formule apar în basm?',point(t[0],0),['Apar doar formule finale, deoarece începutul și parcursul acțiunii nu au formule specifice.','Apar exclusiv formule de mijloc, fără o intrare sau o ieșire din lumea fabuloasă.','Apar formule doar în dialogurile împăraților, fără rol în organizarea basmului.'],why(t[0]),t[0].image);
      add(3,'Ce rol are formula inițială în eseul analizat?',point(t[0],1),['Încheie acțiunea și readuce cititorul la realitatea cotidiană.','Prezintă concluzia moralizatoare după moartea tuturor personajelor.','Stabilește o dată istorică exactă și elimină caracterul fabulos al basmului.'],point(t[0],1));
      add(3,'Ce rol are formula finală?',point(t[0],2),['Îl păstrează pe cititor definitiv în lumea fabuloasă și exclude orice umor.','Deschide o nouă serie de probe, fără legătură cu realitatea sau cu statutul cititorului.','Prezintă în mod obiectiv o dată istorică precisă și o localizare geografică exactă.'],point(t[0],3));
      add(3,'Cum sunt timpul și spațiul basmului?',point(t[1],0),['Sunt precizate prin date istorice exacte și prin localități identificabile.','Sunt limitate la o singură zi reală și la un sat transilvănean documentat.','Sunt reconstruite numai prin amintirile personajului, fără elemente fabuloase.'],point(t[1],1),t[1].image);
      add(3,'Ce probă este asociată primului pod?',point(t[1],2),['Proba câștigului material, în care Ghiță negociază bani cu Lică.','Proba învierii, în care fata folosește apă moartă și apă vie.','Proba din Grădina Ursului, rezolvată fără intervenția craiului.'],point(t[1],2));
      add(3,'Ce semnificație simbolică are podul?',point(t[1],4),['Reprezintă renunțarea definitivă la maturizare și întoarcerea la copilărie.','Reprezintă un simplu element de decor, fără legătură cu inițierea eroului.','Reprezintă numai granița dintre bogăție și sărăcie, fără rol în formarea eroului.'],point(t[1],3)+' '+point(t[1],4));
    }else if(human&&character){
      add(3,'Prin ce mijloc îl prezintă naratorul drept „boboc” pe protagonist?','Caracterizare directă',['Caracterizare indirectă prin fapte','Autocaracterizare','Descriere exclusivă a cadrului natural'],point(t[0],0),t[0].image);
      add(3,'Ce evidențiază caracterizarea indirectă?',point(t[0],2),['Exclusiv părerile formulate explicit de narator, fără fapte sau relații.','Numai numele personajului, fără gesturi, vorbe sau raportarea la ceilalți.','Doar înfățișarea cadrului natural, fără informații despre caracter.'],point(t[0],3));
      add(3,'Ce rol are prezentarea defectelor eroului?',point(t[0],1),['Îl transformă într-un erou invulnerabil, lipsit de orice reacție omenească.','Îl îndepărtează de lumea reală și elimină toate legăturile cu experiența cotidiană.','Arată că protagonistul nu poate învăța nimic și că formarea sa este imposibilă.'],why(t[0]));
      add(3,'Ce particularitate are numele „Harap-Alb”?',point(t[1],0),['Este un nume lipsit de orice contradicție și păstrează identitatea reală de la început.','Este un toponim care denumește locul unde se află cârciuma protagonistului.','Este un nume dat la naștere, fără legătură cu pierderea statutului social.'],why(t[1]),t[1].image);
      add(3,'Cum sunt explicate cele două componente ale numelui?',point(t[1],1),['Ambele componente arată că personajul este lipsit de origine nobilă.','„Harap” desemnează împăratul, iar „alb” desemnează exclusiv răul absolut.','Componentele indică numai aspectul fizic și nu au legătură cu statutul ascuns.'],point(t[1],2));
      add(3,'Ce sintetizează titlul și numele protagonistului?',point(t[1],3),['O identitate lipsită de contradicții, care nu se schimbă pe parcursul basmului.','Victoria definitivă a răului și imposibilitatea eroului de a-și recâștiga statutul.','Puteri supranaturale proprii, prin care eroul rezolvă singur toate probele.'],point(t[1],2)+' '+point(t[1],3));
    }else if(!character){
      add(3,'Ce desemnează titlul „Moara cu noroc”?',point(t[0],0),['Numele oximoronic al protagonistului, primit în scena fântânii.','O formulă finală care readuce cititorul din lumea fabuloasă.','Exclusiv numele unei emoții, fără referire la locul acțiunii.'],point(t[0],1),t[0].image);
      add(3,'De ce consideră drumeții că sunt norocoși când ajung aici?',point(t[0],2),['Pentru că locul le garantează îmbogățirea și îi scapă de orice pericol.','Pentru că găsesc o moară nouă care le asigură câștiguri fără efort.','Pentru că sunt obligați să rămână definitiv la cârciumă și să renunțe la călătorie.'],point(t[0],2));
      add(3,'Cum se transformă norocul cârciumarului?',point(t[0],3),['Rămâne durabil și îi asigură până la final liniștea și prosperitatea familiei.','Se transformă într-o maturizare fericită, fără degradare morală sau pierderi.','Dispare numai pentru drumeți, în timp ce cârciumarul rămâne fericit și în siguranță.'],why(t[0]));
      add(3,'Ce relație evidențiază semnificația titlului?',point(t[0],4),['O identitate deplină între promisiunea norocului și sfârșitul fericit al protagonistului.','O comparație între puterile supranaturale ale personajelor și lumea reală.','O enumerare a câștigurilor, lipsită de legătură cu destinul personajelor.'],point(t[0],3));
      add(3,'Cum este organizată compozițional nuvela?',point(t[1],0),['Are trei capitole și o organizare fără legătură între incipit și final.','Are douăzeci de capitole și se încheie fără reluarea vreunui motiv inițial.','Are un singur capitol și urmărește un timp fabulos, complet nedeterminat.'],point(t[1],1),t[1].image);
      add(3,'Ce elemente susțin circularitatea nuvelei?',point(t[1],4),['Reapariția Spânului și a calului năzdrăvan în formula finală a basmului.','Dispariția vocii bătrânei și absența oricărei legături între început și final.','Prezentarea unui final fericit care anulează avertismentul moralizator inițial.'],point(t[1],2)+' '+point(t[1],3));
    }else{
      add(3,'Ce mijloc de caracterizare folosesc aprecierile formulate explicit de bătrână, Pintea, Ana și Lică?','Caracterizare directă',['Caracterizare indirectă','Autocaracterizare','Descriere a cadrului natural'],point(t[0],0),t[0].image);
      add(3,'Cum sunt evidențiate indirect trăsăturile lui Ghiță?',point(t[0],1),['Numai prin citate în care celelalte personaje își formulează explicit părerea despre el.','Exclusiv prin vocea naratorului care îi enumeră direct trăsăturile.','Doar prin numărul capitolelor, fără fapte, limbaj sau relații familiale.'],point(t[0],1));
      add(3,'Ce mijloc de caracterizare apare când Ghiță se numește pe sine „un ticălos”?','Autocaracterizare',['Caracterizare directă făcută de Pintea','Caracterizare indirectă prin decor','Descriere obiectivă a cârciumii'],point(t[0],2));
      add(3,'Ce opoziție definește conflictul exterior?',point(t[1],0),['Bătrâna și Lică susțin aceleași valori ale câștigului, fără nicio opoziție morală.','Ghiță se confruntă doar cu propriile gânduri, fără tensiuni între mentalități.','Conflictul opune lumea reală unei lumi fabuloase, dominată de obiecte magice.'],point(t[1],0),t[1].image);
      add(3,'Între ce valori se desfășoară conflictul interior al protagonistului?',point(t[1],1),['Între două dorințe identice de a renunța definitiv la bani și la cârciumă.','Între originea nobilă de fiu de crai și identitatea falsă de slugă a Spânului.','Între iubirea pentru artă și dorința de a se retrage din societate.'],why(t[1]));
      add(3,'Cum contribuie incipitul și finalul la construcția nuvelei?',point(t[1],2),['Rămân complet independente și nu reiau vocea bătrânei sau vreun motiv literar.','Prezintă exclusiv victorii ale binelui într-un cadru fabulos și nedeterminat.','Arată o evoluție fără schimbări, în care Ghiță rămâne la fel de cinstit până la final.'],point(t[1],2));
    }
    return rows;
  }
  function hash(text){let n=2166136261;for(const ch of text)n=Math.imul(n^ch.codePointAt(0),16777619);return n>>>0;}
  function selectedLevel(){return settings[context?.essay]?.level||0;}
  function effectiveLevel(){return settings[context?.essay]?.showAll?0:selectedLevel();}
  function setContext(next){
    if(!context||context.slug!==next.slug||context.essay!==next.essay||context.version!==next.version){quiz=null;revealed.clear();fragments.clear();}
    context=next;
    if(!settings[next.essay])settings[next.essay]={level:0,showAll:false};
  }
  function setLevel(level){if(!context||!Number.isInteger(level)||level<0||level>4)return false;settings[context.essay]={level,showAll:false};revealed.clear();return true;}
  function toggleText(){if(!context)return;settings[context.essay].showAll=!settings[context.essay].showAll;}
  function text(value,id){
    const raw=String(value??'');fragments.set(id,raw);
    const level=effectiveLevel();if(level===0)return '<span data-fxs-text>'+esc(raw)+'</span>';
    if(level===4)return '<span data-fxs-text class="fxs-hidden">Text ascuns pentru exercițiu</span>';
    let index=0;
    const ratios=[0,.25,.55,.8];
    const output=raw.split(/([\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*)/u).map(token=>{
      if(!/^[\p{L}\p{N}]/u.test(token))return esc(token);
      const i=index++,key=id+':'+i;
      if(token.length<4||hash(id+':'+i+':'+token)%100>=ratios[level]*100||revealed.has(key))return esc(token);
      return '<button type="button" class="fxs-blank" data-fxs-action="word" data-fxs-fragment="'+esc(id)+'" data-fxs-word="'+i+'" aria-label="Arată un cuvânt ascuns">_____</button>';
    }).join('');
    return '<span data-fxs-text>'+output+'</span>';
  }
  function reveal(id,index){if(!fragments.has(id)||!Number.isInteger(index)||index<0)return false;revealed.add(id+':'+index);return true;}
  function shuffle(list){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function start(reper=0,onlyWrong=false){
    if(!context||!context.lesson||!Number.isInteger(reper)||reper<0||reper>3)return false;
    let questions;
    if(onlyWrong){if(!quiz?.finished)return false;questions=quiz.questions.filter((q,i)=>!quiz.answers[i]?.correct);if(!questions.length)return false;}
    else questions=makeQuestions(context.slug,context.essay,context.lesson).filter(q=>!reper||q.reper===reper);
    questions=shuffle(questions).map(q=>{const choices=shuffle(q.choices.map((label,i)=>({label,correct:i===q.correct})));return {...q,choices:choices.map(c=>c.label),correct:choices.findIndex(c=>c.correct)};});
    quiz={reper,questions,index:0,selected:null,checked:false,finished:false,answers:[],retryOnly:onlyWrong};return true;
  }
  function select(index){if(!quiz||quiz.finished||quiz.checked||!Number.isInteger(index)||index<0||index>3)return false;quiz.selected=index;return true;}
  function check(){if(!quiz||quiz.finished||quiz.checked||quiz.selected===null)return false;const q=quiz.questions[quiz.index];quiz.answers[quiz.index]={selected:quiz.selected,correct:quiz.selected===q.correct};quiz.checked=true;return true;}
  function next(){if(!quiz||!quiz.checked||quiz.finished)return false;if(quiz.index===quiz.questions.length-1)quiz.finished=true;else{quiz.index++;quiz.selected=null;quiz.checked=false;}return true;}
  function stop(){quiz=null;}
  function score(){return quiz?{correct:quiz.answers.filter(x=>x.correct).length,total:quiz.questions.length}:null;}
  function quizActive(){return !!quiz;}
  function quizHtml(image){
    if(!quiz||!context)return '';
    const title=context.essay==='caracterizare'?'Eseul 2 · Caracterizare':'Eseul 1 · Particularități';
    const name=quiz.retryOnly?'Recapitularea întrebărilor greșite':quiz.reper?'Reper '+quiz.reper+' · '+esc(context.reperNames[quiz.reper-1]):'Chestionarul complet al eseului';
    let body='';
    if(quiz.finished){
      const result=score(),wrong=quiz.questions.filter((q,i)=>!quiz.answers[i]?.correct);
      const per=[1,2,3].map(r=>{const ids=quiz.questions.map((q,i)=>q.reper===r?i:-1).filter(i=>i>=0);return ids.length?'<li><strong>Reper '+r+':</strong> '+ids.filter(i=>quiz.answers[i]?.correct).length+' / '+ids.length+' răspunsuri corecte</li>':'';}).join('');
      body='<h2>Ai încheiat chestionarul</h2><p class="fxs-score">'+result.correct+' <span>/ '+result.total+'</span></p><p>Verifică explicațiile, apoi reia fragmentele la care ai avut nevoie de ajutor.</p><ul class="fxs-breakdown">'+per+'</ul><div class="fxs-actions">'+(wrong.length?'<button class="fxl-btn" data-fxs-action="retry-wrong">'+(wrong.length===1?'Reia întrebarea greșită':'Reia cele '+wrong.length+' întrebări greșite')+'</button>':'<p class="fxs-correct">Toate răspunsurile sunt corecte.</p>')+'<button class="fxl-btn secondary" data-fxs-action="restart">Chestionar nou</button><button class="fxl-btn secondary" data-fxs-action="back">Înapoi la eseu</button></div><details class="fxs-review"><summary>Vezi răspunsurile și explicațiile</summary>'+quiz.questions.map((q,i)=>'<article><strong>'+esc(q.prompt)+'</strong><p class="'+(quiz.answers[i]?.correct?'fxs-correct':'fxs-wrong')+'">Răspunsul tău: '+esc(q.choices[quiz.answers[i]?.selected])+'</p><p><strong>Răspuns corect:</strong> '+esc(q.choices[q.correct])+'</p><p>'+esc(q.explanation)+'</p></article>').join('')+'</details>';
    }else{
      const q=quiz.questions[quiz.index];
      const correct=quiz.checked&&quiz.answers[quiz.index].correct;
      body='<div class="fxs-progress"><span>Întrebarea '+(quiz.index+1)+' din '+quiz.questions.length+' · Reper '+q.reper+'</span><progress value="'+quiz.index+'" max="'+quiz.questions.length+'" aria-label="Progresul chestionarului"></progress></div><h2>'+esc(q.prompt)+'</h2>'+(q.image?'<div class="fxs-quiz-image">'+image(q.image,'Imagine pentru întrebarea din reperul '+q.reper)+'</div>':'')+'<fieldset class="fxs-options"><legend>Alege un singur răspuns</legend>'+q.choices.map((choice,i)=>'<label class="fxs-option '+(quiz.checked?(i===q.correct?'is-correct':i===quiz.selected?'is-wrong':''):'')+'"><input type="radio" name="fxs-answer" data-fxs-choice value="'+i+'" '+(quiz.selected===i?'checked ':'')+(quiz.checked?'disabled':'')+'><span><b>'+String.fromCharCode(65+i)+'.</b> '+esc(choice)+'</span></label>').join('')+'</fieldset>'+(quiz.checked?'<div id="fxs-feedback" class="fxs-feedback '+(correct?'is-correct':'is-wrong')+'" role="status" tabindex="-1"><strong>'+(correct?'Corect!':'Răspunsul corect este '+String.fromCharCode(65+q.correct)+'.')+'</strong><p>'+esc(q.explanation)+'</p></div>':'')+'<div class="fxs-actions">'+(quiz.checked?'<button class="fxl-btn" data-fxs-action="next">'+(quiz.index===quiz.questions.length-1?'Vezi rezultatul':'Întrebarea următoare')+'</button>':'<button id="fxs-check" class="fxl-btn" data-fxs-action="check" '+(quiz.selected===null?'disabled':'')+'>Verifică răspunsul</button>')+'<button class="fxl-btn secondary" data-fxs-action="back">Înapoi la eseu</button></div>';
    }
    return '<section id="fxs-quiz" class="fxs-quiz" tabindex="-1" aria-label="Chestionar pentru eseul selectat"><p class="fxl-eyebrow">'+esc(title)+'</p><p class="fxs-subtitle">'+name+'</p>'+body+'</section>';
  }
  function toolbar(){
    const level=selectedLevel(),show=settings[context.essay].showAll;
    return '<section class="fxs-toolbar" aria-label="Exercițiu de memorare"><div><p class="fxl-eyebrow">Învață eseul din imagini</p><h2>Tot mai puține indicii</h2><p>Explică fiecare reper din memorie. Apasă pe un spațiu gol pentru un indiciu și compară apoi cu textul complet.</p></div><div class="fxs-levels" role="group" aria-label="Nivelul de ascundere">'+levels.map((label,i)=>'<button type="button" data-fxs-action="level" data-fxs-level="'+i+'" aria-pressed="'+(i===level)+'"><span>'+i+'</span>'+esc(label)+'</button>').join('')+'</div><div class="fxs-actions"><button class="fxl-btn" data-fxs-action="harder" '+(level===4?'disabled':'')+'>Ascunde mai mult</button><button class="fxl-btn secondary" data-fxs-action="easier" '+(level===0?'disabled':'')+'>Mai multe indicii</button><button class="fxl-btn secondary" data-fxs-action="toggle-text" '+(level===0?'disabled':'')+'>'+(show?'Revino la exercițiu':'Arată textul pentru verificare')+'</button><button class="fxl-btn" data-fxs-action="quiz" data-fxs-reper="0">Chestionar pe tot eseul · 18 întrebări</button></div><p class="fxs-level-note" role="status">'+esc(show?'Textul complet este vizibil pentru verificare.':levels[level])+'. Chestionarele folosesc eseul selectat mai sus.</p></section>';
  }
  function reperButton(reper){return '<div class="fxs-reper-action"><button class="fxl-btn secondary" type="button" data-fxs-action="quiz" data-fxs-reper="'+reper+'">Chestionar · Reper '+reper+' · 6 întrebări</button></div>';}
  function reset(){context=null;quiz=null;revealed.clear();fragments.clear();settings={};}
  const styles='<style>.fxs-toolbar,.fxs-quiz{border:1px solid #dfcdc5;border-radius:26px;padding:28px;background:#fffdfb;margin:0 0 30px}.fxs-toolbar h2,.fxs-quiz h2{font:800 clamp(23px,3vw,32px)/1.25 Georgia,serif;margin:8px 0 14px;color:#532b36}.fxs-toolbar p,.fxs-quiz p{line-height:1.7;color:#77615e;font-size:14px}.fxs-levels{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}.fxs-levels button{display:flex;align-items:center;gap:8px;border:1px solid #d7c4bc;border-radius:12px;background:#fff;padding:10px 13px;color:#6b3541;font:inherit;font-size:12px;cursor:pointer}.fxs-levels button[aria-pressed=true]{background:#672d3b;color:#fff;border-color:#672d3b}.fxs-levels span{font-weight:900}.fxs-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:20px}.fxs-actions .fxl-btn,.fxs-reper-action .fxl-btn{font-size:12px;padding:12px 16px}.fxs-toolbar button:disabled,.fxs-quiz button:disabled{opacity:.45;cursor:default}.fxs-toolbar button:focus-visible,.fxs-quiz button:focus-visible,.fxs-blank:focus-visible{outline:3px solid #d8b456;outline-offset:3px}.fxs-level-note{margin-bottom:0}.fxs-blank{border:0;border-bottom:2px dashed #b69384;border-radius:3px;background:#f1e5d9;color:#68363e;font:inherit;letter-spacing:.03em;padding:0 4px;cursor:pointer}.fxs-reper-action{margin:22px 0 10px}.fxs-images-only [data-fxs-text],.fxs-images-only .fxl-card-copy,.fxs-images-only .fxl-key,.fxs-images-only .fxl-memory,.fxs-images-only .fxl-conclusion{display:none}.fxs-images-only .fxl-hero-copy{padding-bottom:18px}.fxs-hidden{color:#ab9487}.fxs-quiz{max-width:1000px;margin-left:auto;margin-right:auto}.fxs-subtitle{font-weight:700}.fxs-progress{display:grid;gap:10px;margin:18px 0;font-size:12px;color:#886f67}.fxs-progress progress{width:100%;height:9px;accent-color:#713d4b}.fxs-options{border:0;padding:0;margin:22px 0;display:grid;gap:12px}.fxs-options legend{font-size:13px;margin-bottom:12px;color:#806c65}.fxs-option{display:flex;gap:12px;align-items:flex-start;padding:16px;border:1px solid #decfc6;border-radius:14px;background:#fff;color:#634e4c;font-size:14px;line-height:1.6;cursor:pointer;overflow-wrap:anywhere}.fxs-option input{margin-top:5px;accent-color:#713d4b;flex-shrink:0;width:17px;height:17px}.fxs-option:has(input:checked){border-color:#7e4352;background:#f5e9ed}.fxs-option.is-correct,.fxs-feedback.is-correct{background:#edf5ee;border-color:#719974;color:#365d3d}.fxs-option.is-wrong,.fxs-feedback.is-wrong{background:#fff0ed;border-color:#c58175;color:#903f37}.fxs-feedback{border:1px solid;border-radius:14px;padding:18px;line-height:1.7}.fxs-feedback p{margin:8px 0 0;color:inherit}.fxs-score{font:900 62px/1 Georgia,serif!important;color:#642b37!important;margin:22px 0!important}.fxs-score span{font-size:29px;color:#ab8b85}.fxs-breakdown{padding-left:20px;line-height:1.9;color:#775e58}.fxs-correct{color:#365d3d!important}.fxs-wrong{color:#903f37!important}.fxs-review{margin-top:25px;color:#6b3541}.fxs-review summary{cursor:pointer;font-weight:800}.fxs-review article{padding:20px 0;border-bottom:1px solid #eaded7;line-height:1.65}.fxs-quiz-image{max-width:420px;margin:18px auto}.fxs-quiz-image img{max-height:280px;object-fit:contain}.fxs-quiz-image figcaption{font-size:10px}@media(max-width:580px){.fxs-toolbar,.fxs-quiz{padding:22px 18px;border-radius:20px}.fxs-levels{display:grid;grid-template-columns:1fr}.fxs-actions{display:grid;grid-template-columns:1fr}.fxs-actions .fxl-btn{width:100%;justify-content:center;text-align:center}.fxs-option{padding:14px;font-size:14px}.fxs-reper-action .fxl-btn{width:100%;text-align:center}}@media print{.fxs-toolbar,.fxs-quiz,.fxs-reper-action{display:none}}</style>';
  window.FormulaXEssayPractice={setContext,setLevel,selectedLevel,effectiveLevel,toggleText,text,reveal,makeQuestions,start,select,check,next,stop,score,quizActive,quizHtml,toolbar,reperButton,reset,styles,levels,snapshot:()=>({context:context?{slug:context.slug,essay:context.essay}:null,quiz:quiz?{...quiz}:null,fragments:fragments.size})};
})();

// Formula X protected lesson page.
(() => {
  'use strict';
  const FX=window.FormulaXLessons, root=document.getElementById('fxl-content');
  const slug=document.body.dataset.lesson||new URLSearchParams(location.search).get('slug');
  let meta=FX.lessons.find(l=>l.slug===slug)||{slug,title:'Lecție Formula X',author:'Formula X'};
  const e=FX.esc,Study=window.FormulaXEssayPractice;
  let displayedAccess=null;
  const learn=(value,id)=>Study.text(value,id);
  let bundle=null,version=null,assetUrls={},sequence=0,heartbeat=null,expiryTimer=null;
  let account=null;
  function clearMaterial() {
    bundle=null;version=null;displayedAccess=null;Study?.reset();
    for(const url of Object.values(assetUrls)) URL.revokeObjectURL(url);
    assetUrls={};
    clearTimeout(expiryTimer);
    const dialog=document.getElementById('fxl-zoom');
    dialog?.close();
    if(dialog) dialog.querySelector('img').removeAttribute('src');
    root.replaceChildren();
  }
  function status(access={},message,context={}) {
    clearMaterial();
    const titles={login:'Conectează-te la Formula X',scheduled:'Acces programat',expired:'Perioada de acces s-a încheiat',paused:'Profesorul a oprit accesul',locked:'Lecție protejată',unavailable:'Lecția este în curs de activare',missing:'Lecția nu a fost găsită',error:'Nu am putut verifica accesul'};
    const descriptions={scheduled:`Lecția se deschide automat la ${FX.date(access.startsAt)}.`,locked:'Bianca îți poate acorda acces direct sau prin grupa ta. Folosește contul cu emailul pe care i l-ai comunicat.',expired:'Profesorul poate prelungi perioada de acces.',paused:'Revino după ce profesorul redeschide lecția.',unavailable:'Materialul este pregătit. Activarea accesului se finalizează în Formula X.',login:'Folosește același cont pe care îl ai pe site.'};
    let detail='';
    if(access.state==='locked') {
      if(context.enrolled===false) detail='Contul acesta nu este asociat unei înscrieri active la Română. Pentru acces prin grupă, profesorul verifică emailul din fișa elevului, statutul Activ și apartenența la grupa cu acces.';
      if(context.enrolled===true) detail='Înscrierea ta la Română este activă. Profesorul verifică dacă ești în grupa căreia i-a acordat această lecție, dacă grupa este activă și dacă accesul individual este setat pe „Preia accesul grupei”.';
      if(account?.email_confirmed_at===null) detail='Emailul acestui cont nu este confirmat. Confirmă contul prin mesajul primit pe email, apoi verifică din nou accesul.';
    }
    root.innerHTML=`<section class="fxl-status"><p class="fxl-eyebrow">${e(meta.title)}</p><h1>${e(titles[access.state]||titles.locked)}</h1>${account?.email&&access.state!=='login'?`<p class="fxl-note">Cont conectat: <strong>${e(account.email)}</strong></p>`:''}<p>${e(message||descriptions[access.state]||'Reîncearcă verificarea accesului.')}</p>${detail?`<p class="fxl-note" role="status">${e(detail)}</p>`:''}${access.state==='login'?`<form id="fxl-login" class="fxl-login"><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Parolă<input name="password" type="password" autocomplete="current-password" required></label><button class="fxl-btn" type="submit">Intră în cont</button><p id="fxl-login-message" class="fxl-error" role="status"></p><a class="fxl-login-link" href="/parola-uitata/">Ai uitat parola?</a><a class="fxl-login-link" href="/#cont">Creează un cont Formula X</a></form>`:''}<div class="fxl-actions" style="justify-content:center"><button class="fxl-btn secondary" data-fxl-action="retry" type="button">Verifică accesul</button>${account&&access.state!=='login'?'<button class="fxl-btn secondary" data-fxl-action="switch-account" type="button">Schimbă contul</button>':''}<a class="fxl-btn secondary" href="/lectii/romana/">Toate lecțiile</a></div></section>`;
  }
  function image(src,alt) {
    const url=assetUrls[src] || (src.endsWith('/coperta.png')?meta.cover:'');
    if(!url) return '';
    return `<figure class="fxl-image"><button type="button" data-fxl-image="${e(src)}" aria-label="Mărește imaginea: ${e(alt)}"><img src="${e(url)}" alt="${e(alt)}" loading="lazy"></button><figcaption>Apasă pe imagine pentru mărire</figcaption></figure>`;
  }
  function points(list,numbered=false,id='points') {
    return `<${numbered?'ol':'ul'} class="fxl-points">${list.map((point,index)=>`<li><span aria-hidden="true">${numbered?index+1:'✓'}</span><span>${learn(point,id+':'+index)}</span></li>`).join('')}</${numbered?'ol':'ul'}>`;
  }
  function heading(step,title,description) {
    return `<div class="fxl-section-head"><div><p class="fxl-eyebrow">${e(step)}</p><h2>${e(title)}</h2></div><p>${learn(description,'heading-'+step)}</p></div>`;
  }
  function card(item,id) {
    return `<article class="fxl-card">${image(item.image,item.alt)}<div class="fxl-card-copy"><p class="fxl-eyebrow">${e(item.eyebrow)}</p><h3>${learn(item.title,id+':title')}</h3>${points(item.points,false,id)}<p class="fxl-takeaway">${learn(item.takeaway,id+':takeaway')}</p></div></article>`;
  }
  function render(access) {
    displayedAccess=access;
    if(Object.hasOwn(bundle,'text')){
      root.innerHTML=`<p class="fxl-expiry">${access.endsAt?`Ai acces până la ${e(FX.date(access.endsAt))}.`:'Acces acordat de profesor.'}</p><article class="fxl-text-course"><p class="fxl-eyebrow">${e(bundle.subject)}</p><h1>${e(bundle.title)}</h1><div class="fxl-text-body">${e(bundle.text)}</div></article>`;
      return;
    }
    const selected=new URLSearchParams(location.search).get('eseu')==='caracterizare'?'caracterizare':'particularitati';
    const lesson=bundle.essays[selected];
    const names=lesson.reperNames||['Statutul personajului','Scene semnificative','Construcția personajului'];
    Study.setContext({slug,essay:selected,version,lesson,reperNames:names});
    const top=`${Study.styles}<nav class="fxl-essay-nav" aria-label="Alege eseul">${[
      ['particularitati','Eseul 1 · Particularități de construcție ale operei','Două trăsături · tema · două scene · elemente de construcție'],
      ['caracterizare',`Eseul 2 · Caracterizarea lui ${meta.character}`,'Statut · trăsătura dominantă · două scene · caracterizare'],
    ].map(([id,title,detail])=>`<a href="?eseu=${id}" data-fxl-essay="${id}" ${selected===id?'aria-current="page"':''}><strong>${e(title)}</strong><span>${e(detail)}</span></a>`).join('')}</nav>
    <p id="fxl-expiry" class="fxl-expiry">${access.state==='public'?'Eseul 1 este disponibil gratuit, fără cont.':access.state==='teacher'?'Previzualizare profesor · accesul elevilor se gestionează din portal.':access.endsAt?`Ai acces până la ${e(FX.date(access.endsAt))}.`:'Acces acordat de profesor.'}</p>
    `;
    if(Study.quizActive()){root.innerHTML=top+Study.quizHtml(image);return;}
    root.innerHTML=top+Study.toolbar()+`<div id="fxs-lesson-body" class="${Study.effectiveLevel()===4?'fxs-images-only':''}">
    <section class="fxl-hero"><div class="fxl-hero-copy"><div class="fxl-labels"><span class="fxl-badge">${e(lesson.label)}</span><span class="fxl-badge active">Schemă vizuală</span></div><p class="fxl-eyebrow">${e(meta.author)}</p><p class="fxl-eyebrow">Introducere</p><h1>${e(lesson.essayTitle)}</h1><p>${learn(lesson.intro,'intro')}</p><div class="fxl-key"><small>${e(lesson.keyLabel||'Trăsătura dominantă')}</small><strong>${learn(lesson.keyIdea,'key')}</strong><span>${learn(lesson.secondaryIdea,'secondary')}</span></div></div>${image(lesson.heroImage,lesson.heroAlt)}</section>
    <nav class="fxl-toc" aria-label="Cuprins">${names.map((name,index)=>`<a href="#reper-${index+1}"><small>Reper ${index+1}</small><strong>${e(name)}</strong></a>`).join('')}</nav>
    <section id="reper-1" class="fxl-section">${heading('Reper 1',lesson.firstReperTitle||'Statutul social, moral și psihologic',lesson.firstReperDescription||'Reține traseul personajului, apoi explicațiile pentru fiecare statut.')}<div class="fxl-grid ${lesson.statusCards.length===3?'three':''}">${lesson.statusCards.map((item,index)=>card(item,'status-'+index)).join('')}</div>${Study.reperButton(1)}</section>
    <section class="fxl-memory"><p class="fxl-eyebrow">Ideea care leagă întregul eseu</p><strong>${learn(lesson.keyIdea,'key')}</strong><p>${learn(lesson.memoryLine,'memory')}</p>${lesson.keyExplanation?`<p>${learn(lesson.keyExplanation,'key-explanation')}</p>`:''}</section>
    <section id="reper-2" class="fxl-section">${heading('Reper 2','Două scene semnificative',lesson.sceneDescription||`Ambele scene demonstrează trăsătura dominantă: ${lesson.keyIdea.toLocaleLowerCase('ro-RO')}.`)}<div class="fxl-grid">${lesson.scenes.map(scene=>`<article class="fxl-card">${image(scene.image,scene.alt)}<div class="fxl-card-copy"><p class="fxl-eyebrow">${e(scene.number)} · ${e(scene.chapter)}</p><h3>${learn(scene.title,'scene-title-'+scene.number)}</h3>${points(scene.points,true,'scene-'+scene.number)}<div class="fxl-relevance"><p class="fxl-eyebrow">Relevanță</p><p>${learn(scene.relevance,'relevance-'+scene.number)}</p></div></div></article>`).join('')}</div>${Study.reperButton(2)}</section>
    <section id="reper-3" class="fxl-section">${heading('Reper 3',lesson.structureTitle||'Elemente de construcție a personajului',lesson.structureDescription||'Leagă trăsăturile de mijloacele de caracterizare, de nume și de conflicte.')}<div class="fxl-grid">${lesson.structureCards.map((item,index)=>card(item,'structure-'+index)).join('')}</div>${Study.reperButton(3)}</section>
    <section class="fxl-conclusion"><div class="fxl-conclusion-label">Concluzie</div><p>${learn(lesson.conclusion,'conclusion')}</p></section></div>`;
  }
  async function verify() {
    const request=++sequence;
    try {
      const publicParticularitati=slug==='harap-alb' && new URLSearchParams(location.search).get('eseu')!=='caracterizare';
      if(publicParticularitati){
        const response=await fetch('/assets/public-harap-alb-particularitati.json',{credentials:'omit'});
        if(!response.ok)throw new Error('Material public indisponibil');
        const publicBundle=await response.json();
        if(request!==sequence)return;
        clearMaterial();
        bundle=publicBundle;version='public-harap-particularitati';
        render({state:'public',allowed:true});
        return;
      }
      const {data:{session}}=await FX.sb().auth.getSession();
      if(request!==sequence)return;
      account=session?.user||null;
      if(!session&&FX.lessons.some(l=>l.slug===slug)){status({state:'login'});return;}
      if(session)await FX.linkAccount();
      const result=await FX.rpc('fx_open_lesson',{p_slug:slug});
      if(request!==sequence)return;
      if(!result?.access?.allowed || (!result.key&&result.format!=='text')) {
        let enrolled;
        if(result?.access?.state==='locked'&&account?.id&&FX.lessons.some(l=>l.slug===slug)) {
          try {const checked=await FX.rpc('fx_student_is_enrolled',{p_student:account.id,p_subject:'romana'});if(typeof checked==='boolean')enrolled=checked;} catch {}
          if(request!==sequence)return;
        }
        status(result?.access||{state:'locked'},undefined,{enrolled});return;
      }
      if(result.format==='text'){
        meta={...meta,title:result.title};
        if(!bundle||bundle.text!==result.body){clearMaterial();bundle={text:result.body,title:result.title,subject:result.subject};version='text';render(result.access);}
      }
      else if(!bundle || version!==result.version) {
        const next=await FX.decryptBundle(slug,result.version,result.key);
        if(request!==sequence)return;
        clearMaterial(); bundle=next; version=result.version;
        for(const [path,asset] of Object.entries(bundle.assets||{})) {
          if(asset.type!=='image/webp') throw new Error('Format de imagine invalid');
          assetUrls[path]=URL.createObjectURL(new Blob([FX.decode(asset.data)],{type:asset.type}));
        }
        render(result.access);
      } else {
        displayedAccess=result.access;
        const note=document.getElementById('fxl-expiry');
        if(note)note.textContent=result.access.endsAt?`Ai acces până la ${FX.date(result.access.endsAt)}.`:result.access.state==='teacher'?'Previzualizare profesor · accesul elevilor se gestionează din portal.':'Acces acordat de profesor.';
      }
      clearTimeout(expiryTimer);
      if(result.access.endsAt){const remaining=new Date(result.access.endsAt).getTime()-Date.now();expiryTimer=setTimeout(verify,remaining>0?Math.min(2147483647,remaining+50):60000);}
    } catch(error) {if(request===sequence)status({state:error.code==='PGRST202'||error.code==='42883'?'unavailable':'error'},error.code==='PGRST202'||error.code==='42883'?undefined:'Verifică conexiunea și încearcă din nou.');}
  }
  document.addEventListener('click',async event=>{
    const retry=event.target.closest('[data-fxl-action="retry"]'); if(retry){verify();return;}
    const switchAccount=event.target.closest('[data-fxl-action="switch-account"]');
    if(switchAccount){
      event.preventDefault();switchAccount.disabled=true;
      try {const {error}=await FX.sb().auth.signOut();if(error)throw error;sequence++;account=null;status({state:'login'});} catch {status({state:'error'},'Nu am putut schimba contul. Reîncearcă.');}
      return;
    }
    const practice=event.target.closest('[data-fxs-action]');
    if(practice&&bundle&&!Object.hasOwn(bundle,'text')){
      event.preventDefault();
      const action=practice.dataset.fxsAction;
      if(action==='level')Study.setLevel(Number(practice.dataset.fxsLevel));
      else if(action==='harder')Study.setLevel(Math.min(4,Study.selectedLevel()+1));
      else if(action==='easier')Study.setLevel(Math.max(0,Study.selectedLevel()-1));
      else if(action==='toggle-text')Study.toggleText();
      else if(action==='word')Study.reveal(practice.dataset.fxsFragment,Number(practice.dataset.fxsWord));
      else if(action==='quiz')Study.start(Number(practice.dataset.fxsReper));
      else if(action==='check'){if(!Study.check())return;}
      else if(action==='next'){if(!Study.next())return;}
      else if(action==='back')Study.stop();
      else if(action==='restart')Study.start(Study.snapshot().quiz?.reper||0);
      else if(action==='retry-wrong'){if(!Study.start(Study.snapshot().quiz?.reper||0,true))return;}
      else return;
      render(displayedAccess||{state:'active'});
      if(['quiz','next','restart','retry-wrong'].includes(action)){const quizPanel=document.getElementById('fxs-quiz');quizPanel?.focus?.({preventScroll:true});quizPanel?.scrollIntoView?.({behavior:'smooth',block:'start'});}
      else if(action==='check')document.getElementById('fxs-feedback')?.focus?.({preventScroll:true});
      else if(['level','harder','easier','toggle-text'].includes(action))root.querySelector?.('[data-fxs-action="'+action+'"]'+(action==='level'?'[data-fxs-level="'+Study.selectedLevel()+'"]':''))?.focus?.({preventScroll:true});
      return;
    }
    const tab=event.target.closest('[data-fxl-essay]');
    if(tab && bundle){event.preventDefault();history.pushState(null,'',`?eseu=${tab.dataset.fxlEssay}`);render(displayedAccess||{state:'active'});verify();window.scrollTo({top:0,behavior:'smooth'});return;}
    const picture=event.target.closest('[data-fxl-image]');
    if(picture && bundle){const dialog=document.getElementById('fxl-zoom');const img=dialog.querySelector('img');img.src=assetUrls[picture.dataset.fxlImage] || meta.cover;img.alt=picture.querySelector('img').alt;dialog.showModal();}
  });
  document.addEventListener('change',event=>{
    if(bundle&&event.target.matches?.('[data-fxs-choice]')&&Study.select(Number(event.target.value))){const button=document.getElementById('fxs-check');if(button)button.disabled=false;}
  });
  document.getElementById('fxl-zoom-close').addEventListener('click',()=>document.getElementById('fxl-zoom').close());
  document.getElementById('fxl-zoom').addEventListener('click',event=>{if(event.target.id==='fxl-zoom')event.target.close();});
  document.addEventListener('submit',async event=>{
    if(event.target.id!=='fxl-login')return;
    event.preventDefault(); const form=event.target,btn=form.querySelector('button'),msg=form.querySelector('[role="status"]');
    btn.disabled=true;msg.textContent='';
    try {
      const {error}=await FX.sb().auth.signInWithPassword({email:form.elements.email.value.trim(),password:form.elements.password.value});
      form.elements.password.value='';
      if(error){msg.textContent='Conectarea nu a reușit. Verifică emailul, parola și confirmarea contului.';return;}
      await verify();
    } catch {msg.textContent='Nu am putut realiza conectarea. Reîncearcă.';} finally {btn.disabled=false;}
  });
  FX.sb().auth.onAuthStateChange((event)=>{
    if(event==='SIGNED_OUT'){sequence++;account=null;status({state:'login'});}
    else setTimeout(verify,0);
  });
  window.addEventListener('popstate',()=>{if(bundle)render(displayedAccess||{state:'active'});verify();});
  window.addEventListener('focus',verify);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)verify();});
  window.addEventListener('pagehide',()=>{sequence++;clearMaterial();clearInterval(heartbeat);heartbeat=null;});
  window.addEventListener('pageshow',()=>{if(!heartbeat)heartbeat=setInterval(verify,60000);verify();});
  heartbeat=setInterval(verify,60000);verify();
})();
