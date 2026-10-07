import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { expect, it } from 'vitest';

function featureFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? featureFiles(path) : path.endsWith('.tsx') ? [path] : [];
  });
}

it('declares explicit button types inside feature forms', () => {
  const root = fileURLToPath(new URL('../../features/', import.meta.url));
  const missing: string[] = [];
  let checked = 0;
  for (const path of featureFiles(root)) {
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node: ts.Node, inForm: boolean) {
      const inside = inForm || (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'form');
      if (inside && (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === 'Button') {
        checked++;
        const type = node.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'type');
        if (!type) missing.push(relative(root, path));
      }
      ts.forEachChild(node, (child) => visit(child, inside));
    }
    visit(source, false);
  }
  expect(checked).toBeGreaterThan(10);
  expect(missing).toEqual([]);
});