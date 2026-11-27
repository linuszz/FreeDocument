/*
 * Copyright (c) 2026 Casual Office. All rights reserved.
 */

/**
 * Doc Extension — top-level document node
 */

import { createNodeExtension } from '../create';

export const DocExtension = createNodeExtension({
  name: 'doc',
  schemaNodeName: 'doc',
  nodeSpec: {
    content: '(paragraph | horizontalRule | pageBreak | table | textBox)+',
    attrs: {
      // `w:defaultTabStop` (twips) from the source document. Layout-only;
      // never serialized back into the DOCX.
      defaultTabStop: { default: null },
      // `w:docGrid/@w:linePitch` (twips) of the body section — the base Word
      // uses for `lineRule="auto"` spacing in grid documents. Layout-only.
      docGridLinePitch: { default: null },
    },
  },
});
