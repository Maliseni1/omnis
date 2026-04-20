import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from 'lucide-react';

interface PresentationSlide {
  id: string;
  title: string;
  body: string;
}

interface PresentationDocument {
  slides: PresentationSlide[];
}

interface PresentationViewerProps {
  content: string;
  isEditable: boolean;
  onUpdate: (content: string) => void;
}

const parsePresentation = (rawContent: string): PresentationDocument => {
  if (!rawContent) {
    return { slides: [{ id: crypto.randomUUID(), title: 'Slide 1', body: '' }] };
  }

  try {
    const parsed = JSON.parse(rawContent) as Partial<PresentationDocument>;
    if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      throw new Error('Invalid slides payload');
    }
    return {
      slides: parsed.slides.map((slide, index) => ({
        id: typeof slide.id === 'string' && slide.id ? slide.id : `slide-${index + 1}`,
        title: typeof slide.title === 'string' ? slide.title : '',
        body: typeof slide.body === 'string' ? slide.body : '',
      })),
    };
  } catch {
    return { slides: [{ id: crypto.randomUUID(), title: 'Slide 1', body: rawContent }] };
  }
};

export const PresentationViewer: React.FC<PresentationViewerProps> = ({ content, isEditable, onUpdate }) => {
  const presentation = useMemo(() => parsePresentation(content), [content]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (activeIndex > presentation.slides.length - 1) {
      setActiveIndex(Math.max(0, presentation.slides.length - 1));
    }
  }, [activeIndex, presentation.slides.length]);

  const updateSlides = (slides: PresentationSlide[]) => {
    onUpdate(JSON.stringify({ slides }));
  };

  const activeSlide = presentation.slides[activeIndex];

  const updateSlide = (slideIndex: number, patch: Partial<PresentationSlide>) => {
    const nextSlides = presentation.slides.map((slide, index) => {
      if (index !== slideIndex) return slide;
      return { ...slide, ...patch };
    });
    updateSlides(nextSlides);
  };

  const addSlide = () => {
    const nextSlides = [
      ...presentation.slides,
      {
        id: crypto.randomUUID(),
        title: `Slide ${presentation.slides.length + 1}`,
        body: '',
      },
    ];
    updateSlides(nextSlides);
    setActiveIndex(nextSlides.length - 1);
  };

  const removeActiveSlide = () => {
    if (presentation.slides.length <= 1) return;
    const nextSlides = presentation.slides.filter((_, index) => index !== activeIndex);
    updateSlides(nextSlides);
    setActiveIndex((prev) => Math.max(0, prev - 1));
  };

  const goToSlide = (slideIndex: number) => {
    setActiveIndex(slideIndex);
    const element = slideRefs.current[slideIndex];
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!activeSlide) return null;

  return (
    <div className="w-full h-full bg-slate-100 overflow-hidden relative">
      <button
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        className="absolute top-3 left-3 z-30 p-2 rounded-lg bg-white/90 border border-slate-200 text-slate-600 hover:text-indigo-600 shadow-sm"
        title={isSidebarOpen ? 'Hide slides panel' : 'Show slides panel'}
      >
        {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </button>

      {isSidebarOpen && (
        <div className="absolute left-0 top-0 z-20 w-64 h-full border-r border-slate-200 bg-white p-3 overflow-y-auto shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Slides</p>
          <span className="text-[10px] text-slate-400 font-mono">{presentation.slides.length}</span>
        </div>
        <div className="space-y-2">
          {presentation.slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => goToSlide(index)}
              className={`w-full text-left rounded-lg border p-2 transition-colors ${
                index === activeIndex
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="text-[10px] font-mono text-slate-400 mb-1">Slide {index + 1}</div>
              <div className="text-xs font-medium text-slate-700 truncate">{slide.title || 'Untitled slide'}</div>
              <div className="mt-2 h-12 rounded border border-slate-200 bg-slate-50 p-1 text-[10px] text-slate-500 overflow-hidden">
                {(slide.body || '').replace(/<[^>]+>/g, '').slice(0, 120)}
              </div>
            </button>
          ))}
        </div>
        {isEditable && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={addSlide}
              className="flex-1 px-2 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 flex items-center justify-center gap-1"
            >
              <Plus size={12} /> Add
            </button>
            <button
              onClick={removeActiveSlide}
              disabled={presentation.slides.length <= 1}
              className="flex-1 px-2 py-2 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-500 disabled:opacity-40 flex items-center justify-center gap-1"
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        )}
      </div>
      )}

      <div className="h-full overflow-y-auto p-6 space-y-6">
        {presentation.slides.map((slide, index) => (
          <div
            key={slide.id}
            ref={(el) => {
              slideRefs.current[index] = el;
            }}
            className={`mx-auto w-full max-w-[794px] aspect-210/297 bg-white shadow-xl rounded-md border p-10 flex flex-col ${
              index === activeIndex ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-200'
            }`}
            onClick={() => setActiveIndex(index)}
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-3">Slide {index + 1}</div>
            {isEditable ? (
              <>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => updateSlide(index, { title: e.currentTarget.innerHTML })}
                  className="text-3xl font-bold text-slate-900 border-b border-slate-200 pb-3 mb-6 outline-none min-h-[54px]"
                  dangerouslySetInnerHTML={{ __html: slide.title || '' }}
                />
                <div
                  id={index === activeIndex ? 'editor-container' : undefined}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => updateSlide(index, { body: e.currentTarget.innerHTML })}
                  className="flex-1 text-slate-700 leading-relaxed outline-none"
                  dangerouslySetInnerHTML={{ __html: slide.body || '' }}
                />
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-3">{slide.title ? slide.title.replace(/<[^>]+>/g, '') : 'Untitled slide'}</h2>
                <div
                  className="text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: slide.body || 'No slide content.' }}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
