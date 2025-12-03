"use client";
import { supabase } from "@/lib/supabaseClient";

import { useEffect, useMemo, useState, useRef } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Pencil, Save, Trash2 } from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { DivIcon, LatLngExpression, Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import ChatWidget from "@/components/chat/ChatWidget";
import PlaceGallery from "@/components/ui/PlaceGallery";
import { signIn, signOut, useSession } from "next-auth/react";

// ----- Persistent storage (localStorage) -----
const STORAGE_KEY_PLACES = "invisioo_places_v2";
const STORAGE_KEY_UI = "invisioo_ui_v2";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadPlacesFromStorage(): Place[] | null {
  if (typeof window === "undefined") return null;
  return safeParse<Place[]>(localStorage.getItem(STORAGE_KEY_PLACES));
}

function savePlacesToStorage(places: Place[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_PLACES, JSON.stringify(places));
}

type AccessCategoryId = (typeof ACCESS_CATEGORIES)[number]["id"];

type PlaceStatus = "accessible" | "partial" | "not";
type PlaceStatusFilter = PlaceStatus | "all";

type UiStatePersist = {
  active: PlaceStatusFilter;
  selectedCats: AccessCategoryId[];
  search: string;
};

function loadUiFromStorage(): UiStatePersist | null {
  if (typeof window === "undefined") return null;
  return safeParse<UiStatePersist>(localStorage.getItem(STORAGE_KEY_UI));
}

function saveUiToStorage(state: UiStatePersist) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_UI, JSON.stringify(state));
}

/* ---------- Types ---------- */

interface PlaceReview {
  id: string;
  author: string;
  rating: number; // 1–5
  text: string;
  createdAt: string;
}

interface PlacePhotos {
  outside?: string[]; // фото здания снаружи
  accessibility?: string[]; // фото доступных элементов
}

interface Place {
  id: string;
  name: string;
  category: string;
  status: PlaceStatus;
  lat: number;
  lng: number;
  address: string;
  details: string[];
  supports?: AccessCategoryId[];
  photos?: PlacePhotos;
  reviews?: PlaceReview[];

  // ✅ Оценка доступности по категориям от 1 до 10
  scores?: Partial<Record<AccessCategoryId, number>>;
  ratingSubmitted?: boolean;
}

/* ---------- NavLink ---------- */
function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`px-2 py-1 rounded-md text-[13px] md:text-[15px] transition ${
        isActive ? "text-black font-semibold" : "text-gray-700 hover:text-black"
      }`}
    >
      {children}
    </Link>
  );
}

/* ---------- Categories of users ---------- */
const ACCESS_CATEGORIES = [
  {
    id: "wheelchair",
    label: "Кресло-коляска",
    icon: "/icons/categories/wheelchair.svg",
  },
  {
    id: "motor",
    label: "Опорно-двигательный аппарат",
    icon: "/icons/categories/motor.svg",
  },
  {
    id: "temporary",
    label: "Временно травмированные",
    icon: "/icons/categories/temporary.svg",
  },
  {
    id: "intellectual",
    label: "Интеллектуальная инвалидность",
    icon: "/icons/categories/intellectual.svg",
  },
  {
    id: "vision",
    label: "Нарушение зрения",
    icon: "/icons/categories/vision.svg",
  },
  {
    id: "hearing",
    label: "Нарушение слуха",
    icon: "/icons/categories/hearing.svg",
  },
] as const;

/* ---------- Initial data ---------- */

const INITIAL_PLACES: Place[] = [
  {
    id: "PMSP",
    name: "Центр ПМСП Алмалинского район",
    category: "Поликлиника",
    status: "accessible",
    lat: 43.252745,
    lng: 76.910405,
    address: "ул. Толе би 157",
    details: [
      "Пандусы",
      "Широкие входы",
      "Доступные туалеты",
      "Дорожка для слабовидящих",
    ],
    supports: ["wheelchair", "motor", "vision", "hearing"],
    scores: {
      wheelchair: 9,
      motor: 9,
      vision: 8,
      hearing: 7,
      temporary: 9,
      intellectual: 6,
    },

    photos: {
      outside: [
        "/picture/PSMP/IMG_5623.png",
        "/picture/PSMP/IMG_5625.png",
        "/picture/PSMP/IMG_5626.png",
      ],
      accessibility: ["/picture/PSMP/IMG_5624.png", "/picture/PSMP/IMG_5622.png"],
    },
  },

  {
    id: "Hotel_Kazakhstan",
    name: "Гостиница Казахстан",
    category: "Гостиница",
    status: "accessible",
    lat: 43.244608,
    lng: 76.9575,
    address: "проспект Достык 52",
    details: ["Пандусы", "Широкие входы", "Доступные туалеты"],
    supports: ["wheelchair", "motor", "vision", "hearing"],
    scores: {
      wheelchair: 7,
      motor: 8,
      vision: 8,
      hearing: 5,
      temporary: 7,
      intellectual: 8,
    },

    photos: {
      outside: [
        "/picture/hotel/IMG_5658.png",
        "/picture/hotel/IMG_5659.png",
        "/picture/hotel/IMG_5661.png",
      ],
      accessibility: [
        "/picture/hotel/IMG_5660.png",
        "/picture/hotel/IMG_5662.png",
      ],
    },
  },

  {
    id: "hospital1",
    name: "Городская поликлинка 1",
    category: "Поликлиника",
    status: "accessible",
    lat: 43.229474,
    lng: 76.801547,
    address: "Калкаман микрорайон, 2",
    details: [
      "Пандусы",
      "Широкие входы",
      "Доступные туалеты",
      "Дорожка для слабовидящих",
    ],
    supports: ["wheelchair", "motor", "vision", "hearing"],
    scores: {
      wheelchair: 9,
      motor: 9,
      vision: 8,
      hearing: 7,
      temporary: 9,
      intellectual: 6,
    },

    photos: {
      outside: [
        "/picture/hospital1/IMG_5667.png",
        "/picture/hospital1/IMG_5665.png",
        "/picture/hospital1/IMG_5663.png",
      ],
      accessibility: [
        "/picture/hospital1/IMG_5664.png",
        "/picture/hospital1/IMG_5666.png",
      ],
    },
  },

  {
    id: "best_western_atakent",
    name: "Best Western Plus Atakent Park Hotel",
    category: "Отель",
    status: "accessible",
    lat: 43.224995,
    lng: 76.904718,
    address: "ул. Тимирязева 42 строение 10",
    details: ["Пандус у входа", "Лифт", "Широкие проходы", "Доступные номера"],
    supports: ["wheelchair", "motor"],
    scores: {
      wheelchair: 9,
      motor: 9,
      vision: 8,
      hearing: 7,
      temporary: 9,
      intellectual: 6,
    },

    photos: {
      outside: [
        "/picture/best_western_atakent/IMG_5148.jpg",
        "/picture/best_western_atakent/IMG_5149.jpg",
      ],
      accessibility: [
        "/picture/best_western_atakent/IMG_5150.jpg",
        "/picture/best_western_atakent/IMG_5151.jpg",
      ],
    },
  },

  {
    id: "atakent_mall",
    name: "Atakent Mall",
    category: "Торговый центр",
    status: "accessible",
    lat: 43.225277,
    lng: 76.908619,
    address: "ул. Тимирязева 42 к3",
    details: ["Пандусы", "Лифты", "Навигация", "Доступный санузел"],
    supports: ["wheelchair", "motor", "vision"],
    scores: {
      wheelchair: 9,
      motor: 9,
      vision: 8,
      hearing: 7,
      temporary: 9,
      intellectual: 6,
    },

    photos: {
      outside: [
        "/picture/atakent_mall/IMG_5172.jpg",
        "/picture/atakent_mall/IMG_5171.jpg",
        "/picture/atakent_mall/IMG_5164.jpg",
      ],
      accessibility: [
        "/picture/atakent_mall/IMG_5170.jpg",
        "/picture/atakent_mall/IMG_5174.jpg",
      ],
    },
  },

  {
    id: "atakent_hostel",
    name: "Atakent Hostel",
    category: "Хостел",
    status: "accessible",
    lat: 43.224794,
    lng: 76.90416,
    address: "ул. Тимирязева 42",
    details: ["Частично доступный вход", "Небольшой пандус", "Просторный холл"],
    supports: ["motor", "temporary"],
    scores: {
      wheelchair: 9,
      motor: 9,
      vision: 8,
      hearing: 7,
      temporary: 9,
      intellectual: 6,
    },

    photos: {
      outside: [
        "/picture/atakent_hostel/IMG_5154.jpg",
        "/picture/atakent_hostel/IMG_5155.jpg",
        "/picture/atakent_hostel/IMG_5156.jpg",
      ],
      accessibility: [
        "/picture/atakent_hostel/IMG_5158.jpg",
        "/picture/atakent_hostel/IMG_5157.jpg",
      ],
    },
  },

  {
    id: "bank_center_credit",
    name: "Bank CenterCredit",
    category: "Банк",
    status: "accessible",
    lat: 43.225598,
    lng: 76.904924,
    address: "ул. Тимирязева 42",
    details: ["Пандус", "Ровный вход", "Навигация внутри отделения"],
    supports: ["wheelchair", "motor", "vision"],
    scores: {
      wheelchair: 9,
      motor: 9,
      vision: 8,
      hearing: 7,
      temporary: 9,
      intellectual: 6,
    },

    photos: {
      outside: [
        "/picture/bank_center_credit/IMG_5179.jpg",
        "/picture/bank_center_credit/IMG_5180.jpg",
        "/picture/bank_center_credit/IMG_5181.jpg",
      ],
      accessibility: [
        "/picture/bank_center_credit/IMG_5182.jpg",
        "/picture/bank_center_credit/IMG_5146.jpg",
        "/picture/bank_center_credit/IMG_5178.jpg",
      ],
    },
  },

  {
    id: "Zhibek_zholy",
    name: "ZHibek Zholy",
    category: "Торговый-центр",
    status: "partial",
    lat: 43.261362,
    lng: 76.929122,
    address: "проспект Жибек Жолы 135",
    details: ["Небольшой пандус", "Широкий вход"],

    supports: ["motor", "temporary"],
    scores: {
      wheelchair: 9,
      motor: 9,
      vision: 8,
      hearing: 7,
      temporary: 9,
      intellectual: 6,
    },

    photos: {
      outside: [
        "/picture/Zhibek_zholy/IMG_5618.png",
        "/picture/Zhibek_zholy/IMG_5621.png",
        "/picture/Zhibek_zholy/IMG_5619.png",
      ],
      accessibility: [
        "/picture/Zhibek_zholy/IMG_5617.png",
        "/picture/Zhibek_zholy/IMG_5620.png",
      ],
    },
  },

  {
    id: "hospital16",
    name: "Городская поликлиника 16",
    category: "Поликлинника",
    status: "accessible",
    lat: 43.220474,
    lng: 76.86514,
    address: "Аксай 2 микрорайон, 69а",
    details: ["Лифт", "Пандус", "Удобные коридоры"],
    supports: ["wheelchair", "motor"],
    scores: {
      wheelchair: 9,
      motor: 9,
      vision: 8,
      hearing: 7,
      temporary: 9,
      intellectual: 6,
    },

    photos: {
      outside: [
        "/picture/hospital16/IMG_5668.png",
        "/picture/hospital16/IMG_5669.png",
        "/picture/hospital16/IMG_5670.png",
      ],
      accessibility: [
        "/picture/hospital16/IMG_5671.png",
        "/picture/hospital16/IMG_5672.png",
      ],
    },
  },

  {
    id: "dostyq_plaza",
    name: "Достык Плаза",
    category: "Торговый центр",
    status: "accessible",
    lat: 43.233057,
    lng: 76.957123,
    address: "ул. Самал-2, 111",
    details: ["Лифт", "Пандус", "Удобные коридоры"],
    supports: ["wheelchair", "motor"],
    scores: {
      wheelchair: 9,
      motor: 9,
      vision: 8,
      hearing: 7,
      temporary: 9,
      intellectual: 6,
    },

    photos: {
      outside: [
        "/picture/dostyq_plaza/IMG_5653.png",
        "/picture/dostyq_plaza/IMG_5655.png",
        "/picture/dostyq_plaza/IMG_5654.png",
      ],
      accessibility: [
        "/picture/dostyq_plaza/IMG_5656.png",
        "/picture/dostyq_plaza/IMG_5657.png",
      ],
    },
  },

  {
    id: "moscow",
    name: "ТРЦ Москва",
    category: "Торговый центр",
    status: "accessible",
    lat: 43.227807,
    lng: 76.864544,
    address: "8-й микрорайон, 37/1",
    details: ["Лифт", "Пандус", "Удобные коридоры"],
    supports: ["wheelchair", "motor"],
    photos: {
      outside: [
        "/picture/moscow/IMG_5673.png",
        "/picture/moscow/IMG_5676.png",
        "/picture/moscow/IMG_5677.png",
      ],
      accessibility: [
        "/picture/moscow/IMG_5674.png",
        "/picture/moscow/IMG_5675.png",
      ],
    },
  },

  {
    id: "mega_park",
    name: "Мега парк",
    category: "Торговый центр",
    status: "partial",
    lat: 43.263743,
    lng: 76.928687,
    address: "ул. Сейфулина 483",
    details: ["Частично ровные дорожки", "Навигация"],
    supports: ["vision"],
    photos: {
      outside: [
        "/picture/mega_park/IMG_5651.png",
        "/picture/mega_park/IMG_5652.png",
        "/picture/mega_park/IMG_5649.png",
      ],
      accessibility: [
        "/picture/mega_park/IMG_5648.png",
        "/picture/mega_park/IMG_5650.png",
      ],
    },
  },
];

/* ---------- Helpers ---------- */
const pinColor = (s: PlaceStatus) =>
  s === "accessible" ? "#16a34a" : s === "partial" ? "#f59e0b" : "#ef4444";

const pinIcon = (place: Place) => {
  const color = pinColor(place.status);

  const html = `
    <div style="
      width: 26px;
      height: 26px;
      background:white;
      border:2px solid ${color};
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 4px 10px rgba(0,0,0,.15);
    ">
      <span style="font-size:14px;">📍</span>
    </div>
  `;

  return new DivIcon({
    className: "",
    html,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -20],
  });
};
const mobilePinIcon = (place: Place) => {
  const color = pinColor(place.status);

  const html = `
    <div style="
      width:16px;
      height:16px;
      border-radius:50%;
      border:2px solid ${color};
      background:white;
      box-shadow:0 0 0 2px rgba(0,0,0,0.18);
    "></div>
  `;

  return new DivIcon({
    className: "",
    html,
    iconSize: [16, 16],
    iconAnchor: [8, 16],
  });
};

// Синяя точка для пользователя
const userIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function FlyTo({ center }: { center: LatLngExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 15, { duration: 0.8 });
  }, [center, map]);
  return null;
}

function AddMarkerOnClick({
  enabled,
  onAdd,
}: {
  enabled: boolean;
  onAdd: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onAdd(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type RouteProfile = "wheelchair" | "vision" | "hearing" | null;

function Routing({
  from,
  to,
  profile,
}: {
  from: LatLngExpression | null;
  to: LatLngExpression | null;
  profile: RouteProfile;
}) {
  const map = useMap();

  const controlRef = useRef<any | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    async function init() {
      await import("leaflet-routing-machine");
      if (cancelled) return;

      const LRouting = (L as any).Routing;

      // безопасный патч _clearLines
      if (
        LRouting?.Line?.prototype &&
        !(LRouting.Line.prototype as any)._safePatched
      ) {
        const originalClear = LRouting.Line.prototype._clearLines;

        LRouting.Line.prototype._clearLines = function (...args: any[]) {
          if (!this._map) return;
          try {
            return originalClear.apply(this, args);
          } catch (e) {
            console.warn("Safe _clearLines error:", e);
          }
        };

        (LRouting.Line.prototype as any)._safePatched = true;
      }

      const control = LRouting.control({
        waypoints: [],
        lineOptions: {
          styles: [{ color: "#177ee1", weight: 5 }],
        },
        addWaypoints: false,
        draggableWaypoints: false,
        routeWhileDragging: false,
        show: false,
        createMarker: function (_i: number, wp: any) {
          return L.marker(wp.latLng, {
            icon: L.divIcon({
              className: "route-dot",
              html: `
                <div style="
                  width: 14px;
                  height: 14px;
                  background: #1976ff;
                  border-radius: 50%;
                  border: 2px solid white;
                  box-shadow: 0 0 0 2px rgba(25,118,255,0.4);
                "></div>
              `,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
          });
        },
      }).addTo(map);

      controlRef.current = control;

      control.on("routesfound", (e: any) => {
        const route = e.routes?.[0];
        if (!route) return;

        const color =
          profile === "wheelchair"
            ? "#22c55e"
            : profile === "vision"
            ? "#3b82f6"
            : profile === "hearing"
            ? "#a855f7"
            : "#e53935";

        const line = (control as any)._line;
        if (line && line.setStyle) {
          line.setStyle({ color, weight: 5 });
        }

        if (profile === "vision" && "speechSynthesis" in window) {
          let text = "Маршрут построен. Следуйте по выделенному пути.";

          const instructions: string[] =
            route.instructions?.map((ins: any) => ins.text) ??
            route?.legs?.[0]?.steps?.map(
              (s: any) => s.maneuver?.instruction
            ) ??
            [];

          if (instructions.length > 0) {
            text +=
              " " +
              instructions
                .slice(0, 5)
                .filter(Boolean)
                .join(". ");
          }

          window.speechSynthesis.cancel();
          const utt = new SpeechSynthesisUtterance(text);
          utt.lang = "ru-RU";
          utt.rate = 1;
          utteranceRef.current = utt;
          window.speechSynthesis.speak(utt);
        }
      });

      control.on("routingerror", (e: any) => {
        console.error("Routing error:", e);
        alert(
          "Не удалось построить маршрут на карте. Попробуйте кнопку «Открыть в Google Maps»."
        );
      });
    }

    init();

    return () => {
      cancelled = true;

      if (controlRef.current && (controlRef.current as any)._map) {
        map.removeControl(controlRef.current);
      }
      controlRef.current = null;

      if (utteranceRef.current && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [map]);

  useEffect(() => {
    const control = controlRef.current;
    if (!control) return;

    if (!from || !to || !profile) {
      control.setWaypoints([]);
      return;
    }

    const fromLL = L.latLng(from as any);
    const toLL = L.latLng(to as any);

    control.setWaypoints([fromLL, toLL]);
  }, [from, to, profile]);

  return null;
}

// Вкладки
type PlaceTab = "info" | "access" | "reviews";

/* ---------- Вакансия (элемент) ---------- */
function VacancyItem({
  title,
  salary,
  url,
}: {
  title: string;
  salary: string;
  url: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadVacancy = async () => {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);

    if (text || error) return;

    setLoading(true);

    try {
      const r = await fetch("/api/vacancy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await r.json();

      if (!data.text) throw new Error("Описание не найдено");

      setText(data.text);
    } catch (e) {
      setError("Не удалось загрузить вакансию.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-3">
      <button
        onClick={loadVacancy}
        className="w-full flex justify-between items-center bg.white px-3 py-2 rounded-xl border hover:bg-gray-50"
      >
        <div>
          <p className="font-semibold text-[14px] md:text-[15px]">{title}</p>
          <p className="text-green-700 font-bold text-sm">{salary}</p>
        </div>
        <span className="text-xl">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-2 bg-white border rounded-xl p-3 text-sm max-h-52 overflow-y-auto">
          {loading && (
            <p className="text-gray-500 text-xs">Загрузка вакансии…</p>
          )}
          {error && <p className="text-red-500 text-xs">{error}</p>}
          {!loading && !error && (
            <p className="whitespace-pre-wrap text-gray-800">{text}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Component ---------- */
export default function AccessibilityMapAlmaty() {
  const { data: session, status } = useSession();

  const [places, setPlaces] = useState<Place[]>(INITIAL_PLACES);
  const [active, setActive] = useState<PlaceStatusFilter>("accessible");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState("");
  const [flyTo, setFlyTo] = useState<LatLngExpression | null>(null);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectedCats, setSelectedCats] = useState<AccessCategoryId[]>([]);

  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(
    null
  );

  const [highContrast, setHighContrast] = useState(false);
  const [blindMode, setBlindMode] = useState(false);

  const [routeToId, setRouteToId] = useState<string | null>(null);
  const [routeProfile, setRouteProfile] = useState<RouteProfile>(null);

  const [activePlaceTab, setActivePlaceTab] = useState<PlaceTab>("access");

  const [newReviewText, setNewReviewText] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);

  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);

  const [ratings, setRatings] = useState<
    Partial<Record<AccessCategoryId, number>>
  >({});
  const [ratingLoading, setRatingLoading] = useState(false);
const [mobileAccessLegendOpen, setMobileAccessLegendOpen] = useState(false);

  const [browserId, setBrowserId] = useState<string | null>(null);

  // 👇 флаг мобилки
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const check = () => {
      setIsMobile(window.innerWidth < 768);
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // уникальный id для рейтингов
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "invisioo_browser_id";

    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    setBrowserId(id);
  }, []);

  const currentUserId = session?.user?.email ?? browserId;

  // ---- init from localStorage ----
  useEffect(() => {
    const savedPlaces = loadPlacesFromStorage();
    if (savedPlaces && Array.isArray(savedPlaces) && savedPlaces.length) {
      setPlaces(savedPlaces);
    }
    const savedUi = loadUiFromStorage();
    if (savedUi) {
      setActive(savedUi.active as PlaceStatusFilter);
      setSelectedCats(savedUi.selectedCats || []);
      setSearch(savedUi.search || "");
    }
  }, []);

  // сброс вкладки при смене места
  useEffect(() => {
    setActivePlaceTab("access");
    setNewReviewText("");
    setNewReviewRating(5);
  }, [selectedId]);

  // авто геолокация при загрузке
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const latlng: LatLngExpression = [latitude, longitude];
        setUserLocation(latlng);
        setFlyTo(latlng);
      },
      () => {
        // игнорируем
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  // автосохранение пинов
  useEffect(() => {
    const t = setTimeout(() => savePlacesToStorage(places), 400);
    return () => clearTimeout(t);
  }, [places]);

  // автосохранение UI-фильтров
  useEffect(() => {
    const t = setTimeout(
      () => saveUiToStorage({ active, selectedCats, search }),
      300
    );
    return () => clearTimeout(t);
  }, [active, selectedCats, search]);

  // поиск + фильтры статуса + категории пользователей
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return places.filter((p) => {
      if (active !== "all" && p.status !== active) return false;

      if (q) {
        const hay = `${p.name} ${p.category} ${p.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (selectedCats.length === 0) return true;
      if (!p.supports || p.supports.length === 0) return true;

      return selectedCats.every((c) => p.supports!.includes(c));
    });
  }, [places, active, search, selectedCats]);

  // прыжок к первому совпадению
  useEffect(() => {
    if (!search) return;
    const hit = visible[0];
    if (hit) setFlyTo([hit.lat, hit.lng]);
  }, [search, visible]);

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === selectedId) || null,
    [places, selectedId]
  );

  useEffect(() => {
    if (!selectedPlace) {
      setRatings({});
      return;
    }

    const loadRatings = async () => {
      setRatingLoading(true);

      const { data, error } = await supabase
        .from("place_ratings")
        .select("category, score")
        .eq("place_id", selectedPlace.id);

      if (error) {
        console.error("Ошибка загрузки рейтингов:", error);
        setRatingLoading(false);
        return;
      }

      const grouped: Record<
        AccessCategoryId,
        { sum: number; count: number }
      > = {} as any;

      (data ?? []).forEach((row: any) => {
        const cat = row.category as AccessCategoryId;
        if (!grouped[cat]) {
          grouped[cat] = { sum: 0, count: 0 };
        }
        grouped[cat].sum += row.score;
        grouped[cat].count += 1;
      });

      const map: Partial<Record<AccessCategoryId, number>> = {};
      (Object.keys(grouped) as AccessCategoryId[]).forEach((cat) => {
        const { sum, count } = grouped[cat];
        map[cat] = +(sum / count).toFixed(1);
      });

      setRatings(map);
      setRatingLoading(false);
    };

    loadRatings();
  }, [selectedPlace?.id]);

  const routeToPlace = useMemo(
    () => (routeToId ? places.find((p) => p.id === routeToId) || null : null),
    [routeToId, places]
  );

  const updatePlace = (id: string, patch: Partial<Place>) =>
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const removePlace = (id: string) =>
    setPlaces((prev) => prev.filter((p) => p.id !== id));

  const setPlaceRating = async (
    placeId: string,
    category: AccessCategoryId,
    score: number
  ) => {
    if (!currentUserId) {
      alert(
        "Не удалось определить пользователя. Обновите страницу и попробуйте ещё раз."
      );
      return;
    }

    try {
      setRatingLoading(true);

      const { error } = await supabase
        .from("place_ratings")
        .upsert(
          {
            place_id: placeId,
            category,
            score,
            user_id: currentUserId,
          },
          {
            onConflict: "place_id,category,user_id",
          }
        );

      if (error) {
        console.error("Ошибка сохранения рейтинга:", error.message ?? error);
        alert("Не удалось сохранить оценку. Попробуйте позже.");
      } else {
        setRatings((prev) => ({
          ...prev,
          [category]: score,
        }));
      }
    } finally {
      setRatingLoading(false);
    }
  };

  const addPlaceAt = (lat: number, lng: number) => {
    const newP: Place = {
      id: `new_${Date.now()}`,
      name: "Новое место",
      category: "Категория",
      status: "accessible",
      lat,
      lng,
      address: "Добавьте адрес",
      details: ["Добавьте характеристики"],
    };
    setPlaces((prev) => [...prev, newP]);
    setSelectedId(newP.id);
  };

  const addReview = (placeId: string) => {
    const text = newReviewText.trim();
    if (!text) {
      alert("Напишите, пожалуйста, отзыв");
      return;
    }
    const review: PlaceReview = {
      id: `rev_${Date.now()}`,
      author: "Анонимно",
      rating: newReviewRating,
      text,
      createdAt: new Date().toISOString(),
    };
    setPlaces((prev) =>
      prev.map((p) =>
        p.id === placeId ? { ...p, reviews: [...(p.reviews ?? []), review] } : p
      )
    );
    setNewReviewText("");
    setNewReviewRating(5);
  };

  const rootBg = highContrast ? "bg-black text-white" : "bg-[#f5f6f7]";

  return (
    <div className={`relative w-full h-[100dvh] md:h-screen ${rootBg}`}>
      {/* Плавающий чат ИИ */}
      <ChatWidget />

      {/* Хедер / панель справа как 2ГИС */}
        {!isMobile && (
  <div
    className="
      absolute
      z-20
      flex flex-col
      gap-3
      bg-white/90 backdrop-blur-md
      rounded-2xl
      px-3 py-3
      shadow-[0_8px_20px_rgba(0,0,0,0.12)]
      
      top-3 right-3 w-[260px]
    "
  >

        {/* Лого + язык */}
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="transition-transform hover:scale-105">
            <Image
              src="/picture/Logo.jpg"
              alt="Invisioo"
              width={72}
              height={72}
              priority
            />
          </Link>

          <select className="bg-white border border-gray-200 rounded-xl px-2 py-1 text-[12px]">
            <option>Русский</option>
            <option>Қазақша</option>
            <option>English</option>
          </select>
        </div>

        {/* Поиск */}
        <div className="flex items-center bg-white border border-gray-200 rounded-xl px-2 py-1 gap-1 shadow-sm">
          <Search size={14} className="text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск места, категории или адреса"
            className="w-full outline-none text-[12px] bg-transparent"
          />
        </div>

        {/* Вход + подписка */}
        <div className="flex gap-2">
          {status === "authenticated" ? (
            <Button
              onClick={() => signOut()}
              className="flex-1 justify-center rounded-xl text-[11px] font-semibold bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 px-2 py-1"
            >
              Выйти (
              {session?.user?.name ?? session?.user?.email ?? "аккаунт"})
            </Button>
          ) : (
            <Button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="flex-1 justify-center rounded-xl text-[11px] font-semibold bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 px-2 py-1"
            >
              Войти через Google
            </Button>
          )}

          <Button
            className="rounded-xl bg-[#177ee1] hover:bg-[#0f6ac4] text-white text-[11px] px-2 py-1"
            onClick={() => {
              const phone = "77052268473";
              const text = encodeURIComponent(
                "Здравствуйте! Хочу оформить подписку.\n\n"
              );

              window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
            }}
          >
            Подписки
          </Button>
        </div>

        {/* Навигация */}
        <div className="flex flex-wrap gap-2 text-[11px] border-t border-gray-200 pt-2">
          <NavLink href="/contacts">Контакты</NavLink>
          <NavLink href="/vacancies">
            <span className="font-bold text-[#177ee1]">Вакансии</span>
          </NavLink>
        </div>
      </div>
 )}
      {/* Фильтры доступности + гео + правка */}
        {!isMobile && (
  <div
    className="
      absolute
      z-10
      flex flex-col
      gap-2
      bg-white/95 backdrop-blur-md
      rounded-2xl
      px-3 py-2
      shadow-md
      top-[270px] right-3 w-[260px]
    "
  >

        <span className="text-[12px] text-gray-700">Показать доступность:</span>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActive("all")}
            className={`px-2 py-1 rounded-xl border text-[11px] font-medium transition ${
              active === "all"
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Все
          </button>

          <button
            onClick={() => setActive("accessible")}
            className={`px-2 py-1 rounded-xl border text-[11px] font-medium transition ${
              active === "accessible"
                ? "bg-green-500 text-white border-green-500"
                : "bg-white border-gray-300 text-green-600 hover:bg-green-50"
            }`}
          >
            🟢 Доступно
          </button>

          <button
            onClick={() => setActive("partial")}
            className={`px-2 py-1 rounded-xl border text-[11px] font-medium transition ${
              active === "partial"
                ? "bg-yellow-400 text-white border-yellow-400"
                : "bg-white border-gray-300 text-yellow-500 hover:bg-yellow-50"
            }`}
          >
            🟡 Частично
          </button>

          <button
            onClick={() => setActive("not")}
            className={`px-2 py-1 rounded-xl border text-[11px] font-medium transition ${
              active === "not"
                ? "bg-red-500 text-white border-red-500"
                : "bg-white border-gray-300 text-red-500 hover:bg-red-50"
            }`}
          >
            🔴 Недоступно
          </button>
        </div>

        {/* Режим правки — только десктоп */}
        <div className="hidden md:flex flex-wrap gap-2 mt-1">
          <Button
            onClick={() => setEditMode(!editMode)}
            className={`flex-1 px-2 py-1 rounded-xl text-[11px] font-semibold transition ${
              editMode
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            {editMode ? (
              <>
                <Save className="mr-1 h-4 w-4" /> Правка: ВКЛ
              </>
            ) : (
              <>
                <Pencil className="mr-1 h-4 w-4" /> Режим правки
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-1">
          <Button
            onClick={() => setCategoryOpen(true)}
            className="flex-1 px-2 py-1 rounded-xl text-[11px] font-semibold bg-white text-gray-800 border hover:bg-gray-50"
          >
            Категория
          </Button>
        </div>

        <Button
          onClick={() => {
            if (typeof window === "undefined") return;
            if (!navigator.geolocation) {
              alert("Ваш браузер не поддерживает геолокацию");
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const { latitude, longitude } = pos.coords;
                const latlng: LatLngExpression = [latitude, longitude];
                setUserLocation(latlng);
                setFlyTo(latlng);
              },
              () => alert("Не удалось определить местоположение"),
              { enableHighAccuracy: true }
            );
          }}
          className="mt-1 w-full px-2 py-1 rounded-xl text-[11px] font-semibold bg-[#177ee1] text-white hover:bg-[#146fca]"
        >
          Мое местоположение
        </Button>
      </div>
      
        )}
        {/* Мобильная кнопка — показать, что значат статусы и категории доступности */}
{isMobile && (
  <button
    type="button"
    onClick={() => setMobileAccessLegendOpen(true)}
    className="
      mt-2
      w-full
      md:hidden
      rounded-xl border border-gray-200
      bg-white hover:bg-gray-50
      text-[11px]
      py-2
      flex items-center justify-center gap-2
    "
  >
    <span>👁 Показать доступности (значение цветов и иконок)</span>
  </button>
)}

      {/* Map */}
      <MapContainer
        center={[43.238949, 76.889709]}
        zoom={13}
        className={`w-full h-full z-0 ${
          blindMode ? "text-[18px]" : "text-[14px]"
        }`}
      >
        <TileLayer
          attribution="&copy; 2GIS"
          url="https://tile2.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1"
        />

        <FlyTo center={flyTo} />

        <Routing
          from={userLocation}
          to={routeToPlace ? [routeToPlace.lat, routeToPlace.lng] : null}
          profile={routeProfile}
        />

        {userLocation && <Marker position={userLocation} icon={userIcon} />}

       {visible.map((p) => (
  <Marker
    key={p.id}
    position={[p.lat, p.lng]}
    icon={isMobile ? mobilePinIcon(p) : pinIcon(p)}
    draggable={editMode}
    eventHandlers={{
      click: () => setSelectedId(p.id),
      dragend: (e) => {
        if (!editMode) return;
        const ll = e.target.getLatLng();
        updatePlace(p.id, { lat: ll.lat, lng: ll.lng });
      },
    }}
  />
))}


        <AddMarkerOnClick enabled={editMode} onAdd={addPlaceAt} />
      </MapContainer>

      {/* Нижняя строка (десктоп) */}
      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bottom-4 w-[82%] max-w-[1400px] z-10 items-center justify-between">
        <div className="flex gap-2"></div>
        <span className="text-xs text-white/90 drop-shadow">
          © Invisioo · Условия использования
        </span>
      </div>
{/* Мобильный футбар как в 2ГИС */}
{isMobile && !selectedPlace && (
  <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 w-[94%]">
    <div className="flex items-center justify-between bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.12)] px-3 py-2 gap-2">
      
      {/* Лого / Домой */}
      <button
        className="flex flex-col items-center flex-1 text-[10px] text-gray-700"
        onClick={() => setFlyTo([43.238949, 76.889709])}
      >
        <span className="text-xl">🏠</span>
        <span>Главная</span>
      </button>

      {/* Поиск */}
      <button
        className="flex flex-col items-center flex-1 text-[10px] text-gray-700"
        onClick={() => {
          // фокус на поиске: просто скроллим вверх,
          // или можно повесить ref на input, если хочешь прям фокус
          const el = document.getElementById("mobile-search-input");
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          (el as HTMLInputElement | null)?.focus();
        }}
      >
        <span className="text-xl">🔎</span>
        <span>Поиск</span>
      </button>

      {/* Фильтры доступности */}
      <button
        className="flex flex-col items-center flex-1 text-[10px] text-gray-700"
        onClick={() => setCategoryOpen(true)}
      >
        <span className="text-xl">♿</span>
        <span>Категории</span>
      </button>

      {/* Мое местоположение */}
      <button
        className="flex flex-col items-center flex-1 text-[10px] text-gray-700"
        onClick={() => {
          if (typeof window === "undefined") return;
          if (!navigator.geolocation) {
            alert("Ваш браузер не поддерживает геолокацию");
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              const latlng: LatLngExpression = [latitude, longitude];
              setUserLocation(latlng);
              setFlyTo(latlng);
            },
            () => alert("Не удалось определить местоположение"),
            { enableHighAccuracy: true }
          );
        }}
      >
        <span className="text-xl">📍</span>
        <span>Я здесь</span>
      </button>
    </div>
  </div>
)}

      {/* Карточка места */}
      {selectedPlace && (
        <div
          className="
            absolute
            bottom-0 md:bottom-4
            left-1/2 -translate-x-1/2
            w-full md:w-[92%]
            max-w-3xl
            z-20
            px-2 md:px-0
          "
        >
          <Card className="rounded-t-3xl md:rounded-2xl shadow-2xl border-0 bg-white">
            <CardContent className="p-0">
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                {[
                  { id: "info", label: "Об объекте" },
                  { id: "access", label: "Доступность" },
                  { id: "reviews", label: "Отзывы" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActivePlaceTab(tab.id as PlaceTab)}
                    className={`flex-1 text-xs md:text-sm py-3 text-center font-medium border-b-2 ${
                      activePlaceTab === tab.id
                        ? "border-[#177ee1] text-[#177ee1]"
                        : "border-transparent text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable body */}
              <div className="max-h-[70vh] md:max-h-[65vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
                  {/* Left: gallery */}
<div className="bg-gray-100 flex flex-col h-auto min-h-[140px] md:h-full">
                    <PlaceGallery
                      place={selectedPlace}
                      onOpenFullscreen={(src) => setFullscreenPhoto(src)}
                    />
                  </div>

                  {/* Right: content */}
                  <div className="p-3 md:p-4 space-y-3">
                    {/* Title & status */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="text-base md:text-lg font-semibold">
                          {selectedPlace.name}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600">
                          {selectedPlace.category} · {selectedPlace.address}
                        </p>
                      </div>
                      <span
                        className={`px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-semibold ${
                          selectedPlace.status === "accessible"
                            ? "bg-green-100 text-green-700"
                            : selectedPlace.status === "partial"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {selectedPlace.status === "accessible" && "ДОСТУПНО"}
                        {selectedPlace.status === "partial" && "ЧАСТИЧНО"}
                        {selectedPlace.status === "not" && "НЕДОСТУПНО"}
                      </span>
                    </div>

                    {/* TAB: INFO */}
                    {activePlaceTab === "info" && (
                      <div className="space-y-2 text-xs md:text-sm">
                        <p className="text-gray-800">
                          <b>Категория:</b> {selectedPlace.category}
                        </p>
                        <p className="text-gray-800">
                          <b>Адрес:</b> {selectedPlace.address}
                        </p>

                        <div>
                          <h4 className="text-xs md:text-sm font-semibold mb-1">
                            Для кого подходит:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {(selectedPlace.supports ?? []).map((id) => {
                              const meta = ACCESS_CATEGORIES.find(
                                (c) => c.id === id
                              );
                              if (!meta) return null;
                              return (
                                <span
                                  key={id}
                                  className="text-[11px] bg-gray-100 rounded-full px-3 py-1 border flex items-center gap-1"
                                >
                                  <img
                                    src={meta.icon}
                                    className="w-4 h-4"
                                    alt=""
                                  />
                                  {meta.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB: REVIEWS */}
                    {activePlaceTab === "reviews" && (
                      <div className="space-y-3 text-xs">
                        <h4 className="text-sm font-semibold">Отзывы</h4>

                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                          {(selectedPlace.reviews ?? []).map((rev) => (
                            <div
                              key={rev.id}
                              className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50"
                            >
                              <div className="flex justify-between mb-1">
                                <span className="font-semibold">
                                  {rev.author}
                                </span>
                                <span className="text-yellow-500">
                                  {"★".repeat(rev.rating)}
                                </span>
                              </div>
                              <p>{rev.text}</p>
                            </div>
                          ))}

                          {(selectedPlace.reviews ?? []).length === 0 && (
                            <p className="text-xs text-gray-500">
                              Пока нет отзывов. Будьте первым.
                            </p>
                          )}
                        </div>

                        <div className="border rounded-xl p-3 bg-white">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-600">
                              Ваша оценка:
                            </span>
                            <select
                              className="border rounded-lg px-2 py-1 text-xs"
                              value={newReviewRating}
                              onChange={(e) =>
                                setNewReviewRating(Number(e.target.value))
                              }
                            >
                              {[5, 4, 3, 2, 1].map((r) => (
                                <option key={r} value={r}>
                                  {r}★
                                </option>
                              ))}
                            </select>
                          </div>

                          <textarea
                            className="w-full border rounded-lg px-3 py-2 text-xs resize-none h-20"
                            placeholder="Ваш отзыв…"
                            value={newReviewText}
                            onChange={(e) => setNewReviewText(e.target.value)}
                          />

                          <Button
                            className="mt-2 w-full bg-[#e53935] text-white rounded-xl text-xs"
                            onClick={() => addReview(selectedPlace.id)}
                          >
                            Отправить
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* TAB: ACCESS */}
                    {activePlaceTab === "access" && (
                      <div className="space-y-3 text-xs md:text-sm">
                        <div className="bg-[#fff7f0] border border-[#007BFF] rounded-xl p-3">
                          <h4 className="text-sm font-semibold text-[#007BFF] mb-1">
                            ♿ Условия
                          </h4>
                          <p className="text-sm text-gray-900">
                            {selectedPlace.details.join(", ")}
                          </p>
                        </div>

                        {/* Средние оценки по категориям */}
                        <div className="bg-white border border-gray-200 rounded-xl p-3">
                          <h4 className="text-sm font-semibold mb-2">
                            Оценка доступности по категориям (1–10)
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {ACCESS_CATEGORIES.map((c) => {
                              const score =
                                ratings[c.id as AccessCategoryId] ?? null;

                              const colorClass =
                                !score
                                  ? "bg-gray-100 text-gray-500 border-gray-200"
                                  : score >= 8
                                  ? "bg-green-100 text-green-700 border-green-300"
                                  : score >= 5
                                  ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                  : "bg-red-100 text-red-700 border-red-300";

                              return (
                                <div
                                  key={c.id}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] ${colorClass}`}
                                >
                                  <img
                                    src={c.icon}
                                    alt=""
                                    className="w-4 h-4"
                                  />
                                  <span>{c.label}</span>
                                  <span className="font-semibold">
                                    {score ? `${score}/10` : "—"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

{(selectedPlace.photos?.accessibility?.length ?? 0) > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">
                              Элементы доступности:
                            </h4>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {(selectedPlace.photos?.accessibility ?? []).map((src) => (

                                <img
                                  key={src}
                                  src={src}
                                  className="h-16 w-24 sm:h-20 sm:w-28 rounded-xl object-cover"
                                  alt=""
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Оценка доступности пользователем */}
                        <div className="border rounded-xl p-3 bg-white">
                          <h4 className="text-sm font-semibold mb-2">
                            Оцените доступность для разных категорий (1–10)
                          </h4>

                          {ratingLoading && (
                            <p className="text-xs text-gray-500 mb-2">
                              Загружаем / сохраняем оценки…
                            </p>
                          )}

                          <div className="space-y-2">
                            {ACCESS_CATEGORIES.map((cat) => {
                              const current =
                                ratings[cat.id as AccessCategoryId] ?? null;

                              return (
                                <div
                                  key={cat.id}
                                  className="flex items-center justify-between gap-2 text-[11px]"
                                >
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={cat.icon}
                                      alt=""
                                      className="w-4 h-4"
                                    />
                                    <span>{cat.label}</span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: 10 }).map((_, i) => {
                                      const value = i + 1;
                                      const active =
                                        current !== null && value <= current;
                                      return (
                                        <button
                                          key={value}
                                          type="button"
                                          onClick={() =>
                                            selectedPlace &&
                                            setPlaceRating(
                                              selectedPlace.id,
                                              cat.id as AccessCategoryId,
                                              value
                                            )
                                          }
                                          className={`w-5 h-5 rounded-full text-[10px] border flex items-center justify-center
                                            ${
                                              active
                                                ? "bg-[#177ee1] text-white border-[#177ee1]"
                                                : "border-gray-300 text-gray-600 hover:bg-gray-100"
                                            }`}
                                        >
                                          {value}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <p className="mt-2 text-[10px] text-gray-400">
                            Эти оценки помогают другим людям с инвалидностью
                            выбирать более удобные места.
                          </p>

                          {/* Кнопки отправки/изменения */}
                          <div className="mt-3 flex gap-2 flex-wrap">
                            {Object.keys(ratings).length > 0 &&
                              !selectedPlace.ratingSubmitted && (
                                <Button
                                  className="flex-1 bg-[#177ee1] text-white rounded-xl text-[11px]"
                                  onClick={async () => {
                                    if (!selectedPlace) return;

                                    for (const cat of Object.keys(ratings)) {
                                      await setPlaceRating(
                                        selectedPlace.id,
                                        cat as AccessCategoryId,
                                        ratings[
                                          cat as AccessCategoryId
                                        ] as number
                                      );
                                    }

                                    updatePlace(selectedPlace.id, {
                                      ratingSubmitted: true,
                                    });
                                    alert("Спасибо! Ваша оценка сохранена 🙌");
                                  }}
                                >
                                  Отправить оценку
                                </Button>
                              )}

                            {selectedPlace.ratingSubmitted && (
                              <Button
                                className="flex-1 bg-yellow-500 text-white rounded-xl text-[11px]"
                                onClick={() => {
                                  updatePlace(selectedPlace.id, {
                                    ratingSubmitted: false,
                                  });
                                }}
                              >
                                Изменить оценку
                              </Button>
                            )}

                            {Object.keys(ratings).length > 0 &&
                              !selectedPlace.ratingSubmitted && (
                                <Button
                                  className="flex-1 bg-green-600 text-white rounded-xl text-[11px]"
                                  onClick={async () => {
                                    if (!selectedPlace) return;

                                    for (const cat of Object.keys(ratings)) {
                                      await setPlaceRating(
                                        selectedPlace.id,
                                        cat as AccessCategoryId,
                                        ratings[
                                          cat as AccessCategoryId
                                        ] as number
                                      );
                                    }

                                    updatePlace(selectedPlace.id, {
                                      ratingSubmitted: true,
                                    });
                                    alert("Изменения сохранены ✔");
                                  }}
                                >
                                  Сохранить изменения
                                </Button>
                              )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ROUTE BUTTONS + Google Maps + Закрыть */}
                    <div className="pt-3 flex flex-wrap gap-2">
{isMobile && (
    <button
      type="button"
      onClick={() => setCategoryOpen(true)}
      className="
        w-full mb-2
        rounded-xl border border-gray-200
        bg-white hover:bg-gray-50
        text-[11px] md:text-xs
        py-2
        flex items-center justify-center gap-2
      "
    >
      <img
        src="/icons/categories/wheelchair.svg"
        className="w-4 h-4"
        alt=""
      />
      Выбрать мою категорию доступности
    </button>
  )}

  {/* ♿ Маршрут для коляски */}
  <Button
    className="rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs px-3 flex items-center gap-1"
    onClick={() => {
      setRouteToId(selectedPlace.id);
      setRouteProfile("wheelchair");
      setSelectedId(null);
    }}
  >
    <img src="/icons/categories/wheelchair.svg" className="w-4 h-4" alt="" />
    Коляска
  </Button>

  {/* 👁 Слабовидящие */}
  <Button
    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 flex items-center gap-1"
    onClick={() => {
      setRouteToId(selectedPlace.id);
      setRouteProfile("vision");
      setSelectedId(null);
    }}
  >
    <img src="/icons/categories/vision.svg" className="w-4 h-4" alt="" />
    Слабовидящие
  </Button>

  {/* 👂 Слабослышащие */}
  <Button
    className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 flex items-center gap-1"
    onClick={() => {
      setRouteToId(selectedPlace.id);
      setRouteProfile("hearing");
      setSelectedId(null);
    }}
  >
    <img src="/icons/categories/hearing.svg" className="w-4 h-4" alt="" />
    Слабослышащие
  </Button>

  {/* 🚕 Инвотакси */}
  <Button
    className="rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 flex items-center gap-1"
    onClick={() =>
      window.open("https://taplink.cc/invataxi.kz?utm_source=chatgpt.com", "_blank")
    }
  >
    <img src="/icons/categories/wheelchair.svg" className="w-4 h-4" alt="" />
    Инвотакси
  </Button>

  {/* ❌ Отменить маршрут */}
  <Button
    className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs px-3 flex items-center gap-1"
    onClick={() => {
      setRouteToId(null);
      setRouteProfile(null);
      setSelectedId(null);
    }}
  >
    ✖
    Отмена
  </Button>

  {/* 🗺 Google Maps */}
  <Button
    variant="outline"
    className="rounded-xl text-xs flex items-center gap-1"
    onClick={() =>
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}&travelmode=walking`,
        "_blank"
      )
    }
  >
    🗺
    Google Maps
  </Button>




                      {editMode ? (
                        <>
                          <Button
                            variant="outline"
                            className="rounded-xl text-[11px] md:text-xs px-3 py-1"
                            onClick={() => setSelectedId(null)}
                          >
                            Готово
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-xl text-[11px] md:text-xs text-red-600 border-red-300 hover:bg-red-50 px-3 py-1"
                            onClick={() => {
                              removePlace(selectedPlace.id);
                              setSelectedId(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          className="rounded-xl text-[11px] md:text-xs px-3 py-1"
                          onClick={() => setSelectedId(null)}
                        >
                          Закрыть
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Фуллскрин фото */}
      {fullscreenPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <button
            className="absolute top-4 right-4 text-white text-2xl"
            onClick={() => setFullscreenPhoto(null)}
          >
            ✕
          </button>
          <img
            src={fullscreenPhoto}
            alt="Просмотр фото"
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-xl"
          />
        </div>
      )}

      {/* Модалка выбора категорий пользователей */}
      {categoryOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="w-[92%] max-w-3xl bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Сменить категорию</h3>
              <button
                onClick={() => setCategoryOpen(false)}
                className="text-gray-500 hover:text-black text-sm"
              >
                Закрыть
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACCESS_CATEGORIES.map((c) => {
                const act = selectedCats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() =>
                      setSelectedCats((prev) =>
                        act
                          ? prev.filter((x) => x !== c.id)
                          : [...prev, c.id]
                      )
                    }
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      act
                        ? "border-[#e53935] bg-[#fff4f2]"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#e8f1fb] flex items-center justify-center">
                      <img src={c.icon} alt="" className="w-5 h-5" />
                    </div>
                    <span className="font-medium">{c.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setSelectedCats([])}
                className="text-sm text-gray-600 hover:text-black"
              >
                Сбросить выбор
              </button>
              <Button
                onClick={() => setCategoryOpen(false)}
                className="rounded-xl bg-[#e53935] hover:bg-[#d23431]"
              >
                Применить
              </Button>
            </div>
          </div>
        </div>
      )}
            {mobileAccessLegendOpen && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/40">
          <div className="w-full md:w-[420px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm md:text-base font-semibold">
                Что значат доступности на карте
              </h3>
              <button
                onClick={() => setMobileAccessLegendOpen(false)}
                className="text-gray-500 hover:text-gray-800 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs md:text-sm">
              <div>
                <h4 className="font-semibold mb-1">Цвет маркеров</h4>
                <ul className="space-y-1">
                  <li>🟢 <b>Доступно</b> — место в целом удобно для большинства пользователей с инвалидностью.</li>
                  <li>🟡 <b>Частично доступно</b> — есть барьеры (ступеньки, отсутствие лифта и т.п.).</li>
                  <li>🔴 <b>Недоступно</b> — серьёзные препятствия, пользоваться местом сложно или невозможно.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Категории пользователей</h4>
                <ul className="space-y-1">
                  <li>♿ Коляска — пользователи на инвалидной коляске.</li>
                  <li>🚶 ОДА — нарушения опорно-двигательного аппарата (но без коляски).</li>
                  <li>⏱ Временная травма — переломы, растяжения и т.п.</li>
                  <li>👁 Нарушение зрения — слабовидящие и незрячие.</li>
                  <li>👂 Нарушение слуха — слабослышащие и глухие.</li>
                  <li>🧠 Интеллектуальная инвалидность.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Оценка 1–10</h4>
                <p>
                  В карточке места на вкладке «Доступность» вы можете поставить свою оценку по каждой категории от 1 до 10. 
                  Это помогает другим пользователям понять, насколько место реально удобно.
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setMobileAccessLegendOpen(false)}
                className="px-4 py-1.5 rounded-xl text-xs md:text-sm bg-[#177ee1] text-white hover:bg-[#146fca]"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
