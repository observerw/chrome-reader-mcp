/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';

import {
  getImageContent,
  getTextContent,
  html,
  stabilizeResponseOutput,
  withMcpContext,
} from './utils.js';

describe('McpResponse', () => {
  it('list pages', async t => {
    await withMcpContext(async (response, context) => {
      response.setIncludePages(true);
      const result = await response.handle('test', context);
      assert.equal(result[0].type, 'text');
      t.assert.snapshot?.(getTextContent(result[0]));
    });
  });

  it('allows response text lines to be added', async t => {
    await withMcpContext(async (response, context) => {
      response.appendResponseLine('Testing 1');
      response.appendResponseLine('Testing 2');
      const result = await response.handle('test', context);
      assert.equal(result[0].type, 'text');
      t.assert.snapshot?.(getTextContent(result[0]));
    });
  });

  it('does not include anything in response if snapshot is null', async () => {
    await withMcpContext(async (response, context) => {
      const page = context.getSelectedPage();
      page.accessibility.snapshot = async () => null;
      const result = await response.handle('test', context);
      assert.equal(result[0].type, 'text');
      assert.deepStrictEqual(getTextContent(result[0]), `# test response`);
    });
  });

  it('returns correctly formatted snapshot for a simple tree', async t => {
    await withMcpContext(async (response, context) => {
      const page = context.getSelectedPage();
      await page.setContent(
        html`<button>Click me</button
          ><input
            type="text"
            value="Input"
          />`,
      );
      await page.focus('button');
      response.includeSnapshot();
      const result = await response.handle('test', context);
      assert.equal(result[0].type, 'text');
      t.assert.snapshot?.(getTextContent(result[0]));
    });
  });

  it('saves snapshot to file', async t => {
    const filePath = join(tmpdir(), 'test-snapshot.txt');
    try {
      await withMcpContext(async (response, context) => {
        const page = context.getSelectedPage();
        await page.setContent(html`<aside>test</aside>`);
        response.includeSnapshot({
          verbose: true,
          filePath,
        });
        const result = await response.handle('test', context);
        assert.equal(result[0].type, 'text');
        t.assert.snapshot?.(stabilizeResponseOutput(getTextContent(result[0])));
      });
      const content = await readFile(filePath, 'utf-8');
      t.assert.snapshot?.(stabilizeResponseOutput(content));
    } finally {
      await rm(filePath, {force: true});
    }
  });

  it('adds image when image is attached', async () => {
    await withMcpContext(async (response, context) => {
      response.attachImage({data: 'imageBase64', mimeType: 'image/png'});
      const result = await response.handle('test', context);
      assert.strictEqual(getTextContent(result[0]), `# test response`);
      assert.equal(result[1].type, 'image');
      assert.strictEqual(getImageContent(result[1]).data, 'imageBase64');
      assert.strictEqual(getImageContent(result[1]).mimeType, 'image/png');
    });
  });

  it('adds a prompt dialog', async t => {
    await withMcpContext(async (response, context) => {
      const page = context.getSelectedPage();
      const dialogPromise = new Promise<void>(resolve => {
        page.on('dialog', () => {
          resolve();
        });
      });
      page.evaluate(() => {
        prompt('message', 'default');
      });
      await dialogPromise;
      const result = await response.handle('test', context);
      await context.getDialog()?.dismiss();
      t.assert.snapshot?.(getTextContent(result[0]));
    });
  });
});
