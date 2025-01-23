
import * as assert from "assert"
import { getGitConfigValue, normalizeGitUrl } from "../../utils/gitUtils"

const sinon = require("sinon")

suite("gitUtils Tests", () => {
    suite("normalizeGitUrl", () => {
        test("normalizes HTTPS URL format", () => {
            const result = normalizeGitUrl("https://github.com/owner/repo.git")
            assert.deepEqual(result, {
                owner: "owner",
                name: "repo",
                fullName: "owner/repo"
            })
        })

        test("normalizes HTTPS URL without .git suffix", () => {
            const result = normalizeGitUrl("https://github.com/owner/repo")
            assert.deepEqual(result, {
                owner: "owner",
                name: "repo",
                fullName: "owner/repo"
            })
        })

        test("normalizes SSH URL format", () => {
            const result = normalizeGitUrl("git@github.com:owner/repo.git")
            assert.deepEqual(result, {
                owner: "owner",
                name: "repo",
                fullName: "owner/repo"
            })
        })

        test("normalizes SSH URL without .git suffix", () => {
            const result = normalizeGitUrl("git@github.com:owner/repo")
            assert.deepEqual(result, {
                owner: "owner",
                name: "repo",
                fullName: "owner/repo"
            })
        })

        test("normalizes shorthand format", () => {
            const result = normalizeGitUrl("owner/repo")
            assert.deepEqual(result, {
                owner: "owner",
                name: "repo",
                fullName: "owner/repo"
            })
        })

        // test("throws InvalidRepositoryUrlError for invalid URL format", () => {
        //     assert.throws(
        //         () => normalizeGitUrl("invalid/format"),
        //         InvalidRepositoryUrlError,
        //         "Invalid Git repository format: invalid/format. Supported formats:"
        //     )
        // })
    })

    let spawnSyncStub: any

    setup(() => {
        spawnSyncStub = sinon.stub(require("child_process"), "spawnSync")
    })

    teardown(() => {
        sinon.restore()
    })


    test("getGitConfigValue throws error when key does not exist", () => {
        spawnSyncStub.returns({
            status: 1,
            stdout: "",
            stderr: "error: key not found",
            error: null
        })

        assert.throws(
            () => getGitConfigValue("invalid.key"),
            Error,
            "Failed to get Git config 'invalid.key': error: key not found"
        )
    })

    
})
