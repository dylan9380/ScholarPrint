"use client";

import { useEffect, useRef, useState } from "react";

const MAX_ZOOM = 24;
const MAX_CANVAS_PIXELS = 24000000;

function getCanvasScale(width, height) {
  const desiredScale = Math.max(1, 1800 / width);
  return Math.min(
    desiredScale,
    4096 / width,
    6000 / height,
    Math.sqrt(MAX_CANVAS_PIXELS / (width * height))
  );
}

function getPaperSize(stageSize, isLandscape) {
  const widthRatio = isLandscape ? 4 : 3;
  const heightRatio = isLandscape ? 3 : 4;
  const maxWidth = Math.min(stageSize.width - 32, isLandscape ? 620 : 360);
  const maxHeight = stageSize.height - 32;
  const scale = Math.min(maxWidth / widthRatio, maxHeight / heightRatio);

  if (!Number.isFinite(scale) || scale <= 0) {
    return { width: 0, height: 0 };
  }

  return { width: widthRatio * scale, height: heightRatio * scale };
}

export default function PrintProofPreview({ file }) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [aspectRatio, setAspectRatio] = useState(null);
  const [previewStatus, setPreviewStatus] = useState("loading");
  const [previewError, setPreviewError] = useState("");
  const [backdrop, setBackdrop] = useState("board");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const extension = file?.name.split(".").pop()?.toLowerCase();
  const isLandscape = aspectRatio !== null && aspectRatio > 1;
  const paperSize = getPaperSize(stageSize, isLandscape);
  const targetAspectRatio = isLandscape ? 4 / 3 : 3 / 4;
  const aspectMismatch =
    aspectRatio !== null && Math.abs(aspectRatio / targetAspectRatio - 1) > 0.01;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!file || !canvas) return undefined;

    let cancelled = false;
    let pptxRenderer;
    let pdfLoadingTask;
    let pdfDocument;
    let pdfRenderTask;
    let pdfWorker;

    setAspectRatio(null);
    setPreviewStatus("loading");
    setPreviewError("");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    canvas.width = 0;
    canvas.height = 0;

    async function renderPreview() {
      try {
        if (extension === "pdf") {
          const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
          pdfWorker = new Worker(
            new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url),
            { type: "module" }
          );
          pdfjs.GlobalWorkerOptions.workerPort = pdfWorker;

          const data = new Uint8Array(await file.arrayBuffer());
          if (cancelled) return;
          pdfLoadingTask = pdfjs.getDocument({ data });
          pdfDocument = await pdfLoadingTask.promise;
          if (cancelled) return;

          const page = await pdfDocument.getPage(1);
          if (cancelled) return;
          const baseViewport = page.getViewport({ scale: 1 });
          setAspectRatio(baseViewport.width / baseViewport.height);

          const scale = getCanvasScale(baseViewport.width, baseViewport.height);
          const viewport = page.getViewport({ scale });
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Could not create a canvas to render this PDF.");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          pdfRenderTask = page.render({
            canvasContext: context,
            viewport,
            background: "rgb(255, 255, 255)",
          });
          await pdfRenderTask.promise;
        } else if (extension === "pptx") {
          const { PptxRenderer } = await import("pptx-browser");
          if (cancelled) return;
          pptxRenderer = new PptxRenderer();
          await pptxRenderer.load(file);
          if (cancelled) return;

          const widthInches = pptxRenderer.slideSize.cx / 914400;
          const heightInches = pptxRenderer.slideSize.cy / 914400;
          setAspectRatio(widthInches / heightInches);
          const desiredWidth = Math.max(1800, widthInches * 96);
          const scale = getCanvasScale(desiredWidth, desiredWidth * heightInches / widthInches);
          await pptxRenderer.renderSlide(0, canvas, Math.round(desiredWidth * scale));
        } else {
          throw new Error("Choose a PDF or PPTX file to preview.");
        }

        if (!cancelled) setPreviewStatus("ready");
      } catch (renderError) {
        if (cancelled) return;
        setPreviewError(
          renderError instanceof Error
            ? renderError.message
            : "This file could not be previewed."
        );
        setPreviewStatus("error");
      }
    }

    renderPreview();
    return () => {
      cancelled = true;
      pdfRenderTask?.cancel();
      pdfDocument?.destroy();
      pdfLoadingTask?.destroy();
      pdfWorker?.terminate();
      pptxRenderer?.destroy();
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [file, extension]);

  function changeZoom(nextZoom) {
    setZoom(Math.min(MAX_ZOOM, Math.max(0.5, nextZoom)));
  }

  function fitToScreen() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function showActualSize() {
    if (!paperSize.width) return;
    const paperWidthInches = isLandscape ? 48 : 36;
    setZoom((96 * paperWidthInches) / paperSize.width);
    setPan({ x: 0, y: 0 });
  }

  function handleWheel(event) {
    event.preventDefault();
    if (event.deltaY === 0) return;
    const direction = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    changeZoom(zoom * direction);
  }

  function handlePointerDown(event) {
    if (zoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }

  function handlePointerMove(event) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    setPan({
      x: dragRef.current.panX + event.clientX - dragRef.current.startX,
      y: dragRef.current.panY + event.clientY - dragRef.current.startY,
    });
  }

  function finishPointerDrag(event) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <section className="print-proof" aria-label="Interactive print proof">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink/60">
            Print proof · HP DesignJet T650
          </p>
          <p className="mt-1 text-xs text-ink/60">
            {isLandscape ? '48" × 36"' : '36" × 48"'} Matte Sheet · Includes ~0.2" HP print margin
          </p>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Proof backdrop">
          <button
            type="button"
            className={`proof-control ${backdrop === "board" ? "proof-control--active" : ""}`}
            aria-pressed={backdrop === "board"}
            onClick={() => setBackdrop("board")}
          >
            Poster Board View
          </button>
          <button
            type="button"
            className={`proof-control ${backdrop === "clean" ? "proof-control--active" : ""}`}
            aria-pressed={backdrop === "clean"}
            onClick={() => setBackdrop("clean")}
          >
            Clean Proof View
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className={`poster-proof-stage poster-proof-stage--${backdrop} ${zoom > 1 ? "is-zoomed" : ""}`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
      >
        <div
          className="poster-proof-paper"
          style={{
            width: paperSize.width,
            height: paperSize.height,
            left: `calc(50% + ${pan.x}px)`,
            top: `calc(50% + ${pan.y}px)`,
            transform: "translate(-50%, -50%) scale(" + zoom + ")",
          }}
        >
          <div className="poster-proof-printable">
            <canvas
              ref={canvasRef}
              className="poster-proof-canvas"
              aria-label={`First-page print proof of ${file.name}`}
            />
          </div>
        </div>
        {previewStatus === "loading" && (
          <p className="proof-status" role="status">Rendering high-resolution proof…</p>
        )}
        {previewStatus === "error" && (
          <p className="proof-status proof-status--error" role="alert">
            Preview unavailable: {previewError}
          </p>
        )}
      </div>

      {aspectMismatch && (
        <p className="mt-3 inline-block border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900" role="status">
          Aspect ratio differs from the {isLandscape ? "4:3" : "3:4"} sheet. Your artwork is fitted
          inside the printable area, so extra white space may appear.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Proof zoom controls">
          <button
            type="button"
            className="proof-control proof-control--icon"
            aria-label="Zoom out"
            onClick={() => changeZoom(zoom / 1.25)}
          >
            −
          </button>
          <button
            type="button"
            className="proof-control proof-control--icon"
            aria-label="Zoom in"
            onClick={() => changeZoom(zoom * 1.25)}
          >
            +
          </button>
          <button type="button" className="proof-control" onClick={fitToScreen}>
            Fit to Screen
          </button>
          <button type="button" className="proof-control" onClick={showActualSize}>
            100% Print Scale (Actual Size)
          </button>
        </div>
        <span className="font-mono text-[10px] text-ink/50">{Math.round(zoom * 100)}%</span>
      </div>
      <p className="mt-2 text-[11px] text-ink/55">
        Scroll or pinch to zoom; drag the proof to pan when zoomed in. The PDF proof is rendered
        at up to 96 PPI for close inspection.
      </p>
    </section>
  );
}
