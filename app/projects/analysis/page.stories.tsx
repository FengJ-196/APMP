import AnalysisPage from './page';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof AnalysisPage> = {
  title: 'Screens/SRS Requirements Analysis',
  component: AnalysisPage,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/projects/analysis',
      },
    },
    backgrounds: { default: 'dark' },
  },
};

export default meta;
type Story = StoryObj<typeof AnalysisPage>;

export const Default: Story = {};
