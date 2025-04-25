import { describe, expect, test } from 'bun:test';
import { addIdsToAst, getAstFromContent, getContentFromAst } from 'src';

describe('Parse Tests', () => {
    test('should parse and serialize a simple component', async () => {
        const code = `export default function App() {\n  return (\n    <div>Hello, world!</div>);\n\n}`;
        const ast = getAstFromContent(code);
        const serialized = await getContentFromAst(ast);
        expect(serialized).toEqual(code);
    });

    test('should add ids to jsx', async () => {
        const code = `export default function App() {\n  return (\n    <div>Hello, world!</div>);\n\n}`;
        const ast = getAstFromContent(code);
        addIdsToAst(ast);
        const serialized = await getContentFromAst(ast);
        expect(serialized).toEqual(
            expect.stringMatching(/export default function App\(\) {\n\s+return \(\n\s+<div data-oid=".+">Hello, world!<\/div>\);\n\n}/)
        );
    });

    test('should not add ids to jsx if they already exist', async () => {
        const code = `export default function App() {\n  return (\n    <div data-oid="1">Hello, world!</div>);\n\n}`;
        const ast = getAstFromContent(code);
        addIdsToAst(ast);
        const serialized = await getContentFromAst(ast);
        expect(serialized).toEqual(code);
    });
});
