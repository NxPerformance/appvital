import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  Lock,
  Trash2,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PremiumPreviewGate } from "@/components/PremiumPreviewGate";
import { useToast } from "@/hooks/use-toast";
import { useBodyProgress, type BodyProgressPhoto, type BodyProgressPose } from "@/hooks/useBodyProgress";
import { useProfile } from "@/hooks/useProfile";
import { formatDateSafe } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

const poseOptions: Array<{ value: BodyProgressPose; label: string }> = [
  { value: "front", label: "Frente" },
  { value: "side", label: "Lado" },
  { value: "back", label: "Costas" },
  { value: "custom", label: "Livre" },
];

function resolveImageUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const base = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace(/\/api\/?$/, "");
  return `${base}${url}`;
}

function formatTakenDate(value: string) {
  return formatDateSafe(value, "dd 'de' MMM yyyy", { locale: ptBR });
}

function PhotoCard({
  photo,
  selected,
  onSelect,
  onDelete,
}: {
  photo: BodyProgressPhoto;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.75rem] border transition-all",
        selected
          ? "border-primary shadow-glow"
          : "border-white/5 bg-[hsl(var(--card))] shadow-elegant"
      )}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="aspect-[4/5] overflow-hidden bg-[hsl(var(--secondary))]">
          <img
            src={resolveImageUrl(photo.image_url)}
            alt={photo.label || `Foto ${photo.pose}`}
            className="h-full w-full object-cover"
          />
        </div>
      </button>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{photo.label || "Registro corporal"}</p>
            <p className="text-sm text-muted-foreground">{formatTakenDate(photo.taken_at)}</p>
          </div>
          <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
            {poseOptions.find((option) => option.value === photo.pose)?.label || "Livre"}
          </span>
        </div>

        {photo.notes ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{photo.notes}</p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onSelect}>
            {selected ? "Selecionada" : "Comparar"}
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BodyProgress() {
  const { profile, loading: profileLoading } = useProfile();
  const { photos, loading, uploading, uploadPhoto, deletePhoto } = useBodyProgress();
  const { toast } = useToast();
  const [selectedPose, setSelectedPose] = useState<BodyProgressPose | "all">("all");
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [comparePhotoId, setComparePhotoId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    pose: "front" as BodyProgressPose,
    label: "",
    notes: "",
    takenAt: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (!photos.length) {
      setSelectedPhotoId(null);
      setComparePhotoId(null);
      return;
    }

    setSelectedPhotoId((current) => current ?? photos[0].id);
    setComparePhotoId((current) => current ?? (photos[1]?.id ?? photos[0].id));
  }, [photos]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const filteredPhotos = useMemo(() => {
    if (selectedPose === "all") return photos;
    return photos.filter((photo) => photo.pose === selectedPose);
  }, [photos, selectedPose]);

  const selectedPhoto = filteredPhotos.find((photo) => photo.id === selectedPhotoId) ?? filteredPhotos[0] ?? null;
  const comparePool = filteredPhotos.filter((photo) => photo.id !== selectedPhoto?.id);
  const comparePhoto = comparePool.find((photo) => photo.id === comparePhotoId) ?? comparePool[0] ?? null;

  const handleUpload = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Selecione uma imagem",
        description: "Escolha uma foto para registrar sua evolução.",
      });
      return;
    }

    const result = await uploadPhoto({
      file,
      pose: formData.pose.toUpperCase() as Uppercase<BodyProgressPose>,
      label: formData.label.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      taken_at: new Date(`${formData.takenAt}T12:00:00`).toISOString(),
    });

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar foto",
        description: result.error,
      });
      return;
    }

    toast({
      title: "Foto salva",
      description: "Seu registro privado de evolução foi adicionado.",
    });

    setFile(null);
    setPreviewUrl(null);
    setFormData({
      pose: "front",
      label: "",
      notes: "",
      takenAt: new Date().toISOString().slice(0, 10),
    });
  };

  const handleDelete = async (photoId: string) => {
    const confirmed = window.confirm("Deseja remover esta foto da sua evolução corporal?");
    if (!confirmed) return;

    const result = await deletePhoto(photoId);
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Erro ao remover foto",
        description: result.error,
      });
      return;
    }

    toast({
      title: "Foto removida",
      description: "O registro foi excluído da sua galeria privada.",
    });
  };

  if (profileLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  if (!profile?.is_premium) {
    return (
      <div className="min-h-full bg-[linear-gradient(180deg,#2a1035_0%,#31123f_100%)]">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
          <header className="rounded-[2rem] border border-white/5 bg-[rgba(50,17,67,0.96)] px-6 py-6 shadow-elegant">
            <div className="flex items-center gap-4">
              <Link to="/profile" className="rounded-full bg-[hsl(var(--secondary))] p-3 text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Evolução Corporal</h1>
                <p className="text-sm text-muted-foreground">Veja como fica seu comparador privado de fotos no Premium.</p>
              </div>
            </div>
          </header>

          <PremiumPreviewGate
            title="Acompanhe sua evolução visual"
            description="No Premium, você guarda fotos privadas por pose e compara fases lado a lado para enxergar mudança real no corpo."
          >
            <div className="grid gap-4 p-5 xl:grid-cols-[0.95fr_1.45fr]">
              <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/12 text-primary">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Novo registro</h2>
                    <p className="text-sm text-muted-foreground">Foto, pose, data e observações da fase.</p>
                  </div>
                </div>
                <div className="flex aspect-[4/5] items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-[hsl(var(--secondary))] text-muted-foreground">
                  <div className="text-center">
                    <ImagePlus className="mx-auto mb-3 h-8 w-8" />
                    <p className="text-sm">Prévia do upload privado</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[1.75rem] border border-white/5 bg-[hsl(var(--card))] p-5">
                    <p className="text-sm text-muted-foreground">Fotos salvas</p>
                    <p className="mt-2 text-4xl font-semibold">12</p>
                  </div>
                  <div className="rounded-[1.75rem] border border-white/5 bg-[hsl(var(--card))] p-5">
                    <p className="text-sm text-muted-foreground">Primeiro registro</p>
                    <p className="mt-2 text-lg font-semibold">03 de jan 2026</p>
                  </div>
                  <div className="rounded-[1.75rem] border border-white/5 bg-[hsl(var(--card))] p-5">
                    <p className="text-sm text-muted-foreground">Última atualização</p>
                    <p className="mt-2 text-lg font-semibold">Hoje</p>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6">
                  <h2 className="mb-5 text-xl font-semibold">Comparação visual</h2>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {[0, 1].map((item) => (
                      <div key={item} className="flex aspect-[4/5] items-center justify-center rounded-[1.75rem] bg-[hsl(var(--secondary))] text-center text-muted-foreground">
                        <div>
                          <Camera className="mx-auto mb-3 h-8 w-8" />
                          <p className="text-sm">{item === 0 ? "Foto inicial" : "Foto atual"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </PremiumPreviewGate>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#2a1035_0%,#31123f_100%)]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
        <header className="rounded-[2rem] border border-white/5 bg-[rgba(50,17,67,0.96)] px-6 py-6 shadow-elegant">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Link to="/profile" className="rounded-full bg-[hsl(var(--secondary))] p-3 text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Evolução Corporal</h1>
                <p className="text-sm text-muted-foreground">
                  Área privada para acompanhar suas fotos de progresso ao longo do tempo.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Lock className="h-4 w-4" />
              Visível apenas para você
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.45fr]">
          <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/12 text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Novo registro</h2>
                <p className="text-sm text-muted-foreground">Adicione uma foto e marque a pose para comparar depois.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="progress-file">Foto</Label>
                <Input
                  id="progress-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="border-white/10 bg-[hsl(var(--secondary))]"
                />
              </div>

              {previewUrl ? (
                <div className="overflow-hidden rounded-[1.5rem] border border-white/10">
                  <img src={previewUrl} alt="Prévia da foto" className="aspect-[4/5] w-full object-cover" />
                </div>
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-[hsl(var(--secondary))] text-muted-foreground">
                  <div className="text-center">
                    <ImagePlus className="mx-auto mb-3 h-8 w-8" />
                    <p className="text-sm">Escolha uma imagem para visualizar aqui</p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pose">Pose</Label>
                  <select
                    id="pose"
                    value={formData.pose}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, pose: event.target.value as BodyProgressPose }))
                    }
                    className="flex h-10 w-full rounded-md border border-white/10 bg-[hsl(var(--secondary))] px-3 text-sm outline-none"
                  >
                    {poseOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="takenAt">Data da foto</Label>
                  <Input
                    id="takenAt"
                    type="date"
                    value={formData.takenAt}
                    onChange={(event) => setFormData((current) => ({ ...current, takenAt: event.target.value }))}
                    className="border-white/10 bg-[hsl(var(--secondary))]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Título</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(event) => setFormData((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Ex.: Semana 1, início do cutting..."
                  className="border-white/10 bg-[hsl(var(--secondary))]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Peso do dia, sensação, objetivo da fase..."
                  className="min-h-28 border-white/10 bg-[hsl(var(--secondary))]"
                />
              </div>

              <Button type="button" onClick={() => void handleUpload()} disabled={uploading} className="w-full">
                {uploading ? "Enviando..." : "Salvar foto privada"}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.75rem] border border-white/5 bg-[hsl(var(--card))] p-5 shadow-elegant">
                <p className="text-sm text-muted-foreground">Fotos salvas</p>
                <p className="mt-2 text-4xl font-semibold">{photos.length}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/5 bg-[hsl(var(--card))] p-5 shadow-elegant">
                <p className="text-sm text-muted-foreground">Primeiro registro</p>
                <p className="mt-2 text-lg font-semibold">
                  {photos.length ? formatTakenDate(photos[photos.length - 1].taken_at) : "--"}
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-white/5 bg-[hsl(var(--card))] p-5 shadow-elegant">
                <p className="text-sm text-muted-foreground">Última atualização</p>
                <p className="mt-2 text-lg font-semibold">
                  {photos.length ? formatTakenDate(photos[0].taken_at) : "--"}
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Comparação visual</h2>
                  <p className="text-sm text-muted-foreground">Escolha dois registros para acompanhar a mudança corporal.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPose("all")}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm transition-colors",
                      selectedPose === "all" ? "bg-primary text-primary-foreground" : "bg-[hsl(var(--secondary))] text-muted-foreground"
                    )}
                  >
                    Todas
                  </button>
                  {poseOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedPose(option.value)}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm transition-colors",
                        selectedPose === option.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-[hsl(var(--secondary))] text-muted-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedPhoto ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {[selectedPhoto, comparePhoto].map((photo, index) => (
                    <div
                      key={photo?.id || `empty-${index}`}
                      className="overflow-hidden rounded-[1.75rem] border border-white/5 bg-[hsl(var(--secondary))]"
                    >
                      {photo ? (
                        <>
                          <img
                            src={resolveImageUrl(photo.image_url)}
                            alt={photo.label || "Foto de evolução"}
                            className="aspect-[4/5] w-full object-cover"
                          />
                          <div className="space-y-2 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold">{photo.label || (index === 0 ? "Foto principal" : "Comparativo")}</p>
                              <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
                                {poseOptions.find((option) => option.value === photo.pose)?.label || "Livre"}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{formatTakenDate(photo.taken_at)}</p>
                            {photo.notes ? <p className="text-sm leading-relaxed text-muted-foreground">{photo.notes}</p> : null}
                          </div>
                        </>
                      ) : (
                        <div className="flex aspect-[4/5] items-center justify-center text-center text-muted-foreground">
                          <div>
                            <Camera className="mx-auto mb-3 h-8 w-8" />
                            <p className="text-sm">Adicione outra foto nesta mesma pose para comparar.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[300px] items-center justify-center rounded-[1.75rem] border border-dashed border-white/10 bg-[hsl(var(--secondary))] text-center text-muted-foreground">
                  <div>
                    <Camera className="mx-auto mb-3 h-8 w-8" />
                    <p className="text-sm">Seu comparador vai aparecer aqui assim que a primeira foto for enviada.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Galeria privada</h2>
              <p className="text-sm text-muted-foreground">Registros por fase, pose e data para acompanhar sua consistência.</p>
            </div>

            <div className="text-sm text-muted-foreground">
              {filteredPhotos.length} {filteredPhotos.length === 1 ? "foto" : "fotos"} na visualização atual
            </div>
          </div>

          {filteredPhotos.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredPhotos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  selected={photo.id === selectedPhoto?.id || photo.id === comparePhoto?.id}
                  onSelect={() => {
                    if (!selectedPhoto || photo.id === selectedPhoto.id) {
                      setSelectedPhotoId(photo.id);
                      return;
                    }

                    setComparePhotoId(photo.id);
                  }}
                  onDelete={() => void handleDelete(photo.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-[1.75rem] border border-dashed border-white/10 bg-[hsl(var(--secondary))] text-center text-muted-foreground">
              <div>
                <ImagePlus className="mx-auto mb-3 h-8 w-8" />
                <p className="text-sm">
                  {photos.length
                    ? "Nenhuma foto encontrada para esse filtro."
                    : "Você ainda não tem fotos de evolução salvas."}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
