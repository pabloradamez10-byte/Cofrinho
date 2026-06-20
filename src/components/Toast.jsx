import React, { useEffect } from "react";
import { Sparkles } from "lucide-react";

export default function Toast({ text, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [text]);

  if (!text) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 z-30 flex justify-center px-5">
      <div
        className="px-5 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-lg"
        style={{ background: "var(--ink)", color: "#fff" }}
      >
        <Sparkles size={15} color="#F4C95D" /> {text}
      </div>
    </div>
  );
}

