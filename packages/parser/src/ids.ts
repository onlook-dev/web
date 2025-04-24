import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/constants';
import { createOid } from '@onlook/utility';
import { generate, parse, traverse } from './packages';

export async function getContentWithIds(content: string): Promise<string | null> {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });
    if (!ast) {
        console.error(`Failed to parse content`);
        return content;
    }
    addIdsToAst(ast);
    const generated = generate(ast, { retainLines: true, compact: false });
    return generated.code;
}

function addIdsToAst(ast: t.File) {
    const ids: Set<string> = new Set();

    traverse(ast, {
        JSXOpeningElement(path) {
            if (isReactFragment(path.node)) {
                return;
            }
            const attributes = path.node.attributes;
            const existingAttrIndex = attributes.findIndex(
                (attr: any) => attr.name?.name === EditorAttributes.DATA_ONLOOK_ID,
            );

            if (existingAttrIndex !== -1) {
                const existingId = (attributes[existingAttrIndex] as any).value.value;
                if (ids.has(existingId)) {
                    const newId = createOid();
                    (attributes[existingAttrIndex] as any).value.value = newId;
                    ids.add(newId);
                } else {
                    ids.add(existingId);
                }
                return;
            }

            const elementId = createOid();
            const oid = t.jSXAttribute(
                t.jSXIdentifier(EditorAttributes.DATA_ONLOOK_ID),
                t.stringLiteral(elementId),
            );
            attributes.push(oid);
            ids.add(elementId);
        },
    });
}

export function isReactFragment(openingElement: any): boolean {
    const name = openingElement.name;

    if (t.isJSXIdentifier(name)) {
        return name.name === 'Fragment';
    }

    if (t.isJSXMemberExpression(name)) {
        return (
            t.isJSXIdentifier(name.object) &&
            name.object.name === 'React' &&
            t.isJSXIdentifier(name.property) &&
            name.property.name === 'Fragment'
        );
    }

    return false;
}