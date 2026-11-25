(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusOptions=['OPTIM Mapping Unverified','Available in OPTIM','Configuration Required','Partially Available','Enhancement Required','New Development Required','API Integration Required','Policy Confirmation Required','Source Information Missing'];
  const workflowOptions=['Not Started','In Progress','Blocked','Done'];
  const priorityOptions=['Unassigned','P0','P1','P2','P3'];
  const preferredSourcePage={underwriting:'CamReport.aspx','credit-deviation':'AutoDeviation.aspx','business-deviation':'CamReport.aspx','deal-structure':'Sanction.aspx',sanction:'Sanction.aspx',repayment:'ENach.aspx',enach:'ENach.aspx',disbursement:'DisbursementsUpdate.aspx','qc-maker':'BodyQC.aspx','qc-checker':'AuditorApprovalList.aspx','document-audit':'AuditorApprovalList.aspx','auth-approval':'AuthPending.aspx','approval-matrix':'AdminWebMaster.aspx',rcu:'CamReport.aspx','fi-verification':'FIAllocation.aspx','bureau-scorecard':'BureauPolicy.aspx','scheme-configuration':'CreateScheme.aspx','application-intake':'LeadDetail.aspx','workflow-queues':'AdminWebMaster.aspx','document-operations':'UploadDocument.aspx','other-screens':'AdminWebMaster.aspx','eligibility-deviation':'CreateScheme.aspx'};
  const storeKey='suryoday-migration-tracker-v1';
  let data=null, view='dashboard', records=[], overrideMap={}, activeId='', currentPage=1, selectedStage='login-and-authentication', activeProduct='all', objectUrls=[];
  let sourceCatalog=null, sourceCatalogPromise=null, sourceModule='underwriting', sourceProduct='new-car', sourceScreenId='', sourceSearch='', sourcePage=1;
  let screenStageId='login-and-authentication',screenModule='other-screens',screenPageId='',screenUrls={appx:'',optim:''};
  const screenMapKey='suryoday-screen-walkthrough-v1';
  let captureArchives={appx:null,optim:null},captureObjectUrls={appx:'',optim:''},captureRenderToken={appx:0,optim:0};
  const captureMapKey='suryoday-screen-capture-map-v1';
  const stageModuleMap={'login-and-authentication':'other-screens','dashboard':'workflow-queues','lead-creation-sourcing':'application-intake','customer-details':'application-intake','applicant-and-co-applicant':'application-intake','kyc-and-identity':'application-intake','personal-details':'application-intake','address-details':'application-intake','employment-business':'application-intake','asset-details':'application-intake','loan-details':'application-intake','scheme-and-product':'scheme-configuration','charges':'repayment','document-upload':'document-operations','application-summary':'application-intake','bureau-credit':'bureau-scorecard','dedupe-risk':'bureau-scorecard','fvr-verification':'fi-verification','application-form':'application-intake','due-diligence':'document-audit','credit-queue':'workflow-queues','cam-preparation':'underwriting','deviation':'credit-deviation','credit-approval':'underwriting','deal-structure':'deal-structure','asm-approval':'auth-approval','business-approval':'business-deviation','qc-maker':'qc-maker','qc-checker':'qc-checker','disbursement-details':'disbursement','disbursement-update':'disbursement','disbursement-authorisation':'auth-approval','auth-done':'auth-approval'};
  const stageScreenMap={'login-and-authentication':'login','dashboard':'dashboardhome','lead-creation-sourcing':'leaddetail','scheme-and-product':'createscheme','document-upload':'uploaddocument','bureau-credit':'bureaupolicy','deviation':'autodeviation','cam-preparation':'camreport','business-approval':'camreport','qc-maker':'bodyqc','qc-checker':'auditorapprovallist','disbursement-details':'disbursementsupdate','disbursement-update':'disbursementsupdate','disbursement-authorisation':'authpending','auth-done':'authapprovedlist'};
  let filters={search:'',product:'all',stage:'all',module:'all',priority:'all',status:'all'};

  function loadOverrides(){try{return JSON.parse(localStorage.getItem(storeKey)||'{}')}catch{return {}}}
  function persist(){try{localStorage.setItem(storeKey,JSON.stringify(overrideMap))}catch{}}
  function stateOf(r){return {...r,...(overrideMap[r.id]||{})}}
  function slug(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  function badgeClass(status){
    if(status==='Available in OPTIM'||status==='Done')return 'available';
    if(status==='Partially Available'||status==='In Progress')return 'partial';
    if(status==='Policy Confirmation Required'||status==='Configuration Required'||status==='Unassigned')return 'confirm';
    if(status==='Source Information Missing'||status==='OPTIM Mapping Unverified'||status==='Blocked')return 'missing';
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
            evidence:evidence,field:{...field},group:field.group,defaultStatus:'OPTIM Mapping Unverified',defaultPriority:'Unassigned',
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
          evidence:s.appxReferences||[],optimReferences:s.optimReferences||[],defaultStatus:login?'Partially Available':'OPTIM Mapping Unverified',
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
          evidence:m.appxReferences||[],defaultStatus:m.id==='operational-deviation'?'Source Information Missing':'OPTIM Mapping Unverified',defaultPriority:'Unassigned',
          defaultDevelopmentStatus:'Not Started',defaultTestingStatus:'Not Started',dependency:'APPX policy/configuration owner, OPTIM module owner and applicable product matrix.',
          openItems:m.openItems||[],sourceFindings:m.sourceFindings||[],ruleStatus:m.ruleStatus||'',optimAssessment:m.optimAssessment||m.optimEvidence||''
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
    for(const id of ['dashboard-view','comparison-view','screens-view','inventory-view','tracker-view','evidence-view']) $(`#${id}`).hidden=true;
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
    if(next==='screens')renderScreenWalkthrough();
    if(next==='inventory')renderSourceInventory();
    if(next==='tracker')renderTracker();
    if(next==='evidence')renderEvidence();
  }
  function statusTotals(list){const result=Object.fromEntries(statusOptions.map(s=>[s,0]));for(const row of list){const s=stateOf(row).status;if(s in result)result[s]++}return result}
  function assessmentPercent(list){if(!list.length)return 0;const open=new Set(['Source Information Missing','Policy Confirmation Required','OPTIM Mapping Unverified']);return Math.round(100*list.filter(r=>!open.has(stateOf(r).status)).length/list.length)}
  function progressBar(label,percent,count){return `<div class="wb-bar-row"><span>${esc(label)}</span><div class="wb-bar-track"><div class="wb-bar-fill" style="width:${percent}%"></div></div><b>${count}</b></div>`}
  function renderDashboard(){
    const box=$('#dashboard-view'); if(!box||!data)return;
    const totals=statusTotals(records); const mapped=records.length-totals['Source Information Missing']-totals['Policy Confirmation Required']-totals['OPTIM Mapping Unverified'];
    const productRows=data.products.map(p=>{const rows=records.filter(r=>r.product===p.key);const pct=assessmentPercent(rows);return {p,rows,pct}});
    const stages=records.filter(r=>r.type==='Stage comparison');
    const stageRows=(data.comparisonStages||[]).map(s=>{const rr=stages.filter(r=>r.stageId===s.id);const done=rr.filter(r=>!['Source Information Missing','Policy Confirmation Required','OPTIM Mapping Unverified'].includes(stateOf(r).status)).length;return {s,rr,done}}).sort((a,b)=>a.done-b.done).slice(0,8);
    box.innerHTML=`<div class="wb-heading"><div><div class="wb-kicker">Suryoday migration workspace</div><h1>Migration readiness dashboard</h1><p>Metrics below are calculated from the product field, stage, policy and module records. OPTIM capability remains unverified until mapped evidence is entered.</p></div><div><button class="wb-btn" data-view="inventory">Open APPX screen &amp; field index →</button> <button class="wb-btn" data-view="tracker">Open gap tracker →</button></div></div>
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
      <div class="wb-split"><section class="wb-compare-card"><h3>Gap / next action</h3><p>${esc(current.gapRequirement)}</p><p><b>Acceptance:</b> ${esc(req?.acceptance||'Confirm product applicability, sequence, roles, fields, rules and positive/negative test paths.')}</p></section><section class="wb-compare-card"><h3>Current status</h3><p>${badge(state.status||current.status)} &nbsp; ${badge(state.priority||'Unassigned')}</p><p>OPTIM mapping is incomplete where the target capture/catalog is not indexed. Status changes are local to this browser and exportable.</p><button class="wb-btn" data-open-requirement="${req?esc(req.id):''}">Open requirement detail →</button></section></div>
      <section class="panel" style="margin-top:12px"><div class="panel-title-row"><div><h2>Module details · APPX fields and rules</h2><p class="panel-subtitle">Open a module to review its indexed APPX screens, field controls, lookup hints, validation evidence and OPTIM evidence status for ${esc(p.name)}.</p></div></div><div class="wb-module-grid">${(data.moduleAssessments||[]).map(m=>`<button class="wb-module-card" type="button" data-open-module="${esc(m.id)}"><strong>${esc(m.name)}</strong><span>${esc(m.ruleStatus||'Review APPX behavior and target evidence')}</span><small>${(m.appxScreenIds||[]).length} linked APPX screen(s) · ${m.openItems?.length||0} items to confirm</small></button>`).join('')}</div></section>`;
    $('#comparison-product').addEventListener('change',e=>{activeProduct=e.target.value;renderComparison()});
    box.querySelectorAll('[data-stage-candidate]').forEach(b=>b.addEventListener('click',()=>{selectedStage=b.dataset.stageCandidate;renderComparison()}));
    box.querySelectorAll('[data-open-module]').forEach(b=>b.addEventListener('click',()=>{sourceModule=b.dataset.openModule;sourceProduct=p.key;sourceScreenId='';sourceSearch='';sourcePage=1;setView('inventory')}));
    box.querySelectorAll('[data-open-requirement]').forEach(b=>b.addEventListener('click',()=>{if(!b.dataset.openRequirement)return;activeId=b.dataset.openRequirement;filters.product=p.key;filters.stage='all';setView('tracker')}));
  }
  function badgeText(status){return status==='Partially Available'?'Partial':status==='Source Information Missing'?'Unmapped':status==='OPTIM Mapping Unverified'?'Unverified':status}

  function loadSourceCatalog(){
    if(sourceCatalog)return Promise.resolve(sourceCatalog);
    if(!sourceCatalogPromise)sourceCatalogPromise=fetch('./data/appx-screen-catalog.json').then(r=>{if(!r.ok)throw new Error('APPX screen catalog could not be loaded.');return r.json()}).then(c=>(sourceCatalog=c));
    return sourceCatalogPromise;
  }
  function renderSourceInventory(){
    const box=$('#inventory-view');if(!box||!data)return;
    if(!sourceCatalog){box.innerHTML='<div class="wb-detail"><h3>Loading APPX screen and field index…</h3></div>';loadSourceCatalog().then(renderSourceInventory).catch(err=>{box.innerHTML=`<div class="wb-note warn">${esc(err.message)} Check that <code>data/appx-screen-catalog.json</code> is deployed.</div>`});return}
    const modules=data.moduleAssessments||[];
    const module=modules.find(m=>m.id===sourceModule)||modules[0];sourceModule=module?.id||'';
    const product=data.products.find(p=>p.key===sourceProduct)||data.products[0];sourceProduct=product?.key||'';
    const sourceIds=module?.appxScreenIds||[];
    const screens=sourceCatalog.screens.filter(s=>sourceIds.includes(s.id));
    if(!sourceScreenId||!screens.some(s=>s.id===sourceScreenId)){const preferred=preferredSourcePage[module.id]?.toLowerCase();sourceScreenId=(screens.find(s=>s.page.toLowerCase().endsWith(preferred||'__none__'))||screens[0])?.id||'';sourcePage=1}
    const screen=screens.find(s=>s.id===sourceScreenId);
    const query=sourceSearch.trim().toLowerCase();
    const sourceEditCount=Object.keys(overrideMap).filter(id=>id.startsWith(`SRC-${product.id}-`)).length;
    const matches=(screen?.fields||[]).filter(f=>!query||`${f.id} ${f.label} ${f.control} ${f.lookupEvidence} ${f.lookupOptions?.join(' ')} ${f.dataFields?.join(' ')} ${JSON.stringify(f.validatorEvidence)} ${f.clientRuleEvidence?.join(' ')} ${f.serverValidationEvidence?.join(' ')}`.toLowerCase().includes(query));
    const size=35,pageCount=Math.max(1,Math.ceil(matches.length/size));sourcePage=Math.min(sourcePage,pageCount);
    const rows=matches.slice((sourcePage-1)*size,sourcePage*size).map((f,i)=>{
      const recordIndex=screen.fields.indexOf(f);const fieldId=`SRC-${product.id}-${slug(screen.id)}-${recordIndex}-${slug(f.id)}`;const fieldStatus=overrideMap[fieldId]?.status||'OPTIM Mapping Unverified';
      const validators=(f.validatorEvidence||[]).map(v=>`${v.rule}${v.minimum||v.maximum?` (${v.minimum||'…'} to ${v.maximum||'…'})`:''}${v.message?`: ${v.message}`:''}`);
      const rules=[...validators,...(f.clientRuleEvidence||[]),...(f.serverValidationEvidence||[])];
      const lookup=(f.lookupOptions||[]).join(', ')||f.lookupEvidence||'Not listed';
      const attributes=Object.entries(f.fieldAttributes||{}).map(([k,v])=>`${k}: ${v}`).join('; ');
      const detail=`<details class="wb-field-detail"><summary>Field evidence</summary><div><b>Validation:</b> ${esc(rules.join('; ')||f.validationStatus||'No explicit field rule indexed.')}</div><div><b>Lookup:</b> ${esc(f.lookupEvidence||'Not specified.')}</div>${f.lookupOptions?.length?`<div><b>Static options:</b> ${esc(f.lookupOptions.join(', '))}</div>`:''}${f.lookupValues?.length?`<div><b>Stored option values:</b> ${esc(f.lookupValues.join(', '))}</div>`:''}${f.dataFields?.length?`<div><b>Bound database fields:</b> ${esc(f.dataFields.join(', '))}</div>`:''}${attributes?`<div><b>Input attributes:</b> ${esc(attributes)}</div>`:''}<div><b>Source control:</b> ${esc(f.id)} · ${esc(fieldId)}</div></details>`;
      return `<tr><td>${String((sourcePage-1)*size+i+1).padStart(3,'0')}</td><td><span class="wb-id">${esc(f.id)}</span></td><td>${esc(f.label)}</td><td>${esc(f.control)}</td><td>${f.required?badge('Required validator'):badge('No explicit required validator')}</td><td>${esc(lookup)}</td><td>${detail}</td><td><select class="wb-source-status" data-source-assessment="${esc(fieldId)}" aria-label="Field parity status">${selectOptions(statusOptions,fieldStatus)}</select></td></tr>`
    }).join('');
    const pEvidence=(sourceCatalog.review.productBranchEvidence||[]).find(x=>x.productId===product.id);
    const applicability=screen?(screen.productIds.includes(product.id)?`Explicit code branch for Product ID ${product.id}.`:(screen.productIds.length?`This screen has branches for Product IDs ${screen.productIds.join(', ')}. The selected product may still be handled by database data or another screen; confirm applicability.`:'No ProductId branch is visible on this page. Applicability is likely case/role/master driven and is not proven by this markup.')):'No linked APPX screens are indexed for this module.';
    const review=module?.sourceFindings||[];
    const optStatus=module?.optimAssessment||'OPTIM screen/field match has not been indexed for this module.';
    const moduleChoices=modules.map(m=>`<option value="${esc(m.id)}" ${m.id===module?.id?'selected':''}>${esc(m.name)}</option>`).join('');
    const productChoices=data.products.map(p=>`<option value="${esc(p.key)}" ${p.key===product.key?'selected':''}>${esc(p.name)} · Product ID ${esc(p.id)}</option>`).join('');
    const screenChoices=screens.map(s=>`<option value="${esc(s.id)}" ${s.id===screen?.id?'selected':''}>${esc(s.title)} · ${esc(s.page)}</option>`).join('');
    box.innerHTML=`<div class="wb-heading"><div><div class="wb-kicker">Latest APPX source inventory</div><h1>APPX screen and field index</h1><p>Screen controls, output columns, static lookup values, explicit validators and validation references indexed from the supplied SuryodayaBank application. Product context is shown separately when it is explicit in the page code.</p></div>${badge(`${sourceCatalog.review.webformsPageCount} screens`)}</div>
      <div class="wb-stats wb-stats-4"><article class="wb-stat"><span>APPX screens</span><strong>${sourceCatalog.review.webformsPageCount}</strong><small>Legacy WebForms pages indexed</small></article><article class="wb-stat"><span>Controls / output fields</span><strong>${Number(sourceCatalog.review.cataloguedControlCount).toLocaleString('en-IN')}</strong><small>Inputs, actions, hidden fields and grid columns</small></article><article class="wb-stat"><span>Explicit validators</span><strong>${sourceCatalog.review.explicitValidatorCount}</strong><small>Declared validator controls in markup</small></article><article class="wb-stat"><span>Database rule boundary</span><strong>Open</strong><small>Stored procedure definitions and live master rows were not supplied</small></article></div>
      <div class="wb-note warn"><b>Product ID check:</b> the six-product catalog uses IDs ${sourceCatalog.review.productIdsInCurrentProductCatalog.join(', ')}. The legacy source also contains Product ID ${sourceCatalog.review.legacyProductIdConflicts.join(' and ')} branches outside that list. Confirm their meaning with the active product master before mapping them.</div>
      <section class="panel"><div class="wb-controls"><label class="wb-mini">Product <select id="source-product">${productChoices}</select></label><label class="wb-mini">Module <select id="source-module">${moduleChoices}</select></label><label class="wb-mini">APPX screen <select id="source-screen" ${screens.length?'':'disabled'}>${screenChoices||'<option value="">No linked screen indexed</option>'}</select></label><input id="source-search" type="search" placeholder="Search field, type, lookup or validator" value="${esc(sourceSearch)}"></div>
      <div class="wb-split"><article class="wb-compare-card"><h3>APPX evidence · ${esc(product.name)} (ID ${esc(product.id)})</h3><p>${esc(module?.appxEvidence||'Review the selected APPX screen and field evidence.')}</p><p><b>Product branch:</b> ${esc(pEvidence?.evidence||'Product branch evidence not separately recorded.')}</p><p><b>Current page applicability:</b> ${esc(applicability)}</p>${review.length?`<details><summary>Observed process behavior and rule ownership</summary><ul>${review.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p>${esc(module.ruleStatus||'')}</p></details>`:''}</article><article class="wb-compare-card"><h3>OPTIM capability / gap status</h3><p>${esc(optStatus)}</p><p>Capture archive: 287 timestamped OPTIM images are present but not indexed screen-by-screen. Until the relevant OPTIM screen and field are matched, label the item <b>Unverified</b>, not a confirmed missing capability.</p><div>${badge('OPTIM Mapping Unverified')}</div></article></div>
      ${screen?`<div class="wb-source-screen"><div><h2>${esc(screen.title)}</h2><p>APPX screen: ${esc(screen.page)} · ${screen.fieldCount} indexed controls/columns · ${screen.validatorsCount} explicit validator(s)</p></div>${screen.lineage.startsWith('Mixed')||screen.testArtifact?`<div class="wb-note warn">${esc(screen.testArtifact?'Test/sample page; production status unverified.':screen.lineage)}${screen.testArtifact&&screen.lineage.startsWith('Mixed')?' '+esc(screen.lineage):''}</div>`:''}<p class="wb-mini">${esc(applicability)} ${screen.productIds.length?`Code also references Product ID branch(es): ${screen.productIds.join(', ')}.`:''}</p></div>`:`<div class="wb-note warn">No screen source is mapped to this module yet. It is not evidence that the functionality is absent in APPX or OPTIM.</div>`}
      <div class="wb-coverage">${matches.length.toLocaleString('en-IN')} matching field/control entries <span>·</span> page ${sourcePage} of ${pageCount} <span>·</span> ${sourceEditCount} field assessments saved in this browser</div>
      <div class="wb-table-wrap"><table class="wb-table wb-source-table"><thead><tr><th>#</th><th>Control ID</th><th>APPX label / field</th><th>UI type</th><th>Required</th><th>Lookup / output</th><th>Validation detail</th><th>Field parity status</th></tr></thead><tbody>${rows||'<tr><td colspan="8">No controls match this search for the selected screen.</td></tr>'}</tbody></table></div>
      <div class="wb-pager"><button class="wb-btn" id="source-prev" ${sourcePage<=1?'disabled':''}>← Previous fields</button><span>Page ${sourcePage} / ${pageCount}</span><button class="wb-btn" id="source-next" ${sourcePage>=pageCount?'disabled':''}>Next fields →</button></div>
      <div class="wb-note warn"><b>Rule boundary:</b> the APPX source loads scores, FOIR/obligations, deviations, authority, pricing, LTV, scheme, document and workflow data through database procedures or dynamic masters. This index reports visible UI rules and fields only; it does not invent missing database policy values. Field parity statuses save in this browser; export them from Gap tracker → Export JSON.</div>
      <button class="wb-btn" id="source-open-gap">Open this module’s product gap tracker →</button></section>`;
    $('#source-product').addEventListener('change',e=>{sourceProduct=e.target.value;renderSourceInventory()});
    $('#source-module').addEventListener('change',e=>{sourceModule=e.target.value;sourceScreenId='';sourcePage=1;renderSourceInventory()});
    $('#source-screen')?.addEventListener('change',e=>{sourceScreenId=e.target.value;sourcePage=1;renderSourceInventory()});
    $('#source-search').addEventListener('input',e=>{sourceSearch=e.target.value;sourcePage=1;renderSourceInventory();$('#source-search')?.focus();$('#source-search')?.setSelectionRange(sourceSearch.length,sourceSearch.length)});
    $('#source-prev')?.addEventListener('click',()=>{sourcePage=Math.max(1,sourcePage-1);renderSourceInventory()});
    $('#source-next')?.addEventListener('click',()=>{sourcePage=Math.min(pageCount,sourcePage+1);renderSourceInventory()});
    box.querySelectorAll('[data-source-assessment]').forEach(el=>el.addEventListener('change',()=>{const id=el.dataset.sourceAssessment;overrideMap[id]={...(overrideMap[id]||{}),status:el.value};persist();renderSourceInventory()}));
    $('#source-open-gap')?.addEventListener('click',()=>{filters={...filters,product:product.key,module:module?.name||'all',stage:'all',search:''};activeId=records.find(r=>r.type==='Module parity'&&r.product===product.key&&r.module===module?.name)?.id||'';setView('tracker')});
  }

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
    const sourceFindings=r.sourceFindings?.length?`<h3>Findings from APPX behavior</h3><ul>${r.sourceFindings.map(v=>`<li>${esc(v)}</li>`).join('')}</ul><div class="wb-note warn"><b>Rule source:</b> ${esc(r.ruleStatus||'Runtime and database rules may need confirmation.')}</div>`:'';
    const optimAssessment=r.optimAssessment?`<div class="wb-note warn"><b>OPTIM evidence status:</b> ${esc(r.optimAssessment)}</div>`:'';
    return `<div class="wb-detail"><h3><span class="wb-id">${esc(r.id)}</span> · ${esc(r.module)}</h3><div class="wb-mini">${esc(r.productName)} / ${esc(r.stage)} / ${esc(r.type)}</div><div class="wb-detail-grid" style="margin-top:10px">
      <label>Assessment status<select data-edit="status" data-id="${esc(r.id)}">${selectOptions(statusOptions,r.status)}</select></label>
      <label>Priority<select data-edit="priority" data-id="${esc(r.id)}">${selectOptions(priorityOptions,r.priority)}</select></label>
      <label>Development status<select data-edit="developmentStatus" data-id="${esc(r.id)}">${selectOptions(workflowOptions,r.developmentStatus)}</select></label>
      <label>Testing status<select data-edit="testingStatus" data-id="${esc(r.id)}">${selectOptions(workflowOptions,r.testingStatus)}</select></label>
      <label class="wide">Project remarks<textarea data-edit="remarks" data-id="${esc(r.id)}" placeholder="Owner, decision, next action">${esc(r.remarks||'')}</textarea></label>
      </div><hr><h3>APPX behavior</h3><p>${esc(r.appx)}</p>${field}${sourceFindings}<h3>OPTIM capability</h3><p>${esc(r.optim)}</p>${optimAssessment}<h3>Gap</h3><p>${esc(r.gap)}</p><h3>Required action</h3><p>${esc(r.action)}</p>${openItems}<h3>Acceptance criteria</h3><p>${esc(r.acceptance)}</p><h3>Dependencies</h3><p>${esc(r.dependency||'Confirm with product and OPTIM owners.')}</p><details><summary>Evidence references</summary>${refs.length?`<ul class="wb-source-list">${refs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="wb-mini">No screen-level or file-level evidence is mapped yet. Use Evidence workspace to preview the relevant screen captures locally.</p>'}</details><p class="wb-storage">Edits in this tracker are saved in local browser storage.</p></div>`;
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
    const payload={schemaVersion:1,exportedAt:new Date().toISOString(),storage:'Browser-local tracker snapshot',overrides:overrideMap,requirementCount:records.length,sourceFieldAssessmentCount:Object.keys(overrideMap).filter(id=>id.startsWith('SRC-')).length};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='suryoday-migration-tracker.json';a.click();URL.revokeObjectURL(url);
  }
  function importTracker(event){
    const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const imported=JSON.parse(String(reader.result));if(!imported.overrides||typeof imported.overrides!=='object')throw new Error('Tracker JSON must contain an overrides object.');overrideMap={...overrideMap,...imported.overrides};persist();renderTracker()}catch(err){alert(`Import failed: ${err.message}`)}finally{event.target.value=''}};reader.readAsText(file);
  }

  async function readScreenshotZip(file){
    const bytes=await file.arrayBuffer(),view=new DataView(bytes),decoder=new TextDecoder();let eocd=-1;
    for(let i=Math.max(0,bytes.byteLength-65557);i<=bytes.byteLength-22;i++)if(view.getUint32(i,true)===0x06054b50)eocd=i;
    if(eocd<0)throw new Error('Could not find the ZIP directory. Please choose the original .zip archive.');
    const total=view.getUint16(eocd+10,true),directory=view.getUint32(eocd+16,true),entries=[];let at=directory;
    for(let i=0;i<total&&at<bytes.byteLength;i++){
      if(view.getUint32(at,true)!==0x02014b50)break;
      const method=view.getUint16(at+10,true),compressedSize=view.getUint32(at+20,true),uncompressedSize=view.getUint32(at+24,true),nameLength=view.getUint16(at+28,true),extraLength=view.getUint16(at+30,true),commentLength=view.getUint16(at+32,true),localOffset=view.getUint32(at+42,true),name=decoder.decode(new Uint8Array(bytes,at+46,nameLength));
      at+=46+nameLength+extraLength+commentLength;
      if(!/\.(png|jpe?g|webp)$/i.test(name)||name.endsWith('/'))continue;
      if(method!==0&&method!==8)continue;
      const localName=view.getUint16(localOffset+26,true),localExtra=view.getUint16(localOffset+28,true),start=localOffset+30+localName+localExtra;
      entries.push({name,method,compressedSize,uncompressedSize,start});
    }
    return {bytes,entries:entries.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}))};
  }
  async function renderCapture(side,stageKey,captureMap){
    const archive=captureArchives[side],entries=archive?.entries||[],select=$(`#walk-${side}-capture`),preview=$(`#walk-${side}-preview`),label=$(`#walk-${side}-archive-label`);if(!select||!preview)return;
    if(label)label.textContent=entries.length?`${entries.length} images loaded in this browser`:'Choose the matching screenshot ZIP';
    select.innerHTML=entries.length?entries.map(x=>`<option value="${esc(x.name)}">${esc(x.name.split('/').pop())}</option>`).join(''):'<option value="">Load a ZIP archive first</option>';
    const saved=captureMap[`${stageKey}|${side}`]||'';const selected=entries.some(x=>x.name===saved)?saved:(entries[0]?.name||'');if(selected)select.value=selected;
    if(!selected){preview.textContent='Load the relevant ZIP archive, then select a capture';return}
    captureMap[`${stageKey}|${side}`]=selected;const entry=entries.find(x=>x.name===selected),token=++captureRenderToken[side];preview.textContent='Loading selected capture…';const compressed=archive.bytes.slice(entry.start,entry.start+entry.compressedSize);let imageBytes;
    if(entry.method===0)imageBytes=compressed;else if(typeof DecompressionStream!=='undefined')imageBytes=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();else{preview.textContent='This browser cannot open compressed ZIP files. Use a current version of Chrome or Edge.';return}
    if(entry.uncompressedSize&&imageBytes.byteLength!==entry.uncompressedSize)return;if(token!==captureRenderToken[side])return;
    const type=/\.jpe?g$/i.test(entry.name)?'image/jpeg':/\.webp$/i.test(entry.name)?'image/webp':'image/png';if(captureObjectUrls[side])URL.revokeObjectURL(captureObjectUrls[side]);captureObjectUrls[side]=URL.createObjectURL(new Blob([imageBytes],{type}));preview.innerHTML=`<img src="${captureObjectUrls[side]}" alt="${esc(side.toUpperCase())} capture ${esc(selected.split('/').pop())}">`;
  }
  function renderScreenWalkthrough(){
    const box=$('#screens-view');if(!box||!data)return;
    if(!sourceCatalog){box.innerHTML='<div class="wb-detail"><h3>Loading the screen and field index…</h3></div>';loadSourceCatalog().then(renderScreenWalkthrough).catch(err=>{box.innerHTML=`<div class="wb-note warn">${esc(err.message)} Check that the APPX screen catalog is deployed.</div>`});return}
    const stages=data.comparisonStages||[];const current=stages.find(s=>s.id===screenStageId)||stages[0];screenStageId=current?.id||'';
    const product=data.products.find(p=>p.key===sourceProduct)||data.products[0];sourceProduct=product?.key||'';
    const modules=data.moduleAssessments||[];const module=modules.find(m=>m.id===screenModule)||modules[0];screenModule=module?.id||'';
    const screens=sourceCatalog.screens.filter(s=>(module?.appxScreenIds||[]).includes(s.id));
    if(!screenPageId||!screens.some(s=>s.id===screenPageId))screenPageId=(screens.find(s=>s.id===stageScreenMap[screenStageId])||screens[0])?.id||'';
    const screen=screens.find(s=>s.id===screenPageId);const mappings=(()=>{try{return JSON.parse(localStorage.getItem(screenMapKey)||'{}')}catch{return {}}})();const captureMap=(()=>{try{return JSON.parse(localStorage.getItem(captureMapKey)||'{}')}catch{return {}}})();const captureStageKey=`${product.id}|${current.id}`;
    const moduleOptions=modules.map(m=>`<option value="${esc(m.id)}" ${m.id===module?.id?'selected':''}>${esc(m.name)}</option>`).join('');
    const productOptions=data.products.map(p=>`<option value="${esc(p.key)}" ${p.key===product?.key?'selected':''}>${esc(p.name)} · ID ${esc(p.id)}</option>`).join('');
    const screenOptions=screens.map(s=>`<option value="${esc(s.id)}" ${s.id===screen?.id?'selected':''}>${esc(s.title)} · ${esc(s.page)}</option>`).join('');
    const rows=(screen?.fields||[]).map((f,i)=>{const key=[product.id,current.id,module.id,screen.id,i].join('|');const saved=mappings[key]||{};const validation=[...(f.validatorEvidence||[]).map(v=>`${v.rule}${v.message?`: ${v.message}`:''}`),...(f.clientRuleEvidence||[]),...(f.serverValidationEvidence||[])].join('; ')||f.validationStatus||'No explicit field validator found; runtime/server rules unknown.';const lookup=(f.lookupOptions||[]).join(', ')||f.lookupEvidence||'Not listed';return `<tr><td>${String(i+1).padStart(3,'0')}</td><td>${esc(f.label||'[No linked label]')}<small class="wb-mini">${esc(f.id||'No control ID')}</small></td><td>${esc(f.control||'Not identified')}</td><td>${f.required?badge('Required validator'):badge('No explicit required validator')}<small class="wb-mini">${esc(validation)}</small></td><td>${esc(lookup)}</td><td><input class="screen-target-field" data-map-key="${esc(key)}" value="${esc(saved.target||'')}" placeholder="OPTIM field / N/A / pending" aria-label="OPTIM counterpart for ${esc(f.label||f.id)}"><select class="screen-target-status" data-map-key="${esc(key)}" aria-label="Parity status for ${esc(f.label||f.id)}">${selectOptions(statusOptions,saved.status||'OPTIM Mapping Unverified')}</select></td></tr>`}).join('');
    box.innerHTML=`<div class="wb-heading"><div><div class="wb-kicker">Side-by-side process review · six product contexts</div><h1>APPX / OPTIM screen walkthrough</h1><p>Choose a candidate stage, then inspect its APPX field lines and record the OPTIM counterpart line by line. Choose screenshots from your computer for visual review; images stay in this browser session and are not published or uploaded.</p></div>${badge('Evidence-based mapping')}</div>
      <div class="wb-note warn"><b>Capture status:</b> archived screenshots are not yet indexed to stages or products. This walkthrough shows the selected APPX source page and fields; use the image pickers to review corresponding screen captures. Stage sequence remains a candidate pending approved workflow confirmation.</div>
      <section class="panel"><div class="wb-controls"><label class="wb-mini">Product <select id="walk-product">${productOptions}</select></label><label class="wb-mini">Candidate stage <select id="walk-stage">${stages.map(s=>`<option value="${esc(s.id)}" ${s.id===current.id?'selected':''}>${String(s.sequence).padStart(2,'0')} · ${esc(s.title)}</option>`).join('')}</select></label><label class="wb-mini">APPX module <select id="walk-module">${moduleOptions}</select></label><label class="wb-mini">APPX source screen <select id="walk-screen">${screenOptions||'<option value="">No linked screen indexed</option>'}</select></label></div>
      <div class="wb-split"><article class="wb-compare-card"><div class="wb-preview-title"><h3>APPX screen capture</h3><label class="wb-btn">Load APPX ZIP<input id="walk-appx-zip" type="file" accept=".zip,application/zip" hidden></label></div><label class="wb-mini">Screenshot from ZIP <select id="walk-appx-capture"></select></label><p id="walk-appx-archive-label" class="wb-mini"></p><div id="walk-appx-preview" class="wb-preview-box">Load your APPX screenshot ZIP to browse captures</div><p class="wb-mini">${esc(screen?`${screen.title} · ${screen.page} · ${screen.fields.length} indexed lines`:'No linked APPX source screen for this module')}</p></article><article class="wb-compare-card"><div class="wb-preview-title"><h3>OPTIM screen capture</h3><label class="wb-btn">Load OPTIM ZIP<input id="walk-optim-zip" type="file" accept=".zip,application/zip" hidden></label></div><label class="wb-mini">Screenshot from ZIP <select id="walk-optim-capture"></select></label><p id="walk-optim-archive-label" class="wb-mini"></p><div id="walk-optim-preview" class="wb-preview-box">Load your OPTIM screenshot ZIP to browse captures</div><p class="wb-mini">Choose the corresponding screen for comparison.</p></article></div>
      <div class="wb-source-screen"><h2>${esc(current?.title||'Stage')}</h2><p><b>APPX:</b> ${esc(current?.appxBehavior||'')}<br><b>OPTIM:</b> ${esc(current?.optimBehavior||'')}</p><p class="wb-mini">APPX page: ${esc(screen?.page||'Not mapped')} · ${screen?.fields.length||0} indexed field/control lines · Product context: ${esc(product?.name||'')}</p></div>
      <div class="wb-coverage">${screen?.fields.length||0} APPX field/control lines · counterpart and status edits save in this browser</div><div class="wb-table-wrap"><table class="wb-table wb-source-table"><thead><tr><th>#</th><th>APPX label / control ID</th><th>UI type</th><th>Required / validation</th><th>Lookup / list</th><th>OPTIM field counterpart / parity</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Select an APPX module and source screen to see indexed field lines.</td></tr>'}</tbody></table></div>
      <div class="wb-pager"><button class="wb-btn" id="walk-prev" ${current.sequence<=1?'disabled':''}>← Previous stage</button><span>Stage ${current.sequence} / ${stages.length}</span><button class="wb-btn" id="walk-next" ${current.sequence>=stages.length?'disabled':''}>Next stage →</button></div>
      <button class="wb-btn" id="walk-open-index">Open full APPX screen &amp; field index →</button></section>`;
    $('#walk-product').addEventListener('change',e=>{sourceProduct=e.target.value;renderScreenWalkthrough()});
    $('#walk-stage').addEventListener('change',e=>{screenStageId=e.target.value;screenModule=stageModuleMap[screenStageId]||screenModule;screenPageId=stageScreenMap[screenStageId]||'';renderScreenWalkthrough()});
    $('#walk-module').addEventListener('change',e=>{screenModule=e.target.value;screenPageId='';renderScreenWalkthrough()});
    $('#walk-screen').addEventListener('change',e=>{screenPageId=e.target.value;renderScreenWalkthrough()});
    $('#walk-prev').addEventListener('click',()=>{screenStageId=stages[Math.max(0,current.sequence-2)].id;screenModule=stageModuleMap[screenStageId]||screenModule;screenPageId=stageScreenMap[screenStageId]||'';renderScreenWalkthrough()});
    $('#walk-next').addEventListener('click',()=>{screenStageId=stages[Math.min(stages.length-1,current.sequence)].id;screenModule=stageModuleMap[screenStageId]||screenModule;screenPageId=stageScreenMap[screenStageId]||'';renderScreenWalkthrough()});
    $('#walk-open-index').addEventListener('click',()=>{sourceProduct=product.key;sourceModule=module.id;sourceScreenId=screen?.id||'';setView('inventory')});
    box.querySelectorAll('.screen-target-field,.screen-target-status').forEach(input=>input.addEventListener('change',()=>{const all=(()=>{try{return JSON.parse(localStorage.getItem(screenMapKey)||'{}')}catch{return {}}})();const rec=all[input.dataset.mapKey]||{};if(input.classList.contains('screen-target-field'))rec.target=input.value;else rec.status=input.value;all[input.dataset.mapKey]=rec;try{localStorage.setItem(screenMapKey,JSON.stringify(all))}catch{}}));
    for(const side of ['appx','optim']){
      $(`#walk-${side}-zip`).addEventListener('change',async ev=>{const file=ev.target.files?.[0];if(!file)return;try{captureArchives[side]=await readScreenshotZip(file);if(!captureArchives[side].entries.length)throw new Error('No PNG, JPG or WebP screenshots were found in this ZIP.');renderScreenWalkthrough()}catch(err){alert(err.message)}});
      $(`#walk-${side}-capture`).addEventListener('change',e=>{captureMap[`${captureStageKey}|${side}`]=e.target.value;try{localStorage.setItem(captureMapKey,JSON.stringify(captureMap))}catch{}renderCapture(side,captureStageKey,captureMap)});
      renderCapture(side,captureStageKey,captureMap);
    }
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
      const viewButton=ev.target.closest('[data-view]:not(.workspace-tab)');
      if(viewButton){setView(viewButton.dataset.view);return}
      const productCard=ev.target.closest('[data-product]');
      if(productCard){window.suryodayProductSelected=true;setView('products');return}
      const sourceOpen=ev.target.closest('[data-open-source-inventory]');
      if(sourceOpen){sourceProduct=sourceOpen.dataset.openSourceInventory;sourceModule='underwriting';sourceScreenId='';sourceSearch='';sourcePage=1;setView('inventory');return}
      if(ev.target.closest('#back-to-products')){window.suryodayProductSelected=false;setView('products');return}
      const stageJump=ev.target.closest('.stage-button,.stage-jump');if(stageJump&&view==='products')setView('products');
    });
    document.addEventListener('migration-view-change',ev=>setView(ev.detail||'products'));
    setView('dashboard');
  }
  document.addEventListener('migration-data-ready',ev=>init(ev.detail));
  if(window.suryodayMigrationData)init(window.suryodayMigrationData);
})();
