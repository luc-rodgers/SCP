import React, { useEffect, useRef } from "react";

export default function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    const getPos = (e) => {
      const rect = c.getBoundingClientRect();
      const touch = e.touches && e.touches[0];
      const clientX = touch ? touch.clientX : e.clientX;
      const clientY = touch ? touch.clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e) => {
      drawing.current = true;
      const { x, y } = getPos(e);
      const ctx2 = c.getContext("2d");
      ctx2.beginPath();
      ctx2.moveTo(x, y);
    };
    const move = (e) => {
      if (!drawing.current) return;
      const { x, y } = getPos(e);
      const ctx2 = c.getContext("2d");
      ctx2.lineTo(x, y);
      ctx2.stroke();
    };
    const end = () => {
      if (!drawing.current) return;
      drawing.current = false;
      onChange(c.toDataURL());
    };

    c.addEventListener("mousedown", start);
    c.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);

    c.addEventListener("touchstart", start, { passive: true });
    c.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);

    return () => {
      c.removeEventListener("mousedown", start);
      c.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      c.removeEventListener("touchstart", start);
      c.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
    };
  }, [onChange]);

  useEffect(() => {
    if (!value) return;
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
    };
    img.src = value;
  }, [value]);

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        className="border rounded-lg bg-white"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clear}
          className="px-3 py-1.5 border rounded-lg text-sm"
        >
          Clear
        </button>
        <span className="text-xs text-gray-500 self-center">Sign above</span>
      </div>
    </div>
  );
}
