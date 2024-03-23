import {
    App,
    Editor,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting
} from 'obsidian';

interface TagLinkSettings {
	tagLinkSubstitutions: Array<TagLinkSubstitution>;
}

interface TagLinkSubstitution {
    tagRegex: string;
    linkSubstitution: string;
    metadata: {
        regexProblem: string | null;
        substitutionProblem: string | null;
        captureGroupCount: number;
    };
}

const DEFAULT_SETTINGS: TagLinkSettings = {
    tagLinkSubstitutions: new Array<TagLinkSubstitution>(),
}

const DEFAULT_SUBSTITUTION: TagLinkSubstitution = {
    tagRegex: '',
    linkSubstitution: '',
    metadata: {
        regexProblem: null,
        substitutionProblem: null,
        captureGroupCount: 0
    }
}

export default class TagLink extends Plugin {
	settings: TagLinkSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'open-tag-as-link',
			name: 'Open tag as a link',
			editorCallback: async (editor, _) => {
                await this.openTagAsLinkAtCursor(this, editor);
            }
		});

		this.addSettingTab(new TagLinkSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

    async openTagAsLinkAtCursor(plugin: TagLink, editor: Editor) {
        // https://help.obsidian.md/Editing+and+formatting/Tags#Tag+format
        const FIND_TAG_REGEX = /#([\w\/\-_]+)/g;

        const cursorPosition = editor.getCursor();
        const currentLine = editor.getLine(cursorPosition.line);

        let searchResult;
        while ((searchResult = FIND_TAG_REGEX.exec(currentLine)) !== null) {
            if (FIND_TAG_REGEX.lastIndex < cursorPosition.ch) {
                continue;
            }
            if (searchResult.index > cursorPosition.ch) {
                break;
            }

            const selectedTag = searchResult[1];
            await plugin.openTagAsLink(selectedTag);

            break;
        }
    }

    async openTagAsLink(tag: string) {
        for (const tagLinkSubstitution of this.settings.tagLinkSubstitutions) {
            // Skip empty entries
            if (tagLinkSubstitution.tagRegex.length == 0 || tagLinkSubstitution.linkSubstitution.length == 0) {
                continue;
            }

            // Compile the regular expression
            let tagRegex;
            try {
                tagRegex = new RegExp(tagLinkSubstitution.tagRegex);
            } catch (_) {
                continue;
            }

            // Check if there's a match
            let matchResult = tag.match(tagRegex);
            if (matchResult === null) {
                continue;
            }

            // Ensure there's at least one capture group
            if (matchResult.length - 1 == 0) {
                continue;
            }

            // Step through the capture groups in reverse order, using the capture groups' indices as the substitution targets
            // It's done in reverse order so that two-digit numbers are replaced first - `$12` will be replaced before `$1`, which would otherwise also match
            let finalLink = tagLinkSubstitution.linkSubstitution;
            for (let index = matchResult.length - 1; index >= 1; index--) {
                finalLink = finalLink.replace('$' + index, matchResult[index]);
            }

            // Open the substituted link in the browser
            new Notice('Opening the following link in the browser: ' + finalLink)
            window.open(finalLink);

            return;
        }

        new Notice('The selected tag doesn\'t match any configured tag link substitutions!');
    }

    async validateTagRegex(tagLinkSubstitution: TagLinkSubstitution) {
        if (tagLinkSubstitution.tagRegex.length == 0) {
            tagLinkSubstitution.metadata.regexProblem = 'The value is empty!';
            return;
        }

        try {
            // https://stackoverflow.com/a/16046903
            const captureGroupCount = (new RegExp(tagLinkSubstitution.tagRegex + '|'))
                .exec('')
                .length - 1;

            tagLinkSubstitution.metadata.captureGroupCount = captureGroupCount;

            if (captureGroupCount == 0) {
                tagLinkSubstitution.metadata.regexProblem = 'You need at least one capture group! Surround the important part of the tag with (brackets).';
                return;
            }
        } catch (_) {
            tagLinkSubstitution.metadata.regexProblem = 'The regular expression is invalid!';
            return;
        }

        tagLinkSubstitution.metadata.regexProblem = null; // No problem
    }

    async validateLinkSubstitution(tagLinkSubstitution: TagLinkSubstitution) {
        const FIND_SUBSTITUTION_REGEX = /\$(\d+)/g;

        let maximumSubstitutionValue = null;
        for (const substitutionMatch of tagLinkSubstitution.linkSubstitution.matchAll(FIND_SUBSTITUTION_REGEX)) {
            let substitutionValue = parseInt(substitutionMatch[1], 10);
            if (isNaN(substitutionValue)) {
                tagLinkSubstitution.metadata.substitutionProblem = 'One of the substitution values is not a valid number!';
                return;
            }

            if (maximumSubstitutionValue === null || maximumSubstitutionValue < substitutionValue) {
                maximumSubstitutionValue = substitutionValue;
            }
        }

        if (maximumSubstitutionValue > tagLinkSubstitution.metadata.captureGroupCount) {
            tagLinkSubstitution.metadata.substitutionProblem = 'One of the substitution values is greater than the number of capture groups!';
            return;
        }

        tagLinkSubstitution.metadata.substitutionProblem = null; // No problem
    }
}

class TagLinkSettingTab extends PluginSettingTab {
	plugin: TagLink;

	constructor(app: App, plugin: TagLink) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

        // Clear the display
		containerEl.empty();

        // Row Add Button
        new Setting(containerEl)
            .setName('Add new')
            .addButton(button => button
                .setIcon('plus')
                .setTooltip('Add')
                .onClick(async () => {
                    this.plugin.settings.tagLinkSubstitutions.push(structuredClone(DEFAULT_SUBSTITUTION));

                    await this.plugin.saveSettings();
                    this.display();
                }));

        for (let index = 0; index < this.plugin.settings.tagLinkSubstitutions.length; index++) {
            const tagLinkSubstitution = this.plugin.settings.tagLinkSubstitutions[index];

            const row = new Setting(containerEl);

            // Regular Expression Input
            row.addText(text => text
                .setPlaceholder('Tag regex')
                .setValue(tagLinkSubstitution.tagRegex)
                .onChange(async (newValue) => {
                    const tagLinkSubstitution = this.plugin.settings.tagLinkSubstitutions[index];

                    // Update the value
                    tagLinkSubstitution.tagRegex = newValue;

                    // Validate the regular expression
                    await this.plugin.validateTagRegex(tagLinkSubstitution);

                    // Re-validate the substitution if the new regular expression has no issues
                    // This is necessary because the substitution's validity depends on the regular expression
                    if (tagLinkSubstitution.metadata.regexProblem === null) {
                        const originalSubstitutionProblem = tagLinkSubstitution.metadata.substitutionProblem;

                        await this.plugin.validateLinkSubstitution(tagLinkSubstitution);

                        if (tagLinkSubstitution.metadata.substitutionProblem !== originalSubstitutionProblem) {
                            this.display();
                        }
                    }

                    // Display any issues on the text input
                    this.displayElementProblem(
                        text.inputEl,
                        tagLinkSubstitution.metadata.regexProblem
                    );

                    // Save the settings
                    await this.plugin.saveSettings();
                })
                .then(text=>
                    // Display any cached issues with the regular expression
                    this.displayElementProblem(
                        text.inputEl,
                        this.plugin.settings.tagLinkSubstitutions[index].metadata.regexProblem
                    )));

            // Link Substitution
            row.addText(text => text
                .setPlaceholder('Link substitution')
                .setValue(tagLinkSubstitution.linkSubstitution)
                .onChange(async (newValue) => {
                    const tagLinkSubstitution = this.plugin.settings.tagLinkSubstitutions[index];

                    // Update the value
                    tagLinkSubstitution.linkSubstitution = newValue;

                    // Validate the substitution
                    await this.plugin.validateLinkSubstitution(tagLinkSubstitution);

                    // Display any issues on the text input
                    this.displayElementProblem(
                        text.inputEl,
                        tagLinkSubstitution.metadata.substitutionProblem
                    );

                    // Save the settings
                    await this.plugin.saveSettings();
                })
                .then(text =>
                    // Display any cached issues with the substitution
                    this.displayElementProblem(
                        text.inputEl,
                        this.plugin.settings.tagLinkSubstitutions[index].metadata.substitutionProblem
                    )));

            // Row Delete Button
            row.addButton(button => button
                .setIcon('x')
                .setTooltip('Delete')
                .onClick(async () => {
                    this.plugin.settings.tagLinkSubstitutions.splice(index, 1);

                    await this.plugin.saveSettings();
                    this.display();
                }));
        }
	}

    displayElementProblem(element: HTMLInputElement, problem: string | null) {
        if (problem !== null) {
            element.className = 'invalid';
            element.title = problem;
        } else {
            element.className = '';
            element.title = '';
        }
    }
}
