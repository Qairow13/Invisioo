"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

/* ---------- Категории инвалидности (как на главной карте) ---------- */

type AccessCategory =
  | "wheelchair"
  | "motor"
  | "temporary"
  | "intellectual"
  | "vision"
  | "hearing";

const ACCESS_META: Record<AccessCategory, { label: string; icon: string }> = {
  wheelchair: {
    label: "Кресло-коляска",
    icon: "/icons/categories/wheelchair.svg",
  },
  motor: {
    label: "Опорно-двигательный аппарат",
    icon: "/icons/categories/motor.svg",
  },
  temporary: {
    label: "Временно травмированные",
    icon: "/icons/categories/temporary.svg",
  },
  intellectual: {
    label: "Интеллектуальная инвалидность",
    icon: "/icons/categories/intellectual.svg",
  },
  vision: {
    label: "Нарушение зрения",
    icon: "/icons/categories/vision.svg",
  },
  hearing: {
    label: "Нарушение слуха",
    icon: "/icons/categories/hearing.svg",
  },
};

/* ---------- Вакансии ---------- */

interface Vacancy {
  id: string;
  title: string;
  salary: string;
  place: string;
  description: string;
  suitability: string;
  supports: AccessCategory[];
  applyUrl?: string; // ✅ ссылка на внешнюю вакансию (hh.kz)
}

import { VACANCIES } from "@/data/vacancies";


/* ---------- Одна строка-карточка вакансии (белая плашка с плюсом) ---------- */

function VacancyRow({ vacancy }: { vacancy: Vacancy }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3">
      {/* Верхняя «плашка» как на скрине */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-gray-200 hover:bg-gray-50 transition"
      >
        <div className="text-left">
          <p className="font-semibold text-[15px] text-black">
            {vacancy.title}
          </p>
          <p className="text-green-700 font-bold text-sm mt-1">
            {vacancy.salary}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">{vacancy.place}</p>
        </div>
        <span className="text-2xl text-gray-500">{open ? "−" : "+"}</span>
      </button>

      {/* Раскрытая часть с описанием */}
      {open && (
        <div className="mt-2 bg-white rounded-2xl border border-gray-200 p-4 text-sm text-gray-800 space-y-3">
          <p>{vacancy.description}</p>
          <p className="text-green-700 font-medium">{vacancy.suitability}</p>

          <div>
            <h4 className="text-xs font-semibold mb-1 text-gray-700">
              Кому особенно может подойти:
            </h4>
            <div className="flex flex-wrap gap-2">
              {vacancy.supports.map((s) => (
                <span
                  key={s}
                  className="text-[11px] bg-[#eef2ff] text-[#1f3bb3] rounded-full px-3 py-1 border border-[#177ee1] flex items-center gap-1"
                >
                  <Image
                    src={ACCESS_META[s].icon}
                    alt={ACCESS_META[s].label}
                    width={14}
                    height={14}
                  />
                  {ACCESS_META[s].label}
                </span>
              ))}
            </div>
          </div>

          {/* ✅ Кнопка/ссылка на hh.kz, если есть applyUrl */}
          {vacancy.applyUrl && (
            <div className="pt-2">
              <a
                href={vacancy.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-white bg-[#177ee1] hover:bg-[#177ee1] rounded-full px-4 py-2 transition"
              >
                Откликнуться 
                <span aria-hidden>↗</span>
              </a>
            </div>
          )}

          <p className="text-[11px] text-gray-400">
            Описание адаптировано под людей с инвалидностью. Условия могут
            отличаться у конкретного работодателя.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- Страница вакансий ---------- */

export default function VacanciesPage() {
  const [activeCategories, setActiveCategories] = useState<AccessCategory[]>(
    []
  );

  const toggleCategory = (id: AccessCategory) => {
    setActiveCategories((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filtered = useMemo(() => {
    if (activeCategories.length === 0) return VACANCIES;
    return VACANCIES.filter((v) =>
      activeCategories.some((cat) => v.supports.includes(cat))
    );
  }, [activeCategories]);

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Заголовок с логотипом */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#177ee1]">
          Вакансии
        </h1>
        <Image
          src="/picture/Logo.jpg"
          alt="Invisioo"
          width={110}
          height={110}
          className="rounded-xl shadow-sm"
        />
      </div>

      <p className="text-gray-700 mb-8 sm:mb-10 leading-relaxed max-w-3xl">
        Мы подбираем вакансии с учётом разных типов инвалидности. Выберите свою
        категорию, чтобы увидеть предложения, которые могут подойти именно вам.
      </p>

      {/* Фильтр по категориям доступности */}
      <section className="mb-8 sm:mb-10">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 text-[#1f3bb3]">
          Фильтр по категориям доступности
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {(Object.keys(ACCESS_META) as AccessCategory[]).map((id) => {
            const meta = ACCESS_META[id];
            const active = activeCategories.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleCategory(id)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                  active
                    ? "bg-[#177ee1] text-white border-[#177ee1]"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Image
                  src={meta.icon}
                  alt={meta.label}
                  width={22}
                  height={22}
                />
                <span className="text-sm font-medium">{meta.label}</span>
              </button>
            );
          })}
        </div>

        {activeCategories.length > 0 && (
          <button
            onClick={() => setActiveCategories([])}
            className="mt-3 text-sm text-[#1f3bb3] hover:underline"
          >
            Сбросить фильтр
          </button>
        )}
      </section>

      {/* Синий блок с вакансиями как на скрине */}
      <section>
        <div className="bg-[#e9f0ff] border border-[#3555d8] rounded-3xl shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💼</span>
            <h2 className="text-lg sm:text-xl font-bold text-[#1f3bb3]">
              Вакансии, которые могут подойти
            </h2>
          </div>

          {filtered.length === 0 && (
            <p className="text-sm text-gray-600">
              Пока нет вакансий по выбранным категориям. Попробуйте изменить
              фильтры или выбрать меньше ограничений.
            </p>
          )}

          {filtered.map((v) => (
            <VacancyRow key={v.id} vacancy={v} />
          ))}
        </div>
      </section>
    </main>
  );
}
