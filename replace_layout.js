const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app', 'discover', 'DiscoverClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '        {/*  Hero Search  */}';
const endMarker = '        {/* Live Active Filter Summary */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found');
  process.exit(1);
}

const newContent = \        <div className="flex flex-col md:flex-row gap-8">
          {/*  Left Sidebar (Filters) - Desktop Only  */}
          <aside className="hidden md:flex w-64 lg:w-72 flex-shrink-0 flex-col space-y-8">
            {/* Desktop Search */}
            <div className="relative" ref={searchContainerRef}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
              <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowSuggestions(true);
                    setSuggestionIndex(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSuggestionIndex(i => Math.min(i + 1, autocompleteSuggestions.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSuggestionIndex(i => Math.max(i - 1, -1));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (suggestionIndex >= 0 && autocompleteSuggestions.length > 0) {
                        setSearch(autocompleteSuggestions[suggestionIndex].label);
                        saveRecentSearch(autocompleteSuggestions[suggestionIndex].label);
                      } else if (search.trim()) {
                        saveRecentSearch(search);
                      }
                      setShowSuggestions(false);
                      setSuggestionIndex(-1);
                    } else if (e.key === 'Escape') {
                      setShowSuggestions(false);
                      setSuggestionIndex(-1);
                    }
                  }}
                  placeholder="Suchen"
                  className="w-full bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-cyan-500 rounded-xl pl-12 pr-10 py-3 outline-none focus:ring-2 focus:ring-cyan-500/20 text-sm font-medium text-white transition-all placeholder:text-zinc-500"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setShowSuggestions(false); searchRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
                  aria-label="Suche löschen"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Desktop Autocomplete Dropdown */}
              {showSuggestions && (autocompleteSuggestions.length > 0 || !search) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-30">
                  {!search && recentSearches.length > 0 && (
                    <>
                      <p className="px-4 pt-3 pb-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Letzte Suchen</p>
                      {recentSearches.map(s => (
                        <button
                          key={s}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearch(s);
                            setShowSuggestions(false);
                            setSuggestionIndex(-1);
                            searchRef.current?.focus();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800/70 hover:text-white transition-colors"
                        >
                          <Clock className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                          <span className="flex-1 truncate">\</span>
                        </button>
                      ))}
                    </>
                  )}
                  {!search && recentSearches.length === 0 && (
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Beliebte Suchen</p>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR_SEARCHES.map(s => (
                          <button
                            key={s}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSearch(s);
                              saveRecentSearch(s);
                              setShowSuggestions(false);
                              searchRef.current?.focus();
                            }}
                            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <TrendingUp className="w-3 h-3 text-cyan-500" />
                            \
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {autocompleteSuggestions.map((s, i) => (
                    <button
                      key={\\$\\{s.type}-\$\\{s.label}\}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearch(s.label);
                        saveRecentSearch(s.label);
                        setShowSuggestions(false);
                        setSuggestionIndex(-1);
                        searchRef.current?.focus();
                      }}
                      className={\w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors \$\\{
                        i === suggestionIndex
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
                      }\}
                    >
                      <span className="flex-shrink-0">
                        {s.type === 'recipe'     && <Search className="w-3.5 h-3.5 text-zinc-500" />}
                        {s.type === 'style'      && <span className="w-3.5 h-3.5 text-xs text-zinc-500 font-bold"></span>}
                        {s.type === 'ingredient' && <span className="w-3.5 h-3.5 text-xs text-zinc-500 font-bold"></span>}
                      </span>
                      <span className="flex-1 truncate">\</span>
                      <span className="text-xs text-zinc-600 flex-shrink-0">
                        {s.type === 'recipe' ? 'Rezept' : s.type === 'style' ? 'Stil' : 'Zutat'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Style List */}
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Bierstil</h3>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setStyleFilter('all')}
                  className={\	ext-left px-3 py-2 rounded-lg text-sm font-medium transition-colors \$\\{styleFilter === 'all' ? 'bg-cyan-500/10 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}\}
                >
                  Alle Stile
                </button>
                {POPULAR_STYLES.map(style => (
                  <button
                    key={style}
                    onClick={() => setStyleFilter(style)}
                    className={\	ext-left px-3 py-2 rounded-lg text-sm font-medium transition-colors \$\\{styleFilter === style ? 'bg-cyan-500/10 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}\}
                  >
                    \
                  </button>
                ))}
              </div>
            </div>

            {/* Braumethode */}
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Braumethode</h3>
              <div className="flex flex-col gap-1">
                {BREW_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setBrewTypeFilter(value as any)}
                    className={\	ext-left px-3 py-2 rounded-lg text-sm font-medium transition-colors \$\\{brewTypeFilter === value ? 'bg-cyan-500/10 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}\}
                  >
                    \
                  </button>
                ))}
              </div>
            </div>

            {/* Gärungstyp */}
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Gärungstyp</h3>
              <div className="flex flex-col gap-1">
                {FERMENTATION_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFermentationFilter(value as any)}
                    className={\	ext-left px-3 py-2 rounded-lg text-sm font-medium transition-colors \$\\{fermentationFilter === value ? 'bg-cyan-500/10 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}\}
                  >
                    \
                  </button>
                ))}
              </div>
            </div>

            {/* Alkohol (ABV) */}
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Alkohol (ABV)</h3>
              <div className="flex flex-col gap-1">
                {ABV_PRESETS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setAbvPreset(value as any)}
                    className={\	ext-left px-3 py-2 rounded-lg text-sm font-medium transition-colors \$\\{abvPreset === value ? 'bg-cyan-500/10 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}\}
                  >
                    \
                  </button>
                ))}
              </div>
            </div>

            {/* Bitterkeit (IBU) */}
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Bitterkeit (IBU)</h3>
              <div className="flex flex-col gap-1">
                {IBU_PRESETS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setIbuPreset(value as any)}
                    className={\	ext-left px-3 py-2 rounded-lg text-sm font-medium transition-colors \$\\{ibuPreset === value ? 'bg-cyan-500/10 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}\}
                  >
                    \
                  </button>
                ))}
              </div>
            </div>

            {/* Zutat */}
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Zutat (Hopfen/Malz)</h3>
              <div className="relative">
                <input
                  type="text"
                  list="ingredient-suggestions-desktop"
                  value={hopFilter}
                  onChange={(e) => setHopFilter(e.target.value)}
                  placeholder="z. B. Citra"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                {hopFilter && (
                  <button
                    onClick={() => setHopFilter('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <datalist id="ingredient-suggestions-desktop">
                {allIngredientNames.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>
          </aside>

          {/*  Main Content  */}
          <main className="flex-1 min-w-0">
            {/* Mobile Search & Filter Toggle */}
            <div className="md:hidden mb-6 space-y-4">
              <button
                className="flex w-full items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-left cursor-pointer hover:border-zinc-700 transition-colors"
                onClick={() => setShowSearchOverlay(true)}
                aria-label="Suche öffnen"
              >
                <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                <span className={search ? 'text-white font-medium flex-1 truncate text-sm' : 'text-zinc-500 flex-1 text-sm'}>
                  {search || 'Suchen'}
                </span>
                {search && <span className="text-xs text-cyan-400 font-semibold">Aktiv</span>}
              </button>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <CustomSelect
                    value={sort}
                    onChange={(val) => setSort(val as any)}
                    options={sortOptions}
                    placeholder="Sortierung"
                    variant="zinc"
                  />
                </div>
                <button
                  onClick={() => setShowBottomSheet(true)}
                  className={\lex items-center gap-2 text-sm font-semibold px-4 py-[10px] rounded-xl border transition-all \$\\{
                    brewTypeFilter !== 'all' || fermentationFilter !== 'all' || abvPreset !== 'all' || ibuPreset !== 'all' || hopFilter.trim().length > 0 || styleFilter !== 'all'
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }\}
                >
                  <Filter className="w-4 h-4" />
                  Filter
                  {(brewTypeFilter !== 'all' || fermentationFilter !== 'all' || abvPreset !== 'all' || ibuPreset !== 'all' || hopFilter.trim().length > 0 || styleFilter !== 'all') && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Desktop Sort Row */}
            <div className="hidden md:flex items-center justify-end mb-6">
              <div className="w-48">
                <CustomSelect
                  value={sort}
                  onChange={(val) => setSort(val as any)}
                  options={sortOptions}
                  placeholder="Sortierung"
                  variant="zinc"
                />
              </div>
            </div>

            {/* Mobile Fullscreen Search Overlay */}
            {showSearchOverlay && (
              <div className="md:hidden fixed inset-0 z-[60] bg-zinc-950 flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                  <button
                    onClick={() => setShowSearchOverlay(false)}
                    className="p-2 -ml-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
                    aria-label="Suche schließen"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      ref={overlaySearchRef}
                      autoFocus
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setSuggestionIndex(-1); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (suggestionIndex >= 0 && autocompleteSuggestions.length > 0) {
                            setSearch(autocompleteSuggestions[suggestionIndex].label);
                            saveRecentSearch(autocompleteSuggestions[suggestionIndex].label);
                          } else if (search.trim()) {
                            saveRecentSearch(search);
                          }
                          setShowSearchOverlay(false);
                        } else if (e.key === 'Escape') {
                          setShowSearchOverlay(false);
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSuggestionIndex(i => Math.min(i + 1, autocompleteSuggestions.length - 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSuggestionIndex(i => Math.max(i - 1, -1));
                        }
                      }}
                      placeholder="Suchen"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-xl pl-9 pr-9 py-2.5 outline-none text-sm text-white placeholder:text-zinc-500 transition-colors"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                        aria-label="Eingabe löschen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto">
                  {/* Recent searches (empty input) */}
                  {!search && recentSearches.length > 0 && (
                    <div className="px-4 pt-5 pb-2">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Letzte Suchen</p>
                        <button
                          onClick={() => {
                            setRecentSearches([]);
                            try { localStorage.removeItem('botllab_recent_searches'); } catch {}
                          }}
                          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                          Alle löschen
                        </button>
                      </div>
                      {recentSearches.map(s => (
                        <button
                          key={s}
                          onClick={() => { setSearch(s); saveRecentSearch(s); setShowSearchOverlay(false); }}
                          className="w-full flex items-center gap-3 py-3.5 text-left text-sm text-zinc-300 hover:text-white border-b border-zinc-800/40 last:border-0 transition-colors"
                        >
                          <Clock className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                          <span className="flex-1">\</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Hint when no searches yet */}
                  {!search && recentSearches.length === 0 && (
                    <div className="px-4 pt-6 pb-2">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Beliebte Suchen</p>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR_SEARCHES.map(s => (
                          <button
                            key={s}
                            onClick={() => { setSearch(s); saveRecentSearch(s); setShowSearchOverlay(false); }}
                            className="flex items-center gap-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
                            \
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Autocomplete suggestions while typing */}
                  {search && autocompleteSuggestions.length > 0 && (
                    <div className="px-4 pt-3 pb-2">
                      {autocompleteSuggestions.map((s, i) => (
                        <button
                          key={\\$\\{s.type}-\$\\{s.label}\}
                          onClick={() => {
                            setSearch(s.label);
                            saveRecentSearch(s.label);
                            setShowSearchOverlay(false);
                          }}
                          className={\w-full flex items-center gap-3 py-3.5 text-left text-sm border-b border-zinc-800/40 last:border-0 transition-colors \$\\{
                            i === suggestionIndex ? 'text-cyan-400' : 'text-zinc-300 hover:text-white'
                          }\}
                        >
                          <span className="flex-shrink-0 w-5 text-center">
                            {s.type === 'recipe'     && <Search className="w-4 h-4 text-zinc-500 inline" />}
                            {s.type === 'style'      && <span className="text-base leading-none"></span>}
                            {s.type === 'ingredient' && <span className="text-base leading-none"></span>}
                          </span>
                          <span className="flex-1 truncate">\</span>
                          <span className="text-xs text-zinc-600 flex-shrink-0">{s.type === 'recipe' ? 'Rezept' : s.type === 'style' ? 'Stil' : 'Zutat'}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* No suggestions while typing */}
                  {search && autocompleteSuggestions.length === 0 && (
                    <p className="px-4 py-12 text-center text-zinc-600 text-sm">Keine Vorschläge für \"</p>
                  )}
                </div>
              </div>
            )}

;

const finalContent = content.substring(0, startIndex) + newContent + content.substring(endIndex);
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('Replacement done');
