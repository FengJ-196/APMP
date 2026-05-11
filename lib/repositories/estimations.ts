import dbConnect from '../db';
import { StoryPoint as StoryPointModel, ExternalSync as ExternalSyncModel } from '../models';
import type { StoryPointDTO, ExternalSyncDTO } from '@/dtos';

function mapToStoryPointType(doc: any): StoryPointDTO {
  return {
    id: doc._id.toString(),
    wbsItemId: doc.wbsItemId.toString(),
    projectId: doc.projectId.toString(),
    ragReferences: doc.ragReferences?.map((r: any) => ({
      similarProjectId: r.similarProjectId?.toString(),
      similarItemTitle: r.similarItemTitle,
      similarItemPoints: r.similarItemPoints,
      similarityScore: r.similarityScore,
    })) || [],
    aiSuggestedPoints: doc.aiSuggestedPoints,
    finalPoints: doc.finalPoints,
    rationale: doc.rationale,
    confidence: doc.confidence,
    decidedBy: doc.decidedBy?.toString(),
    createdAt: doc.createdAt,
  };
}

function mapToExternalSyncType(doc: any): ExternalSyncDTO {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    wbsItemId: doc.wbsItemId.toString(),
    platform: doc.platform,
    externalId: doc.externalId,
    externalUrl: doc.externalUrl,
    syncStatus: doc.syncStatus,
    errorMessage: doc.errorMessage,
    lastSyncedAt: doc.lastSyncedAt,
    createdAt: doc.createdAt,
  };
}

export async function createStoryPoint(input: Omit<StoryPointDTO, 'id' | 'createdAt'>): Promise<StoryPointDTO> {
  await dbConnect();
  const doc = await StoryPointModel.create(input);
  return mapToStoryPointType(doc);
}

export async function findStoryPointByWbsItemId(wbsItemId: string): Promise<StoryPointDTO | undefined> {
  await dbConnect();
  const doc = await StoryPointModel.findOne({ wbsItemId }).lean();
  if (!doc) return undefined;
  return mapToStoryPointType(doc);
}

export async function createExternalSync(input: Omit<ExternalSyncDTO, 'id' | 'createdAt'>): Promise<ExternalSyncDTO> {
  await dbConnect();
  const doc = await ExternalSyncModel.create(input);
  return mapToExternalSyncType(doc);
}

export async function findExternalSyncsByProjectId(projectId: string): Promise<ExternalSyncDTO[]> {
  await dbConnect();
  const docs = await ExternalSyncModel.find({ projectId }).lean();
  return docs.map(mapToExternalSyncType);
}
