"use client";

import dynamic from "next/dynamic";

// грузим компонент карты ТОЛЬКО на клиенте
const AccessibilityMapAlmaty = dynamic(
  () => import("../../components/ui/AccessibilityMapAlmaty"), // поправь путь если у тебя файл в другом месте
  { ssr: false }
);

export default function Page() {
  return <AccessibilityMapAlmaty />;
}
