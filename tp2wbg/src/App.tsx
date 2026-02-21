import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

type CopyStatus = 'idle' | 'success' | 'error'

function App() {
  const [originalSrc, setOriginalSrc] = useState<string | null>(null)
  const [convertedDataUrl, setConvertedDataUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const src = e.target!.result as string
      setOriginalSrc(src)

      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current!
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        // Draw white background first, then overlay the image
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, img.width, img.height)
        ctx.drawImage(img, 0, 0)
        setConvertedDataUrl(canvas.toDataURL('image/png'))
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processImageFile(file)
      // Reset input value so the same file can be re-selected
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

  // Clipboard paste (Ctrl+V anywhere on the page)
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
      <h1>透過→白背景変換</h1>
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
              <h2>変換後（白背景）</h2>
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

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default App
