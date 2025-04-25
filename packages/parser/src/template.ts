import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/constants';
import {
    CoreElementType,
    DynamicType,
    type TemplateNode,
    type TemplateTag
} from '@onlook/models';
import { isReactFragment } from './helpers';
import { traverse } from './packages';

export function createTemplateNodeMap(ast: t.File, filename: string): Record<string, TemplateNode> | null {
    const mapping: Record<string, TemplateNode> = {};
    const componentStack: string[] = [];
    const dynamicTypeStack: DynamicType[] = [];

    traverse(ast, {
        FunctionDeclaration: {
            enter(path: any) {
                componentStack.push(path.node.id.name);
            },
            exit() {
                componentStack.pop();
            },
        },
        ClassDeclaration: {
            enter(path: any) {
                componentStack.push(path.node.id.name);
            },
            exit() {
                componentStack.pop();
            },
        },
        VariableDeclaration: {
            enter(path: any) {
                componentStack.push(path.node.declarations[0].id.name);
            },
            exit() {
                componentStack.pop();
            },
        },
        CallExpression: {
            enter(path) {
                if (isNodeElementArray(path.node)) {
                    dynamicTypeStack.push(DynamicType.ARRAY);
                }
            },
            exit(path) {
                if (isNodeElementArray(path.node)) {
                    dynamicTypeStack.pop();
                }
            },
        },
        ConditionalExpression: {
            enter() {
                dynamicTypeStack.push(DynamicType.CONDITIONAL);
            },
            exit() {
                dynamicTypeStack.pop();
            },
        },
        LogicalExpression: {
            enter(path) {
                if (path.node.operator === '&&' || path.node.operator === '||') {
                    dynamicTypeStack.push(DynamicType.CONDITIONAL);
                }
            },
            exit(path) {
                if (path.node.operator === '&&' || path.node.operator === '||') {
                    dynamicTypeStack.pop();
                }
            },
        },
        JSXElement(path) {
            if (isReactFragment(path.node.openingElement)) {
                return;
            }

            const attributes = path.node.openingElement.attributes;
            const idAttr = attributes.find(
                (attr: any) => attr.name?.name === EditorAttributes.DATA_ONLOOK_ID,
            );

            if (!idAttr || !t.isJSXAttribute(idAttr)) {
                return;
            }

            const idAttrValue = idAttr.value
            if (!idAttrValue || !t.isStringLiteral(idAttrValue)) {
                return;
            }

            const elementId = idAttrValue.value;
            const dynamicType = getDynamicTypeInfo(path);
            const coreElementType = getCoreElementInfo(path);

            mapping[elementId] = getTemplateNode(
                path,
                filename,
                componentStack,
                dynamicType,
                coreElementType,
            );

        },
    });
    return mapping;
}

export function isNodeElementArray(node: t.CallExpression): boolean {
    return (
        t.isMemberExpression(node.callee) &&
        t.isIdentifier(node.callee.property) &&
        node.callee.property.name === 'map'
    );
}

export function getDynamicTypeInfo(path: NodePath): DynamicType | null {
    const parent = path.parent;
    const grandParent = path.parentPath?.parent;

    // Check for conditional root element
    const isConditionalRoot =
        (t.isConditionalExpression(parent) || t.isLogicalExpression(parent)) &&
        t.isJSXExpressionContainer(grandParent);

    // Check for array map root element
    const isArrayMapRoot =
        t.isArrowFunctionExpression(parent) ||
        (t.isJSXFragment(parent) && path.parentPath?.parentPath?.isArrowFunctionExpression());

    const dynamicType = isConditionalRoot ? DynamicType.CONDITIONAL : isArrayMapRoot ? DynamicType.ARRAY : undefined;

    return dynamicType ?? null;
}


export function getCoreElementInfo(path: NodePath<t.JSXElement>): CoreElementType | null {
    const parent = path.parent;

    const isComponentRoot = t.isReturnStatement(parent) || t.isArrowFunctionExpression(parent);

    const isBodyTag =
        t.isJSXIdentifier(path.node.openingElement.name) &&
        path.node.openingElement.name.name.toLocaleLowerCase() === 'body';

    const coreElementType = isComponentRoot ? CoreElementType.COMPONENT_ROOT : isBodyTag ? CoreElementType.BODY_TAG : undefined;

    return coreElementType ?? null;
}


export function getTemplateNode(
    path: any,
    filename: string,
    componentStack: string[],
    dynamicType: DynamicType | null,
    coreElementType: CoreElementType | null,
): TemplateNode {
    const startTag: TemplateTag = getTemplateTag(path.node.openingElement);
    const endTag: TemplateTag | null = path.node.closingElement
        ? getTemplateTag(path.node.closingElement)
        : null;
    const component = componentStack.length > 0 ? componentStack[componentStack.length - 1] : null;
    const domNode: TemplateNode = {
        path: filename,
        startTag,
        endTag,
        component,
        dynamicType,
        coreElementType,
    };
    return domNode;
}

function getTemplateTag(element: any): TemplateTag {
    return {
        start: {
            line: element.loc.start.line,
            column: element.loc.start.column + 1,
        },
        end: {
            line: element.loc.end.line,
            column: element.loc.end.column,
        },
    };
}
