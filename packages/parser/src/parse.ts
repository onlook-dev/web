import { packages } from "@babel/standalone";

const { parser } = packages;
const { generate } = packages.generator;
const traverse = packages.traverse.default;

export const parse = (code: string) => {
    const ast = parser.parse(code, {
        plugins: ['typescript', 'jsx'],
        sourceType: 'module',
        allowImportExportEverywhere: true,
    });

    traverse(ast, {});

    const transformed = generate(ast, { retainLines: true, compact: false });
    return transformed.code;
};