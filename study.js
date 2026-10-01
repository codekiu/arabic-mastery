const $ = id => document.getElementById(id);
const words = groups.flatMap((g,i) => g.items.map(w => ({...w,kind:g.kind,topic:i,topicName:g.title})));
const byId = new Map(words.map(w=>[String(w.number),w]));
const escapeHtml = value => String(value).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const normalize = s => s.normalize('NFD').replace(/[\u064b-\u065f\u0670\u0300-\u036f]/g,'').toLowerCase();
const key='vocabulario-arabe-listas-v1';
let storageOK=true;
let state={version:1,active:'principal',lists:[{id:'principal',name:'Mi estudio',words:[],results:[]}],reviews:{}};
let mode='home',filter='all',search='',topic='all',session=null,detailId=null,editingList=null;
let sessionSize='10',direction='ar';
const kinds={verb:'Verbo',noun:'Sustantivo',adjective:'Adjetivo'};
const pages={home:['UN ESPACIO PARA APRENDER','Tu árabe, a tu ritmo.','Encuentra tus palabras, organízalas y practica cuando quieras.'],catalog:['EXPLORA Y ELIGE','Biblioteca de palabras','300 palabras, con cuatro ejemplos para entenderlas en contexto.'],lists:['TU VOCABULARIO','Mis listas','Organiza lo que quieres aprender y empieza una sesión desde aquí.'],progress:['TU APRENDIZAJE','Progreso y repasos','Consulta lo que has practicado y los resultados de tus exámenes.'],settings:['TODO EN SU SITIO','Ajustes y copias','Conserva tus listas y llévalas contigo a otra versión de la app.']};
function validateState(data){
  if(!data||data.version!==1||!Array.isArray(data.lists)||!data.lists.length||data.lists.length>100)throw Error('La copia no contiene listas válidas.');
  const ids=new Set();
  const lists=data.lists.map(l=>{
    if(!l||typeof l.id!=='string'||!l.id||l.id.length>100||ids.has(l.id)||typeof l.name!=='string'||!l.name.trim()||l.name.length>60||!Array.isArray(l.words)||l.words.length>300||l.words.some(id=>typeof id!=='string'||!byId.has(id))||new Set(l.words).size!==l.words.length)throw Error('La copia contiene una lista no válida.');
    ids.add(l.id);
    if(!Array.isArray(l.results)||l.results.length>20||l.results.some(r=>!r||!Number.isInteger(r.total)||r.total<1||r.total>300||!Number.isInteger(r.score)||r.score<0||r.score>r.total||typeof r.date!=='string'||!Number.isFinite(Date.parse(r.date))))throw Error('Los resultados de la copia no son válidos.');
    return {id:l.id,name:l.name.trim(),words:[...l.words],results:l.results.map(r=>({score:r.score,total:r.total,date:r.date}))};
  });
  const reviews={};
  if(data.reviews!==undefined){
    if(!data.reviews||Array.isArray(data.reviews)||typeof data.reviews!=='object'||Object.keys(data.reviews).length>300)throw Error('El progreso no es válido.');
    for(const [id,r] of Object.entries(data.reviews)){
      if(!byId.has(id)||!r||!Number.isInteger(r.level)||r.level<0||r.level>5||typeof r.due!=='string'||!Number.isFinite(Date.parse(r.due))||typeof r.last!=='string'||!Number.isFinite(Date.parse(r.last)))throw Error('El progreso contiene datos no válidos.');
      reviews[id]={level:r.level,due:r.due,last:r.last};
    }
  }
  return {version:1,active:ids.has(data.active)?data.active:lists[0].id,lists,reviews};
}
try{const saved=localStorage.getItem(key);if(saved)state=validateState(JSON.parse(saved));}catch(e){storageOK=false;}
const activeList=()=>state.lists.find(l=>l.id===state.active);
const listWords=()=>activeList().words.map(id=>byId.get(id));
const enrolled=()=>[...new Set(state.lists.flatMap(l=>l.words))].map(id=>byId.get(id));
const dueWords=(items=enrolled())=>items.filter(w=>state.reviews[w.number]&&Date.parse(state.reviews[w.number].due)<=Date.now());
const uid=()=>globalThis.crypto?.randomUUID?.()||'lista-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const plural=(n,s,p=s+'s')=>n+' '+(n===1?s:p);
function announce(message){$('status').textContent=message;}
function persist(message='Cambios guardados.'){
  try{localStorage.setItem(key,JSON.stringify(state));storageOK=true;}catch(e){storageOK=false;}
  announce(storageOK?message:'No se puede guardar aquí. Conserva una copia desde Ajustes antes de cerrar.');
}
function createList(name,ids=[]){
  if(typeof name!=='string'||!name.trim()||name.trim().length>60)throw Error('Escribe un nombre de entre 1 y 60 caracteres.');
  if(state.lists.length>=100)throw Error('Ya tienes 100 listas.');
  if(!Array.isArray(ids)||ids.some(id=>!byId.has(id)))throw Error('Alguna palabra no existe.');
  const l={id:uid(),name:name.trim(),words:[...new Set(ids)],results:[]};state.lists.push(l);state.active=l.id;session=null;mode='lists';persist('Lista creada. Añade tus primeras palabras desde la Biblioteca.');render();return l;
}
function addWords(listId,ids){
  const l=state.lists.find(l=>l.id===listId);if(!l||!Array.isArray(ids)||ids.some(id=>!byId.has(id)))throw Error('Lista o palabras no válidas.');
  l.words=[...new Set([...l.words,...ids])];session=null;persist('Palabras añadidas.');render();return {id:l.id,count:l.words.length};
}
function toggleWord(id){const l=activeList(),exists=l.words.includes(id);l.words=exists?l.words.filter(x=>x!==id):[...l.words,id];persist(exists?'Palabra retirada de «'+l.name+'».':'Palabra añadida a «'+l.name+'».');render();if(detailId)renderDetail();}
function levelLabel(w){const r=state.reviews[w.number];return !r?'Sin repasar':r.level>=3?'En consolidación':'En práctica';}
function examplesHtml(w){return `<ol class="examples">${w.examples.map(([ar,es])=>`<li><p class="example-ar arabic" lang="ar" dir="rtl">${escapeHtml(ar)}</p><p class="example-es" lang="es" dir="ltr">${escapeHtml(es)}</p></li>`).join('')}</ol>`;}
function cardHtml(w){const added=activeList().words.includes(String(w.number));return `<article class="word-card"><div class="word-card-top"><span class="kind">${kinds[w.kind]}</span><span class="word-id">${String(w.number).padStart(3,'0')}</span></div><h3 class="term arabic" lang="ar" dir="rtl">${escapeHtml(w.ar)}</h3><p class="meaning">${escapeHtml(w.es)}</p><div class="word-card-footer"><button class="text-button" data-detail="${w.number}">Ver 4 ejemplos <span aria-hidden="true">↗</span></button><button class="add-word" data-word="${w.number}" aria-pressed="${added}" aria-label="${added?'Retirar de':'Añadir a'} ${escapeHtml(activeList().name)}: ${escapeHtml(w.es)}">${added?'✓':'+'}</button></div></article>`;}
function selectOptions(){return state.lists.map(l=>`<option value="${escapeHtml(l.id)}" ${l.id===state.active?'selected':''}>${escapeHtml(l.name)}</option>`).join('');}
function metric(label,value,note){return `<div class="metric"><p class="metric-label">${label}</p><strong class="metric-value">${value}</strong><small>${note}</small></div>`;}
function listRows(){return state.lists.slice(0,4).map(l=>`<div class="list-row"><div class="list-info"><span class="list-cover" aria-hidden="true">▱</span><div><button class="list-row-name" data-list="${escapeHtml(l.id)}">${escapeHtml(l.name)}</button><small>${plural(l.words.length,'palabra')} · ${plural(dueWords(l.words.map(id=>byId.get(id))).length,'repaso pendiente','repasos pendientes')}</small></div></div><button class="text-button" data-list="${escapeHtml(l.id)}" aria-label="Abrir ${escapeHtml(l.name)}">Abrir →</button></div>`).join('');}
function renderHome(){
  const all=enrolled(),due=dueWords();
  $('dashboard').innerHTML=`<div class="hero"><div><p class="eyebrow">APRENDE EN CONTEXTO</p><h2>${all.length?'Vuelve a tus palabras.':'Una palabra abre una conversación.'}</h2><p>${all.length?(due.length?plural(due.length,'palabra está lista','palabras están listas')+' para volver a practicar.':'Abre una lista y practica las palabras que tú elijas.'):'Elige palabras de la biblioteca y crea una lista para lo que quieres aprender.'}</p><div class="actions"><button class="button" data-action="${all.length?'continue':'explore'}">${all.length?(due.length?'Repasar pendientes':'Abrir mis listas'):'Explorar las palabras'} <span aria-hidden="true">→</span></button>${all.length?'<button class="text-button" data-action="explore">Explorar biblioteca</button>':'<button class="text-button" data-action="new-list">Crear una lista</button>'}</div></div><div class="hero-symbol" lang="ar" dir="rtl" aria-hidden="true">عَرَبِيّ<small>PALABRAS QUE CONECTAN</small></div></div><div class="metrics">${metric('Palabras en tus listas',all.length,'De una biblioteca de 300')}${metric('Para volver a repasar',due.length,'Según tus repasos anteriores')}${metric('Tus listas',state.lists.length,'Organizadas a tu manera')}</div><div class="lower-grid"><section class="panel"><div class="panel-head"><h2>Tus listas</h2><button class="text-button" data-action="lists">Ver todas →</button></div>${listRows()}<button class="text-button" data-action="new-list">+ Crear una lista</button></section><section class="panel"><h2>De la palabra a la conversación</h2><ol class="steps"><li><span class="step-number">1</span><div><strong>Entiende el contexto</strong><p>Consulta los cuatro ejemplos de cada palabra.</p></div></li><li><span class="step-number">2</span><div><strong>Recuerda por tu cuenta</strong><p>Prueba con flashcards antes de ver el significado.</p></div></li><li><span class="step-number">3</span><div><strong>Úsala en una frase tuya</strong><p>Habla de tu vida y vuelve a practicar más adelante.</p></div></li></ol></section></div>`;
}
function renderWorkspace(){
  const l=activeList(),due=dueWords(listWords()).length;
  $('workspace').innerHTML=`<div class="section-head"><h2>${plural(state.lists.length,'lista')}</h2><button class="button" data-action="new-list">+ Nueva lista</button></div><div class="list-cards">${state.lists.map(x=>`<button class="list-tile" data-list="${escapeHtml(x.id)}" aria-pressed="${x.id===l.id}"><strong>${escapeHtml(x.name)}</strong><small>${plural(x.words.length,'palabra')}</small></button>`).join('')}</div><div class="list-study-panel"><div><h2>${escapeHtml(l.name)}</h2><p>${plural(l.words.length,'palabra')} · ${plural(due,'repaso pendiente','repasos pendientes')}</p></div><div class="study-config"><label>Sesión<select id="session-size" aria-label="Tamaño de la sesión"><option value="10" ${sessionSize==='10'?'selected':''}>10 palabras</option><option value="20" ${sessionSize==='20'?'selected':''}>20 palabras</option><option value="all" ${sessionSize==='all'?'selected':''}>Todas</option></select></label><label>Flashcards<select id="direction" aria-label="Dirección de las flashcards"><option value="ar" ${direction==='ar'?'selected':''}>Árabe → español</option><option value="es" ${direction==='es'?'selected':''}>Español → árabe</option></select></label><button class="button primary" id="flash-start" ${!l.words.length?'disabled':''}>Estudiar</button><button class="button" id="exam-start" ${!l.words.length?'disabled':''}>Hacer examen</button></div></div><details class="advanced"><summary>Gestionar esta lista</summary><div class="actions"><button class="button" data-action="rename-list">Renombrar</button><button class="button" id="export-csv" ${!l.words.length?'disabled':''}>Exportar para Anki</button><button class="button danger" data-action="delete-list">Eliminar lista</button></div></details>`;
  $('flash-start').onclick=()=>startFlash(selectSessionWords(listWords()));$('exam-start').onclick=()=>startExam(selectSessionWords(listWords(),false));
  $('session-size').onchange=e=>sessionSize=e.target.value;$('direction').onchange=e=>direction=e.target.value;
  $('export-csv').onclick=exportCsv;
}
function selectSessionWords(items,prioritize=true){
  const sorted=prioritize?[...dueWords(items),...shuffled(items.filter(w=>!state.reviews[w.number])),...shuffled(items.filter(w=>state.reviews[w.number]&&!dueWords([w]).length))]:shuffled(items);
  return sorted.slice(0,sessionSize==='all'?sorted.length:Number(sessionSize));
}
function renderProgress(){
  const all=enrolled(),seen=all.filter(w=>state.reviews[w.number]),due=dueWords(all);
  const results=state.lists.flatMap(l=>l.results.map(r=>({...r,name:l.name}))).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,10);
  const next=seen.sort((a,b)=>Date.parse(state.reviews[a.number].due)-Date.parse(state.reviews[b.number].due)).slice(0,8);
  $('progress-page').innerHTML=`<div class="metrics">${metric('Palabras practicadas',seen.length,'De '+all.length+' palabras en listas')}${metric('Para repasar',due.length,'Puedes practicarlas cuando quieras')}${metric('Exámenes guardados',state.lists.reduce((n,l)=>n+l.results.length,0),'Últimos 20 por lista')}</div><div class="lower-grid"><section class="panel"><div class="panel-head"><h2>Próximos repasos</h2>${due.length?'<button class="text-button" data-action="continue">Repasar →</button>':''}</div>${next.length?next.map(w=>`<div class="schedule-row"><div><button class="text-button arabic" data-detail="${w.number}" lang="ar" dir="rtl">${escapeHtml(w.ar)}</button><small style="display:block">${escapeHtml(w.es)}</small></div><span class="status-pill">${Date.parse(state.reviews[w.number].due)<=Date.now()?'Disponible':new Date(state.reviews[w.number].due).toLocaleDateString('es',{day:'numeric',month:'short'})}</span></div>`).join(''):'<p class="muted">Cuando uses las flashcards, aquí verás cuándo volver a practicar tus palabras.</p>'}<p class="lesson-note">El calendario es orientativo. «La recuerdo» amplía el intervalo; «Difícil» lo mantiene corto y «Repetir» vuelve al día siguiente.</p></section><section class="panel"><h2>Resultados de exámenes</h2>${results.length?`<table class="history-table"><thead><tr><th>Lista</th><th>Aciertos</th><th>Fecha</th></tr></thead><tbody>${results.map(r=>`<tr><td>${escapeHtml(r.name)}</td><td>${r.score} / ${r.total}</td><td>${new Date(r.date).toLocaleDateString('es',{day:'numeric',month:'short'})}</td></tr>`).join('')}</tbody></table>`:'<p class="muted">Los resultados aparecerán aquí al terminar tu primer examen.</p><button class="button" data-action="lists">Ir a mis listas</button>'}</section></div>`;
}
function renderSettings(){
  $('settings-page').innerHTML=`<div class="settings-grid"><section class="panel"><h2>Tus datos de estudio</h2><p class="muted">Las listas, resultados y repasos se guardan en este navegador o en esta app. La web y la app tienen guardados independientes.</p><div class="setting-row"><div><strong>Guardar una copia</strong><p>Incluye todas tus listas, resultados y fechas de repaso.</p></div><button class="button" id="backup">Guardar copia</button></div><div class="setting-row"><div><strong>Importar una copia</strong><p>Añade las listas de una copia sin borrar las que ya tienes.</p></div><button class="button" id="restore">Elegir archivo</button></div></section><section class="panel"><h2>Estudiar fuera de la app</h2><p class="muted">Abre una lista y usa «Gestionar esta lista → Exportar para Anki». El archivo incluye árabe en el anverso y significado más cuatro ejemplos en el reverso.</p><button class="text-button" data-action="lists">Ir a mis listas →</button></section><section class="panel"><h2>Acerca de tu biblioteca</h2><p class="muted">300 palabras del texto y sus familias, en árabe fuṣḥā. Cada palabra incluye cuatro ejemplos con traducción al español. Practica también escuchar, conversar y escribir frases propias.</p></section></div>`;
  $('backup').onclick=async()=>{try{await download('mis-listas-arabe.json',JSON.stringify(state,null,2),'application/json');}catch(e){announce('No se pudo guardar la copia. '+e.message);}};
  $('restore').onclick=()=>$('backup-file').click();
}
function render(){
  document.querySelectorAll('[data-page]').forEach(b=>{if(b.dataset.page===mode)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  const [kicker,title,description]=pages[mode];$('page-kicker').textContent=kicker;$('page-title').textContent=title;$('page-description').textContent=description;$('breadcrumb').textContent=mode==='home'?'Tu espacio de aprendizaje':title;
  $('page-title').parentElement.parentElement.hidden=!!session;$('today-date').textContent=new Date().toLocaleDateString('es',{day:'numeric',month:'long'});
  $('dashboard').hidden=mode!=='home'||!!session;$('workspace').hidden=mode!=='lists'||!!session;$('progress-page').hidden=mode!=='progress'||!!session;$('settings-page').hidden=mode!=='settings'||!!session;$('catalog-area').hidden=!['catalog','lists'].includes(mode)||!!session;$('session').hidden=!session;
  if(session){renderSession();return;}
  if(mode==='home')renderHome();if(mode==='lists')renderWorkspace();if(mode==='progress')renderProgress();if(mode==='settings')renderSettings();
  $('list-select').innerHTML=selectOptions();
  const shown=words.filter(w=>(filter==='all'||w.kind===filter)&&(topic==='all'||w.topic===Number(topic))&&(mode!=='lists'||activeList().words.includes(String(w.number)))&&normalize(w.ar+' '+w.es).includes(search));
  $('catalog-summary').textContent=plural(shown.length,'palabra')+(mode==='lists'?' en esta vista':' en la biblioteca');
  $('content').innerHTML=shown.length?`<div class="word-grid">${shown.map(cardHtml).join('')}</div>`:`<div class="empty"><h2>${mode==='lists'&&!activeList().words.length?'Tu lista está lista para empezar.':'No encontramos esa palabra.'}</h2><p>${mode==='lists'&&!activeList().words.length?'Elige palabras de la Biblioteca y añádelas a «'+escapeHtml(activeList().name)+'».':'Prueba otra búsqueda o quita un filtro.'}</p><button class="button" data-action="${mode==='lists'&&!activeList().words.length?'explore':'clear-filters'}">${mode==='lists'&&!activeList().words.length?'Explorar biblioteca':'Limpiar filtros'}</button></div>`;
}
function switchMode(next){if(!pages[next])return;mode=next;session=null;filter='all';search='';topic='all';$('search').value='';$('topic-filter').value='all';document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter==='all')));render();}
function openList(id){if(!state.lists.some(l=>l.id===id))return;state.active=id;persist('Lista seleccionada.');switchMode('lists');}
function openListDialog(rename=false){editingList=rename?state.active:null;$('list-dialog-title').textContent=rename?'Renombrar lista':'Crear lista';$('list-name').value=rename?activeList().name:'';$('list-form-error').textContent='';$('list-dialog').showModal();$('list-name').focus();}
function deleteList(){const l=activeList();if(!confirm('¿Eliminar «'+l.name+'» y sus resultados? Las palabras seguirán en la biblioteca.'))return;state.lists=state.lists.filter(x=>x.id!==l.id);if(!state.lists.length)state.lists=[{id:uid(),name:'Mi estudio',words:[],results:[]}];state.active=state.lists[0].id;session=null;persist('Lista eliminada.');render();}
function dispatch(action){
  if(action==='explore')switchMode('catalog');if(action==='lists')switchMode('lists');if(action==='new-list')openListDialog();if(action==='rename-list')openListDialog(true);if(action==='delete-list')deleteList();
  if(action==='continue'){const due=dueWords();if(due.length)startFlash(selectSessionWords(due));else switchMode('lists');}
  if(action==='clear-filters')switchMode(mode);
}
document.addEventListener('click',e=>{const page=e.target.closest('[data-page]');if(page){switchMode(page.dataset.page);return;}const action=e.target.closest('[data-action]');if(action){dispatch(action.dataset.action);return;}const list=e.target.closest('[data-list]');if(list){openList(list.dataset.list);return;}const detail=e.target.closest('[data-detail]');if(detail){openDetail(detail.dataset.detail);return;}const word=e.target.closest('[data-word]');if(word)toggleWord(word.dataset.word);});
$('brand-home').onclick=e=>{e.preventDefault();switchMode('home');};
$('list-select').onchange=e=>{state.active=e.target.value;persist('Lista seleccionada.');render();};
$('topic-filter').innerHTML='<option value="all">Todos los temas</option>'+groups.map((g,i)=>`<option value="${i}">${escapeHtml(g.title)}</option>`).join('');
$('topic-filter').onchange=e=>{topic=e.target.value;render();};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});
$('search').oninput=e=>{search=normalize(e.target.value.trim());render();};
$('study').onclick=e=>{const hidden=document.body.classList.toggle('hidden-translation');e.currentTarget.setAttribute('aria-pressed',String(hidden));e.currentTarget.textContent=hidden?'Mostrar significados':'Ocultar significados';};
$('list-dialog-close').onclick=()=>$('list-dialog').close();
$('list-form').onsubmit=e=>{e.preventDefault();const name=$('list-name').value.trim();try{if(!name||name.length>60)throw Error('Escribe un nombre de entre 1 y 60 caracteres.');if(editingList){state.lists.find(l=>l.id===editingList).name=name;persist('Lista renombrada.');render();}else createList(name);$('list-dialog').close();}catch(err){$('list-form-error').textContent=err.message;}};
function openDetail(id){if(!byId.has(id))return;detailId=id;renderDetail();$('word-dialog').showModal();}
function renderDetail(){const w=byId.get(detailId),added=activeList().words.includes(detailId);$('word-detail').innerHTML=`<div class="dialog-head"><span class="kind">${kinds[w.kind]} · ${escapeHtml(w.topicName)}</span><button class="icon-button" id="word-close" aria-label="Cerrar ficha">×</button></div><h2 id="word-title" class="term arabic" lang="ar" dir="rtl">${escapeHtml(w.ar)}</h2><p class="meaning">${escapeHtml(w.es)}</p><div class="word-detail-actions"><select id="detail-list" aria-label="Añadir palabra a una lista">${selectOptions()}</select><button class="button" data-word="${w.number}" aria-pressed="${added}">${added?'✓ En esta lista · Retirar':'+ Añadir a la lista'}</button></div>${examplesHtml(w)}`;$('word-close').onclick=()=>$('word-dialog').close();$('detail-list').onchange=e=>{state.active=e.target.value;persist('Lista seleccionada.');render();renderDetail();};}
$('word-dialog').addEventListener('close',()=>detailId=null);
function shuffled(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function startFlash(items=listWords()){if(!items.length)return;session={type:'flash',items:[...items],index:0,revealed:false,missed:[],done:false,direction,listId:state.active};render();$('session').scrollIntoView({block:'start'});}
function startExam(items=listWords()){if(!items.length)return;session={type:'exam',items:shuffled(items),index:0,score:0,missed:[],answer:null,options:null,done:false,listId:state.active};render();$('session').scrollIntoView({block:'start'});}
const intervals=[1,3,7,14,30];
function rateWord(id,rating,now=Date.now()){
  if(!byId.has(String(id))||!['again','hard','known'].includes(rating))throw Error('Valoración no válida.');
  const old=state.reviews[id]?.level||0;
  const level=rating==='again'?0:rating==='hard'?Math.max(1,Math.min(old,2)):Math.min(old+1,5);
  const days=rating==='known'?intervals[level-1]:1;
  state.reviews[id]={level,due:new Date(now+days*86400000).toISOString(),last:new Date(now).toISOString()};persist('Repaso guardado.');return days;
}
function renderSession(){
  const s=session,w=s.items[s.index];
  const head=`<div class="session-head"><span>${s.type==='flash'?'Flashcards':'Examen'} · ${s.done?'Sesión terminada':(s.index+1)+' de '+s.items.length}</span><button class="button" data-session="close">Salir de la sesión</button></div>`;
  if(s.done){$('session').innerHTML=head+`<div class="session-card"><p class="eyebrow">${s.type==='exam'?'TUS RESULTADOS':'REPASO TERMINADO'}</p><h2>${s.type==='exam'?'Así ha ido tu examen.':'Sesión completada.'}</h2><p class="score">${s.type==='exam'?s.score:s.items.length-s.missed.length}<span style="font-size:24px;color:var(--muted)"> / ${s.items.length}</span></p><p class="muted">${s.type==='exam'?'Respuestas correctas':'Palabras que has recordado sin dificultad'}.</p><div class="session-controls"><button class="button primary" data-session="close">Volver a ${mode==='home'?'Inicio':'mis listas'}</button>${s.missed.length?'<button class="button" data-session="retry">Repasar '+s.missed.length+' pendientes</button>':'<button class="button" data-session="restart">Repetir sesión</button>'}</div>${s.missed.length?`<div class="result-list"><h3>Para volver a practicar</h3>${s.missed.map(x=>`<div class="error-word"><p class="arabic" lang="ar" dir="rtl">${escapeHtml(x.ar)}</p><p>${escapeHtml(x.es)}</p></div>`).join('')}</div>`:''}</div>`;return;}
  const progress=`<progress value="${s.index}" max="${s.items.length}" aria-label="Progreso de la sesión"></progress>`;
  const term=s.type==='flash'&&s.direction==='es'?`<p class="session-es">${escapeHtml(w.es)}</p>`:`<p class="session-word arabic" lang="ar" dir="rtl">${escapeHtml(w.ar)}</p>`;
  if(s.type==='flash'){
    const old=state.reviews[w.number]?.level||0,next=intervals[Math.min(old,4)];
    $('session').innerHTML=head+progress+`<div class="session-card"><p class="eyebrow">${s.direction==='es'?'RECUERDA LA PALABRA EN ÁRABE':'RECUERDA EL SIGNIFICADO'}</p>${term}`+(s.revealed?`<div class="answer-title ${s.direction==='es'?'arabic':''}" ${s.direction==='es'?'lang="ar" dir="rtl"':''}>${escapeHtml(s.direction==='es'?w.ar:w.es)}</div><div class="session-controls rating"><button class="button" data-session="again">Repetir<small>Repaso mañana · 1</small></button><button class="button" data-session="hard">Difícil<small>Repaso mañana · 2</small></button><button class="button primary" data-session="known">La recuerdo<small>En ${plural(next,'día')} · 3</small></button></div><details class="advanced"><summary>Ver los 4 ejemplos</summary>${examplesHtml(w)}</details>`:`<p class="session-hint">Intenta recordarlo antes de mirar la respuesta.</p><button class="button primary" data-session="reveal">Mostrar respuesta</button>`)+`</div><p class="keyboard-hint">${s.revealed?'1 · Repetir / 2 · Difícil / 3 · La recuerdo':'Espacio · Mostrar respuesta'}</p>`;
  }else{
    if(!s.options){const meanings=w.es.split(/[;·]/).map(x=>normalize(x.trim()));const others=shuffled(words.filter(x=>x.number!==w.number&&!x.es.split(/[;·]/).some(y=>meanings.includes(normalize(y.trim())))));const seen=new Set([normalize(w.es)]),opts=[w];for(const x of others){if(!seen.has(normalize(x.es))){opts.push(x);seen.add(normalize(x.es));}if(opts.length===4)break;}s.options=shuffled(opts);}
    $('session').innerHTML=head+progress+`<div class="session-card"><p class="eyebrow">ELIGE EL SIGNIFICADO</p>${term}<div class="question-options">${s.options.map((x,i)=>`<button data-answer="${x.number}" ${s.answer!==null?'disabled':''} class="${s.answer!==null?(x.number===w.number?'correct':x.number===s.answer?'wrong':''):''}"><span style="opacity:.55">${i+1}.</span> ${escapeHtml(x.es)}${s.answer!==null?(x.number===w.number?' ✓ Correcta':x.number===s.answer?' · Tu respuesta':''):''}</button>`).join('')}</div>${s.answer!==null?`<p class="feedback ${s.answer===w.number?'':'error'}" role="status">${s.answer===w.number?'Respuesta correcta.':'La respuesta correcta es: '+escapeHtml(w.es)}</p><button class="button primary" data-session="next">${s.index===s.items.length-1?'Ver resultados':'Siguiente pregunta'} →</button><details class="advanced"><summary>Entender la palabra en contexto</summary>${examplesHtml(w)}</details>`:'<p class="session-hint">Elige una respuesta para continuar.</p>'}</div><p class="keyboard-hint">${s.answer!==null?'Enter · Continuar':'1–4 · Elegir respuesta'}</p>`;
  }
}
function advance(){const s=session;s.index++;s.revealed=false;s.answer=null;s.options=null;if(s.index===s.items.length){s.done=true;if(s.type==='exam'){const l=state.lists.find(x=>x.id===s.listId);if(l){l.results.push({score:s.score,total:s.items.length,date:new Date().toISOString()});l.results=l.results.slice(-20);persist('Resultado del examen guardado.');}}}render();}
$('session').onclick=e=>{
  const answer=e.target.closest('[data-answer]');if(answer&&session?.type==='exam'&&session.answer===null){session.answer=Number(answer.dataset.answer);const w=session.items[session.index];if(session.answer===w.number)session.score++;else session.missed.push(w);renderSession();$('session').querySelector('[data-session="next"]').focus();return;}
  const b=e.target.closest('[data-session]');if(!b||!session)return;const action=b.dataset.session;
  if(action==='close'){session=null;render();return;}
  if(action==='reveal'){session.revealed=true;renderSession();return;}
  if(['known','hard','again'].includes(action)){if(!session.revealed)return;const w=session.items[session.index];if(action!=='known')session.missed.push(w);rateWord(w.number,action);advance();return;}
  if(action==='next'){advance();return;}
  if(action==='restart'||action==='retry'){const items=action==='retry'?session.missed:session.items;session.type==='flash'?startFlash(items):startExam(items);}
};
document.addEventListener('keydown',e=>{if(!session||session.done||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,textarea,dialog')||e.target.closest('button')&&e.key==='Enter')return;let selector;if(session.type==='flash'){if(!session.revealed&&e.code==='Space')selector='[data-session="reveal"]';else if(session.revealed&&['1','2','3'].includes(e.key))selector='[data-session="'+({1:'again',2:'hard',3:'known'}[e.key])+'"]';}else if(session.answer!==null&&e.key==='Enter')selector='[data-session="next"]';else if(session.answer===null&&['1','2','3','4'].includes(e.key)){e.preventDefault();$('session').querySelectorAll('[data-answer]')[Number(e.key)-1]?.click();return;}if(selector){e.preventDefault();$('session').querySelector(selector)?.click();}});
async function download(name,content,type){
  if(globalThis.__TAURI__?.core?.invoke){const saved=await __TAURI__.core.invoke('save_export',{name,content});announce(saved?'Archivo guardado.':'Guardado cancelado.');return;}
  $('file-title').textContent=name;$('file-text').value=content;$('file-status').textContent='';$('file-save').onclick=()=>{const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);$('file-status').textContent='Descarga solicitada. Si no aparece, puedes copiar el contenido.';};$('file-panel').showModal();
}
$('file-close').onclick=()=>$('file-panel').close();$('file-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('file-text').value);$('file-status').textContent='Contenido copiado.';}catch(e){$('file-text').focus();$('file-text').select();$('file-status').textContent='Pulsa ⌘C en Mac o Ctrl+C para copiar el contenido seleccionado.';}};
function csvFor(items){const quote=s=>'"'+s.replace(/"/g,'""')+'"';return items.map(w=>[`<div dir="rtl" lang="ar">${escapeHtml(w.ar)}</div>`,`<strong>${escapeHtml(w.es)}</strong>`+w.examples.map(([ar,es])=>`<hr><div dir="rtl" lang="ar">${escapeHtml(ar)}</div><div>${escapeHtml(es)}</div>`).join('')].map(quote).join(',')).join('\r\n');}
async function exportCsv(){const name=activeList().name.replace(/[^\p{L}\p{N} _-]/gu,'').trim()||'vocabulario';try{await download(name+'.csv',csvFor(listWords()),'text/csv;charset=utf-8');announce('Anki: importa las dos columnas como anverso y reverso, con separador coma y «Permitir HTML» activado.');}catch(e){announce('No se pudo guardar el archivo. '+e.message);}}
function importBackup(data){const imported=validateState(data);if(state.lists.length+imported.lists.length>100)throw Error('La importación superaría las 100 listas.');const copies=imported.lists.map(l=>({...l,id:uid(),name:l.name.slice(0,52)+' (copia)'}));state.lists.push(...copies);state.active=copies[0].id;for(const [id,r] of Object.entries(imported.reviews)){if(!state.reviews[id]||Date.parse(r.last)>Date.parse(state.reviews[id].last))state.reviews[id]=r;}session=null;persist('Copia importada. Se conservan tus listas anteriores.');switchMode('lists');return copies.length;}
$('backup-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('La copia es demasiado grande.');importBackup(JSON.parse(await file.text()));}catch(err){announce('No se pudo importar: '+err.message);}finally{e.target.value='';}};
const modelContext=document.modelContext;
if(modelContext?.registerTool){const lifecycle=new AbortController(),register=tool=>{try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch(e){}};
  register({name:'read_study_lists',description:'Read saved study lists and available vocabulary word identifiers.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({lists:state.lists.map(l=>({id:l.id,name:l.name,wordIds:l.words})),words:words.map(w=>({id:String(w.number),arabic:w.ar,meaning:w.es}))})});
  register({name:'create_study_list',description:'Create and select a study list, optionally with vocabulary word identifiers.',inputSchema:{type:'object',properties:{name:{type:'string',minLength:1,maxLength:60},wordIds:{type:'array',items:{type:'string'}}},required:['name'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||Object.keys(input).some(k=>!['name','wordIds'].includes(k)))throw Error('Invalid input');const l=createList(input.name,input.wordIds||[]);return {id:l.id,name:l.name,count:l.words.length};}});
  register({name:'add_words_to_study_list',description:'Add a batch of vocabulary word identifiers to an existing list.',inputSchema:{type:'object',properties:{listId:{type:'string'},wordIds:{type:'array',items:{type:'string'}}},required:['listId','wordIds'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||Object.keys(input).some(k=>!['listId','wordIds'].includes(k)))throw Error('Invalid input');return addWords(input.listId,input.wordIds);}});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
const iconPaths={home:'M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1z',catalog:'M4 3h13a3 3 0 0 1 3 3v15H7a3 3 0 0 1-3-3V3zm0 15a3 3 0 0 1 3-3h13M8 7h8M8 10h6',lists:'M4 5h16v14H4zM8 9h8M8 13h6',progress:'M4 20V4M4 20h17M8 16v-5M13 16V7M18 16V3',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2'};
document.querySelectorAll('[data-page]').forEach(b=>{const span=b.querySelector('span');if(span)span.innerHTML=`<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${iconPaths[b.dataset.page]}"></path></svg>`;});
render();if(!storageOK)announce('No se pudo leer el guardado local. Guarda una copia antes de cerrar.');
