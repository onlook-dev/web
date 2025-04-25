import { describe, expect, test } from 'bun:test';
import { getContentWithIds } from 'src';

describe('Parse Tests', () => {
    test('should not change if ids are already present', async () => {
        const code = `import { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return <div data-oid="1">{count}</div>;\n}`;
        const compiled = await getContentWithIds(code);
        expect(compiled).toEqual(code);
    });

    test('should add ids to jsx', async () => {
        const code = `import { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return <div>{count}</div>;\n}`;
        const compiled = await getContentWithIds(code);
        expect(compiled).not.toEqual(code);
    });
});
