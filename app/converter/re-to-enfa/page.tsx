import React from 'react';
import Link from 'next/link';

export default function ReToEnfaPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Link href="/" style={{ alignSelf: 'flex-start', color: '#0ea5e9', textDecoration: 'none', marginBottom: '20px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
        &larr; Back to Home
      </Link>
      <h1>Convert RE to e-NFA</h1>
      <p style={{ color: '#94a3b8', marginTop: '10px' }}>Feature coming soon!</p>
    </div>
  );
}
