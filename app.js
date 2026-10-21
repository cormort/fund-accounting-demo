// Browser-only demo of a 地方教育發展基金 per 教育部「會計制度參考範本」and the 預算籌編操作手冊.
// All data lives in localStorage; each viewer has their own copy.
const KEY="eduFundDemo.v2";

// ---- Master data: 會計制度第四章（會計科目）、附錄二（用途別）、操作手冊資本門對照表 ----
const UNITS=[{id:1,name:"教育局(處)"},{id:2,name:"○○國民中學"},{id:3,name:"○○國民小學"}];
const CATS={1:"資產",2:"負債",3:"基金餘額",4:"基金來源",5:"基金用途"};
const ACCOUNTS=[
  [1,"1111","庫存現金"],[2,"1112","銀行存款－縣(市)庫存款"],[3,"1112","銀行存款－保管款"],[4,"1113","零用及週轉金"],
  [5,"1133","應收帳款"],[6,"1154","預付費用"],[7,"1161","短期墊款"],[8,"1311","存出保證金"],[9,"1315","暫付及待結轉帳項"],
  [10,"2122","應付帳款"],[11,"2123","應付代收款"],[12,"2125","應付費用"],[52,"2129","應付工程款"],[13,"2211","存入保證金"],[14,"2212","應付保管款"],[15,"2215","暫收及待結轉帳項"],
  [16,"3111","累積賸餘"],[17,"3121","累積短絀"],[18,"3112","本期賸餘"],[19,"3122","本期短絀"],
  [20,"415","違規罰款收入"],[21,"431","服務收入"],[22,"451","財產處分收入"],[23,"452","租金收入"],[24,"454","利息收入"],[25,"462","縣(市)庫撥款收入"],
  [26,"46Y","政府其他撥入收入"],[27,"4S1","學雜費收入"],[28,"4S2","推廣教育收入"],[29,"4S3","建教合作收入"],[30,"4YO","受贈收入"],[31,"4YY","雜項收入"],
  [40,"521","高中教育"],[41,"531","國民中學教育"],[42,"532","國民小學教育"],[43,"541","學前教育"],[44,"551","特殊教育"],[45,"561","社會教育"],
  [46,"5L1","行政管理及推展"],[47,"5M1","土地購置"],[48,"5M2","營建及修建工程"],[49,"5M3","交通及運輸設備"],[50,"5M4","其他設備"],[51,"5M5","無形資產"],
].map(([id,code,name])=>({id,code,name,cat:CATS[code[0]]}));
const ACC=Object.fromEntries(ACCOUNTS.map(a=>[a.id,a])), acc=id=>ACC[id];
const CODE_NAME={"1112":"銀行存款"}, GROUPS={"11":"流動資產","13":"其他資產","21":"流動負債","22":"其他負債","31":"累積餘絀"};
const USES=[["113","職員薪金"],["114","工員工資"],["122","約僱職員薪金"],["131","加班費"],["151","考績獎金"],["152","年終獎金"],["181","分擔員工保險費"],
  ["212","工作場所電費"],["214","工作場所水費"],["222","電話費"],["231","國內旅費"],["241","印刷及裝訂費"],["252","一般房屋修護費"],["261","一般房屋保險費"],["255","機械及設備修護費"],
  ["279","外包費"],["285","講課鐘點、稿費、出席審查及查詢費"],["321","辦公（事務）用品"],["324","化學藥劑與實驗用品"],["326","食品"],["414","場地租金"],
  ["511","購置土地"],["512","興建土地改良物"],["513","擴充改良房屋建築及設備"],["514","購置機械及設備"],["515","購置交通及運輸設備"],["516","購置什項設備"],
  ["521","購置電腦軟體"],["522","購置權利"],["726","獎助學員生給與"],["747","慰問金、照護及救濟"]];
const USE=Object.fromEntries(USES), useLabel=c=>c?`${c} ${USE[c]||""}`:"";
const CAPITAL={"5M1":["511","512"],"5M2":["513"],"5M3":["515"],"5M4":["514","516"],"5M5":["521","522"]}; // 操作手冊 p.40
const MEASURES=["年","學期","月","次","人","台","批","式"];
const lbl=a=>`${a.code} ${a.name}`, isCash=a=>a.code.startsWith("111"), unitName=id=>UNITS.find(u=>u.id===id)?.name||"";
// 立沖科目：預付、墊款、暫付、應付（含工程款）。正常方（資產借、負債貸）＝立帳，反方＝沖帳且須指明沖銷對象
const OPEN_ITEM=new Set(["1154","1161","1315","2122","2125","2129"]), isOpenItem=a=>OPEN_ITEM.has(a.code);
const sideOf=a=>a.code[0]==="1"?["debit","credit"]:["credit","debit"]; // [立帳方, 沖帳方]

// ---- Seed data: 附錄六分錄釋例 + 預算籌編（新成立基金：來源＝用途）----
function seedDb(){
  const J=[ // [type,unit,date,summary,status,[[account,debit,credit,use]]]
    ["轉帳",1,"2026-01-01","年度開帳","已過帳",[[2,2000000,0],[3,300000,0],[5,200000,0],[10,0,400000],[13,0,300000],[16,0,1800000]]],
    ["收入",2,"2026-01-15","收到縣(市)庫撥款","已過帳",[[2,7500000,0],[25,0,7500000]]],
    ["收入",2,"2026-03-10","場地租借收入","已過帳",[[2,60000,0],[23,0,60000]]],
    ["收入",3,"2026-01-15","收到縣(市)庫撥款","已過帳",[[2,4500000,0],[25,0,4500000]]],
    ["收入",3,"2026-04-02","收到報廢財產殘值","已過帳",[[2,8000,0],[22,0,8000]]],
    ["收入",3,"2026-05-06","收到廠商押標金","已過帳",[[3,50000,0],[13,0,50000]]],
    ["收入",1,"2026-06-30","存款利息","已過帳",[[2,12000,0],[24,0,12000]]],
    ["支出",2,"2026-06-30","1–6月職員薪金","已過帳",[[41,6000000,0,"113"],[2,0,6000000]]],
    ["支出",2,"2026-06-30","1–6月工作場所電費","已過帳",[[41,1150000,0,"212"],[2,0,1150000]]],
    ["支出",3,"2026-06-30","1–6月職員薪金","已過帳",[[42,3900000,0,"113"],[2,0,3900000]]],
    ["支出",1,"2026-07-10","資訊系統委外維護","已過帳",[[46,600000,0,"279"],[2,0,600000]]],
    ["支出",3,"2026-08-20","教師研習國內旅費","已過帳",[[42,32000,0,"231"],[2,0,32000]]],
    ["支出",2,"2026-09-15","購置教室投影機","已審核",[[50,120000,0,"514"],[2,0,120000]]],
    ["轉帳",3,"2026-09-30","估列9月工作場所水費","草稿",[[42,25000,0,"214"],[12,0,25000]]],
    ["支出",2,"2026-02-01","預付全年房屋保險費","已過帳",[[6,120000,0],[2,0,120000]]],
    ["轉帳",2,"2026-07-01","預付保險費轉列1–6月費用","已過帳",[[41,60000,0,"261"],[6,0,60000,null,"15.0"]]],
    ["支出",3,"2026-09-01","暫付教師研習活動費","已過帳",[[9,50000,0],[2,0,50000]]],
    ["轉帳",1,"2026-08-15","估驗計價第一期工程款","已過帳",[[48,300000,0,"513"],[52,0,300000]]],
    ["支出",1,"2026-09-10","支付第一期工程款","已過帳",[[52,200000,0,null,"18.1"],[2,0,200000]]],
  ];
  const journals=[];
  J.forEach(([type,unit_id,voucher_date,summary,status,lines],i)=>journals.push({id:i+1,voucher_no:voucherNo(voucher_date,journals),type,unit_id,voucher_date,summary,status,
    lines:lines.map(([account_id,debit,credit,use,ref])=>({account_id,debit,credit,...(use&&{use}),...(ref&&{ref})}))}));
  const src=[[2,25,"年",1,15120000],[2,23,"次",24,5000],[3,25,"年",1,9000000],[3,22,"批",1,10000],[1,25,"年",1,2800000],[1,24,"年",1,30000]]
    .map(([unit_id,account_id,measure,qty,price],i)=>({id:i+1,unit_id,account_id,measure,qty,price,last_budget:0,prev_actual:0,note:""}));
  const use=[[2,41,"531200 各校經常門","113","月",12,1000000],[2,41,"531200 各校經常門","212","月",12,200000],[2,41,"531200 各校經常門","321","年",1,600000],[2,41,"531200 各校經常門","261","年",1,120000],
    [2,50,"5M4200 由學校編列執行之其他設備","514","台",2,60000],
    [3,42,"532200 各校經常門","113","月",12,650000],[3,42,"532200 各校經常門","231","年",1,80000],[3,42,"532200 各校經常門","214","月",12,25000],
    [3,42,"532200 各校經常門","321","年",1,380000],[3,50,"5M4200 由學校編列執行之其他設備","514","台",3,150000],
    [1,46,"5L1002 基本行政工作維持","279","年",1,1500000],[1,46,"5L1002 基本行政工作維持","241","年",1,530000],[1,48,"5M2001 教育局(處)營建及修建工程","513","式",1,800000]]
    .map(([unit_id,plan_id,branch,use,measure,qty,price],i)=>({id:i+1,unit_id,plan_id,branch,use,measure,qty,price,last_budget:0,prev_actual:0,note:""}));
  const pbs=[[1,2,2300000],[1,5,200000],[1,10,400000],[1,13,300000],[1,16,1800000],[1,18,0]]
    .map(([unit_id,account_id,H],i)=>({id:i+1,unit_id,account_id,B:0,E:0,H}));
  const req=[[2,41,"321",80000,"2026-10-05","採購期末考卷紙張"],[3,50,"514",150000,"2026-10-08","購置電子白板"]]
    .map(([unit_id,plan_id,use,amount,date,summary],i)=>({id:i+1,no:`請${String(i+1).padStart(4,"0")}`,unit_id,plan_id,use,amount,date,summary,status:"已核准"}));
  const adj=[{id:1,grp:1,kind:"流用",unit_id:3,plan_id:42,use:"113",amount:-30000,date:"2026-09-01",note:"研習場次增加"},
    {id:2,grp:1,kind:"流用",unit_id:3,plan_id:42,use:"231",amount:30000,date:"2026-09-01",note:"研習場次增加"}];
  return {journals,src,use,pbs,req,adj};
}
function voucherNo(date,journals=db.journals){
  const [y,m]=date.split("-").map(Number), prefix=`${String(y-1911).padStart(3,"0")}${String(m).padStart(2,"0")}`;
  const seq=Math.max(0,...journals.filter(j=>j.voucher_no.startsWith(prefix+"-")).map(j=>+j.voucher_no.split("-")[1]))+1;
  return `${prefix}-${String(seq).padStart(6,"0")}`;
}
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d)return d}catch{}return seedDb()}
let db=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch{}}
function resetData(){if(!confirm("確定清除所有資料並還原展示資料？"))return;db=seedDb();save();toast("已還原展示資料");render()}

// ---- Accounting rules ----
const sum=(xs,f)=>xs.reduce((s,x)=>s+(typeof f==="function"?f(x):x[f]),0), nextId=xs=>Math.max(0,...xs.map(x=>x.id))+1, amount=r=>r.qty*r.price;
function checkUse(planCode,use){
  if(!use)throw Error("基金用途科目須選擇用途別");
  if(CAPITAL[planCode]&&!CAPITAL[planCode].includes(use))throw Error(`資本門 ${planCode} 僅可使用用途別 ${CAPITAL[planCode].join("、")}`);
  if(!CAPITAL[planCode]&&use.startsWith("5"))throw Error("經常門計畫不可使用資本門用途別（5xx），請改選 5M 建築及設備計畫");
}
function createJournal(p){
  if(!["收入","支出","轉帳"].includes(p.type))throw Error("請選擇傳票種類");
  if(!UNITS.some(u=>u.id===p.unit_id))throw Error("請選擇分預算基金");
  if(!p.voucher_date)throw Error("請輸入傳票日期");
  if(!p.summary||p.summary.length<2||p.summary.length>240)throw Error("摘要須為 2–240 字");
  if(!(p.lines?.length>=2))throw Error("至少需兩筆分錄明細");
  for(const l of p.lines){
    if(!acc(l.account_id))throw Error("含無效科目");
    if(l.debit<0||l.credit<0||(l.debit>0)===(l.credit>0))throw Error("每一分錄明細只能有借方或貸方金額");
    if(acc(l.account_id).cat==="基金用途")checkUse(acc(l.account_id).code,l.use);else delete l.use;
    if(!isOpenItem(acc(l.account_id))||l[sideOf(acc(l.account_id))[0]]>0)delete l.ref;
    else{const it=openItems()[l.ref];
      if(!it)throw Error(`沖帳須選擇沖銷之立帳傳票（${lbl(acc(l.account_id))}）`);
      if(it.account_id!==l.account_id||it.unit_id!==p.unit_id)throw Error("沖銷對象須為同一分預算基金、同一科目");
      if(l[sideOf(acc(l.account_id))[1]]>it.open)throw Error(`沖銷金額超過未沖餘額 ${money(it.open)}`)}
  }
  const d=Math.round(sum(p.lines,"debit")*100)/100, c=Math.round(sum(p.lines,"credit")*100)/100;
  if(d!==c)throw Error(`借貸不平衡：借方 ${d}、貸方 ${c}`);
  const dr=new Set(p.lines.filter(l=>l.debit>0).map(l=>l.account_id));
  if(p.lines.some(l=>l.credit>0&&dr.has(l.account_id)))throw Error("同一科目不可同時列借方與貸方");
  // 第六章：收入傳票＝借方皆為現金；支出傳票＝貸方皆為現金；轉帳傳票＝不涉及現金
  const cashDr=p.lines.filter(l=>l.debit>0).map(l=>isCash(acc(l.account_id))), cashCr=p.lines.filter(l=>l.credit>0).map(l=>isCash(acc(l.account_id)));
  if(p.type==="收入"&&!(cashDr.every(Boolean)&&!cashCr.some(Boolean)))throw Error("收入傳票：借方須為現金／銀行存款科目，貸方不可為現金");
  if(p.type==="支出"&&!(cashCr.every(Boolean)&&!cashDr.some(Boolean)))throw Error("支出傳票：貸方須為現金／銀行存款科目，借方不可為現金");
  if(p.type==="轉帳"&&[...cashDr,...cashCr].some(Boolean))throw Error("轉帳傳票不可涉及現金科目，請改用收入或支出傳票");
  const j={id:nextId(db.journals),voucher_no:voucherNo(p.voucher_date),type:p.type,unit_id:p.unit_id,voucher_date:p.voucher_date,summary:p.summary,status:"草稿",
    lines:p.lines.map(({account_id,debit,credit,use,ref})=>({account_id,debit,credit,...(use&&{use}),...(ref&&{ref})})),...(p.req_id&&{req_id:p.req_id})};
  db.journals.push(j);save();return j;
}
const isPosted=j=>j.status==="已過帳"||j.status==="已反沖";
const budgetKey=(unit,plan,use)=>`${unit}|${plan}|${use}`;
// 可用餘額＝預算數＋調整數（流用／追加減）－實際數（已過帳）－保留數（已核准請購、尚未過帳）
function budgetMap(units,exceptVoucher){
  const m={}, get=(u,p,s)=>m[budgetKey(u,p,s)]??={unit_id:u,plan_id:p,use:s,budget:0,adj:0,enc:0,actual:0,get avail(){return this.budget+this.adj-this.actual-this.enc}};
  for(const r of db.use)if(units(r.unit_id))get(r.unit_id,r.plan_id,r.use).budget+=amount(r);
  for(const a of db.adj)if(units(a.unit_id))get(a.unit_id,a.plan_id,a.use).adj+=a.amount;
  for(const j of db.journals)if(isPosted(j)&&units(j.unit_id))for(const l of j.lines)if(l.use)get(j.unit_id,l.account_id,l.use).actual+=l.debit-l.credit;
  for(const q of db.req)if(q.status!=="已取消"&&units(q.unit_id)){const v=db.journals.find(j=>j.id===q.voucher_id);
    if(!(v&&(isPosted(v)||v.id===exceptVoucher)))get(q.unit_id,q.plan_id,q.use).enc+=q.amount}
  return m;
}
const available=(u,p,s)=>budgetMap(x=>x===u)[budgetKey(u,p,s)]?.avail??0;
function openItems(){ // 立帳項目及未沖餘額（依已過帳傳票）
  const items={};
  for(const j of db.journals.filter(isPosted))j.lines.forEach((l,i)=>{const a=acc(l.account_id);if(!isOpenItem(a))return;const [s,o]=sideOf(a);
    if(!l.ref&&l[s]>0)items[`${j.id}.${i}`]={key:`${j.id}.${i}`,j,account_id:l.account_id,unit_id:j.unit_id,amount:l[s],offset:0}});
  for(const j of db.journals.filter(isPosted))for(const l of j.lines)if(l.ref&&items[l.ref]){const [s,o]=sideOf(acc(l.account_id));items[l.ref].offset+=l[o]-l[s]}
  for(const it of Object.values(items))it.open=it.amount-it.offset;
  return items;
}
function workflow(id,action){
  const j=db.journals.find(x=>x.id===id);if(!j)throw Error("找不到傳票");
  const target={"草稿:submit":"已審核","已審核:post":"已過帳","已過帳:reverse":"已反沖"}[`${j.status}:${action}`];
  if(!target||(action==="reverse"&&j.reversal_of))throw Error("不允許的狀態轉換");
  if(action==="post"){ // 預算控制：支用不得超過可用預算（本傳票所核銷之請購保留數視為可用）
    const m=budgetMap(u=>u===j.unit_id,j.id), need={};
    for(const l of j.lines)if(l.use){const k=budgetKey(j.unit_id,l.account_id,l.use);need[k]=(need[k]||0)+l.debit-l.credit}
    for(const [k,n] of Object.entries(need)){const left=m[k]?.avail??0;
      if(n>left){const [,p,s]=k.split("|");throw Error(`超出可用預算：${lbl(acc(+p))}／${useLabel(s)} 可用 ${money(left)}，本次 ${money(n)}。請先編列或調整預算`)}}
    const items=openItems(); // 沖帳不得超過未沖餘額
    for(const l of j.lines)if(l.ref){const it=items[l.ref],n=l[sideOf(acc(l.account_id))[1]];if(it&&n>it.open)throw Error(`沖銷金額超過 ${it.j.voucher_no} 未沖餘額 ${money(it.open)}`)}
  }
  if(action==="reverse"){ // 另開沖銷傳票（借貸互換），原傳票保留
    const date=new Date().toISOString().slice(0,10);
    const r={id:nextId(db.journals),voucher_no:voucherNo(date),type:{收入:"支出",支出:"收入",轉帳:"轉帳"}[j.type],unit_id:j.unit_id,voucher_date:date,
      summary:`反沖 ${j.voucher_no}：${j.summary}`.slice(0,240),status:"已過帳",reversal_of:j.id,lines:j.lines.map((l,i)=>({...l,debit:l.credit,credit:l.debit,...(isOpenItem(acc(l.account_id))&&!l.ref&&{ref:`${j.id}.${i}`})}))};
    db.journals.push(r);j.reversed_by=r.id;
  }
  j.status=target;save();
}
function createReq(v){ // 事前請購預控：送件時即檢核可用餘額並保留預算
  if(!(v.amount>0))throw Error("金額須大於 0");
  if(!v.summary||v.summary.length<2)throw Error("請輸入請購事由");
  checkUse(acc(v.plan_id).code,v.use);
  const left=available(v.unit_id,v.plan_id,v.use);
  if(v.amount>left)throw Error(`超出可用預算，阻擋送件：${lbl(acc(v.plan_id))}／${useLabel(v.use)} 可用 ${money(left)}，請購 ${money(v.amount)}`);
  const id=nextId(db.req);db.req.push({id,no:`請${String(id).padStart(4,"0")}`,...v,status:"已核准"});save();
}
function adjustBudget(v){ // 預算流用、追加、追減
  const [fu,fp,fs]=(v.from||"").split("|"), [tu,tp,ts]=(v.to||"").split("|");
  if(!(v.amount>0))throw Error("金額須大於 0");
  if(v.kind!=="追加"&&!v.from)throw Error("請選擇流出（追減）項目");
  if(v.kind!=="追減"&&!v.to)throw Error("請選擇流入（追加）項目");
  if(v.kind==="流用"&&v.from===v.to)throw Error("流出與流入不可為同一項目");
  if(v.kind==="流用"&&fu!==tu)throw Error("流用限同一分預算基金");
  if(v.kind!=="追加"){const left=available(+fu,+fp,fs);if(v.amount>left)throw Error(`流出項目可用餘額僅 ${money(left)}`)}
  const grp=Math.max(0,...db.adj.map(a=>a.grp))+1, row=(k,sign)=>{const [u,p,s]=k.split("|");db.adj.push({id:nextId(db.adj),grp,kind:v.kind,unit_id:+u,plan_id:+p,use:s,amount:sign*v.amount,date:v.date,note:v.note})};
  if(v.from&&v.kind!=="追加")row(v.from,-1);if(v.to&&v.kind!=="追減")row(v.to,1);save();
}

// ---- Report data ----
const inScope=id=>!state.unit||id===state.unit, scoped=xs=>xs.filter(x=>inScope(x.unit_id));
const postedLines=()=>scoped(db.journals).filter(isPosted).flatMap(j=>j.lines);
const balBy=(lines,key)=>lines.reduce((m,l)=>{const k=key(l);m[k]=(m[k]||0)+l.debit-l.credit;return m},{});
function fundStatement(){
  const bal=balBy(postedLines(),l=>l.account_id), rows=[];
  const add=(cat,budgetRows,idKey,sign)=>{for(const a of ACCOUNTS.filter(a=>a.cat===cat)){
    const br=scoped(budgetRows).filter(r=>r[idKey]===a.id), row={a,prev:sum(br,"prev_actual"),budget:sum(br,amount),actual:sign*(bal[a.id]||0)};
    if(row.prev||row.budget||row.actual)rows.push(row)}};
  add("基金來源",db.src,"account_id",-1);add("基金用途",db.use,"plan_id",1);
  const tot=cat=>{const r=rows.filter(x=>x.a.cat===cat);return {prev:sum(r,"prev"),budget:sum(r,"budget"),actual:sum(r,"actual")}};
  return {rows,src:tot("基金來源"),use:tot("基金用途")};
}

// ---- UI ----
const modules=["總覽","請購預控","傳票作業","立沖餘額表","預算執行","預算調整","平衡表","基金來源用途及餘絀表","基金來源明細表","基金用途明細表","預計平衡表"];
let state={active:"總覽",unit:0};
const $=s=>document.querySelector(s), money=n=>new Intl.NumberFormat("zh-TW").format(Math.round(n||0)), esc=s=>String(s??"").replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`);
const pct=(a,b)=>b?`${Math.round(a/b*1000)/10}%`:"—";
const tr=(cells,cls="")=>`<tr class="${cls}">${cells.map(c=>typeof c==="number"?`<td class="money">${money(c)}</td>`:`<td>${c}</td>`).join("")}</tr>`;
const table=(head,rows)=>`<table><thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")||`<tr><td colspan="${head.length}">尚無資料</td></tr>`}</tbody></table>`;
const panel=(title,sub,body,btn="")=>`<div class="panel"><div class="panelhead"><div><h2>${title}</h2><p>${sub}</p></div>${btn}</div>${body}</div>`;
const scopeName=()=>state.unit?unitName(state.unit):"全部分預算基金（彙總）";
const check=(ok,msg)=>`<p class="check ${ok?"ok":"warn"}">${ok?"✓":"✗"} ${msg}</p>`;
let toastTimer;function toast(t){const e=$("#toast");e.textContent=t;e.style.display="block";clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.style.display="none",3500)}
function nav(){$("#nav").innerHTML=modules.map(x=>`<button class="${x===state.active?"active":""}" onclick="go('${x}')"><span>${x}</span></button>`).join("")}
function go(x){state.active=x;$("#title").textContent=x;nav();render()}
function render(){const v=$("#view");try{v.innerHTML=VIEWS[state.active]()}catch(e){v.innerHTML=`<div class="panel warn">${esc(e.message)}</div>`}}

const VIEWS={
  "總覽"(){
    const f=fundStatement(), cash=sum(postedLines().filter(l=>isCash(acc(l.account_id))),l=>l.debit-l.credit), js=scoped(db.journals);
    const count=s=>js.filter(j=>j.status===s).length, rate=f.use.budget?f.use.actual/f.use.budget*100:0;
    return `<div class="cards"><div class="card"><small>基金來源 實際／預算</small><strong>$${money(f.src.actual)}</strong><small>預算 $${money(f.src.budget)}</small></div>
      <div class="card"><small>基金用途 實際／預算</small><strong>$${money(f.use.actual)}</strong><small>預算 $${money(f.use.budget)}</small></div>
      <div class="card"><small>本期賸餘（短絀）</small><strong class="${f.src.actual-f.use.actual<0?"warn":"ok"}">$${money(f.src.actual-f.use.actual)}</strong></div>
      <div class="card"><small>現金及銀行存款</small><strong>$${money(cash)}</strong></div></div>
      ${panel("基金用途執行率",scopeName(),`<p>${pct(f.use.actual,f.use.budget)}｜傳票：草稿 ${count("草稿")}、已審核 ${count("已審核")}、已過帳 ${count("已過帳")}、已反沖 ${count("已反沖")}</p><div class="bar"><i style="width:${Math.min(rate,100)}%"></i></div>`)}
      ${(()=>{const b=Object.values(budgetMap(inScope)), warn=b.filter(x=>x.avail<0||(x.budget+x.adj&&x.actual+x.enc>=(x.budget+x.adj)*.9)), it=Object.values(openItems()).filter(x=>inScope(x.unit_id)&&x.open);
        return panel("預控警示",scopeName(),`<p>執行（含保留）達 90% 以上之預算項目 <b class="${warn.length?"warn":"ok"}">${warn.length}</b> 項｜請購保留數 $${money(sum(b,"enc"))}｜未沖立帳 ${it.length} 筆、$${money(sum(it,"open"))}</p>`)})()}
      ${panel("預算籌編檢核","操作手冊：新成立基金原則上基金來源＝基金用途",check(f.src.budget===f.use.budget,`基金來源預算 $${money(f.src.budget)}、基金用途預算 $${money(f.use.budget)}`))}
      ${panel("展示系統範圍","資料僅存於本瀏覽器",`<p>依教育部會計制度參考範本：平衡表及基金來源、用途及餘絀表科目、收入／支出／轉帳傳票、送審／過帳／反沖；預控：請購即時檢核並保留預算、過帳預算控制、流用／追加減、立帳沖帳；預算籌編含基金來源明細表、基金用途明細表、預計平衡表。正式使用前仍須完成法規、權限、簽核、書表及資安驗證。</p>`)}`;
  },
  "傳票作業"(){
    const lineTxt=l=>`${l.debit?"借":"貸"} ${esc(lbl(acc(l.account_id)))}${l.use?`－${esc(useLabel(l.use))}`:""} ${money(l.debit||l.credit)}${l.ref?`（沖 ${db.journals.find(j=>j.id===+l.ref.split(".")[0])?.voucher_no}）`:""}`;
    const btn=j=>j.status==="草稿"?`<button class="secondary" onclick="flow(${j.id},'submit')">送審</button>`:j.status==="已審核"?`<button class="primary" onclick="flow(${j.id},'post')">過帳</button>`:j.status==="已過帳"&&!j.reversal_of?`<button class="secondary" onclick="flow(${j.id},'reverse')">反沖</button>`:"";
    const rows=scoped(db.journals).slice().reverse().map(j=>tr([j.voucher_no,`${j.type}傳票`,j.voucher_date,unitName(j.unit_id),`${esc(j.summary)}<br><small>${j.lines.map(lineTxt).join("<br>")}</small>`,sum(j.lines,"debit"),`<span class="badge">${j.status}</span>`,btn(j)]));
    return panel("傳票與過帳","收入、支出、轉帳傳票；送審、過帳（預算控制）、反沖",table(["傳票編號","種類","日期","分預算基金","摘要／分錄","金額","狀態","操作"],rows),`<button class="primary" onclick="openVoucher()">＋ 新增傳票</button>`);
  },
  "平衡表"(){
    const b=balBy(postedLines(),l=>acc(l.account_id).code), f=fundStatement(), surplus=f.src.actual-f.use.actual, rows=[];
    const codes=[...new Set(ACCOUNTS.filter(a=>"123".includes(a.code[0])).map(a=>a.code))].sort();
    const section=(d,sign,extra=[])=>{let total=0,grp="";rows.push(tr([`<b>${CATS[d]}</b>`,""],"grp"));
      for(const c of codes.filter(c=>c[0]===d)){const v=sign*(b[c]||0);if(!v)continue;
        if(c.slice(0,2)!==grp){grp=c.slice(0,2);rows.push(tr([`　${GROUPS[grp]}`,""]))}
        rows.push(tr([`　　${c} ${CODE_NAME[c]||ACCOUNTS.find(a=>a.code===c).name}`,v]));total+=v}
      for(const [name,v] of extra){rows.push(tr([`　　${name}`,v]));total+=v}
      rows.push(tr([`${CATS[d]}合計`,total],"total"));return total};
    const A=section("1",1), L=section("2",-1), E=section("3",-1,[[surplus<0?"3122 本期短絀(-)":"3112 本期賸餘",surplus]]);
    return panel("平衡表",`${scopeName()}｜依已過帳傳票編製；本期賸餘（短絀）＝基金來源－基金用途`,table(["科目","金額"],rows)+check(Math.round(A)===Math.round(L+E),`資產 $${money(A)} ＝ 負債 $${money(L)} ＋ 基金餘額 $${money(E)}`));
  },
  "基金來源用途及餘絀表"(){
    const f=fundStatement(), row=(name,x,cls="")=>tr([name,x.prev,x.budget,x.actual,x.actual-x.budget,pct(x.actual-x.budget,x.budget)],cls);
    const rows=[tr(["<b>基金來源</b>","","","","",""],"grp"),...f.rows.filter(r=>r.a.cat==="基金來源").map(r=>row(`　${lbl(r.a)}`,r)),row("基金來源合計",f.src,"total"),
      tr(["<b>基金用途</b>","","","","",""],"grp"),...f.rows.filter(r=>r.a.cat==="基金用途").map(r=>row(`　${lbl(r.a)}`,r)),row("基金用途合計",f.use,"total"),
      row("本期賸餘（短絀）",{prev:f.src.prev-f.use.prev,budget:f.src.budget-f.use.budget,actual:f.src.actual-f.use.actual},"total")];
    return panel("基金來源、用途及餘絀表",`${scopeName()}｜預算數取自預算籌編明細表；實際數依已過帳傳票`,table(["科目","前年度決算數","本年度預算數","本年度實際數","比較增減","%"],rows));
  },
  "預算執行"(){
    const m=Object.values(budgetMap(inScope)).sort((a,b)=>a.unit_id-b.unit_id||acc(a.plan_id).code.localeCompare(acc(b.plan_id).code)||a.use.localeCompare(b.use));
    const rows=m.map(x=>{const total=x.budget+x.adj,hot=x.avail<0||(total&&x.actual+x.enc>=total*.9);
      return tr([unitName(x.unit_id),lbl(acc(x.plan_id)),useLabel(x.use),x.budget,x.adj,total,x.enc,x.actual,`<span class="${hot?"warn":"ok"}">${money(x.avail)}</span>`,`<span class="${hot?"warn":""}">${pct(x.actual+x.enc,total)}</span>`])});
    return panel("預算執行",`${scopeName()}｜可用餘額＝調整後預算－保留數－實際數；執行（含保留）達 90% 標示警示`,table(["分預算基金","工作計畫","用途別","預算數","調整數","調整後預算","保留數(請購)","實際數","可用餘額","執行率(含保留)"],rows));
  },
  "請購預控"(){
    const btn=q=>q.status==="已核准"?(q.voucher_id?`<small>已開傳票，待過帳</small>`:`<button class="primary" onclick="settleReq(${q.id})">核銷</button><button class="secondary" onclick="cancelReq(${q.id})">取消</button>`):"";
    const rows=scoped(db.req).slice().reverse().map(q=>tr([q.no,q.date,unitName(q.unit_id),`${lbl(acc(q.plan_id))}<br><small>${useLabel(q.use)}</small>`,esc(q.summary),q.amount,
      `<span class="badge">${q.status}</span>${q.voucher_id?`<br><small>${db.journals.find(j=>j.id===q.voucher_id)?.voucher_no}</small>`:""}`,btn(q)]));
    return panel("請購預控","送件時即時檢核可用餘額，超支即阻擋；核准後保留預算，核銷開立支出傳票、過帳後轉為實際數",
      table(["請購編號","日期","分預算基金","工作計畫／用途別","事由","金額","狀態","操作"],rows),`<button class="primary" onclick="openReq()">＋ 新增請購</button>`);
  },
  "預算調整"(){
    const rows=scoped(db.adj).slice().reverse().map(a=>tr([a.date,`<span class="badge">${a.kind}</span>`,unitName(a.unit_id),lbl(acc(a.plan_id)),useLabel(a.use),a.amount,esc(a.note)]));
    return panel("預算調整","流用（同一分預算基金內移轉）、追加、追減；流出與追減不得超過可用餘額",
      table(["日期","種類","分預算基金","工作計畫","用途別","調整數","說明"],rows),`<button class="primary" onclick="openAdj()">＋ 新增調整</button>`);
  },
  "立沖餘額表"(){
    const today=new Date(), its=Object.values(openItems()).filter(x=>inScope(x.unit_id)).sort((a,b)=>(b.open>0)-(a.open>0)||a.j.voucher_date.localeCompare(b.j.voucher_date));
    const rows=its.map(x=>tr([x.j.voucher_no,x.j.voucher_date,unitName(x.unit_id),lbl(acc(x.account_id)),esc(x.j.summary),x.amount,x.offset,x.open,
      x.open?`${Math.floor((today-new Date(x.j.voucher_date))/864e5)} 天`:"—",`<span class="badge">${x.open?"未沖清":"已沖清"}</span>`]));
    rows.push(tr(["合計","","","","",sum(its,"amount"),sum(its,"offset"),sum(its,"open"),"",""],"total"));
    return panel("立沖餘額表",`${scopeName()}｜預付、墊款、暫付、應付（含工程款）之立帳與沖銷；沖帳傳票須指定沖銷對象，不得超沖`,
      table(["立帳傳票","日期","分預算基金","科目","摘要","立帳金額","已沖銷","未沖餘額","帳齡","狀態"],rows));
  },
  "基金來源明細表"(){return detailView("src")},
  "基金用途明細表"(){return detailView("use")},
  "預計平衡表"(){
    const rows=scoped(db.pbs).slice().sort((a,b)=>a.unit_id-b.unit_id||acc(a.account_id).code.localeCompare(acc(b.account_id).code))
      .map(r=>tr([unitName(r.unit_id),lbl(acc(r.account_id)),r.B,r.E,r.H,r.H-r.E,editBtns("pbs",r.id)]));
    const h=cat=>sum(scoped(db.pbs).filter(r=>acc(r.account_id).cat===cat),r=>r.H*(["3121","3122"].includes(acc(r.account_id).code)?-1:1));
    const surplusH=sum(scoped(db.pbs).filter(r=>acc(r.account_id).code==="3112"),"H")-sum(scoped(db.pbs).filter(r=>acc(r.account_id).code==="3122"),"H"), f=fundStatement();
    return panel("預計平衡表",`${scopeName()}｜B 前年度決算數、E 上年度預計數、H 本年度預計數`,table(["分預算基金","科目","前年度決算數(B)","上年度預計數(E)","本年度預計數(H)","增減(H−E)","操作"],rows)
      +check(h("資產")===h("負債")+h("基金餘額"),`本年度預計：資產 $${money(h("資產"))} ＝ 負債 $${money(h("負債"))} ＋ 基金餘額 $${money(h("基金餘額"))}`)
      +check(surplusH===f.src.budget-f.use.budget,`本期賸餘(短絀) 預計 $${money(surplusH)} 應等於 基金來源預算－基金用途預算 $${money(f.src.budget-f.use.budget)}`),
      `<button class="primary" onclick="openDetail('pbs')">＋ 新增資料</button>`);
  },
};

// ---- Forms ----
let formSave, formFields;
const unitField={k:"unit_id",label:"分預算基金",type:"select",num:true,options:()=>UNITS.map(u=>[u.id,u.name])};
const accOpts=cats=>()=>ACCOUNTS.filter(a=>cats.includes(a.cat)).map(a=>[a.id,lbl(a)]);
const qtyFields=[{k:"measure",label:"計算單位",type:"select",options:()=>MEASURES.map(m=>[m,m])},{k:"qty",label:"數量",type:"number"},{k:"price",label:"單價",type:"number"},
  {k:"last_budget",label:"上年度預算數",type:"number",req:false,def:0},{k:"prev_actual",label:"前年度決算數",type:"number",req:false,def:0},{k:"note",label:"說明",type:"text",req:false,wide:true}];
const DETAIL={ // 操作手冊 四、五、六
  src:{title:"基金來源明細表",fields:[unitField,{k:"account_id",label:"科目",type:"select",num:true,options:accOpts(["基金來源"])},...qtyFields]},
  use:{title:"基金用途明細表",fields:[unitField,{k:"plan_id",label:"工作計畫",type:"select",num:true,options:accOpts(["基金用途"])},{k:"branch",label:"分支計畫",type:"text",def:"各校經常門"},
    {k:"use",label:"用途別科目",type:"select",options:()=>USES.map(([c,n])=>[c,`${c} ${n}`])},...qtyFields],validate:r=>checkUse(acc(r.plan_id).code,r.use)},
  pbs:{title:"預計平衡表",fields:[unitField,{k:"account_id",label:"平衡表科目",type:"select",num:true,options:accOpts(["資產","負債","基金餘額"])},
    {k:"B",label:"前年度決算數(B)",type:"number",req:false,def:0},{k:"E",label:"上年度預計數(E)",type:"number",req:false,def:0},{k:"H",label:"本年度預計數(H)",type:"number"}]},
};
const editBtns=(key,id)=>`<button class="secondary" onclick="openDetail('${key}',${id})">編輯</button><button class="secondary" onclick="delDetail('${key}',${id})">刪除</button>`;
function detailView(key){
  const rs=scoped(db[key]).slice().sort((a,b)=>a.unit_id-b.unit_id), src=key==="src";
  const rows=rs.map(r=>tr([unitName(r.unit_id),src?lbl(acc(r.account_id)):`${lbl(acc(r.plan_id))}<br><small>${esc(r.branch)}</small>`,...(src?[]:[useLabel(r.use)]),
    r.measure,r.qty,r.price,amount(r),r.last_budget,r.prev_actual,esc(r.note),editBtns(key,r.id)]));
  rows.push(tr(["合計","",...(src?[]:[""]),"","","",sum(rs,amount),sum(rs,"last_budget"),sum(rs,"prev_actual"),"",""],"total"));
  return panel(DETAIL[key].title,`${scopeName()}｜金額＝數量×單價${src?"；建議先編基金用途明細表，再依支出總數編基金來源":"；資本門計畫（5M）須對應 5xx 用途別"}`,
    table(["分預算基金",src?"科目":"工作計畫／分支計畫",...(src?[]:["用途別"]),"單位","數量","單價","本年度預算數","上年度預算數","前年度決算數","說明","操作"],rows),
    `<button class="primary" onclick="openDetail('${key}')">＋ 新增資料</button>`);
}
function openDetail(key,id){
  const spec=DETAIL[key], row=db[key].find(r=>r.id===id)||{unit_id:state.unit||1};
  openForm(`${id?"編輯":"新增"}－${spec.title}`,spec.fields,row,v=>{spec.validate?.(v);if(id)Object.assign(row,v);else db[key].push({id:nextId(db[key]),...v});save();toast("已儲存")});
}
function delDetail(key,id){if(!confirm("確定刪除這筆資料？"))return;db[key]=db[key].filter(r=>r.id!==id);save();toast("已刪除");render()}
const budgetKeyOpts=()=>[...new Set(db.use.map(r=>budgetKey(r.unit_id,r.plan_id,r.use)))].map(k=>{const [u,p,s]=k.split("|");return [k,`${unitName(+u)}｜${lbl(acc(+p))}｜${useLabel(s)}`]});
function openReq(){
  openForm("新增請購",[unitField,{k:"date",label:"請購日期",type:"date"},{k:"plan_id",label:"工作計畫",type:"select",num:true,options:accOpts(["基金用途"])},
    {k:"use",label:"用途別科目",type:"select",options:()=>USES.map(([c,n])=>[c,`${c} ${n}`])},{k:"summary",label:"請購事由",type:"text",wide:true},{k:"amount",label:"金額",type:"number"}],
    {unit_id:state.unit||2,date:new Date().toISOString().slice(0,10),plan_id:41,use:"321",summary:"",amount:""},v=>{createReq(v);toast("請購已核准並保留預算")});
}
function settleReq(id){const q=db.req.find(x=>x.id===id);
  openVoucher({type:"支出",unit_id:q.unit_id,summary:`核銷 ${q.no}：${q.summary}`,debit:q.plan_id,credit:2,use:q.use,amount:q.amount},j=>{j.req_id=q.id;q.voucher_id=j.id;save()})}
function cancelReq(id){if(!confirm("確定取消請購並釋回保留預算？"))return;db.req.find(x=>x.id===id).status="已取消";save();toast("已取消，預算已釋回");render()}
function openAdj(){
  openForm("新增預算調整",[{k:"kind",label:"種類",type:"select",options:()=>["流用","追加","追減"].map(x=>[x,x])},{k:"date",label:"日期",type:"date"},
    {k:"from",label:"流出／追減項目",type:"select",req:false,blank:"（追加免填）",options:budgetKeyOpts,wide:true},{k:"to",label:"流入／追加項目",type:"select",req:false,blank:"（追減免填）",options:budgetKeyOpts,wide:true},
    {k:"amount",label:"金額",type:"number"},{k:"note",label:"說明",type:"text",req:false}],{kind:"流用",date:new Date().toISOString().slice(0,10),amount:""},v=>{adjustBudget(v);toast("預算已調整")});
}
function openVoucher(init={},after){
  openForm("新增傳票",[{k:"type",label:"傳票種類",type:"select",options:()=>[["收入","收入傳票"],["支出","支出傳票"],["轉帳","轉帳傳票"]]},unitField,
    {k:"voucher_date",label:"傳票日期",type:"date"},{k:"summary",label:"摘要",type:"text"},
    {k:"debit",label:"借方科目",type:"select",num:true,options:accOpts(Object.values(CATS)),wide:true},{k:"credit",label:"貸方科目",type:"select",num:true,options:accOpts(Object.values(CATS)),wide:true},
    {k:"use",label:"用途別（基金用途科目必填）",type:"select",req:false,blank:"（非基金用途科目免填）",options:()=>USES.map(([c,n])=>[c,`${c} ${n}`])},{k:"amount",label:"金額",type:"number"},
    {k:"ref",label:"沖銷立帳（沖帳時必填）",type:"select",req:false,blank:"（非沖帳免填）",wide:true,options:()=>Object.values(openItems()).filter(x=>x.open>0).map(x=>[x.key,`${x.j.voucher_no}｜${unitName(x.unit_id)}｜${lbl(acc(x.account_id))}｜未沖 ${money(x.open)}`])}],
    {type:"支出",unit_id:state.unit||2,voucher_date:new Date().toISOString().slice(0,10),summary:"",debit:41,credit:2,use:"321",amount:"",...init},
    v=>{if(!(v.amount>0))throw Error("金額須大於 0");const j=createJournal({type:v.type,unit_id:v.unit_id,voucher_date:v.voucher_date,summary:v.summary.trim(),
      lines:[{account_id:v.debit,debit:v.amount,credit:0,use:v.use,ref:v.ref},{account_id:v.credit,debit:0,credit:v.amount,use:v.use,ref:v.ref}]});after?.(j);toast("傳票草稿已建立")});
}
function openForm(title,fields,init,onSave){
  $("#formTitle").textContent=title;formFields=fields;formSave=onSave;
  $("#fields").innerHTML=fields.map(f=>{const v=init[f.k]??f.def??"", req=f.req===false?"":"required";
    const input=f.type==="select"?`<select name="${f.k}" ${req}>${f.blank?`<option value="">${f.blank}</option>`:""}${f.options().map(([o,l])=>`<option value="${esc(o)}" ${String(o)===String(v)?"selected":""}>${esc(l)}</option>`).join("")}</select>`
      :`<input name="${f.k}" type="${f.type}" ${f.type==="number"?'min="0" step="any"':""} value="${esc(v)}" ${req}>`;
    return `<label class="${f.wide?"wide":""}">${f.label}${input}</label>`}).join("");
  $("#modal").classList.remove("hidden");
}
function closeModal(){$("#modal").classList.add("hidden")}
$("#form").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target),v={};
  for(const f of formFields){const x=fd.get(f.k);v[f.k]=f.type==="number"||f.num?Number(x||0):x}
  try{formSave(v);closeModal();render()}catch(err){toast(err.message)}};
function flow(id,action){try{workflow(id,action);toast({submit:"已送審",post:"已過帳",reverse:"已反沖並產生沖銷傳票"}[action]);render()}catch(e){toast(e.message)}}

$("#unit").innerHTML='<option value="0">全部分預算基金（彙總）</option>'+UNITS.map(u=>`<option value="${u.id}">${u.name}</option>`).join("");
$("#unit").onchange=e=>{state.unit=Number(e.target.value);render()};
nav();render();setInterval(()=>$("#clock").textContent="更新："+new Date().toLocaleString("zh-TW"),1000);
