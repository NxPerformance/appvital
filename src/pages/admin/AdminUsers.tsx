import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, MoreVertical, Crown, Trash2, Shield, BadgeCheck, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useAllProfiles,
  useUpdateUserPremium,
  useDeleteUser,
  useSetAdminRole,
  useSetTrainerRole,
  useTrainerApplications,
  useReviewTrainerApplication,
} from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import { ptBR } from 'date-fns/locale';
import { formatDateSafe } from '@/lib/dateUtils';

const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');

function getUploadUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${apiOrigin}${path}`;
}

export default function AdminUsers() {
  const { data: profiles, isLoading } = useAllProfiles();
  const updatePremium = useUpdateUserPremium();
  const deleteUser = useDeleteUser();
  const setAdminRole = useSetAdminRole();
  const setTrainerRole = useSetTrainerRole();
  const { data: trainerApplications } = useTrainerApplications();
  const reviewTrainerApplication = useReviewTrainerApplication();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  const pendingApplications = trainerApplications?.filter((application) => application.status === 'pending') ?? [];

  const filteredProfiles = profiles?.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleTogglePremium = async (userId: string, currentStatus: boolean) => {
    try {
      await updatePremium.mutateAsync({ userId, isPremium: !currentStatus });
      toast({
        title: currentStatus ? 'Premium removido' : 'Usuário agora é Premium',
        description: currentStatus 
          ? 'O status premium foi removido do usuário.' 
          : 'O usuário agora tem acesso premium.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status premium.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await deleteUser.mutateAsync(userToDelete.id);
      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi removido com sucesso.',
      });
      setUserToDelete(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o usuário.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      await setAdminRole.mutateAsync({ userId, enable: !isCurrentlyAdmin });
      toast({
        title: isCurrentlyAdmin ? 'Admin removido' : 'Admin concedido',
        description: isCurrentlyAdmin
          ? 'O usuário não possui mais acesso administrativo.'
          : 'O usuário agora possui acesso administrativo.',
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o cargo administrativo.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleTrainer = async (userId: string, isCurrentlyTrainer: boolean) => {
    try {
      await setTrainerRole.mutateAsync({ userId, enable: !isCurrentlyTrainer });
      toast({
        title: isCurrentlyTrainer ? 'Personal removido' : 'Personal concedido',
        description: isCurrentlyTrainer
          ? 'O usuário não possui mais acesso de personal.'
          : 'O usuário agora possui acesso de personal trainer.',
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o papel de personal.',
        variant: 'destructive',
      });
    }
  };

  const handleReviewApplication = async (applicationId: string, decision: 'approve' | 'reject') => {
    try {
      await reviewTrainerApplication.mutateAsync({
        applicationId,
        decision,
        rejectionReason: decision === 'reject' ? 'Solicitação reprovada pela administração.' : null,
      });
      toast({
        title: decision === 'approve' ? 'Solicitação aprovada' : 'Solicitação rejeitada',
        description:
          decision === 'approve'
            ? 'O personal foi aprovado e recebeu acesso premium gratuito.'
            : 'A solicitação foi marcada como rejeitada.',
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível revisar a solicitação de personal.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-4">
        <Link to="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Usuários</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {pendingApplications.length > 0 && (
        <Card className="border-amber-500/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-amber-400" />
              <h2 className="font-semibold">Solicitações pendentes de personal</h2>
            </div>

            <div className="space-y-3">
              {pendingApplications.map((application) => (
                <div key={application.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{application.full_name}</p>
                      <p className="text-sm text-muted-foreground">{application.user?.email}</p>
                      <p className="text-sm text-muted-foreground">
                        CREF: {application.cref}/{application.cref_state}
                      </p>
                      {application.specialties && (
                        <p className="text-sm text-muted-foreground">Especialidades: {application.specialties}</p>
                      )}
                      {application.experience_years !== null && (
                        <p className="text-sm text-muted-foreground">
                          Experiência: {application.experience_years} anos
                        </p>
                      )}
                      {application.instagram_handle && (
                        <p className="text-sm text-muted-foreground">Instagram: {application.instagram_handle}</p>
                      )}
                      {application.proof_notes && (
                        <p className="text-sm text-muted-foreground">Comprovação: {application.proof_notes}</p>
                      )}
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {[
                          { label: 'Foto do personal', url: getUploadUrl(application.self_photo_url) },
                          { label: 'Documento/CREF', url: getUploadUrl(application.document_photo_url) },
                        ].map((proof) => (
                          <div key={proof.label} className="rounded-xl border border-border bg-background/30 p-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">{proof.label}</p>
                            {proof.url ? (
                              <a href={proof.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border">
                                <img src={proof.url} alt={proof.label} className="h-36 w-full object-cover transition-transform hover:scale-105" />
                              </a>
                            ) : (
                              <p className="text-sm text-destructive">Arquivo não enviado</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReviewApplication(application.id, 'approve')}
                        disabled={reviewTrainerApplication.isPending}
                      >
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewApplication(application.id, 'reject')}
                        disabled={reviewTrainerApplication.isPending}
                      >
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando...
        </div>
      ) : filteredProfiles?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum usuário encontrado
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProfiles?.map((profile) => (
            <Card key={profile.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{profile.full_name}</h3>
                      {profile.is_premium && (
                        <Badge variant="secondary" className="shrink-0">
                          <Crown className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                      {profile.is_admin && (
                        <Badge variant="outline" className="shrink-0">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {profile.is_personal_trainer && (
                        <Badge variant="outline" className="shrink-0">
                          <BadgeCheck className="w-3 h-3 mr-1" />
                          Personal
                        </Badge>
                      )}
                      {profile.trainer_application_status === 'PENDING' && (
                        <Badge variant="outline" className="shrink-0 border-amber-500/40 text-amber-300">
                          <Hourglass className="w-3 h-3 mr-1" />
                          Personal Pendente
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {profile.email}
                    </p>
                    {profile.entry_date && (
                      <p className="text-xs text-muted-foreground">
                        Desde {formatDateSafe(profile.entry_date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleTogglePremium(profile.id, profile.is_premium)}
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        {profile.is_premium ? 'Remover Premium' : 'Tornar Premium'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleAdmin(profile.id, profile.is_admin)}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {profile.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleTrainer(profile.id, !!profile.is_personal_trainer)}
                      >
                        <BadgeCheck className="w-4 h-4 mr-2" />
                        {profile.is_personal_trainer ? 'Remover Personal' : 'Tornar Personal'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setUserToDelete({ id: profile.id, name: profile.full_name })}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir Usuário
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{userToDelete?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
