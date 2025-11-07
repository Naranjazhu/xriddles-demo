// Default DATA (used if assets/data.json cannot be fetched locally)
const DEFAULT_DATA = {
    meta: { nMain: 480, nNovel: 120, nHuman: 200 },
    systems: ["Human","Qwen2.5‑72B","DeepSeek‑V3","GPT‑4.1","Llama‑3.1‑70B"],
    results: {
      overall: {
        setting: "No‑Context",
        bySystem: { "Human": 86.2, "Qwen2.5‑72B": 74.5, "DeepSeek‑V3": 71.8, "GPT‑4.1": 69.4, "Llama‑3.1‑70B": 62.7 }
      },
      byType: {
        setting: "In‑Context",
        bySystem: {
          "Human": { homophony: 89, polysemy: 84, deixis: 83, novel: 78 },
          "Qwen2.5‑72B": { homophony: 78, polysemy: 72, deixis: 70, novel: 61 },
          "DeepSeek‑V3": { homophony: 76, polysemy: 69, deixis: 67, novel: 58 },
          "GPT‑4.1": { homophony: 73, polysemy: 66, deixis: 64, novel: 55 },
          "Llama‑3.1‑70B": { homophony: 66, polysemy: 60, deixis: 59, novel: 50 }
        }
      },
      humanTable: [
        { cohort: "Human (overall)", noctx: 86.2, ictx: 87.7 },
        { cohort: "Human (high familiarity)", noctx: 92.1, ictx: 93.0 },
        { cohort: "Human (low familiarity)", noctx: 78.4, ictx: 79.3 }
      ],
      cases: [
        { head: "孔夫子搬家", gold: "净是输", model: "takes literal 'books'", note: "Distractor lure via literal reading." },
        { head: "姜太公钓鱼", gold: "愿者上钩", model: "chooses rhyme‑mate alt.", note: "Homophone collision under noise." }
      ]
    },
    downloads: {
      prompts: `# Prompt (zero‑shot MCQ)\nYou are given a xiehouyu head and four options (A‑D).\nPick the option that best represents the intended meaning.\nReturn only the letter (A/B/C/D).`,
      evalPy: `# Pseudo eval script\nimport csv\nimport sys\n# read gold & preds, compute accuracy`,
      csv: `system,setting,homophony,polysemy,deixis,novel,overall\nHuman,No-Context,89,84,83,78,86.2\nQwen2.5-72B,No-Context,78,72,70,61,74.5\nDeepSeek-V3,No-Context,76,69,67,58,71.8\nGPT-4.1,No-Context,73,66,64,55,69.4\nLlama-3.1-70B,No-Context,66,60,59,50,62.7`
    }
  }
  
  let DATA = DEFAULT_DATA
  
  // Utilities
  function $(sel, root=document){ return root.querySelector(sel) }
  function tableFromArray(el, rows, header){
    const thead = header ? `<thead><tr>${header.map(h=>`<th>${h}</th>`).join("")}</tr></thead>` : "";
    const tbody = `<tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>`
    el.innerHTML = thead + tbody
  }
  function downloadText(filename, content){
    const blob = new Blob([content], {type: "text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
  window.downloadText = downloadText // expose for onclick in HTML
  
  // Populate meta
  function populateMeta(){
    $("#nMain").textContent = DATA.meta.nMain
    $("#nNovel").textContent = DATA.meta.nNovel
    $("#nHuman").textContent = DATA.meta.nHuman
    $("#lastUpdated").textContent = new Date().toISOString().slice(0,10)
  }
  
  // Charts
  let chartOverall, chartByType
  function renderCharts(){
    const ctx1 = document.getElementById('chartOverall')
    const labels = Object.keys(DATA.results.overall.bySystem)
    const values = Object.values(DATA.results.overall.bySystem)
    chartOverall && chartOverall.destroy()
    chartOverall = new Chart(ctx1, { type:'bar', data:{ labels, datasets:[{ label: DATA.results.overall.setting, data: values }]}, options:{ responsive:true, plugins:{legend:{display:true}, tooltip:{enabled:true}}, scales:{ y:{ beginAtZero:true, max:100, ticks:{callback:v=>v+"%"}}}}})
  
    const ctx2 = document.getElementById('chartByType')
    const systems = Object.keys(DATA.results.byType.bySystem)
    const cat = ['homophony','polysemy','deixis','novel']
    const datasets = cat.map(c=>({ label:c, data: systems.map(s=>DATA.results.byType.bySystem[s][c]) }))
    chartByType && chartByType.destroy()
    chartByType = new Chart(ctx2, { type:'bar', data:{ labels:systems, datasets }, options:{ responsive:true, plugins:{legend:{position:'bottom'}}, scales:{ y:{ beginAtZero:true, max:100, ticks:{callback:v=>v+"%"}}}}})
  }
  
  // Tables
  function renderTables(){
    const humanHeader = ['Cohort','No‑Context','In‑Context']
    const humanRows = DATA.results.humanTable.map(r => [r.cohort, r.noctx+"%", r.ictx+"%"])
    tableFromArray($('#tableHuman'), humanRows, humanHeader)
    const caseHeader = ['Head (Chinese)','Gold intended','Model error','Note']
    const caseRows = DATA.results.cases.map(r => [r.head, r.gold, r.model, r.note])
    tableFromArray($('#tableCases'), caseRows, caseHeader)
  }
  
  // CSV upload
  function parseCSV(text){
    const lines = text.trim().split(/\r?\n/)
    const header = lines.shift().split(',').map(s=>s.trim())
    const req = ['system','setting','homophony','polysemy','deixis','novel','overall']
    for (const k of req){ if(!header.includes(k)) throw new Error('Missing column: '+k) }
    const idx = Object.fromEntries(header.map((h,i)=>[h,i]))
    const overallMap = {}; const byType = {}
    for (const line of lines){
      const cols = line.split(',')
      const sys = cols[idx.system]; const setting = cols[idx.setting]
      if (setting === 'No-Context') overallMap[sys] = parseFloat(cols[idx.overall])
      byType[sys] = {
        homophony: parseFloat(cols[idx.homophony]),
        polysemy:  parseFloat(cols[idx.polysemy]),
        deixis:    parseFloat(cols[idx.deixis]),
        novel:     parseFloat(cols[idx.novel])
      }
    }
    DATA.results.overall.bySystem = overallMap
    DATA.results.byType.bySystem = byType
  }
  function hookCSV(){
    const input = document.getElementById('csvFile')
    if (!input) return
    input.addEventListener('change', async (e)=>{
      const file = e.target.files[0]; if(!file) return
      const text = await file.text()
      try{ parseCSV(text); renderCharts() } catch(err){ alert('CSV parse error: '+err.message) }
    })
  }
  
  // Figure & table auto‑loader
  const FIG_BASES = [ 'Figure 1','Figure 2','Figure 3','Table 1','Table 2','Table 3','Table 4' ]
  const DIRS = ['', 'assets/', 'assets/img/', 'assets/images/']
  const EXTS = ['png','jpg','jpeg','webp','svg']
  function urlJoin(a,b){ return a.endsWith('/')||!a? a+b : a+'/'+b }
  function tryLoadImage(base, container){
    let tried = []
    function attempt(iDir, iExt){
      if (iDir>=DIRS.length) { container.innerHTML += `<div class="card"><p class="muted small">${base}: image not found (tried ${tried.join(', ')})</p></div>`; return }
      if (iExt>=EXTS.length) return attempt(iDir+1, 0)
      const name1 = `${base}.${EXTS[iExt]}` // with space
      const name2 = `${base.replace(/\s+/g,'')}.${EXTS[iExt]}` // without space
      const candidates = [name1, name2]
      const tryOne = (idx)=>{
        if (idx>=candidates.length) return attempt(iDir, iExt+1)
        const rel = urlJoin(DIRS[iDir], encodeURIComponent(candidates[idx]).replace(/%2520/g,'%20'))
        const img = new Image(); img.loading='lazy'; img.alt = base
        img.onerror = ()=>{ tried.push(rel); tryOne(idx+1) }
        img.onload = ()=>{
          const fig = document.createElement('figure'); fig.className='card'
          const caption = document.createElement('figcaption'); caption.className='muted small'; caption.textContent = base
          fig.appendChild(img); fig.appendChild(caption); container.appendChild(fig)
        }
        img.src = rel
      }
      tryOne(0)
    }
    attempt(0,0)
  }
  function renderFigures(){
    const grid = document.getElementById('figGrid'); if(!grid) return
    FIG_BASES.forEach(b=>tryLoadImage(b, grid))
    const pdf = ['XRiddles.pdf','assets/XRiddles.pdf'].find(p=>true)
    const link = document.getElementById('pdfLink'); if(link) link.href = pdf
  }
  
  // Load data.json if possible
  async function loadData(){
    try{
      const res = await fetch('assets/data.json')
      if (!res.ok) throw new Error('HTTP '+res.status)
      const json = await res.json(); DATA = json
    }catch(err){
      console.warn('Falling back to DEFAULT_DATA (fetch failed):', err.message)
    }
  }
  
  // Boot
  document.addEventListener('DOMContentLoaded', async ()=>{
    await loadData();
    populateMeta(); renderCharts(); renderTables(); hookCSV(); renderFigures();
  })