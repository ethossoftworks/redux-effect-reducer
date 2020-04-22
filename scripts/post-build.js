const fs = require("fs")
const path = require("path")

const rootDir = path.dirname(__dirname, "../")

const filesToCopy = {
    "./package.json": "./build/package.json",
    "./src/effects/package.json": "./build/effects/package.json",
    "./README.md": "./build/README.md",
    "./LICENSE": "./build/LICENSE",
}

const filesToMove = {}

for (const [src, dst] of Object.entries(filesToCopy)) {
    const directory = path.dirname(path.resolve(rootDir, dst))
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory)
    }
    fs.copyFileSync(path.resolve(rootDir, src), path.resolve(rootDir, dst))
}

for (const [src, dst] of Object.entries(filesToMove)) {
    const directory = path.dirname(path.resolve(rootDir, dst))
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory)
    }
    fs.renameSync(path.resolve(rootDir, src), path.resolve(rootDir, dst))
}
