'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getSafeRedirect } from '../lib/redirect';
import { useUIStore } from '../stores/ui.store';
import { useDebouncedValue } from './use-debounced-value';
import { useGlobalSearch } from './use-search';

const SEARCH_DEBOUNCE_MS = 200;

export function useCommandPalette() {
    const router = useRouter();
    const isOpen = useUIStore((s) => s.isCommandPaletteOpen);
    const close = useUIStore((s) => s.closeCommandPalette);
    const toggle = useUIStore((s) => s.toggleCommandPalette);

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
    const { data: results = [], isFetching } = useGlobalSearch(debouncedSearch);

    // global Cmd/Ctrl+K listener
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                toggle();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [toggle]);

    useEffect(() => {
        if (!isOpen) setSearch('');
    }, [isOpen]);

    // search result URLs come from the server, so only same-site paths are followed
    const go = (url: string) => {
        close();
        const target = getSafeRedirect(url, '');
        if (target) router.push(target);
    };

    return { isOpen, close, search, setSearch, results, isFetching, go };
}