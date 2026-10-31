import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

// Serve `/slides/<deck>/` from `static/slides/<deck>/index.html` in dev.
// Vite's dev server only serves publicDir files by exact path and otherwise
// falls back to src/index.html; production hosting serves the directory index.
const slidesDirectoryIndex = {
    name: 'slides-directory-index',
    configureServer(server) {
        server.middlewares.use((req, res, next) => {
            const url = req.url.split('?')[0]
            if (url.startsWith('/slides/') && url.endsWith('/')) {
                const file = join(server.config.publicDir, url, 'index.html')
                if (existsSync(file)) {
                    res.setHeader('Content-Type', 'text/html; charset=utf-8')
                    res.end(readFileSync(file))
                    return
                }
            }
            next()
        })
    },
}

export default {
    root: 'src/', // Sources files (typically where index.html is)
    publicDir: '../static/', // Path from "root" to static assets (files that are served as they are)
    plugins: [slidesDirectoryIndex],
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
