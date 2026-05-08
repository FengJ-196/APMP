import ProjectDashboard from '@/components/ProjectDashboard';
import Navbar from '@/components/Navbar';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <main className="min-h-screen bg-bg-base pt-24">
      <Navbar />
      <ProjectDashboard projectId={id} />
    </main>
  );
}
