"use client";

import { useState, useRef, useEffect } from "react";
import { askGpt } from "./askGpt";
import { MessageCircle, X } from "lucide-react";

type ChatMessage = {
  id: string;
  from: "user" | "bot";
  text: string;
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
  {
    id: "welcome",
    from: "bot",
    text:
      "Привет! Я ИИ-ассистент Invisioo. Помогу с доступностью мест и с поиском работы. " +
      "Если интересуют вакансии — загляните во вкладку «Вакансии» на сайте, а я подскажу, что вам может подойти и помогу сформулировать сильные стороны. " +
      "Напишите, какая у вас категория инвалидности и что вы ищете 😊",
  },
]);

  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // автоскролл вниз
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    // добавляем сообщение пользователя
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      from: "user",
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    // спрашиваем GPT
    const replyText = await askGpt(text);

    const botMsg: ChatMessage = {
      id: `b_${Date.now()}`,
      from: "bot",
      text: replyText,
    };

    setMessages((prev) => [...prev, botMsg]);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Кнопка открытия чата (floating) */}
      {!open && (
        <button
  onClick={() => setOpen(true)}
  className="
    fixed
    z-30
    bottom-20 right-4    /* чуть выше, чтобы не мешалась нижним элементам карты */
    md:bottom-6 md:right-6
    rounded-full
    bg-[#177ee1]
    text-white
    shadow-lg
    w-12 h-12
    flex items-center justify-center
    hover:bg-[#0f6ac4]
    active:scale-95
  "
>
  <MessageCircle className="w-6 h-6" />
</button>

      )}

      {/* Сам чат */}
      {open && (
  <div
    className="
      fixed
      z-30

      /* Мобилка: снизу почти на всю ширину */
      inset-x-2 bottom-2
      w-auto

      /* Десктоп: компактный виджет справа снизу */
      md:bottom-6 md:right-6 md:left-auto md:inset-x-auto md:w-[380px]

      bg-white
      rounded-2xl
      shadow-2xl
      border border-gray-200
      flex flex-col
      overflow-hidden
    "
  >
          {/* Заголовок */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#177ee1] text-white">
            <div>
              <p className="text-sm font-semibold">Invisioo ИИ-ассистент</p>
              <p className="text-[11px] text-white/80">
                Помогу с доступностью и вакансиями
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-full hover:bg-white/15"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* История сообщений */}
          <div className="flex-1 px-3 py-2 space-y-2 overflow-y-auto max-h-80 bg-[#f5f6f7]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.from === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-2xl text-xs max-w-[80%] whitespace-pre-wrap ${
                    m.from === "user"
                      ? "bg-[#177ee1] text-white rounded-br-sm"
                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Поле ввода */}
          <div className="border-t border-gray-200 p-2 bg-white">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 resize-none outline-none focus:ring-1 focus:ring-[#177ee1]"
              placeholder="Опишите свою ситуацию или задайте вопрос…"
            />

            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className={`
                mt-2 w-full rounded-xl text-xs font-semibold py-2
                ${
                  sending || !input.trim()
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-[#177ee1] text-white hover:bg-[#0f6ac4]"
                }
              `}
            >
              {sending ? "Отправка…" : "Отправить"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
