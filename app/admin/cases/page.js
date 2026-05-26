import { Suspense } from 'react';
import CasesClient from './CasesClient';

export const metadata = { title: 'Cases | Admin' };

export default function CasesPage() {
  return (
    <Suspense fallback={null}>
      <CasesClient />
    </Suspense>
  );
}
