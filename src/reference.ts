/**
 * File: reference.ts
 * Author: roidy
 * License: GPL v3 - https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as vscode from 'vscode';
import path = require('path');
import { findWordInFiles, getWord } from './utils';

export class ReferenceProvider implements vscode.ReferenceProvider {

    provideReferences(document: vscode.TextDocument,
        position: vscode.Position, _context: vscode.ReferenceContext,
        token: vscode.CancellationToken): vscode.ProviderResult<vscode.Location[]> | undefined {

        const workingDir = path.dirname(document.fileName);
        const [word, _] = getWord();

        if (!word) {
            return undefined;
        }

        const r = findWordInFiles(workingDir, word);
        return r;
    }

};