import * as vscode from 'vscode';
import fs = require('fs');
import lineReader = require('n-readlines');
import path = require('path');

/**
 * Retrieves the word at the current cursor position in the active text editor.
 *
 * @returns {string | undefined} The word at the cursor position, or `undefined` if there is no active editor.
 */
export function getWord(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return undefined; }

    const position = editor.selection.active;
    const wordRange = editor.selection.isEmpty
        ? editor.document.getWordRangeAtPosition(position)
        : editor.selection;

    return editor.document.getText(wordRange);
}

/**
 * Finds occurrences of a target word in files within a specified directory.
 *
 * @param directory - The directory to search in.
 * @param targetWord - The word to search for.
 * @param customMatcher - An optional custom regex pattern to use for matching.
 * @param findFirstMatch - Whether to stop searching after the first match is found. Defaults to `false`.
 * @param ext - An array of file extensions to include in the search. Defaults to `['.xml', '.po']`.
 * @param excludeDir - A directory to exclude from the search. Defaults to `'backup'`.
 * @returns An array of `vscode.Location` objects representing the locations of the matches.
 */
export function findWordInFiles(directory: string, targetWord: string, customMatcher?: string, findFirstMatch = false, ext = ['.xml','.po'], excludeDir = 'backup'): vscode.Location[] {
    if (!fs.existsSync(directory)) {
        return [];
    }

    const files = getFilesInDirectory(directory, ext, excludeDir);
    const locations: vscode.Location[] = [];

    for (const file of files) {
        let lineNumber = 0;
        const lines = new lineReader(file);

        const regex = new RegExp(customMatcher || targetWord, 'i');
        while (true) {
            const line = lines.next();
            if (!line) { break; };
            lineNumber++;
            const lineStr = line.toString();
            const match = lineStr.match(regex);
            if (match) {
                const firstChar = match.index!;
                const lastChar = firstChar + targetWord.length;
                const start = new vscode.Position(lineNumber - 1, firstChar);
                const end = new vscode.Position(lineNumber - 1, lastChar);
                const range = new vscode.Range(start, end);
                const location = new vscode.Location(vscode.Uri.file(file), range);
                locations.push(location);
                if (findFirstMatch) { break; }
            }
        }
        if (findFirstMatch && locations.length !== 0) { break; }
    }

    return locations;
}

/**
 * Recursively retrieves all files in a directory with specified extensions, excluding a specific directory.
 *
 * @param {string} dir - The directory to search within.
 * @param {string[]} ext - An array of file extensions to include in the results.
 * @param {string} excludeDir - A directory to exclude from the search.
 * @returns {string[]} An array of file paths that match the specified extensions.
 */
function getFilesInDirectory(dir: string, ext: string[], excludeDir: string): string[] {
    if (!fs.existsSync(dir)) { return []; }

    const files: string[] = [];
    fs.readdirSync(dir).forEach((file: string) => {
        const filePath = path.join(dir, file);
        const stat = fs.lstatSync(filePath);

        if (stat.isDirectory() && filePath.indexOf(excludeDir) === -1) {
            files.push(...getFilesInDirectory(filePath, ext, excludeDir));
        } else if (ext.includes(path.extname(file))) {
            console.log(path.extname(file));
            files.push(filePath);
        }
    });

    return files;
}
