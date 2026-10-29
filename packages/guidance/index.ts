import path from 'node:path';

/** Directory of the guidance documents added to every agent session. */
export const guidanceDirectory = import.meta.dirname;

/** Effect release audits and upstream release notes cited by the guidance. */
export const docsDirectory = path.join(import.meta.dirname, 'docs');
