'use strict'

const assert = require('assert')
const lib = require('../../')
const locateNAN = require('../../lib/locateNAN')
const CMake = lib.CMake
const path = require('path')
const log = require('npmlog')
const testRunner = require('./testRunner')
const testCases = require('./testCases')

describe('BuildSystem', function () {
	this.timeout(300000)

	before(function () {
		if (process.env.UT_LOG_LEVEL) {
			log.level = process.env.UT_LOG_LEVEL
			log.resume()
		}
		locateNAN.__projectRoot = path.resolve(path.join(__dirname, '../../'))
	})

	after(function () {
		locateNAN.__projectRoot = undefined
	})

	describe('Build with various options', function () {
		testRunner.runCase(testCases.buildPrototypeWithDirectoryOption)
	})

	it('should provide list of generators', async function () {
		const gens = await CMake.getGenerators()
		assert(Array.isArray(gens))
		assert(gens.length > 0)
		assert.equal(
			gens.filter(function (g) {
				return g.length
			}).length,
			gens.length,
		)
	})

	it('should rebuild prototype if cwd is the source directory', async function () {
		await testCases.buildPrototype2WithCWD()
	})

	it('should build prototpye with nodeapi', async function () {
		await testCases.buildPrototypeNapi()
	})

	it('should run with old GNU compilers', async function () {
		await testCases.shouldConfigurePreC11Properly()
	})

	it('should configure with custom option', async function () {
		await testCases.configureWithCustomOptions()
	})

	it('should forward extra arguments to CMake', async function () {
		await testCases.shouldForwardExtraCMakeArgs()
	})
})
