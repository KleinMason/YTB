import { prisma } from '../db/prisma.js';
import { getProjectById } from './project.service.js';

export interface CreateEntryInput {
  projectId: string;
  entryDate: string;
  yesterdayMd?: string;
  todayMd?: string;
  blockersMd?: string;
  userId: string;
}

export interface EntryData {
  id: string;
  userId: string;
  projectId: string;
  entryDate: Date;
  yesterdayMd: string | null;
  todayMd: string | null;
  blockersMd: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEntryResult {
  success: true;
  entry: EntryData;
}

export interface CreateEntryError {
  success: false;
  error: {
    message: string;
    statusCode: number;
  };
}

export type CreateEntryResponse = CreateEntryResult | CreateEntryError;

export interface GetEntriesInput {
  userId: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetEntriesResult {
  success: true;
  entries: EntryData[];
}

export interface GetEntriesError {
  success: false;
  error: {
    message: string;
    statusCode: number;
  };
}

export type GetEntriesResponse = GetEntriesResult | GetEntriesError;

export interface GetEntryByIdResult {
  success: true;
  entry: EntryData;
}

export interface GetEntryByIdError {
  success: false;
  error: {
    message: string;
    statusCode: number;
  };
}

export type GetEntryByIdResponse = GetEntryByIdResult | GetEntryByIdError;

export interface UpdateEntryInput {
  yesterdayMd?: string;
  todayMd?: string;
  blockersMd?: string;
}

export interface UpdateEntryResult {
  success: true;
  entry: EntryData;
}

export interface UpdateEntryError {
  success: false;
  error: {
    message: string;
    statusCode: number;
  };
}

export type UpdateEntryResponse = UpdateEntryResult | UpdateEntryError;

export interface DeleteEntryResult {
  success: true;
}

export interface DeleteEntryError {
  success: false;
  error: {
    message: string;
    statusCode: number;
  };
}

export type DeleteEntryResponse = DeleteEntryResult | DeleteEntryError;

export interface GetPreviousEntryInput {
  userId: string;
  projectId: string;
  date: string;
}

export interface GetPreviousEntryResult {
  success: true;
  entry: EntryData | null;
}

export interface GetPreviousEntryError {
  success: false;
  error: {
    message: string;
    statusCode: number;
  };
}

export type GetPreviousEntryResponse = GetPreviousEntryResult | GetPreviousEntryError;

export async function getEntries(input: GetEntriesInput): Promise<GetEntriesResponse> {
  const { userId, projectId, startDate, endDate } = input;

  // Build where clause
  const where: {
    userId: string;
    projectId?: string;
    entryDate?: { gte?: Date; lte?: Date };
  } = { userId };

  // Filter by project_id if provided
  if (projectId) {
    // Verify project exists and belongs to user
    const projectResult = await getProjectById(projectId, userId);
    if (!projectResult.success) {
      return {
        success: false,
        error: projectResult.error,
      };
    }
    where.projectId = projectId;
  }

  // Filter by date range if provided
  if (startDate || endDate) {
    where.entryDate = {};
    if (startDate) {
      where.entryDate.gte = new Date(startDate + 'T00:00:00.000Z');
    }
    if (endDate) {
      where.entryDate.lte = new Date(endDate + 'T00:00:00.000Z');
    }
  }

  const entries = await prisma.yTBEntry.findMany({
    where,
    orderBy: { entryDate: 'desc' },
  });

  return {
    success: true,
    entries: entries.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      projectId: entry.projectId,
      entryDate: entry.entryDate,
      yesterdayMd: entry.yesterdayMd,
      todayMd: entry.todayMd,
      blockersMd: entry.blockersMd,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
  };
}

export async function getEntryById(entryId: string, userId: string): Promise<GetEntryByIdResponse> {
  const entry = await prisma.yTBEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry) {
    return {
      success: false,
      error: {
        message: 'Entry not found',
        statusCode: 404,
      },
    };
  }

  if (entry.userId !== userId) {
    return {
      success: false,
      error: {
        message: 'Forbidden',
        statusCode: 403,
      },
    };
  }

  return {
    success: true,
    entry: {
      id: entry.id,
      userId: entry.userId,
      projectId: entry.projectId,
      entryDate: entry.entryDate,
      yesterdayMd: entry.yesterdayMd,
      todayMd: entry.todayMd,
      blockersMd: entry.blockersMd,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    },
  };
}

export async function createEntry(input: CreateEntryInput): Promise<CreateEntryResponse> {
  const { projectId, entryDate, yesterdayMd, todayMd, blockersMd, userId } = input;

  // Validate required fields
  if (!projectId || projectId.trim() === '') {
    return {
      success: false,
      error: {
        message: 'Project ID is required',
        statusCode: 400,
      },
    };
  }

  if (!entryDate || entryDate.trim() === '') {
    return {
      success: false,
      error: {
        message: 'Entry date is required',
        statusCode: 400,
      },
    };
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(entryDate)) {
    return {
      success: false,
      error: {
        message: 'Entry date must be in YYYY-MM-DD format',
        statusCode: 400,
      },
    };
  }

  // Verify project exists and belongs to user
  const projectResult = await getProjectById(projectId, userId);
  if (!projectResult.success) {
    return {
      success: false,
      error: projectResult.error,
    };
  }

  // Parse the date
  const parsedDate = new Date(entryDate + 'T00:00:00.000Z');

  // Check for existing entry with same project_id and date
  const existingEntry = await prisma.yTBEntry.findFirst({
    where: {
      projectId,
      userId,
      entryDate: parsedDate,
    },
  });

  if (existingEntry) {
    return {
      success: false,
      error: {
        message: 'Entry already exists for this project and date',
        statusCode: 409,
      },
    };
  }

  // Create entry in database
  const entry = await prisma.yTBEntry.create({
    data: {
      projectId,
      userId,
      entryDate: parsedDate,
      yesterdayMd: yesterdayMd || null,
      todayMd: todayMd || null,
      blockersMd: blockersMd || null,
    },
  });

  return {
    success: true,
    entry: {
      id: entry.id,
      userId: entry.userId,
      projectId: entry.projectId,
      entryDate: entry.entryDate,
      yesterdayMd: entry.yesterdayMd,
      todayMd: entry.todayMd,
      blockersMd: entry.blockersMd,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    },
  };
}

export async function updateEntry(
  entryId: string,
  userId: string,
  input: UpdateEntryInput
): Promise<UpdateEntryResponse> {
  const existingEntry = await prisma.yTBEntry.findUnique({
    where: { id: entryId },
  });

  if (!existingEntry) {
    return {
      success: false,
      error: {
        message: 'Entry not found',
        statusCode: 404,
      },
    };
  }

  if (existingEntry.userId !== userId) {
    return {
      success: false,
      error: {
        message: 'Forbidden',
        statusCode: 403,
      },
    };
  }

  const updateData: { yesterdayMd?: string | null; todayMd?: string | null; blockersMd?: string | null } = {};

  if (input.yesterdayMd !== undefined) {
    updateData.yesterdayMd = input.yesterdayMd || null;
  }
  if (input.todayMd !== undefined) {
    updateData.todayMd = input.todayMd || null;
  }
  if (input.blockersMd !== undefined) {
    updateData.blockersMd = input.blockersMd || null;
  }

  const entry = await prisma.yTBEntry.update({
    where: { id: entryId },
    data: updateData,
  });

  return {
    success: true,
    entry: {
      id: entry.id,
      userId: entry.userId,
      projectId: entry.projectId,
      entryDate: entry.entryDate,
      yesterdayMd: entry.yesterdayMd,
      todayMd: entry.todayMd,
      blockersMd: entry.blockersMd,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    },
  };
}

export async function deleteEntry(entryId: string, userId: string): Promise<DeleteEntryResponse> {
  const existingEntry = await prisma.yTBEntry.findUnique({
    where: { id: entryId },
  });

  if (!existingEntry) {
    return {
      success: false,
      error: {
        message: 'Entry not found',
        statusCode: 404,
      },
    };
  }

  if (existingEntry.userId !== userId) {
    return {
      success: false,
      error: {
        message: 'Forbidden',
        statusCode: 403,
      },
    };
  }

  await prisma.yTBEntry.delete({
    where: { id: entryId },
  });

  return {
    success: true,
  };
}

export async function getPreviousEntry(input: GetPreviousEntryInput): Promise<GetPreviousEntryResponse> {
  const { userId, projectId, date } = input;

  // Validate project_id is provided
  if (!projectId || projectId.trim() === '') {
    return {
      success: false,
      error: {
        message: 'Project ID is required',
        statusCode: 400,
      },
    };
  }

  // Validate date is provided
  if (!date || date.trim() === '') {
    return {
      success: false,
      error: {
        message: 'Date is required',
        statusCode: 400,
      },
    };
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return {
      success: false,
      error: {
        message: 'Date must be in YYYY-MM-DD format',
        statusCode: 400,
      },
    };
  }

  // Verify project exists and belongs to user
  const projectResult = await getProjectById(projectId, userId);
  if (!projectResult.success) {
    return {
      success: false,
      error: projectResult.error,
    };
  }

  // Parse the date
  const parsedDate = new Date(date + 'T00:00:00.000Z');

  // Find the most recent entry before the given date
  const entry = await prisma.yTBEntry.findFirst({
    where: {
      projectId,
      userId,
      entryDate: {
        lt: parsedDate,
      },
    },
    orderBy: {
      entryDate: 'desc',
    },
  });

  if (!entry) {
    return {
      success: true,
      entry: null,
    };
  }

  return {
    success: true,
    entry: {
      id: entry.id,
      userId: entry.userId,
      projectId: entry.projectId,
      entryDate: entry.entryDate,
      yesterdayMd: entry.yesterdayMd,
      todayMd: entry.todayMd,
      blockersMd: entry.blockersMd,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    },
  };
}
