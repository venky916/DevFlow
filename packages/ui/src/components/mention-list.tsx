"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

interface MentionItem {
  id: string;
  label: string;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
}

// name the shape of what this component exposes via ref
export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  function MentionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) command(item);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-[12px] text-[#666666]">
          No members found
        </div>
      );
    }

    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md py-1 min-w-[180px] shadow-lg">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectItem(index)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[12px] ${
              index === selectedIndex
                ? "bg-[#242424] text-white"
                : "text-[#a0a0a0]"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-[#0a2a1a] text-[#00E599] text-[10px] font-medium flex items-center justify-center shrink-0">
              {item.label?.[0]?.toUpperCase() ?? "?"}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    );
  },
);
