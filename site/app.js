(() => {
  const money = n => '₹' + new Intl.NumberFormat('en-IN').format(n);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let data, product, stageId='overview', searchTerm='', workspaceView='dashboard', selectedComparison='login-and-authentication', activeRequirementId='', trackerPage=1;
  const TRACKER_STORAGE_KEY='suryoday-migration-tracker-v1';
  const requirementStatuses=['Available in OPTIM','Configuration Required','Partially Available','Enhancement Required','New Development Required','API Integration Required','Policy Confirmation Required','Source Information Missing'];
  const workflowStatuses=['Not Started','In Progress','Blocked','Done'];
  const priorities=['Unassigned','P0','P1','P2','P3'];
  const stageById = id => data.stages.find(s => s.id === id);
  const stageIndex = id => String(data.stages.findIndex(s => s.id === id) + 1).padStart(2,'0');
  const allProductFields = p => {
    const seen=new Set(), out=[];
    for (const stage of data.stages) for (const file of (p.stageFiles[stage.id] || [])) {
      for (const field of (data.fieldGroups[file] || [])) {
        const key=[field.group,field.id,field.name,field.control,field.label].join('|');
        if(!seen.has(key)){seen.add(key);out.push({...field,stageId:stage.id,stageTitle:stage.title});}
      }
    }
    return out;
  };
  const currentStageFields = () => {
    const s=stageById(stageId); if(!s) return [];
    const seen=new Set(), out=[];
    for(const file of (product.stageFiles[s.id] || [])) for(const field of (data.fieldGroups[file] || [])){
      const key=[field.group,field.id,field.name,field.control,field.label].join('|');
      if(!seen.has(key)){seen.add(key);out.push(field);}
    }
    return out;
  };
  function stageButtonMarkup(s){
    const n=stageIndex(s.id), active=stageId===s.id;
    return `<button class="stage-button ${active?'active':''}" type="button" data-stage="${esc(s.id)}" aria-current="${active?'page':'false'}"><span class="stage-number">${n}</span><span>${esc(s.title)}</span></button>`;
  }
  function renderLanding(){
    product=null; document.dispatchEvent(new CustomEvent('migration-view-change',{detail:'products'}));
    document.querySelector('#landing').hidden=false;
    document.querySelector('#product-view').hidden=true;
    const grid=data.products.map((p,i)=>`<button class="product-card" type="button" data-product="${esc(p.key)}">
      <div class="product-card-top"><span class="product-icon">${String(i+1).padStart(2,'0')}</span><span class="product-id">APPX ID ${esc(p.id)}</span></div>
      <h2>${esc(p.name)}</h2><p>${esc(p.family)}</p>
      <div class="product-card-bottom"><span>Open product reference →</span><small>${(p.assetFiles.length? 'Asset + loan fields':'Product loan fields')}</small></div>
    </button>`).join('');
    document.querySelector('#landing').innerHTML=`
      <p class="eyebrow">Functional field reference · six products</p>
      <h1>Explore the Suryoday<br>migration by product</h1>
      <p class="landing-intro">Choose a product, then open a journey stage to inspect its APPX fields, types, lookup dependencies, validation evidence and OPTIM mapping status. Shared stages are shown in every product reference.</p>
      <div class="landing-meta"><span class="meta-pill">${data.products.length} product configurations</span><span class="meta-pill">${Object.values(data.fieldGroups).flat().length} indexed fields</span><span class="meta-pill">Login → Disbursement</span></div>
      <div class="product-grid">${grid}</div>
      <p class="landing-footnote">Confirm the active product inventory and effective policies with Suryoday before implementation sign-off.</p>`;
    document.querySelectorAll('[data-product]').forEach(b=>b.addEventListener('click',()=>openProduct(data.products.find(p=>p.key===b.dataset.product))));
  }
  function openProduct(p){ product=p; stageId='overview'; searchTerm=''; document.dispatchEvent(new CustomEvent('migration-view-change',{detail:'products'})); document.querySelector('#landing').hidden=true; document.querySelector('#product-view').hidden=false; renderProduct(); }
  function renderProduct(){
    document.querySelector('#product-sidebar-card').innerHTML=`<div class="side-product"><div><div class="side-product-id">APPX PRODUCT ID ${esc(product.id)}</div><h2>${esc(product.name)}</h2><p>${esc(product.family)}</p></div></div>`;
    document.querySelector('#stage-nav').innerHTML=`<button class="stage-button ${stageId==='overview'?'active':''}" data-stage="overview"><span class="stage-number">00</span><span>Product overview</span></button>`+data.stages.map(stageButtonMarkup).join('');
    document.querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>{stageId=b.dataset.stage;searchTerm='';renderProduct();}));
    document.querySelector('#breadcrumbs').innerHTML=`<span>Products</span> &nbsp;›&nbsp; <b>${esc(product.name)}</b>${stageId==='overview'?'':` &nbsp;›&nbsp; ${esc(stageById(stageId)?.title || '')}`}`;
    const search=document.querySelector('#global-search'); search.value=searchTerm;
    document.querySelector('#stage-content').innerHTML=stageId==='overview'?renderOverview():renderStage(stageById(stageId));
    attachContentHandlers();
  }
  function renderOverview(){
    const cli=`Displayed CLI coverage minimum: ${money(product.cliMin)}; maximum is the loan availed amount. Confirm current policy and service-side enforcement with Suryoday.`;
    const policyCards=data.policyAreas.map(x=>{
      const detail=x.name==='CLI coverage'?cli:x.detail;
      const cls=x.status.startsWith('UI rule')?'source':x.status.startsWith('Dynamic')?'dynamic':'';
      return `<article class="policy-card"><h3>${esc(x.name)}</h3><p>${esc(detail)}</p><span class="status-badge ${cls}">${esc(x.status)}</span></article>`;
    }).join('');
    const rows=[
      ['Product configuration',`APPX Product ID ${product.id}`],
      ['Asset details',product.assetFiles.length?'Separate asset details are included':'Asset and financing controls are included in loan details'],
      ['Loan details','Product-specific fields and calculations'],
      ['Disbursement details',product.disbursementFiles.length?'Product-specific fields are included':'Shared disbursement fields'],
      ['Portfolio scope','Confirm the active product inventory with Suryoday'],
    ].map(([a,b])=>`<div class="summary-row"><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('');
    const menu=data.workflowMenu.map(m=>`<div class="route-item"><span class="route-id">ID ${esc(m.id)}</span><div><strong>${esc(m.detail)}</strong><span>${esc(m.route)}</span></div></div>`).join('');
    return `<div class="stage-heading"><div><div class="stage-kicker">${esc(product.family)}</div><h1>${esc(product.name)}</h1><p>Product ID ${esc(product.id)} · select a stage in the left navigation to view its field catalog.</p></div><div class="stage-count"><b>${allProductFields(product).length}</b> indexed controls in this product view</div></div>
      <div class="overview-grid">
        <section class="panel"><div class="panel-title-row"><div><h2>Product configuration profile</h2><p class="panel-subtitle">Product and journey summary</p></div><span class="status-badge source">6 product configurations</span></div><dl class="summary-list">${rows}</dl></section>
        <section class="panel"><div class="panel-title-row"><div><h2>Journey stages</h2><p class="panel-subtitle">Stage availability and status may depend on the selected product.</p></div><span class="status-badge dynamic">API driven</span></div><div class="route-list">${menu}</div></section>
      </div>
      <section class="panel policy-confirm"><div class="panel-title-row"><div><h2>Policy and configuration for ${esc(product.name)}</h2><p class="panel-subtitle">Items requiring confirmation are clearly identified.</p></div><span class="status-badge">Policy sign-off required</span></div><div class="policy-grid">${policyCards}</div><div class="rule-callout"><strong>Product-specific policy check:</strong> ${esc(cli)} Confirm product/scheme applicability and equality boundaries with Suryoday.</div></section>
      <section class="panel"><div class="panel-title-row"><div><h2>Product stage index</h2><p class="panel-subtitle">Select a stage to view its fields and rules.</p></div></div><div class="route-list">${data.stages.map((s,i)=>{const stageFiles=product.stageFiles[s.id]||[];const hint=s.id==='asset'&&!product.assetFiles.length?'Asset and vehicle controls are included in this product’s loan form.':stageFiles.length?`${sourceFieldCount(product,s.id)} field controls`:'Confirm applicable fields with the product team.';return `<button class="route-item stage-jump" type="button" data-stage="${esc(s.id)}"><span class="route-id">${String(i+1).padStart(2,'0')}</span><div><strong>${esc(s.title)}</strong><span>${esc(hint)}</span></div></button>`;}).join('')}</div></section>
      <section class="panel"><div class="panel-title-row"><div><h2>Underwriting, deviations, sanction and operations</h2><p class="panel-subtitle">Open the latest APPX screen/field index for ${esc(product.name)} (Product ID ${esc(product.id)}), including underwriting, deal structure, business/credit deviation, NACH, QC, audit, FI/RCU, disbursement and authorization.</p></div><button class="wb-btn primary" type="button" data-open-source-inventory="${esc(product.key)}">Open module fields and rules →</button></div></section>
      <section class="panel"><div class="panel-title-row"><div><h2>Migration interpretation</h2><p class="panel-subtitle">APPX to OPTIM field and configuration mapping</p></div></div><p class="panel-subtitle">Each target mapping remains Confirmation Required until the OPTIM screen and configuration capability are verified with Suryoday.</p></section>`;
  }
  function sourceFieldCount(p,stage){const s=stageById(stage);return [...new Set((p.stageFiles[stage]||[]).flatMap(f=>(data.fieldGroups[f]||[]).map(x=>`${x.group}|${x.id}|${x.label}|${x.control}`)))].length;}
  function renderStage(stage){
    if(!stage)return '<div class="empty-state">Stage was not found.</div>';
    const fields=currentStageFields();
    const count=fields.length;
    const targetNote=`<div class="target-note"><strong>OPTIM target:</strong> exact OPTIM screen/field and whether configuration or development is required must be confirmed from the target screen/configuration catalog.</div>`;
    const routeNote=stage.id==='approvals'?`<section class="panel"><div class="panel-title-row"><div><h2>Journey menu routes</h2><p class="panel-subtitle">Menu labels and stage status may be set dynamically.</p></div></div>${workflowTable()}</section>`:'';
    const fieldsMarkup=count?renderFieldTable(fields):stage.id==='asset'&&!product.assetFiles.length?`<div class="empty-state"><strong>New product asset fields are part of the product loan form.</strong>Open Loan Details to see ${esc(product.name)} asset, vehicle and financing controls together.</div><button type="button" class="back-link stage-jump" data-stage="loan">Open loan detail fields →</button>`:`<div class="empty-state"><strong>No field controls are listed for this stage.</strong>${esc(stage.detail)}<br><br>Confirm any additional screen or service fields with Suryoday.</div>`;
    return `<div class="stage-heading"><div><div class="stage-kicker">${stageIndex(stage.id)} · ${esc(stage.kind==='product'?'Product-specific screen':'Shared portal screen')}</div><h1>${esc(stage.title)}</h1><p>${esc(stage.detail)}</p></div><div class="stage-count"><b>${count}</b> field controls</div></div>
      ${targetNote}
      <section class="panel"><div class="panel-title-row"><div><h2>APPX field catalog · ${esc(product.name)}</h2><p class="panel-subtitle">${count?`${count} fields listed for this stage.`:'No stage fields are listed.'}</p></div><span class="status-badge source">Field reference</span></div>
        <div class="field-toolbar"><span class="panel-subtitle">Expand a row for required status, lookup values, editability and validation notes.</span><div class="field-filters"><label><input id="show-confirm-only" type="checkbox"> Confirmation items only</label></div></div>
        ${fieldsMarkup}</section>${routeNote}`;
  }
  function renderFieldTable(fields){
    const filtered=filterFields(fields,searchTerm);
    if(!filtered.length)return '<div class="no-results">No fields match this search.</div>';
    const rows=filtered.map((f,i)=>{
      const req=f.htmlRequired||f.labelRequired;
      const reqText=f.htmlRequired?'HTML required':f.labelRequired?'Label marked *':'No required marker';
      const options=f.options.length?f.options.filter(x=>x.toLowerCase()!=='select').join(', '):'';
      const lookup=f.control==='select'?(options?`Options: ${options}`:'Dynamic lookup; allowed values require confirmation.'):(f.disabled?'Read-only in this stage.':'No dropdown lookup shown.');
      const custom=customValidation(f);
      const key=`fld-${f.stageId||stageId}-${i}`;
      return `<tbody class="field-body"><tr class="field-row" data-field-search="${esc([f.id,f.name,f.label,f.control,lookup,custom].join(' ').toLowerCase())}" data-confirm="${(!f.htmlRequired&&!f.labelRequired)||!options?'true':'false'}">
        <td class="index-cell">${String(i+1).padStart(3,'0')}</td><td><button class="field-expand" type="button" aria-expanded="false" aria-controls="${key}" data-expand="${key}"><span class="field-id">${esc(f.id||f.name||'Unindexed')}</span></button></td><td class="field-label">${esc(f.label||'[No linked label]')}</td><td class="field-type">${esc(f.control)}</td><td><span class="req-chip ${req?'':'none'}">${esc(reqText)}</span></td><td>${esc(lookup)}</td><td>${esc(custom)}</td>
      </tr><tr id="${key}" class="detail-row" hidden><td colspan="7"><div class="detail-grid">
        <div class="detail-item"><b>Field name</b><span>${esc(f.name||'Not available')}</span></div><div class="detail-item"><b>Control state</b><span>${f.disabled?'Read-only; confirm editability by role and stage.':'Editability may depend on role and stage.'}</span></div><div class="detail-item"><b>Required evidence</b><span>HTML required: ${f.htmlRequired?'Yes':'Not set'} · label star: ${f.labelRequired?'Yes':'No'}</span></div>
        <div class="detail-item"><b>Dropdown values</b><span>${esc(options|| (f.control==='select'?'Dynamic list; confirm master values.':'Not applicable'))}</span></div><div class="detail-item"><b>Validation</b><span>${esc(custom)}</span></div>
      </div></td></tr></tbody>`;
    }).join('');
    return `<div class="table-scroll"><table class="field-table"><thead><tr><th>#</th><th>APPX field id</th><th>APPX label</th><th>Type</th><th>Required</th><th>Lookup / options</th><th>Validation evidence</th></tr></thead>${rows}</table></div>`;
  }
  function customValidation(f){
    const id=f.id||''; const label=f.label||''; const notes=[];
    if(f.htmlRequired)notes.push('HTML required'); else if(f.labelRequired)notes.push('label required marker only'); else notes.push('no field-level required rule found');
    if(f.disabled)notes.push('disabled/read-only control');
    if(['distanceFromBranch','usedDistanceFromBranch','usedDistanceSourcingBranch'].includes(id))notes.push('digits only; range/unit requires confirmation');
    if(['newLoanTenure','loanTenure','usedLoanTenure','usedCliTenure','newCliTenure'].includes(id))notes.push('term list dynamic; invalid tenure message exists in product form');
    if(['cliCoverageAmount','newCliCoverageAmount','usedCliCoverageAmount'].includes(id))notes.push(`Displayed CLI minimum ${money(product.cliMin)} for this product; max loan availed; confirm effective policy`);
    if(/min\s*:|max\s*:/i.test(label))notes.push('bound is dynamic; confirm the effective value');
    return notes.join('; ')+'. Other server/business validation: Confirmation Required.';
  }
  function workflowTable(){
    return `<div class="table-scroll"><table class="workflow-table"><thead><tr><th>Menu ID</th><th>Journey route</th><th>Stage / note</th></tr></thead><tbody>${data.workflowMenu.map(m=>`<tr><td>${esc(m.id)}</td><td><span class="source-path">${esc(m.route)}</span></td><td>${esc(m.detail)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function filterFields(fields,term){
    if(!term)return fields;
    const q=term.toLowerCase();return fields.filter(f=>[f.id,f.name,f.label,f.control,...f.options].join(' ').toLowerCase().includes(q));
  }
  function renderSearch(){
    const q=searchTerm.trim().toLowerCase();
    if(!q){renderProduct();return;}
    const found=allProductFields(product).filter(f=>[f.id,f.name,f.label,f.control,...f.options].join(' ').toLowerCase().includes(q));
    const grouped=new Map();for(const f of found){if(!grouped.has(f.stageId))grouped.set(f.stageId,[]);grouped.get(f.stageId).push(f);}
    const groups=[...grouped.entries()].map(([sid,fields])=>`<section class="panel"><div class="panel-title-row"><div><h2>${esc(stageById(sid).title)}</h2><p class="panel-subtitle">${fields.length} match(es)</p></div><button class="back-link" data-stage="${esc(sid)}" type="button">Open stage →</button></div>${renderFieldTable(fields)}</section>`).join('');
    document.querySelector('#stage-content').innerHTML=`<div class="stage-heading"><div><div class="stage-kicker">PRODUCT FIELD SEARCH</div><h1>Search results for “${esc(searchTerm)}”</h1><p>Searching ${esc(product.name)} across all indexed stages.</p></div><div class="stage-count"><b>${found.length}</b> matches</div></div>${groups||'<div class="empty-state">No fields match this search in this product.</div>'}`;
    document.querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>{stageId=b.dataset.stage;searchTerm='';document.querySelector('#global-search').value='';renderProduct();}));
    attachFieldToggles();
  }
  function attachFieldToggles(){
    document.querySelectorAll('[data-expand]').forEach(b=>b.addEventListener('click',()=>{const row=document.getElementById(b.dataset.expand);const open=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!open));row.hidden=open;}));
  }
  function attachContentHandlers(){
    document.querySelectorAll('.stage-jump').forEach(b=>b.addEventListener('click',()=>{stageId=b.dataset.stage;searchTerm='';renderProduct();window.scrollTo({top:0,behavior:'smooth'});}));
    attachFieldToggles();
    const only=document.querySelector('#show-confirm-only');
    if(only)only.addEventListener('change',()=>document.querySelectorAll('.field-row').forEach(r=>{r.hidden=only.checked&&r.dataset.confirm!=='true';const detail=r.nextElementSibling;if(only.checked&&detail)detail.hidden=true;}));
  }
  document.querySelector('#back-to-products').addEventListener('click',renderLanding);
  document.querySelector('#global-search').addEventListener('input',e=>{searchTerm=e.target.value;if(stageId==='overview')stageId='login';renderSearch();});
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.querySelector('#global-search').focus();}});
  fetch('./data/migration-data.json').then(r=>{if(!r.ok)throw new Error('Migration data could not be loaded.');return r.json();}).then(d=>{
    data=d;window.suryodayMigrationData=d;document.querySelector('#notice').textContent=d.notice;renderLanding();document.dispatchEvent(new CustomEvent('migration-data-ready',{detail:d}));
  }).catch(err=>{document.querySelector('#notice').textContent=err.message+' Use a static web server or deploy the site to Render.';document.querySelector('#landing').innerHTML='<h1>Could not load migration data</h1><p>Serve this folder over HTTP instead of opening index.html directly.</p>';});
})();
