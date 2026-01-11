/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {formatSnapshotNode} from './formatters/snapshotFormatter.js';
import type {McpContext} from './McpContext.js';
import type {ImageContent, TextContent} from './third_party/index.js';
import {handleDialog} from './tools/pages.js';
import type {
  DevToolsData,
  ImageContentData,
  Response,
  SnapshotParams,
} from './tools/ToolDefinition.js';

export class McpResponse implements Response {
  #includePages = false;
  #snapshotParams?: SnapshotParams;
  #textResponseLines: string[] = [];
  #images: ImageContentData[] = [];

  attachDevToolsData(_data: DevToolsData): void {
    // No-op
  }

  setIncludePages(value: boolean): void {
    this.#includePages = value;
  }

  get includePages(): boolean {
    return this.#includePages;
  }

  includeSnapshot(params?: SnapshotParams): void {
    this.#snapshotParams = params ?? {
      verbose: false,
    };
  }

  appendResponseLine(value: string): void {
    this.#textResponseLines.push(value);
  }

  attachImage(value: ImageContentData): void {
    this.#images.push(value);
  }

  get responseLines(): readonly string[] {
    return this.#textResponseLines;
  }

  get images(): ImageContentData[] {
    return this.#images;
  }

  get snapshotParams(): SnapshotParams | undefined {
    return this.#snapshotParams;
  }

  async handle(
    toolName: string,
    context: McpContext,
  ): Promise<Array<TextContent | ImageContent>> {
    if (this.#includePages) {
      await context.createPagesSnapshot();
    }

    let formattedSnapshot: string | undefined;
    if (this.#snapshotParams) {
      await context.createTextSnapshot(this.#snapshotParams.verbose);
      const snapshot = context.getTextSnapshot();
      if (snapshot) {
        if (this.#snapshotParams.filePath) {
          await context.saveFile(
            new TextEncoder().encode(
              formatSnapshotNode(snapshot.root, snapshot),
            ),
            this.#snapshotParams.filePath,
          );
          formattedSnapshot = `Saved snapshot to ${this.#snapshotParams.filePath}.`;
        } else {
          formattedSnapshot = formatSnapshotNode(snapshot.root, snapshot);
        }
      }
    }

    return this.format(toolName, context, {
      formattedSnapshot,
    });
  }

  format(
    toolName: string,
    context: McpContext,
    data: {
      formattedSnapshot: string | undefined;
    },
  ): Array<TextContent | ImageContent> {
    const response = [`# ${toolName} response`];
    for (const line of this.#textResponseLines) {
      response.push(line);
    }

    const dialog = context.getDialog();
    if (dialog) {
      const defaultValueIfNeeded =
        dialog.type() === 'prompt'
          ? ` (default value: "${dialog.defaultValue()}")`
          : '';
      response.push(`# Open dialog
${dialog.type()}: ${dialog.message()}${defaultValueIfNeeded}.
Call ${handleDialog.name} to handle it before continuing.`);
    }

    if (this.#includePages) {
      const parts = [`## Pages`];
      for (const page of context.getPages()) {
        parts.push(
          `${context.getPageId(page)}: ${page.url()}${context.isPageSelected(page) ? ' [selected]' : ''}`,
        );
      }
      response.push(...parts);
    }

    if (data.formattedSnapshot) {
      response.push('## Latest page snapshot');
      response.push(data.formattedSnapshot);
    }

    const text: TextContent = {
      type: 'text',
      text: response.join('\n'),
    };
    const images: ImageContent[] = this.#images.map(imageData => {
      return {
        type: 'image',
        ...imageData,
      } as const;
    });

    return [text, ...images];
  }

  resetResponseLineForTesting() {
    this.#textResponseLines = [];
  }
}
