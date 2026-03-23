import React, { useEffect, useRef, useMemo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  theme?: 'light' | 'dark';
}

let tvScriptLoadingPromise: Promise<void>;

export default function TradingViewWidget({ symbol, theme = 'dark' }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerId = useMemo(() => `tradingview_widget_${Math.random().toString(36).substring(2, 9)}`, []);

  useEffect(() => {
    if (!tvScriptLoadingPromise) {
      tvScriptLoadingPromise = new Promise((resolve) => {
        const existing = document.getElementById('tradingview-widget-loading-script');
        if (existing) { resolve(); return; }
        const script = document.createElement('script');
        script.id = 'tradingview-widget-loading-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.type = 'text/javascript';
        script.onload = resolve as any;
        document.head.appendChild(script);
      });
    }

    tvScriptLoadingPromise.then(() => {
       if ('TradingView' in window && document.getElementById(containerId)) {
          // Clear previous widget
          const el = document.getElementById(containerId);
          if (el) el.innerHTML = '';
          
          new (window as any).TradingView.widget({
            autosize: true,
            symbol: `BINANCE:${symbol}`,
            interval: "15",
            timezone: "America/Sao_Paulo",
            theme: theme,
            style: "1",
            locale: "br",
            toolbar_bg: "#f1f3f6",
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: true,
            container_id: containerId
          });
       }
    });
  }, [symbol, theme, containerId]);

  return (
    <div className='h-full w-full relative bg-[#151A25]'>
      <div id={containerId} ref={containerRef} className='h-full w-full absolute inset-0' />
    </div>
  );
}
