import cron from "node-cron";
import { getDb } from "../config/mongodb.js";
import WhatsAppService from "./whatsapp.service.js";

export class CronService {
  private whatsAppService: WhatsAppService;

  constructor() {
    this.whatsAppService = new WhatsAppService();
  }

  public start() {
    console.log("Starting cron jobs...");
    this.scheduleDailyEngagement();
    this.scheduleUserCleanup();
  }

  private scheduleDailyEngagement() {
    // Runs every day at 10:00 AM
    cron.schedule("0 10 * * *", async () => {
      console.log("Running daily engagement cron job...");
      const db = getDb();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const users = await db.collection("user_profiles").find({
        status: { $ne: "inactive" },
        updatedAt: { $gte: sevenDaysAgo }
      }).toArray();

      for (const user of users) {
        if (user.scoring) {
          const weakestDimension = this.findWeakestDimension(user.scoring);
          if (weakestDimension) {
            const message = `Olá! Vi que um dos seus focos é a organização na área de ${weakestDimension.name}. Que tal darmos o próximo passo com o nosso diagnóstico de ${weakestDimension.name}? Pode te dar ótimas ideias. Quer começar?`;
            await this.whatsAppService.sendMessage(user._id.toString(), message);
          }
        }
      }
    }, {
      timezone: "America/Sao_Paulo"
    });
  }

  private scheduleUserCleanup() {
    // Runs every day at 2:00 AM
    cron.schedule("0 2 * * *", async () => {
        console.log("Running user cleanup cron job...");
        const db = getDb();
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        await db.collection("user_profiles").updateMany(
            { status: { $ne: "inactive" }, updatedAt: { $lt: sevenDaysAgo } },
            { $set: { status: "inactive" } }
        );
    }, {
        timezone: "America/Sao_Paulo"
    });
  }

  private findWeakestDimension(scoring: any): { name: string; score: number } | null {
    const dimensions = [
      { name: "financeira", score: scoring.financeira?.score },
      { name: "operacional", score: scoring.operacional?.score },
      { name: "ferramentas e padronização", score: scoring.ferramentasPadronizacao?.score },
      { name: "mercado e cliente", score: scoring.mercadoCliente?.score },
      { name: "estratégia e organização", score: scoring.estrategiaOrganizacao?.score },
      { name: "contexto", score: scoring.contexto?.score },
    ];

    const validDimensions = dimensions.filter(d => typeof d.score === 'number');
    if (validDimensions.length === 0) return null;

    validDimensions.sort((a, b) => a.score! - b.score!);
    return validDimensions[0];
  }
} 