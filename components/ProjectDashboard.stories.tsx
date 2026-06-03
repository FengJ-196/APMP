import ProjectDashboard from './ProjectDashboard';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof ProjectDashboard> = {
  title: 'Components/Workspaces/Project Dashboard',
  component: ProjectDashboard,
  args: {
    projectId: 'proj-123',
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/projects/proj-123',
      },
    },
    backgrounds: { default: 'dark' },
  },
};

export default meta;
type Story = StoryObj<typeof ProjectDashboard>;

export const LoadingState: Story = {
  decorators: [
    (Story) => {
      // Mock loading state
      global.fetch = () => new Promise(() => {});
      return <Story />;
    },
  ],
};

export const EmptyState: Story = {
  decorators: [
    (Story) => {
      // Mock fetch project with no files, mock no Source of Truth
      global.fetch = (input) => {
        const url = String(input);
        if (url.includes('/source-of-truth')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: 'Not Found' }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            id: 'proj-123',
            title: 'Synthetic Cloud Infrastructure',
            status: 'Active',
            files: [],
          }),
        } as Response);
      };
      return <Story />;
    },
  ],
};

export const LoadedAssets: Story = {
  decorators: [
    (Story) => {
      // Mock fetch project with files, and mock active Source of Truth
      global.fetch = (input) => {
        const url = String(input);
        
        if (url.includes('/source-of-truth')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              id: 'sot-1',
              projectId: 'proj-123',
              content: '# Cloud Infrastructure Specifications\n\n1. Security: Admin accounts must enforce strict MFA controls.\n2. Scale: Kubernetes nodes must auto-scale when load exceeds 80% CPU.',
              versionNumber: 2,
              versionHistory: [
                { versionNumber: 1, content: '# Draft Spec', savedAt: new Date(Date.now() - 3600000) }
              ],
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          } as Response);
        }
        
        // Mock conflicts analysis response when "Scan Requirements" is triggered
        if (url.includes('/conflicts')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([
              {
                id: 'CF-1',
                type: 'Contradiction',
                severity: 'High',
                description: 'MFA logic contradiction',
                sourceReferences: {
                  textSnippets: ['Admin accounts must enforce strict MFA controls.'],
                  imageIds: ['file-img-1'],
                },
                llmExplanation: 'The logic flowchart drawn in auth_workflow.png allows credentials access without MFA verification.',
                suggestedFix: 'Incorporate MFA verification block inside the flowchart immediately after login.',
              }
            ]),
          } as Response);
        }

        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            id: 'proj-123',
            title: 'Synthetic Cloud Infrastructure',
            status: 'Active',
            files: [
              {
                id: 'file-pdf-1',
                originalName: 'Cloud_SRS_v2.pdf',
                contentType: 'application/pdf',
                createdAt: new Date().toISOString(),
              },
              {
                id: 'file-img-1',
                originalName: 'auth_workflow.png',
                contentType: 'image/png',
                createdAt: new Date().toISOString(),
              },
              {
                id: 'file-md-1',
                originalName: 'specs.md',
                contentType: 'text/markdown',
                createdAt: new Date().toISOString(),
              },
            ],
          }),
        } as Response);
      };
      return <Story />;
    },
  ],
};
