"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Eraser, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHandwriting } from "@/features/smart-editor/hooks/use-handwriting";
import type { HandwritingStroke } from "@/features/smart-editor/services/interfaces/editor-services";

type HandwritingPanelProps = {
  locale?: "ml" | "en";
  onInsert: (text: string) => void;
};

function HandwritingPanelInner({
  locale = "ml",
  onInsert,
}: HandwritingPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const liveStroke = useRef<HandwritingStroke>([]);
  const hw = useHandwriting(locale);

  const paint = useCallback((extra?: HandwritingStroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = getComputedStyle(canvas).color || "#111";

    const drawStroke = (stroke: HandwritingStroke) => {
      if (stroke.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0]!.x, stroke[0]!.y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i]!.x, stroke[i]!.y);
      }
      ctx.stroke();
    };

    for (const stroke of hw.strokes) drawStroke(stroke);
    if (extra) drawStroke(extra);
  }, [hw.strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint(liveStroke.current);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [paint]);

  useEffect(() => {
    paint();
  }, [paint]);

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5">
        <PenLine className="size-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Handwriting
        </p>
      </div>
      <canvas
        ref={canvasRef}
        className="h-40 w-full touch-none rounded-md border border-border/60 bg-background text-foreground"
        aria-label="Handwriting canvas"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          const p = pointFromEvent(e);
          liveStroke.current = [{ x: p.x, y: p.y, t: Date.now() }];
          hw.beginStroke(p.x, p.y);
          paint(liveStroke.current);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const p = pointFromEvent(e);
          liveStroke.current.push({ x: p.x, y: p.y, t: Date.now() });
          hw.continueStroke(p.x, p.y);
          paint(liveStroke.current);
        }}
        onPointerUp={() => {
          drawing.current = false;
          liveStroke.current = [];
          hw.endStroke();
        }}
        onPointerCancel={() => {
          drawing.current = false;
          liveStroke.current = [];
          hw.endStroke();
        }}
      />
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={hw.recognizing || hw.strokes.length === 0}
          onClick={async () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const text = await hw.recognize(
              canvas.clientWidth,
              canvas.clientHeight,
            );
            if (text) onInsert(text);
          }}
        >
          {hw.recognizing ? "Recognizing…" : "Recognize & insert"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8"
          onClick={() => {
            hw.clear();
            paint();
          }}
        >
          <Eraser className="size-3.5" />
          Clear
        </Button>
      </div>
      {hw.result ? (
        <p className="text-xs">
          Last: <span className="font-medium">{hw.result}</span>
        </p>
      ) : null}
      {hw.error ? (
        <p className="text-[11px] text-destructive" role="alert">
          {hw.error}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Mouse, touch, and stylus supported. Recognition provider is mock /
          swappable.
        </p>
      )}
    </div>
  );
}

export const HandwritingPanel = dynamic(
  () => Promise.resolve({ default: HandwritingPanelInner }),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 animate-pulse rounded-lg border border-border/60 bg-muted/20" />
    ),
  },
);
