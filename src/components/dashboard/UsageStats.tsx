import { TrendingUp, FileText, MessageSquare, DollarSign, Activity } from "lucide-react";
import Link from "next/link";
import { Section } from "../ui/section";

interface UsageData {
  Recommendations: number;
  documents: number;
  chat_messages: number;
  estimated_cost: number;
}

interface UsageStatsProps {
  usageData: UsageData;
}

export function UsageStats({ usageData }: UsageStatsProps) {
  return (
    <section>
        <div className="relative backdrop-blur-sm rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Recommendations */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50/30 backdrop-blur-sm to-blue-100/30 dark:from-blue-950/10 dark:to-blue-900/10 p-4 border border-blue-200/20 dark:border-blue-800/10 hover:scale-105 transition-all duration-300">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground dark:text-blue-300">
                  Recommendations
                </p>
                <p className="text-2xl font-bold text-foreground dark:text-blue-100">
                  {usageData.Recommendations.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground dark:text-neutral-400">
                  To view recommendations,{" "}
                  <Link
                    href="/dashboard/recommendations"
                    className="text-muted-foreground dark:text-blue-400"
                  >
                    click here{" "}
                  </Link>{" "}
                </p>
              </div>
            </div>

            {/* Estimated Cost */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50/30 backdrop-blur-sm to-green-100/30 dark:from-green-950/10 dark:to-green-900/10 p-4 border border-green-200/20 dark:border-green-800/10 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-gradient-to-br dark:from-green-500 dark:to-green-600 from-green-200 to-green-300 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-300 dark:text-green-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground dark:text-green-300">
                  Estimated Cost
                </p>
                <p className="text-2xl font-bold text-foreground dark:text-green-100">
                  ${usageData.estimated_cost.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground dark:text-green-400">
                  this month
                </p>
              </div>
            </div>

            {/* Indexed Documents */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50/30 backdrop-blur-sm to-purple-100/30 dark:from-purple-950/10 dark:to-purple-900/10 p-4 border border-purple-200/20 dark:border-purple-800/10 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-gradient-to-br dark:from-purple-500 dark:to-purple-600 from-purple-200 to-purple-300 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <TrendingUp className="h-4 w-4 text-purple-300 dark:text-purple-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground dark:text-purple-300">
                  Indexed Docs
                </p>
                <p className="text-2xl font-bold text-foreground dark:text-purple-100">
                  {usageData.documents.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground dark:text-purple-400">
                  documents
                </p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-pink-50/30 backdrop-blur-sm to-pink-100/30 dark:from-pink-950/10 dark:to-pink-900/10 p-4 border border-pink-200/20 dark:border-pink-800/10 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-gradient-to-br dark:from-pink-500 dark:to-pink-600 from-pink-200 to-pink-300 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <TrendingUp className="h-4 w-4 text-pink-300 dark:text-pink-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground dark:text-pink-300">
                  Chat Messages
                </p>
                <p className="text-2xl font-bold text-foreground dark:text-pink-100">
                  {usageData.chat_messages.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground dark:text-pink-400">
                  conversations
                </p>
              </div>
            </div>
          </div>
        </div>
    </section>
  );
}

