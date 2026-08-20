import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Search,
  UserPlus,
  Users,
  Camera,
  Scale,
  Archive,
  Target,
  ClipboardList,
  NotebookPen,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import {
  useAssignTrainerClient,
  useCreateTrainerLog,
  useTrainerClients,
  useTrainerClientSummary,
  useTrainerUserSearch,
  useUpdateTrainerClient,
} from '@/hooks/useTrainer';
import { formatDateSafe } from '@/lib/dateUtils';

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function resolveImageUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');
  return `${base}${url}`;
}

export default function TrainerDashboard() {
  const { profile, loading: profileLoading } = useProfile();
  const { data: clients = [], isLoading } = useTrainerClients();
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [goalsDraft, setGoalsDraft] = useState('');
  const [trainingPlanDraft, setTrainingPlanDraft] = useState('');
  const [timelineTitle, setTimelineTitle] = useState('');
  const [timelineContent, setTimelineContent] = useState('');
  const activeClients = useMemo(() => clients.filter((client) => client.status === 'active'), [clients]);
  const archivedClients = useMemo(() => clients.filter((client) => client.status === 'archived'), [clients]);
  const selectedClient = clients.find((client) => client.profile.id === selectedClientId) ?? activeClients[0] ?? null;
  const { data: clientSummary, isLoading: summaryLoading } = useTrainerClientSummary(selectedClient?.profile.id);
  const { data: searchResults = [], isLoading: searchLoading } = useTrainerUserSearch(search);
  const assignClient = useAssignTrainerClient();
  const updateClient = useUpdateTrainerClient();
  const createTrainerLog = useCreateTrainerLog();

  useEffect(() => {
    if (!selectedClientId && activeClients[0]) {
      setSelectedClientId(activeClients[0].profile.id);
    }
  }, [activeClients, selectedClientId]);

  useEffect(() => {
    if (clientSummary?.summary.assignment) {
      setGoalsDraft(clientSummary.summary.assignment.goals ?? '');
      setTrainingPlanDraft(clientSummary.summary.assignment.training_plan ?? '');
    }
  }, [clientSummary?.summary.assignment]);

  const handleAssignClient = async (clientId: string) => {
    try {
      await assignClient.mutateAsync({ clientId, notes: assignmentNotes.trim() || undefined });
      toast({
        title: 'Aluno vinculado',
        description: 'O aluno agora está disponível na sua área do personal.',
      });
      setSearch('');
      setAssignmentNotes('');
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível vincular o aluno.',
        variant: 'destructive',
      });
    }
  };

  const handleArchiveClient = async (assignmentId: string, shouldArchive: boolean) => {
    try {
      await updateClient.mutateAsync({
        assignmentId,
        status: shouldArchive ? 'ARCHIVED' : 'ACTIVE',
      });
      toast({
        title: shouldArchive ? 'Aluno arquivado' : 'Aluno reativado',
        description: shouldArchive
          ? 'O aluno foi movido para a lista de arquivados.'
          : 'O aluno voltou para a lista ativa.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar o aluno.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveFollowup = async () => {
    if (!clientSummary?.summary.assignment.id) return;

    try {
      await updateClient.mutateAsync({
        assignmentId: clientSummary.summary.assignment.id,
        goals: goalsDraft.trim() || null,
        trainingPlan: trainingPlanDraft.trim() || null,
      });
      toast({
        title: 'Acompanhamento salvo',
        description: 'Metas e prescrição do aluno foram atualizadas.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o acompanhamento.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateTimelineLog = async () => {
    if (!selectedClient?.profile.id) return;
    if (!timelineTitle.trim() || !timelineContent.trim()) {
      toast({
        title: 'Complete a anotação',
        description: 'Informe um título e o conteúdo para registrar na timeline.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTrainerLog.mutateAsync({
        clientId: selectedClient.profile.id,
        title: timelineTitle.trim(),
        content: timelineContent.trim(),
      });
      toast({
        title: 'Registro criado',
        description: 'A anotação foi adicionada na timeline do aluno.',
      });
      setTimelineTitle('');
      setTimelineContent('');
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível criar a anotação.',
        variant: 'destructive',
      });
    }
  };

  if (profileLoading || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  if (!profile?.is_personal_trainer) {
    return (
      <div className="min-h-full bg-[linear-gradient(180deg,#2a1035_0%,#31123f_100%)]">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
          <header className="rounded-[2rem] border border-white/5 bg-[rgba(50,17,67,0.96)] px-6 py-6 shadow-elegant">
            <div className="flex items-center gap-4">
              <Link to="/" className="rounded-full bg-[hsl(var(--secondary))] p-3 text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Área do Personal</h1>
                <p className="text-sm text-muted-foreground">Painel de acompanhamento de alunos e evolução.</p>
              </div>
            </div>
          </header>

          <section className="rounded-[2rem] border border-white/5 bg-[rgba(50,17,67,0.96)] p-8 text-center shadow-elegant">
            <div className="mx-auto max-w-2xl">
              <BadgeCheck className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h2 className="text-2xl font-semibold">
                {profile?.trainer_application_status === 'PENDING'
                  ? 'Seu cadastro de personal está em análise'
                  : profile?.trainer_application_status === 'REJECTED'
                    ? 'Sua solicitação de personal foi reprovada'
                    : 'Acesso de personal ainda não liberado'}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {profile?.trainer_application_status === 'PENDING'
                  ? 'Assim que a administração validar seus dados profissionais, essa área será liberada com acesso premium gratuito.'
                  : profile?.trainer_application_status === 'REJECTED'
                    ? 'Revise seus dados com a equipe para tentar novamente.'
                    : 'Você precisa de aprovação administrativa para usar a área do personal trainer.'}
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#2a1035_0%,#31123f_100%)]">
      <div className="mx-auto flex w-full max-w-[1450px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
        <header className="rounded-[2rem] border border-white/5 bg-[rgba(50,17,67,0.96)] px-6 py-6 shadow-elegant">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="rounded-full bg-[hsl(var(--secondary))] p-3 text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Área do Personal</h1>
                <p className="text-sm text-muted-foreground">Acompanhe alunos, evolução corporal e frequência recente.</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <BadgeCheck className="h-4 w-4" />
              Personal aprovado
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="gold-highlight rounded-[2rem] px-6 py-6 shadow-glow">
            <p className="text-sm text-primary-foreground/80">Alunos ativos</p>
            <p className="mt-2 text-4xl font-semibold">{activeClients.length}</p>
          </div>
          <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
            <p className="text-sm text-muted-foreground">Alunos arquivados</p>
            <p className="mt-2 text-4xl font-semibold">{archivedClients.length}</p>
          </div>
          <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
            <p className="text-sm text-muted-foreground">Busca de novos alunos</p>
            <p className="mt-2 text-4xl font-semibold">{search.trim().length >= 2 ? searchResults.length : 0}</p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.45fr]">
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/12 text-primary">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Adicionar aluno</h2>
                  <p className="text-sm text-muted-foreground">Busque por nome ou email para vincular um aluno à sua carteira.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Digite nome ou email do aluno"
                    className="border-white/10 bg-[hsl(var(--secondary))] pl-10"
                  />
                </div>

                <Input
                  value={assignmentNotes}
                  onChange={(event) => setAssignmentNotes(event.target.value)}
                  placeholder="Observação opcional para o vínculo"
                  className="border-white/10 bg-[hsl(var(--secondary))]"
                />

                <div className="space-y-3">
                  {search.trim().length < 2 ? (
                    <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-4 text-sm text-muted-foreground">
                      Digite pelo menos 2 caracteres para buscar um aluno.
                    </div>
                  ) : searchLoading ? (
                    <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-4 text-sm text-muted-foreground">
                      Buscando usuários...
                    </div>
                  ) : searchResults.length ? (
                    searchResults.map((candidate) => (
                      <div key={candidate.id} className="flex items-center justify-between gap-3 rounded-[1.5rem] bg-[hsl(var(--secondary))] p-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{candidate.full_name}</p>
                          <p className="truncate text-sm text-muted-foreground">{candidate.email}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleAssignClient(candidate.id)}
                          disabled={assignClient.isPending || clients.some((item) => item.profile.id === candidate.id)}
                        >
                          {clients.some((item) => item.profile.id === candidate.id) ? 'Já vinculado' : 'Vincular'}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-4 text-sm text-muted-foreground">
                      Nenhum aluno elegível encontrado.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/12 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Sua carteira</h2>
                  <p className="text-sm text-muted-foreground">Alunos ativos e arquivados com acesso rápido ao resumo.</p>
                </div>
              </div>

              <div className="space-y-3">
                {[...activeClients, ...archivedClients].length ? (
                  [...activeClients, ...archivedClients].map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => setSelectedClientId(client.profile.id)}
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition-colors ${
                        selectedClient?.profile.id === client.profile.id
                          ? 'border-primary bg-primary/10'
                          : 'border-white/5 bg-[hsl(var(--secondary))]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{client.profile.full_name}</p>
                          <p className="truncate text-sm text-muted-foreground">{client.profile.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                            client.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-muted text-muted-foreground'
                          }`}>
                            {client.status === 'active' ? 'Ativo' : 'Arquivado'}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleArchiveClient(client.id, client.status === 'active');
                            }}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-4 text-sm text-muted-foreground">
                    Você ainda não vinculou nenhum aluno.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
            {selectedClient ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border border-white/10">
                      <AvatarImage src={selectedClient.profile.avatar_url || undefined} alt={selectedClient.profile.full_name} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(selectedClient.profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-2xl font-semibold">{selectedClient.profile.full_name}</h2>
                      <p className="text-sm text-muted-foreground">{selectedClient.profile.email}</p>
                      {selectedClient.notes ? (
                        <p className="mt-1 text-sm text-muted-foreground">Nota do vínculo: {selectedClient.notes}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                    Aluno {selectedClient.status === 'active' ? 'ativo' : 'arquivado'}
                  </div>
                </div>

                {summaryLoading || !clientSummary ? (
                  <div className="flex min-h-[280px] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-5">
                        <p className="text-sm text-muted-foreground">Treinos 30 dias</p>
                        <p className="mt-2 text-4xl font-semibold">{clientSummary.summary.workouts_last_30_days}</p>
                      </div>
                      <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-5">
                        <p className="text-sm text-muted-foreground">Musculação</p>
                        <p className="mt-2 text-4xl font-semibold">{clientSummary.summary.strength_workouts_last_30_days}</p>
                      </div>
                      <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-5">
                        <p className="text-sm text-muted-foreground">Cardio</p>
                        <p className="mt-2 text-4xl font-semibold">{clientSummary.summary.cardio_workouts_last_30_days}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-[1.75rem] bg-[hsl(var(--secondary))] p-5">
                        <div className="mb-4 flex items-center gap-2">
                          <Camera className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold">Última foto de evolução</h3>
                        </div>

                        {clientSummary.summary.latest_body_progress_photo ? (
                          <div className="overflow-hidden rounded-[1.5rem] border border-white/5">
                            <img
                              src={resolveImageUrl(clientSummary.summary.latest_body_progress_photo.image_url)}
                              alt="Última evolução corporal"
                              className="aspect-[4/5] w-full object-cover"
                            />
                            <div className="p-4 text-sm text-muted-foreground">
                              {formatDateSafe(
                                clientSummary.summary.latest_body_progress_photo.taken_at,
                                "dd 'de' MMMM yyyy",
                                { locale: ptBR },
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex min-h-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 text-sm text-muted-foreground">
                            O aluno ainda não enviou fotos de evolução.
                          </div>
                        )}
                      </div>

                      <div className="rounded-[1.75rem] bg-[hsl(var(--secondary))] p-5">
                        <div className="mb-4 flex items-center gap-2">
                          <Scale className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold">Última bioimpedância</h3>
                        </div>

                        {clientSummary.summary.latest_bioimpedance ? (
                          <div className="space-y-4">
                            <div className="rounded-[1.25rem] bg-[rgba(255,255,255,0.03)] p-4">
                              <p className="text-sm text-muted-foreground">Data</p>
                              <p className="mt-1 text-lg font-semibold">
                                {formatDateSafe(clientSummary.summary.latest_bioimpedance.date, "dd/MM/yyyy")}
                              </p>
                            </div>
                            <div className="rounded-[1.25rem] bg-[rgba(255,255,255,0.03)] p-4">
                              <p className="text-sm text-muted-foreground">Peso</p>
                              <p className="mt-1 text-2xl font-semibold">
                                {clientSummary.summary.latest_bioimpedance.weight_kg ?? '--'} kg
                              </p>
                            </div>
                            <div className="rounded-[1.25rem] bg-[rgba(255,255,255,0.03)] p-4">
                              <p className="text-sm text-muted-foreground">Gordura corporal</p>
                              <p className="mt-1 text-2xl font-semibold">
                                {clientSummary.summary.latest_bioimpedance.body_fat_percent ?? '--'}%
                              </p>
                            </div>
                            <div className="rounded-[1.25rem] bg-[rgba(255,255,255,0.03)] p-4">
                              <p className="text-sm text-muted-foreground">Massa muscular</p>
                              <p className="mt-1 text-2xl font-semibold">
                                {clientSummary.summary.latest_bioimpedance.muscle_mass_kg ?? '--'} kg
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex min-h-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 text-sm text-muted-foreground">
                            Sem registro de bioimpedância para este aluno.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] bg-[hsl(var(--secondary))] p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Resumo operacional</h3>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Use essa área para acompanhar frequência de treino e evolução recente do aluno. Na próxima etapa, podemos incluir
                        anotações do personal, prescrição de treino e metas por aluno dentro deste mesmo painel.
                      </p>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-[1.75rem] bg-[hsl(var(--secondary))] p-5">
                        <div className="mb-4 flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold">Metas do aluno</h3>
                        </div>
                        <textarea
                          value={goalsDraft}
                          onChange={(event) => setGoalsDraft(event.target.value)}
                          placeholder="Descreva objetivos, foco da fase, metas de frequência e prioridades."
                          className="min-h-40 w-full rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm outline-none"
                        />
                      </div>

                      <div className="rounded-[1.75rem] bg-[hsl(var(--secondary))] p-5">
                        <div className="mb-4 flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold">Prescrição de treino</h3>
                        </div>
                        <textarea
                          value={trainingPlanDraft}
                          onChange={(event) => setTrainingPlanDraft(event.target.value)}
                          placeholder="Escreva a divisão, volume, cardio, observações técnicas e rotina sugerida."
                          className="min-h-40 w-full rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={() => void handleSaveFollowup()}
                        disabled={updateClient.isPending}
                      >
                        {updateClient.isPending ? 'Salvando...' : 'Salvar metas e prescrição'}
                      </Button>
                    </div>

                    <div className="rounded-[1.75rem] bg-[hsl(var(--secondary))] p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <NotebookPen className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Timeline de acompanhamento</h3>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                        <div className="space-y-3">
                          <Input
                            value={timelineTitle}
                            onChange={(event) => setTimelineTitle(event.target.value)}
                            placeholder="Título do registro"
                            className="border-white/10 bg-[rgba(255,255,255,0.03)]"
                          />
                          <textarea
                            value={timelineContent}
                            onChange={(event) => setTimelineContent(event.target.value)}
                            placeholder="Ex.: Ajuste de carga, dor relatada, melhora postural, adesão à rotina..."
                            className="min-h-36 w-full rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm outline-none"
                          />
                          <Button
                            type="button"
                            onClick={() => void handleCreateTimelineLog()}
                            disabled={createTrainerLog.isPending}
                            className="w-full"
                          >
                            {createTrainerLog.isPending ? 'Registrando...' : 'Adicionar à timeline'}
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {clientSummary.summary.logs.length ? (
                            clientSummary.summary.logs.map((log) => (
                              <div key={log.id} className="rounded-[1.25rem] bg-[rgba(255,255,255,0.03)] p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <h4 className="font-medium">{log.title}</h4>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDateSafe(log.created_at, "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{log.content}</p>
                              </div>
                            ))
                          ) : (
                            <div className="flex min-h-[180px] items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 text-sm text-muted-foreground">
                              Nenhum registro na timeline ainda.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center text-center text-muted-foreground">
                <div>
                  <Users className="mx-auto mb-4 h-10 w-10" />
                  <p className="text-sm">Selecione um aluno para visualizar o resumo completo.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
