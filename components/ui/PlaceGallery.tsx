"use client";

import { useEffect, useState } from "react";

interface PlacePhotos {
  outside?: string[];
  accessibility?: string[];
}

interface Place {
  id: string;
  name: string;
  photos?: PlacePhotos;
}

export default function PlaceGallery({
  place,
  onOpenFullscreen,
}: {
  place: Place;
  onOpenFullscreen?: (src: string) => void;
}) {
  // Собираем все фото в один массив
  const outside = place.photos?.outside ?? [];
  const access = place.photos?.accessibility ?? [];
  const allPhotos =
    outside.length || access.length
      ? [...outside, ...access]
      : [`/picture/${place.id}.jpg`];

  const [index, setIndex] = useState(0);

  // При смене места — возвращаемся на первую фотку
  useEffect(() => {
    setIndex(0);
  }, [place.id]);

  const canPrev = index > 0;
  const canNext = index < allPhotos.length - 1;

  const goPrev = () => {
    if (canPrev) setIndex((i) => i - 1);
  };

  const goNext = () => {
    if (canNext) setIndex((i) => i + 1);
  };

  const currentSrc = allPhotos[index];

  return (
    <div className="relative w-full h-full">
      {/* Основное изображение */}
      <div className="relative w-full h-[190px] md:h-full overflow-hidden">
        <img
          src={currentSrc}
          alt={place.name}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => onOpenFullscreen?.(currentSrc)}
        />

        {/* Левая стрелка */}
        {allPhotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              disabled={!canPrev}
              className={`
                absolute left-2 top-1/2 -translate-y-1/2
                rounded-full w-8 h-8 flex items-center justify-center
                bg-black/40 text-white text-lg
                disabled:bg-black/10 disabled:text-gray-400
              `}
            >
              ‹
            </button>

            {/* Правая стрелка */}
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className={`
                absolute right-2 top-1/2 -translate-y-1/2
                rounded-full w-8 h-8 flex items-center justify-center
                bg-black/40 text-white text-lg
                disabled:bg-black/10 disabled:text-gray-400
              `}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Маленькие превью снизу (скролл по горизонтали) */}
      {allPhotos.length > 1 && (
        <div className="flex gap-1 overflow-x-auto px-2 py-1 bg-white/90">
          {allPhotos.map((src, i) => (
            <button
              type="button"
              key={src + i}
              onClick={() => setIndex(i)}
              className={`
                border rounded-md overflow-hidden flex-shrink-0
                ${i === index ? "border-[#e53935]" : "border-gray-300"}
              `}
            >
              <img
                src={src}
                alt=""
                className="h-12 w-16 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
