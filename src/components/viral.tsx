'use client'

import { useState, useRef } from 'react'

// ============================================================================
// UNIVERSAL SHARE BUTTON
// ============================================================================
interface ShareButtonProps {
  title: string
  text: string
  url: string
  onShare?: (method: string) => void
  style?: React.CSSProperties
  children?: React.ReactNode
}

export const UniversalShareButton = ({ 
  title, 
  text, 
  url, 
  onShare,
  style,
  children 
}: ShareButtonProps) => {
  const [showFallback, setShowFallback] = useState(false)
  
  const handleShare = async () => {
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        onShare?.('native')
        return
      } catch (err) {
        // User cancelled or error - show fallback
        if ((err as Error).name !== 'AbortError') {
          setShowFallback(true)
        }
        return
      }
    }
    
    // Desktop fallback - copy to clipboard
    try {
      await navigator.clipboard.writeText(url)
      onShare?.('clipboard')
      alert('Link copied to clipboard!')
    } catch {
      setShowFallback(true)
    }
  }
  
  return (
    <>
      <button
        onClick={handleShare}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px 20px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '12px',
          color: 'white',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 150ms ease',
          ...style,
        }}
      >
        {children || (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </>
        )}
      </button>
      
      {showFallback && (
        <div 
          onClick={() => setShowFallback(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a1a1f',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '320px',
              width: '100%',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
              Share this event
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <WhatsAppShareButton text={`${title}\n${text}`} url={url} onShare={onShare} />
              
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(url)
                  onShare?.('clipboard')
                  setShowFallback(false)
                  alert('Link copied!')
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📋 Copy Link
              </button>
            </div>
            
            <button
              onClick={() => setShowFallback(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                border: 'none',
                color: '#999',
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '12px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================================
// WHATSAPP SHARE BUTTON
// ============================================================================
interface WhatsAppShareProps {
  text: string
  url: string
  onShare?: (method: string) => void
  style?: React.CSSProperties
}

export const WhatsAppShareButton = ({ text, url, onShare, style }: WhatsAppShareProps) => {
  const handleClick = () => {
    const message = encodeURIComponent(`${text}\n\n${url}`)
    window.open(`https://wa.me/?text=${message}`, '_blank')
    onShare?.('whatsapp')
  }
  
  return (
    <button
      onClick={handleClick}
      style={{
        width: '100%',
        padding: '14px',
        background: '#25D366',
        border: 'none',
        borderRadius: '10px',
        color: 'white',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        ...style,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      WhatsApp
    </button>
  )
}

// ============================================================================
// STORY CARD GENERATOR (for Instagram/Snapchat stories)
// ============================================================================
interface StoryCardProps {
  event: {
    title: string
    date: string
    time: string
    venue: string
    imageUrl?: string
    price?: string
  }
  onGenerate?: (dataUrl: string) => void
}

export const StoryCardGenerator = ({ event, onGenerate }: StoryCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [generating, setGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  const generateCard = async () => {
    setGenerating(true)
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Story dimensions (9:16 ratio)
    canvas.width = 1080
    canvas.height = 1920
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#0a0a0b')
    gradient.addColorStop(0.5, '#1a1a2e')
    gradient.addColorStop(1, '#0a0a0b')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Load and draw event image if available
    if (event.imageUrl) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = event.imageUrl!
        })
        
        // Draw image with overlay
        const imgHeight = 800
        ctx.drawImage(img, 0, 200, canvas.width, imgHeight)
        
        // Add gradient overlay
        const imgGradient = ctx.createLinearGradient(0, 200, 0, 200 + imgHeight)
        imgGradient.addColorStop(0, 'rgba(10,10,11,0.3)')
        imgGradient.addColorStop(0.7, 'rgba(10,10,11,0.8)')
        imgGradient.addColorStop(1, 'rgba(10,10,11,1)')
        ctx.fillStyle = imgGradient
        ctx.fillRect(0, 200, canvas.width, imgHeight)
      } catch {
        // Image failed to load, continue without it
      }
    }
    
    // Purple accent bar
    ctx.fillStyle = '#ab67f7'
    ctx.fillRect(80, 1100, 8, 200)
    
    // Event title
    ctx.fillStyle = 'white'
    ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'left'
    
    // Word wrap title
    const maxWidth = canvas.width - 200
    const words = event.title.split(' ')
    let line = ''
    let y = 1180
    
    for (const word of words) {
      const testLine = line + word + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), 120, y)
        line = word + ' '
        y += 90
      } else {
        line = testLine
      }
    }
    ctx.fillText(line.trim(), 120, y)
    
    // Date and time
    ctx.fillStyle = '#ab67f7'
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(`${event.date} · ${event.time}`, 120, y + 100)
    
    // Venue
    ctx.fillStyle = '#999999'
    ctx.font = '40px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(event.venue, 120, y + 170)
    
    // Price if available
    if (event.price) {
      ctx.fillStyle = '#22c55e'
      ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillText(event.price, 120, y + 240)
    }
    
    // Sounded Out branding
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '32px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('soundedout.com', canvas.width / 2, canvas.height - 100)
    
    // Generate data URL
    const dataUrl = canvas.toDataURL('image/png')
    setPreviewUrl(dataUrl)
    onGenerate?.(dataUrl)
    setGenerating(false)
  }
  
  const downloadCard = () => {
    if (!previewUrl) return
    
    const link = document.createElement('a')
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-story.png`
    link.href = previewUrl
    link.click()
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {previewUrl && (
        <div style={{ 
          width: '100%', 
          maxWidth: '200px',
          aspectRatio: '9/16',
          borderRadius: '12px',
          overflow: 'hidden',
          margin: '0 auto',
        }}>
          <img 
            src={previewUrl} 
            alt="Story preview" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={generateCard}
          disabled={generating}
          style={{
            flex: 1,
            padding: '14px',
            background: generating ? '#555' : 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            cursor: generating ? 'not-allowed' : 'pointer',
          }}
        >
          {generating ? 'Generating...' : previewUrl ? 'Regenerate' : 'Generate Story Card'}
        </button>
        
        {previewUrl && (
          <button
            onClick={downloadCard}
            style={{
              padding: '14px 20px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📥 Save
          </button>
        )}
      </div>
    </div>
  )
}
