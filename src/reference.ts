import * as vscode from 'vscode';
import * as utils from './utils';
import path = require('path');
import lineReader = require('n-readlines');
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