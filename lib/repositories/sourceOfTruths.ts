import dbConnect from '../db';
import { SourceOfTruth as SOTModel } from '../models';
import type { SourceOfTruthDTO } from '@/dtos';

function mapToSourceOfTruthType(doc: any): SourceOfTruthDTO {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    fileId: doc.fileId.toString(),
    versionNumber: doc.versionNumber,
    blocks: doc.blocks,
    compiledMarkdown: doc.compiledMarkdown,
    status: doc.status,
    approvedBy: doc.approvedBy?.toString(),
    approvedAt: doc.approvedAt,
    changesSummary: doc.changesSummary,
    backup: doc.backup,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createSourceOfTruth(input: Omit<SourceOfTruthDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<SourceOfTruthDTO> {
  await dbConnect();
  const doc = await SOTModel.create(input);
  return mapToSourceOfTruthType(doc);
}

export async function findSourceOfTruthById(id: string): Promise<SourceOfTruthDTO | undefined> {
  await dbConnect();
  const doc = await SOTModel.findById(id).lean();
  if (!doc) return undefined;
  return mapToSourceOfTruthType(doc);
}

export async function findSourceOfTruthByProjectId(projectId: string): Promise<SourceOfTruthDTO | undefined> {
  await dbConnect();
  const doc = await SOTModel.findOne({ projectId }).lean();
  if (!doc) return undefined;
  return mapToSourceOfTruthType(doc);
}
