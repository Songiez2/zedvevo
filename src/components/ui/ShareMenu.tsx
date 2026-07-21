import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Share2, Link2, MessageCircle, Facebook, Check, Twitter } from 'lucide-react'

interface Props {
  title: string
  artist?: string
  url: string
  imageUrl?: string
}

interface DropdownPos { top: number; left: number; openUp: boolean }

// Clipboard helper — works on both HTTPS (clipboard API) and HTTP (execCommand fallback)
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const el = document.createElement('textarea')
  el.value = text
  el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

export default function ShareMenu({ title, artist, url, imageUrl: _imageUrl }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pos, setPos] = useState<DropdownPos>({ top: 0, left: 0, openUp: false })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const label = artist ? `${title} by ${artist}` : title
  const shareText = `🎵 Check out "${label}" on ZedVevo`

  // Position the portal dropdown relative to the trigger button
  const calcPos = useCallback(() => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const MENU_H = 152   // approx height of dropdown (4 rows × 38px)
    const MENU_W = 176   // w-44
    const openUp = r.bottom + MENU_H > window.innerHeight
    const left = Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8)
    const top = openUp ? r.top - MENU_H - 4 : r.bottom + 4
    setPos({ top, left: Math.max(8, left), openUp })
  }, [])

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Try native Web Share API first (mobile browsers)
    if (!open && navigator.share) {
      navigator.share({ title, text: shareText, url }).catch(() => { /* user cancelled */ })
      return
    }
    calcPos()
    setOpen(v => !v)
  }

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      const target = e.target as Node
      if (menuRef.current && !menuRef.current.contains(target) &&
          btnRef.current && !btnRef.current.contains(target)) {
        setOpen(false)
      }
    }
    const closeScroll = () => setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    window.addEventListener('scroll', closeScroll, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
      window.removeEventListener('scroll', closeScroll, true)
    }
  }, [open])

  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation() }

  const handleCopy = async (e: React.MouseEvent) => {
    stop(e)
    try {
      await copyToClipboard(url)
      setCopied(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 1800)
    } catch {
      setOpen(false)
    }
  }

  const handleWhatsApp = (e: React.MouseEvent) => {
    stop(e)
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${url}`)}`, '_blank', 'noopener')
    setOpen(false)
  }

  const handleFacebook = (e: React.MouseEvent) => {
    stop(e)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`, '_blank', 'noopener,width=640,height=480')
    setOpen(false)
  }

  const handleTwitter = (e: React.MouseEvent) => {
    stop(e)
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,width=600,height=400')
    setOpen(false)
  }

  const dropdown = open ? createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: 176, zIndex: 9999 }}
      className="bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      onClick={stop}
    >
      <button onClick={handleCopy} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors">
        {copied ? <Check size={14} className="text-success" /> : <Link2 size={14} />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <button onClick={handleWhatsApp} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors">
        <MessageCircle size={14} className="text-success" />
        Share on WhatsApp
      </button>
      <button onClick={handleFacebook} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors">
        <Facebook size={14} className="text-brand" />
        Share on Facebook
      </button>
      <button onClick={handleTwitter} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors">
        <Twitter size={14} className="text-sky-400" />
        Share on X / Twitter
      </button>
    </div>,
    document.body
  ) : null

  return (
    <div onClick={stop}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
        title="Share"
        aria-label="Share"
      >
        <Share2 size={14} />
      </button>
      {dropdown}
    </div>
  )
}
