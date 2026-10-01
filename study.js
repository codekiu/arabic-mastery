const $ = id => document.getElementById(id);
const words = groups.flatMap(g => g.items.map(w => ({...w, kind:g.kind})));
const byId = new Map(words.map(w => [String(w.number), w]));
const escapeHtml = value => String(value).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const normalize = s => s.normalize('NFD').replace(/[\u064b-\u065f\u0670\u0300-\u036f]/g,'').toLowerCase();
const key = 'vocabulario-arabe-listas-v1';
let storageOK = true;
let state = {version:1, active:'principal', lists:[{id:'principal',name:'Mi estudio',words:[],results:[]}]};
let mode='catalog', filter='all', search='', session=null;
function validateState(data) {
  if (!data || data.version!==1 || !Array.isArray(data.lists) || !data.lists.length || data.lists.length>100) throw Error('La copia no contiene listas válidas.');
  const ids=new Set();
  for (const l of data.lists) {
    if (!l || typeof l.id!=='string' || l.id.length>100 || ids.has(l.id) || typeof l.name!=='string' || !l.name.trim() || l.name.length>60 || !Array.isArray(l.words) || l.words.length>300 || l.words.some(id=>typeof id!=='string'||!byId.has(id)) || new Set(l.words).size!==l.words.length) throw Error('La copia contiene una lista no válida.');
    ids.add(l.id);
    if (!Array.isArray(l.results) || l.results.length>20 || l.results.some(r=>!r || !Number.isInteger(r.total)||r.total<1||r.total>300||!Number.isInteger(r.score)||r.score<0||r.score>r.total||typeof r.date!=='string'||!Number.isFinite(Date.parse(r.date)))) throw Error('Los resultados de la copia no son válidos.');
  }
  return {version:1,active:ids.has(data.active)?data.active:data.lists[0].id,lists:data.lists.map(l=>({id:l.id,name:l.name.trim(),words:[...l.words],results:l.results.map(r=>({score:r.score,total:r.total,date:r.date}))}))};
}
try { const saved=localStorage.getItem(key); if(saved) state=validateState(JSON.parse(saved)); }
catch(e) { storageOK=false; }
const activeList = () => state.lists.find(l=>l.id===state.active);
const listWords = () => activeList().words.map(id=>byId.get(id));
function announce(message) { $('status').textContent=message; }
function persist(message='Guardado.') {
  try {localStorage.setItem(key,JSON.stringify(state));storageOK=true;}catch(e){storageOK=false;}
  announce(storageOK?message:'El guardado local no está disponible. Guarda una copia antes de cerrar.');
}
const uid = () => globalThis.crypto?.randomUUID?.() || 'lista-'+Date.now()+'-'+Math.random().toString(36).slice(2);
function createList(name, ids=[]) {
  if(typeof name!=='string'||!name.trim()||name.trim().length>60) throw Error('Escribe un nombre de entre 1 y 60 caracteres.');
  if(state.lists.length>=100) throw Error('Ya tienes 100 listas.');
  if(!Array.isArray(ids)||ids.some(id=>!byId.has(id))) throw Error('Alguna palabra no existe.');
  const l={id:uid(),name:name.trim(),words:[...new Set(ids)],results:[]};
  state.lists.push(l);state.active=l.id;session=null;persist('Lista creada. Añade las palabras que quieras aprender.');render();return l;
}
function addWords(listId,ids) {
  const l=state.lists.find(l=>l.id===listId);
  if(!l||!Array.isArray(ids)||ids.some(id=>!byId.has(id))) throw Error('Lista o palabras no válidas.');
  l.words=[...new Set([...l.words,...ids])];session=null;persist('Palabras añadidas.');render();return {id:l.id,count:l.words.length};
}
function toggleWord(id) {
  const l=activeList();
  const exists=l.words.includes(id);
  l.words=exists?l.words.filter(x=>x!==id):[...l.words,id];
  persist(exists?'Palabra retirada de la lista.':'Palabra añadida a «'+l.name+'».');render();
}
function examplesHtml(w) {return `<ol class="examples">${w.examples.map(([ar,es])=>`<li><p class="example-ar arabic" lang="ar" dir="rtl">${escapeHtml(ar)}</p><p class="example-es" lang="es" dir="ltr">${escapeHtml(es)}</p></li>`).join('')}</ol>`;}
function cardHtml(w) {
  const added=activeList().words.includes(String(w.number));
  return `<article class="card"><div class="card-top"><div class="word"><p class="number">PALABRA ${String(w.number).padStart(3,'0')}</p><h3 class="term arabic" lang="ar" dir="rtl">${escapeHtml(w.ar)}</h3></div><span class="meaning" lang="es">${escapeHtml(w.es)}</span></div>${examplesHtml(w)}<button class="list-word" data-word="${w.number}" aria-pressed="${added}">${added?'✓ En la lista · Retirar':'+ Añadir a la lista'}</button></article>`;
}
function render() {
  const l=activeList();
  $('list-select').innerHTML=state.lists.map(x=>`<option value="${escapeHtml(x.id)}" ${x.id===l.id?'selected':''}>${escapeHtml(x.name)}</option>`).join('');
  $('list-stat').textContent=l.words.length+(l.words.length===1?' palabra en esta lista':' palabras en esta lista');
  document.querySelector('.workspace').hidden=!!session;
  document.querySelector('.list-editor').hidden=mode!=='lists';
  document.querySelectorAll('#export-csv,#backup,#restore,.storage-note').forEach(el=>el.hidden=mode!=='lists');
  $('flash-start').disabled=$('exam-start').disabled=$('export-csv').disabled=!l.words.length;
  $('catalog-nav').setAttribute('aria-pressed',String(mode==='catalog'));
  $('lists-nav').setAttribute('aria-pressed',String(mode==='lists'));
  $('list-help').textContent=mode==='catalog'?'Elige una lista y pulsa «Añadir» en las palabras que quieras estudiar.':'Estas son las palabras de tu lista. Puedes retirarlas o iniciar un repaso.';
  $('history').hidden=mode!=='lists'||!l.results.length||!!session;
  $('history').textContent=l.results.slice(-5).reverse().map(r=>`${new Date(r.date).toLocaleDateString('es')} · ${r.score}/${r.total} aciertos`).join('  /  ');
  $('catalog-toolbar').hidden=!!session;
  $('content').hidden=$('catalog-summary').hidden=!!session;
  $('session').hidden=!session;
  if(session){renderSession();return;}
  const shown=groups.filter(g=>filter==='all'||g.kind===filter).map(g=>({...g,items:g.items.filter(w=>(mode==='catalog'||l.words.includes(String(w.number)))&&normalize(w.ar+' '+w.es).includes(search))})).filter(g=>g.items.length);
  const count=shown.reduce((n,g)=>n+g.items.length,0);
  $('catalog-summary').textContent=(mode==='lists'?'Lista «'+l.name+'» · ':'')+count+' palabras visibles';
  $('content').innerHTML=shown.map(g=>`<section class="group"><div class="group-head"><h2>${escapeHtml(g.title)}</h2><span>${g.items.length} palabras</span></div><div class="grid">${g.items.map(cardHtml).join('')}</div></section>`).join('')||`<p class="empty">${mode==='lists'&&!l.words.length?'Esta lista está vacía. Ve a Vocabulario y añade tus primeras palabras.':'No hay palabras con esos filtros.'}</p>`;
}
function switchMode(next){mode=next;session=null;filter='all';search='';$('search').value='';document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter==='all')));render();}
$('catalog-nav').onclick=()=>switchMode('catalog');$('lists-nav').onclick=()=>switchMode('lists');
$('list-select').onchange=e=>{state.active=e.target.value;session=null;persist('Lista seleccionada.');render();};
$('create-list').onclick=()=>{try{createList($('list-name').value);$('list-name').value='';}catch(e){announce(e.message);}};
$('list-name').onkeydown=e=>{if(e.key==='Enter')$('create-list').click();};
$('rename-list').onclick=()=>{const name=$('list-name').value.trim();if(!name){$('list-name').value=activeList().name;$('list-name').focus();announce('Edita el nombre y pulsa Renombrar.');return;}activeList().name=name;$('list-name').value='';persist('Lista renombrada.');render();};
$('delete-list').onclick=()=>{const l=activeList();if(!confirm('¿Eliminar la lista «'+l.name+'» y sus resultados? Las palabras siguen en el vocabulario.'))return;state.lists=state.lists.filter(x=>x.id!==l.id);if(!state.lists.length)state.lists=[{id:uid(),name:'Mi estudio',words:[],results:[]}];state.active=state.lists[0].id;session=null;persist('Lista eliminada.');render();};
$('content').onclick=e=>{const b=e.target.closest('[data-word]');if(b)toggleWord(b.dataset.word);};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});
$('search').oninput=e=>{search=normalize(e.target.value.trim());render();};
$('study').onclick=e=>{const hidden=document.body.classList.toggle('hidden-translation');e.currentTarget.setAttribute('aria-pressed',String(hidden));e.currentTarget.textContent=hidden?'Mostrar traducciones':'Ocultar traducciones';};
function shuffled(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function startFlash(items=listWords()) {if(!items.length)return;session={type:'flash',items:shuffled(items),index:0,revealed:false,missed:[],done:false};render();$('session').scrollIntoView({block:'start'});}
function startExam(items=listWords()){if(!items.length)return;session={type:'exam',items:shuffled(items),index:0,score:0,missed:[],answer:null,options:null,done:false};render();$('session').scrollIntoView({block:'start'});}
$('flash-start').onclick=()=>startFlash();$('exam-start').onclick=()=>startExam();
function renderSession(){
  const s=session;const w=s.items[s.index];
  const heading=`<div class="session-head"><h2>${s.type==='flash'?'Flashcards':'Examen de vocabulario'}</h2><button class="action" data-session="close">Cerrar repaso</button></div>`;
  if(s.done){
    $('session').innerHTML=heading+`<p class="score">${s.type==='exam'?s.score:s.items.length-s.missed.length} / ${s.items.length}</p><p>${s.type==='exam'?'Aciertos':'Palabras que has marcado como aprendidas'} · ${s.missed.length} para repasar</p><div class="session-nav"><button class="action primary" data-session="restart">Repetir todo</button>${s.missed.length?'<button class="action" data-session="retry">Repasar pendientes</button>':''}</div>${s.missed.map(x=>`<div class="error-word"><p class="arabic" lang="ar" dir="rtl">${escapeHtml(x.ar)}</p><p>${escapeHtml(x.es)}</p></div>`).join('')}`;return;
  }
  const progress=`<progress value="${s.index}" max="${s.items.length}" aria-label="Progreso"></progress><p class="note">${s.index+1} de ${s.items.length}</p>`;
  const term=`<p class="session-word arabic" lang="ar" dir="rtl">${escapeHtml(w.ar)}</p>`;
  if(s.type==='flash'){
    $('session').innerHTML=heading+progress+term+(s.revealed?`<div class="answer flash-answer"><h3>${escapeHtml(w.es)}</h3>${examplesHtml(w)}</div><div class="session-nav"><button class="action" data-session="again">Repetir</button><button class="action primary" data-session="known">La sé</button></div>`:`<p class="note">Recuerda el significado antes de mostrar la respuesta.</p><div class="session-nav"><button class="action primary" data-session="reveal">Mostrar respuesta</button></div>`);
  }else{
    if(!s.options){
      const meanings=w.es.split(/[;·]/).map(x=>normalize(x.trim()));
      const others=shuffled(words.filter(x=>x.number!==w.number&&!x.es.split(/[;·]/).some(y=>meanings.includes(normalize(y.trim())))));
      const seen=new Set([normalize(w.es)]);const opts=[w];
      for(const other of others){if(!seen.has(normalize(other.es))){opts.push(other);seen.add(normalize(other.es));}if(opts.length===4)break;}
      s.options=shuffled(opts);
    }
    $('session').innerHTML=heading+progress+term+'<p>¿Qué significa esta palabra?</p><div class="question-options">'+s.options.map(x=>`<button data-answer="${x.number}" ${s.answer!==null?'disabled':''} class="${s.answer!==null?(x.number===w.number?'correct':x.number===s.answer?'wrong':''):''}">${escapeHtml(x.es)}</button>`).join('')+'</div>'+(s.answer!==null?`<div class="answer flash-answer" role="status"><strong>${s.answer===w.number?'Correcto.':'La respuesta correcta es: '+escapeHtml(w.es)}</strong>${examplesHtml(w)}</div><div class="session-nav"><button class="action primary" data-session="next">${s.index===s.items.length-1?'Ver resultado':'Siguiente pregunta'}</button></div>`:'');
  }
}
function advance(){const s=session;s.index++;s.revealed=false;s.answer=null;s.options=null;if(s.index===s.items.length){s.done=true;if(s.type==='exam'){activeList().results.push({score:s.score,total:s.items.length,date:new Date().toISOString()});activeList().results=activeList().results.slice(-20);persist('Resultado del examen guardado.');}}render();}
$('session').onclick=e=>{
  const answer=e.target.closest('[data-answer]');
  if(answer&&session?.type==='exam'&&session.answer===null){session.answer=Number(answer.dataset.answer);const w=session.items[session.index];if(session.answer===w.number)session.score++;else session.missed.push(w);renderSession();$('session').querySelector('[data-session="next"]').focus();return;}
  const b=e.target.closest('[data-session]');if(!b||!session)return;
  const action=b.dataset.session;
  if(action==='close'){session=null;render();return;}
  if(action==='reveal'){session.revealed=true;renderSession();return;}
  if(action==='known'||action==='again'){if(action==='again')session.missed.push(session.items[session.index]);advance();return;}
  if(action==='next'){advance();return;}
  if(action==='restart'||action==='retry'){const items=action==='retry'?session.missed:session.items;session.type==='flash'?startFlash(items):startExam(items);}
};
async function download(name,content,type){
  if(globalThis.__TAURI__?.core?.invoke){const saved=await __TAURI__.core.invoke('save_export',{name,content});announce(saved?'Archivo guardado.':'Guardado cancelado.');return;}
  $('file-title').textContent=name;$('file-text').value=content;$('file-status').textContent='';
  $('file-save').onclick=()=>{const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);$('file-status').textContent='Descarga solicitada. Si no aparece, usa «Copiar contenido».';};
  $('file-panel').showModal();

}
$('file-close').onclick=()=>$('file-panel').close();
$('file-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('file-text').value);$('file-status').textContent='Contenido copiado.';}catch(e){$('file-text').focus();$('file-text').select();$('file-status').textContent='Pulsa ⌘C en Mac o Ctrl+C para copiar el contenido seleccionado.';}};
function csvFor(items){
  const quote=s=>'"'+s.replace(/"/g,'""')+'"';
  return items.map(w=>[ `<div dir="rtl" lang="ar">${escapeHtml(w.ar)}</div>`, `<strong>${escapeHtml(w.es)}</strong>`+w.examples.map(([ar,es])=>`<hr><div dir="rtl" lang="ar">${escapeHtml(ar)}</div><div>${escapeHtml(es)}</div>`).join('')].map(quote).join(',')).join('\r\n');
}
function fileName(){return activeList().name.replace(/[^\p{L}\p{N} _-]/gu,'').trim()||'vocabulario';}
$('export-csv').onclick=async()=>{try{await download(fileName()+'.csv',csvFor(listWords()),'text/csv;charset=utf-8');announce('CSV preparado: al importarlo, asigna la primera columna al anverso y la segunda al reverso y activa «Permitir HTML».');}catch(e){announce('No se pudo guardar el archivo. '+e.message);}};
$('backup').onclick=async()=>{try{await download('mis-listas-arabe.json',JSON.stringify(state,null,2),'application/json');}catch(e){announce('No se pudo guardar la copia. '+e.message);}};
$('restore').onclick=()=>$('backup-file').click();
$('backup-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('La copia es demasiado grande.');const imported=validateState(JSON.parse(await file.text()));if(state.lists.length+imported.lists.length>100)throw Error('La importación superaría las 100 listas.');const copies=imported.lists.map(l=>({...l,id:uid(),name:(l.name.slice(0,52)+' (copia)')}));state.lists.push(...copies);state.active=copies[0].id;session=null;persist('Copia importada. Tus listas anteriores se conservan.');switchMode('lists');}catch(err){announce('No se pudo importar: '+err.message);}finally{e.target.value='';}};
// These actions share the same state and validation as the visible controls.
const modelContext=document.modelContext;
if(modelContext?.registerTool){
  const lifecycle=new AbortController();
  const register=tool=>{try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch(e){}};
  register({name:'read_study_lists',description:'Read saved study lists and the available word identifiers.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({lists:state.lists.map(l=>({id:l.id,name:l.name,wordIds:l.words})),words:words.map(w=>({id:String(w.number),arabic:w.ar,meaning:w.es}))})});
  register({name:'create_study_list',description:'Create and select a study list, optionally with vocabulary word identifiers.',inputSchema:{type:'object',properties:{name:{type:'string',minLength:1,maxLength:60},wordIds:{type:'array',items:{type:'string'}}},required:['name'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||Object.keys(input).some(k=>!['name','wordIds'].includes(k)))throw Error('Invalid input');const l=createList(input.name,input.wordIds||[]);return {id:l.id,name:l.name,count:l.words.length};}});
  register({name:'add_words_to_study_list',description:'Add a batch of vocabulary word identifiers to an existing list.',inputSchema:{type:'object',properties:{listId:{type:'string'},wordIds:{type:'array',items:{type:'string'}}},required:['listId','wordIds'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||Object.keys(input).some(k=>!['listId','wordIds'].includes(k)))throw Error('Invalid input');return addWords(input.listId,input.wordIds);}});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
render();if(!storageOK)announce('No se pudo leer el guardado local. Guarda una copia antes de cerrar.');
