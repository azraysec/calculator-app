"use client";

/**
 * Feedback Button Component
 *
 * Floating button that triggers the feedback dialog (Ctrl+F).
 * Provides an accessible UI alternative to the keyboard shortcut.
 */

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";

export function FeedbackButton() {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    // Trigger Ctrl+F keyboard event to open CreateIssueDialog
    const event = new KeyboardEvent("keydown", {
      key: "f",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-200 group"
      aria-label="Send Feedback (Ctrl+F)"
      title="Send Feedback (Ctrl+F)"
    >
      <MessageSquarePlus className="w-5 h-5" />
      <span
        className={`overflow-hidden transition-all duration-200 ${
          isHovered ? "max-w-xs opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        <span className="whitespace-nowrap">Feedback</span>
      </span>
    </button>
  );
}
