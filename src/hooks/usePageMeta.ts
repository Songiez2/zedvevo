import { useEffect } from 'react'

interface PageMeta {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: 'music.song' | 'video.other' | 'website'
}

/**
 * Dynamically updates og: / twitter: meta tags for the current page.
 * Reverts to site defaults on unmount.
 */
export function usePageMeta({ title, description, image, url, type = 'website' }: PageMeta) {
  useEffect(() => {
    const pageUrl = url || window.location.href
    const defaults = {
      title: 'ZedVevo — Zambia\'s Digital Entertainment Platform',
      description: 'Stream Zambian music, watch music videos, buy event tickets, and shop merchandise.',
      image: `${window.location.origin}/og-image.png`,
      url: window.location.origin,
      type: 'website',
    }

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    const setNameMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
      if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }

    const t = title ? `${title} — ZedVevo` : defaults.title
    document.title = t
    setMeta('og:title', t)
    setMeta('og:description', description || defaults.description)
    setMeta('og:image', image || defaults.image)
    setMeta('og:url', pageUrl)
    setMeta('og:type', type)
    setNameMeta('twitter:title', t)
    setNameMeta('twitter:description', description || defaults.description)
    setNameMeta('twitter:image', image || defaults.image)
    setNameMeta('description', description || defaults.description)

    return () => {
      document.title = defaults.title
      setMeta('og:title', defaults.title)
      setMeta('og:description', defaults.description)
      setMeta('og:image', defaults.image)
      setMeta('og:url', defaults.url)
      setMeta('og:type', defaults.type)
      setNameMeta('twitter:title', defaults.title)
      setNameMeta('twitter:description', defaults.description)
      setNameMeta('twitter:image', defaults.image)
      setNameMeta('description', defaults.description)
    }
  }, [title, description, image, url, type])
}
