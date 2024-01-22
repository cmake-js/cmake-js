export interface FoundVisualStudio {
	version: string
	versionMajor: number
	versionMinor: number
	versionYear: number

	path: string
	msBuild: string
	toolset: string
	sdk: string
}

export class FindVisualStudio {
	static findVisualStudio(nodeSemver: string, configMsvsVersion?: string): Promise<FoundVisualStudio | null>
}
