"use client";

import { marked } from "marked";
import type * as React from "react";
import { isValidElement, memo, useMemo, useState, useEffect } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { ExternalLink, Copy, Check } from "lucide-react";
import {
	CalloutBlock,
	TagBadge,
	ActionButton,
	CollapsibleBlock,
	type CalloutType,
	type ButtonVariant,
} from "./ai-response-blocks";

// ============================================================================
// Code Block with Copy Button and Syntax Highlighting
// ============================================================================

const DEFAULT_PRE_BLOCK_CLASS =
	"my-4 overflow-x-auto rounded-xl bg-zinc-950 text-zinc-50 dark:bg-zinc-900 border border-zinc-800";

const extractTextContent = (node: React.ReactNode): string => {
	if (typeof node === "string") {
		return node;
	}
	if (Array.isArray(node)) {
		return node.map(extractTextContent).join("");
	}
	if (isValidElement(node)) {
		// @ts-expect-error - node.props.children may have different structure, but extractTextContent handles it recursively
		return extractTextContent(node.props.children);
	}
	return "";
};

interface CodeBlockWithCopyProps extends React.HTMLAttributes<HTMLDivElement> {
	language: string;
	children: React.ReactNode;
}

const CodeBlockWithCopy = ({
	children,
	language,
	className,
}: CodeBlockWithCopyProps) => {
	const [copied, setCopied] = useState(false);
	const [highlightedCode, setHighlightedCode] = useState<React.ReactNode>(null);
	const code = extractTextContent(children);

	// Load syntax highlighting asynchronously
	useEffect(() => {
		let isMounted = true;
		
		const highlight = async () => {
			try {
				const { codeToTokens, bundledLanguages } = await import("shiki");
				
				if (!isMounted) return;
				
				if (!(language in bundledLanguages)) {
					setHighlightedCode(
						<code className="whitespace-pre-wrap text-sm">{children}</code>
					);
					return;
				}

				const { tokens } = await codeToTokens(code, {
					lang: language as keyof typeof bundledLanguages,
					themes: {
						light: "github-dark",
						dark: "github-dark",
					},
				});

				if (!isMounted) return;

				setHighlightedCode(
					<code className="whitespace-pre-wrap text-sm">
						{tokens.map((line, lineIndex) => (
							<span key={`line-${lineIndex}`}>
								{line.map((token, tokenIndex) => {
									const style =
										typeof token.htmlStyle === "string"
											? undefined
											: token.htmlStyle;

									return (
										<span key={`token-${tokenIndex}`} style={style}>
											{token.content}
										</span>
									);
								})}
								{lineIndex !== tokens.length - 1 && "\n"}
							</span>
						))}
					</code>
				);
			} catch (error) {
				console.error("Syntax highlighting failed:", error);
				if (isMounted) {
					setHighlightedCode(
						<code className="whitespace-pre-wrap text-sm">{children}</code>
					);
				}
			}
		};

		highlight();
		
		return () => {
			isMounted = false;
		};
	}, [code, language, children]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy code", err);
		}
	};

	return (
		<div className={cn(DEFAULT_PRE_BLOCK_CLASS, "relative group", className)}>
			{/* Header with language and copy button */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
				<div className="flex items-center gap-2">
					<div className="flex gap-1.5">
						<div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
						<div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
						<div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
					</div>
					<span className="ml-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
						{language}
					</span>
				</div>
				<button
					type="button"
					onClick={handleCopy}
					className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
				>
					{copied ? (
						<Check className="h-3.5 w-3.5 text-green-400" />
					) : (
						<Copy className="h-3.5 w-3.5" />
					)}
					<span className="sr-only">Copy code</span>
				</button>
			</div>
			{/* Code content */}
			<pre className="p-4 overflow-x-auto">
				{highlightedCode || (
					<code className="whitespace-pre-wrap text-sm">{children}</code>
				)}
			</pre>
		</div>
	);
};

CodeBlockWithCopy.displayName = "CodeBlockWithCopy";

// ============================================================================
// Custom Block Parser
// ============================================================================

interface ParsedBlock {
	type: "markdown" | "callout" | "collapsible" | "tags" | "button";
	content: string;
	metadata?: {
		calloutType?: CalloutType;
		title?: string;
		tags?: string[];
		buttonVariant?: ButtonVariant;
		buttonUrl?: string;
		buttonText?: string;
	};
}

function parseCustomBlocks(markdown: string): ParsedBlock[] {
	const blocks: ParsedBlock[] = [];
	
	// Regex patterns for custom blocks
	const calloutPattern = /^:::(info|warning|success|error|note)\s*(.*?)\n([\s\S]*?)^:::/gm;
	const detailsPattern = /^:::details\s+(.*?)\n([\s\S]*?)^:::/gm;

	// Find all custom blocks and their positions
	interface BlockMatch {
		start: number;
		end: number;
		block: ParsedBlock;
	}

	const matches: BlockMatch[] = [];

	// Find callouts
	let match: RegExpExecArray | null;
	while ((match = calloutPattern.exec(markdown)) !== null) {
		matches.push({
			start: match.index,
			end: match.index + match[0].length,
			block: {
				type: "callout",
				content: match[3].trim(),
				metadata: {
					calloutType: match[1] as CalloutType,
					title: match[2].trim() || undefined,
				},
			},
		});
	}

	// Find details/collapsible blocks
	while ((match = detailsPattern.exec(markdown)) !== null) {
		matches.push({
			start: match.index,
			end: match.index + match[0].length,
			block: {
				type: "collapsible",
				content: match[2].trim(),
				metadata: {
					title: match[1].trim(),
				},
			},
		});
	}

	// Sort matches by position
	matches.sort((a, b) => a.start - b.start);

	// Build blocks array, interleaving markdown with custom blocks
	let lastEnd = 0;
	for (const m of matches) {
		// Add markdown before this block
		if (m.start > lastEnd) {
			const mdContent = markdown.slice(lastEnd, m.start).trim();
			if (mdContent) {
				blocks.push({ type: "markdown", content: mdContent });
			}
		}
		blocks.push(m.block);
		lastEnd = m.end;
	}

	// Add remaining markdown
	if (lastEnd < markdown.length) {
		const mdContent = markdown.slice(lastEnd).trim();
		if (mdContent) {
			blocks.push({ type: "markdown", content: mdContent });
		}
	}

	// If no custom blocks found, return original markdown
	if (blocks.length === 0) {
		return [{ type: "markdown", content: markdown }];
	}

	return blocks;
}

// ============================================================================
// Markdown Components with Enhanced Styling
// ============================================================================

const components: Partial<Components> = {
	h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
		<h1 
			className="mt-6 mb-4 scroll-m-20 text-3xl font-bold tracking-tight text-foreground first:mt-0" 
			{...props}
		>
			{children}
		</h1>
	),
	h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
		const id = typeof children === 'string' 
			? children.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
			: undefined;
		return (
			<h2
				id={id}
				className="group mt-8 mb-4 scroll-m-20 border-b border-border pb-2 text-2xl font-semibold tracking-tight first:mt-0"
				{...props}
			>
				{children}
				{id && (
					<a 
						href={`#${id}`} 
						className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
					>
						#
					</a>
				)}
			</h2>
		);
	},
	h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
		<h3
			className="mt-6 mb-3 scroll-m-20 text-xl font-semibold tracking-tight"
			{...props}
		>
			{children}
		</h3>
	),
	h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
		<h4
			className="mt-5 mb-2 scroll-m-20 text-lg font-semibold tracking-tight"
			{...props}
		>
			{children}
		</h4>
	),
	h5: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
		<h5
			className="mt-4 mb-2 scroll-m-20 text-base font-semibold tracking-tight"
			{...props}
		>
			{children}
		</h5>
	),
	h6: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
		<h6
			className="mt-4 mb-2 scroll-m-20 text-sm font-semibold tracking-tight"
			{...props}
		>
			{children}
		</h6>
	),
	p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
		<p className="leading-7 [&:not(:first-child)]:mt-4 text-foreground/90" {...props}>
			{children}
		</p>
	),
	strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
		<strong className="font-semibold text-foreground" {...props}>
			{children}
		</strong>
	),
	em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
		<em className="italic" {...props}>
			{children}
		</em>
	),
	a: ({
		children,
		href,
		...props
	}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
		const isExternal = href?.startsWith("http");
		return (
			<a
				href={href}
				className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors inline-flex items-center gap-1"
				target={isExternal ? "_blank" : undefined}
				rel={isExternal ? "noopener noreferrer" : undefined}
				{...props}
			>
				{children}
				{isExternal && <ExternalLink className="h-3 w-3" />}
			</a>
		);
	},
	ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
		<ol className="my-4 ml-6 list-decimal space-y-2 marker:text-muted-foreground" {...props}>
			{children}
		</ol>
	),
	ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
		<ul className="my-4 ml-6 list-disc space-y-2 marker:text-muted-foreground" {...props}>
			{children}
		</ul>
	),
	li: ({ children, ...props }: React.LiHTMLAttributes<HTMLLIElement>) => (
		<li className="leading-7" {...props}>
			{children}
		</li>
	),
	blockquote: ({
		children,
		...props
	}: React.HTMLAttributes<HTMLQuoteElement>) => (
		<blockquote 
			className="mt-4 border-l-4 border-primary/30 bg-muted/30 pl-4 pr-4 py-3 italic text-muted-foreground rounded-r-lg" 
			{...props}
		>
			{children}
		</blockquote>
	),
	hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
		<hr className="my-6 border-border" {...props} />
	),
	table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
		<div className="my-6 w-full overflow-x-auto rounded-lg border border-border">
			<table
				className="w-full border-collapse text-sm"
				{...props}
			>
				{children}
			</table>
		</div>
	),
	thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
		<thead className="bg-muted/50" {...props}>
			{children}
		</thead>
	),
	tbody: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
		<tbody className="divide-y divide-border" {...props}>
			{children}
		</tbody>
	),
	tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
		<tr className="hover:bg-muted/30 transition-colors" {...props}>
			{children}
		</tr>
	),
	th: ({
		children,
		...props
	}: React.HTMLAttributes<HTMLTableCellElement>) => (
		<th
			className="px-4 py-3 text-left font-semibold text-foreground [&[align=center]]:text-center [&[align=right]]:text-right"
			{...props}
		>
			{children}
		</th>
	),
	td: ({
		children,
		...props
	}: React.HTMLAttributes<HTMLTableCellElement>) => (
		<td
			className="px-4 py-3 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
			{...props}
		>
			{children}
		</td>
	),
	img: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
		// biome-ignore lint/a11y/useAltText: alt is passed via props spread
		// biome-ignore lint/performance/noImgElement: Required for markdown images
		<img className="rounded-lg my-4 max-w-full h-auto" alt={alt} {...props} />
	),
	code: ({ children, className, ...props }) => {
		const match = /language-(\w+)/.exec(className || "");
		if (match) {
			return (
				<CodeBlockWithCopy language={match[1]} className={className}>
					{children}
				</CodeBlockWithCopy>
			);
		}
		return (
			<code
				className={cn(
					"rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90",
					className,
				)}
				{...props}
			>
				{children}
			</code>
		);
	},
	pre: ({ children }) => <>{children}</>,
};

// ============================================================================
// Main Components
// ============================================================================

function parseMarkdownIntoBlocks(markdown: string): string[] {
	if (!markdown) {
		return [];
	}
	const tokens = marked.lexer(markdown);
	return tokens.map((token) => token.raw);
}

interface MarkdownBlockProps {
	content: string;
	className?: string;
}

const MemoizedMarkdownBlock = memo(
	({ content, className }: MarkdownBlockProps) => {
		return (
			<div className={className}>
				<ReactMarkdown
					remarkPlugins={[remarkGfm]}
					components={components}
				>
					{content}
				</ReactMarkdown>
			</div>
		);
	},
	(prevProps, nextProps) => {
		if (prevProps.content !== nextProps.content) {
			return false;
		}
		return true;
	},
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

interface MarkdownContentProps {
	content: string;
	className?: string;
	/** Enable custom block parsing (callouts, collapsibles, tags, buttons) */
	enableCustomBlocks?: boolean;
}

export const MarkdownContent = memo(
	({ content, className, enableCustomBlocks = true }: MarkdownContentProps) => {
		const renderedContent = useMemo(() => {
			if (!content) return null;

			if (enableCustomBlocks) {
				// Parse and render custom blocks
				const blocks = parseCustomBlocks(content);
				
				return blocks.map((block, index) => {
					const key = `block-${index}`;
					
					switch (block.type) {
						case "callout":
							return (
								<CalloutBlock
									key={key}
									type={block.metadata?.calloutType || "info"}
									title={block.metadata?.title}
								>
									<MemoizedMarkdownBlock content={block.content} />
								</CalloutBlock>
							);
						
						case "collapsible":
							return (
								<CollapsibleBlock
									key={key}
									title={block.metadata?.title || "Show more"}
								>
									<MemoizedMarkdownBlock content={block.content} />
								</CollapsibleBlock>
							);
						
						case "markdown":
						default:
							return (
								<MemoizedMarkdownBlock
									key={key}
									content={block.content}
									className={className}
								/>
							);
					}
				});
			}

			// Standard markdown rendering without custom blocks
			const blocks = parseMarkdownIntoBlocks(content);
			return blocks.map((block, index) => (
				<MemoizedMarkdownBlock
					content={block}
					className={className}
					key={`block_${index}`}
				/>
			));
		}, [content, className, enableCustomBlocks]);

		return (
			<article className={cn("prose-custom", className)}>
				{renderedContent}
			</article>
		);
	},
);

MarkdownContent.displayName = "MarkdownContent";

// ============================================================================
// Exports
// ============================================================================

export { CalloutBlock, TagBadge, ActionButton, CollapsibleBlock };
export type { MarkdownContentProps };
