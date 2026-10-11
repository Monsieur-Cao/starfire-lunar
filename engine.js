(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Starfire=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=3,MAX_ENERGY=10,GOAL=8,ARCHIVE_GOAL=12,PERFECT_GOAL=13,RESERVE_ENERGY=2,RESERVE_TIME=2,TIME=20;
const KITS={battery:{name:'续航电池',icon:'battery',effect:'每台车，多一格电',short:'+1 电 / 车'},repair:{name:'维修工具',icon:'tool',effect:'修好伙伴，少用一小时',short:'维修少 1 小时'},mapping:{name:'地形扫描仪',icon:'scan',effect:'第一段路，多记一份资料',short:'首段 +1 资料'}};
const NODES={base:{x:21,y:67,name:'长征站',scene:'base'},dawn:{x:19,y:35,name:'晨光脊',scene:'dawn'},plateau:{x:35,y:33,name:'日照台',scene:'plateau'},basin:{x:52,y:57,name:'观测盆地',scene:'basin'},rubble:{x:77,y:69,name:'碎石坡',scene:'rubble'},relay:{x:58,y:20,name:'通信高地',scene:'relay'},cold:{x:66,y:51,name:'冷影峡谷',scene:'cold'},shadow:{x:74,y:35,name:'暗影陨坑',scene:'shadow'},ancient:{x:48,y:74,name:'古老岩台',scene:'ancient'},beacon:{x:87,y:47,name:'归航灯塔',scene:'beacon'}};
const STAGES=[
['晨光脊','看清第一段路。','dawn','route'],['日照台','把阳光存进电池。','plateau','service'],['观测盆地','拼图，从岩石开始。','basin','survey'],['碎石坡','伙伴的呼唤。','rubble','rescue'],['通信高地','让地球听见我们。','relay','relay'],['冷影峡谷','阴影里，也要留住温度。','cold','route'],['暗影陨坑','把未知，变成记录。','shadow','survey'],['古老岩台','最后一块拼图。','ancient','survey'],['归航灯塔','灯亮了，家就近了。','beacon','service'],['长征站','把约定带回家。','base','return']
].map(([name,title,target,kind],i)=>({chapter:String(i+1).padStart(2,'0')+' · '+name,name,title,target,scene:target,kind,music:i>=3&&i<=7?'shadow':'journey'}));
const line=(who,text,focus=null,scene=null)=>({who,text,focus,scene});
const INTRO=[
line('kexin','长征站呼叫星火、微光。我是小宇。你们能听见吗？','link','control'),
line('star','星火收到！我和微光的观测设备都检查通过了。警报刚停，基地怎么又忙起来了？',null,'base'),
line('kexin','今天是2039年9月30日。来自北京的学生科学探索营，要来长征站参观学习。他们还有二十小时抵达！','arrival','control'),
line('star','第一次来月球，一定有好多问题！我们带他们看看基地周围吧。','sample','base'),
line('glow','刚才的太阳粒子风暴损坏了基地的部分监测设备，最新的环境记录缺了好多。','storm','relay'),
line('kexin','监测中心已确认可以出发。我们要重新核查路线上的光照、温度和通信，再补齐给同学们看的岩石样本和科考资料。你愿意替我们规划吗？','sample','control'),
line('kexin','赶路、观测和充电都需要时间，每个行动至少用一小时。二十小时内带齐八份科考资料、一起返回长征站，才能做好准备。','time','control'),
line('star','明白！用两小时拍全景，就只剩十八小时。看地图、读对白时任务时钟暂停，你可以慢慢想；行动后时间只会减少。','time','base'),
line('star','我想带同学们认识暗影陨坑！但路上全是石头，不能只挑最近的那条路。','route','rubble'),
line('glow','先经过日照台吧。太阳能板见到阳光，才有机会充电；阴影里可补不了。','sun','plateau'),
line('kexin','峡谷里还要用电保温。走亮处会绕远，穿过暗处会耗电，决定权交给你。','battery','cold'),
line('glow','山壁会挡住信号。到通信高地，我就能把资料先传回来。及时备份，遇到意外也不怕全部丢失。','link','relay'),
line('kexin','地图已点亮十个地点。每次选方案，先看看路线和电量变化，再让他们行动。','map','control'),
line('star','八份资料，两位伙伴——我们一起回来，迎接北京的小探索家！准备行囊吧！','team','base')
];
const clone=x=>JSON.parse(JSON.stringify(x));
function createGame(kit='battery'){if(!KITS[kit])throw Error('未知装备');return {version:VERSION,balanceVersion:4,kit,stage:0,ea:kit==='battery'?10:9,eb:kit==='battery'?10:9,time:TIME,data:0,stuck:false,relay:false,returnedA:false,returnedB:false,finished:false,feedback:false,positionA:'base',positionB:'base',visited:['base'],collected:{},history:[],ui:{phase:'dialogue',line:0,selected:null}};}
function rawOptions(s){
 if(s.finished||s.stage<0||s.stage>=STAGES.length)return [];
 const b=n=>s.stuck?0:n;
 const rows=[
 [{id:'ridge',name:'沿亮处缓缓走',icon:'route',time:2,ea:-1,eb:-1,route:'sunny'},
 {id:'shortcut',name:'穿过碎石近路',icon:'fast',time:1,ea:-2,eb:-2,route:'direct'},
 {id:'survey',name:'绕到高处拍全景',icon:'scan',time:2,ea:-2,eb:-1,data:1,route:'survey'}],
 [{id:'charge-both',name:'补能并记录日照',icon:'sun',time:2,ea:3,eb:3,data:1,route:'sunny'},
 {id:'charge-star',name:'快速补能',icon:'battery',time:1,ea:4,eb:1,route:'direct'},
 {id:'keep-going',name:'拍下日照图再赶路',icon:'scan',time:1,ea:0,eb:0,data:1,route:'direct'}],
 [{id:'joint-sample',name:'分工观测岩层',icon:'team',time:2,ea:-1,eb:-1,data:2,route:'survey'},
 {id:'solo-sample',name:'星火快速观测',icon:'scan',time:1,ea:-2,eb:0,data:2,route:'direct'},
 {id:'surface-sample',name:'只看附近岩石',icon:'sample',time:1,ea:-1,eb:0,data:1,route:'sunny'}],
 [{id:'repair',name:'停下来修好微光',icon:'tool',time:s.kit==='repair'?1:2,ea:-1,eb:-1,unstuck:true,route:'survey'},
 {id:'tow',name:'星火牵引微光',icon:'team',time:1,ea:-2,eb:0,unstuck:true,route:'direct'},
 {id:'leave',name:'先走，返程来接',icon:'flag',time:1,ea:0,eb:0,route:'direct',warning:'暂时无法双车协作；接回需 4 小时'}],
 [{id:'relay-study',name:'校准天线并测绘',icon:'link',time:2,ea:-1,eb:b(-1),data:2,relay:true,route:'survey'},
 {id:'relay-send',name:'快速测绘并回传',icon:'link',time:1,ea:-2,eb:0,data:1,relay:true,route:'direct'},
 {id:'relay-pass',name:'保留电量继续走',icon:'fast',time:1,ea:0,eb:0,route:'sunny'}],
 [{id:'sunlit-detour',name:'沿阳光绕过峡谷',icon:'sun',time:2,ea:-1,eb:b(-1),route:'sunny'},
 {id:'thermal-study',name:'开加热并记录温度',icon:'sample',time:2,ea:-2,eb:b(-1),data:2,route:'survey'},
 {id:'quick-cross',name:'直接穿过冷影',icon:'fast',time:1,ea:-2,eb:b(-2),route:'direct'}],
 [{id:'relay-probe',name:'两车接力探测',icon:'team',time:2,ea:-1,eb:-3,data:3,needsPartner:true,relay:true,route:'survey'},
 {id:'deep-probe',name:'星火深入陨坑',icon:'sample',time:2,ea:-3,eb:b(-1),data:4,route:'direct'},
 {id:'rim-probe',name:'停在坑缘观测',icon:'scan',time:1,ea:-1,eb:0,data:1,route:'sunny'}],
 [{id:'ancient-study',name:'认真比对岩层',icon:'sample',time:2,ea:-1,eb:b(-1),data:2,route:'survey'},
 {id:'ancient-scan',name:'快速拍摄岩台',icon:'scan',time:1,ea:-1,eb:0,data:1,route:'direct'},
 {id:'ancient-pass',name:'记住位置再出发',icon:'flag',time:1,ea:0,eb:0,route:'sunny'}],
 [{id:'beacon-charge',name:'两台接入补能站',icon:'battery',time:2,ea:3,eb:b(3),data:1,route:'sunny'},
 {id:'beacon-star',name:'星火快速补能',icon:'battery',time:1,ea:4,eb:0,route:'direct'},
 {id:'beacon-record',name:'记录导航信标',icon:'scan',time:1,ea:0,eb:0,data:1,route:'survey'}],
 s.stuck?[
 {id:'rescue-return',name:'回头接上微光',icon:'team',time:4,ea:-4,eb:-2,unstuck:true,returnBoth:true,via:'rubble',route:'survey'},
 {id:'return-star',name:'星火先带资料回来',icon:'flag',time:1,ea:-2,eb:0,data:s.relay?0:-1,returnSolo:true,route:'direct',warning:'只回一台，本次不能通关'},
 {id:'recovery',name:'呼叫应急回收',icon:'home',time:1,ea:0,eb:0,recovery:true,route:'direct',warning:'本次任务未完成'}]:[
 {id:'return-both',name:'两台并肩归航',icon:'home',time:2,ea:-2,eb:-2,returnBoth:true,route:'sunny'},
 {id:'return-slow',name:'沿平缓路节能归航',icon:'route',time:3,ea:-1,eb:-1,returnBoth:true,route:'survey'},
 s.eb<2?{id:'share-return',name:'星火补给微光再归航',icon:'team',time:2,ea:-(4-s.eb),eb:-s.eb,returnBoth:true,route:'survey'}:
 s.ea<2?{id:'share-star',name:'微光补给星火再归航',icon:'team',time:2,ea:-s.ea,eb:-(4-s.ea),returnBoth:true,route:'survey'}:
 {id:'return-fast',name:'沿灯标快速归航',icon:'fast',time:1,ea:-3,eb:-3,returnBoth:true,route:'direct'}]

 ];
 return rows[s.stage].map(o=>{const plan={ea:0,eb:0,data:0,target:STAGES[s.stage].target,...o,data:(o.data||0)+(s.stage===0&&s.kit==='mapping'?1:0)};plan.description=describeOption(s,plan);if(plan.id==='beacon-charge'&&s.stuck)plan.name='星火接入补能站';return plan;});
}
function optionResources(s,o){return {ea:Math.min(MAX_ENERGY,s.ea+o.ea),eb:Math.min(MAX_ENERGY,s.eb+o.eb),time:s.time-o.time,data:Math.max(0,s.data+o.data),partner:!s.stuck||!!o.unstuck,relay:s.relay||!!o.relay,returnedA:!!(o.returnBoth||o.returnSolo),returnedB:!!o.returnBoth};}
function optionEffects(s,o){const next=optionResources(s,o);return Object.fromEntries(['ea','eb','time','data'].map(k=>[k,next[k]-s[k]]));}
function energyText(c){const phrase=(name,n)=>n>0?name+'补'+n+'格电':n<0?name+'用'+(-n)+'格电':name+'电量不变';return c.ea===c.eb?(c.ea>0?'各补'+c.ea+'格电':c.ea<0?'各用'+(-c.ea)+'格电':'两车电量不变'):phrase('星火',c.ea)+'，'+phrase('微光',c.eb);}
function describeOption(s,o){
 const c=optionEffects(s,o),energy=energyText(c),hours=o.time+'小时',data=c.data+'份',cap=(o.ea>c.ea||o.eb>c.eb)?'（电量上限10格）':'';
 const text={
 ridge:'绕行'+hours+'，'+energy+'。',shortcut:'近路'+hours+'，'+energy+'。',survey:'拍全景，记录'+data+'地形资料；'+energy+'。',
 'charge-both':energy+cap+'，记录'+data+'日照资料。','charge-star':hours+'快速补能；'+energy+cap+'。','keep-going':hours+'记录'+data+'日照资料，不补电。',
 'joint-sample':energy+'，记录'+data+'岩层资料。','solo-sample':hours+'记录'+data+'资料；'+energy+'。','surface-sample':energy+'，记录'+data+'附近岩石资料。',
 repair:hours+'修好微光；'+energy+'。',tow:hours+'牵引脱困；'+energy+'。',leave:'微光原地等候；返程接回需4小时、星火4格电、微光2格电。',
 'relay-study':energy+'，记录'+data+'资料并备份。','relay-send':hours+'记录'+data+'资料并备份；'+energy+'。','relay-pass':hours+'继续走，不新增资料、不备份。',
 'sunlit-detour':hours+'绕过冷影；'+energy+'。','thermal-study':'记录'+data+'温度资料；'+energy+'。','quick-cross':hours+'穿过冷影；'+energy+'。',
 'relay-probe':'接力记录'+data+'资料并备份；'+energy+'。','deep-probe':'深入记录'+data+'资料；'+energy+'。','rim-probe':'坑缘记录'+data+'资料；'+energy+'。',
 'ancient-study':'比对记录'+data+'岩层资料；'+energy+'。','ancient-scan':hours+'记录'+data+'岩台资料；'+energy+'。','ancient-pass':hours+'继续走，不新增资料、不耗电。',
 'beacon-charge':energy+cap+'，记录'+data+'导航资料。','beacon-star':hours+'补能；'+energy+cap+'。','beacon-record':hours+'记录'+data+'导航资料，不补电。',
 'rescue-return':hours+'回头接回微光；'+energy+'。','return-star':(c.data<0?'未备份，少带'+(-c.data)+'份资料；':'资料数量不变；')+'微光等待回收，不能通关。',recovery:hours+'等待应急回收，结束任务。',
 'return-both':hours+'共同归航；'+energy+'。','return-slow':hours+'节能归航；'+energy+'。','return-fast':hours+'快速归航；'+energy+'。',
 'share-return':'给微光补'+(2-s.eb)+'格后归航；星火共用'+(-c.ea)+'格，微光净减少'+(-c.eb)+'格。',
 'share-star':'给星火补'+(2-s.ea)+'格后归航；微光共用'+(-c.eb)+'格，星火净减少'+(-c.ea)+'格。'
 };
 return text[o.id]+(s.stage===0&&s.kit==='mapping'?'含扫描仪额外1份。':'')+(s.stuck&&o.eb===0&&!o.unstuck&&s.stage>=4?'微光留在碎石坡。':'');
}
function dominance(s,a,b){const av=Object.values(optionResources(s,a)),bv=Object.values(optionResources(s,b));return av.every((v,i)=>Number(v)>=Number(bv[i]))?(av.some((v,i)=>Number(v)>Number(bv[i]))?'better':'equal'):'';}
function options(s){const rows=rawOptions(s);return rows.filter((o,i)=>eligibility(s,o)||!rows.some((a,j)=>j!==i&&!eligibility(s,a)&&(dominance(s,a,o)==='better'||dominance(s,a,o)==='equal'&&j<i)));}
function eligibility(s,o){if(!o||s.finished)return '行动已结束';if(s.feedback)return '先继续旅程';if(o.needsPartner&&s.stuck)return '微光仍在碎石坡';if(s.time<o.time)return '还差 '+(o.time-s.time)+' 小时';if(s.ea+o.ea<0)return '星火还差 '+(-s.ea-o.ea)+' 格电';if(s.eb+o.eb<0)return '微光还差 '+(-s.eb-o.eb)+' 格电';return '';}
function returnNeed(s){
 const future={...s,stage:9,finished:false,feedback:false};
 const plans=rawOptions(future).filter(o=>o.returnBoth).map(o=>({time:o.time,ea:Math.max(0,-o.ea),eb:Math.max(0,-o.eb),label:o.name}));
 const gap=r=>Math.max(0,r.time-s.time)+Math.max(0,r.ea-s.ea)+Math.max(0,r.eb-s.eb);
 return plans.sort((a,b)=>gap(a)-gap(b)||a.time-b.time)[0];
}
function outlook(s){if(s.finished)return [];const r=returnNeed(s),w=[];if(s.time<r.time)w.push(r.label+'需 '+r.time+' 小时，只剩 '+s.time+' 小时');if(s.ea<r.ea)w.push('星火返程需 '+r.ea+' 格，只剩 '+s.ea+' 格');if(s.eb<r.eb)w.push('微光返程需 '+r.eb+' 格，只剩 '+s.eb+' 格');return w;}
function dialogue(s){switch(s.stage){
case 0:return [line('star','山脊在发光，碎石路藏在阴影里。哪一条更适合我们的电量？','route'),line('kexin','地图路线对应行动卡。点选后看资源变化，确认才会出发。','map'),line('glow',s.kit==='mapping'?'扫描仪正在记录！第一段路会额外多一份资料。':'走远路省电，走近路省时间。你来决定第一段。')];
case 1:return [line('glow','日照台到了。看，面板上的指示灯亮了！','sun'),line('star','如果现在停下来充电，后面的暗影也许就没那么难走。'),line('kexin','补电需要时间，电池最多十格。卡片显示这次实际能补多少，两台都要留电回家。')];
case 2:return [line('star','这些岩层像一本很厚的书。采样钻终于能用上了！'),line('glow','我看纹理，你看成分。分工时每车用一格电；快速观测由你用两格电。','sample')];
case 3:return [line('glow','星火……一块石头卡进我的履带，我动不了了。'),line('star','别着急，我的轮子还能走。牵引绳也在。'),line('kexin',s.kit==='repair'?'带的维修工具正好派上用场，一小时就能修好。':'救援会花资源；也能先行，再用四小时回来接。别忘记返程的承诺。')];
case 4:return [line('kexin','通信高地呼叫——终于听清你们的声音了。刚才山壁挡住了信号。','link'),line('star','小宇，档案能不能先发回去？同学们就能先看见月球的样子了。'),line('glow',s.stuck?'我还在碎石坡。星火可以自己把资料传回去，我会继续守着信标。':'天线就在这里。校准时还能记录信号与地形的关系，收两份资料；快速测绘能收一份。')];
case 5:return [line('star','峡谷里需要开加热。先为保温留好电，再决定怎么穿过去。','battery'),line('kexin','这里晒不到太阳，保温也需要电。右边的亮处是绕行路。','sun'),line('glow','绕过去省电，停下来测温能记录两份资料；直接穿过更快。选之前，看一看地图。','map')];
case 6:return [line('star','坑底很安静。照明灯能照到更深的岩层。'),line('glow',s.stuck?'我不在你旁边，接力探测暂时做不到。记得给接回留四小时。':s.relay?'高地传回的档案已经安全了。我可以再帮你接力探测。':'这里的信号又弱了。两台接力探测可以把新资料传回营地。','link'),line('kexin','深入会得到更多资料，也会多用电。归航灯塔还有一次补能机会。','battery')];
case 7:return [line('glow','古老岩台上的一层层纹理，可以和盆地的记录对上。','sample'),line('star',s.data<GOAL?'资料还差 '+(GOAL-s.data)+' 份。我们得把空白补上。':'八份资料已经够通关；十二份才能拼出更完整的档案。'),line('kexin','不是采得越多越好。资料、回家、余电和准备时间，要一起想。')];
case 8:return [line('kexin','灯塔收到信号！补能接口已打开，营地就在下一段路。','battery'),line('glow',s.stuck?'星火，我还在碎石坡。灯塔只能给在场的你补电。':'先核对补能方案实际能增加多少电，再选择是否记录导航资料。电池最多十格。'),line('star','十三份资料、每车余电两格，再提前两小时归航，就能拿三星，留出迎接同学们的时间。')];
case 9:return [line('kexin','归航通道已经点亮。星火、微光，报告位置。'),line('glow',s.stuck?'我仍在碎石坡的信标旁。你还记得来接我吗？':'我看见营地的灯了。现在，我们一起回家。'),line('star',outlook(s)[0]?outlook(s)[0]+'。要认真选好最后的方案。':s.stuck?'先核对回头接伙伴的时间和电量。把资料和彼此，都带回去。':s.ea<2||s.eb<2?'平缓路三小时、每车一格电；还可以核对分享电量后的返程方案。':'快路一小时、每车三格电；平缓路三小时、每车一格电。把资料和彼此，都带回去。','team')];
default:return [];}}
function afterDialogue(o,s,n){const c=Object.fromEntries(['ea','eb','time','data'].map(k=>[k,n[k]-s[k]])),chargeReport=energyText(c)+'，电池最多10格。';const texts={
ridge:['star','沿着亮处慢慢走。长一点的路，为我们省下了电。'],shortcut:['glow','近路走完了！少用一小时，颠簸也让每车多耗了一格电。'],survey:['glow','全景收好，晨光脊共记录'+c.data+'份地形资料。'],
'charge-both':['glow','补能完成！'+chargeReport+'还记录了'+c.data+'份日照资料。'],'charge-star':['star','一小时补能完成！'+chargeReport+'接下来还要照顾两台的返程电量。'],'keep-going':['star','日照影像收好了！用了一小时，没有补电，电量还是刚才的样子。'],
'joint-sample':['glow','成分和纹理都记录到了，两份资料拼在一起。'],'solo-sample':['star','采样完成！我多用了电，也为大家省下一小时。'],'surface-sample':['glow','一份近处记录。更多电量留给后面的路。'],
repair:['glow',s.kit==='repair'?'工具很好用，一小时就清掉了碎石！履带又能转了。':'碎石取出来了，履带又能转了！我可以继续同行。'],tow:['star','牵引绳拉紧……出来了！我的两格电，换回了伙伴。'],leave:['glow','我守着信标等你。返程来接，需要四小时，星火四格、我两格电。'],
'relay-study':['kexin','天线校准完毕。两份通信资料和现有档案，都收到了。'],'relay-send':['kexin','一份新测绘资料和已有档案都收到了。你多用了电，为我们省下一小时。'],'relay-pass':['glow','没有停下来传资料。下一段山壁，可能又会挡住信号。'],
'sunlit-detour':['star','阳光照到了面板。虽然绕远，但加热耗电少了。'],'thermal-study':['glow','亮处和暗处的温度记录齐了，两份资料已经入档。'],'quick-cross':['star','冷影穿过去了。路短，加热却让我们多用了电。'],
'relay-probe':['glow','三份新资料已经传回营地。我的电少了，档案更安全了。'],'deep-probe':['star','四份深层记录！不是发现了水冰，是让未知多了一些证据。'],'rim-probe':['star','我停在坑缘。一份新资料，留住更多返程电量。'],
'ancient-study':['glow','两份岩层记录补好了。不同地点的资料，终于能互相比较。'],'ancient-scan':['star','一份岩台影像。我们用更少时间继续赶路。'],'ancient-pass':['star','我记住位置了。这次把时间和电，留给回家。'],
'beacon-charge':['kexin',s.stuck?'补能完成！'+chargeReport+'记录了'+c.data+'份导航资料。微光不在这里，没法接入。':'补能完成！'+chargeReport+'还记录了'+c.data+'份导航资料。'],'beacon-star':['star','补能完成！'+chargeReport+'现在再核对返程电量。'],'beacon-record':['glow','导航信标多补了一份资料。没有充电，电量还是原来的。'],
'rescue-return':['glow','你回来了！现在两道车辙，一起延伸到营地。'],'return-slow':['glow','沿平缓路慢慢开。每车只用一格电，我们一起到了。'],'return-fast':['star','沿灯标快速返回，一小时就到了，每车用了三格电。'],'share-star':['glow','给你补上'+(2-s.ea)+'格电，再一起返程。补给加行驶，我共用了'+(4-s.ea)+'格。'],'return-both':['kexin',n.data>=GOAL?'长征站收到归航信号和环境档案！北京探索营就快到了，欢迎回来，一起迎接同学们。':'长征站收到两台车的归航信号。欢迎回来！资料还没收齐，参观路线仍需核对。'],'share-return':['star','给你补上'+(2-s.eb)+'格电，再一起返程。补给加行驶，我共用了'+(4-s.eb)+'格。'],'return-star':['kexin','星火抵达。微光仍在等待回收，共同归航还没有完成。'],recovery:['kexin','回收队接管了任务。安全第一，我们可以重新规划。']};
const [who,text]=texts[o.id],rows=[line(who,text)];
if(s.stage===0&&s.kit==='mapping')rows.push(line('glow','其中有扫描仪额外记录的1份资料，已经计入本次收获。','map'));
if(o.unstuck&&!n.finished)rows.push(line('star','下一个地点，我们又可以一起走了。'));
if(o.data>0&&s.stage>0&&!n.finished)rows.push(line('glow','现在共有 '+n.data+' 份资料。'+(n.data>=PERFECT_GOAL?'三星所需资料齐了，还要留余电和两小时准备时间。':n.data>=ARCHIVE_GOAL?'二星档案齐了，三星还要一份资料、余电和准备时间。':n.data>=GOAL?'基础档案齐了，还能争取更完整的记录。':'离八份目标还差 '+(GOAL-n.data)+' 份。'),'sample'));
if(!n.finished&&outlook(n).length)rows.push(line('kexin',outlook(n)[0]+'。灯塔前后都要核对返程余量。','battery'));
if(n.finished&&n.returnedB)rows.push(line('glow','我们把资料带回来了，也把彼此带回来了。'));
return rows;}
function feedbackDialogue(s){const log=s.history.at(-1);if(!log||s.balanceVersion!==4)return log?.dialogue||[];const before={...s,...log.before,stage:log.stage,finished:false,feedback:false};const o=rawOptions(before).find(o=>o.id===log.id);return o?afterDialogue(o,before,s):log.dialogue;}
function ending(s,recovery=false){
 const both=s.returnedA&&s.returnedB,objective=!recovery&&both&&s.data>=GOAL;
 const stars=objective?(s.data>=ARCHIVE_GOAL?(s.data>=PERFECT_GOAL&&s.ea>=RESERVE_ENERGY&&s.eb>=RESERVE_ENERGY&&s.time>=RESERVE_TIME?3:2):1):0;
 const reasons=[];if(recovery)reasons.push('已请求应急回收，本次科考提前结束');else if(!both)reasons.push('两台车没有共同归航');if(s.data<GOAL)reasons.push('资料 '+s.data+' / '+GOAL+' 份');
 const deficits=[];if(s.data<PERFECT_GOAL)deficits.push('资料还差 '+(PERFECT_GOAL-s.data)+' 份');if(s.ea<RESERVE_ENERGY)deficits.push('星火余电还差 '+(RESERVE_ENERGY-s.ea)+' 格');if(s.eb<RESERVE_ENERGY)deficits.push('微光余电还差 '+(RESERVE_ENERGY-s.eb)+' 格');if(s.time<RESERVE_TIME)deficits.push('准备时间还差 '+(RESERVE_TIME-s.time)+' 小时');
 return {objective,stars,type:recovery?'recovery':objective?'success':both?'data-short':'solo',title:objective?'科考成功':'科考未完成',subtitle:recovery?'应急回收 · 任务中止':['重新规划这次远行','一星 · 共同归航','二星 · 完整档案','三星 · 完美接力'][stars],reasons,tip:recovery?'回看关键选择，为下次出发留足资料、电量与归航时间。':!objective?(s.stuck?'伙伴仍在碎石坡。先救援，或给接回预留四小时。':s.data<GOAL?'地图上还有空白档案点。少赶一段路，多完成一次观测。':'带回资料，也要让两位伙伴一起回来。'):stars===1?'成功带齐基础档案！挑战二星，还差 '+(ARCHIVE_GOAL-s.data)+' 份资料。':stars===2?'二星档案已齐。挑战三星：'+deficits.join('；')+'。':'完整档案、共同归航、充足余电，还提前两小时到家！你为北京的小探索家留出了欢迎准备时间。'};
}
function settleResources(n){if(!n.finished&&!n.feedback&&!options(n).some(o=>!eligibility(n,o))){n.finished=true;n.balanceVersion=4;n.ending={...ending(n),type:'resources',subtitle:'资源不足 · 科考中止',reasons:['没有可执行的下一步行动',...outlook({...n,finished:false})],tip:'回看关键选择；在日照台和归航灯塔补能，给观测与返程留出时间。'};n.ui={phase:'result',line:0,selected:null};}return n;}
function routePoints(s,o){const from=NODES[s.positionA],to=NODES[o.target];if(o.via)return [[from.x,from.y],[NODES[o.via].x,NODES[o.via].y],[to.x,to.y]];const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy)||1;const bend=o.route==='sunny'?8:o.route==='survey'?-9:0;return [[from.x,from.y],[Math.max(7,Math.min(93,(from.x+to.x)/2-dy/len*bend)),Math.max(12,Math.min(88,(from.y+to.y)/2+dx/len*bend))],[to.x,to.y]];}
function apply(s,id){const o=options(s).find(x=>x.id===id),reason=eligibility(s,o);if(reason)return {ok:false,reason,state:clone(s)};const n=clone(s),keys=['ea','eb','time','data'],before=Object.fromEntries(keys.map(k=>[k,s[k]]));n.ea=Math.min(MAX_ENERGY,s.ea+o.ea);n.eb=Math.min(MAX_ENERGY,s.eb+o.eb);n.balanceVersion=4;n.time-=o.time;n.data=Math.max(0,s.data+o.data);if(o.unstuck)n.stuck=false;if(o.relay)n.relay=true;n.positionA=o.target;if((!s.stuck||o.unstuck)&&!o.returnSolo)n.positionB=o.target;
if(!n.visited.includes(o.target))n.visited.push(o.target);const gained=Math.max(0,n.data-s.data);if(gained)n.collected[o.target]=(n.collected[o.target]||0)+gained;n.stage++;
if(o.returnBoth){n.returnedA=true;n.returnedB=true;n.finished=true;}if(o.returnSolo){n.returnedA=true;n.returnedB=false;n.finished=true;}if(o.recovery)n.finished=true;if(n.finished)n.ending=ending(n,!!o.recovery);
const after=Object.fromEntries(keys.map(k=>[k,n[k]]));n.history.push({stage:s.stage,id:o.id,name:o.name,scene:o.target,target:o.target,route:routePoints(s,o),before,after,dialogue:afterDialogue(o,s,n)});n.feedback=true;n.ui={phase:'outcome',line:0,selected:null};return {ok:true,state:n,option:o,changes:Object.fromEntries(keys.map(k=>[k,after[k]-before[k]]))};}
function advanceFeedback(s){const n=clone(s);n.feedback=false;n.ui={phase:n.finished?'result':'dialogue',line:0,selected:null};if(n.stage===3&&!n.finished){n.stuck=true;n.positionA='rubble';n.positionB='rubble';if(!n.visited.includes('rubble'))n.visited.push('rubble');}return settleResources(n);}
function abort(s){if(s.finished)return clone(s);const n=clone(s);n.finished=true;n.feedback=false;n.ending=ending(n,true);n.ui={phase:'result',line:0,selected:null};return n;}
function isValid(s){if(!s||s.version!==VERSION||!KITS[s.kit]||!Number.isInteger(s.stage)||s.stage<0||s.stage>STAGES.length)return false;for(const k of ['ea','eb'])if(!Number.isInteger(s[k])||s[k]<0||s[k]>MAX_ENERGY)return false;if(!Number.isInteger(s.time)||s.time<0||s.time>TIME||!Number.isInteger(s.data)||s.data<0||s.data>30)return false;if(['stuck','relay','returnedA','returnedB','finished','feedback'].some(k=>typeof s[k]!=='boolean'))return false;
if(!NODES[s.positionA]||!NODES[s.positionB]||!Array.isArray(s.visited)||s.visited.some(id=>!NODES[id])||!s.collected||Array.isArray(s.collected)||Object.entries(s.collected).some(([id,n])=>!NODES[id]||!Number.isInteger(n)||n<1)||!Array.isArray(s.history)||s.history.length!==s.stage)return false;
if(s.history.some((l,i)=>!l||l.stage!==i||typeof l.name!=='string'||!NODES[l.target]||!Array.isArray(l.route)||l.route.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)))||!Array.isArray(l.dialogue)||!l.dialogue.length||l.dialogue.some(d=>!['star','glow','kexin'].includes(d.who)||typeof d.text!=='string')||['before','after'].some(a=>!l[a]||['ea','eb','time','data'].some(k=>!Number.isInteger(l[a][k])||l[a][k]<0))))return false;
if(s.stage===STAGES.length&&!s.finished)return false;if(s.finished&&(!s.ending||typeof s.ending.objective!=='boolean'||!Number.isInteger(s.ending.stars)||s.ending.stars<0||s.ending.stars>3))return false;
const ui=s.ui;if(ui?.executionPending!==undefined&&(ui.executionPending!==true||ui.phase!=='outcome'||ui.line!==0||!NODES[ui.executionOrigin?.positionA]||typeof ui.executionOrigin?.stuck!=='boolean'||typeof ui.executionOrigin?.icon!=='string'))return false;if(!ui||!['dialogue','choice','outcome','result'].includes(ui.phase)||!Number.isInteger(ui.line)||ui.line<0)return false;if(ui.phase==='result'&&(!s.finished||s.feedback)||ui.phase==='choice'&&(s.feedback||s.finished)||ui.phase==='dialogue'&&(s.finished||s.feedback)||s.feedback&&ui.phase!=='outcome'||!s.feedback&&ui.phase==='outcome')return false;const lines=s.feedback?s.history.at(-1)?.dialogue:dialogue(s);if(['dialogue','outcome'].includes(ui.phase)&&(!lines.length||ui.line>=lines.length))return false;if(ui.phase==='choice'&&ui.selected!==null&&!rawOptions(s).some(o=>o.id===ui.selected)&&!(s.stage===9&&['return-star','share-return'].includes(ui.selected)))return false;return true;}
return {VERSION,MAX_ENERGY,GOAL,ARCHIVE_GOAL,PERFECT_GOAL,RESERVE_ENERGY,RESERVE_TIME,TIME,KITS,NODES,STAGES,INTRO,createGame,rawOptions,optionResources,optionEffects,describeOption,feedbackDialogue,dominance,options,eligibility,returnNeed,outlook,dialogue,ending,routePoints,apply,preview:apply,advanceFeedback,settleResources,abort,isValid};
});
