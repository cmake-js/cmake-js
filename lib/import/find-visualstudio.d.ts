export interface FindVisualStudioResult {
	version: string
	versionMajor: number
	versionMinor: number

	path: string
	msBuild: string
	toolset: string
	sdk: string
}

export function findVisualStudio(
	nodeSemver: string,
	configMsvsVersion: string | undefined,
): Promise<FindVisualStudioResult>
