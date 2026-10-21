// Browser-only backend: ports app/main.py + seed.py; data lives in localStorage.
// ponytail: no period locks / budget upsert / trial balance — the UI never called them.
const KEY="fundDemo.v1";
function seedDb(){
  const funds=[{id:1,code:"C001",name:"中央示範作業基金",government_level:"中央",authority:"中央示範主管機關"},{id:2,code:"L001",name:"臺北市示範作業基金",government_level:"地方",authority:"臺北市政府"},{id:3,code:"L002",name:"新北市示範作業基金",government_level:"地方",authority:"新北市政府"}];
  const units=funds.flatMap((f,i)=>[{id:i*2+1,fund_id:f.id,code:"HQ",name:"基金本部"},{id:i*2+2,fund_id:f.id,code:"U01",name:"實績單位A"}]);
  const accounts=[["111001","銀行存款－公庫存款","資產","D","平衡表"],["114301","應收帳款","資產","D","平衡表"],["212101","應付帳款","負債","C","平衡表"],["410102","服務收入","收入","C","收支餘絀表"],["510102","服務成本","成本","D","收支餘絀表"],["520299","其他業務外費用","費用","D","收支餘絀表"]].map(([code,name,category,normal_side,statement],i)=>({id:i+1,code,name,category,normal_side,statement}));
  const journals=[{id:1,voucher_no:"11510-000001",fund_id:1,unit_id:1,voucher_date:"2026-10-20",summary:"認列服務收入",status:"已過帳",lines:[{account_id:2,debit:1280000,credit:0},{account_id:4,debit:0,credit:1280000}]}];
  const budgets=funds.map((f,i)=>{const a=[120000000,86000000,64000000][i];return {id:i+1,fiscal_year:115,fund_id:f.id,account_id:5,approved:a,adjusted:a,committed:a*.62,actual:a*.55,note:"展示資料"}});
  return {funds,units,accounts,journals,budgets};
}
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d)return d}catch{}return seedDb()}
let db=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch{}}
function resetData(){if(!confirm("確定清除所有資料並還原展示資料？"))return;db=seedDb();save();toast("已還原展示資料");render()}
const byId=(xs,id)=>xs.find(x=>x.id===id), nextId=xs=>Math.max(0,...xs.map(x=>x.id))+1, sum=(xs,k)=>xs.reduce((s,x)=>s+x[k],0);
const byFund=(xs,fid)=>fid?xs.filter(x=>x.fund_id===fid):xs;
function createJournal(p){
  if(!p.summary||p.summary.length<2||p.summary.length>240)throw Error("摘要須為 2–240 字");
  if(!p.voucher_date)throw Error("請輸入傳票日期");
  if(!(p.lines?.length>=2))throw Error("至少需兩筆分錄明細");
  for(const l of p.lines){if(l.debit<0||l.credit<0||(l.debit>0)===(l.credit>0))throw Error("每一分錄明細只能有借方或貸方金額")}
  const d=Math.round(sum(p.lines,"debit")*100)/100, c=Math.round(sum(p.lines,"credit")*100)/100;
  if(d!==c)throw Error(`借貸不平衡：借方 ${d}、貸方 ${c}`);
  const unit=byId(db.units,p.unit_id);
  if(!unit||unit.fund_id!==p.fund_id)throw Error("實績單位不屬於所選基金");
  if(!p.lines.every(l=>byId(db.accounts,l.account_id)))throw Error("含無效或停用科目");
  const [y,m]=p.voucher_date.split("-").map(Number), prefix=`${String(y-1911).padStart(3,"0")}${String(m).padStart(2,"0")}`;
  const seq=Math.max(0,...db.journals.filter(j=>j.voucher_no.startsWith(prefix+"-")).map(j=>+j.voucher_no.split("-")[1]))+1;
  const j={id:nextId(db.journals),voucher_no:`${prefix}-${String(seq).padStart(6,"0")}`,fund_id:p.fund_id,unit_id:p.unit_id,voucher_date:p.voucher_date,summary:p.summary,status:"草稿",lines:p.lines.map(({account_id,debit,credit})=>({account_id,debit,credit}))};
  db.journals.push(j);save();return {id:j.id,voucher_no:j.voucher_no,status:j.status};
}
function workflow(id,action){
  const j=byId(db.journals,id);if(!j)throw Error("找不到傳票");
  const target={"草稿:submit":"已審核","已審核:post":"已過帳","已過帳:reverse":"已反沖"}[`${j.status}:${action}`];
  if(!target)throw Error("不允許的狀態轉換");
  j.status=target;save();return {id:j.id,status:j.status};
}
async function api(url,opt={}){
  const u=new URL(url,location.href), fid=Number(u.searchParams.get("fund_id"))||0, path=u.pathname.replace(/^.*\/api\//,""), post=opt.method==="POST";
  if(path==="bootstrap")return {funds:db.funds,units:db.units,accounts:db.accounts};
  if(path==="dashboard"){const b=byFund(db.budgets,fid),approved=sum(b,"adjusted"),actual=sum(b,"actual"),committed=sum(b,"committed");return {approved,actual,committed,available:approved-committed,execution_rate:approved?Math.round(actual/approved*10000)/100:0,journal_count:byFund(db.journals,fid).length}}
  if(path==="journals"&&post)return createJournal(JSON.parse(opt.body));
  if(path==="journals")return byFund(db.journals,fid).slice().reverse().map(j=>({id:j.id,voucher_no:j.voucher_no,date:j.voucher_date,summary:j.summary,status:j.status,debit:sum(j.lines,"debit"),credit:sum(j.lines,"credit")}));
  const wf=path.match(/^journals\/(\d+)\/workflow$/);if(wf&&post)return workflow(+wf[1],u.searchParams.get("action"));
  if(path==="budgets")return byFund(db.budgets,fid).map(x=>{const a=byId(db.accounts,x.account_id);return {id:x.id,year:x.fiscal_year,fund:byId(db.funds,x.fund_id).name,account:a.code+" "+a.name,approved:x.approved,adjusted:x.adjusted,committed:x.committed,actual:x.actual,available:x.adjusted-x.committed,rate:x.adjusted?Math.round(x.actual/x.adjusted*10000)/100:0,note:x.note}});
  throw Error("未知的操作："+path);
}
const modules=["總覽","預算編製","會計帳務處理","成本管理","收支估計","半年結算","彙編作業","預算控制","決算編製","管理分析"];
let state={active:"總覽",funds:[],units:[],accounts:[],fundId:""};
const $=s=>document.querySelector(s), money=n=>new Intl.NumberFormat("zh-TW").format(Math.round(n||0)), esc=s=>String(s??"").replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`);
let toastTimer;function toast(t){const e=$("#toast");e.textContent=t;e.style.display="block";clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.style.display="none",2500)}
function nav(){ $("#nav").innerHTML=modules.map(x=>`<button class="${x===state.active?'active':''}" onclick="go('${x}')"><span>${x}</span></button>`).join("") }
function go(x){state.active=x;$("#title").textContent=x;nav();render()}
async function init(){const b=await api('/api/bootstrap');Object.assign(state,b);$("#fund").innerHTML='<option value="">全部基金</option>'+state.funds.map(f=>`<option value="${f.id}">${f.name}</option>`).join('');fillAccounts();nav();render();setInterval(()=>$("#clock").textContent='更新：'+new Date().toLocaleString('zh-TW'),1000)}
function fillAccounts(){const ops=state.accounts.map(a=>`<option value="${a.id}">${a.code} ${a.name}</option>`).join('');$("#debitAccount").innerHTML=ops;$("#creditAccount").innerHTML=ops;$("#creditAccount").selectedIndex=Math.min(3,state.accounts.length-1)}
$("#fund").onchange=e=>{state.fundId=e.target.value;fillUnits();render()};$("#gov").onchange=e=>{const v=e.target.value;const fs=state.funds.filter(f=>!v||f.government_level===v);$("#fund").innerHTML='<option value="">全部基金</option>'+fs.map(f=>`<option value="${f.id}">${f.name}</option>`).join('');state.fundId='';fillUnits();render()};
function fillUnits(){const us=state.units.filter(u=>!state.fundId||u.fund_id==state.fundId);$("#unit").innerHTML=us.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}
async function render(){const v=$("#view");v.innerHTML='<div class="panel">資料載入中…</div>';try{if(state.active==='總覽')return dashboard();if(state.active==='會計帳務處理')return journals();if(state.active==='預算編製'||state.active==='預算控制')return budgets();return generic()}catch(e){v.innerHTML=`<div class="panel warn">${esc(e.message)}</div>`}}
async function dashboard(){const d=await api('/api/dashboard'+(state.fundId?`?fund_id=${state.fundId}`:''));$("#view").innerHTML=`<div class="cards"><div class="card"><small>調整後預算</small><strong>$${money(d.approved)}</strong></div><div class="card"><small>累計執行數</small><strong>$${money(d.actual)}</strong></div><div class="card"><small>可用餘額</small><strong>$${money(d.available)}</strong></div><div class="card"><small>預算執行率</small><strong>${d.execution_rate}%</strong></div></div><div class="panel"><h2>執行概況</h2><p>傳票 ${d.journal_count} 張｜承諾數 $${money(d.committed)}</p><div class="bar"><i style="width:${Math.min(d.execution_rate,100)}%"></i></div></div><div class="panel"><h2>展示系統範圍</h2><p>本版本提供基金、實績單位、科目、平衡傳票、工作流程、預算控制、試算表與 API。正式使用前仍須完成法規、權限、簽核、書表及資安驗證。</p></div>`}
async function journals(){const q=state.fundId?`?fund_id=${state.fundId}`:'';const rows=await api('/api/journals'+q);$("#view").innerHTML=`<div class="panel"><div class="panelhead"><div><h2>傳票與過帳</h2><p>建立、審核、過帳及反沖</p></div><button class="primary" onclick="openModal()">＋ 新增傳票</button></div><table><thead><tr><th>傳票編號</th><th>日期</th><th>摘要</th><th>借方</th><th>貸方</th><th>狀態</th><th>操作</th></tr></thead><tbody>${rows.map(j=>`<tr><td>${j.voucher_no}</td><td>${j.date}</td><td>${esc(j.summary)}</td><td class="money">${money(j.debit)}</td><td class="money">${money(j.credit)}</td><td><span class="badge">${j.status}</span></td><td>${workflowButtons(j)}</td></tr>`).join('')||'<tr><td colspan="7">尚無資料</td></tr>'}</tbody></table></div>`}
function workflowButtons(j){if(j.status==='草稿')return `<button class="secondary" onclick="flow(${j.id},'submit')">送審</button>`;if(j.status==='已審核')return `<button class="primary" onclick="flow(${j.id},'post')">過帳</button>`;if(j.status==='已過帳')return `<button class="secondary" onclick="flow(${j.id},'reverse')">反沖</button>`;return ''}
async function flow(id,action){try{await api(`/api/journals/${id}/workflow?action=${action}`,{method:'POST'});toast('狀態已更新');journals()}catch(e){toast(e.message)}}
async function budgets(){const q=state.fundId?`?fund_id=${state.fundId}`:'';const rows=await api('/api/budgets'+q);$("#view").innerHTML=`<div class="panel"><div class="panelhead"><div><h2>${state.active}</h2><p>法定預算、調整數、承諾數與實際數</p></div><button class="secondary" onclick="toast('展示版檢核完成')">規範檢核</button></div><table><thead><tr><th>基金</th><th>科目</th><th>調整後預算</th><th>承諾數</th><th>實際數</th><th>可用餘額</th><th>執行率</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.fund)}</td><td>${esc(x.account)}</td><td class="money">${money(x.adjusted)}</td><td class="money">${money(x.committed)}</td><td class="money">${money(x.actual)}</td><td class="money ${x.available<0?'warn':'ok'}">${money(x.available)}</td><td>${x.rate}%</td></tr>`).join('')}</tbody></table></div>`}
function generic(){const desc={"成本管理":"直接成本、間接成本、成本中心與分攤作業","收支估計":"分期收支估計、實際比較及差異分析","半年結算":"關帳、調整分錄及半年結算書表","彙編作業":"跨基金及實績單位資料彙整與退回補正","決算編製":"決算主要表、明細表、參考表及附註","管理分析":"財務、預算、成本及營運績效指標"};$("#view").innerHTML=`<div class="cards"><div class="card"><small>資料完整性</small><strong class="ok">通過</strong></div><div class="card"><small>待覆核</small><strong>4 件</strong></div><div class="card"><small>預警</small><strong class="warn">2 件</strong></div><div class="card"><small>完成度</small><strong>78%</strong></div></div><div class="panel"><h2>${state.active}</h2><p>${desc[state.active]||''}</p><button class="primary" onclick="toast('已建立展示作業')">新增作業</button></div>`}
function openModal(){if(!state.fundId){toast('請先選擇基金');return}fillUnits();$("#vdate").value=new Date().toISOString().slice(0,10);$("#modal").classList.remove('hidden')}function closeModal(){$("#modal").classList.add('hidden')}
$("#journalForm").onsubmit=async e=>{e.preventDefault();const amount=Number($("#amount").value);const body={fund_id:Number(state.fundId),unit_id:Number($("#unit").value),voucher_date:$("#vdate").value,summary:$("#summary").value,lines:[{account_id:Number($("#debitAccount").value),debit:amount,credit:0},{account_id:Number($("#creditAccount").value),debit:0,credit:amount}]};try{await api('/api/journals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});closeModal();toast('傳票草稿已建立');journals()}catch(e){toast(e.message)}};
init().catch(e=>toast(e.message));
