import { useEffect, useMemo, useRef, useState } from 'react'
import Spline from '@splinetool/react-spline'

const API_BASE = import.meta.env.VITE_BACKEND_URL || ''

function Field({ label, children }) {
  return (
    <label className="block text-sm text-zinc-300">
      <span className="mb-1 block font-medium text-zinc-200">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-300 select-none">
      <input type="checkbox" className="h-4 w-4 accent-violet-500" checked={checked} onChange={e=>onChange(e.target.checked)} />
      {label}
    </label>
  )
}

function HistoryItem({ item }){
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-zinc-200 truncate max-w-[60%]" title={item.url}>{item.url}</span>
        <span className="text-zinc-400">{item.format}</span>
      </div>
      {item.output_hint && (
        <div className="mt-2 flex items-center gap-2 text-zinc-400">
          <a className="text-violet-400 hover:underline" href={`${API_BASE}/api/file?path=${encodeURIComponent(item.output_hint)}`} target="_blank" rel="noreferrer">Download</a>
          <button className="text-emerald-400 hover:underline" onClick={()=>navigator.clipboard.writeText(item.output_hint)}>Copy path</button>
        </div>
      )}
    </div>
  )
}

export default function App(){
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState('mp4')
  const [quality, setQuality] = useState('best')
  const [audioOnly, setAudioOnly] = useState(false)
  const [subs, setSubs] = useState(false)
  const [embedSubs, setEmbedSubs] = useState(false)
  const [langs, setLangs] = useState('en')
  const [filenameTemplate, setFilenameTemplate] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [resultPath, setResultPath] = useState('')
  const [history, setHistory] = useState([])

  const canSubmit = url && !busy

  const loadHistory = async ()=>{
    try{
      const r = await fetch(`${API_BASE}/api/history`)
      const j = await r.json()
      setHistory(j.items || [])
    }catch(e){ /* ignore */ }
  }

  useEffect(()=>{ loadHistory() }, [])

  const handleDownload = async (e)=>{
    e.preventDefault()
    if(!canSubmit) return
    setBusy(true); setMessage('Starting...'); setResultPath('')
    try{
      const body = {
        url,
        format,
        quality,
        audio_only: audioOnly,
        subtitles: subs,
        embed_subs: embedSubs,
        subtitle_langs: langs.split(',').map(s=>s.trim()).filter(Boolean),
      }
      if(filenameTemplate.trim()) body.filename_template = filenameTemplate.trim()

      const r = await fetch(`${API_BASE}/api/download`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const j = await r.json()
      if(!r.ok) throw new Error(j.detail || 'Download failed')
      setResultPath(j.path)
      setMessage('Completed')
      loadHistory()
    }catch(err){
      setMessage(String(err.message || err))
    }finally{
      setBusy(false)
    }
  }

  const handleConvert = async ()=>{
    if(!resultPath) return
    const outputFormat = audioOnly ? 'mp3' : (format||'mp4')
    setBusy(true); setMessage('Converting...')
    try{
      const r = await fetch(`${API_BASE}/api/convert`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ input_path: resultPath, output_format: outputFormat }) })
      const j = await r.json()
      if(!r.ok) throw new Error(j.detail || 'Conversion failed')
      setResultPath(j.output)
      setMessage('Converted')
    }catch(err){
      setMessage(String(err.message||err))
    }finally{ setBusy(false) }
  }

  return (
    <div className="relative min-h-screen bg-[#0b0b11] text-white">
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/EF7JOSsHLk16Tlw9/scene.splinecode" style={{ width: '100%', height: '100%' }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-[#0b0b11]/60 to-[#0b0b11]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500" />
          <div className="text-lg font-semibold">Flux Media</div>
        </div>
        <div className="text-sm text-zinc-400">Powered by yt-dlp + FFmpeg</div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-24 pt-6 md:grid-cols-5">
        <section className="md:col-span-3">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Advanced Media Downloader & Converter
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-300">
            Download from thousands of sites, convert to any format, and automate your workflow with a fast, modern interface.
          </p>

          <form onSubmit={handleDownload} className="mt-6 space-y-4 rounded-2xl border border-zinc-800 bg-black/40 p-4 backdrop-blur">
            <Field label="Media URL">
              <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-500 focus:border-violet-600" />
            </Field>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Format">
                <select value={format} onChange={e=>setFormat(e.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm">
                  {['mp3','mp4','wav','mkv','webm','m4a','opus'].map(f=> <option key={f} value={f}>{f.toUpperCase()}</option> )}
                </select>
              </Field>
              <Field label="Quality / Format string">
                <input value={quality} onChange={e=>setQuality(e.target.value)} placeholder="bestvideo+bestaudio/best" className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm" />
              </Field>
              <Field label="Filename template (optional)">
                <input value={filenameTemplate} onChange={e=>setFilenameTemplate(e.target.value)} placeholder="%(title)s-%(id)s.%(ext)s" className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm" />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Toggle label="Audio only" checked={audioOnly} onChange={setAudioOnly} />
              <Toggle label="Download subtitles" checked={subs} onChange={setSubs} />
              <Toggle label="Embed subtitles" checked={embedSubs} onChange={setEmbedSubs} />
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">Langs</span>
                <input value={langs} onChange={e=>setLangs(e.target.value)} className="w-28 rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button disabled={!canSubmit} className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50">
                {busy ? 'Working...' : 'Download'}
              </button>
              {resultPath && (
                <a className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800" href={`${API_BASE}/api/file?path=${encodeURIComponent(resultPath)}`} target="_blank" rel="noreferrer">Get file</a>
              )}
              {resultPath && (
                <button type="button" onClick={handleConvert} className="rounded-lg border border-emerald-700 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-600/20">Convert</button>
              )}
              <div className="text-sm text-zinc-400">{message}</div>
            </div>
          </form>
        </section>

        <aside className="md:col-span-2">
          <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 backdrop-blur">
            <div className="mb-3 text-sm font-medium text-zinc-200">Recent activity</div>
            <div className="space-y-3">
              {history.length === 0 && (
                <div className="text-sm text-zinc-500">No history yet</div>
              )}
              {history.map(item => (
                <HistoryItem key={item._id} item={item} />
              ))}
            </div>
          </div>
        </aside>
      </main>

      <footer className="relative z-10 mx-auto max-w-6xl px-6 pb-10 text-xs text-zinc-500">
        For best results, paste a video URL, choose your format, and hit Download. Conversion uses FFmpeg on the server.
      </footer>
    </div>
  )
}
