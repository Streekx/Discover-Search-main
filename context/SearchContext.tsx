import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";

const BASE_URL = "https://streekxkk-streekx.hf.space";

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  description: string;
  media?: string;
  source?: string;
  price?: string;
  published?: string;
  category?: string;
}

export interface SavedItem extends SearchResult {
  savedAt: number;
}

export interface HistoryItem {
  query: string;
  timestamp: number;
  filter: string;
}

export type SearchFilter = "all" | "images" | "videos" | "news" | "shopping" | "books" | "maps" | "ai";

interface SearchSettings {
  safeSearch: boolean;
  incognitoMode: boolean;
  region: string;
  language: string;
  openLinksInApp: boolean;
  voiceLanguage: string;
}

interface SearchContextValue {
  query: string;
  setQuery: (q: string) => void;
  activeFilter: SearchFilter;
  setActiveFilter: (f: SearchFilter) => void;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  search: (q: string, filter?: SearchFilter) => Promise<void>;
  history: HistoryItem[];
  clearHistory: () => void;
  removeHistoryItem: (query: string) => void;
  savedItems: SavedItem[];
  saveItem: (item: SearchResult) => void;
  unsaveItem: (url: string) => void;
  isSaved: (url: string) => boolean;
  settings: SearchSettings;
  updateSettings: (s: Partial<SearchSettings>) => void;
  aiOverview: string;
  aiLoading: boolean;
  relatedSearches: string[];
}

const defaultSettings: SearchSettings = {
  safeSearch: true,
  incognitoMode: false,
  region: "IN",
  language: "en",
  openLinksInApp: true,
  voiceLanguage: "en-IN",
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SearchFilter>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [settings, setSettings] = useState<SearchSettings>(defaultSettings);
  const [aiOverview, setAiOverview] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [relatedSearches, setRelatedSearches] = useState<string[]>([]);

  useEffect(() => {
    loadPersisted();
  }, []);

  async function loadPersisted() {
    try {
      const [h, s, st] = await Promise.all([
        AsyncStorage.getItem("streekx_history"),
        AsyncStorage.getItem("streekx_saved"),
        AsyncStorage.getItem("streekx_settings"),
      ]);
      if (h) setHistory(JSON.parse(h));
      if (s) setSavedItems(JSON.parse(s));
      if (st) setSettings({ ...defaultSettings, ...JSON.parse(st) });
    } catch (_) {}
  }

  const addToHistory = useCallback(async (q: string, filter: SearchFilter) => {
    if (settings.incognitoMode) return;
    setHistory(prev => {
      const filtered = prev.filter(i => i.query !== q);
      const next = [{ query: q, timestamp: Date.now(), filter }, ...filtered].slice(0, 50);
      AsyncStorage.setItem("streekx_history", JSON.stringify(next));
      return next;
    });
  }, [settings.incognitoMode]);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await AsyncStorage.removeItem("streekx_history");
  }, []);

  const removeHistoryItem = useCallback(async (q: string) => {
    setHistory(prev => {
      const next = prev.filter(i => i.query !== q);
      AsyncStorage.setItem("streekx_history", JSON.stringify(next));
      return next;
    });
  }, []);

  const saveItem = useCallback(async (item: SearchResult) => {
    setSavedItems(prev => {
      if (prev.find(s => s.url === item.url)) return prev;
      const next = [{ ...item, savedAt: Date.now() }, ...prev];
      AsyncStorage.setItem("streekx_saved", JSON.stringify(next));
      return next;
    });
  }, []);

  const unsaveItem = useCallback(async (url: string) => {
    setSavedItems(prev => {
      const next = prev.filter(s => s.url !== url);
      AsyncStorage.setItem("streekx_saved", JSON.stringify(next));
      return next;
    });
  }, []);

  const isSaved = useCallback((url: string) => {
    return savedItems.some(s => s.url === url);
  }, [savedItems]);

  const updateSettings = useCallback(async (s: Partial<SearchSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...s };
      AsyncStorage.setItem("streekx_settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const generateAiOverview = useCallback(async (searchResults: SearchResult[], q: string) => {
    setAiLoading(true);
    setAiOverview("");
    try {
      const top = searchResults.slice(0, 3);
      if (top.length === 0) return;
      const summary = top
        .filter(r => r.description)
        .map(r => r.description)
        .join(" ");
      if (summary.length > 20) {
        const sentences = summary.match(/[^.!?]+[.!?]+/g) || [];
        const overview = sentences.slice(0, 3).join(" ").trim();
        setAiOverview(overview || summary.slice(0, 300));
      }
      const words = q.toLowerCase().split(" ").filter(w => w.length > 2);
      const related = words.map(w => [
        `${w} meaning`,
        `${w} examples`,
        `best ${w}`,
        `${w} near me`,
        `${w} 2025`,
      ]).flat().slice(0, 6);
      setRelatedSearches(related);
    } catch (_) {
    } finally {
      setAiLoading(false);
    }
  }, []);

  const search = useCallback(async (q: string, filter: SearchFilter = activeFilter) => {
    if (!q.trim()) return;
    setQuery(q);
    setActiveFilter(filter);
    setIsLoading(true);
    setError(null);
    setAiOverview("");
    setRelatedSearches([]);
    addToHistory(q, filter);

    try {
      const apiFilter = filter === "ai" ? "all" : filter;
      const response = await fetch(
        `${BASE_URL}/search?q=${encodeURIComponent(q)}&filter=${apiFilter}`,
        {
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) throw new Error(`Search failed: ${response.status}`);

      const data = await response.json();
      let mapped: SearchResult[] = [];

      if (Array.isArray(data)) {
        mapped = data.map((item: any, idx: number) => ({
          id: `${idx}-${Date.now()}`,
          title: item.title || item.name || "No title",
          url: item.url || item.link || "",
          description: item.description || item.snippet || item.content || "",
          media: item.media || item.image || item.thumbnail || item.img || undefined,
          source: item.source || item.domain || "",
          price: item.price || undefined,
          published: item.published || item.date || undefined,
          category: filter,
        }));
      } else if (data.results && Array.isArray(data.results)) {
        mapped = data.results.map((item: any, idx: number) => ({
          id: `${idx}-${Date.now()}`,
          title: item.title || "No title",
          url: item.url || item.link || "",
          description: item.description || item.snippet || "",
          media: item.media || item.image || item.thumbnail || undefined,
          source: item.source || "",
          price: item.price || undefined,
          published: item.published || undefined,
          category: filter,
        }));
      }

      setResults(mapped);
      generateAiOverview(mapped, q);
    } catch (err: any) {
      if (err.name === "TimeoutError") {
        setError("Search timed out. Please try again.");
      } else {
        setError(err.message || "Search failed. Check your connection.");
      }
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, addToHistory, generateAiOverview]);

  const value = useMemo(() => ({
    query, setQuery,
    activeFilter, setActiveFilter,
    results, isLoading, error,
    search,
    history, clearHistory, removeHistoryItem,
    savedItems, saveItem, unsaveItem, isSaved,
    settings, updateSettings,
    aiOverview, aiLoading,
    relatedSearches,
  }), [
    query, activeFilter, results, isLoading, error,
    search, history, clearHistory, removeHistoryItem,
    savedItems, saveItem, unsaveItem, isSaved,
    settings, updateSettings, aiOverview, aiLoading, relatedSearches,
  ]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
