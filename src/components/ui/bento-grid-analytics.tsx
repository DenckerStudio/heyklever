'use client';
/**
 * Search Analytics Bento Grid Component
 * Displays search analytics data in a responsive Bento grid layout
 */

import { BentoGrid, BentoGridItem } from './bento-grid';
import { ActivityChartCard } from './activity-chart-card';
import { ContentRecommendationsCard, ContentRecommendation } from './content-recommendations-card';
import { CheckCircle2, XCircle, Clock, Languages, ArrowRight, Search, Filter, ArrowUpDown, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Input } from './input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { useState, useMemo, useEffect } from 'react';

export interface SearchAnalyticsItem {
  idx: number;
  id: number;
  created_at: string;
  team_id: string;
  context: string;
  session_id: string;
  query_text: string;
  was_successful: boolean;
  failure_reason: string | null;
  confidence: string;
  language: string;
  keywords: string[];
}

interface BentoGridAnalyticsProps {
  searchAnalytics: SearchAnalyticsItem[];
  contentRecommendations?: ContentRecommendation[];
  totalSearches?: number;
  successfulSearches?: number;
  activityData?: { day: string; value: number }[];
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

// Helper function to parse keywords (could be string or array)
function parseKeywords(keywords: string | string[]): string[] {
  if (Array.isArray(keywords)) return keywords;
  try {
    const parsed = JSON.parse(keywords);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Calculate stats from analytics data
function calculateStats(analytics: SearchAnalyticsItem[]) {
  const total = analytics.length;
  const successful = analytics.filter(a => a.was_successful).length;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
  
  // Group by day for chart
  const dayMap = new Map<string, number>();
  analytics.forEach(item => {
    const date = new Date(item.created_at);
    const dayKey = date.toLocaleDateString('en-US', { weekday: 'short' });
    dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
  });

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const activityData = days.map(day => ({
    day,
    value: dayMap.get(day) || 0,
  }));

  return { total, successful, successRate, activityData };
}

type SortField = 'created_at' | 'query_text' | 'context' | 'was_successful' | 'confidence' | 'language';
type SortDirection = 'asc' | 'desc';

export function BentoGridAnalytics({ 
  searchAnalytics = [], 
  contentRecommendations = [],
  totalSearches,
  successfulSearches,
  activityData: propActivityData
}: BentoGridAnalyticsProps) {
  const stats = calculateStats(searchAnalytics);
  
  // Use provided stats or fallback to calculated from the limited list
  const total = totalSearches ?? stats.total;
  const successful = successfulSearches ?? stats.successful;
  const activityData = propActivityData ?? stats.activityData;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [contextFilter, setContextFilter] = useState<'all' | 'public' | 'private'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter and sort analytics data
  const filteredAndSortedAnalytics = useMemo(() => {
    let filtered = [...searchAnalytics];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.query_text.toLowerCase().includes(query) ||
        item.language.toLowerCase().includes(query) ||
        parseKeywords(item.keywords).some(k => k.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter === 'success') {
      filtered = filtered.filter(item => item.was_successful);
    } else if (statusFilter === 'failed') {
      filtered = filtered.filter(item => !item.was_successful);
    }

    // Apply context filter
    if (contextFilter !== 'all') {
      filtered = filtered.filter(item => item.context === contextFilter);
    }

    // Apply confidence filter
    if (confidenceFilter !== 'all') {
      filtered = filtered.filter(item => item.confidence === confidenceFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'query_text':
          aValue = a.query_text.toLowerCase();
          bValue = b.query_text.toLowerCase();
          break;
        case 'context':
          aValue = a.context;
          bValue = b.context;
          break;
        case 'was_successful':
          aValue = a.was_successful ? 1 : 0;
          bValue = b.was_successful ? 1 : 0;
          break;
        case 'confidence':
          const confidenceOrder = { high: 3, medium: 2, low: 1 };
          aValue = confidenceOrder[a.confidence as keyof typeof confidenceOrder] || 0;
          bValue = confidenceOrder[b.confidence as keyof typeof confidenceOrder] || 0;
          break;
        case 'language':
          aValue = a.language.toLowerCase();
          bValue = b.language.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [searchAnalytics, searchQuery, statusFilter, contextFilter, confidenceFilter, sortField, sortDirection]);

  // Paginate the filtered and sorted data
  const paginatedAnalytics = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedAnalytics.slice(startIndex, endIndex);
  }, [filteredAndSortedAnalytics, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedAnalytics.length / pageSize));
  const startItem = filteredAndSortedAnalytics.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredAndSortedAnalytics.length);
  
  // Ensure currentPage is valid when data changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, contextFilter, confidenceFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return <ArrowUpDown className="h-3 w-3 ml-1" />;
  };

  return (
    <BentoGrid
      columns={{ mobile: 1, tablet: 2, desktop: 4 }}
      gap="gap-4"
      className="p-6"
    >
      {/* Chart - spans 2 columns on desktop */}
      <BentoGridItem
        className="h-auto"
        span={{ mobile: 1, tablet: 2, desktop: 2 }}
        rowSpan={{ mobile: 1, tablet: 2, desktop: 2 }}
      >
        <ActivityChartCard
          title="Weekly Activity"
          totalValue={`${total}`}
          data={activityData}
          className="bg-transparent border-0 shadow-none"
        />
      </BentoGridItem>

      {/* Total Searches Stat */}
      <BentoGridItem
        span={{ mobile: 1, tablet: 1, desktop: 1 }}
        className="h-auto"
      >
        <div className="flex flex-col h-full justify-center p-2 relative group cursor-default">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
              <Search className="h-5 w-5 text-blue-500" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Total
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">Total Searches</p>
            <p className="text-4xl font-bold tracking-tight">{total}</p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-[70%] bg-blue-500 rounded-full" />
            </div>
            <p className="text-[10px] text-muted-foreground whitespace-nowrap">Last 50 queries</p>
          </div>
        </div>
      </BentoGridItem>

      {/* Success Rate Stat */}
      <BentoGridItem
        span={{ mobile: 1, tablet: 1, desktop: 1 }}
        className="h-auto"
      >
        <div className="flex flex-col h-full justify-center p-2 relative group cursor-default">
           <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              {successful} / {total}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">Success Rate</p>
            <p className="text-4xl font-bold tracking-tight">{successRate}%</p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `${successRate}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground whitespace-nowrap">
              {successful} successful
            </p>
          </div>
        </div>
      </BentoGridItem>

      {/* Recommendations */}
      <BentoGridItem
        span={{ mobile: 1, tablet: 2, desktop: 2 }}
        className="h-auto p-0"
      >
        <ContentRecommendationsCard recommendations={contentRecommendations} className="border-0 shadow-none h-full" />
      </BentoGridItem>

      {/* Activity Card */}
      <BentoGridItem
        span={{ mobile: 1, tablet: 1, desktop: 1 }}
        className="h-auto"
      >
        <div className="flex flex-col h-full justify-between p-2 relative">
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Activity className="h-5 w-5 text-purple-500" />
                </div>
                 <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  Live
                </span>
              </div>
              
              <div className="space-y-1 mb-4">
                <p className="text-sm text-muted-foreground font-medium">Activity Feed</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  View and filter detailed search analytics across all channels.
                </p>
              </div>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group justify-between">
                  <span>View Details</span>
                  <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl border-white/10">
              <DialogHeader>
                <DialogTitle>Search Activity</DialogTitle>
                <DialogDescription>
                  View and filter all search analytics data. Showing {startItem}-{endItem} of {filteredAndSortedAnalytics.length} items.
                </DialogDescription>
              </DialogHeader>
              
              {/* Filters and Search */}
              <div className="flex flex-col gap-4 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by query, language, or keywords..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Status: {statusFilter === 'all' ? 'All' : statusFilter === 'success' ? 'Success' : 'Failed'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setStatusFilter('all')}>All</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('success')}>Success</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('failed')}>Failed</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Context: {contextFilter === 'all' ? 'All' : contextFilter}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setContextFilter('all')}>All</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setContextFilter('public')}>Public</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setContextFilter('private')}>Private</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Confidence: {confidenceFilter === 'all' ? 'All' : confidenceFilter}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setConfidenceFilter('all')}>All</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setConfidenceFilter('high')}>High</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setConfidenceFilter('medium')}>Medium</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setConfidenceFilter('low')}>Low</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {(searchQuery || statusFilter !== 'all' || contextFilter !== 'all' || confidenceFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setContextFilter('all');
                        setConfidenceFilter('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                {filteredAndSortedAnalytics.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    No search analytics data available
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="border-b border-border">
                          <th 
                            className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleSort('created_at')}
                          >
                            <div className="flex items-center">
                              Time
                              {getSortIcon('created_at')}
                            </div>
                          </th>
                          <th 
                            className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleSort('query_text')}
                          >
                            <div className="flex items-center">
                              Query
                              {getSortIcon('query_text')}
                            </div>
                          </th>
                          <th 
                            className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleSort('context')}
                          >
                            <div className="flex items-center">
                              Context
                              {getSortIcon('context')}
                            </div>
                          </th>
                          <th 
                            className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleSort('was_successful')}
                          >
                            <div className="flex items-center">
                              Status
                              {getSortIcon('was_successful')}
                            </div>
                          </th>
                          <th 
                            className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleSort('confidence')}
                          >
                            <div className="flex items-center">
                              Confidence
                              {getSortIcon('confidence')}
                            </div>
                          </th>
                          <th 
                            className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleSort('language')}
                          >
                            <div className="flex items-center">
                              Language
                              {getSortIcon('language')}
                            </div>
                          </th>
                          <th className="text-left p-2 font-medium">Keywords</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAnalytics.map((item) => {
                      const keywords = parseKeywords(item.keywords);
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(item.created_at)}
                            </div>
                          </td>
                          <td className="p-2">
                            <div
                              className="max-w-xs truncate"
                              title={item.query_text}
                            >
                              {item.query_text}
                            </div>
                          </td>
                          <td className="p-2">
                            <span
                              className={cn(
                                "px-2 py-1 rounded text-xs",
                                item.context === "public"
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                  : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                              )}
                            >
                              {item.context}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              {item.was_successful ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span
                                className={cn(
                                  "text-xs",
                                  item.was_successful
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                )}
                              >
                                {item.was_successful ? "Success" : "Failed"}
                              </span>
                            </div>
                            {item.failure_reason && (
                              <div
                                className="text-xs text-muted-foreground mt-1 truncate max-w-xs"
                                title={item.failure_reason}
                              >
                                {item.failure_reason}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <span
                              className={cn(
                                "px-2 py-1 rounded text-xs",
                                item.confidence === "high"
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                  : item.confidence === "medium"
                                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                                    : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                              )}
                            >
                              {item.confidence}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <Languages className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs uppercase">
                                {item.language}
                              </span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1">
                              {keywords.slice(0, 4).map((keyword, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 bg-muted rounded text-xs"
                                >
                                  {keyword}
                                </span>
                              ))}
                              {keywords.length > 4 && (
                                <span className="text-xs text-muted-foreground">
                                  +{keywords.length - 4}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {filteredAndSortedAnalytics.length > 0 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          {pageSize}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => { setPageSize(10); setCurrentPage(1); }}>10</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setPageSize(20); setCurrentPage(1); }}>20</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setPageSize(50); setCurrentPage(1); }}>50</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setPageSize(100); setCurrentPage(1); }}>100</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {startItem}-{endItem} of {filteredAndSortedAnalytics.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </BentoGridItem>
    </BentoGrid>
  );
}

