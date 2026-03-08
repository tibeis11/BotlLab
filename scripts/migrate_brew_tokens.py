import os

BASE = "/Users/timbeisheim/Documents/Projekte/BotlLab/app/brew/[id]"
FILES = [
    "page.tsx",
    "components/BrewHero.tsx",
    "components/BrewTabNav.tsx",
    "components/MinimalStickyHeader.tsx",
    "components/BrewActionButton.tsx",
    "components/BrewRatingsTab.tsx",
    "components/BrewCommentsTab.tsx",
    "components/BrewRecipeTab.tsx",
    "components/FlavorTagCloud.tsx",
]
REPLACEMENTS = [
    ("text-zinc-800", "text-border"),
    ("text-zinc-700", "text-text-disabled"),
    ("text-zinc-600", "text-text-disabled"),
    ("text-zinc-500", "text-text-muted"),
    ("text-zinc-400", "text-text-secondary"),
    ("text-zinc-300", "text-text-secondary"),
    ("text-zinc-200", "text-text-primary"),
    ("text-white", "text-text-primary"),
    ("bg-zinc-950", "bg-background"),
    ("bg-zinc-900", "bg-surface"),
    ("bg-zinc-800", "bg-surface-hover"),
    ("border-zinc-808", "border-border"),   # dummy - see below
    ("border-zinc-800", "border-border"),
    ("border-zinc-707", "border-border-hover"),  # dummy
    ("border-zinc-700", "border-border-hover"),
    ("from-zinc-900", "from-surface"),
    ("to-zinc-950", "to-background"),
    ("to-zinc-900", "to-surface"),
    ("from-zinc-800", "from-surface-hover"),
    ("bg-black", "bg-background"),
    ("from-black", "from-background"),
    ("focus:border-cyan-500", "focus:border-brand"),
    ("placeholder-zinc-600", "placeholder:text-text-disabled"),
]

# Remove dummy entries
REPLACEMENTS = [(o, n) for o, n in REPLACEMENTS if "808" not in o and "707" not in o]

for fname in FILES:
    path = os.path.join(BASE, fname)
    with open(path, "r") as f:
        content = f.read()
    original = content
    for old, new in REPLACEMENTS:
        content = content.replace(old, new)
    if content != original:
        with open(path, "w") as f:
            f.write(content)
        print(f"Updated: {fname}")
    else:
        print(f"Unchanged: {fname}")
print("Done")
