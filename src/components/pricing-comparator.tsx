"use client";

import { Button } from '@/components/ui/button'
import { Cpu, Sparkles } from 'lucide-react'

interface PricingRow {
    feature: string;
    starter: boolean | string;
    pro: boolean | string;
    enterprise: boolean | string;
}

interface PricingComparatorProps {
    tableData: PricingRow[];
    onStarterClick?: () => void;
    onProClick?: () => void;
    onEnterpriseClick?: () => void;
    loadingKey?: string | null;
}

const defaultTableData: PricingRow[] = [
    {
        feature: 'Document ingestion',
        starter: true,
        pro: true,
        enterprise: true,
    },
    {
        feature: 'Core connectors',
        starter: true,
        pro: true,
        enterprise: true,
    },
    {
        feature: 'Team management',
        starter: false,
        pro: true,
        enterprise: true,
    },
    {
        feature: 'Storage',
        starter: '10GB',
        pro: '100GB',
        enterprise: 'Unlimited',
    },
    {
        feature: 'Client URLs',
        starter: '',
        pro: 'Up to 3',
        enterprise: 'Unlimited',
    },
    {
        feature: 'Support',
        starter: 'Email',
        pro: 'Priority',
        enterprise: 'Dedicated SLA',
    },
    {
        feature: 'SSO & SCIM',
        starter: '',
        pro: '',
        enterprise: true,
    },
]

export default function PricingComparator({ 
    tableData = defaultTableData,
    onStarterClick,
    onProClick,
    onEnterpriseClick,
    loadingKey
}: PricingComparatorProps) {
    return (
      <section className="py-8 md:py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="w-full overflow-auto lg:overflow-visible">
            <table className="max-w-[100vw] md:w-full dark:[--color-muted:var(--color-zinc-900)]">
              <thead className="bg-background/30 backdrop-blur-sm sticky top-0 z-20">
                <tr className="*:py-4 *:text-left *:font-medium">
                  <th className="lg:w-2/5"></th>
                  <th className="space-y-3">
                    <span className="block">Starter</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onStarterClick}
                      disabled={loadingKey !== null && loadingKey !== "starter"}
                    >
                      {loadingKey ? "Redirecting..." : "Get Started"}
                    </Button>
                  </th>
                  <th className="bg-transparent px-4 space-y-3">
                    <span className="block">Pro</span>
                    <Button
                      size="sm"
                      onClick={onProClick}
                      disabled={loadingKey !== null && loadingKey !== "pro"}
                    >
                      {loadingKey ? "Redirecting..." : "Get Started"}
                    </Button>
                  </th>
                  <th className="space-y-3">
                    <span className="block">Enterprise</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEnterpriseClick}
                      disabled={
                        loadingKey !== null && loadingKey !== "enterprise"
                      }
                    >
                      {loadingKey ? "Redirecting..." : "Contact Sales"}
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody className="text-caption text-sm">
                <tr className="*:py-3">
                  <td className="flex items-center gap-2 font-medium">
                    <Cpu className="size-4" />
                    <span>Features</span>
                  </td>
                  <td></td>
                  <td className="bg-background/30 backdrop-blur-sm px-4"></td>
                  <td></td>
                </tr>
                {tableData.slice(-4).map((row, index) => (
                  <tr
                    key={index}
                    className="*:border-b *:border-foreground/30 *:py-3"
                  >
                    <td className="text-muted-foreground">{row.feature}</td>
                    <td>
                      {row.starter === true ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="size-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        row.starter
                      )}
                    </td>
                    <td className="bg-background/30 backdrop-blur-sm px-4">
                      <div className="-mb-3 border-b *:border-foreground/30 py-3">
                        {row.pro === true ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="size-4"
                          >
                            <path
                              fillRule="evenodd"
                              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          row.pro
                        )}
                      </div>
                    </td>
                    <td>
                      {row.enterprise === true ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="size-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        row.enterprise
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="*:pb-3 *:pt-8">
                  <td className="flex items-center gap-2 font-medium">
                    <Sparkles className="size-4" />
                    <span>AI Models</span>
                  </td>
                  <td></td>
                  <td className="bg-background/30 backdrop-blur-sm px-4"></td>
                  <td></td>
                </tr>
                {tableData.map((row, index) => (
                  <tr
                    key={index}
                    className="*:border-b *:border-foreground/30 *:py-3"
                  >
                    <td className="text-muted-foreground">{row.feature}</td>
                    <td>
                      {row.starter === true ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="size-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        row.starter
                      )}
                    </td>
                    <td className="bg-background/30 backdrop-blur-sm px-4">
                      <div className="-mb-3 border-b  py-3">
                        {row.pro === true ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="size-4"
                          >
                            <path
                              fillRule="evenodd"
                              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          row.pro
                        )}
                      </div>
                    </td>
                    <td>
                      {row.enterprise === true ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="size-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        row.enterprise
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="*:py-6">
                  <td></td>
                  <td></td>
                  <td className="bg-background/30 backdrop-blur-sm px-4"></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
}
