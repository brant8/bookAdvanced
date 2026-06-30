import type { ChapterMeta } from '@storyverse/contracts';
import { useRef } from 'react';

export function TimelineRail({
  chapters,
  height = 72,
  onSelect,
  selectedNodeId,
}: {
  chapters: ChapterMeta[];
  height?: number;
  onSelect(nodeId: string): void;
  selectedNodeId?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ left: 0, startX: 0, tracking: false });

  return (
    <div
      className="timeline-rail"
      ref={railRef}
      style={{ height }}
      onDoubleClick={() => {
        if (railRef.current) railRef.current.scrollLeft = 0;
      }}
      onMouseDown={(event) => {
        if (!railRef.current) return;
        drag.current = {
          left: railRef.current.scrollLeft,
          startX: event.clientX,
          tracking: true,
        };
      }}
      onMouseLeave={() => {
        drag.current.tracking = false;
      }}
      onMouseMove={(event) => {
        if (!drag.current.tracking || !railRef.current) return;
        railRef.current.scrollLeft = drag.current.left - (event.clientX - drag.current.startX);
      }}
      onMouseUp={() => {
        drag.current.tracking = false;
      }}
      onWheel={(event) => {
        if (!railRef.current) return;
        railRef.current.scrollLeft += event.deltaY + event.deltaX;
      }}
    >
      <div className="timeline-rail__track">
        {chapters.map((chapter) => {
          const width = Math.min(200, Math.max(48, chapter.wordCount / 20));
          return (
            <button
              className={[
                'timeline-rail__chapter',
                `timeline-rail__chapter--${chapter.status}`,
                chapter.isKeyScene ? 'timeline-rail__chapter--key' : '',
                chapter.nodeId === selectedNodeId ? 'timeline-rail__chapter--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={chapter.nodeId}
              style={{ width }}
              title={`${chapter.chapterNumber}. ${chapter.title} · ${chapter.wordCount} 字 · ${chapter.status}`}
              type="button"
              onClick={() => onSelect(chapter.nodeId)}
            >
              <span>{chapter.chapterNumber}</span>
              <strong>{chapter.title}</strong>
              <small>{chapter.hasContent ? `${chapter.wordCount} 字` : '未写'}</small>
              {chapter.source === 'ai' || chapter.source === 'mixed' ? <b>AI</b> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
