import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

function chunkText(text) {
  const raw = text.split(/(?<=[.?!])\s+/)
  return raw.map(s => s.trim()).filter(s => s.length > 0)
}

const AudioContext = window.AudioContext || window.webkitAudioContext

function useTypeSounds(enabled) {
  const ctxRef = useRef(null)

  const getCtx = useCallback(() => {
    if (!enabled) return null
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [enabled])

  const playKey = useCallback(() => {
    const ctx = getCtx()
    if (!ctx) return
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 80) * 0.15
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 800
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 4000
    src.connect(hp).connect(lp).connect(ctx.destination)
    src.start()
  }, [getCtx])

  const playError = useCallback(() => {
    const ctx = getCtx()
    if (!ctx) return
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 50) * 0.25
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 600
    src.connect(lp).connect(ctx.destination)
    src.start()
  }, [getCtx])

  const playAdvance = useCallback(() => {
    const ctx = getCtx()
    if (!ctx) return
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.1
        + Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 40) * 0.08
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start()
  }, [getCtx])

  return { playKey, playError, playAdvance }
}

function InputScreen({ onStart, soundEnabled, onToggleSound }) {
  const [text, setText] = useState('')
  const taRef = useRef(null)

  useEffect(() => { taRef.current?.focus() }, [])

  const handleStart = () => {
    const trimmed = text.trim()
    if (trimmed.length < 10) return
    onStart(trimmed)
  }

  return (
    <div className="w-full max-w-[800px] px-6 fade-in">
      <h1 className="text-4xl font-bold mb-2 tracking-tight">TypeLock</h1>
      <p className="text-phosphor-dim text-sm mb-8">kinesthetic memory encoder</p>
      <textarea
        ref={taRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste source material here..."
        className="w-full h-64 bg-bg-subtle text-phosphor p-4 text-sm resize-none rounded-sm border border-text-muted/30 focus:border-phosphor-dim"
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleStart() }}
      />
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-text-dim text-xs">
            {text.trim() ? `${chunkText(text.trim()).length} chunks` : ''}
          </span>
          <button
            onClick={onToggleSound}
            className="text-xs text-text-dim hover:text-phosphor-dim transition-colors"
            title={soundEnabled ? 'Sound on' : 'Sound off'}
          >
            {soundEnabled ? 'SND ON' : 'SND OFF'}
          </button>
        </div>
        <button
          onClick={handleStart}
          disabled={text.trim().length < 10}
          className="px-6 py-2 bg-phosphor text-bg font-bold text-sm tracking-wide hover:bg-phosphor/90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
        >
          START
        </button>
      </div>
    </div>
  )
}

function TypingScreen({ chunks, isReview, onComplete, sounds }) {
  const [chunkIndex, setChunkIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [chunkResults, setChunkResults] = useState([])
  const [chunkStartTime, setChunkStartTime] = useState(Date.now())
  const [transitioning, setTransitioning] = useState(false)
  const [wpmHistory, setWpmHistory] = useState([])
  const [liveWpmTick, setLiveWpmTick] = useState(0)
  const containerRef = useRef(null)
  const errorsRef = useRef(0)

  const currentChunk = chunks[chunkIndex]
  const totalChunks = chunks.length

  useEffect(() => {
    containerRef.current?.focus()
  }, [chunkIndex])

  useEffect(() => {
    setChunkStartTime(Date.now())
    setTyped('')
    errorsRef.current = 0
  }, [chunkIndex])

  useEffect(() => {
    const id = setInterval(() => setLiveWpmTick(t => t + 1), 500)
    return () => clearInterval(id)
  }, [])

  const errors = useMemo(() => {
    let count = 0
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] !== currentChunk[i]) count++
    }
    errorsRef.current = count
    return count
  }, [typed, currentChunk])

  const liveWpm = useMemo(() => {
    void liveWpmTick
    const elapsed = (Date.now() - chunkStartTime) / 1000 / 60
    if (elapsed < 0.01 || typed.length < 2) return wpmHistory.length > 0 ? wpmHistory[wpmHistory.length - 1] : 0
    const words = typed.length / 5
    const currentWpm = Math.round(words / elapsed)
    if (wpmHistory.length === 0) return currentWpm
    const all = [...wpmHistory, currentWpm]
    return Math.round(all.reduce((a, b) => a + b, 0) / all.length)
  }, [liveWpmTick, wpmHistory, typed, chunkStartTime])

  const progress = ((chunkIndex) / totalChunks) * 100

  const advanceChunk = useCallback(() => {
    const elapsed = (Date.now() - chunkStartTime) / 1000 / 60
    const words = currentChunk.length / 5
    const wpm = elapsed > 0.01 ? Math.round(words / elapsed) : 0
    const errs = errorsRef.current
    const accuracy = currentChunk.length > 0
      ? ((currentChunk.length - errs) / currentChunk.length) * 100
      : 100

    const result = {
      text: currentChunk,
      wpm,
      errors: errs,
      accuracy,
      time: elapsed * 60,
      isReviewChunk: isReview,
    }

    setWpmHistory(prev => [...prev, wpm])
    sounds.playAdvance()

    const newResults = [...chunkResults, result]
    setChunkResults(newResults)

    if (chunkIndex + 1 >= totalChunks) {
      setTimeout(() => onComplete(newResults), 300)
      return
    }

    setTransitioning(true)
    setTimeout(() => {
      setChunkIndex(prev => prev + 1)
      setTransitioning(false)
    }, 300)
  }, [chunkStartTime, currentChunk, chunkResults, chunkIndex, totalChunks, onComplete, isReview, sounds])

  const handleKeyDown = useCallback((e) => {
    if (transitioning) return

    if (e.key === 'Backspace') {
      e.preventDefault()
      setTyped(prev => prev.slice(0, -1))
      sounds.playKey()
      return
    }

    if (e.key.length !== 1) return
    e.preventDefault()

    const next = typed + e.key
    setTyped(next)

    const isCorrect = e.key === currentChunk[typed.length]
    if (isCorrect) {
      sounds.playKey()
    } else {
      sounds.playError()
    }

    if (next.length >= currentChunk.length) {
      advanceChunk()
    }
  }, [typed, currentChunk, advanceChunk, transitioning, sounds])

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="w-full max-w-[800px] px-6 outline-none fade-in"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isReview && (
            <span className="text-review text-xs border border-review/40 px-2 py-0.5 rounded-sm">
              REVIEW
            </span>
          )}
          <span className="text-text-dim text-xs">
            {chunkIndex + 1} / {totalChunks}
          </span>
        </div>
        <div className="text-phosphor-dim text-sm">
          <span className="text-phosphor font-bold text-lg">{liveWpm}</span>
          <span className="ml-1 text-xs">WPM</span>
        </div>
      </div>

      <div className="w-full h-1 bg-bg-subtle mb-8 rounded-full overflow-hidden">
        <div
          className="h-full bg-phosphor-dim progress-bar-fill rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className={`text-xl leading-relaxed mb-12 transition-opacity duration-200 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        {currentChunk.split('').map((char, i) => {
          let cn = 'text-text-muted'
          if (i < typed.length) {
            cn = typed[i] === char ? 'text-phosphor' : 'text-err bg-err/20'
          }
          const isCursor = i === typed.length
          return (
            <span key={i} className={cn}>
              {isCursor && <span className="border-l-2 border-phosphor cursor-blink -ml-px" />}
              {char}
            </span>
          )
        })}
        {typed.length >= currentChunk.length && (
          <span className="border-l-2 border-phosphor cursor-blink" />
        )}
      </div>

      <p className="text-text-dim text-xs text-center">
        type the text above &mdash; auto-advances on completion
      </p>
    </div>
  )
}

function ResultsScreen({ results, onRetryWeak, onNewText }) {
  const totalChars = results.reduce((s, r) => s + r.text.length, 0)
  const totalErrors = results.reduce((s, r) => s + r.errors, 0)
  const totalTime = results.reduce((s, r) => s + r.time, 0)
  const overallWpm = totalTime > 0 ? Math.round((totalChars / 5) / (totalTime / 60)) : 0
  const overallAccuracy = totalChars > 0 ? ((totalChars - totalErrors) / totalChars * 100) : 100

  const avgWpm = results.length > 0
    ? results.reduce((s, r) => s + r.wpm, 0) / results.length
    : 0

  const flagged = results.filter(r => {
    return r.accuracy < 90 || (avgWpm > 0 && r.wpm < avgWpm * 0.8)
  })

  return (
    <div className="w-full max-w-[800px] px-6 fade-in">
      <h1 className="text-3xl font-bold mb-8 tracking-tight">Results</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-bg-subtle p-4 rounded-sm">
          <div className="text-phosphor text-3xl font-bold">{overallWpm}</div>
          <div className="text-text-dim text-xs mt-1">WPM</div>
        </div>
        <div className="bg-bg-subtle p-4 rounded-sm">
          <div className="text-phosphor text-3xl font-bold">{overallAccuracy.toFixed(1)}%</div>
          <div className="text-text-dim text-xs mt-1">ACCURACY</div>
        </div>
      </div>

      {flagged.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm text-review mb-3 text-left">
            Weak Spots ({flagged.length})
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {flagged.map((r, i) => (
              <div key={i} className="bg-bg-subtle p-3 rounded-sm text-left">
                <p className="text-xs text-text-dim mb-1 truncate">{r.text}</p>
                <div className="flex gap-4 text-xs">
                  <span className="text-phosphor-dim">{r.wpm} WPM</span>
                  <span className={r.errors > 0 ? 'text-err' : 'text-phosphor-dim'}>
                    {r.errors} errors
                  </span>
                  <span className="text-text-dim">{r.accuracy.toFixed(0)}% acc</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {flagged.length === 0 && (
        <p className="text-phosphor-dim text-sm mb-8">Clean run. No weak spots.</p>
      )}

      <div className="flex gap-3 justify-center">
        {flagged.length > 0 && (
          <button
            onClick={() => onRetryWeak(flagged.map(r => r.text))}
            className="px-5 py-2 bg-review/20 text-review border border-review/40 text-sm font-bold hover:bg-review/30 transition-colors"
          >
            RETRY WEAK SPOTS
          </button>
        )}
        <button
          onClick={onNewText}
          className="px-5 py-2 bg-bg-subtle text-phosphor-dim border border-text-muted/30 text-sm font-bold hover:bg-bg-hover hover:text-phosphor transition-colors"
        >
          NEW TEXT
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('input')
  const [allChunks, setAllChunks] = useState([])
  const [activeChunks, setActiveChunks] = useState([])
  const [isReview, setIsReview] = useState(false)
  const [firstPassResults, setFirstPassResults] = useState([])
  const [finalResults, setFinalResults] = useState([])
  const [soundEnabled, setSoundEnabled] = useState(true)

  const sounds = useTypeSounds(soundEnabled)

  const handleStart = (text) => {
    const chunks = chunkText(text)
    setAllChunks(chunks)
    setActiveChunks(chunks)
    setIsReview(false)
    setFirstPassResults([])
    setFinalResults([])
    setScreen('typing')
  }

  const handleTypingComplete = (results) => {
    if (!isReview) {
      setFirstPassResults(results)

      const avgWpm = results.reduce((s, r) => s + r.wpm, 0) / results.length
      const flagged = results.filter(r => r.accuracy < 90 || r.wpm < avgWpm * 0.8)

      if (flagged.length > 0) {
        setActiveChunks(flagged.map(r => r.text))
        setIsReview(true)
        setScreen('typing')
      } else {
        setFinalResults(results)
        setScreen('results')
      }
    } else {
      setFinalResults([...firstPassResults, ...results])
      setScreen('results')
    }
  }

  const handleRetryWeak = (weakChunks) => {
    setActiveChunks(weakChunks)
    setIsReview(true)
    setScreen('typing')
  }

  const handleNewText = () => {
    setScreen('input')
    setAllChunks([])
    setActiveChunks([])
    setFirstPassResults([])
    setFinalResults([])
    setIsReview(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      {screen === 'input' && (
        <InputScreen
          onStart={handleStart}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(s => !s)}
        />
      )}
      {screen === 'typing' && (
        <TypingScreen
          key={`${isReview}-${activeChunks.length}-${activeChunks[0]?.slice(0,10)}`}
          chunks={activeChunks}
          isReview={isReview}
          onComplete={handleTypingComplete}
          sounds={sounds}
        />
      )}
      {screen === 'results' && (
        <ResultsScreen
          results={finalResults}
          onRetryWeak={handleRetryWeak}
          onNewText={handleNewText}
        />
      )}
    </div>
  )
}
