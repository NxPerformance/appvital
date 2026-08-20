import { Link } from 'react-router-dom';
import { Users, FileText, Calendar, ArrowLeft, Banknote, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAllProfiles } from '@/hooks/useAdmin';
import { usePendingAppointmentsCount } from '@/hooks/useAppointments';

export default function AdminDashboard() {
  const { data: profiles, isLoading } = useAllProfiles();
  const { data: pendingCount = 0, isLoading: loadingPending } = usePendingAppointmentsCount();

  const totalUsers = profiles?.length ?? 0;

  return (
    <div className="p-4 pb-24 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Painel Admin</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? '...' : totalUsers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Consultas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loadingPending ? '...' : pendingCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Menu</h2>
        
        <div className="flex flex-col gap-4">
          <Link to="/admin/users" className="block">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Gerenciar Usuários</h3>
                  <p className="text-sm text-muted-foreground">
                    Visualizar e gerenciar usuários
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/bioimpedance" className="block">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Adicionar Bioimpedância</h3>
                  <p className="text-sm text-muted-foreground">
                    Inserir novo exame de bioimpedância
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/appointments" className="block">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Gerenciar Consultas</h3>
                  <p className="text-sm text-muted-foreground">
                    Visualizar e confirmar agendamentos
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/finance" className="block">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Banknote className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Financeiro</h3>
                  <p className="text-sm text-muted-foreground">
                    Ver compras, pagamentos e receita
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/payment-settings" className="block">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <KeyRound className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Gateway de Pagamento</h3>
                  <p className="text-sm text-muted-foreground">
                    Configurar chaves e webhook da Stripe
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
