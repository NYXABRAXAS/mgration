(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusOptions=['Available in OPTIM','Configuration Required','Partially Available','Enhancement Required','New Development Required','API Integration Required','Policy Confirmation Required','Source Information Missing'];
  const workflowOptions=['Not Started','In Progress','Blocked','Done'];
  const priorityOptions=['Unassigned','P0','P1','P2','P3'];
  const storeKey='suryoday-migration-tracker-v1';
  let data=null, view='dashboard', records=[], overrideMap={}, activeId='', currentPage=1, selectedStage='login-and-authentication', activeProduct='all', objectUrls=[];
  let filters={search:'',product:'all',stage:'all',module:'all',priority:'all',status:'all'};

  function loadOverrides(){try{return JSON.parse(localStorage.getItem(storeKey)||'{}')}catch{return {}}}
  function persist(){try{localStorage.setItem(storeKey,JSON.stringify(overrideMap))}catch{}}
  function stateOf(r){return {...r,...(overrideMap[r.id]||{})}}
  function slug(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  function badgeClass(status){
    if(status==='Available in OPTIM'||status==='Done')return 'available';
    if(status==='Partially Available'||status==='In Progress')return 'partial';
    if(status==='Policy Confirmation Required'||status==='Configuration Required'||status==='Unassigned')return 'confirm';
    if(status==='Source Information Missing'||status==='Blocked')return 'missing';
    if(status==='New Development Required'||status==='Enhancement Required'||status==='API Integration Required')return 'development';
    return '';
  }
  const badge = status => `<span class="wb-badge ${badgeClass(status)}">${esc(status)}</span>`;
  const selectOptions=(items,current)=>items.map(x=>`<option value="${esc(x)}" ${x===current?'selected':''}>${esc(x)}</option>`).join('');

  function createRecords(){
    const out=[];
    for(const p of data.products){
      const seen=new Set(); let n=0;
      for(const stage of data.stages){
        for(const group of (p.stageFiles[stage.id]||[])) for(const field of (data.fieldGroups[group]||[])){
          const sig=[field.group,field.id,field.name,field.control,field.label].join('|');
          if(seen.has(`${stage.id}|${sig}`))continue; seen.add(`${stage.id}|${sig}`); n++;
          const req=field.htmlRequired?'HTML required':field.labelRequired?'Label marked *':'No required marker';
          const evidence=data.evidenceCatalog?.[field.group]?.appxComponents||[];
          out.push({
            id:`FLD-${p.id}-${String(data.stages.findIndex(s=>s.id===stage.id)+1).padStart(2,'0')}-${String(n).padStart(3,'0')}`,
            type:'Field parity',product:p.key,productName:p.name,productId:p.id,stage:stage.title,stageId:stage.id,module:stage.title,
            appx:`${field.label||'[No linked label]'} · ${field.name||field.id||'Field key unavailable'} · ${field.control}; ${req}.`,
            appxLookup:field.options?.filter(v=>v.toLowerCase()!=='select').join(', ')|| (field.control==='select'?'Dynamic lookup; values require confirmation.':'No dropdown shown.'),
            appxValidation:field.htmlRequired?'HTML required attribute.':field.labelRequired?'Asterisk marker shown; server rule unknown.':'No required marker found; server rule unknown.',
            optim:'Target screen and field not indexed.',gap:'Map the OPTIM counterpart and compare type, required state, lookup values, editability, conditional behavior and server validation.',
            action:'Inspect the corresponding OPTIM screen/configuration, then classify as available, configuration, integration, enhancement or new development.',
            acceptance:'For each applicable product/scheme, the mapped target field matches the approved label, type, lookup, required/editable rules and positive/negative validation cases.',
            evidence:evidence,field:{...field},group:field.group,defaultStatus:'Source Information Missing',defaultPriority:'Unassigned',
            defaultDevelopmentStatus:'Not Started',defaultTestingStatus:'Not Started',dependency:'OPTIM field catalog and Suryoday product/scheme owner.'
          });
        }
      }
      for(const s of data.comparisonStages||[]){
        const login=s.id==='login-and-authentication';
        out.push({
          id:`STG-${p.id}-${String(s.sequence).padStart(2,'0')}`,type:'Stage comparison',product:p.key,productName:p.name,productId:p.id,stage:s.title,stageId:s.id,module:s.title,
          appx:s.appxBehavior,optim:s.optimBehavior,gap:s.gapRequirement,
          action:'Confirm stage applicability and order from the approved journey export; then inspect the corresponding OPTIM screen and workflow capabilities.',
          acceptance:`Approved APPX and OPTIM stage names, order, actor, entry/exit conditions, fields, actions and product applicability are signed off. ${s.gapRequirement}`,
          evidence:s.appxReferences||[],optimReferences:s.optimReferences||[],defaultStatus:login?'Partially Available':'Source Information Missing',
          defaultPriority:'Unassigned',defaultDevelopmentStatus:'Not Started',defaultTestingStatus:'Not Started',dependency:'Approved GetJourney/workflow export and OPTIM screen/configuration walkthrough.'
        });
      }
      for(const [index,policy] of (data.policyAreas||[]).entries()){
        out.push({
          id:`POL-${p.id}-${String(index+1).padStart(2,'0')}`,type:'Policy comparison',product:p.key,productName:p.name,productId:p.id,
          stage:'Policy and configuration',stageId:'policy',module:policy.name,appx:policy.detail,optim:'OPTIM policy/configuration has not been matched.',
          gap:`Confirm whether ${policy.name} is configured for ${p.name}, including the effective date, scheme, thresholds, calculation and exception handling.`,
          action:'Obtain the approved policy/configuration extract and compare it with OPTIM masters and server-side enforcement.',
          acceptance:`Suryoday signs the effective ${policy.name} value/rule for ${p.name}; an approved OPTIM configuration or development action and test evidence are linked.`,
          evidence:policy.name==='CLI coverage'?['SuryodayWeb/src/component/charges/LeadDocumentCharges.js']:[],defaultStatus:'Policy Confirmation Required',defaultPriority:'Unassigned',
          defaultDevelopmentStatus:'Not Started',defaultTestingStatus:'Not Started',dependency:'Suryoday Product/Credit policy owner and OPTIM configuration owner.'
        });
      }
      for(const m of data.moduleAssessments||[]){
        out.push({
          id:`MOD-${p.id}-${m.id.toUpperCase()}`,type:'Module parity',product:p.key,productName:p.name,productId:p.id,
          stage:m.name,stageId:m.id,module:m.name,appx:m.appxEvidence,optim:m.optimEvidence,
          gap:`Complete the ${m.name} capability assessment for ${p.name}. Do not infer support from the presence of a screen name.`,
          action:'Review the APPX behavior, approved policy, OPTIM screen/configuration and service capability; classify and record the exact implementation action.',
          acceptance:`Product/scheme applicability and each functional item are mapped; decision, evidence, positive/negative test cases and owner are recorded.`,
          evidence:m.appxReferences||[],defaultStatus:'Source Information Missing',defaultPriority:'Unassigned',
          defaultDevelopmentStatus:'Not Started',defaultTestingStatus:'Not Started',dependency:'APPX policy/configuration owner, OPTIM module owner and applicable product matrix.',
          openItems:m.openItems||[]
        });
      }
    }
    for(const [i,item] of [
      ['Product/scheme master','Obtain active and historical product, scheme, effective-date and canonical-ID mapping.','Suryoday product master export and OPTIM configuration review.'],
      ['API and service contracts','Obtain request/response schema, authentication, error, retry and idempotency rules for policy/master and stage APIs.','API specifications, service owners and approved test responses.'],
      ['Database/schema baseline','No database schema or migration model is present in the workspace. Confirm authoritative database tables, stored procedures and configuration owners.','Approved data dictionary/schema export; do not infer business rules from page labels.'],
      ['OPTIM capability catalog','Index the OPTIM stages, fields, configurable rules, workflow, roles and APIs against evidence.','OPTIM configuration/admin walkthrough and screen inventory.'],
      ['Cutover and readiness','Define case migration, open-case reconciliation, rollback, training and production acceptance.','Approved cutover plan and reconciled rehearsal.']
    ].entries()){
      out.push({id:`BASE-${String(i+1).padStart(2,'0')}`,type:'Readiness dependency',product:'all',productName:'All six products',productId:'ALL',stage:'Migration readiness',stageId:'readiness',module:item[0],appx:item[1],optim:'Not assessed.',gap:item[1],action:'Assign an owner and attach the authoritative evidence and completion criteria.',acceptance:'Owner, evidence, decision and testing/cutover sign-off are recorded.',evidence:[],defaultStatus:'Source Information Missing',defaultPriority:'Unassigned',defaultDevelopmentStatus:'Not Started',defaultTestingStatus:'Not Started',dependency:item[2]});
    }
    return out.map(r=>({...r,
      status:r.defaultStatus,
      priority:r.defaultPriority,
      developmentStatus:r.defaultDevelopmentStatus,
      testingStatus:r.defaultTestingStatus
    }));
  }

  function setView(next){
    view=next;
    for(const id of ['dashboard-view','comparison-view','tracker-view','evidence-view']) $(`#${id}`).hidden=true;
    const landing=$('#landing'), productView=$('#product-view');
    if(next==='products'){
      if(window.suryodayProductSelected){landing.hidden=true;productView.hidden=false}
      else {landing.hidden=false;productView.hidden=true}
    }else{landing.hidden=true;productView.hidden=true;}
    const panel=$(`#${next}-view`); if(panel)panel.hidden=false;
    document.querySelectorAll('.workspace-tab').forEach(b=>b.classList.toggle('active',b.dataset.view===next));
    if(!data)return;
    if(next==='dashboard')renderDashboard();
    if(next==='comparison')renderComparison();
    if(next==='tracker')renderTracker();
    if(next==='evidence')renderEvidence();
  }
  function statusTotals(list){const result=Object.fromEntries(statusOptions.map(s=>[s,0]));for(const row of list){const s=stateOf(row).status;if(s in result)result[s]++}return result}
  function assessmentPercent(list){if(!list.length)return 0;const open=new Set(['Source Information Missing','Policy Confirmation Required']);return Math.round(100*list.filter(r=>!open.has(stateOf(r).status)).length/list.length)}
  function progressBar(label,percent,count){return `<div class="wb-bar-row"><span>${esc(label)}</span><div class="wb-bar-track"><div class="wb-bar-fill" style="width:${percent}%"></div></div><b>${count}</b></div>`}
  function renderDashboard(){
    const box=$('#dashboard-view'); if(!box||!data)return;
    const totals=statusTotals(records); const mapped=records.length-totals['Source Information Missing']-totals['Policy Confirmation Required'];
    const productRows=data.products.map(p=>{const rows=records.filter(r=>r.product===p.key);const pct=assessmentPercent(rows);return {p,rows,pct}});
    const stages=records.filter(r=>r.type==='Stage comparison');
    const stageRows=(data.comparisonStages||[]).map(s=>{const rr=stages.filter(r=>r.stageId===s.id);const done=rr.filter(r=>!['Source Information Missing','Policy Confirmation Required'].includes(stateOf(r).status)).length;return {s,rr,done}}).sort((a,b)=>a.done-b.done).slice(0,8);
    box.innerHTML=`<div class="wb-heading"><div><div class="wb-kicker">Suryoday migration workspace</div><h1>Migration readiness dashboard</h1><p>Metrics below are calculated from the product field, stage, policy and module records. OPTIM capability remains unverified until mapped evidence is entered.</p></div><button class="wb-btn" data-view="tracker">Open gap tracker →</button></div>
      <div class="wb-stats">
        <article class="wb-stat"><span>Products</span><strong>${data.products.length}</strong><small>Product IDs in the catalog</small></article>
        <article class="wb-stat"><span>Tracked requirements</span><strong>${records.length.toLocaleString('en-IN')}</strong><small>Generated from field, stage, policy, module and readiness records</small></article>
        <article class="wb-stat"><span>Assessment mapped</span><strong>${mapped.toLocaleString('en-IN')}</strong><small>Moved beyond source/policy confirmation</small></article>
        <article class="wb-stat"><span>OPTIM available</span><strong>${totals['Available in OPTIM']}</strong><small>Requires evidence-backed status updates</small></article>
        <article class="wb-stat"><span>Migration readiness</span><strong>${assessmentPercent(records)}%</strong><small>Assessment coverage; not a release approval</small></article>
      </div>
      <div class="wb-grid-2">
        <section class="panel"><div class="panel-title-row"><div><h2>Requirement status</h2><p class="panel-subtitle">Current tracker state, including this browser’s saved edits.</p></div></div><div class="wb-bars">${statusOptions.map(s=>{const n=totals[s]||0;return progressBar(s,records.length?Math.round(100*n/records.length):0,n)}).join('')}</div></section>
        <section class="panel"><div class="panel-title-row"><div><h2>Product assessment coverage</h2><p class="panel-subtitle">Coverage is based on records assigned a reviewed status.</p></div></div><div class="wb-bars">${productRows.map(x=>progressBar(`${x.p.name} · ID ${x.p.id}`,x.pct,x.rows.length)).join('')}</div></section>
      </div>
      <div class="wb-grid-2">
        <section class="panel"><div class="panel-title-row"><div><h2>Stages with unverified mapping</h2><p class="panel-subtitle">Candidate-stage list; sequence and product applicability require an approved journey export.</p></div></div><div class="wb-bars">${stageRows.map(x=>progressBar(x.s.title,x.rr.length?Math.round(100*x.done/x.rr.length):0,`${x.done}/${x.rr.length}`)).join('')}</div><button class="wb-btn" data-view="comparison">Open all stage comparisons →</button></section>
        <section class="panel"><div class="panel-title-row"><div><h2>Open dependencies</h2><p class="panel-subtitle">Known blockers from the available project materials.</p></div></div><div class="wb-note warn">No application database schema or shared tracker service is present. Edits are saved in this browser and can be exported/imported as JSON.</div><div class="wb-note" style="margin-top:8px">The image archives contain 90 APPX and 287 OPTIM timestamped captures without a screen index. Only login/OTP is directly matched in the current evidence register.</div><div class="wb-coverage">Policy confirmations: <b>${totals['Policy Confirmation Required']}</b></div><div class="wb-coverage">Source information missing: <b>${totals['Source Information Missing']}</b></div><button class="wb-btn" data-view="evidence">Open evidence workspace →</button></section>
      </div>`;
    box.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  }

  const stageFieldMap={
    'login-and-authentication':['login'],'dashboard':['dashboard'],'lead-creation-sourcing':['lead','product-sourcing'],'customer-details':['mobile','member','applicant'],
    'applicant-and-co-applicant':['member','applicant'],'kyc-and-identity':['kyc','dedupe'],'personal-details':['personal','applicant'],'address-details':['address'],
    'employment-business':['employment'],'asset-details':['asset'],'loan-details':['loan'],'scheme-and-product':['product-sourcing'],'charges':['charges'],
    'document-upload':['documents'],'application-summary':['applicant','personal'],'bureau-credit':['scorecard'],'dedupe-risk':['dedupe'],
    'fvr-verification':['viability'],'application-form':['personal','address','employment','references'],'due-diligence':['documents'],
    'credit-queue':['scorecard'],'cam-preparation':['scorecard','viability'],'deviation':['loan','charges'],'credit-approval':['loan','charges'],
    'deal-structure':['loan','charges','sanction'],'qc-maker':['documents'],'qc-checker':['documents'],'disbursement-details':['disbursement'],
    'disbursement-update':['disbursement'],'disbursement-authorisation':['disbursement'],'auth-done':['disbursement']
  };
  function stageFieldsForProduct(productKey,comparisonId){
    const p=data.products.find(x=>x.key===productKey); if(!p)return [];
    const stageIds=stageFieldMap[comparisonId]||[];const out=[];const seen=new Set();
    for(const sid of stageIds){const s=data.stages.find(x=>x.id===sid);if(!s)continue;for(const group of p.stageFiles[sid]||[])for(const f of data.fieldGroups[group]||[]){const k=[f.id,f.name,f.control,f.label].join('|');if(!seen.has(k)){seen.add(k);out.push(f)}}}
    return out;
  }
  function renderComparison(){
    const box=$('#comparison-view');if(!box||!data)return;
    const stages=data.comparisonStages||[];const p=data.products.find(x=>x.key===activeProduct)||data.products[0];activeProduct=p?.key||'all';
    const current=stages.find(s=>s.id===selectedStage)||stages[0];if(!current)return;
    const req=records.find(r=>r.id===`STG-${p.id}-${String(current.sequence).padStart(2,'0')}`);const state=req?stateOf(req):{};
    const fieldRows=stageFieldsForProduct(p.key,current.id);
    const appxRefs=(current.appxReferences||[]).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>Field-group or legacy workflow evidence is not mapped for this stage.</li>';
    const optimRefs=(current.optimReferences||[]).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>No stage-matched OPTIM capture or configuration evidence is indexed.</li>';
    const fields=fieldRows.slice(0,100).map((f,i)=>`<tr><td>${String(i+1).padStart(3,'0')}</td><td>${esc(f.id||f.name||'Unindexed')}</td><td>${esc(f.label||'[No linked label]')}</td><td>${esc(f.control)}</td><td>${f.htmlRequired?'HTML required':f.labelRequired?'* marker':'No marker'}</td><td>${esc(f.options?.filter(x=>x.toLowerCase()!=='select').join(', ')|| (f.control==='select'?'Dynamic lookup':'—'))}</td><td>OPTIM match not recorded</td></tr>`).join('');
    box.innerHTML=`<div class="wb-heading"><div><div class="wb-kicker">33 stage candidates · product scoped</div><h1>APPX vs OPTIM stage comparison</h1><p>The sequence below is an analysis checklist, not a signed production route. React journey labels are dynamic; confirm final order, actors and conditional stages using the approved Suryoday workflow export.</p></div>${badge(state.status||current.status)}</div>
      <section class="panel"><div class="wb-controls"><label class="wb-mini">Product <select id="comparison-product">${data.products.map(x=>`<option value="${esc(x.key)}" ${x.key===p.key?'selected':''}>${esc(x.name)} (ID ${esc(x.id)})</option>`).join('')}</select></label><span class="wb-note">Each product has separate stage and policy requirements. Use the tracker to record status, owner remarks and test progress.</span></div><div class="wb-stage-grid">${stages.map(s=>`<button class="wb-stage-card ${s.id===current.id?'active':''}" data-stage-candidate="${esc(s.id)}"><span>${String(s.sequence).padStart(2,'0')} · ${badgeText(s.status)}</span><strong>${esc(s.title)}</strong><small>${esc(s.sequenceConfidence)}</small></button>`).join('')}</div></section>
      <div class="wb-split">
        <article class="wb-compare-card"><h3>APPX · ${esc(p.name)}</h3><p>${esc(current.appxBehavior)}</p><details><summary>Evidence references</summary><ul class="wb-source-list">${appxRefs}</ul></details></article>
        <article class="wb-compare-card"><h3>OPTIM · ${esc(p.name)}</h3><p>${esc(current.optimBehavior)}</p><details><summary>Target evidence references</summary><ul class="wb-source-list">${optimRefs}</ul></details></article>
      </div>
      <section class="panel" style="margin-top:12px"><div class="panel-title-row"><div><h2>${esc(current.title)} · field comparison</h2><p class="panel-subtitle">${fieldRows.length} APPX field(s) linked from the current catalog for this stage candidate. Target matches remain unverified unless explicitly recorded.</p></div><button class="wb-btn primary" data-open-requirement="${req?esc(req.id):''}">Track this stage</button></div>${fieldRows.length?`<div class="wb-table-wrap"><table class="wb-table"><thead><tr><th>#</th><th>APPX field key</th><th>APPX label</th><th>Type</th><th>Required marker</th><th>APPX lookup</th><th>OPTIM match</th></tr></thead><tbody>${fields}</tbody></table></div>`:'<div class="wb-note">No labelled field group is linked to this candidate stage. Review the APPX behavior and add the target mapping during a guided walkthrough.</div>'}</section>
      <div class="wb-split"><section class="wb-compare-card"><h3>Gap / next action</h3><p>${esc(current.gapRequirement)}</p><p><b>Acceptance:</b> ${esc(req?.acceptance||'Confirm product applicability, sequence, roles, fields, rules and positive/negative test paths.')}</p></section><section class="wb-compare-card"><h3>Current status</h3><p>${badge(state.status||current.status)} &nbsp; ${badge(state.priority||'Unassigned')}</p><p>OPTIM mapping is incomplete where the target capture/catalog is not indexed. Status changes are local to this browser and exportable.</p><button class="wb-btn" data-open-requirement="${req?esc(req.id):''}">Open requirement detail →</button></section></div>`;
    $('#comparison-product').addEventListener('change',e=>{activeProduct=e.target.value;renderComparison()});
    box.querySelectorAll('[data-stage-candidate]').forEach(b=>b.addEventListener('click',()=>{selectedStage=b.dataset.stageCandidate;renderComparison()}));
    box.querySelectorAll('[data-open-requirement]').forEach(b=>b.addEventListener('click',()=>{if(!b.dataset.openRequirement)return;activeId=b.dataset.openRequirement;filters.product=p.key;filters.stage='all';setView('tracker')}));
  }
  function badgeText(status){return status==='Partially Available'?'Partial':status==='Source Information Missing'?'Unmapped':status}

  function filteredRecords(){
    const term=filters.search.trim().toLowerCase();
    return records.map(stateOf).filter(r=>{
      if(filters.product!=='all'&&r.product!==filters.product&&!(filters.product==='all-products'&&r.product==='all'))return false;
      if(filters.stage!=='all'&&r.stageId!==filters.stage)return false;
      if(filters.module!=='all'&&r.module!==filters.module)return false;
      if(filters.priority!=='all'&&r.priority!==filters.priority)return false;
      if(filters.status!=='all'&&r.status!==filters.status)return false;
      if(term&&!`${r.id} ${r.productName} ${r.stage} ${r.module} ${r.appx} ${r.optim} ${r.gap} ${(r.field?.label)||''} ${(r.evidence||[]).join(' ')}`.toLowerCase().includes(term))return false;
      return true;
    });
  }
  function renderTracker(){
    const box=$('#tracker-view');if(!box||!data)return;
    const list=filteredRecords();const pageSize=25;const pageCount=Math.max(1,Math.ceil(list.length/pageSize));currentPage=Math.min(currentPage,pageCount);
    const rows=list.slice((currentPage-1)*pageSize,currentPage*pageSize);
    const productOptions=[['all','All products'],...data.products.map(p=>[p.key,`${p.name} · ID ${p.id}`]),['all-products','Shared readiness']];
    const stages=[...new Map(records.map(r=>[r.stageId,r.stage])).entries()];const modules=[...new Set(records.map(r=>r.module))].sort();
    const body=rows.map(r=>`<tr><td><span class="wb-id">${esc(r.id)}</span></td><td>${esc(r.productName)}${r.productId!=='ALL'?`<div class="wb-mini">Product ID ${esc(r.productId)}</div>`:''}</td><td>${esc(r.stage)}</td><td><button data-requirement="${esc(r.id)}">${esc(r.module)}</button><div class="wb-mini">${esc(r.type)}</div></td><td>${badge(r.status)}</td><td>${badge(r.priority)}</td><td>${badge(r.developmentStatus)}</td><td>${badge(r.testingStatus)}</td></tr>`).join('');
    box.innerHTML=`<div class="wb-heading"><div><div class="wb-kicker">${records.length.toLocaleString('en-IN')} generated requirements</div><h1>APPX vs OPTIM gap tracker</h1><p>Filter by product, stage, module, priority and assessment status. Search requirement ID, field, policy or gap. Defaults indicate missing evidence; they do not assert an OPTIM defect.</p></div><div><button class="wb-btn" id="export-tracker">Export JSON</button> <label class="wb-btn">Import JSON<input id="import-tracker" type="file" accept=".json,application/json" hidden></label></div></div>
      <div class="wb-note warn">Status edits and remarks save to this browser only. The workspace has no shared database/API; export/import a JSON snapshot for team handoff until a central store is connected.</div>
      <div class="wb-controls"><input id="tracker-search" type="search" placeholder="Search requirement, field, policy or ID" value="${esc(filters.search)}"><select id="filter-product">${productOptions.map(([v,l])=>`<option value="${esc(v)}" ${filters.product===v?'selected':''}>${esc(l)}</option>`).join('')}</select><select id="filter-stage"><option value="all">All stages</option>${stages.map(([v,l])=>`<option value="${esc(v)}" ${filters.stage===v?'selected':''}>${esc(l)}</option>`).join('')}</select><select id="filter-module"><option value="all">All modules</option>${modules.map(v=>`<option value="${esc(v)}" ${filters.module===v?'selected':''}>${esc(v)}</option>`).join('')}</select><select id="filter-priority"><option value="all">All priorities</option>${priorityOptions.map(v=>`<option value="${esc(v)}" ${filters.priority===v?'selected':''}>${esc(v)}</option>`).join('')}</select><select id="filter-status"><option value="all">All statuses</option>${statusOptions.map(v=>`<option value="${esc(v)}" ${filters.status===v?'selected':''}>${esc(v)}</option>`).join('')}</select><button class="wb-btn" id="reset-filters">Reset</button></div>
      <div class="wb-coverage">${list.length.toLocaleString('en-IN')} matches <span>·</span> ${pageCount} page(s) <span>·</span> ${Object.keys(overrideMap).length} browser-local edits</div>
      <div class="tracker-layout"><div><div class="wb-table-wrap"><table class="wb-table"><thead><tr><th>Requirement ID</th><th>Product</th><th>Stage</th><th>Module / type</th><th>Status</th><th>Priority</th><th>Development</th><th>Testing</th></tr></thead><tbody>${body||'<tr><td colspan="8">No requirements match these filters.</td></tr>'}</tbody></table></div><div class="wb-pager"><button class="wb-btn" data-page="${Math.max(1,currentPage-1)}" ${currentPage<=1?'disabled':''}>← Previous</button><span>Page ${currentPage} / ${pageCount}</span><button class="wb-btn" data-page="${Math.min(pageCount,currentPage+1)}" ${currentPage>=pageCount?'disabled':''}>Next →</button></div></div><aside id="requirement-detail">${activeId?detailMarkup(activeId):'<div class="wb-detail"><h3>Select a requirement</h3><p class="wb-mini">Open a row to review evidence, APPX behavior, OPTIM mapping, next action, acceptance criteria and local status controls.</p></div>'}</aside></div>`;
    attachTrackerEvents();
  }
  function detailMarkup(id){
    const base=records.find(r=>r.id===id);if(!base)return '<div class="wb-detail"><h3>Requirement not found</h3></div>';
    const r=stateOf(base);const refs=[...(r.evidence||[]),...(r.optimReferences||[])];
    const field=r.field?`<div class="wb-split"><div class="wb-note"><b>APPX field</b><br>${esc(r.field.label||r.field.name||r.field.id)} · ${esc(r.field.control)}<br>Required: ${r.field.htmlRequired?'HTML required':r.field.labelRequired?'label * marker':'no marker'}</div><div class="wb-note"><b>OPTIM field</b><br>${esc(r.optim)}</div></div><p><b>APPX lookup:</b> ${esc(r.appxLookup||'Not applicable')}</p><p><b>APPX validation:</b> ${esc(r.appxValidation||'See field catalog; server validation not verified.')}</p>`:'';
    const openItems=r.openItems?.length?`<h3>Items to confirm</h3><ul>${r.openItems.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:'';
    return `<div class="wb-detail"><h3><span class="wb-id">${esc(r.id)}</span> · ${esc(r.module)}</h3><div class="wb-mini">${esc(r.productName)} / ${esc(r.stage)} / ${esc(r.type)}</div><div class="wb-detail-grid" style="margin-top:10px">
      <label>Assessment status<select data-edit="status" data-id="${esc(r.id)}">${selectOptions(statusOptions,r.status)}</select></label>
      <label>Priority<select data-edit="priority" data-id="${esc(r.id)}">${selectOptions(priorityOptions,r.priority)}</select></label>
      <label>Development status<select data-edit="developmentStatus" data-id="${esc(r.id)}">${selectOptions(workflowOptions,r.developmentStatus)}</select></label>
      <label>Testing status<select data-edit="testingStatus" data-id="${esc(r.id)}">${selectOptions(workflowOptions,r.testingStatus)}</select></label>
      <label class="wide">Project remarks<textarea data-edit="remarks" data-id="${esc(r.id)}" placeholder="Owner, decision, next action">${esc(r.remarks||'')}</textarea></label>
    </div><hr><h3>APPX behavior</h3><p>${esc(r.appx)}</p>${field}<h3>OPTIM capability</h3><p>${esc(r.optim)}</p><h3>Gap</h3><p>${esc(r.gap)}</p><h3>Required action</h3><p>${esc(r.action)}</p>${openItems}<h3>Acceptance criteria</h3><p>${esc(r.acceptance)}</p><h3>Dependencies</h3><p>${esc(r.dependency||'Confirm with product and OPTIM owners.')}</p><details><summary>Evidence references</summary>${refs.length?`<ul class="wb-source-list">${refs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="wb-mini">No screen-level or file-level evidence is mapped yet. Use Evidence workspace to preview the relevant screen captures locally.</p>'}</details><p class="wb-storage">Edits in this tracker are saved in local browser storage.</p></div>`;
  }
  function attachTrackerEvents(){
    const bind=(sel,key,event='change')=>{const el=$(sel);if(el)el.addEventListener(event,()=>{filters[key]=el.value;currentPage=1;renderTracker();if(key==='search'){const inp=$('#tracker-search');inp?.focus();inp?.setSelectionRange(inp.value.length,inp.value.length)}})};
    bind('#tracker-search','search','input');bind('#filter-product','product');bind('#filter-stage','stage');bind('#filter-module','module');bind('#filter-priority','priority');bind('#filter-status','status');
    $('#reset-filters')?.addEventListener('click',()=>{filters={search:'',product:'all',stage:'all',module:'all',priority:'all',status:'all'};currentPage=1;renderTracker()});
    $('#export-tracker')?.addEventListener('click',exportTracker);
    $('#import-tracker')?.addEventListener('change',importTracker);
    document.querySelectorAll('[data-requirement]').forEach(b=>b.addEventListener('click',()=>{activeId=b.dataset.requirement;renderTracker()}));
    document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{currentPage=Number(b.dataset.page);renderTracker()}));
    document.querySelectorAll('[data-edit]').forEach(el=>el.addEventListener(el.tagName==='TEXTAREA'?'change':'change',()=>{const id=el.dataset.id;overrideMap[id]={...(overrideMap[id]||{}),[el.dataset.edit]:el.value};persist();renderTracker()}));
  }
  function exportTracker(){
    const payload={schemaVersion:1,exportedAt:new Date().toISOString(),storage:'Browser-local tracker snapshot',overrides:overrideMap,requirementCount:records.length};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='suryoday-migration-tracker.json';a.click();URL.revokeObjectURL(url);
  }
  function importTracker(event){
    const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const imported=JSON.parse(String(reader.result));if(!imported.overrides||typeof imported.overrides!=='object')throw new Error('Tracker JSON must contain an overrides object.');overrideMap={...overrideMap,...imported.overrides};persist();renderTracker()}catch(err){alert(`Import failed: ${err.message}`)}finally{event.target.value=''}};reader.readAsText(file);
  }

  function renderEvidence(){
    const box=$('#evidence-view');if(!box||!data)return;
    const e=data.screenEvidence||{};const appxInput=e.appx?.count||0,optimInput=e.optim?.count||0;
    box.innerHTML=`<div class="wb-heading"><div><div class="wb-kicker">Local preview only</div><h1>Evidence workspace</h1><p>Choose APPX and OPTIM captures from your computer to compare them side by side. The browser previews these files locally; this page does not upload them or save them into the public site.</p></div>${badge('Source Information Missing')}</div>
      <div class="wb-note warn">Archive inventory: ${appxInput} APPX captures and ${optimInput} OPTIM captures. The archives are timestamped and do not include a verified stage index. The listed files are not included in the public static site.</div>
      <div class="wb-evidence-grid"><section class="panel"><div class="wb-preview-title"><h2>APPX screen</h2><label class="wb-btn">Choose image<input id="appx-image" type="file" accept="image/png,image/jpeg,image/webp" hidden></label></div><div id="appx-preview" class="wb-preview-box">Choose an APPX screenshot to preview locally</div><p id="appx-file" class="wb-mini"></p></section>
      <section class="panel"><div class="wb-preview-title"><h2>OPTIM screen</h2><label class="wb-btn">Choose image<input id="optim-image" type="file" accept="image/png,image/jpeg,image/webp" hidden></label></div><div id="optim-preview" class="wb-preview-box">Choose an OPTIM screenshot to preview locally</div><p id="optim-file" class="wb-mini"></p></section></div>
      <section class="panel"><div class="panel-title-row"><div><h2>Indexed target evidence</h2><p class="panel-subtitle">Current known target references and limits.</p></div></div><ul><li>Login and six-digit OTP prompts have direct OPTIM screenshot references.</li><li>Other capture-to-stage and capture-to-field matches are not indexed.</li><li>Upload a reviewed screenshot index through a future data import after stage labels and sensitivity review.</li></ul></section>`;
    for(const [side,inputId] of [['appx','appx-image'],['optim','optim-image']]){
      $(`#${inputId}`).addEventListener('change',ev=>{
        const file=ev.target.files?.[0];if(!file)return;objectUrls.forEach(URL.revokeObjectURL);objectUrls=[];const url=URL.createObjectURL(file);objectUrls.push(url);
        $(`#${side}-preview`).innerHTML=`<img src="${url}" alt="Selected ${side.toUpperCase()} screen preview">`;$(`#${side}-file`).textContent=`${file.name} · ${Math.ceil(file.size/1024)} KB · local preview`;
      });
    }
  }

  function init(d){
    data=d;records=createRecords();overrideMap=loadOverrides();
    document.querySelectorAll('.workspace-tab').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
    document.addEventListener('click',ev=>{
      const productCard=ev.target.closest('[data-product]');
      if(productCard){window.suryodayProductSelected=true;setView('products');return}
      if(ev.target.closest('#back-to-products')){window.suryodayProductSelected=false;setView('products');return}
      const stageJump=ev.target.closest('.stage-button,.stage-jump');if(stageJump&&view==='products')setView('products');
    });
    document.addEventListener('migration-view-change',ev=>setView(ev.detail||'products'));
    setView('dashboard');
  }
  document.addEventListener('migration-data-ready',ev=>init(ev.detail));
  if(window.suryodayMigrationData)init(window.suryodayMigrationData);
})();
