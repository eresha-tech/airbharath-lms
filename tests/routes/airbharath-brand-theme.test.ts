import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import approved from '../fixtures/airbharath-brand-theme.json';
const source = readFileSync('app/globals.css', 'utf8');
it.each(['light', 'dark'] as const)('retains every exact owner-approved %s HSL value', mode => {
    const selector = mode === 'light' ? ':root' : '.dark';
    const block = source.slice(source.indexOf(`${selector} {`)).split('}')[0];
    const values = Object.fromEntries([...block.matchAll(/(--[\w-]+): ([^;]+);/g)].map(m => [m[1], m[2]]));
    expect(values).toMatchObject(approved[mode]);
    expect(block).toContain(`color-scheme: ${mode};`);
});
it('keeps scoped Workspace and Admin styles from overriding shared theme tokens', () => {
    for (const file of ['components/workspace/ui/workspace-ui.css', 'components/workspace/creator/creator.css', 'components/admin/workspace-admin.css']) {
        expect(readFileSync(file, 'utf8')).not.toMatch(/--(?:primary|primary-foreground|background|muted-foreground|ring):/);
    }
    expect(readFileSync('components/public/public.css', 'utf8')).not.toMatch(/194 98|189 94|#5143b8|#bdb2ff/);
});
it('uses next/font variables without recursive declarations and retains shared functional CSS', () => {
    expect(source).not.toMatch(/--font-(\w+):\s*var\(--font-\1\)/);
    for (const feature of ['prefers-reduced-motion', '::-webkit-scrollbar', '.glass-card', '.markdown-content .katex', 'video::cue', '--motion-fast: 150ms']) expect(source).toContain(feature);
    const layout = readFileSync('app/layout.tsx', 'utf8');
    expect(layout).toContain('defaultTheme="system"');
    expect(layout).toContain('inter.variable');
    expect(readFileSync('components/DarkModeToggle.tsx', 'utf8')).not.toMatch(/DropdownMenu|Dialog/);
});
