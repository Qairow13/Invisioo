// components/chat/ChatWidget.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { MessageCircle, X } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "invisioo_chat_history_v1";

type ChatWidgetProps = {
  /**
   * Внешний контроль открытия (например, для мобилки из нижнего бара).
   * Если не передан, чат сам управляет своим состоянием (как раньше).
   */
  openExternal?: boolean;
  /**
   * Коллбек, который вызывается при изменении состояния (открыт/закрыт).
   */
  onOpenExternalChange?: (open: boolean) => void;
  /**
   * Скрыть плавающую кнопку (для мобилки с нижним баром).
   */
  hideFloatingButton?: boolean;
};

export default function ChatWidget({
  openExternal,
  onOpenExternalChange,
  hideFloatingButton,
}: ChatWidgetProps) {
  // внутреннее состояние открытия (если нет внешнего управления)
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = openExternal !== undefined;
  const open = isControlled ? !!openExternal : internalOpen;

  const setOpen = (value: boolean) => {
    if (!isControlled) {
      setInternalOpen(value);
    }
    onOpenExternalChange?.(value);
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // кнопка "Новый чат"
  const newChat = () => {
    setMessages([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // загрузка истории из localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed)) {
        setMessages(parsed);
      }
    } catch {
      // игнорируем
    }
  }, []);

  // сохранение истории
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // автоскролл вниз
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: `m_${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // готовим историю для API (без id)
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat-gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();

      if (!res.ok || !data?.message?.content) {
        throw new Error("Bad response");
      }

      const assistantMessage: ChatMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: data.message.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      const assistantMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content:
          "Упс, что-то пошло не так при обращении к модели. Попробуйте ещё раз чуть позже 🙏",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 👇 тут рисуем кнопку "Открыть вакансии", если ассистент в тексте упомянул ссылку
  const renderMessageContent = (m: ChatMessage) => {
    // Пользовательские сообщения — просто текст
    if (m.role === "user") return m.content;

    const VAC_URL = "https://invisioo.kz/vacancies";

    if (!m.content.includes(VAC_URL)) {
      return m.content;
    }

    const parts = m.content.split(VAC_URL);

    return (
      <>
        {parts.map((part, idx) => (
          <span key={idx}>
            {part}
            {idx < parts.length - 1 && (
              <a
                href={VAC_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-1 px-2 py-1 rounded-lg bg-[#177ee1] text-white text-[11px] hover:bg-[#0f6ac4]"
              >
                Открыть вакансии
              </a>
            )}
          </span>
        ))}
      </>
    );
  };

  return (
    <>
      {/* Плавающая кнопка открытия (десктоп или если не скрыта) */}
      {!hideFloatingButton && !open && (
        <button
          onClick={() => setOpen(true)}
          className="
            fixed bottom-24 right-4 z-30
            rounded-full shadow-lg
            w-12 h-12
            flex items-center justify-center
            bg-[#177ee1] hover:bg-[#0f6ac4]
            text-white
          "
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Окно чата */}
      {open && (
        <div
          className="
            fixed bottom-20 right-3 z-30
            w-[90%] max-w-xs md:max-w-sm
            bg-white rounded-2xl shadow-2xl
            flex flex-col
          "
        >
          {/* Хедер */}
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div>
              <p className="text-xs font-semibold">Invisioo · ИИ-помощник</p>
              <p className="text-[10px] text-gray-500">
                Поможет с картой и доступностью мест
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* КНОПКА НОВОГО ЧАТА */}
              <button
                onClick={newChat}
                className="text-[10px] text-[#177ee1] hover:underline"
              >
                Новый чат
              </button>

              {/* Кнопка закрытия */}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* История */}
          <div className="flex-1 px-3 py-2 overflow-y-auto max-h-72 text-xs">
            {messages.length === 0 && (
              <p className="text-gray-500 text-[11px]">
                Привет! Я могу объяснить, что значат цвета маркеров, помочь
                выбрать маршруты для разных категорий и подсказать по доступности
                мест. Напишите ваш вопрос 🙂 {/* текст не менял */}
              </p>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`mb-2 flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-2.5 py-1.5 rounded-2xl max-w-[80%] whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#177ee1] text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-900 rounded-bl-sm"
                  }`}
                >
                  {renderMessageContent(m)}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Поле ввода */}
          <div className="border-t px-3 py-2">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напишите вопрос…"
                rows={1}
                className="
                  flex-1 resize-none text-xs
                  border rounded-xl px-2 py-1
                  focus:outline-none focus:ring-1 focus:ring-[#177ee1]
                "
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className={`
                  px-3 py-1.5 rounded-xl text-xs font-semibold
                  ${
                    loading || !input.trim()
                      ? "bg-gray-200 text-gray-500"
                      : "bg-[#177ee1] hover:bg-[#0f6ac4] text-white"
                  }
                `}
              >
                {loading ? "..." : "Отпр."}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
