import { describe, expect, test } from 'bun:test';
import { parse } from 'src/parse';

describe('Parse Tests', () => {
    test('should parse jsx', async () => {
        const code = `import { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return <div>{count}</div>;\n}`;
        const compiled = parse(code);
        expect(compiled).toEqual(code);
    });

});
