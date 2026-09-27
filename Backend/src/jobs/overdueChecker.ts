import cron from "node-cron";
import prisma from "../utils/prisma";

export function startOverdueChecker() {
  // Runs every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    const now = new Date();

    const result = await prisma.task.updateMany({
      where: {
        dueDate: { lt: now },
        isOverdue: false,
        status: { not: "DONE" },
      },
      data: { isOverdue: true },
    });

    if (result.count > 0) {
      console.log(`[Overdue Checker] Flagged ${result.count} task(s) as overdue`);
    }
  });

  console.log("[Overdue Checker] Scheduled job started (runs every 5 minutes)");
}