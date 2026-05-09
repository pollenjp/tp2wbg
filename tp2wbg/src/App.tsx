import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

type CopyStatus = 'idle' | 'success' | 'error'

const PRESET_COLORS = [
  '#ffffff',
  '#000000',
  '#f5f5f5',
  '#cccccc',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#2563eb',
  '#8b5cf6',
  '#ec4899',
]

function App() {
  const [originalSrc, setOriginalSrc] = useState<string | null>(null)
  const [convertedDataUrl, setConvertedDataUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const [bgColor, setBgColor] = useState<string>('#ffffff')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const renderWithColor = useCallback((img: HTMLImageElement, color: string) => {
    const canvas = canvasRef.current!
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, img.width, img.height)
    ctx.drawImage(img, 0, 0)
    setConvertedDataUrl(canvas.toDataURL('image/png'))
  }, [])

  const processImageFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return

      const reader = new FileReader()
      reader.onload = (e) => {
        const src = e.target!.result as string
        setOriginalSrc(src)

        const img = new Image()
        img.onload = () => {
          imageRef.current = img
          renderWithColor(img, bgColor)
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    },
    [bgColor, renderWithColor],
  )

  // Re-render when color changes
  useEffect(() => {
    if (imageRef.current) {
      renderWithColor(imageRef.current, bgColor)
    }
  }, [bgColor, renderWithColor])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processImageFile(file)
      e.target.value = ''
    },
    [processImageFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processImageFile(file)
    },
    [processImageFile],
  )

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) processImageFile(file)
          break
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [processImageFile])

  const handleCopy = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !convertedDataUrl) return

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b)
          else reject(new Error('toBlob failed'))
        }, 'image/png')
      })
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopyStatus('success')
    } catch {
      setCopyStatus('error')
    } finally {
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }, [convertedDataUrl])

  const handleDownload = useCallback(() => {
    if (!convertedDataUrl) return
    const a = document.createElement('a')
    a.href = convertedDataUrl
    a.download = 'converted.png'
    a.click()
  }, [convertedDataUrl])

  const copyLabel =
    copyStatus === 'success'
      ? 'コピー完了！'
      : copyStatus === 'error'
        ? 'コピー失敗'
        : 'クリップボードにコピー'

  return (
    <div className="app">
      <h1>透過→背景色変換</h1>
      <p className="guide">ファイルを選択 / ドラッグ&amp;ドロップ / Ctrl+V で貼り付け</p>

      <div
        className={`drop-zone${isDragging ? ' dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <span>ここをクリック / ドラッグ&amp;ドロップ / Ctrl+V</span>
      </div>

      <div className="color-picker">
        <span className="color-picker-label">背景色:</span>
        <div className="color-swatches">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`color-swatch${bgColor.toLowerCase() === color.toLowerCase() ? ' selected' : ''}`}
              style={{ backgroundColor: color }}
              aria-label={`背景色 ${color}`}
              title={color}
              onClick={() => setBgColor(color)}
            />
          ))}
        </div>
        <label className="color-custom">
          <span>カスタム</span>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
          />
        </label>
        <span className="color-value">{bgColor.toUpperCase()}</span>
      </div>

      {originalSrc && convertedDataUrl && (
        <>
          <div className="preview-container">
            <div className="preview-panel">
              <h2>元画像（透過背景）</h2>
              <div className="img-wrapper checker">
                <img src={originalSrc} alt="元画像" />
              </div>
            </div>
            <div className="preview-panel">
              <h2>変換後（背景色: {bgColor.toUpperCase()}）</h2>
              <div className="img-wrapper">
                <img src={convertedDataUrl} alt="変換後" />
              </div>
            </div>
          </div>

          <div className="actions">
            <button className={copyStatus !== 'idle' ? copyStatus : ''} onClick={handleCopy}>
              {copyLabel}
            </button>
            <button onClick={handleDownload}>ダウンロード</button>
          </div>
        </>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default App
