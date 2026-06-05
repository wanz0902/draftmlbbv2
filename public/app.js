const state = {
    matches: [],
    history: [],
    heroStats: [],
    items: [],
    assets: { heroes: {}, teams: {} },
    view: 'matches',
    selectedIndex: 0,
    filters: {
        query: '',
        team: 'all',
        map: 'all'
    }
};

const els = {
    tabs: document.querySelectorAll('.nav-tab'),
    searchInput: document.querySelector('#searchInput'),
    teamFilter: document.querySelector('#teamFilter'),
    mapFilter: document.querySelector('#mapFilter'),
    matchOnlyFields: document.querySelectorAll('.match-only'),
    matchList: document.querySelector('#matchList'),
    statPrimary: document.querySelector('#statPrimary'),
    statPrimaryLabel: document.querySelector('#statPrimaryLabel'),
    statSecondary: document.querySelector('#statSecondary'),
    statSecondaryLabel: document.querySelector('#statSecondaryLabel'),
    viewEyebrow: document.querySelector('#viewEyebrow'),
    mainTitle: document.querySelector('#mainTitle'),
    mainMeta: document.querySelector('#mainMeta'),
    scoreBadge: document.querySelector('#scoreBadge'),
    summaryBand: document.querySelector('#summaryBand'),
    teamLeft: document.querySelector('#teamLeft'),
    teamRight: document.querySelector('#teamRight'),
    mainContent: document.querySelector('#mainContent')
};

function normalizeName(value) {
    return String(value || '')
        .replace(/Â/g, '')
        .replace(/\u00a0/g, ' ')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '');
}

function cleanText(value) {
    return String(value || '')
        .replace(/Â/g, '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function heroImage(hero) {
    return state.assets.heroes[normalizeName(hero)] || '';
}

function teamLogo(team) {
    return state.assets.teams[team] || '';
}

function heroMarkup(hero, type = 'pick') {
    const image = heroImage(hero);
    const safeHero = cleanText(hero);

    if (!image) {
        return `<div class="hero ${type}"><div class="missing">${escapeHtml(safeHero.slice(0, 2))}</div><span>${escapeHtml(safeHero)}</span></div>`;
    }

    return `
        <div class="hero ${type}">
            <img src="${image}" alt="${escapeHtml(safeHero)}" loading="lazy">
            <span title="${escapeHtml(safeHero)}">${escapeHtml(safeHero)}</span>
        </div>
    `;
}

function getQuery() {
    return state.filters.query.toLowerCase();
}

function includesQuery(values) {
    const query = getQuery();
    return !query || values.join(' ').toLowerCase().includes(query);
}

function getFilteredMatches() {
    return state.matches.filter(match => {
        const teamOk = state.filters.team === 'all' ||
            match.blueTeam === state.filters.team ||
            match.redTeam === state.filters.team;
        const mapOk = state.filters.map === 'all' ||
            match.games.some(game => game.map === state.filters.map);
        const queryOk = includesQuery([
            match.match,
            match.date,
            match.mvp,
            match.score,
            ...match.games.flatMap(game => [
                game.map,
                game.winner,
                ...game.blueTeam.picks,
                ...game.blueTeam.bans,
                ...game.redTeam.picks,
                ...game.redTeam.bans
            ])
        ]);

        return teamOk && mapOk && queryOk;
    });
}

function setStats(primary, primaryLabel, secondary, secondaryLabel) {
    els.statPrimary.textContent = primary;
    els.statPrimaryLabel.textContent = primaryLabel;
    els.statSecondary.textContent = secondary;
    els.statSecondaryLabel.textContent = secondaryLabel;
}

function renderFilters() {
    const teams = Array.from(new Set(
        state.matches.flatMap(match => [match.blueTeam, match.redTeam])
    )).sort();
    const maps = Array.from(new Set(
        state.matches.flatMap(match => match.games.map(game => game.map))
    )).sort();

    els.teamFilter.innerHTML = [
        '<option value="all">All teams</option>',
        ...teams.map(team => `<option value="${team}">${team}</option>`)
    ].join('');

    els.mapFilter.innerHTML = [
        '<option value="all">All maps</option>',
        ...maps.map(map => `<option value="${escapeHtml(map)}">${escapeHtml(map)}</option>`)
    ].join('');
}

function teamSummary(team, side, match) {
    const logo = teamLogo(team);
    const wins = match.games.filter(game => game.winner === team).length;
    const image = logo ? `<img src="${logo}" alt="${team} logo">` : '';
    const body = `<div><strong>${team}</strong><span>${wins} game win</span></div>`;
    return side === 'right' ? `${body}${image}` : `${image}${body}`;
}

function renderMatchList() {
    const matches = getFilteredMatches();
    const totalGames = matches.reduce((total, match) => total + match.games.length, 0);
    setStats(matches.length, 'matches', totalGames, 'games');

    if (!matches.length) {
        els.matchList.innerHTML = '<div class="empty">No matches found.</div>';
        els.mainContent.innerHTML = '';
        els.mainTitle.textContent = 'No match selected';
        return;
    }

    const selectedMatch = state.matches[state.selectedIndex];
    if (!matches.includes(selectedMatch)) {
        state.selectedIndex = state.matches.indexOf(matches[0]);
    }

    els.matchList.innerHTML = matches.map(match => {
        const index = state.matches.indexOf(match);
        const leftLogo = teamLogo(match.blueTeam);
        const rightLogo = teamLogo(match.redTeam);

        return `
            <button class="match-button ${index === state.selectedIndex ? 'active' : ''}" data-index="${index}">
                <div class="match-row">
                    <div class="match-team">${leftLogo ? `<img class="team-logo" src="${leftLogo}" alt="">` : ''}<span>${match.blueTeam}</span></div>
                    <strong>${match.score}</strong>
                    <div class="match-team"><span>${match.redTeam}</span>${rightLogo ? `<img class="team-logo" src="${rightLogo}" alt="">` : ''}</div>
                </div>
                <div class="small-meta">
                    <span>${escapeHtml(match.date)}</span>
                    <span>MVP ${escapeHtml(match.mvp || '-')}</span>
                </div>
            </button>
        `;
    }).join('');

    els.matchList.querySelectorAll('.match-button').forEach(button => {
        button.addEventListener('click', () => {
            state.selectedIndex = Number(button.dataset.index);
            render();
        });
    });
}

function renderGameSide(game, side) {
    const data = side === 'blue' ? game.blueTeam : game.redTeam;
    const isWin = game.winner === data.name;

    return `
        <article class="team-panel ${isWin ? 'win' : 'lose'}">
            <div class="team-panel-head">
                <strong>${data.name}</strong>
                <span class="result ${isWin ? 'win' : 'lose'}">${isWin ? 'W' : 'L'}</span>
            </div>
            <div class="section-label">Picks</div>
            <div class="hero-row">${data.picks.map(hero => heroMarkup(hero, 'pick')).join('')}</div>
            <div class="section-label">Bans</div>
            <div class="hero-row">${data.bans.map(hero => heroMarkup(hero, 'ban')).join('')}</div>
        </article>
    `;
}

function renderMatchDetail() {
    const match = state.matches[state.selectedIndex];
    if (!match) return;

    els.viewEyebrow.textContent = 'Match Detail';
    els.mainTitle.textContent = match.match;
    els.mainMeta.textContent = `${match.date} - MVP ${match.mvp || '-'} - ${match.games.length} games`;
    els.scoreBadge.textContent = match.score;
    els.scoreBadge.classList.remove('hidden');
    els.summaryBand.classList.remove('hidden');
    els.teamLeft.innerHTML = teamSummary(match.blueTeam, 'left', match);
    els.teamRight.innerHTML = teamSummary(match.redTeam, 'right', match);

    els.mainContent.innerHTML = match.games.map(game => `
        <article class="game-card">
            <div class="game-head">
                <div class="game-title">
                    <span>Game ${game.game}</span>
                    <span class="pill">${escapeHtml(game.score)}</span>
                    <span class="pill winner">${escapeHtml(game.winner)} win</span>
                </div>
                <div>
                    <span class="pill">${escapeHtml(game.map)}</span>
                    <span class="pill">${escapeHtml(game.duration)}</span>
                </div>
            </div>
            <div class="game-grid">
                ${renderGameSide(game, 'blue')}
                ${renderGameSide(game, 'red')}
            </div>
        </article>
    `).join('');
}

function renderMatchesView() {
    els.matchOnlyFields.forEach(field => field.classList.remove('hidden'));
    renderMatchList();
    renderMatchDetail();
}

function filteredHeroStats() {
    return state.heroStats.filter(hero => includesQuery([
        hero.hero_name,
        hero.rank,
        hero.picks_total,
        hero.bans_total,
        hero.winrate
    ]));
}

function renderHeroStatsView() {
    const heroes = filteredHeroStats();
    els.matchOnlyFields.forEach(field => field.classList.add('hidden'));
    els.scoreBadge.classList.add('hidden');
    els.summaryBand.classList.add('hidden');
    els.matchList.innerHTML = '';
    els.viewEyebrow.textContent = 'Hero Stats';
    els.mainTitle.textContent = 'Pick, ban, and presence list';
    els.mainMeta.textContent = 'Data from data/heroes_stats.json';
    setStats(heroes.length, 'heroes', state.heroStats.length, 'total rows');

    els.mainContent.innerHTML = `
        <div class="grid-list">
            ${heroes.map(hero => {
                const name = cleanText(hero.hero_name);
                const image = heroImage(name);
                return `
                    <article class="data-panel hero-stat-card">
                        <div class="hero-stat-head">
                            ${image ? `<img src="${image}" alt="${escapeHtml(name)}">` : '<div class="missing">?</div>'}
                            <div>
                                <strong>#${escapeHtml(hero.rank)} ${escapeHtml(name)}</strong>
                                <div class="muted">${escapeHtml(hero.tournament_presence)} presence</div>
                            </div>
                        </div>
                        <div class="metric-grid">
                            <div class="metric"><span>Picks</span><strong>${escapeHtml(hero.picks_total)}</strong></div>
                            <div class="metric"><span>Bans</span><strong>${escapeHtml(hero.bans_total)}</strong></div>
                            <div class="metric"><span>Winrate</span><strong>${escapeHtml(hero.winrate)}</strong></div>
                            <div class="metric"><span>P+B</span><strong>${escapeHtml(hero.picks_bans_total)}</strong></div>
                        </div>
                    </article>
                `;
            }).join('')}
        </div>
    `;
}

function filteredItems() {
    return state.items.filter(item => includesQuery([item.name, item.category]));
}

function renderItemsView() {
    const items = filteredItems();
    const categories = new Set(items.map(item => item.category));
    els.matchOnlyFields.forEach(field => field.classList.add('hidden'));
    els.scoreBadge.classList.add('hidden');
    els.summaryBand.classList.add('hidden');
    els.matchList.innerHTML = '';
    els.viewEyebrow.textContent = 'Items';
    els.mainTitle.textContent = 'MLBB item assets';
    els.mainMeta.textContent = 'Scanned directly from aset_item';
    setStats(items.length, 'items', categories.size, 'categories');

    els.mainContent.innerHTML = `
        <div class="grid-list">
            ${items.map(item => `
                <article class="data-panel item-card">
                    <div class="item-head">
                        <img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy">
                        <div>
                            <strong>${escapeHtml(item.name)}</strong>
                            <div class="muted">${escapeHtml(item.category)}</div>
                        </div>
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}

function filteredHistory() {
    return state.history.filter(match => includesQuery([
        match.date,
        match.tournament,
        match.team1,
        match.team2,
        match.winner,
        match.length,
        match.patch,
        ...(match.draft1 || []),
        ...(match.draft2 || [])
    ]));
}

function renderHistoryView() {
    const history = filteredHistory();
    els.matchOnlyFields.forEach(field => field.classList.add('hidden'));
    els.scoreBadge.classList.add('hidden');
    els.summaryBand.classList.add('hidden');
    els.matchList.innerHTML = '';
    els.viewEyebrow.textContent = 'Game History';
    els.mainTitle.textContent = 'Parsed match history';
    els.mainMeta.textContent = 'Data from data/matches.json';
    setStats(history.length, 'rows', state.history.length, 'total');

    els.mainContent.innerHTML = `
        <article class="data-panel table-panel">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Tournament</th>
                        <th>Team 1</th>
                        <th>Draft 1</th>
                        <th>Team 2</th>
                        <th>Draft 2</th>
                        <th>Winner</th>
                        <th>Length</th>
                        <th>Patch</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map(match => `
                        <tr>
                            <td>${escapeHtml(match.date)}</td>
                            <td>${escapeHtml(match.tournament)}</td>
                            <td>${escapeHtml(match.team1)}</td>
                            <td>${(match.draft1 || []).map(hero => heroMarkup(hero)).join('')}</td>
                            <td>${escapeHtml(match.team2)}</td>
                            <td>${(match.draft2 || []).map(hero => heroMarkup(hero)).join('')}</td>
                            <td>${escapeHtml(match.winner)}</td>
                            <td>${escapeHtml(match.length)}</td>
                            <td>${escapeHtml(match.patch)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </article>
    `;
}

function render() {
    els.tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.view === state.view));

    if (state.view === 'matches') {
        renderMatchesView();
    } else if (state.view === 'heroes') {
        renderHeroStatsView();
    } else if (state.view === 'items') {
        renderItemsView();
    } else {
        renderHistoryView();
    }
}

function bindEvents() {
    els.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            state.view = tab.dataset.view;
            render();
        });
    });

    els.searchInput.addEventListener('input', event => {
        state.filters.query = event.target.value.trim();
        render();
    });

    els.teamFilter.addEventListener('change', event => {
        state.filters.team = event.target.value;
        render();
    });

    els.mapFilter.addEventListener('change', event => {
        state.filters.map = event.target.value;
        render();
    });
}

async function boot() {
    const [matches, assets, heroStats, items, history] = await Promise.all([
        fetch('/api/matches').then(response => response.json()),
        fetch('/api/assets').then(response => response.json()),
        fetch('/api/hero-stats').then(response => response.json()),
        fetch('/api/items').then(response => response.json()),
        fetch('/api/history').then(response => response.json())
    ]);

    state.matches = matches;
    state.assets = assets;
    state.heroStats = heroStats;
    state.items = items;
    state.history = history;

    renderFilters();
    bindEvents();
    render();
}

boot().catch(error => {
    console.error(error);
    els.mainTitle.textContent = 'Failed to load data';
    els.mainMeta.textContent = error.message;
});
