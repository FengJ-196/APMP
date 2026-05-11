import dbConnect from '../db';
import { WBSItem as WBSItemModel } from '../models';
import type { WBSItemDTO, CreateWBSItemInputDTO } from '@/dtos';

function mapToWBSItemType(doc: any): WBSItemDTO {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    parentId: doc.parentId?.toString(),
    sourceOfTruthId: doc.sourceOfTruthId?.toString(),
    title: doc.title,
    description: doc.description,
    type: doc.type,
    status: doc.status,
    methodology: doc.methodology,
    acceptanceCriteria: doc.acceptanceCriteria,
    sourceRequirements: doc.sourceRequirements,
    order: doc.order,
    aiGenerated: doc.aiGenerated,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createWBSItem(input: CreateWBSItemInputDTO): Promise<WBSItemDTO> {
  await dbConnect();
  const doc = await WBSItemModel.create(input);
  return mapToWBSItemType(doc);
}

export async function findWBSItemById(id: string): Promise<WBSItemDTO | undefined> {
  await dbConnect();
  const doc = await WBSItemModel.findById(id).lean();
  if (!doc) return undefined;
  return mapToWBSItemType(doc);
}

export async function findWBSItemsByProjectId(projectId: string): Promise<WBSItemDTO[]> {
  await dbConnect();
  const items = await WBSItemModel.find({ projectId }).lean();
  return items.map(mapToWBSItemType);
}

export async function deleteWBSItem(id: string): Promise<boolean> {
  await dbConnect();
  const result = await WBSItemModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
}
