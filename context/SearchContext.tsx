import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://discover-main-crawler-streekx.onrender.com";

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

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  text: string;
  timestamp: number;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export type SearchFilter = "all" | "images" | "videos" | "news" | "shopping" | "books" | "maps" | "ai";

export interface SearchSettings {
  safeSearch: boolean;
  incognitoMode: boolean;
  region: string;
  language: string;
  openLinksInApp: boolean;
  voiceLanguage: string;
  safeSearchLevel: "strict" | "moderate" | "off";
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
  suggestions: string[];
  fetchSuggestions: (q: string) => Promise<void>;
  chatThreads: ChatThread[];
  createChatThread: (title: string) => string;
  addChatMessage: (threadId: string, message: ChatMessage) => void;
  deleteChatThread: (threadId: string) => void;
  getCurrentChatThread: () => ChatThread | null;
  setCurrentChatThreadId: (id: string | null) => void;
}

const defaultSettings: SearchSettings = {
  safeSearch: true,
  incognitoMode: false,
  region: "IN",
  language: "en",
  openLinksInApp: true,
  voiceLanguage: "en-IN",
  safeSearchLevel: "moderate",
};

const SearchContext = createContext<SearchContextValue | null>(null);

function cleanDescription(desc: string): string {
  if (!desc || desc === "No description." || desc.toLowerCase() === "no description") return "";
  return desc.trim();
}

function cleanPrice(price: string): string | undefined {
  if (!price || price === "N/A" || price === "null") return undefined;
  if (price.length > 60) return undefined;
  return price;
}

function mapItem(item: any, idx: number, filter: SearchFilter): SearchResult {
  const desc = cleanDescription(item.description || item.snippet || item.content || "");
  const price = cleanPrice(item.price);
  return {
    id: `${idx}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
    title: item.title || item.name || "Untitled",
    url: item.url || item.link || "",
    description: desc,
    media: item.media || item.image || item.thumbnail || item.img || undefined,
    source: item.source || item.domain || "",
    price: filter === "shopping" ? price : undefined,
    published: item.published || item.date || undefined,
    category: filter,
  };
}

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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [currentChatThreadId, setCurrentChatThreadId] = useState<string | null>(null);

  useEffect(() => { loadPersisted(); }, []);

  async function loadPersisted() {
    try {
      const [h, s, st, ct] = await Promise.all([
        AsyncStorage.getItem("streekx_history"),
        AsyncStorage.getItem("streekx_saved"),
        AsyncStorage.getItem("streekx_settings"),
        AsyncStorage.getItem("streekx_chatthreads"),
      ]);
      if (h) setHistory(JSON.parse(h));
      if (s) setSavedItems(JSON.parse(s));
      if (st) setSettings({ ...defaultSettings, ...JSON.parse(st) });
      if (ct) setChatThreads(JSON.parse(ct));
    } catch (_) {}
  }

  const createChatThread = useCallback((title: string) => {
    const id = `thread-${Date.now()}`;
    const newThread: ChatThread = {
      id,
      title,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChatThreads(prev => {
      const next = [newThread, ...prev];
      AsyncStorage.setItem("streekx_chatthreads", JSON.stringify(next));
      return next;
    });
    return id;
  }, []);

  const addChatMessage = useCallback((threadId: string, message: ChatMessage) => {
    setChatThreads(prev => {
      const next = prev.map(t => 
        t.id === threadId 
          ? { ...t, messages: [...t.messages, message], updatedAt: Date.now() }
          : t
      );
      AsyncStorage.setItem("streekx_chatthreads", JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteChatThread = useCallback((threadId: string) => {
    setChatThreads(prev => {
      const next = prev.filter(t => t.id !== threadId);
      AsyncStorage.setItem("streekx_chatthreads", JSON.stringify(next));
      return next;
    });
  }, []);

  const getCurrentChatThread = useCallback(() => {
    return chatThreads.find(t => t.id === currentChatThreadId) || null;
  }, [chatThreads, currentChatThreadId]);

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

  const isSaved = useCallback((url: string) => savedItems.some(s => s.url === url), [savedItems]);

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
      const withDesc = searchResults.filter(r => r.description && r.description.length > 30);
      if (withDesc.length === 0) {
        const fallback = searchResults.slice(0, 2).map(r => r.title).join(". ");
        if (fallback) setAiOverview(`Based on search results for "${q}": ${fallback}.`);
        return;
      }
      const raw = withDesc.slice(0, 4).map(r => r.description).join(" ");
      const sentences = raw.match(/[^.!?]+[.!?]+/g) || [];
      const overview = sentences.slice(0, 4).join(" ").trim();
      setAiOverview(overview || raw.slice(0, 400));

      const qWords = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const base = qWords[0] || q;
      setRelatedSearches([
        `${base} meaning`,
        `${base} examples`,
        `best ${base} 2025`,
        `${base} vs alternatives`,
        `how does ${base} work`,
        `${base} latest news`,
      ].slice(0, 6));
    } catch (_) {
    } finally {
      setAiLoading(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); return; }
    try {
      const historyMatches = history
        .filter(h => h.query.toLowerCase().includes(q.toLowerCase()))
        .map(h => h.query)
        .slice(0, 4);
      const generated = [
        `${q} meaning`,
        `${q} near me`,
        `${q} 2025`,
        `how to ${q}`,
        `best ${q}`,
        `${q} wikipedia`,
      ];
      setSuggestions([...new Set([...historyMatches, ...generated])].slice(0, 8));
    } catch (_) {}
  }, [history]);

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
      const safeParam = settings.safeSearch ? "&safe=active" : "&safe=off";
      const regionParam = `&region=${settings.region}`;
      const url = `${BASE_URL}/search?q=${encodeURIComponent(q)}&filter=${apiFilter}${safeParam}${regionParam}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        headers: { "Accept": "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();
      let raw: any[] = [];

      if (Array.isArray(data)) {
        raw = data;
      } else if (data.results && Array.isArray(data.results)) {
        raw = data.results;
      } else if (data.data && Array.isArray(data.data)) {
        raw = data.data;
      }

      const mapped = raw
        .filter(item => item.title && item.url)
        .map((item, idx) => mapItem(item, idx, filter));

      setResults(mapped);
      if (filter !== "images") {
        generateAiOverview(mapped, q);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Search timed out. The server is warming up — please try again.");
      } else {
        setError(err.message || "Search failed. Check your connection.");
      }
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, addToHistory, generateAiOverview, settings.safeSearch, settings.region]);

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
    suggestions, fetchSuggestions,
    chatThreads, createChatThread, addChatMessage, deleteChatThread, getCurrentChatThread, setCurrentChatThreadId,
  }), [
    query, activeFilter, results, isLoading, error,
    search, history, clearHistory, removeHistoryItem,
    savedItems, saveItem, unsaveItem, isSaved,
    settings, updateSettings, aiOverview, aiLoading, relatedSearches,
    suggestions, fetchSuggestions,
    chatThreads, createChatThread, addChatMessage, deleteChatThread, getCurrentChatThread,
  ]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
