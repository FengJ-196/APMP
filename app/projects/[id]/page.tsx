'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ProjectPageRedirect() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  useEffect(() => {
    if (id) {
      router.replace(`/projects/${id}/files`);
    }
  }, [id, router]);

  return null;
}
