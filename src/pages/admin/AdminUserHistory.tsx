import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUserBioimpedance, useAllProfiles } from '@/hooks/useAdmin';
import { ptBR } from 'date-fns/locale';
import { formatDateSafe } from '@/lib/dateUtils';

export default function AdminUserHistory() {
  const { userId } = useParams();
  const { data: profiles } = useAllProfiles();
  const { data: records, isLoading } = useUserBioimpedance(userId);

  const user = profiles?.find((p) => p.id === userId);

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-4">
        <Link to="/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Histórico de Exames</h1>
          {user && (
            <p className="text-sm text-muted-foreground">{user.full_name}</p>
          )}
        </div>
      </div>

      <Link to={`/admin/bioimpedance/user/${userId}`}>
        <Button className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Novo Exame
        </Button>
      </Link>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando...
        </div>
      ) : records?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum exame registrado
        </div>
      ) : (
        <div className="space-y-3">
          {records?.map((record) => (
            <Link key={record.id} to={`/admin/bioimpedance/${record.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {formatDateSafe(record.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          {record.weight_kg && <span>Peso: {record.weight_kg}kg</span>}
                          {record.body_fat_percent && <span>Gordura: {record.body_fat_percent}%</span>}
                        </div>
                      </div>
                    </div>
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
