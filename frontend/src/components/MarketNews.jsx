import { useEffect, useRef } from 'react'

export default function MarketNews() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clear any previous instance
    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>'

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js'
    script.async = true
    script.type = 'text/javascript'
    script.innerHTML = JSON.stringify({
      feedMode: 'all_symbols',
      isTransparent: true,
      displayMode: 'compact',
      width: '100%',
      height: 500,
      colorTheme: 'dark',
      locale: 'en',
    })

    container.appendChild(script)

    return () => { container.innerHTML = '' }
  }, [])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', minHeight: 500 }}
    />
  )
}
