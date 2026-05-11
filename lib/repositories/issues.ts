import dbConnect from '../db';
import { Issue as IssueModel } from '../models';
import type { IssueDTO, CreateIssueInputDTO } from '@/dtos';

function mapToIssueType(doc: any): IssueDTO {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    sourceOfTruthId: doc.sourceOfTruthId.toString(),
    description: doc.description,
    type: doc.type,
    status: doc.status,
    severity: doc.severity,
    suggestion: doc.suggestion,
    clarificationQuestion: doc.clarificationQuestion,
    userNote: doc.userNote,
    sourceReferences: doc.sourceReferences,
    resolvedBy: doc.resolvedBy?.toString(),
    resolvedAt: doc.resolvedAt,
    createdAt: doc.createdAt,
  };
}

export async function createIssue(input: CreateIssueInputDTO): Promise<IssueDTO> {
  await dbConnect();
  const issue = await IssueModel.create(input);
  return mapToIssueType(issue);
}

export async function findIssueById(id: string): Promise<IssueDTO | undefined> {
  await dbConnect();
  const issue = await IssueModel.findById(id).lean();
  if (!issue) return undefined;
  return mapToIssueType(issue);
}

export async function findIssuesByProjectId(projectId: string): Promise<IssueDTO[]> {
  await dbConnect();
  const issues = await IssueModel.find({ projectId }).lean();
  return issues.map(mapToIssueType);
}

export async function deleteIssue(id: string): Promise<boolean> {
  await dbConnect();
  const result = await IssueModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
}
