(() => {
  'use strict';
  const G=window.Starfire,app=document.querySelector('#app'),overlay=document.querySelector('#overlay');
  const STORE='starfire-lunar-progress-v3',SETTINGS='starfire-lunar-music-v3',BEST='starfire-lunar-best-v4',DRAFT='starfire-lunar-opening-v3';
  let locationId='base',locationFromMap=false;
  let game=null,mode='home',kit='battery',modal=null,helpTab='science',busy=false,priorFocus=null,storageOK=true,introLine=0,currentScene=null;
  let execution=null,executionFrame=0,fullscreenBusy=false;
  let cinemaFrame=0,cinemaLast=0,endingImagesPromise=null;
  const ENDING_SLIDES=[
    {image:'ending-samples.png',label:'小宇指导北京科学探索营观察样本与环境资料'},
    {image:'ending-station.png',label:'小宇带领同学们参观长征站'},
    {image:'ending-outdoor.png',label:'同学们穿着密闭宇航服，在小宇带领下参观月面'}
  ];
  const SLIDE_DURATION=3000;
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const storyText=text=>String(text).replaceAll('可可','小宇').replaceAll('归航营地','长征站');
  const paths={
    star:'<path d="m12 2 2.6 6.8L22 12l-7.4 3.2L12 22l-2.6-6.8L2 12l7.4-3.2Z"/>',
    medal:'<path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6-4.3-4.2 6-.9Z"/>',
    arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    home:'<path d="m3 11 9-8 9 8M6 9v12h12V9M10 21v-7h4v7"/>',
    route:'<path d="M5 21V8a5 5 0 0 1 10 0v8a3 3 0 0 0 6 0V6M2 18l3 3 3-3"/>',
    fast:'<path d="m4 7 6 5-6 5m8-10 6 5-6 5M21 5v14"/>',
    battery:'<rect x="3" y="6" width="16" height="12" rx="2"/><path d="M21 10v4M7 9v6m4-6v6m4-6v6"/>',
    tool:'<path d="M14 5a5 5 0 0 0-6 6L3 16a3 3 0 0 0 5 5l5-5a5 5 0 0 0 6-6l-4 4-4-4Z"/>',
    scan:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M7 12h10M12 7v10"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    storm:'<path d="M10 4a8 8 0 1 0 10 11M16 2l-5 8h5l-2 6 7-10h-5l2-4Z"/>',
    team:'<circle cx="7" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M1 21v-3a6 6 0 0 1 12 0v3m1-8a6 6 0 0 1 9 5v3M7 15v5m10-5v5"/>',
    sample:'<path d="M9 3h6m-5 0v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8"/>',
    time:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    link:'<path d="m9 9 6 6m-7-2-2 2a4 4 0 0 0 6 6l2-2m-4-9 2-2a4 4 0 0 1 6 6l-2 2"/>',
    flag:'<path d="M5 21V3m0 0h13l-3 5 3 5H5"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    music:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="5.5" cy="18" rx="3.5" ry="3"/><ellipse cx="16.5" cy="16" rx="3.5" ry="3"/>',
    mute:'<path d="M9 18V5l11-2v13M9 8l11-2M3 3l18 18"/><ellipse cx="5.5" cy="18" rx="3.5" ry="3"/>',
    map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16m6-14v16"/>',
    book:'<path d="M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v15h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3ZM12 6v15"/>',
  };
  const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.star}</svg>`;
  const asset=name=>window.StarfireImages?.[name]||''+name;
  const CAST={star:{name:'星火',role:'探索者 · 六轮采样车',image:'star-v3.png'},glow:{name:'微光',role:'记录员 · 履带测绘车',image:'glow-v3.png'},kexin:{name:'小宇',role:'长征站小小联络员',image:'kexin-v3.png'}};
  const rover=(who,cls='')=>`<img class="rover-sprite ${who} ${cls}" src="${asset(CAST[who].image)}" alt="${CAST[who].name} · ${CAST[who].role}" draggable="false">`;
  function setScene(scene){
    if(currentScene===scene)return;currentScene=scene;
    const image=document.querySelector('#world-image');image.src=asset(scene+'.png');image.alt=scene==='control'?'长征站联络室':G.NODES[scene]?.name||'月球科考';
  }
  function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch(e){storageOK=false;return null;}}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){storageOK=false;}}
  let saved=read(STORE);if(!G.isValid(saved))saved=null;else if(!saved.finished&&!saved.feedback){if(saved.ui.selected&&!G.options(saved).some(o=>o.id===saved.ui.selected&&!G.eligibility(saved,o)))saved.ui.selected=null;G.settleResources(saved);}
  let draft=read(DRAFT);if(!draft||!['intro','kit'].includes(draft.phase)||!Number.isInteger(draft.line)||draft.line<0||draft.line>=G.INTRO.length)draft=null;
  const config=read(SETTINGS);let musicOn=config?.on!==false,volume=Math.min(.7,Math.max(0,typeof config?.volume==='number'?config.volume:.18));
  let gesture=false,currentTrack=null,activeAudio=0,fadeFrame=0,audioRequest=0,loadingTrack=null;
  const players=[new Audio(),new Audio()];
  players.forEach((a,i)=>{a.preload='none';a.volume=0;a.id='music-player-'+i;a.hidden=true;document.body.append(a);});
  const musicSrc=name=>window.StarfireMusic?.[name]||''+name+'.m4a';
  function syncSound(){
    for(const b of document.querySelectorAll('[data-action="sound"]')){
      b.textContent=musicOn?'关闭音乐':'开启音乐';b.setAttribute('aria-label',musicOn?'关闭音乐':'开启音乐');b.setAttribute('aria-pressed',String(musicOn));
    }
  }
  function isFullscreen(){return Boolean(document.fullscreenElement||document.webkitFullscreenElement);}
  function syncFullscreen(){
    const active=isFullscreen(),label=active?'退出全屏':'全屏';
    for(const button of document.querySelectorAll('[data-action="fullscreen"]')){
      button.textContent=label;button.setAttribute('aria-label',label);button.closest('.tool-control').dataset.tooltip=label;
      button.setAttribute('aria-pressed',String(active));button.disabled=fullscreenBusy;
    }
  }
  async function toggleFullscreen(){
    if(fullscreenBusy)return;
    const active=isFullscreen(),target=active?document:document.documentElement;
    const method=active?(document.exitFullscreen||document.webkitExitFullscreen):(target.requestFullscreen||target.webkitRequestFullscreen);
    if(!method){toast('当前浏览器暂不支持页面全屏，请用 Chrome、Edge 或 Safari 打开作品。');return;}
    fullscreenBusy=true;syncFullscreen();
    try{await method.call(target);}catch(error){toast('未能进入或退出全屏，请重试或在独立浏览器中打开作品。');}
    finally{fullscreenBusy=false;syncFullscreen();}
  }
  document.addEventListener('fullscreenchange',syncFullscreen);
  document.addEventListener('webkitfullscreenchange',syncFullscreen);
  function desiredTrack(){return game?.finished&&game.ending?.objective&&['game','epilogue','cinematic','result'].includes(mode)&&(!execution||execution.ready)?'homecoming':'journey';}
  async function playMusic(name=desiredTrack()){
    if(!musicOn||!gesture||document.hidden||loadingTrack===name)return;
    if(loadingTrack&&loadingTrack!==name){audioRequest++;loadingTrack=null;players[1-activeAudio].pause();}
    if(currentTrack===name&&!players[activeAudio].paused)return;
    const request=++audioRequest,reusing=currentTrack===name,old=players[activeAudio],next=reusing?old:players[1-activeAudio];loadingTrack=name;
    cancelAnimationFrame(fadeFrame);if(!reusing){next.pause();next.src=musicSrc(name);}next.loop=true;next.volume=0;next.onended=null;next.dataset.musicRequest=String(request);
    try{await next.play();}catch(e){if(request===audioRequest)loadingTrack=null;return;}
    if(request!==audioRequest){if(next.dataset.musicRequest===String(request))next.pause();return;}
    if(!musicOn||document.hidden){next.pause();return;}
    if(!reusing)activeAudio=1-activeAudio;currentTrack=name;loadingTrack=null;
    const start=performance.now(),from=old.volume,duration=!reusing&&name==='homecoming'?350:850;
    function fade(now){if(request!==audioRequest)return;const t=Math.max(0,Math.min(1,(now-start)/duration));next.volume=volume*t;if(!reusing)old.volume=from*(1-t);if(t<1)fadeFrame=requestAnimationFrame(fade);else if(!reusing)old.pause();}
    fadeFrame=requestAnimationFrame(fade);
  }
  function toggleMusic(){
    gesture=true;musicOn=!musicOn;write(SETTINGS,{on:musicOn,volume});
    if(musicOn)playMusic();else{audioRequest++;loadingTrack=null;cancelAnimationFrame(fadeFrame);players.forEach(a=>a.pause());}
    syncSound();
  }
  function save(){if(game){write(STORE,game);saved=game;}}
  function stars(count,cls=''){return `<div class="stars ${cls}" role="img" aria-label="${count} 星，共 3 星">${[1,2,3].map(i=>icon('medal',i<=count?'earned':'empty')).join('')}</div>`;}
  function frame(scene,content,cls=''){setScene(scene);return `<main class="game-shell ${cls}"><div class="scene-shade"></div>${header()}${content}</main>`;}
  function toolButton(action,label,body,attrs='',cls='round-button',hint=label){
    return `<span class="tool-control" data-tooltip="${esc(hint)}"><button class="${cls}" data-action="${action}" aria-label="${esc(label)}" ${attrs}>${body}</button></span>`;
  }
  function header(){
    const stage=mode==='game'?G.STAGES[Math.min(9,game.feedback?game.stage-1:game.stage)]:null;
    return `<header class="shell-bar"><button class="brand" data-action="home" aria-label="星火接力，返回开场">${icon('star')}<span>星火接力<small>STARFIRE</small></span></button>${stage?`<div class="chapter-nav"><span>${stage.chapter}</span><div class="chapter-pips" aria-label="第 ${Math.min(10,game.feedback?game.stage:game.stage+1)} 章，共 10 章">${G.STAGES.map((_,i)=>`<i class="${i<(game.feedback?game.stage-1:game.stage)?'done':i===(game.feedback?game.stage-1:game.stage)?'active':''}"></i>`).join('')}</div></div>`:mode==='intro'?'<span class="opening-tag">序章 · 长征站的呼唤</span>':''}<nav class="shell-tools" aria-label="游戏工具">${toolButton('home','返回开场',icon('home'))}${toolButton('map','查看航线',icon('map'))}${toolButton('goal','查看三星目标',icon('medal'))}${toolButton('settings','音乐设置',icon('music'),'','round-button music-settings-button')}${toolButton('help','游戏说明',icon('book'))}${toolButton('abort','终止任务',icon('flag'),mode!=='game'||game.finished?'disabled':'','round-button terminate-button',mode==='game'&&!game.finished?'终止任务':'任务进行时可终止')}${toolButton('fullscreen',isFullscreen()?'退出全屏':'全屏',isFullscreen()?'退出全屏':'全屏',`aria-pressed="${isFullscreen()}" ${fullscreenBusy?'disabled':''}`,'fullscreen-button')}</nav></header>`;
  }
  function home(){
    stopCinema();mode='home';busy=false;closeModal(false);render();window.scrollTo({top:0,behavior:'instant'});
  }
  function renderHome(){
    const unfinished=saved&&(!saved.finished||saved.feedback||pendingEnding(saved)),best=read(BEST);
    return frame('base',`<section class="home-copy"><h1 class="home-title" aria-label="星火接力：月球档案行动"><img class="home-title-art" src="${asset('title-lockup-v4.png')}" alt="" draggable="false" fetchpriority="high"></h1><div class="gold-line"></div><p class="home-poem">去很远的地方，也要一起回来。</p><div class="home-actions">${draft?'<button class="primary-button" data-action="resume-opening">继续开场'+icon('arrow')+'</button>':''}${!draft||unfinished?`<button class="${draft?'secondary-button':'primary-button'}" data-action="${unfinished?'resume':'new'}">${unfinished?'继续行动':'开始行动'}${icon('arrow')}</button>`:''}${unfinished||draft?'<button class="text-button" data-action="new">新的旅程</button>':''}</div>${best?.stars?`<div class="home-best-record" role="group" aria-label="历史最佳成绩"><span>历史最佳</span>${stars(best.stars,'home-best')}</div>`:''}</section><div class="home-duo">${rover('star')}${rover('glow')}</div><div class="home-footer"><span>A SMALL MISSION. A BIG JOURNEY.</span></div>`,'home');
  }
  function speechView(d,lines,index,last,kind){
    const left=d.who==='kexin'?'kexin':'star',right='glow',focusNames={storm:'太阳粒子风暴已过 · 补齐最新记录',arrival:'2039.09.30 · 北京探索营即将抵达',time:'任务时钟 · 行动后才走时',link:'山壁会遮挡通信',sample:'核查参观路线 · 补齐科考资料',route:'近路省时 · 远路省电',sun:'有阳光，才能补能',battery:'低温保温，也需要电',map:'看路线，再选行动',team:'两位伙伴一起回家'};
    return `<section class="dialogue-dock speaker-${d.who}" aria-label="${CAST[d.who].name}的对话"><div class="dialogue-character left ${d.who===left?'active':'quiet'}">${rover(left)}<span>${CAST[left].name}</span>${left==='kexin'?'<small>长征站连线</small>':''}</div><div class="speech"><div class="speaker">${CAST[d.who].name}<span>${CAST[d.who].role}</span><i class="speaker-light"></i></div><p id="dialogue-text" tabindex="-1">${esc(storyText(d.text))}</p><div class="dialogue-bottom">${kind==='intro'&&d.focus?`<div class="story-cue">${icon(d.focus)}${focusNames[d.focus]}</div>`:''}<div class="dialogue-actions">${kind==='intro'&&!last?'<button class="text-button" data-action="skip-opening">跳过开场</button>':kind==='dialogue'&&!last?'<button class="text-button" data-action="skip">直接规划</button>':''}<button class="primary-button" data-action="${kind==='intro'?'opening-next':kind==='epilogue'?'ending-next':'advance'}" ${busy?'disabled':''}>${last?(kind==='intro'?'准备行囊':kind==='epilogue'?(busy?'准备参观场景':'迎接探索营'):kind==='outcome'?(game.finished?(game.ending.objective?'回到长征站':'查看结局'):'继续旅程'):'选择行动'):'继续'}${icon('arrow')}</button></div></div></div><div class="dialogue-character right ${d.who===right?'active':'quiet'}">${rover(right)}<span>微光</span></div></section>`;
  }
  function renderIntro(){const d=G.INTRO[introLine];return frame(d.scene,`<div class="scene-title"><span>2039.09.30 · 长征站</span><h1>${d.scene==='control'?'小宇的任务连线':G.NODES[d.scene].name}</h1></div>${speechView(d,G.INTRO,introLine,introLine===G.INTRO.length-1,'intro')}`,'dialogue-view intro-view');}
  function renderKit(){
    return frame('base',`<section class="preparation"><div class="eyebrow">只带一件 · 出发前的选择</div><h1>请选择一件装备</h1><div class="kit-grid" role="radiogroup" aria-label="科考行囊">${Object.entries(G.KITS).map(([id,k])=>`<button class="kit-card ${kit===id?'selected':''}" role="radio" aria-checked="${kit===id}" data-action="kit" data-id="${id}"><span class="kit-art">${icon(k.icon)}</span><strong>${k.name}</strong><span class="kit-effect">${k.effect}</span><span class="kit-visual">${id==='battery'?icon('battery')+' ＋ 1':id==='repair'?icon('time')+' − 1':icon('sample')+' ＋ 1'}</span></button>`).join('')}</div><div class="prepare-actions"><button class="primary-button" data-action="launch">一起出发${icon('arrow')}</button><button class="secondary-button" data-action="home">暂不出发</button></div></section>`,'kit-view');
  }
  function sceneFor(){return game.feedback?game.history.at(-1).target:G.STAGES[game.stage].scene;}
  function mapView(s,selected=null,planning=false){
    const opts=planning?G.options(s):[],active=opts.find(o=>o.id===selected),stage=s&&!s.finished?G.STAGES[s.stage]:null;
    const paths=s?.history.map(l=>`<polyline class="travelled" points="${l.route.map(p=>p.join(',')).join(' ')}"/>`).join('')||'';
    const routes=opts.filter(o=>!G.eligibility(s,o)).map(o=>`<polyline class="option-route ${selected===o.id?'selected':''} route-${o.route}" data-option="${o.id}" points="${G.routePoints(s,o).map(p=>p.join(',')).join(' ')}"/>`).join('');
    return `<div class="map-panel"><div class="map-board" aria-label="十地点科考地图"><img class="terrain-image" src="${asset('map-v3.png')}" alt="十地点的虚构月球全局地形" draggable="false"><svg class="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${paths}${routes}</svg>${Object.entries(G.NODES).map(([id,n])=>{const amount=s?.collected[id]||0,current=s?.positionA===id||s?.positionB===id;return `<button class="map-node ${amount?'collected':''} ${s?.visited.includes(id)?'visited':''} ${current?'current':''} ${stage?.target===id?'destination':''}" data-action="location" data-id="${id}" style="left:${n.x}%;top:${n.y}%" aria-label="${n.name}，${amount?'已取得 '+amount+' 份资料':'尚无资料'}${current?'，当前位置':''}"><i>${amount?icon('check'):''}</i><span>${n.name}</span>${amount?`<b>${icon('sample')}${amount}</b>`:''}</button>`;}).join('')}${s?`<div class="map-rover marker-star" style="left:${G.NODES[s.positionA].x-3}%;top:${G.NODES[s.positionA].y-11}%">${rover('star')}</div><div class="map-rover marker-glow" style="left:${G.NODES[s.positionB].x+2}%;top:${G.NODES[s.positionB].y-10}%">${rover('glow')}</div>`:''}</div><div class="map-footer"><div class="map-legend"><span><i class="filled-dot"></i>已获资料</span><span><i class="empty-dot"></i>尚无资料</span><span><i class="route-dot"></i>${active?'已选路线':'可选路线'}</span></div>${planning?`<p>${active?`${esc(active.name)} · ${G.NODES[s.positionA].name} → ${G.NODES[active.target].name}`:'点选右侧方案，看它在地形上的路线。'}</p>`:''}</div></div>`;
  }
  function cells(value,before=null,who='star'){
    return `<div class="energy-cells ${who}" role="img" aria-label="${who==='star'?'星火':'微光'}电量 ${before!==null&&before!==value?before+' → ':''}${value} 格，共 10 格">${Array.from({length:10},(_,i)=>`<i class="${i<value?'filled':''} ${before!==null&&i>=value&&i<before?'lost':''} ${before!==null&&i>=before&&i<value?'gained':''}"></i>`).join('')}</div>`;
  }
  function resourceBar(state,before=null){
    const current=before||state,estimate=(key,unit)=>before?`<em class="resource-estimate">执行后预计 <b>${state[key]}</b> ${unit}</em>`:'';
    return `<section class="resource-bar" aria-label="${before?'当前资源，附执行后预计值':'当前关键资源'}"><div class="data-resource">${icon('sample')}<div><span>已获资料</span><strong>${current.data}<small> / ${G.GOAL}</small></strong>${estimate('data','份')}</div></div><div class="time-resource">${icon('time')}<div><span>当前剩余时间</span><strong>${current.time}<small> 小时</small></strong>${estimate('time','小时')}</div></div>${['star','glow'].map((who,i)=>{const key=i?'eb':'ea';return `<div class="rover-resource">${rover(who)}<div><span>${i?'微光':'星火'}</span>${cells(current[key],null,who)}${estimate(key,'格')}</div><strong>${current[key]}</strong></div>`;}).join('')}</section>`;
  }
  function costChips(o){
    const p=G.preview(game,o.id),c=p.ok?p.changes:G.optionEffects(game,o);
    const signed=n=>n>0?'+'+n:n<0?'−'+Math.abs(n):'0',tone=n=>n>0?'gain':n<0?'loss':'unchanged';
    return `<div class="action-impact" aria-label="执行后的资源变化"><span class="impact-stat"><span class="impact-label">${icon('time')}时间</span><strong class="loss">${signed(c.time)}<small>小时</small></strong></span><span class="impact-stat"><span class="impact-label">${icon('sample')}资料</span><strong class="${tone(c.data)}">${signed(c.data)}<small>份</small></strong></span><span class="impact-stat"><span class="impact-label star-color">${icon('battery')}星火电量</span><strong class="${tone(c.ea)}">${signed(c.ea)}<small>格</small></strong></span><span class="impact-stat"><span class="impact-label glow-color">${icon('battery')}微光电量</span><strong class="${tone(c.eb)}">${signed(c.eb)}<small>格</small></strong></span></div>`;
  }
  function renderChoice(){
    const s=game,stage=G.STAGES[s.stage],selected=s.ui.selected,preview=selected?G.preview(s,selected):null;
    const future=preview?.ok?preview.state:s,warning=selected&&!future.finished?G.outlook(future):[];
    return frame(sceneFor(),`<section class="planning"><div class="planning-heading"><div><div class="eyebrow">${stage.chapter}</div><h1>${stage.title}</h1></div></div>${resourceBar(future,preview?.ok?s:null)}<div class="planning-layout">${mapView(s,selected,true)}<div class="action-grid" role="radiogroup" aria-label="本章行动方案">${G.options(s).map(o=>{const reason=G.eligibility(s,o),bonus=s.stage===0&&s.kit==='mapping'||o.id==='repair'&&s.kit==='repair';return `<button class="action-card ${selected===o.id?'selected':''}" role="radio" aria-checked="${selected===o.id}" aria-label="${esc(o.name)}${reason?'，不可用：'+esc(reason):''}" data-action="select" data-id="${o.id}" ${reason?'disabled':''}><div class="action-main"><div class="action-heading"><span class="action-illustration">${icon(o.icon)}</span><strong>${o.name}</strong></div><span class="action-description">${esc(o.description)}</span>${reason||o.warning?`<span class="card-warning">${esc(reason||o.warning)}</span>`:''}${bonus?'<span class="kit-bonus">装备生效</span>':''}</div>${costChips(o)}</button>`;}).join('')}</div></div><div class="commit-row"><div class="choice-impact" role="status">${selected?`${warning.length||future.finished&&!future.ending.objective?icon('flag'):icon('check')}<span>${warning.length?esc(warning[0]):future.finished?(future.ending.objective?'预计科考通关 · '+future.ending.stars+' 星':'预计任务未完成'):'执行后 '+future.data+' / '+G.GOAL+' 份资料 · '+future.time+' 小时剩余'}<small>预计值单独标注；确认才会扣除</small></span>`:'<span>选择行动，点亮路线</span>'}</div><button class="primary-button execute-button" data-action="execute" ${!selected||busy?'disabled':''}>${selected?'沿这条计划行动':'选择行动'}${icon('arrow')}</button></div></section>`,'choice-view');
  }
  function renderDialogue(){
    const s=game,outcome=s.ui.phase==='outcome',log=s.history.at(-1),lines=outcome?G.feedbackDialogue(s):G.dialogue(s),d=lines[s.ui.line],last=s.ui.line===lines.length-1,stage=G.STAGES[Math.min(9,outcome?s.stage-1:s.stage)];
    const changes=outcome&&s.ui.line===0?`<div class="outcome-changes" aria-label="本次行动实际变化">${[['data','资料','sample','份'],['time','时间','time','小时'],['ea','星火','battery','格'],['eb','微光','battery','格']].filter(([k])=>log.after[k]!==log.before[k]).map(([k,label,symbol,unit])=>{const n=log.after[k]-log.before[k];return `<span class="${n>0?'gain':'loss'}">${icon(symbol)}${label} <b>${n>0?'+':''}${n}</b> ${unit}</span>`;}).join('')}</div>`:'';
    return frame(sceneFor(),`<div class="scene-title"><span>${outcome?'到达 · '+G.NODES[log.target].name:stage.chapter}</span><h1>${outcome?log.name:stage.title}</h1></div>${changes}${speechView(d,lines,s.ui.line,last,outcome?'outcome':'dialogue')}`,'dialogue-view');
  }
  function goalCards(s=null){
    const pass=!!s?.ending?.objective,d=s?.data||0,a=s?.ea||0,b=s?.eb||0,legacy=s?.finished&&s.balanceVersion!==4,archive=legacy?11:G.ARCHIVE_GOAL,perfect=legacy?11:G.PERFECT_GOAL,reserveTime=legacy?0:G.RESERVE_TIME;
    return `<div class="goal-cards">${[
      {n:1,title:'科考通关',body:G.GOAL+' 份资料 · 两台车回家',symbol:'team',ok:pass},
      {n:2,title:'完整档案',body:'通关 · 至少 '+archive+' 份资料',symbol:'sample',ok:pass&&d>=archive},
      {n:3,title:'从容归航',body:perfect+' 份资料 · 每车余电 ≥ '+G.RESERVE_ENERGY+' 格'+(reserveTime?'<br>提前 '+reserveTime+' 小时归航':''),symbol:'battery',ok:pass&&d>=perfect&&a>=G.RESERVE_ENERGY&&b>=G.RESERVE_ENERGY&&s.time>=reserveTime}
    ].map(x=>`<article class="${s?(x.ok?'achieved':'unmet'):''}"><div class="goal-star">${stars(x.n)}</div><div class="goal-symbol">${icon(x.symbol)}</div><strong>${x.title}</strong><p>${x.body}</p>${s?'<span class="goal-check">'+icon(x.ok?'check':'close')+'</span>':''}</article>`).join('')}</div>`;
  }
  function renderResult(){
    const s=game,e=s.ending;
    return frame(e.objective?'base':s.positionA,`<section class="ending"><div class="ending-eyebrow ${e.objective?'':'failed'}">${icon(e.objective?'check':'flag')}${e.title}${s.balanceVersion!==4?' · 旧版成绩':''}</div>${stars(e.stars,'result-stars')}<h1>${e.type==='recovery'?'任务已终止':e.subtitle}</h1><div class="ending-rovers">${rover('star',s.returnedA?'':'waiting')}${rover('glow',s.returnedB?'':'waiting')}</div><div class="end-stat"><span>${icon('sample')}已获 ${s.data} 份资料</span><span>${icon('team')}${Number(s.returnedA)+Number(s.returnedB)} / 2 台归航</span><span>${icon('battery')}余电 ${s.ea} / ${s.eb}</span><span>${icon('time')}提前 ${s.time} 小时</span></div>${e.objective?goalCards(s):`<div class="failure-reasons">${e.reasons.map(r=>`<span>${icon('close')}${esc(r.replace('已请求应急回收，本次科考提前结束','任务已终止，回收队接管本次科考'))}</span>`).join('')}</div>`}<p class="ending-tip">${esc(e.tip)}</p><div class="ending-actions"><button class="primary-button" data-action="new">${e.stars===3?'再试一种计划':'再挑战一次'}${icon('arrow')}</button><button class="secondary-button" data-action="review">回看关键选择</button></div></section>`,'result-view');
  }
  function pendingEnding(s){return !!(s?.finished&&s.ending?.objective&&s.ui.endingStory?.phase!=='done');}
  function endingLines(){
    const arrival=game.time>0?`欢迎回到长征站！还有${game.time}小时同学们才到，你们已经把${game.data}份环境资料安全带回来了。`:`欢迎回到长征站！你们刚刚赶上，同学们正在靠站，${game.data}份环境资料已经安全入档。`;
    return [
      {who:'kexin',text:arrival},
      {who:'star',text:'星火、微光都到家了！路线上的环境记录补齐了，岩石样本和观测资料也准备好了，就等同学们来探索！'},
      {who:'kexin',text:'谢谢你们，也谢谢为我们规划行程的小指挥员。我会把这些资料讲给大家听。你们先休息，接下来由我带同学们去探索。'},
      {who:'glow',text:'下一批探索者要来了。我们走过的路，现在成为他们认识月球的第一课。'}
    ];
  }
  function enterEnding(){
    stopCinema();remember();
    if(!pendingEnding(game)){mode='result';return;}
    const story=game.ui.endingStory;
    if(!story||!['dialogue','cinematic'].includes(story.phase))game.ui.endingStory={phase:'dialogue',line:0,elapsed:0};
    else{story.line=Math.min(endingLines().length-1,Math.max(0,Number.isInteger(story.line)?story.line:0));story.elapsed=Math.min(ENDING_SLIDES.length*SLIDE_DURATION,Math.max(0,Number.isFinite(story.elapsed)?story.elapsed:0));}
    mode=game.ui.endingStory.phase==='cinematic'?'cinematic':'epilogue';
  }
  function renderEpilogue(){
    const lines=endingLines(),index=game.ui.endingStory.line,d=lines[index],last=index===lines.length-1;
    return frame('base',`<div class="scene-title"><span>归航 · 长征站</span><h1>把探索，交给后来者。</h1></div>${speechView(d,lines,index,last,'epilogue')}`,'dialogue-view epilogue-view');
  }
  function renderCinematic(){
    setScene('base');const index=Math.min(ENDING_SLIDES.length-1,Math.floor(game.ui.endingStory.elapsed/SLIDE_DURATION));
    return `<main class="cinematic-view" aria-label="北京学生科学探索营的月球之旅">${ENDING_SLIDES.map((slide,i)=>`<img class="cinematic-slide ${i===index?'active':''}" src="${asset(slide.image)}" alt="${slide.label}" aria-hidden="${i!==index}" draggable="false">`).join('')}<p class="sr-only" id="cinematic-status" role="status">${ENDING_SLIDES[index].label}</p></main>`;
  }
  function ensureEndingImages(){
    if(!endingImagesPromise)endingImagesPromise=Promise.all(ENDING_SLIDES.map(slide=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.decode?image.decode().then(resolve,reject):resolve();image.onerror=()=>reject(Error('结尾图片加载失败'));image.src=asset(slide.image);}))).catch(error=>{endingImagesPromise=null;throw error;});
    return endingImagesPromise;
  }
  function stopCinema(){cancelAnimationFrame(cinemaFrame);cinemaFrame=0;cinemaLast=0;}
  function startCinema(){
    stopCinema();if(mode!=='cinematic'||document.hidden)return;
    const run=game;cinemaLast=performance.now();
    function tick(now){
      if(mode!=='cinematic'||game!==run||document.hidden){stopCinema();return;}
      const story=game.ui.endingStory,previous=Math.min(ENDING_SLIDES.length-1,Math.floor(story.elapsed/SLIDE_DURATION));
      story.elapsed+=Math.max(0,now-cinemaLast);cinemaLast=now;
      if(story.elapsed>=ENDING_SLIDES.length*SLIDE_DURATION){stopCinema();story.phase='done';story.elapsed=ENDING_SLIDES.length*SLIDE_DURATION;mode='result';save();render();window.scrollTo({top:0,behavior:'instant'});return;}
      const index=Math.floor(story.elapsed/SLIDE_DURATION);
      if(index!==previous){document.querySelectorAll('.cinematic-slide').forEach((image,i)=>{image.classList.toggle('active',i===index);image.setAttribute('aria-hidden',String(i!==index));});document.querySelector('#cinematic-status').textContent=ENDING_SLIDES[index].label;save();}
      cinemaFrame=requestAnimationFrame(tick);
    }
    cinemaFrame=requestAnimationFrame(tick);
  }
  async function advanceEnding(){
    if(mode!=='epilogue'||busy)return;
    const story=game.ui.endingStory;
    if(story.line<endingLines().length-1){story.line++;save();render();document.querySelector('#dialogue-text')?.focus({preventScroll:true});return;}
    const run=game;busy=true;render();
    try{await ensureEndingImages();}catch(error){if(game===run&&mode==='epilogue'){busy=false;render();toast('参观场景暂时未能加载，请再试一次。');}return;}
    if(game!==run||mode!=='epilogue')return;
    busy=false;story.phase='cinematic';story.elapsed=0;mode='cinematic';save();render();window.scrollTo({top:0,behavior:'instant'});startCinema();
  }
  function render(){
    if(mode==='home')app.innerHTML=renderHome();
    else if(mode==='intro')app.innerHTML=renderIntro();
    else if(mode==='kit')app.innerHTML=renderKit();
    else if(mode==='epilogue')app.innerHTML=renderEpilogue();
    else if(mode==='cinematic')app.innerHTML=renderCinematic();
    else if(mode==='result')app.innerHTML=renderResult();
    else app.innerHTML=execution?renderExecution():game.ui.phase==='choice'?renderChoice():renderDialogue();
    if(execution)for(const button of app.querySelectorAll('.shell-bar button:not([data-action="settings"]):not([data-action="fullscreen"])'))button.disabled=true;
    if(modal)app.inert=true;
    playMusic();
  }
  function launch(){
    stopCinema();gesture=true;draft=null;try{localStorage.removeItem(DRAFT);}catch(e){}game=G.createGame(kit);game.runId=Date.now().toString(36);mode='game';save();render();window.scrollTo({top:0,behavior:'instant'});
  }
  function resume(){
    if(!saved)return;
    gesture=true;game=JSON.parse(JSON.stringify(saved));mode=game.ui.phase==='result'?'result':'game';
    if(mode==='result')enterEnding();
    if(game.ui.executionPending){const log=game.history.at(-1);execution={ready:true,restored:true,beforeState:game.ui.executionOrigin,option:{id:log.id,icon:game.ui.executionOrigin.icon},log};busy=true;}
    save();render();window.scrollTo({top:0,behavior:'instant'});
    if(mode==='cinematic'){
      const run=game;
      ensureEndingImages().then(()=>{if(game===run&&mode==='cinematic')startCinema();}).catch(()=>{
        if(game!==run||mode!=='cinematic')return;
        game.ui.endingStory={phase:'dialogue',line:endingLines().length-1,elapsed:0};mode='epilogue';save();render();
      });
    }
  }
  function advance(){
    if(mode==='intro'){if(introLine<G.INTRO.length-1)introLine++;else mode='kit';draft={phase:mode==='kit'?'kit':'intro',line:introLine};write(DRAFT,draft);render();return;}
    if(busy||mode!=='game'||game.ui.phase==='choice')return;
    const lines=game.feedback?G.feedbackDialogue(game):G.dialogue(game);
    if(game.ui.line<lines.length-1)game.ui.line++;
    else if(game.feedback){game=G.advanceFeedback(game);if(game.finished)enterEnding();}
    else game.ui={phase:'choice',line:0,selected:null};
    save();render();document.querySelector('#dialogue-text')?.focus({preventScroll:true});
  }
  function select(id){
    if(mode!=='game'||game.ui.phase!=='choice'||busy)return;
    const o=G.options(game).find(x=>x.id===id);if(!o||G.eligibility(game,o))return;
    game.ui.selected=id;save();render();document.querySelector('[data-action="select"][data-id="'+id+'"]')?.focus({preventScroll:true});
  }
  function execute(){
    if(busy||mode!=='game'||game.ui.phase!=='choice'||!game.ui.selected)return;
    const r=G.apply(game,game.ui.selected);if(!r.ok){toast(r.reason);return;}
    const beforeState=game;game=r.state;busy=true;execution={ready:false,beforeState,option:r.option,log:game.history.at(-1)};game.ui.executionPending=true;game.ui.executionOrigin={positionA:beforeState.positionA,stuck:beforeState.stuck,icon:r.option.icon};save();render();
    animateExecution();
  }
  function renderExecution(){
    const {log,option,beforeState}=execution,service=log.after.ea>log.before.ea||log.after.eb>log.before.eb,repair=option.id==='repair'||option.id==='tow';
    const tiles=[['time','剩余任务时间','time','小时'],['ea','星火电量','battery','格'],['eb','微光电量','battery','格']];
    if(log.after.data<log.before.data)tiles.push(['data','携带资料','sample','份']);
    const gains=[['data','资料','sample','份'],['ea','星火','battery','格'],['eb','微光','battery','格']].filter(([key])=>log.after[key]>log.before[key]);
    return frame(log.target,`<section class="execution-panel ${execution.ready?'gaining complete':''} ${execution.restored?'restored':''}" aria-label="行动执行过程" aria-busy="${!execution.ready}"><div class="execution-heading"><span class="eyebrow">${G.NODES[beforeState.positionA].name} → ${G.NODES[log.target].name}</span><h1>${icon(service?'sun':repair?'tool':option.icon,'execution-action-icon')}<span>${esc(log.name)}</span></h1><p class="execution-status" role="status">${execution.ready?'执行完成 · 查看本次消耗与收获':service?'展开面板，接入补能':repair?'正在协作救援':'正在执行计划'}</p></div><div class="transit-track ${service?'recharging':repair?'repairing':'travelling'}"><div class="transit-line"></div><div class="transit-team">${rover('star')}${beforeState.stuck&&game.stuck?'':rover('glow')}</div></div><div class="execution-resources">${tiles.map(([key,label,symbol,unit])=>{
      const before=log.before[key],after=log.after[key],delta=after-before;
      const cells=key==='ea'||key==='eb'?`<div class="execution-cells ${key}">${Array.from({length:10},(_,i)=>`<i class="${i<Math.min(before,after)?'filled':i<before?'spent':i<after?'credited':''}" style="--cell-delay:${Math.max(0,i-Math.min(before,after))*.11}s"></i>`).join('')}</div>`:'';
      return `<article class="execution-resource ${delta<0?'has-cost':delta>0?'has-gain':''}"><span>${icon(symbol)}${label}</span><strong><b data-counter="${key}">${execution.ready?after:before}</b><small>${unit}</small></strong>${cells}${key==='time'?`<div class="round-ticks">${Array.from({length:G.TIME},(_,i)=>`<i class="${i<after?'filled':i<before?'spent':''}" style="--cell-delay:${Math.max(0,i-after)*.11}s"></i>`).join('')}</div>`:''}<em>${delta<0?'−'+Math.abs(delta)+' '+unit:delta>0?'+'+delta+' '+unit:'未消耗'}</em></article>`;
    }).join('')}</div><div class="execution-gains" aria-label="本次行动收获">${gains.map(([key,label,symbol,unit])=>`<div class="gain-pop" style="--gain-delay:${key==='eb'?'.12s':'0s'}">${icon(symbol)}<span>${label}</span><strong>+${log.after[key]-log.before[key]}<small>${unit}</small></strong></div>`).join('')||'<div class="gain-pop neutral-pop">'+icon('check')+'<span>行动完成</span></div>'}</div><div class="execution-progress" aria-hidden="true"><i></i></div><div class="execution-footer"><span class="execution-caption">${execution.ready?'任务时钟暂停 · 确认后继续剧情':'正在结算本次行动'}</span><button class="primary-button execution-done" data-action="execution-done" ${execution.ready?'':'disabled'}>执行完毕${icon('arrow')}</button></div></section>`,'execution-view');
  }
  function animateExecution(){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,consumeEnd=reduced?140:1600,total=reduced?350:3200;
    const {log}=execution,start=performance.now();let gained=false;
    function tick(now){
      const elapsed=now-start,gainPhase=elapsed>=consumeEnd;
      if(gainPhase&&!gained){gained=true;document.querySelector('.execution-panel')?.classList.add('gaining');const status=document.querySelector('.execution-status');if(status)status.textContent='行动完成 · 收获已入账 · 正在汇总';}
      for(const key of ['time','ea','eb','data']){
        const counter=document.querySelector('[data-counter="'+key+'"]');if(!counter)continue;
        const delta=log.after[key]-log.before[key],fraction=delta<0?Math.min(1,Math.max(0,(elapsed-(reduced?0:240))/(consumeEnd-(reduced?0:240)))):gainPhase?Math.min(1,(elapsed-consumeEnd)/(reduced?120:700)):0;
        counter.textContent=String(log.before[key]+Math.sign(delta)*Math.floor(Math.abs(delta)*fraction));
      }
      if(elapsed<total){executionFrame=requestAnimationFrame(tick);return;}
      execution.ready=true;executionFrame=0;const panel=document.querySelector('.execution-panel');panel?.classList.add('complete');panel?.setAttribute('aria-busy','false');const status=document.querySelector('.execution-status');if(status)status.textContent='执行完成 · 查看本次消耗与收获';const done=document.querySelector('[data-action="execution-done"]');if(done)done.disabled=false;const caption=document.querySelector('.execution-caption');if(caption)caption.textContent='任务时钟暂停 · 确认后继续剧情';
      const change=game.history.at(-1);document.querySelector('#announcer').textContent=change.name+'。资料 '+change.after.data+' 份，剩余任务时间 '+change.after.time+' 小时。';
      playMusic();
    }
    executionFrame=requestAnimationFrame(tick);
  }
  function finishExecution(){
    if(!execution?.ready)return;execution=null;busy=false;delete game.ui.executionPending;delete game.ui.executionOrigin;save();render();document.querySelector('#dialogue-text')?.focus({preventScroll:true});
  }
  function remember(){
    if(game.balanceVersion!==4)return;
    const best=read(BEST);if(!best||game.ending.stars>best.stars)write(BEST,{stars:game.ending.stars,kit:game.kit});
  }
  function closeModal(restore=true){
    overlay.innerHTML='';modal=null;locationFromMap=false;app.inert=false;document.body.style.overflow='';
    if(restore&&priorFocus?.isConnected)priorFocus.focus();
  }
  function modalBox(title,body,cls=''){
    return `<div class="modal-backdrop"><section class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${modal==='location'&&locationFromMap?`<span class="tool-control location-back-control" data-tooltip="返回航线"><button class="round-button location-back" data-action="map-back" aria-label="返回航线">${icon('arrow')}</button></span>`:''}<button class="modal-close round-button" data-action="close" aria-label="关闭">${icon('close')}</button><h2 id="modal-title">${title}</h2>${body}</section></div>`;
  }
  function showModal(type){
    if(!modal)priorFocus=document.activeElement;modal=type;app.inert=true;document.body.style.overflow='hidden';renderModal();overlay.querySelector('button,input,a,summary')?.focus();
  }
  function returnToMap(){
    if(modal!=='location'||!locationFromMap)return;
    modal='map';locationFromMap=false;renderModal();
    overlay.querySelector('[data-action="location"][data-id="'+locationId+'"]')?.focus({preventScroll:true});
  }
  function renderModal(){
    let body='',title='';
    if(modal==='goal'){title='一趟旅程，三种挑战';body=goalCards();}
    if(modal==='settings'){title='音乐设置';body=`<div class="music-card"><div class="music-illustration">${icon('music')}</div><strong>原创背景乐：${desiredTrack()==='homecoming'?'星火归航':'月面巡航'}</strong><button class="secondary-button" data-action="sound" aria-label="${musicOn?'关闭音乐':'开启音乐'}" aria-pressed="${musicOn}">${musicOn?'关闭音乐':'开启音乐'}</button><label class="volume-label" for="music-volume">音乐音量</label><input id="music-volume" type="range" min="0" max="70" value="${Math.round(volume*100)}" aria-label="音乐音量"><p class="modal-note">${desiredTrack()==='homecoming'?'成功归航主题循环播放。':'探索主题循环播放，陪伴整段旅程。'}</p></div>`;}
    if(modal==='abort'){title='终止这次任务？';body='<p class="modal-note">确认后，本次科考将结束，由回收队接管。你可以回看选择，再重新规划。</p><div class="modal-actions"><button class="secondary-button" data-action="close">继续科考</button><button class="primary-button" data-action="confirm-abort">确认终止</button></div>';}
    if(modal==='help'){
      title='游戏说明';body=`<div class="help-tabs" role="tablist" aria-label="游戏说明章节">${[['science','科学档案'],['intent','作品立意']].map(([id,label])=>`<button role="tab" aria-selected="${helpTab===id}" aria-controls="help-content" id="tab-${id}" class="${helpTab===id?'active':''}" data-action="help-tab" data-id="${id}">${label}</button>`).join('')}</div><div id="help-content" role="tabpanel" aria-labelledby="tab-${helpTab}" class="doc-content">${window.StarfireDocs[helpTab]}</div>`;
    }
    if(modal==='map'){title='我们走过的路';body=mapView(game||saved);}
    if(modal==='location'){const n=G.NODES[locationId],amount=(game||saved)?.collected[locationId]||0;title=n.name;body=`<img class="location-preview" src="${asset(n.scene+'.png')}" alt="${n.name}的独立场景"><p class="modal-note">${amount?'已取得 '+amount+' 份资料':'这里尚未取得资料'} · ${locationId==='base'?'归航与协作的起点':'资料会在实际观测后点亮'}</p>`;}
    if(modal==='review'){
      title='哪些决定，改变了结果？';body=`<div class="review-list">${game.history.map((l,i)=>`<article><span class="review-number">${String(i+1).padStart(2,'0')}</span><div><strong>${l.name}</strong><div class="review-resources"><span>${icon('time')}${l.before.time} → ${l.after.time} 小时</span><span>${icon('sample')}${l.before.data} → ${l.after.data}</span><span class="star-color">星火 ${l.before.ea} → ${l.after.ea}</span><span class="glow-color">微光 ${l.before.eb} → ${l.after.eb}</span></div><p>${esc(storyText(l.dialogue.at(-1).text))}</p></div></article>`).join('')||'<p class="modal-note">这次还没有执行行动。</p>'}</div>`;
    }
    overlay.innerHTML=modalBox(title,body,modal==='goal'?'goal-modal':modal==='help'?'help-modal':modal==='map'?'map-modal':modal==='location'&&locationFromMap?'location-modal':'');
  }
  function toast(text){
    document.querySelector('.toast')?.remove();const e=document.createElement('div');e.className='toast';e.setAttribute('role','status');e.textContent=text;document.body.append(e);setTimeout(()=>e.remove(),4000);
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b||b.disabled)return;gesture=true;const {action,id}=b.dataset;
    if(execution&&!['settings','sound','close','execution-done','fullscreen'].includes(action))return;
    switch(action){
      case 'home':save();home();break;
      case 'new':closeModal(false);mode='intro';introLine=0;kit='battery';draft={phase:'intro',line:0};write(DRAFT,draft);render();window.scrollTo({top:0,behavior:'instant'});break;
      case 'opening-next':advance();break;
      case 'ending-next':advanceEnding();break;
      case 'skip-opening':mode='kit';introLine=G.INTRO.length-1;draft={phase:'kit',line:introLine};write(DRAFT,draft);render();break;
      case 'resume-opening':mode=draft.phase;introLine=draft.line;kit=G.KITS[draft.kit]?draft.kit:'battery';render();break;
      case 'location':locationFromMap=modal==='map';locationId=id;showModal('location');break;
      case 'map-back':returnToMap();break;
      case 'kit':kit=id;draft={phase:'kit',line:introLine,kit};write(DRAFT,draft);render();document.querySelector('[data-action="kit"][data-id="'+id+'"]').focus();break;
      case 'launch':launch();break;
      case 'resume':resume();break;
      case 'select':select(id);break;
      case 'execute':execute();break;
      case 'execution-done':finishExecution();break;
      case 'advance':advance();break;
      case 'skip':game.ui={phase:'choice',line:0,selected:null};save();render();break;
      case 'close':closeModal();break;
      case 'sound':toggleMusic();break;
      case 'fullscreen':toggleFullscreen();break;
      case 'goal':case 'settings':case 'map':case 'abort':case 'review':showModal(action);break;
      case 'help':helpTab='science';showModal('help');break;
      case 'help-tab':if(!['science','intent'].includes(id))break;helpTab=id;renderModal();overlay.querySelector('[data-action="help-tab"][data-id="'+id+'"]').focus();break;
      case 'confirm-abort':if(mode!=='game'||!game||game.finished||execution)break;game=G.abort(game);save();remember();closeModal(false);mode='result';render();break;
    }
    if(action!=='sound')playMusic();
  });
  document.addEventListener('input',e=>{
    if(e.target.id!=='music-volume')return;volume=Number(e.target.value)/100;players[activeAudio].volume=volume;write(SETTINGS,{on:musicOn,volume});
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&isFullscreen()){e.preventDefault();toggleFullscreen();return;}
    if(modal){
      if(e.key==='Escape'){e.preventDefault();if(modal==='location'&&locationFromMap)returnToMap();else closeModal();return;}
      if(e.key==='Tab'){
        const controls=[...overlay.querySelectorAll('button:not(:disabled),input,a,summary')].filter(x=>x.getClientRects().length),first=controls[0],last=controls.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
      return;
    }
    if(mode==='intro'&&(e.key==='Enter'||e.key===' ')&&!['BUTTON','INPUT','A'].includes(document.activeElement?.tagName)){e.preventDefault();advance();return;}
    if(mode==='epilogue'&&(e.key==='Enter'||e.key===' ')&&!['BUTTON','INPUT','A'].includes(document.activeElement?.tagName)){e.preventDefault();advanceEnding();return;}
    if(execution){if(execution.ready&&(e.key==='Enter'||e.key===' ')&&!['BUTTON','INPUT','A'].includes(document.activeElement?.tagName)){e.preventDefault();finishExecution();}return;}
    if(mode!=='game'||busy)return;
    if(game.ui.phase==='choice'&&['1','2','3'].includes(e.key)){e.preventDefault();const o=G.options(game)[Number(e.key)-1];if(o)select(o.id);}
    if(e.key==='Enter'&&game.ui.phase==='choice'&&document.activeElement?.getAttribute('role')==='radio'){e.preventDefault();execute();return;}
    if((e.key==='Enter'||e.key===' ')&&!['BUTTON','INPUT','A'].includes(document.activeElement?.tagName)){e.preventDefault();game.ui.phase==='choice'?execute():advance();}
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){if(mode==='cinematic'){stopCinema();save();}audioRequest++;loadingTrack=null;cancelAnimationFrame(fadeFrame);players.forEach(a=>a.pause());}
    else{if(mode==='cinematic')startCinema();if(musicOn&&gesture){playMusic();}}
  });
  window.addEventListener('pagehide',()=>{if(mode==='cinematic')save();});
  render();
  setTimeout(()=>{for(const name of [...Object.keys(G.NODES), 'control']){const img=new Image();img.src=asset(name+'.png');}},500);
  setTimeout(()=>ensureEndingImages().catch(()=>{}),1000);
})();
