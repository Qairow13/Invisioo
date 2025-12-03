"use client";

import dynamic from "next/dynamic";

// Динамический импорт карты, отключаем SSR именно для неё
const AccessibilityMapAlmaty = dynamic(
  () => import("@/components/ui/AccessibilityMapAlmaty"),
  { ssr: false }
);

import ChatWidget from "@/components/chat/ChatWidget";

export default function Page() {
  return (
    <>
      <AccessibilityMapAlmaty />
      <ChatWidget />
    </>
  );
}
