// Appends each game's first and latest commit dates to its Games list item.
// The dates come from <game>/_meta.json, published by that game's own deploy workflow.
for (const item of document.querySelectorAll('[data-game-meta]')) {
    fetch(item.dataset.gameMeta, { cache: 'no-cache' })
        .then(response => (response.ok ? response.json() : null))
        .then(meta => {
            if (!meta?.firstCommit || !meta?.lastCommit) return
            const dates = document.createElement('span')
            dates.className = 'game-dates'
            dates.textContent = ` (first commit ${meta.firstCommit} · last commit ${meta.lastCommit})`
            item.append(dates)
        })
        .catch(() => {})
}
