// Placeholder for missing media: dashed box with text on a gray surface.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, fontFamily } from '../../look';
import { schema, type Props } from './def';

export const Placeholder: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  return (
    <AbsoluteFill style={{ background: C.card, alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          border: `4px dashed ${C.gray300}`, borderRadius: 32, padding: '56px 72px', maxWidth: '70%', textAlign: 'center',
          fontFamily, fontWeight: 500, fontSize: 60, lineHeight: 1.3, letterSpacing: '-0.01em', color: C.muted,
        }}
      >
        {p.text}
      </div>
    </AbsoluteFill>
  );
};
