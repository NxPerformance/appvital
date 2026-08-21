# Análise do Ozempro — o que copiar, adaptar ou descartar

> Baseado em 6 levas de prints do app Ozempro (Home, Tratamento, menu "+", Comunidade, Perfil, Configurações). Objetivo: aproveitar boas ideias de UX pro Vitalissy, sempre com identidade visual própria e sem contradizer o posicionamento clínico (app de acompanhamento com a Dra. Gabriela, não app de dieta/fitness genérico ou rede social).

## Tier 1 — Implementar primeiro (alto valor, baixo risco, já alinhado com o roadmap)

1. **Countdown "Próxima Aplicação"** — já estava no checklist; precisa de um campo de "frequência esperada" no modelo de Injetáveis
2. **Diário de efeitos colaterais** por aplicação — já estava no checklist
3. **Linha do Tempo de peso** (peso inicial → atual → meta, com data estimada de chegada) — novo, forte candidato, dá pra alimentar com dados que já temos
4. **IMC atual vs. meta com régua visual de risco** (colorida, tipo termômetro) — já calculamos BMI na bioimpedância, só falta essa visualização
5. **Botão "+" flutuante global** com atalhos rápidos — mas só com "Registrar Aplicação" e "Registrar Peso" (não os itens de calorias/atividade)
6. **Régua de datas arrastável** sincronizando peso + foto de progresso na mesma linha do tempo (Evolução/Fotos)
7. **Gerar Relatório do Tratamento (PDF)** — exportar histórico de doses/peso/efeitos colaterais pra levar numa consulta ou a própria Dra. Gabriela revisar
8. **Notificações push** de dose/consulta — reforçar o que já existe
9. **Sincronização com Apple Health/Google Fit** — já estava no roadmap de wearables, essa tela confirma o padrão (toggle simples)

## Tier 2 — Precisa de decisão clínica/produto antes de construir (alinhar com a Dra. Gabriela)

1. Card de dica/insight automático — conteúdo precisa aval médico, não pode ser genérico
2. Checklist de onboarding "Comece aqui" — adaptar os passos ao nosso funil (1ª aplicação, 1º peso, 1ª consulta)
3. Conteúdo editorial curado (tipo mini-blog) — deve ser escrito/aprovado pela clínica, nunca user-generated
4. Chat com IA — definir escopo do que pode/não pode responder (efeitos colaterais e dosagem são território médico sensível)
5. Curva de nível de medicação (farmacocinética) — precisa validar meia-vida de cada medicamento com a médica antes de simular
6. Registro de água — baixa prioridade, fácil de adicionar quando quiserem
7. Suplementos — avaliar valor clínico antes de construir
8. Widget na tela de início (nativo) — esforço técnico considerável, fase 2

## Tier 3 — Descartado (não copiar)

- **Grupos abertos / comunidade user-generated** — risco regulatório real: nos prints, vários grupos eram na prática canais de venda irregular de medicamento/peptídeos (ex: "TG SP – grupo para venda de TG", "Tirzes mg – venda de mom mom e peptídios")
- **Ranking público de peso perdido/sequência** — dado de saúde exposto publicamente é problemático (LGPD) e pode reforçar comparação prejudicial num contexto de tratamento médico supervisionado
- **Calorias/macros/refeições** — vira contador de dieta genérico, foge do posicionamento de clínica de endocrinologia
- **Atividade/passos/anéis** — já decidimos demover treino/atividade a complemento; duplicar contradiz essa decisão
- **Mascote + trocar fundo/tema** — estética de app de consumo casual, quebra a identidade clínica/profissional
- **Reordenar cards da home** — customização de baixo valor pro esforço
- **Indique e Ganhe (cashback de indicação)** — decisão de modelo de negócio que precisa passar pela Dra. Gabriela, e depende do Stripe funcionando de verdade
- **Unidades (Métrico/Imperial) / múltiplos idiomas** — público é 100% Brasil, sem necessidade agora

## Tier 4 — Pendente de infraestrutura (Stripe)

- Cadeado/paywall em recursos premium
- Restaurar compras / cancelar assinatura

## Achado à parte — checar compliance LGPD

O Ozempro tem uma seção "Legal" completa: Política de Privacidade, Termos e Condições, Privacidade e consentimentos, Exportar meus dados, Excluir conta. Isso é exigência básica pra qualquer app de saúde no Brasil — preciso checar se o Vitalissy já tem essas telas ou se é uma lacuna a fechar com prioridade.
