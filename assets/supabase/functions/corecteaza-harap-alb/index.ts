// Formula X — corector factual Harap-Alb
// Public Edge Function. OPENAI_API_KEY rămâne numai în Supabase Secrets.

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-5.6-luna';
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',').map(x => x.trim()).filter(Boolean);

const GUIDE = `
SURSĂ DE ADEVĂR — GHIDUL FORMULA X, „POVESTEA LUI HARAP-ALB”

Opera este „Povestea lui Harap-Alb”, de Ion Creangă, publicată în 1877 în revista „Convorbiri literare”. Este basm cult. Basmul urmărește lupta dintre bine și rău, încheiată cu victoria binelui, iar în această operă tema este dublată de procesul de maturizare al protagonistului. Opera îmbină particularități ale basmului cu principii estetice ale realismului. Realismul se observă mai ales în construcția profund umană a protagonistului, iar fantasticul este umanizat prin reacții și comportamente credibile.

Harap-Alb este personajul principal. La început este mezinul craiului și are condiție nobilă. După întâlnirea cu Spânul își pierde identitatea și devine sluga acestuia. La final își recapătă identitatea și statutul, devenind împărat și moștenitor al tronului unchiului său. Psihologic, este inițial naiv, lipsit de experiență și incapabil să vadă dincolo de aparențe. Moral, este profund uman: greșește, se teme, suferă și învață. La început nu miluiește bătrâna cerșetoare, lovește calul și încalcă sfatul părintesc acceptând tovărășia Spânului; ulterior devine milostiv cu albinele și furnicile, tolerant cu cele cinci creaturi și ascultă de Sfânta Duminică. Maturizarea se produce treptat prin experiențe și probe.

Spânul este antagonistul. La prima apariție este un străin din pădure care se oferă călăuză. Este viclean, calculat și manipulator, mincinos, crud și dominator. Prin impostură își însușește identitatea fiului de crai, îl transformă în slugă și, la curtea Împăratului Verde, se prezintă drept nepotul împăratului. Rolul lui este negativ, dar probele impuse contribuie indirect la formarea lui Harap-Alb.

Relația lor este un raport stăpân–slugă. Inițial Harap-Alb este superior prin statut, iar Spânul este doar un străin; după fântână, raportul se inversează. Pe măsură ce Harap-Alb trece probele, el dobândește experiență, curaj și prieteni. Dispariția Spânului coincide cu eliberarea și recuperarea identității protagonistului.

FÂNTÂNA: Spânul îl ademenește pe tânăr să intre pentru a se răcori, profitând de naivitatea lui. Îl constrânge să-și dezvăluie identitatea și scopul călătoriei. Pentru a-și salva viața, tânărul jură că îi va fi slugă, iar Spânul îi impune numele Harap-Alb. Episodul începe relația de dominație, inversează statuturile și marchează începutul maturizării. Fântâna poate simboliza moartea vechii identități și nașterea uneia noi.

GRĂDINA URSULUI: în eseul de personaj, scena este folosită pentru a arăta teama, vulnerabilitatea și neputința eroului, dar și depășirea probei cu ajutor. Ea contribuie la maturizarea sa.

FINALUL: Harap-Alb o aduce pe fata Împăratului Roș la curtea Împăratului Verde. Fata îl recunoaște pe adevăratul erou. Spânul, temându-se că minciuna îi va fi descoperită, îl acuză că a încălcat jurământul și îi taie capul. Spânul este pedepsit de calul năzdrăvan, care îl ridică în văzduh și îl lasă să cadă. Harap-Alb este readus la viață de fata Împăratului Roș cu ajutorul obiectelor magice și își recapătă identitatea. Scena încheie subordonarea și traseul inițiatic și confirmă victoria binelui.

CONFLICT: există conflict exterior Harap-Alb–Spân și, în interpretarea relației, o dimensiune interioară, lupta protagonistului cu propria imaturitate. Conflictul are funcție formativă.

NUMELE/TITLUL: „Harap-Alb” îi este impus de Spân după fântână. Are caracter oximoronic: „harap” sugerează condiția de slugă / negru, iar „alb” sugerează originea nobilă, puritatea și caracterul pozitiv. Numele concentrează contradicția identitară și poartă amprenta dominației Spânului.

STRUCTURĂ: pentru eseul despre operă sunt urmărite conflictul și simetria incipit–final. Incipitul introduce universul fabulos și condiția inițială a eroului, iar finalul închide traseul prin victorie, recunoaștere și împlinire, subliniind drumul inițiatic.
`;

const schema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['corect', 'are_erori', 'insuficient'] },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fragment: { type: 'string' },
          problem: { type: 'string' },
          correction: { type: 'string' },
          severity: { type: 'string', enum: ['minor', 'important'] },
          confidence: { type: 'string', enum: ['high', 'medium'] }
        },
        required: ['fragment','problem','correction','severity','confidence'],
        additionalProperties: false
      }
    },
    verified_points: { type: 'array', items: { type: 'string' } }
  },
  required: ['status','summary','findings','verified_points'],
  additionalProperties: false
};

const buckets = new Map<string, { count: number; reset: number }>();
function allowRequest(ip: string) {
  const now = Date.now(); const key = ip || 'unknown'; const b = buckets.get(key);
  if (!b || now > b.reset) { buckets.set(key,{count:1,reset:now+5*60_000}); return true; }
  if (b.count >= 8) return false; b.count++; return true;
}
function cors(origin: string | null) {
  const allowed = !ALLOWED_ORIGINS.length || !origin || ALLOWED_ORIGINS.includes(origin);
  return {
    allowed,
    headers: {
      'Access-Control-Allow-Origin': allowed && origin ? origin : (ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS[0] : '*'),
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
      'Content-Type': 'application/json; charset=utf-8'
    }
  };
}
function json(data: unknown,status=200,headers:HeadersInit={}) { return new Response(JSON.stringify(data),{status,headers}); }
function outputText(data: any) {
  if (typeof data?.output_text === 'string') return data.output_text;
  for (const item of data?.output || []) for (const c of item?.content || []) if (c?.type === 'output_text' && typeof c.text === 'string') return c.text;
  return '';
}

Deno.serve(async (req) => {
  const origin=req.headers.get('origin'); const c=cors(origin);
  if (req.method === 'OPTIONS') return new Response('ok',{headers:c.headers});
  if (!c.allowed) return json({error:'Origin nepermis.'},403,c.headers);
  if (req.method !== 'POST') return json({error:'Method not allowed.'},405,c.headers);
  if (!OPENAI_API_KEY) return json({error:'OPENAI_API_KEY nu este configurată în Supabase Secrets.'},503,c.headers);
  const ip=(req.headers.get('x-forwarded-for')||req.headers.get('cf-connecting-ip')||'unknown').split(',')[0].trim();
  if(!allowRequest(ip)) return json({error:'Prea multe verificări. Încearcă din nou peste câteva minute.'},429,c.headers);

  let body:any; try{body=await req.json();}catch{return json({error:'JSON invalid.'},400,c.headers);}
  const essay=String(body?.text||'').trim(); const type=String(body?.type||'opera');
  if(essay.length<80) return json({error:'Eseul este prea scurt pentru verificare.'},400,c.headers);
  if(essay.length>12000) return json({error:'Eseul depășește limita de 12.000 de caractere.'},400,c.headers);
  if(!['opera','personaj','relatie'].includes(type)) return json({error:'Tip de eseu invalid.'},400,c.headers);

  const system = `Ești un profesor corector foarte atent pentru Bacalaureat la Limba și literatura română. Verifici EXCLUSIV corectitudinea informațiilor despre „Povestea lui Harap-Alb”.\n\nREGULI OBLIGATORII:\n1. Sursa de adevăr este numai ghidul furnizat mai jos. Nu introduce fapte din alte surse și nu corecta ghidul.\n2. Marchează drept greșită numai o afirmație care contrazice clar ghidul. Nu penaliza parafraze, formulări personale sau interpretări compatibile cu ghidul.\n3. Dacă o idee este ambiguă sau nu poate fi verificată din ghid, nu o trece la findings.\n4. Pentru fiecare eroare, câmpul fragment trebuie să copieze EXACT un fragment continuu din eseul elevului, fără să-l rescrii, maximum 180 de caractere.\n5. Correction trebuie să spună concis formularea corectă, conform ghidului.\n6. Nu verifica ortografia și punctuația; acestea sunt verificate separat pe site.\n7. Dacă elevul scrie despre altă operă, status poate fi insuficient; nu inventa erori despre Harap-Alb.\n8. verified_points conține maximum 5 afirmații importante din eseu care sunt compatibile cu ghidul.\n\n${GUIDE}`;
  const user = `TIP ESEU: ${type}\n\nESEUL ELEVULUI:\n${essay}`;

  const resp=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{'Authorization':`Bearer ${OPENAI_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:MODEL,
      reasoning:{effort:'low'},
      input:[{role:'system',content:system},{role:'user',content:user}],
      text:{format:{type:'json_schema',name:'harap_alb_fact_check',strict:true,schema}}
    })
  });
  const data=await resp.json();
  if(!resp.ok){console.error('OpenAI error',data);return json({error:'Motorul AI nu a putut finaliza verificarea.'},502,c.headers);}
  const raw=outputText(data); if(!raw) return json({error:'Răspuns AI fără conținut.'},502,c.headers);
  try{return json(JSON.parse(raw),200,c.headers);}catch{console.error('Invalid structured output',raw);return json({error:'Răspuns AI invalid.'},502,c.headers);}
});
