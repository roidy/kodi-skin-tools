import * as vscode from 'vscode';
import PO from "pofile";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import { logger } from './logging';
import { config } from './configuration';

class POFiles {
    public skinPO: PO | undefined;
    public kodiPO: PO | undefined;

    constructor() {
        this.skinPO = this.loadSkinPO();
        this.loadKodiPO().then(po => this.kodiPO = po);
    }

    async loadKodiPO(): Promise<PO | undefined> {
        const response = await fetch('https://raw.githubusercontent.com/xbmc/xbmc/master/addons/resource.language.en_gb/resources/strings.po');
        if (response.status !== 200) {
            return undefined;
        }
        const body = await response.text();
        const po = PO.parse(body);
        return this.skinPO;
    }

    loadSkinPO(): PO | undefined {
        let editor = vscode.window.activeTextEditor;
        if (editor?.document.uri) {
            const folder = vscode.workspace.getWorkspaceFolder(editor!.document.uri);
            const poFile = folder!.uri.fsPath + `${path.sep}language${path.sep}resource.language.en_gb${path.sep}strings.po`;
            const data = readFileSync(poFile, 'utf-8');
            const po = PO.parse(data);
            return po;
        }
        return undefined;
    }

    writeSkinPO(skinPO: PO | undefined) {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.uri) {
            const folder = vscode.workspace.getWorkspaceFolder(editor!.document.uri);
            const stamp = new Date().toISOString().replace(/[:.]/g, '');
            const backupPoDirectory = folder!.uri.fsPath + `${path.sep}language${path.sep}resource.language.en_gb${path.sep}backup${path.sep}`;
            const backupPoFile = `${backupPoDirectory}${stamp}.po`;
            const poFile = folder!.uri.fsPath + `${path.sep}language${path.sep}resource.language.en_gb${path.sep}strings.po`;

            if (!existsSync(backupPoDirectory)) {
                mkdirSync(backupPoDirectory);
            }

            copyFileSync(poFile, backupPoFile);

            this.skinPO?.save(poFile, function (err) {
                if (err) {
                    logger.log('Error saving new PO file: ' + err.message);
                } else {
                    logger.log('PO file saved successfully');
                }
            });
        }
    }

    getString(id: number): string {
        const stringId = `#${id}`;

        // Check Skin strings
        const skinString = this.skinPO?.items?.find(item => item.msgctxt === stringId)?.msgid;
        if (skinString) { return skinString; }

        // Check Kodi strings
        const kodiString = this.kodiPO?.items?.find(item => item.msgctxt === stringId)?.msgid;
        if (kodiString) { return kodiString; }

        return '';
    }

    getID(word: String) {
        // Find word in po
        let id: string | undefined;
        const skinID = this.skinPO?.items?.find((v) => v.msgid === word);
        if (skinID) { id = `${skinID.msgctxt?.substring(1)}`; }

        const kodiID = this.kodiPO?.items?.find((v) => v.msgid === word);
        if (kodiID) { id = `${kodiID.msgctxt?.substring(1)}`; }

        if (id) {
            if (config.operation) {
                return id;
            } else {
                return `$LOCALIZE[${id}]`;
            }
        }
        return '';
    }

    createEntry(word: string) {
        let item;
        for (let i = 31000; i < 34000; i++) {
            if (this.skinPO && this.skinPO.items) {
                item = this.skinPO.items.find((v) => v.msgctxt === `#${i}`);
            }
            if (!item) {
                var newItem = new PO.Item();
                newItem.msgctxt = `#${i}`;
                newItem.msgid = (word as string);
                var newPO = this.skinPO && this.skinPO.items ? this.skinPO.items.concat(newItem) : [];
                if (this.skinPO && this.skinPO.items) {
                    newPO = this.skinPO.items.concat(newItem);
                    this.skinPO.items = newPO;
                }
                if (this.skinPO && this.skinPO.items) {
                    this.skinPO.items.sort((a, b) => {
                        if (a.msgctxt && b.msgctxt) {
                            return a.msgctxt > b.msgctxt ? 1 : -1;
                        }
                        return 0;
                    });
                }
                this.writeSkinPO(this.skinPO);
                break;
            }
        }
        return po;
    }
}

export const po = new POFiles();