import type { ChapterMeta } from '@storyverse/contracts';
import { useRef } from 'react';

export function TimelineRail({
  chapters,
  height = 72,
  onPlayheadMove,
  onSelect,
  playheadRatio = 0,
  selectedNodeId,
  showPlayhead = false,
}: {
  chapters: ChapterMeta[];
  height?: number;
  onPlayheadMove?(ratio: number): void;
  onSelect(nodeId: string): void;
  playheadRatio?: number;
  selectedNodeId?: string;
  showPlayhead?: boolean;
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
      {showPlayhead ? (
        <button
          aria-label="播放头"
          className="timeline-rail__playhead"
          style={{ left: `${Math.min(100, Math.max(0, playheadRatio * 100))}%` }}
          type="button"
          onMouseDown={(event) => {
            event.stopPropagation();
            const update = (clientX: number) => {
              const rect = railRef.current?.getBoundingClientRect();
              if (!rect || !onPlayheadMove) return;
              onPlayheadMove((clientX - rect.left) / rect.width);
            };
            const move = (moveEvent: MouseEvent) => update(moveEvent.clientX);
            const up = () => {
              window.removeEventListener('mousemove', move);
              window.removeEventListener('mouseup', up);
            };
            update(event.clientX);
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
          }}
        />
      ) : null}
    </div>
  );
}
