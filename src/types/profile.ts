export interface UserProfile {
  _id: string; // userId
  updatedAt: Date;
  status?: "active" | "inactive";
  progress: {
    currentAssessment: string | null;
    stepIndex: number;
    answers?: Record<string, any>;
  };
  profile: {
    finance?: {
      faturamento?: number;
      custos?: number;
      margem?: number;
      reinvestimentoPercent?: number;
      previsibilidadeScore?: number;
      caixaScore?: number;
    };
    operacional?: {
      horasSemana?: number;
      processosDocumentados?: string;
      dependenciaDoDonoScore?: number;
    };
    ferramentas?: {
      ferramentasUsadas?: string[];
      canaisComunicacao?: string[];
    };
    padronizacao?: {
      consistenciaScore?: number;
    };
    clientes?: {
      baseAtiva?: number;
      frequenciaCompra?: string;
      ticketMedio?: number;
      fidelizacaoPercent?: number;
    };
    aquisicao?: {
      canais?: string[];
    };
    estrategia?: {
      diferencial?: string;
      planosScore?: number;
      concorrenciaScore?: number;
      novosProdutosScore?: number;
    };
    organizacao?: {
      equipe?: number;
      divisaoResponsabilidadesScore?: number;
      culturaScore?: number;
    };
    contexto?: {
      tempoNegocio?: number;
      canalPrincipal?: string;
      objetivoNegocio?: string;
      produtoServico?: string;
      desafioAtual?: string;
      objetivo6Meses?: string;
    };
  };
  scoring?: {
    financeira?: { score: number; moment: string };
    operacional?: { score: number; moment: string };
    ferramentasPadronizacao?: { score: number; moment: string };
    mercadoCliente?: { score: number; moment: string };
    estrategiaOrganizacao?: { score: number; moment: string };
    contexto?: { score: number; moment: string };
    momentoGeral?: string;
  };
} 