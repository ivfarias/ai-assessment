export class ScoringService {
    getFinancialMoment(score) {
        if (score <= 3)
            return "Sobrevivência";
        if (score <= 6)
            return "Organização";
        return "Crescimento";
    }
    calculateFinancialScore(profile) {
        const { finance } = profile;
        if (!finance)
            return null;
        let score = 0;
        // Faturamento
        if (finance.faturamento) {
            if (finance.faturamento > 8000)
                score += 2;
            else if (finance.faturamento >= 3001)
                score += 1;
        }
        // Margem
        if (finance.margem) {
            if (finance.margem > 0.2)
                score += 2;
            else if (finance.margem >= 0.1)
                score += 1;
        }
        // Reinvestimento
        if (finance.reinvestimentoPercent) {
            if (finance.reinvestimentoPercent > 40)
                score += 2;
        }
        // Previsibilidade
        if (finance.previsibilidadeScore) {
            if (finance.previsibilidadeScore >= 4)
                score += 2;
            else if (finance.previsibilidadeScore === 3)
                score += 1;
        }
        // Caixa
        if (finance.caixaScore) {
            if (finance.caixaScore === 5)
                score += 2;
            else if (finance.caixaScore >= 3)
                score += 1;
        }
        const moment = this.getFinancialMoment(score);
        return { score, moment };
    }
    // --- Operacional ---
    getOperationalMoment(score) {
        if (score <= 3)
            return "Sobrevivência";
        if (score <= 5)
            return "Organização";
        return "Crescimento";
    }
    calculateOperationalScore(profile) {
        const { operacional } = profile;
        if (!operacional)
            return null;
        let score = 0;
        if (operacional.horasSemana) {
            if (operacional.horasSemana > 40)
                score += 2;
            else if (operacional.horasSemana >= 20)
                score += 1;
        }
        if (operacional.processosDocumentados) {
            if (operacional.processosDocumentados === 'completa')
                score += 2;
            else if (['basica', 'anotacoes'].includes(operacional.processosDocumentados))
                score += 1;
        }
        if (operacional.dependenciaDoDonoScore) {
            if (operacional.dependenciaDoDonoScore === 5)
                score += 2;
            else if (operacional.dependenciaDoDonoScore >= 3)
                score += 1;
        }
        return { score, moment: this.getOperationalMoment(score) };
    }
    // --- Ferramentas e Padronização ---
    getToolsMoment(score) {
        if (score <= 3)
            return "Sobrevivência";
        if (score <= 6)
            return "Organização";
        return "Crescimento";
    }
    calculateToolsScore(profile) {
        const { ferramentas, padronizacao, organizacao } = profile;
        if (!ferramentas && !padronizacao && !organizacao)
            return null;
        let score = 0;
        if (ferramentas?.ferramentasUsadas) {
            if (ferramentas.ferramentasUsadas.includes('erp_crm'))
                score += 2;
            else if (ferramentas.ferramentasUsadas.some(f => ['planilhas', 'whatsapp_business'].includes(f)))
                score += 1;
        }
        if (organizacao?.culturaScore) { // Assuming culturaScore maps to canaisComunicacao
            if (organizacao.culturaScore >= 3)
                score += 2;
        }
        if (padronizacao?.consistenciaScore) {
            if (padronizacao.consistenciaScore === 5)
                score += 2;
            else if (padronizacao.consistenciaScore >= 3)
                score += 1;
        }
        return { score, moment: this.getToolsMoment(score) };
    }
    // --- Mercado e Cliente ---
    getMarketMoment(score) {
        if (score <= 4)
            return "Sobrevivência";
        if (score <= 6)
            return "Organização";
        return "Crescimento";
    }
    calculateMarketScore(profile) {
        const { clientes } = profile;
        if (!clientes)
            return null;
        let score = 0;
        if (clientes.baseAtiva) {
            if (clientes.baseAtiva > 100)
                score += 2;
            else if (clientes.baseAtiva >= 50)
                score += 1;
        }
        if (clientes.frequenciaCompra) {
            if (['semanal', 'quinzenal'].includes(clientes.frequenciaCompra))
                score += 2;
            else if (clientes.frequenciaCompra === 'mensal')
                score += 1;
        }
        if (clientes.ticketMedio) {
            if (clientes.ticketMedio > 100)
                score += 2;
            else if (clientes.ticketMedio >= 51)
                score += 1;
        }
        if (clientes.fidelizacaoPercent) {
            if (clientes.fidelizacaoPercent > 60)
                score += 2;
            else if (clientes.fidelizacaoPercent >= 40)
                score += 1;
        }
        return { score, moment: this.getMarketMoment(score) };
    }
    // --- Estratégia e Organização ---
    getStrategyMoment(score) {
        if (score <= 3)
            return "Sobrevivência";
        if (score <= 6)
            return "Organização";
        return "Crescimento";
    }
    calculateStrategyScore(profile) {
        const { estrategia, organizacao } = profile;
        if (!estrategia && !organizacao)
            return null;
        let score = 0;
        let strategySubScore = 0;
        if (estrategia?.planosScore && estrategia.planosScore >= 3)
            strategySubScore++;
        if (estrategia?.concorrenciaScore && estrategia.concorrenciaScore >= 3)
            strategySubScore++;
        if (estrategia?.novosProdutosScore && estrategia.novosProdutosScore >= 3)
            strategySubScore++;
        if (strategySubScore >= 2)
            score += 2;
        else if (strategySubScore === 1)
            score += 1;
        let orgSubScore = 0;
        if (organizacao?.equipe && organizacao.equipe > 1)
            orgSubScore++;
        if (organizacao?.divisaoResponsabilidadesScore && organizacao.divisaoResponsabilidadesScore >= 3)
            orgSubScore++;
        if (organizacao?.culturaScore && organizacao.culturaScore >= 3)
            orgSubScore++;
        if (orgSubScore >= 2)
            score += 2;
        else if (orgSubScore === 1)
            score += 1;
        return { score, moment: this.getStrategyMoment(score) };
    }
    // --- Contexto ---
    getContextMoment(score) {
        if (score <= 3)
            return "Sobrevivência";
        if (score <= 5)
            return "Organização";
        return "Crescimento";
    }
    calculateContextScore(profile) {
        const { contexto } = profile;
        if (!contexto)
            return null;
        let score = 0;
        if (contexto.tempoNegocio) {
            if (contexto.tempoNegocio > 2)
                score += 2;
            else if (contexto.tempoNegocio >= 1)
                score += 1;
        }
        if (contexto.canalPrincipal) {
            if (['marketplace', 'site_proprio'].includes(contexto.canalPrincipal))
                score += 2;
            else if (['redes_sociais', 'loja_fisica'].includes(contexto.canalPrincipal))
                score += 1;
        }
        if (contexto.objetivoNegocio) {
            if (['escalar', 'vender', 'legado'].includes(contexto.objetivoNegocio))
                score += 2;
            else if (['crescer', 'profissionalizar'].includes(contexto.objetivoNegocio))
                score += 1;
        }
        return { score, moment: this.getContextMoment(score) };
    }
    // --- Overall Calculation ---
    getOverallMoment(avgScore) {
        if (avgScore <= 3.4)
            return "Momento Sobrevivência";
        if (avgScore <= 6.4)
            return "Momento Organização e Estabilidade";
        return "Momento Crescimento Estruturado";
    }
    calculateOverallScore(profile) {
        const financial = this.calculateFinancialScore(profile);
        const operational = this.calculateOperationalScore(profile);
        const tools = this.calculateToolsScore(profile);
        const market = this.calculateMarketScore(profile);
        const strategy = this.calculateStrategyScore(profile);
        const context = this.calculateContextScore(profile);
        const scores = [financial, operational, tools, market, strategy, context].filter(s => s !== null);
        const avgScore = scores.reduce((acc, s) => acc + s.score, 0) / (scores.length || 1);
        return {
            financeira: financial || undefined,
            operacional: operational || undefined,
            ferramentasPadronizacao: tools || undefined,
            mercadoCliente: market || undefined,
            estrategiaOrganizacao: strategy || undefined,
            contexto: context || undefined,
            momentoGeral: this.getOverallMoment(avgScore),
        };
    }
}
//# sourceMappingURL=scoring.service.js.map