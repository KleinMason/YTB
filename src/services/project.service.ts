import { prisma } from '../db/prisma.js';

export interface CreateProjectInput {
  name: string;
  color?: string;
  icon?: string;
  userId: string;
}

export interface CreateProjectResult {
  success: true;
  project: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface CreateProjectError {
  success: false;
  error: {
    message: string;
    statusCode: number;
  };
}

export type CreateProjectResponse = CreateProjectResult | CreateProjectError;

export interface GetProjectsResult {
  success: true;
  projects: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

export type GetProjectsResponse = GetProjectsResult;

export interface GetProjectByIdResult {
  success: true;
  project: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface GetProjectByIdError {
  success: false;
  error: {
    message: string;
    statusCode: number;
  };
}

export type GetProjectByIdResponse = GetProjectByIdResult | GetProjectByIdError;

export async function getProjectById(projectId: string, userId: string): Promise<GetProjectByIdResponse> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return {
      success: false,
      error: {
        message: 'Project not found',
        statusCode: 404,
      },
    };
  }

  if (project.userId !== userId) {
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
    project: {
      id: project.id,
      name: project.name,
      color: project.color,
      icon: project.icon,
      userId: project.userId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  };
}

export async function getProjects(userId: string): Promise<GetProjectsResponse> {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    success: true,
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      color: project.color,
      icon: project.icon,
      userId: project.userId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })),
  };
}

export async function createProject(input: CreateProjectInput): Promise<CreateProjectResponse> {
  const { name, color, icon, userId } = input;

  // Validate name is not empty
  if (!name || name.trim() === '') {
    return {
      success: false,
      error: {
        message: 'Project name is required',
        statusCode: 400,
      },
    };
  }

  // Create project in database
  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      color: color || null,
      icon: icon || null,
      userId,
    },
  });

  return {
    success: true,
    project: {
      id: project.id,
      name: project.name,
      color: project.color,
      icon: project.icon,
      userId: project.userId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  };
}
