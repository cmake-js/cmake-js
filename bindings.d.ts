/**
 * Load the native binding for a module
 * @param basePath - the base path of the module. Searching is done using this as the root
 * @param options - Describe how the prebuilt binary is named. This is the same as what is given to cmake-js-verify. By describing all these properties explicitly, we can make the loading be much simpler and more deterministic, and avoid needing the list the contents of folders and detemrining which is the best match.
 */
export = function loadBinding<T = any>(basePath: string, options: {
    /**
     * Unique name of the binding. 
     * This must match the output file as specified in CMake
     * Typically this will be the same as the name in your package.json, but you are free to make it different
     */
    name: string,
    /**
     * The node-api versions that are built.
     */
    napi_versions?: number[],
    /**
     * Whether the bindings are labelled with the arm version (eg armv7, arm64v8)
     */
    armv?: boolean,
}): T;
