/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as inputTools from './input.js';
import * as pagesTools from './pages.js';
import * as screenshotTools from './screenshot.js';
import * as scriptTools from './script.js';
import * as snapshotTools from './snapshot.js';
import type {ToolDefinition} from './ToolDefinition.js';

const tools = [
  ...Object.values(inputTools),
  ...Object.values(pagesTools),
  ...Object.values(screenshotTools),
  ...Object.values(scriptTools),
  ...Object.values(snapshotTools),
] as ToolDefinition[];

tools.sort((a, b) => {
  return a.name.localeCompare(b.name);
});

export {tools};
