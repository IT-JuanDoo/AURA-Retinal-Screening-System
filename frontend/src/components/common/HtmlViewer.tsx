import { useEffect, useRef } from 'react';

interface HtmlViewerProps {
  html: string;
  title?: string;
}

const HtmlViewer = ({ html, title }: HtmlViewerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && html) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  return (
    <div className="w-full h-screen">
      {title && (
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title={title || 'HTML Viewer'}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
};

export default HtmlViewer;

