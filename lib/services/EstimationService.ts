import mongoose from 'mongoose';
import dbConnect from '../db';
import { StoryPoint, mapToStoryPointType } from '../models/Estimation';
import WBSItemModel from '../models/WBSItem';
import { QdrantService } from './QdrantService';
import { AIService } from '../ai';
import type { StoryPointDTO } from '@/dtos';

export class EstimationService {
  /**
   * Estimates story points for a specific WBS Item (Task/Story) using Qdrant RAG and LLM.
   * Overwrites any existing estimate for this item.
   */
  static async estimateStoryPoints(wbsItemId: string, userId?: string): Promise<StoryPointDTO> {
    if (!wbsItemId || !mongoose.Types.ObjectId.isValid(wbsItemId)) {
      throw new Error('Valid WBS Item ID is required');
    }

    await dbConnect();

    // 1. Fetch target WBS Item
    const wbsItem = await WBSItemModel.findById(wbsItemId);
    if (!wbsItem) {
      throw new Error(`WBS Item with ID ${wbsItemId} not found.`);
    }

    if (wbsItem.type !== 'task' && wbsItem.type !== 'story') {
      throw new Error('Story point estimation can only be performed on Stories or Tasks.');
    }

    const title = wbsItem.title;
    const description = wbsItem.description || '';
    const queryText = `Task Title: ${title}\nTask Description: ${description}`;

    // 2. Perform semantic search in Qdrant to find similar tasks
    let matches: any[] = [];
    try {
      matches = await QdrantService.searchSimilarIssues(queryText, 3);
    } catch (err) {
      console.warn('Qdrant similarity search failed during estimation, proceeding without references:', err);
    }

    // 3. Call AIService to estimate points based on matched analogues
    const references = matches.map(m => ({
      title: m.title,
      description: m.description,
      points: m.storypoints
    }));

    const aiEstimate = await AIService.getInstance().estimateStoryPoints(title, description, references);

    // 4. Delete old story point estimate if it exists
    await StoryPoint.deleteOne({ wbsItemId: wbsItem._id });

    // 5. Construct new StoryPoint document
    const ragReferences = matches.map(m => {
      // If project ID is not a valid MongoDB ObjectId (since it came from issues.csv idproject),
      // we can set similarProjectId to null or try parsing it if it maps to an actual DB project.
      const isValidObjectId = mongoose.Types.ObjectId.isValid(m.idproject);
      return {
        similarProjectId: isValidObjectId ? new mongoose.Types.ObjectId(m.idproject) : undefined,
        similarItemTitle: m.title,
        similarItemPoints: m.storypoints,
        similarityScore: m.score
      };
    });

    const doc = await StoryPoint.create({
      wbsItemId: wbsItem._id,
      projectId: wbsItem.projectId,
      ragReferences,
      aiSuggestedPoints: aiEstimate.suggestedPoints,
      finalPoints: aiEstimate.suggestedPoints, // Defaults to AI suggested initially
      rationale: aiEstimate.rationale,
      confidence: aiEstimate.confidence,
      decidedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined
    });

    return mapToStoryPointType(doc);
  }

  /**
   * Retrieves the story point estimation (including references and rationale) for a specific WBS Item.
   */
  static async getStoryPointEstimation(wbsItemId: string): Promise<StoryPointDTO | null> {
    if (!wbsItemId || !mongoose.Types.ObjectId.isValid(wbsItemId)) {
      throw new Error('Valid WBS Item ID is required');
    }

    await dbConnect();
    const doc = await StoryPoint.findOne({ wbsItemId }).lean<any>();
    if (!doc) return null;
    
    return mapToStoryPointType(doc);
  }

  /**
   * Updates the final story point value for an existing estimate.
   */
  static async updateStoryPointEstimate(
    wbsItemId: string,
    finalPoints: number,
    userId?: string
  ): Promise<StoryPointDTO> {
    if (!wbsItemId || !mongoose.Types.ObjectId.isValid(wbsItemId)) {
      throw new Error('Valid WBS Item ID is required');
    }

    await dbConnect();

    const updateData: any = { finalPoints };
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      updateData.decidedBy = new mongoose.Types.ObjectId(userId);
    }

    const doc = await StoryPoint.findOneAndUpdate(
      { wbsItemId },
      updateData,
      { new: true }
    );

    if (!doc) {
      throw new Error(`Story point estimate for WBS Item ${wbsItemId} not found.`);
    }

    return mapToStoryPointType(doc);
  }

  /**
   * Estimates story points for all tasks/stories within a project using RAG.
   */
  static async estimateAllStoryPoints(projectId: string, userId?: string): Promise<StoryPointDTO[]> {
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      throw new Error('Valid Project ID is required');
    }

    await dbConnect();

    // Fetch all Tasks and Stories in the project
    const items = await WBSItemModel.find({
      projectId,
      type: { $in: ['task', 'story'] }
    });

    const results: StoryPointDTO[] = [];
    for (const item of items) {
      try {
        const est = await this.estimateStoryPoints(item._id.toString(), userId);
        results.push(est);
        // Politeness delay to prevent LLM rate limiting during batch calls
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Failed to estimate task ${item._id} (${item.title}):`, err);
      }
    }

    return results;
  }
}
