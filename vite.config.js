import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

// Match S3 website directory behavior for the standalone tracker.
function serveTracker(directory) {
    return (server) => {
        server.middlewares.use((req, res, next) => {
            const url = new URL(req.url, 'http://localhost')
            if (url.pathname === '/festival-tracker') {
                res.writeHead(301, { Location: '/festival-tracker/' + url.search })
                res.end()
                return
            }
            if (url.pathname === '/festival-tracker/') {
                const file = resolve(directory(server), 'festival-tracker/index.html')
                if (existsSync(file)) {
                    res.setHeader('Content-Type', 'text/html; charset=utf-8')
                    res.end(readFileSync(file))
                    return
                }
            }
            next()
        })
    }
}
const trackerDirectoryIndex = {
    name: 'tracker-directory-index',
    configureServer: serveTracker(server => server.config.publicDir),
    configurePreviewServer: serveTracker(server => resolve(server.config.root, server.config.build.outDir)),
}

export default {
    root: 'src/', // Sources files (typically where index.html is)
    // Do not publish the generated lecture decks while they are hidden.
    publicDir: '../public',
    plugins: [trackerDirectoryIndex],
    server:
    {
        port: 5189,
        host: true, // Open to local network and display URL
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env) // Open if it's not a CodeSandbox
    },
    build:
    {
        outDir: '../dist', // Output in the dist/ folder
        emptyOutDir: true, // Empty the folder first
        sourcemap: false // No sourcemap in production build
    },
}
