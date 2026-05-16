import { useEffect } from 'react'

interface LightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

export function Lightbox({ src, alt = '', onClose }: LightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        className="absolute right-4 top-4 text-2xl font-bold text-white/80 hover:text-white"
        onClick={onClose}
        aria-label="Close"
      >
        ✕
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
