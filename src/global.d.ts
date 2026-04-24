import { FeedConfig, CategoryStyle, DiscopheryArticle } from './types';

declare global {
  interface Window {
    CONFIG: any;
    FEED_CATALOGUE: FeedConfig[];
    loadAllFeeds: () => Promise<void>;
    getActiveFeeds: () => FeedConfig[];
    getCustomFeeds: () => FeedConfig[];
    setFeedActive: (id: string, active: boolean) => void;
    setCategoryActive: (cat: string, active: boolean) => void;
    isFeedActive: (id: string) => boolean;
    addCustomFeed: (data: any) => FeedConfig;
    removeCustomFeed: (id: string) => void;
    isValidFeedUrl: (url: string) => boolean;
    slugifyFeedName: (str: string) => string;
    
    initAuth: () => void;
    handleGoogleSignIn: (response: any) => void;
    logout: () => void;
    getUser: () => any;
    
    blockSource: (id: string) => void;
    unblockSource: (id: string) => void;
    getBlockedSources: () => string[];
    isSourceBlocked: (id: string) => boolean;
    
    blockKeyword: (kw: string) => void;
    unblockKeyword: (kw: string) => void;
    getBlockedKeywords: () => string[];
    
    dismissArticle: (id: string) => void;
    isDismissed: (id: string) => boolean;
    undismissArticle: (id: string) => void;
    clearDismissed: () => void;
    
    shouldShowArticle: (article: DiscopheryArticle) => boolean;
    applyFilters: (articles: DiscopheryArticle[]) => DiscopheryArticle[];
    extractKeywordFromTitle: (title: string, fullList: string[]) => string | null;
    resetAllData: () => void;

    openFeedManager: () => void;
    closeFeedManager: () => void;
    
    renderCardGrid: (articles: DiscopheryArticle[], container: HTMLElement) => void;
  }
}

export {};

