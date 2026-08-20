import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Dumbbell, ExternalLink, Flame, HeartPulse, PlayCircle, Sparkles, Timer, Utensils } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

interface WeburnVideo {
  id: string;
  title: string;
}

interface WeburnCategory {
  id: string;
  title: string;
  description: string;
  playlistId?: string;
  videos: WeburnVideo[];
  icon: React.ElementType;
  accent: string;
}

const weburnCategories: WeburnCategory[] = [
  {
    id: "academia",
    title: "Academia",
    description: "Movimentos de musculacao e execucao.",
    videos: [
      { id: "s1N5BvRntUs", title: "Triceps Testa" },
      { id: "rEIvZTz-zf0", title: "Execucao Stiff" },
      { id: "7JH7xjrpoo0", title: "Tente assim" },
    ],
    icon: Dumbbell,
    accent: "from-rose-400/20 to-primary/10",
  },
  {
    id: "hiit-cardio",
    title: "HIIT e cardio",
    description: "Treinos curtos para elevar gasto calorico.",
    videos: [
      { id: "p_UiEA7TgAQ", title: "HIIT" },
      { id: "lD7elL1SQcw", title: "Dispare a queima de gordura" },
      { id: "BhmD1U_Qzfs", title: "Apenas 10 minutos" },
    ],
    icon: Flame,
    accent: "from-amber-300/20 to-primary/10",
  },
  {
    id: "treino-rapido",
    title: "Treino rapido",
    description: "Conteudos para encaixar na rotina.",
    videos: [
      { id: "BhmD1U_Qzfs", title: "Apenas 10 minutos" },
      { id: "Q0Lk2L5t1D0", title: "Jornada Fit" },
      { id: "GS_FUBcG9i4", title: "Menos 10kg" },
    ],
    icon: Timer,
    accent: "from-emerald-300/20 to-primary/10",
  },
  {
    id: "medicina-esportiva",
    title: "Medicina Esportiva",
    description: "Conteúdos sobre saúde, performance e esporte.",
    playlistId: "PLns29rMyR0odbTaC1lqaAsus57Is3dFBt",
    videos: [],
    icon: HeartPulse,
    accent: "from-cyan-300/20 to-primary/10",
  },
  {
    id: "receitas-saudaveis",
    title: "Receitas saudáveis",
    description: "Receitas e ideias alimentares da Weburn.",
    playlistId: "PLns29rMyR0ofOQiqzED9473kpNB6SoplY",
    videos: [],
    icon: Utensils,
    accent: "from-lime-300/20 to-primary/10",
  },
];

function getEmbedUrl(category: WeburnCategory, videoId?: string) {
  if (videoId) {
    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
    });

    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  }

  if (!category.playlistId) return "";

  const params = new URLSearchParams({
    list: category.playlistId,
    rel: "0",
    modestbranding: "1",
  });

  return `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
}

export default function WeburnVideos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = weburnCategories.find((category) => category.id === searchParams.get("categoria")) ?? weburnCategories[0];
  const [activeCategoryId, setActiveCategoryId] = useState(initialCategory.id);
  const [activeVideoId, setActiveVideoId] = useState(initialCategory.videos[0]?.id);

  const activeCategory = useMemo(
    () => weburnCategories.find((category) => category.id === activeCategoryId) ?? weburnCategories[0],
    [activeCategoryId],
  );
  const activeVideo = activeCategory.videos.find((video) => video.id === activeVideoId);
  const embedUrl = getEmbedUrl(activeCategory, activeVideo?.id);

  useEffect(() => {
    const categoryFromUrl = weburnCategories.find((category) => category.id === searchParams.get("categoria"));
    if (!categoryFromUrl || categoryFromUrl.id === activeCategoryId) return;

    setActiveCategoryId(categoryFromUrl.id);
    setActiveVideoId(categoryFromUrl.videos[0]?.id);
  }, [activeCategoryId, searchParams]);

  function selectCategory(category: WeburnCategory) {
    setActiveCategoryId(category.id);
    setActiveVideoId(category.videos[0]?.id);
    setSearchParams({ categoria: category.id });
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background-strong))_100%)]">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
        <header className="grid h-14 grid-cols-[44px_1fr_44px] items-center md:hidden">
          <Link
            to="/workouts"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/70 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-center text-lg font-bold">Treinos populares</h1>
        </header>

        <section className="overflow-hidden rounded-[2rem] border border-white/5 bg-card/90 shadow-elegant">
          <div className="relative p-6 md:p-7">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: "url('/images/workout-examples-ai.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-background/25 via-background/80 to-background" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl space-y-4">
                <Link
                  to="/workouts"
                  className="hidden h-11 w-11 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  Aulas do YouTube
                </div>
                <h1 className="text-4xl font-bold leading-tight tracking-normal md:text-5xl">Treinos populares</h1>
                <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                  Assista aos vídeos e playlists públicas da Weburn dentro do app, usando o player oficial do YouTube.
                </p>
              </div>

              <a
                href="https://www.youtube.com/@Weburn"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-secondary/80 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                Canal Weburn
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {weburnCategories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory.id === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => selectCategory(category)}
                  className={cn(
                    "group w-full rounded-2xl border p-4 text-left shadow-elegant transition-all",
                    isActive
                      ? "border-primary/35 bg-primary/10"
                      : "border-white/5 bg-card/80 hover:border-primary/20 hover:bg-secondary/70",
                  )}
                >
                  <span className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br", category.accent)}>
                    <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-foreground")} />
                  </span>
                  <span className="block text-lg font-bold leading-tight">{category.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{category.description}</span>
                </button>
              );
            })}
          </div>

          <article className="overflow-hidden rounded-[2rem] border border-white/5 bg-card/90 shadow-elegant">
            <div className="border-b border-white/5 p-5 md:p-6">
              <div className="flex items-start gap-4">
                <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br", activeCategory.accent)}>
                  <PlayCircle className="h-6 w-6 text-primary" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary">Playlist selecionada</p>
                  <h2 className="mt-1 text-2xl font-bold leading-tight">{activeCategory.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{activeCategory.description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-background/40 p-3 md:p-5">
              <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/5 bg-black">
                <iframe
                  key={embedUrl}
                  className="h-full w-full"
                  src={embedUrl}
                  title={`Playlist Weburn: ${activeCategory.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>

              {activeCategory.videos.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  {activeCategory.videos.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => setActiveVideoId(video.id)}
                      className={cn(
                        "min-h-14 rounded-xl border px-3 py-2 text-left text-sm font-semibold leading-snug transition-colors",
                        activeVideoId === video.id
                          ? "border-primary/40 bg-primary/15 text-foreground"
                          : "border-white/5 bg-card/80 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {video.title}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
