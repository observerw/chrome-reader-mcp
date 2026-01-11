/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {describe, it} from 'node:test';

import {html, withMcpContext} from './utils.js';

describe('McpContext', () => {
  it('list pages', async () => {
    await withMcpContext(async (_response, context) => {
      const page = context.getSelectedPage();
      await page.setContent(
        html`<button>Click me</button
          ><input
            type="text"
            value="Input"
          />`,
      );
      await context.createTextSnapshot();
      assert.ok(await context.getElementByUid('1_1'));
      await context.createTextSnapshot();
      try {
        await context.getElementByUid('1_1');
        assert.fail('not reached');
      } catch (err) {
        assert.ok(
          err.message.includes('This uid is coming from a stale snapshot'),
        );
      }
    });
  });
});
