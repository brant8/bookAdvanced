import { eq, sql } from 'drizzle-orm';

import { createDatabase } from './client.js';
import { getDatabaseUrl } from './config.js';
import {
  chapters,
  projects,
  storylineMilestones,
  storylines,
  storyNodes,
  users,
} from './schema.js';

class RollbackSmokeTest extends Error {}

const { db, pool } = createDatabase(getDatabaseUrl());

try {
  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ displayName: 'Smoke Test User', isLocal: false })
      .returning({ id: users.id });

    if (!user) {
      throw new Error('Failed to create smoke test user.');
    }

    const [project] = await tx
      .insert(projects)
      .values({
        name: 'Smoke Test Project',
        ownerId: user.id,
      })
      .returning({ id: projects.id });

    if (!project) {
      throw new Error('Failed to create smoke test project.');
    }

    const [storyline] = await tx
      .insert(storylines)
      .values({
        endingGoal: '主角建立星际宗门',
        projectId: project.id,
        title: '主线',
      })
      .returning({ id: storylines.id });

    if (!storyline) {
      throw new Error('Failed to create smoke test storyline.');
    }

    const [milestone] = await tx
      .insert(storylineMilestones)
      .values({
        sortOrder: 0,
        storylineId: storyline.id,
        title: '获得第一艘飞船',
      })
      .returning({ id: storylineMilestones.id });

    if (!milestone) {
      throw new Error('Failed to create smoke test milestone.');
    }

    const [node] = await tx
      .insert(storyNodes)
      .values({
        milestoneId: milestone.id,
        nodeGoal: '主角取得飞船控制权',
        projectId: project.id,
        sortOrder: 0,
        storylineId: storyline.id,
        title: '夺船',
      })
      .returning({ id: storyNodes.id });

    if (!node) {
      throw new Error('Failed to create smoke test story node.');
    }

    await tx.insert(chapters).values({
      chapterNumber: 1,
      projectId: project.id,
      storyNodeId: node.id,
      title: '第一章 夺船',
    });

    const [result] = await tx
      .select({
        chapterCount: sql<number>`count(${chapters.id})::int`,
        endingGoal: storylines.endingGoal,
      })
      .from(storylines)
      .leftJoin(storyNodes, eq(storyNodes.storylineId, storylines.id))
      .leftJoin(chapters, eq(chapters.storyNodeId, storyNodes.id))
      .where(eq(storylines.id, storyline.id))
      .groupBy(storylines.id);

    if (result?.chapterCount !== 1 || result.endingGoal !== '主角建立星际宗门') {
      throw new Error('Database smoke test returned unexpected data.');
    }

    throw new RollbackSmokeTest();
  });
} catch (error) {
  if (!(error instanceof RollbackSmokeTest)) {
    throw error;
  }

  console.log('Database smoke test passed.');
} finally {
  await pool.end();
}
