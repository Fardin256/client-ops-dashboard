import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 10);

  // Users
  const admin = await prisma.user.create({
    data: { name: "Alex Admin", email: "admin@velozity.com", passwordHash, role: "ADMIN" },
  });

  const pm1 = await prisma.user.create({
    data: { name: "Priya PM", email: "priya@velozity.com", passwordHash, role: "PM" },
  });
  const pm2 = await prisma.user.create({
    data: { name: "Marcus PM", email: "marcus@velozity.com", passwordHash, role: "PM" },
  });

  const dev1 = await prisma.user.create({
    data: { name: "Ravi Developer", email: "ravi@velozity.com", passwordHash, role: "DEVELOPER" },
  });
  const dev2 = await prisma.user.create({
    data: { name: "Sara Developer", email: "sara@velozity.com", passwordHash, role: "DEVELOPER" },
  });
  const dev3 = await prisma.user.create({
    data: { name: "Tom Developer", email: "tom@velozity.com", passwordHash, role: "DEVELOPER" },
  });
  const dev4 = await prisma.user.create({
    data: { name: "Nina Developer", email: "nina@velozity.com", passwordHash, role: "DEVELOPER" },
  });

  // Clients
  const client1 = await prisma.client.create({ data: { name: "Acme Corp" } });
  const client2 = await prisma.client.create({ data: { name: "Globex Inc" } });
  const client3 = await prisma.client.create({ data: { name: "Initech" } });

  // Projects
  const project1 = await prisma.project.create({
    data: { name: "Website Redesign", description: "Full site overhaul", clientId: client1.id, creatorId: pm1.id },
  });
  const project2 = await prisma.project.create({
    data: { name: "Mobile App MVP", description: "iOS/Android launch", clientId: client2.id, creatorId: pm1.id },
  });
  const project3 = await prisma.project.create({
    data: { name: "API Migration", description: "Legacy system upgrade", clientId: client3.id, creatorId: pm2.id },
  });

  const now = Date.now();
  const daysFromNow = (d: number) => new Date(now + d * 24 * 60 * 60 * 1000);

  // Tasks — Project 1 (5 tasks)
  const p1tasks = await Promise.all([
    prisma.task.create({ data: { title: "Design homepage mockup", projectId: project1.id, assigneeId: dev1.id, status: "DONE", priority: "HIGH", dueDate: daysFromNow(-5) } }),
    prisma.task.create({ data: { title: "Build navigation component", projectId: project1.id, assigneeId: dev1.id, status: "IN_PROGRESS", priority: "MEDIUM", dueDate: daysFromNow(3) } }),
    prisma.task.create({ data: { title: "Integrate CMS", projectId: project1.id, assigneeId: dev2.id, status: "TODO", priority: "HIGH", dueDate: daysFromNow(-2), isOverdue: true } }),
    prisma.task.create({ data: { title: "Responsive layout fixes", projectId: project1.id, assigneeId: dev2.id, status: "IN_REVIEW", priority: "LOW", dueDate: daysFromNow(5) } }),
    prisma.task.create({ data: { title: "SEO optimization", projectId: project1.id, assigneeId: dev1.id, status: "TODO", priority: "MEDIUM", dueDate: daysFromNow(10) } }),
  ]);

  // Tasks — Project 2 (5 tasks)
  const p2tasks = await Promise.all([
    prisma.task.create({ data: { title: "Set up React Native project", projectId: project2.id, assigneeId: dev3.id, status: "DONE", priority: "CRITICAL", dueDate: daysFromNow(-10) } }),
    prisma.task.create({ data: { title: "Build login flow", projectId: project2.id, assigneeId: dev3.id, status: "IN_PROGRESS", priority: "HIGH", dueDate: daysFromNow(2) } }),
    prisma.task.create({ data: { title: "Push notifications", projectId: project2.id, assigneeId: dev4.id, status: "TODO", priority: "MEDIUM", dueDate: daysFromNow(-1), isOverdue: true } }),
    prisma.task.create({ data: { title: "App store submission prep", projectId: project2.id, assigneeId: dev4.id, status: "TODO", priority: "CRITICAL", dueDate: daysFromNow(7) } }),
    prisma.task.create({ data: { title: "Crash reporting integration", projectId: project2.id, assigneeId: dev3.id, status: "IN_REVIEW", priority: "MEDIUM", dueDate: daysFromNow(4) } }),
  ]);

  // Tasks — Project 3 (5 tasks)
  const p3tasks = await Promise.all([
    prisma.task.create({ data: { title: "Audit legacy endpoints", projectId: project3.id, assigneeId: dev2.id, status: "DONE", priority: "HIGH", dueDate: daysFromNow(-8) } }),
    prisma.task.create({ data: { title: "Design new schema", projectId: project3.id, assigneeId: dev2.id, status: "IN_PROGRESS", priority: "CRITICAL", dueDate: daysFromNow(1) } }),
    prisma.task.create({ data: { title: "Write migration scripts", projectId: project3.id, assigneeId: dev4.id, status: "TODO", priority: "HIGH", dueDate: daysFromNow(6) } }),
    prisma.task.create({ data: { title: "Update API docs", projectId: project3.id, assigneeId: dev4.id, status: "TODO", priority: "LOW", dueDate: daysFromNow(9) } }),
    prisma.task.create({ data: { title: "Load testing", projectId: project3.id, assigneeId: dev2.id, status: "IN_REVIEW", priority: "MEDIUM", dueDate: daysFromNow(3) } }),
  ]);

  // Activity log entries — so feed isn't empty on first load
  const allTasks = [...p1tasks, ...p2tasks, ...p3tasks];
  for (const task of allTasks.slice(0, 8)) {
    await prisma.taskActivity.create({
      data: {
        action: "TASK_CREATED",
        newStatus: task.status,
        taskId: task.id,
        projectId: task.projectId,
        userId: task.assigneeId,
      },
    });
  }

  console.log("Seed complete:");
  console.log("  Admin login:    admin@velozity.com / password123");
  console.log("  PM login:       priya@velozity.com / password123");
  console.log("  Developer login: ravi@velozity.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });