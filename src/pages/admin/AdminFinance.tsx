import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Banknote, CheckCircle2, Clock, CreditCard, Search, Users } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAdminOrders, type AdminOrder } from '@/hooks/useAdmin';
import { formatDateSafe } from '@/lib/dateUtils';

const orderStatusLabels: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  cancelled: 'Cancelado',
  expired: 'Expirado',
  refunded: 'Reembolsado',
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  paid: 'Pago',
  failed: 'Falhou',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

const methodLabels: Record<string, string> = {
  pix: 'Pix',
  credit_card: 'Cartao',
};

const providerLabels: Record<string, string> = {
  manual: 'Manual',
  mercado_pago: 'Mercado Pago',
  stripe: 'Stripe',
  pagarme: 'Pagar.me',
  asaas: 'Asaas',
};

const statusClasses: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  paid: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  expired: 'bg-muted text-muted-foreground border-border',
  refunded: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

function formatCurrency(valueCents: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(valueCents / 100);
}

function formatDate(value: string | null) {
  if (!value) return 'Nao confirmado';
  return formatDateSafe(value, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR, fallback: 'Data indisponivel' });
}

function getOrderProducts(order: AdminOrder) {
  return order.items.map((item) => item.product_name).join(', ') || 'Produto nao identificado';
}

export default function AdminFinance() {
  const { data: orders = [], isLoading } = useAdminOrders();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const stats = useMemo(() => {
    const paidOrders = orders.filter((order) => order.status === 'paid');
    const pendingOrders = orders.filter((order) => order.status === 'pending');
    const paidCustomerIds = new Set(paidOrders.map((order) => order.user_id));
    const revenueCents = paidOrders.reduce((total, order) => total + order.total_cents, 0);
    const pendingCents = pendingOrders.reduce((total, order) => total + order.total_cents, 0);

    return {
      revenueCents,
      pendingCents,
      paidOrders: paidOrders.length,
      pendingOrders: pendingOrders.length,
      paidCustomers: paidCustomerIds.size,
      currency: orders[0]?.currency ?? 'BRL',
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const searchable = [
        order.customer_name,
        order.customer_email,
        order.id,
        getOrderProducts(order),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="p-4 pb-24 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Compras, pagamentos e receita da plataforma</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Banknote className="w-4 h-4" />
              Receita paga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : formatCurrency(stats.revenueCents, stats.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="w-4 h-4" />
              A receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : formatCurrency(stats.pendingCents, stats.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="w-4 h-4" />
              Pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats.paidOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="w-4 h-4" />
              Compradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats.paidCustomers}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, produto ou pedido..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
          >
            Todos
          </Button>
          <Button
            type="button"
            variant={statusFilter === 'paid' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('paid')}
          >
            Pagos
          </Button>
          <Button
            type="button"
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pending')}
          >
            Pendentes
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando financeiro...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhuma compra encontrada</div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const mainPayment = order.payments[0];

            return (
              <Card key={order.id}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h2 className="font-semibold truncate">
                        {order.customer_name || 'Cliente sem nome'}
                      </h2>
                      <p className="text-sm text-muted-foreground truncate">{order.customer_email}</p>
                      <p className="text-xs text-muted-foreground">Pedido #{order.id.slice(0, 8)}</p>
                    </div>
                    <Badge className={statusClasses[order.status] ?? statusClasses.pending}>
                      {orderStatusLabels[order.status] ?? order.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Valor</p>
                      <p className="font-semibold">{formatCurrency(order.total_cents, order.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pago em</p>
                      <p className="font-semibold">{formatDate(order.paid_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Criado em</p>
                      <p className="font-semibold">{formatDate(order.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Produto</p>
                      <p className="font-semibold">{getOrderProducts(order)}</p>
                    </div>
                  </div>

                  {mainPayment && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          {methodLabels[mainPayment.method] ?? mainPayment.method}
                        </div>
                        <Badge className={statusClasses[mainPayment.status] ?? statusClasses.pending}>
                          {paymentStatusLabels[mainPayment.status] ?? mainPayment.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                        <p>Gateway: {providerLabels[mainPayment.provider] ?? mainPayment.provider}</p>
                        <p>Valor: {formatCurrency(mainPayment.amount_cents, order.currency)}</p>
                        {mainPayment.provider_payment_id && (
                          <p className="col-span-2 break-all">ID gateway: {mainPayment.provider_payment_id}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
