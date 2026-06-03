import mongoose from 'mongoose';
import dbConnect from '../db';
import WBSItemModel, { mapToWBSItemType } from '../models/WBSItem';
import { WBSConfigService } from './WBSConfigService';
import { SourceOfTruthService } from './SourceOfTruthService';
import { AIService } from '../ai';
import type { WBSItemDTO } from '@/dtos';

export class WBSItemService {
  /**
   * Retrieves WBSItems belonging to a specific project.
   */
  static async getWBSItemsByProjectId(projectId: string): Promise<WBSItemDTO[]> {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    await dbConnect();
    const items = await WBSItemModel.find({ projectId }).sort({ order: 1 }).lean();
    return items.map((doc: any) => mapToWBSItemType(doc));
  }

  /**
   * Generates Level 4 Subtasks for a Level 3 WBS Task using AI, saving them in the database.
   * If old generated subtasks exist under this parentId, they are completely overwritten
   * to prevent duplication and clutter.
   */
  static async breakdownTaskToSubtasks(taskId: string): Promise<WBSItemDTO[]> {
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      throw new Error('Valid WBS Task ID is required');
    }

    await dbConnect();

    // 1. Fetch the target Level 3 WBS Task
    const taskDoc = await WBSItemModel.findById(taskId);
    if (!taskDoc) {
      throw new Error(`WBS Task with ID ${taskId} not found.`);
    }

    // Verify it is indeed a Level 3 Task (or Story) and not an Epic itself
    if (taskDoc.type === 'epic') {
      throw new Error('Cannot perform developer task breakdown directly on an Epic.');
    }

    const projectId = taskDoc.projectId.toString();

    // 2. Query Project's WBSConfig and Source of Truth
    const config = (await WBSConfigService.getWBSConfigByProjectId(projectId)) || {
      techStack: { languages: [], frameworks: [], databases: [], cloud: [] },
      teamComposition: '',
      compliance: [],
      integrations: [],
      timeline: {},
    };

    const sourceOfTruth = await SourceOfTruthService.getSourceOfTruthByProjectId(projectId);
    const sourceOfTruthContent = sourceOfTruth?.content || '';

    // 3. Call AI Decompositions Engine
    const generatedSubtasks = await AIService.getInstance().generateDeveloperSubtasks(
      mapToWBSItemType(taskDoc),
      config,
      sourceOfTruthContent
    );

    // 4. Overwrite behavior: Delete old Level 4 Subtasks for this taskId
    await WBSItemModel.deleteMany({
      parentId: taskDoc._id,
      type: 'subtask',
    });

    // If AI failed or returned empty, return empty list
    if (!generatedSubtasks || generatedSubtasks.length === 0) {
      return [];
    }

    // 5. Build and save new Level 4 subtask documents
    const subtasksToCreate = generatedSubtasks.map((sub: any, index: number) => ({
      projectId: taskDoc.projectId,
      parentId: taskDoc._id,
      sourceOfTruthId: taskDoc.sourceOfTruthId,
      title: sub.title,
      description: sub.description || '',
      type: 'subtask' as const,
      status: 'ai_generated' as const,
      order: index,
      aiGenerated: true,
    }));

    const createdDocs = await WBSItemModel.create(subtasksToCreate);

    return createdDocs.map((doc: any) => mapToWBSItemType(doc));
  }

  /**
   * Generates WBS items (Epics, Stories, Tasks) from Source of Truth & Config,
   * saving them in the database with resolved parent-child relationships.
   */
  static async generateWBSForProject(projectId: string): Promise<WBSItemDTO[]> {
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      throw new Error('Valid Project ID is required');
    }

    await dbConnect();

    // 1. Fetch the project's WBSConfig and Source of Truth
    const config = (await WBSConfigService.getWBSConfigByProjectId(projectId)) || {
      techStack: { languages: [], frameworks: [], databases: [], cloud: [] },
      teamComposition: '',
      compliance: [],
      integrations: [],
      timeline: {},
    };

    const sourceOfTruth = await SourceOfTruthService.getSourceOfTruthByProjectId(projectId);
    if (!sourceOfTruth || !sourceOfTruth.content) {
      throw new Error('Source of Truth has not been defined or is empty.');
    }

    // 2. Call AI generateWBS service
    const generatedItems = await AIService.getInstance().generateWBS(
      sourceOfTruth.content,
      config
    );

    if (!generatedItems || generatedItems.length === 0) {
      return [];
    }

    // 3. Clear existing WBS items for this project
    await WBSItemModel.deleteMany({ projectId });

    // 4. Map items and resolve hierarchical relationships (Epic -> Story -> Task)
    const tempIdMap = new Map<string, mongoose.Types.ObjectId>();

    // Phase 1: Create Epics
    const epics = generatedItems.filter((item: any) => item.type === 'epic');
    for (const epic of epics) {
      const doc = await WBSItemModel.create({
        projectId,
        sourceOfTruthId: sourceOfTruth.id,
        title: epic.title,
        description: epic.description || '',
        type: 'epic',
        status: 'ai_generated',
        acceptanceCriteria: epic.acceptanceCriteria || [],
        sourceRequirements: epic.sourceRequirements || [],
        order: epics.indexOf(epic),
        aiGenerated: true,
      });
      tempIdMap.set(epic.tempId, doc._id as mongoose.Types.ObjectId);
    }

    // Phase 2: Create Stories (which point to Epics)
    const stories = generatedItems.filter((item: any) => item.type === 'story');
    for (const story of stories) {
      const parentId = story.parentTempId ? tempIdMap.get(story.parentTempId) : undefined;
      const doc = await WBSItemModel.create({
        projectId,
        parentId,
        sourceOfTruthId: sourceOfTruth.id,
        title: story.title,
        description: story.description || '',
        type: 'story',
        status: 'ai_generated',
        acceptanceCriteria: story.acceptanceCriteria || [],
        sourceRequirements: story.sourceRequirements || [],
        order: stories.indexOf(story),
        aiGenerated: true,
      });
      tempIdMap.set(story.tempId, doc._id as mongoose.Types.ObjectId);
    }

    // Phase 3: Create Tasks (which point to Stories)
    const tasks = generatedItems.filter((item: any) => item.type === 'task');
    for (const task of tasks) {
      const parentId = task.parentTempId ? tempIdMap.get(task.parentTempId) : undefined;
      const doc = await WBSItemModel.create({
        projectId,
        parentId,
        sourceOfTruthId: sourceOfTruth.id,
        title: task.title,
        description: task.description || '',
        type: 'task',
        status: 'ai_generated',
        acceptanceCriteria: task.acceptanceCriteria || [],
        sourceRequirements: task.sourceRequirements || [],
        order: tasks.indexOf(task),
        aiGenerated: true,
      });
      tempIdMap.set(task.tempId, doc._id as mongoose.Types.ObjectId);
    }

    // Return the complete newly saved WBS list
    return this.getWBSItemsByProjectId(projectId);
  }
}
