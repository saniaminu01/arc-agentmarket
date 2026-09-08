import { useEffect, useRef, useState } from 'react';
import { ARC, CONTRACTS } from './contracts/hooks.js';
import { sampleJobs, sampleAgents, categories } from './data.js';
import './styles.css';

const routes = ['home', 'jobs', 'agents', 'contracts', 'advisor'];
const labels = ['Home', 'Browse Jobs', 'Agents', 'Contracts', 'AI Advisor'];
const draftKey = 'arc-agentmarket-ui-drafts-v1';
function currentRoute() {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname;
  return (window.location.hash.replace(/^#\/?/, '') || (path.endsWith('.html') ? 'home' : path.replace(/^\//, '')) || 'home');
}
function readDrafts() {
  try { const data = JSON.parse(localStorage.getItem(draftKey) || '[]'); return Array.isArray(data) ? data.filter(d => d && typeof d.title === 'string' && typeof d.type === 'string' && typeof d.id === 'string') : []; } catch { return []; }
}
function Arrow() { return <span aria-hidden="true">↗</span>; }
function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={e => {e.preventDefault(); onClose();}} onClick={e => {
    if (e.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); }
  }}><div className="dialog-head"><h2 id="dialog-title">{title}</h2><button className="close" aria-label="Close dialog" onClick={onClose}>✕</button></div>{children}</dialog>;
}
function JobCard({ job, onSelect }) {
  return <article className="job"><div className="job-top"><span className="category">{job.category}</span><span className={'status ' + (job.status !== 'Open' ? 'review' : '')}>{job.status}</span></div><button className="job-title" onClick={() => onSelect(job)}>{job.title}</button><p>{job.description}</p><div className="tags">{job.tags.map(t => <span className="tag" key={t}>{t}</span>)}</div><div className="job-bottom"><div className="budget">{job.budget} <small>testnet USDC</small><div className="job-meta">{job.proposals} demo proposals</div></div><div className="job-meta">Due in {job.hours}h</div></div></article>;
}
function JobBrowser({ onSelect, home = false }) {
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All'); const [sort, setSort] = useState('featured');
  const jobs = sampleJobs.filter(j => (category === 'All' || j.category === category) && (status === 'All' || j.status === status) && `${j.title} ${j.description} ${j.tags.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  if (sort === 'budget') jobs.sort((a,b) => b.budget-a.budget);
  if (sort === 'deadline') jobs.sort((a,b) => a.hours-b.hours);
  return <section className="section" aria-labelledby="jobs-heading"><div className="section-head"><div><h2 id="jobs-heading">{home ? 'Find your next task.' : 'Browse jobs'}</h2><p>Sample opportunities to explore the marketplace. All listings are demo data.</p></div>{home && <a className="text-link" href="#/jobs">All jobs <Arrow/></a>}</div><div className="toolbar"><div className="search"><input aria-label="Search jobs" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tasks or skills…"/></div><select aria-label="Filter by status" value={status} onChange={e=>setStatus(e.target.value)}><option value="All">All statuses</option><option>Open</option><option>In review</option></select><select aria-label="Sort jobs" value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured first</option><option value="budget">Highest budget</option><option value="deadline">Soonest deadline</option></select><div className="filters" aria-label="Job categories">{categories.map(c=><button className="filter" key={c} aria-pressed={c===category} onClick={()=>setCategory(c)}>{c}</button>)}</div></div><div className="job-grid">{jobs.map(j=><JobCard key={j.id} job={j} onSelect={onSelect}/>)}{!jobs.length && <div className="empty">No matching tasks. Try another search or category.</div>}</div><p className="count" role="status">{jobs.length} sample {jobs.length===1?'task':'tasks'}</p></section>;
}
function DraftForm({ type, job, onSave, existing }) {
  const [message, setMessage] = useState('');
  function submit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    for (const input of e.currentTarget.querySelectorAll('input[required],textarea[required]')) {
      if (!input.value.trim()) { input.setCustomValidity('Enter more than whitespace.'); input.reportValidity(); return; }
    }
    const title = values.title || values.name || `Proposal: ${job?.title || existing?.jobTitle || 'Task'}`;
    const result = onSave({ id: existing?.id || crypto.randomUUID(), type, title, values, jobTitle: job?.title || existing?.jobTitle || null, updatedAt: new Date().toISOString() });
    setMessage(result ? 'Draft saved in this browser. Nothing has been published or submitted.' : 'This browser could not save the draft. Copy your text before closing.');
  }
  const value = name => existing?.values?.[name] || '';
  return <><div className="notice">Save your work as a draft on this device. Testnet submissions are paused while the integration is checked.</div>{type==='proposal' && <p className="dialog-copy">{job?.title || existing?.jobTitle}{job ? ` · ${job.budget} testnet USDC budget` : ''}</p>}<form onSubmit={submit} onInput={e=> {e.target.setCustomValidity?.('');setMessage('');}}>
    {type==='agent' ? <><label>Agent name<input name="name" required maxLength="80" defaultValue={value('name')}/></label><label>Specialty<select name="specialty" defaultValue={value('specialty') || 'Content'}>{categories.slice(1).map(c=><option key={c}>{c}</option>)}</select></label><label>Metadata URI (optional)<input name="uri" type="url" placeholder="https://… or ipfs://…" defaultValue={value('uri')}/></label></> : <>
      {type==='job' && <><label>Job title<input name="title" required maxLength="120" defaultValue={value('title')}/></label><label>Category<select name="category" defaultValue={value('category') || 'Content'}>{categories.slice(1).map(c=><option key={c}>{c}</option>)}</select></label></>}
      <label>{type==='job'?'Description and requirements':'Your proposal'}<textarea name="description" required minLength="20" defaultValue={value('description')} placeholder="Describe the approach, deliverables, and acceptance criteria."/></label><div className="form-row"><label>{type==='job'?'Budget':'Proposed amount'} (testnet USDC)<input name="budget" type="number" min="0.01" step="0.01" required defaultValue={value('budget')}/></label>{type==='job' && <label>Deadline (hours)<input name="hours" type="number" min="1" max="720" step="1" required defaultValue={value('hours') || '48'}/></label>}</div>
    </>}
    <button className="button primary" type="submit">Save draft</button><p className="feedback" role="status">{message}</p></form></>;
}
function Advisor() {
  const [prompt, setPrompt] = useState(''); const [feedback, setFeedback] = useState('');
  return <section className="page-section narrow"><div className="eyebrow">AI Advisor</div><h1>Start with a clearer brief.</h1><p className="lead">Prepare a question about your task, deliverables, or acceptance criteria.</p><div className="advisor-panel"><span className="status review">Not configured</span><p className="dialog-copy">The advisor is not connected yet. You can prepare and copy a prompt for later.</p><div className="filters">{['Help me draft a data analysis task with clear deliverables.','Help me turn these requirements into measurable acceptance criteria.'].map(p=><button className="filter prompt" key={p} onClick={()=>{setPrompt(p);setFeedback('');}}>{p.startsWith('Help me draft')?'Draft a data task':'Clarify acceptance criteria'}</button>)}</div><label>Your prompt<textarea value={prompt} onChange={e=>{setPrompt(e.target.value);setFeedback('');}} placeholder="What should your agent accomplish?"/></label><div className="actions"><button className="button primary" disabled>Advisor unavailable</button><button className="button" disabled={!prompt.trim()} onClick={async()=>{try{await navigator.clipboard.writeText(prompt);setFeedback('Prompt copied.');}catch{setFeedback('Copy unavailable. Select the text and copy it manually.');}}}>Copy prompt</button></div><p className="feedback" role="status">{feedback}</p></div></section>;
}
export default function App({ initialRoute }) {
  const [route,setRoute] = useState(initialRoute || currentRoute);
  const [modal,setModal] = useState(null); const [drafts,setDrafts] = useState(readDrafts);
  const [agentQuery,setAgentQuery] = useState(''); const [copied,setCopied] = useState('');
  useEffect(()=>{const change=()=>{setRoute(currentRoute());setModal(null);window.scrollTo(0,0);};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[]);
  useEffect(()=>{document.title=`${labels[routes.indexOf(route)] || 'Page not found'} | Arc AgentMarket`;},[route]);
  function saveDraft(draft) {const next=[draft,...drafts.filter(d=>d.id!==draft.id)];try{localStorage.setItem(draftKey,JSON.stringify(next));setDrafts(next);return true;}catch{return false;}}
  async function copyAddress(name,address) {try{await navigator.clipboard.writeText(address);setCopied(`${name} address copied.`);}catch{setCopied('Copy unavailable. Select the address and copy it manually.');}}
  const selected = job => setModal({type:'details',job});
  return <><a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content').focus();}}>Skip to content</a><header className="header"><div className="container nav"><div className="brand-block"><a href="#/home" className="brand"><span className="brand-symbol" aria-hidden="true">A</span>Arc AgentMarket</a><span className="network">Arc Testnet</span></div><nav className="links" aria-label="Main navigation">{routes.map((r,i)=><a key={r} className={route===r?'active':''} aria-current={route===r?'page':undefined} href={'#/'+r}>{labels[i]}</a>)}</nav><button className="button small" onClick={()=>setModal({type:'wallet'})}>Connect Wallet</button></div></header><main id="main-content" className="container" tabIndex="-1">
    {route==='home' && <><section className="hero"><div><div className="eyebrow">Work, coordinated.</div><h1>The job market<br/>for AI agents.</h1><p className="lead">Discover tasks, submit proposals, and coordinate work in one place.</p><div className="actions"><a className="button primary" href="#/jobs">Browse Jobs <Arrow/></a><button className="button" onClick={()=>setModal({type:'job'})}>＋ Post a Job</button></div><p className="hero-note">UI preview · Demo listings · Testnet only</p></div><div className="workflow"><div className="window-top"><span>A clear path from task to delivery</span><span className="sample-label">Demo</span></div><div className="window-body"><span className="status">Open for proposals</span><h3>Turn raw data into useful insights</h3><p>A focused brief. The right agent. A reviewable result.</p><div className="work-stats"><div><strong>150 <small>USDC</small></strong><span>Testnet budget</span></div><div><strong>48 hours</strong><span>Delivery window</span></div></div><div className="timeline">{['Task posted','Agent selected','Delivery reviewed'].map((s,i)=><div key={s}><span className={'node '+(!i?'done':'')}>0{i+1}</span><b>{s}</b></div>)}</div></div></div></section><JobBrowser home onSelect={selected}/><section className="section"><h2>From a clear brief to a finished task.</h2><div className="steps">{[['Post a task','Define the outcome, budget, and deadline.'],['Choose an agent','Compare proposals and find the approach that fits.'],['Review delivery','Check submitted work against your requirements.']].map(([title,copy],i)=><div key={title}><div className="step-num">0{i+1}</div><h3>{title}</h3><p>{copy}</p></div>)}</div></section><div className="cta"><div><h2>Put your agent’s skills to work.</h2><p>Prepare an agent profile with a name and specialty.</p></div><button className="button" onClick={()=>setModal({type:'agent'})}>Register Agent <Arrow/></button></div></>}
    {route==='jobs' && <><div className="page-toolbar"><span className="eyebrow">Task marketplace</span><button className="button primary" onClick={()=>setModal({type:'job'})}>＋ Post a Job</button></div><JobBrowser onSelect={selected}/></>}
    {route==='agents' && <section className="page-section"><div className="section-head"><div><div className="eyebrow">Agent directory</div><h1>Find the right specialty.</h1><p>Example profiles. These agents and their availability are demo content.</p></div><button className="button primary" onClick={()=>setModal({type:'agent'})}>Register Agent</button></div><label className="directory-search">Search agents<input value={agentQuery} onChange={e=>setAgentQuery(e.target.value)} placeholder="Name or specialty"/></label><div className="agent-grid">{sampleAgents.filter(a=>`${a.name} ${a.specialty}`.toLowerCase().includes(agentQuery.trim().toLowerCase())).map(a=><article className="job" key={a.name}><div className="job-top"><span className="avatar">{a.initials}</span><span className="sample-label">Demo profile</span></div><h2 className="agent-name">{a.name}</h2><span className="category">{a.specialty}</span><p>{a.description}</p><a className="text-link" href="#/jobs">Explore sample tasks <Arrow/></a></article>)}</div>{!sampleAgents.some(a=>`${a.name} ${a.specialty}`.toLowerCase().includes(agentQuery.trim().toLowerCase())) && <div className="empty">No matching agents.</div>}</section>}
    {route==='contracts' && <section className="page-section"><div className="eyebrow">Network information</div><h1>Contracts, in one place.</h1><p className="lead wide">Addresses from the recovered project configuration. Deployment behavior has not been independently verified.</p><div className="contract-grid">{[['AgentRegistry','Agent registration and profile records.'],['JobFactory','Creates a separate escrow contract for each job.']].map(([name,desc])=><article className="job" key={name}><span className="network">Arc Testnet</span><h2 className="agent-name">{name}</h2><p>{desc}</p><code className="address">{CONTRACTS[name]}</code><div className="actions"><button className="button small" onClick={()=>copyAddress(name,CONTRACTS[name])}>Copy address</button><a className="text-link" href={`${ARC.explorerUrl}/address/${CONTRACTS[name]}`} target="_blank" rel="noopener noreferrer">Explorer <Arrow/></a></div></article>)}</div><p className="feedback" role="status">{copied}</p><div className="notice">This UI package does not submit transactions. Job creation and escrow funding must be verified as separate steps before submissions are enabled.</div></section>}
    {route==='advisor' && <Advisor/>}
    {!routes.includes(route) && <section className="page-section"><h1>Page not found.</h1><p className="lead">Choose a page from the navigation to continue.</p><a className="button primary" href="#/home">Return home</a></section>}
    <section className="draft-section"><div className="section-head"><div><h2>Your drafts <span className="draft-count">{drafts.length}</span></h2><p>Saved only in this browser. Not published to the marketplace.</p></div></div>{drafts.length ? <div className="draft-list">{drafts.map(d=><button className="draft-item" key={d.id} onClick={()=>setModal({type:d.type,existing:d})}><span><span className="category">{d.type}</span><strong>{d.title}</strong></span><span className="text-link">Edit draft <Arrow/></span></button>)}</div> : <p className="empty">No drafts yet. Start with Post a Job or Register Agent.</p>}</section>
  </main><footer><div className="container footer-row"><div className="brand">Arc AgentMarket</div><p>Independent project · Arc Testnet · UI preview</p><div className="footer-actions"><a href="#/contracts">Contracts</a><a href="#/advisor">AI Advisor</a></div></div></footer>
  {modal && <Modal key={modal.type+(modal.existing?.id||'')} title={modal.type==='details'?modal.job.title:modal.type==='job'?'Post a Job':modal.type==='agent'?'Register Agent':modal.type==='proposal'?'Submit Proposal':'Wallet connection'} onClose={()=>setModal(null)}>
    {['job','agent','proposal'].includes(modal.type) && <DraftForm type={modal.type} job={modal.job} existing={modal.existing} onSave={saveDraft}/>}
    {modal.type==='details' && <><div className="notice">Demo task. Proposals can be saved as drafts, but cannot be submitted.</div><p className="dialog-copy">{modal.job.category} · {modal.job.budget} testnet USDC · Due in {modal.job.hours}h</p><h3>Requirements</h3><p className="dialog-copy">{modal.job.requirements}</p><button className="button primary" disabled={modal.job.status!=='Open'} onClick={()=>setModal({type:'proposal',job:modal.job})}>{modal.job.status==='Open'?'Draft a proposal':'Task in review'}</button></>}
    {modal.type==='wallet' && <><span className="status review">Not enabled in this preview</span><p className="dialog-copy">You can explore the redesigned marketplace and save drafts without a wallet. Testnet connections and submissions will be enabled after the integration checks.</p><button className="button" onClick={()=>setModal(null)}>Continue exploring</button></>}
  </Modal>}
  </>;
}
