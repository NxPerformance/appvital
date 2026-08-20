import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePaymentGatewaySettings, useUpdateStripeGatewaySettings } from '@/hooks/useAdmin';

export default function AdminPaymentSettings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = usePaymentGatewaySettings();
  const updateSettings = useUpdateStripeGatewaySettings();
  const [isActive, setIsActive] = useState(true);
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  useEffect(() => {
    if (!settings) return;
    setIsActive(settings.is_active);
    setPublishableKey(settings.publishable_key ?? '');
  }, [settings]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await updateSettings.mutateAsync({
        is_active: isActive,
        publishable_key: publishableKey,
        secret_key: secretKey,
        webhook_secret: webhookSecret,
      });
      setSecretKey('');
      setWebhookSecret('');
      toast({
        title: 'Configurações salvas',
        description: 'As chaves da Stripe foram atualizadas com segurança.',
      });
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar as chaves da Stripe.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 pb-24 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Gateway de Pagamento</h1>
          <p className="text-sm text-muted-foreground">Chaves e webhook da Stripe</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Status da integração
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-muted-foreground">Gateway ativo</p>
            <Badge className={settings?.is_active ? 'mt-2' : 'mt-2 bg-muted text-muted-foreground'}>
              {settings?.is_active ? 'Stripe ativo' : 'Inativo'}
            </Badge>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-muted-foreground">Secret key</p>
            <p className="mt-2 font-medium">{settings?.secret_key_preview ?? 'Nao configurada'}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-muted-foreground">Webhook secret</p>
            <p className="mt-2 font-medium">{settings?.webhook_secret_preview ?? 'Nao configurado'}</p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Chaves da Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
              <div>
                <Label htmlFor="stripe-active">Usar Stripe nos checkouts</Label>
                <p className="text-sm text-muted-foreground">Ative para criar pagamentos pela Stripe.</p>
              </div>
              <Switch id="stripe-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publishable-key">Publishable key</Label>
              <Input
                id="publishable-key"
                value={publishableKey}
                onChange={(event) => setPublishableKey(event.target.value)}
                placeholder="Cole a publishable key da Stripe"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret-key">Secret key</Label>
              <Input
                id="secret-key"
                type="password"
                value={secretKey}
                onChange={(event) => setSecretKey(event.target.value)}
                placeholder={settings?.has_secret_key ? 'Deixe em branco para manter a chave atual' : 'Cole a secret key da Stripe'}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Webhook secret</Label>
              <Input
                id="webhook-secret"
                type="password"
                value={webhookSecret}
                onChange={(event) => setWebhookSecret(event.target.value)}
                placeholder={settings?.has_webhook_secret ? 'Deixe em branco para manter o segredo atual' : 'Cole o webhook secret da Stripe'}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" disabled={isLoading || updateSettings.isPending} className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              {updateSettings.isPending ? 'Salvando...' : 'Salvar chaves'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
