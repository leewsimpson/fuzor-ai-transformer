import { InvalidRepositoryUrlError } from "../types/errors"

export interface NormalizedRepo {
    owner: string
    name: string
    fullName: string
}

export function normalizeGitUrl(input: string): NormalizedRepo {
    // Match HTTPS URLs
    const httpsRegex = /https:\/\/github\.com\/([^\/]+)\/([^\/.]+)(?:\.git)?/i
    // Match SSH URLs
    const sshRegex = /git@github\.com:([^\/]+)\/([^\/.]+)(?:\.git)?/i
    // Match shorthand "owner/repo" format
    const shorthandRegex = /^([^\/]+)\/([^\/]+)$/

    let match: RegExpMatchArray | null

    if ((match = input.match(httpsRegex))) {
        return {
            owner: match[1],
            name: match[2].replace(/\.git$/, ''),
            fullName: `${match[1]}/${match[2].replace(/\.git$/, '')}`
        }
    } else if ((match = input.match(sshRegex))) {
        return {
            owner: match[1],
            name: match[2].replace(/\.git$/, ''),
            fullName: `${match[1]}/${match[2].replace(/\.git$/, '')}`
        }
    } else if ((match = input.match(shorthandRegex))) {
        return {
            owner: match[1],
            name: match[2],
            fullName: input
        }
    }

    throw new InvalidRepositoryUrlError(`Invalid Git repository format: ${input}. Supported formats:
- https://github.com/owner/repo.git
- git@github.com:owner/repo.git
- owner/repo`)
}

export function getGitConfigValue(key: string, spawnSync = require("child_process").spawnSync): string {
    const result = spawnSync("git", ["config", "--get", key])
    if (result.error) {
        throw result.error
    }
    if (result.status !== 0) {
        throw new Error(`Failed to get Git config '${key}': ${result.stderr.toString()}`)
    }
    return result.stdout.toString().trim()
}

export function setGitConfigValue(key: string, value: string, spawnSync = require("child_process").spawnSync): void {
    const result = spawnSync("git", ["config", "--add", key, value])
    if (result.error) {
        throw result.error
    }
    if (result.status !== 0) {
        throw new Error(`Failed to set Git config '${key}' to '${value}': ${result.stderr.toString()}`)
    }
}

export function getGitRemoteOriginUrl(spawnSync = require("child_process").spawnSync): string {
    const result = spawnSync("git", ["config", "--get", "remote.origin.url"])
    if (result.error) {
        throw result.error
    }

    if (result.status !== 0) {
        throw new Error(`Failed to get remote.origin.url: ${result.stderr.toString()}`)
    }
    return result.stdout.toString().trim()
}
