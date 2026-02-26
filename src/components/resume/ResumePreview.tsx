'use client';

import { useEffect, useRef, useState } from 'react';

interface ResumePreviewProps {
  documentId: string;
  className?: string;
}

export function ResumePreview({ documentId, className = '' }: ResumePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // A4 dimensions in px at 96dpi (210mm × 297mm)
  const A4_WIDTH_PX = 794;
  const A4_HEIGHT_PX = 1123;

  useEffect(() => {
    function updateScale() {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setScale(containerWidth / A4_WIDTH_PX);
      }
    }
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-zinc-800 rounded-lg ${className}`}>
      <div
        style={{
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <iframe
          ref={iframeRef}
          src={`/api/resume/preview/${documentId}`}
          width={A4_WIDTH_PX}
          height={A4_HEIGHT_PX}
          className="border-0 bg-white"
          sandbox="allow-same-origin"
          title="이력서 미리보기"
        />
      </div>
      {/* Container height tracks scaled content */}
      <div style={{ height: A4_HEIGHT_PX * scale }} />
    </div>
  );
}
