import { z } from "../../openapi";
import {
  id,
  initiativeSchema,
  milestoneSchema,
  projectSummarySchema,
} from "../planning/schema";

export const roadmapSchema = z.object({
  projects: z.array(
    projectSummarySchema
      .pick({
        id: true,
        workspaceId: true,
        name: true,
        slug: true,
        icon: true,
        status: true,
        health: true,
        leadId: true,
        leadName: true,
        startDate: true,
        targetDate: true,
        priority: true,
        progress: true,
      })
      .extend({
        leadImage: z.string().nullable(),
        initiativeIds: z.array(id),
        milestones: z.array(
          milestoneSchema.pick({
            id: true,
            projectId: true,
            name: true,
            targetDate: true,
            position: true,
            progress: true,
          }),
        ),
      }),
  ),
  initiatives: z.array(
    initiativeSchema.pick({
      id: true,
      name: true,
      color: true,
      position: true,
    }),
  ),
});
