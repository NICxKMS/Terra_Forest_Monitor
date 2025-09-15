import React, { useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

export type ImageWithFallbackProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'loading' | 'decoding' | 'sizes' | 'srcSet' | 'width' | 'height'
> & {
  src: string
  alt: string
  priority?: boolean
  generateUnsplashSrcSet?: boolean
  fetchPriority?: 'high' | 'low' | 'auto'
  loading?: 'eager' | 'lazy'
  decoding?: 'sync' | 'async' | 'auto'
  sizes?: string
  width?: number | string
  height?: number | string
}

function buildUnsplashSrcSet(originalSrc?: string, widths: number[] = [320, 480, 640, 828, 1080, 1280, 1920]) {
  if (!originalSrc) return undefined
  try {
    const url = new URL(originalSrc)
    if (url.hostname !== 'images.unsplash.com') return undefined

    const deduped = Array.from(new Set(widths.filter(w => w > 0).sort((a, b) => a - b)))
    const parts = deduped.map(w => {
      const u = new URL(originalSrc)
      u.searchParams.set('w', String(w))
      if (!u.searchParams.get('fit')) u.searchParams.set('fit', 'max')
      if (!u.searchParams.get('q')) u.searchParams.set('q', '75')
      return `${u.toString()} ${w}w`
    })
    return parts.join(', ')
  } catch {
    return undefined
  }
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)

  const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    setDidError(true)
    if (props.onError) props.onError(e)
  }

  const {
    src,
    alt,
    style,
    className,
    priority,
    loading: loadingProp,
    fetchPriority: fetchPriorityProp,
    decoding: decodingProp,
    srcSet: srcSetProp,
    sizes: sizesProp,
    generateUnsplashSrcSet = true,
    ...rest
  } = props

  const computedSrcSet = srcSetProp || (generateUnsplashSrcSet ? buildUnsplashSrcSet(src) : undefined)
  const finalLoading: 'eager' | 'lazy' | undefined = priority ? 'eager' : (loadingProp as any) || 'lazy'
  const finalFetchPriority: 'high' | 'low' | 'auto' | undefined = priority ? 'high' : (fetchPriorityProp as any) || 'auto'
  const finalDecoding: 'sync' | 'async' | 'auto' | undefined = decodingProp || 'async'

  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img src={ERROR_IMG_SRC} alt="Error loading image" data-original-url={src} {...rest} />
      </div>
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={finalLoading}
      fetchPriority={finalFetchPriority as any}
      decoding={finalDecoding}
      srcSet={computedSrcSet}
      sizes={sizesProp}
      onError={handleError}
      {...rest}
    />
  )
}
