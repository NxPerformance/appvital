import { ArrowLeft, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="h-screen overflow-y-auto bg-background px-6 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-6 pb-12">
        <div className="flex items-center gap-4">
          <Link to="/registro" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Termos de Uso</h1>
            <p className="text-sm text-muted-foreground">Vitalissy</p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/60 p-6 shadow-elegant">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">Última atualização: 27/04/2026</p>
              <p className="text-sm text-muted-foreground">Leia antes de criar sua conta.</p>
            </div>
          </div>

          <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">1. Uso da plataforma</h2>
              <p>
                A Vitalissy oferece ferramentas para acompanhamento de treinos, perfil corporal, hábitos, planos,
                agendamentos e recursos relacionados à saúde e performance. Ao criar uma conta, você concorda em
                fornecer informações verdadeiras e manter seus dados atualizados.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">2. Informações de saúde</h2>
              <p>
                Os dados exibidos no app têm finalidade informativa e de acompanhamento. Eles não substituem consulta,
                diagnóstico, prescrição ou orientação individualizada de médicos, nutricionistas, profissionais de
                educação física ou outros profissionais habilitados.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">3. Responsabilidade do usuário</h2>
              <p>
                Você é responsável pelas informações inseridas, pelo uso seguro da conta e por avaliar sua condição
                física antes de realizar atividades, treinos, procedimentos ou mudanças de rotina.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">4. Dados pessoais</h2>
              <p>
                Coletamos e processamos dados necessários para criar sua conta, personalizar sua experiência e armazenar
                seu histórico no aplicativo. O acesso aos seus dados é vinculado à sua conta e protegido por autenticação.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">5. Planos e pagamentos</h2>
              <p>
                Recursos premium podem depender de pagamento, aprovação ou disponibilidade operacional. Valores,
                condições e benefícios podem ser atualizados, sempre respeitando os acessos já contratados conforme a
                política aplicável.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">6. Contas de personal trainer</h2>
              <p>
                Cadastros como personal trainer podem passar por validação administrativa. O envio de dados profissionais
                não garante aprovação automática.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">7. Alterações dos termos</h2>
              <p>
                Estes termos podem ser atualizados para refletir melhorias do serviço, exigências legais ou mudanças
                operacionais. O uso contínuo da plataforma após alterações indica concordância com a versão vigente.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
