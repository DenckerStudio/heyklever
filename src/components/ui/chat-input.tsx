"use client";

import { Extension } from "@tiptap/core";
import { Mention as MentionExtension } from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import type { Editor, JSONContent } from "@tiptap/react";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { SuggestionProps } from "@tiptap/suggestion";
import { ArrowUpIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
	type ComponentProps,
	createContext,
	forwardRef,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import tippy, { type Instance } from "tippy.js";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupText,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export type ChatInputValue = JSONContent;

export type BaseMentionItem = {
	id: string;
	name: string;
};

type MentionConfig<T extends BaseMentionItem = BaseMentionItem> = {
	type: string;
	trigger: string; // e.g., '@' or '/'
	items: T[];
	renderItem?: (item: T, isSelected: boolean) => ReactNode;
	editorMentionClass?: string;
	filter?: (query: string, items: T[]) => T[];
};

export function createMentionConfig<T extends BaseMentionItem>(
	config: MentionConfig<T>,
): MentionConfig<T> {
	return config;
}

type ChatInputContextType = {
	// biome-ignore lint/suspicious/noExplicitAny: Needs to accept configs with different item types
	mentionConfigs: MentionConfig<any>[];
	// biome-ignore lint/suspicious/noExplicitAny: Needs to accept configs with different item types
	addMentionConfig: (config: MentionConfig<any>) => void;
	onSubmit: () => void;
	onStop?: () => void;
	isStreaming: boolean;
	disabled: boolean;
	value?: ChatInputValue;
	onChange?: (value: ChatInputValue) => void;
};

const ChatInputContext = createContext<ChatInputContextType>({
	mentionConfigs: [],
	addMentionConfig: () => {},
	onSubmit: () => {},
	onStop: undefined,
	isStreaming: false,
	disabled: false,
	value: undefined,
	onChange: undefined,
});

export function ChatInput({
	children,
	className,
	onSubmit,
	isStreaming = false,
	onStop,
	disabled = false,
	value,
	onChange,
	...props
}: ComponentProps<typeof InputGroup> & {
	onSubmit: () => void;
	isStreaming?: boolean;
	onStop?: () => void;
	disabled?: boolean;
	value?: ChatInputValue;
	onChange?: (value: ChatInputValue) => void;
}) {
	// biome-ignore lint/suspicious/noExplicitAny: Needs to accept configs with different item types
	const [mentionConfigs, setMentionConfigs] = useState<MentionConfig<any>[]>(
		[],
	);

	const registeredTypesRef = useRef(new Set<string>());

	// biome-ignore lint/suspicious/noExplicitAny: Needs to accept configs with different item types
	const addMentionConfig = useCallback((config: MentionConfig<any>) => {
		if (registeredTypesRef.current.has(config.type)) {
			setMentionConfigs((prev) => {
				const existingIndex = prev.findIndex(
					(c) => c.type === config.type,
				);
				if (existingIndex >= 0) {
					const updated = [...prev];
					updated[existingIndex] = config;
					return updated;
				}
				return prev;
			});
		} else {
			registeredTypesRef.current.add(config.type);
			setMentionConfigs((prev) => [...prev, config]);
		}
	}, []);

	return (
		<ChatInputContext.Provider
			value={{
				mentionConfigs,
				addMentionConfig,
				onSubmit,
				onStop,
				isStreaming,
				disabled,
				value,
				onChange,
			}}
		>
			<InputGroup
				className={cn(
					"focus-within:ring-1 focus-within:ring-ring rounded-2xl",
					className,
				)}
				{...props}
			>
				{children}
			</InputGroup>
		</ChatInputContext.Provider>
	);
}

export interface ChatInputEditorProps {
	disabled?: boolean;
	onEnter?: () => void;
	placeholder?: string;
	/** Array of placeholders to animate through. If provided, overrides the static placeholder */
	animatedPlaceholders?: string[];
	/** Interval in ms between placeholder changes (default: 3000) */
	placeholderInterval?: number;
	className?: string;
	value?: ChatInputValue;
	onChange?: (value: ChatInputValue) => void;
}

export function ChatInputEditor({
	disabled,
	onEnter,
	placeholder = "Type a message...",
	animatedPlaceholders,
	placeholderInterval = 3000,
	className,
	value,
	onChange,
}: ChatInputEditorProps) {
	const {
		mentionConfigs,
		onSubmit,
		disabled: contextDisabled,
		value: contextValue,
		onChange: contextOnChange,
	} = useContext(ChatInputContext);

	const effectiveValue = value ?? contextValue;
	const effectiveOnChange = onChange ?? contextOnChange;
	const [isMounted, setIsMounted] = useState(false);
	
	// Animated placeholder state
	const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const hasAnimatedPlaceholders = animatedPlaceholders && animatedPlaceholders.length > 0;
	
	// Check if editor is empty
	const [isEditorEmpty, setIsEditorEmpty] = useState(true);

	useEffect(() => {
		setIsMounted(true);
	}, []);
	
	// Animated placeholder cycling logic
	useEffect(() => {
		if (!hasAnimatedPlaceholders) return;
		
		const startAnimation = () => {
			intervalRef.current = setInterval(() => {
				setCurrentPlaceholderIndex((prev) => 
					(prev + 1) % (animatedPlaceholders?.length ?? 1)
				);
			}, placeholderInterval);
		};
		
		const handleVisibilityChange = () => {
			if (document.visibilityState !== "visible" && intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			} else if (document.visibilityState === "visible") {
				startAnimation();
			}
		};
		
		startAnimation();
		document.addEventListener("visibilitychange", handleVisibilityChange);
		
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [hasAnimatedPlaceholders, animatedPlaceholders?.length, placeholderInterval]);

	const onEnterRef = useRef(onEnter || onSubmit);

	useEffect(() => {
		onEnterRef.current = onEnter || onSubmit;
	}, [onEnter, onSubmit]);

	// Use empty placeholder when using animated placeholders
	const effectivePlaceholder = hasAnimatedPlaceholders ? "" : placeholder;

	const extensions = useMemo(
		() => [
			StarterKit,
			Placeholder.configure({ placeholder: effectivePlaceholder }),
			KeyboardShortcuts.configure({
				getOnEnter: () => onEnterRef.current,
			}),
			...mentionConfigs.map((config) => {
				const MentionPlugin = MentionExtension.extend({
					name: `${config.type}-mention`,
				});
				return MentionPlugin.configure({
					HTMLAttributes: {
						class: cn(
							"bg-primary text-primary-foreground rounded-sm px-1 py-0.5 no-underline",
							config.editorMentionClass,
						),
					},
					suggestion: {
						char: config.trigger,
						...getMentionSuggestion(config),
					},
				});
			}),
		],
		[mentionConfigs, effectivePlaceholder],
	);

	const onUpdate = useCallback(
		({ editor }: { editor: Editor }) => {
			if (isMounted) {
				effectiveOnChange?.(editor.getJSON());
				// Update empty state for animated placeholder
				setIsEditorEmpty(editor.isEmpty);
			}
		},
		[effectiveOnChange, isMounted],
	);

	const editor = useEditor(
		{
			extensions,
			content: effectiveValue,
			onUpdate,
			editable: !(disabled || contextDisabled),
			immediatelyRender: false,
			onCreate: ({ editor }) => {
				setIsEditorEmpty(editor.isEmpty);
			},
		},
		[extensions, disabled, contextDisabled],
	);

	useEffect(() => {
		if (
			effectiveValue &&
			editor &&
			JSON.stringify(effectiveValue) !== JSON.stringify(editor.getJSON())
		) {
			editor.commands.setContent(effectiveValue);
			setIsEditorEmpty(editor.isEmpty);
		}
	}, [effectiveValue, editor]);

	const currentPlaceholder = hasAnimatedPlaceholders 
		? animatedPlaceholders[currentPlaceholderIndex] 
		: placeholder;

	return (
		<>
			<style>{`
				.tiptap:focus { outline: none; }
				.tiptap p.is-editor-empty:first-child::before {
					color: var(--muted-foreground);
					content: attr(data-placeholder);
					float: left;
					height: 0;
					pointer-events: none;
				}
			`}</style>
			<div className="relative w-full h-full">
				<EditorContent
					editor={editor}
					className={cn(
						"w-full h-full max-h-48 px-4 pt-4 pb-2 overflow-y-auto",
						className,
					)}
				/>
				{/* Animated placeholder overlay */}
				{hasAnimatedPlaceholders && (
					<div className="absolute inset-0 flex items-start pointer-events-none px-4 pt-4 pb-2">
						<AnimatePresence mode="wait">
							{isEditorEmpty && (
								<motion.p
									key={`placeholder-${currentPlaceholderIndex}`}
									initial={{ y: 8, opacity: 0 }}
									animate={{ y: 0, opacity: 1 }}
									exit={{ y: -12, opacity: 0 }}
									transition={{
										duration: 0.3,
										ease: "easeOut",
									}}
									className="text-muted-foreground text-sm sm:text-base truncate"
								>
									{currentPlaceholder}
								</motion.p>
							)}
						</AnimatePresence>
					</div>
				)}
			</div>
		</>
	);
}

const KeyboardShortcuts = Extension.create({
	addKeyboardShortcuts() {
		return {
			Enter: () => {
				const onEnter = this.options.getOnEnter?.();
				if (onEnter) {
					onEnter();
				}
				return true;
			},
		};
	},
	addOptions() {
		return {
			getOnEnter: () => () => {},
		};
	},
});

export type ChatInputMentionProps<T extends BaseMentionItem = BaseMentionItem> =
	{
		type: string;
		trigger: string;
		items: T[];
		children?: (item: T, isSelected: boolean) => ReactNode;
		editorMentionClass?: string;
		filter?: (query: string, items: T[]) => T[];
	};

export function ChatInputMention<T extends BaseMentionItem = BaseMentionItem>({
	type,
	trigger,
	items,
	children,
	editorMentionClass,
	filter,
}: ChatInputMentionProps<T>) {
	const { addMentionConfig } = useContext(ChatInputContext);

	const renderItemRef = useRef(children);
	useEffect(() => {
		renderItemRef.current = children;
	}, [children]);

	useEffect(() => {
		addMentionConfig({
			type,
			trigger,
			items,
			renderItem: renderItemRef.current,
			editorMentionClass,
			filter,
		});
	}, [addMentionConfig, type, trigger, items, editorMentionClass, filter]);

	return null;
}

interface GenericMentionListProps<T extends BaseMentionItem> {
	items: T[];
	command: (item: { id: string; label: string }) => void;
	renderItem?: (item: T, isSelected: boolean) => ReactNode;
}

type GenericMentionListRef = {
	handleKeyDown: (event: KeyboardEvent) => boolean;
};

// Animation variants for staggered fade-in
const containerVariants = {
	hidden: { opacity: 0, y: 8, scale: 0.96 },
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: {
			type: "spring" as const,
			stiffness: 400,
			damping: 30,
			staggerChildren: 0.04,
			delayChildren: 0.05,
		},
	},
	exit: {
		opacity: 0,
		y: 4,
		scale: 0.98,
		transition: { duration: 0.15, ease: "easeOut" as const },
	},
};

const itemVariants = {
	hidden: { opacity: 0, x: -8 },
	visible: {
		opacity: 1,
		x: 0,
		transition: {
			type: "spring" as const,
			stiffness: 500,
			damping: 30,
		},
	},
};

const GenericMentionList = forwardRef(
	<T extends BaseMentionItem>(
		props: GenericMentionListProps<T>,
		ref: React.Ref<GenericMentionListRef>,
	) => {
		const { items, command, renderItem } = props;
		const [selectedIndex, setSelectedIndex] = useState(0);
		const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

		const selectItem = useCallback(
			(index: number) => {
				const item = items[index];
				if (item) {
					command({
						id: item.id,
						label: item.name,
					});
				}
			},
			[items, command],
		);

		const scrollToItem = useCallback((index: number) => {
			const itemEl = itemRefs.current[index];
			if (itemEl) {
				itemEl.scrollIntoView({
					behavior: "smooth",
					block: "nearest",
				});
			}
		}, []);

		const upHandler = useCallback(() => {
			setSelectedIndex((prevIndex) => {
				const newIndex = (prevIndex + items.length - 1) % items.length;
				scrollToItem(newIndex);
				return newIndex;
			});
		}, [items.length, scrollToItem]);

		const downHandler = useCallback(() => {
			setSelectedIndex((prevIndex) => {
				const newIndex = (prevIndex + 1) % items.length;
				scrollToItem(newIndex);
				return newIndex;
			});
		}, [items.length, scrollToItem]);

		const enterHandler = useCallback(() => {
			selectItem(selectedIndex);
		}, [selectedIndex, selectItem]);

		useEffect(() => {
			setSelectedIndex(0);
			itemRefs.current = itemRefs.current.slice(0, items.length);
		}, [items]);

		const handleKeyDown = useCallback(
			(event: KeyboardEvent) => {
				if (event.key === "ArrowUp") {
					upHandler();
					return true;
				}
				if (event.key === "ArrowDown") {
					downHandler();
					return true;
				}
				if (event.key === "Enter") {
					enterHandler();
					return true;
				}
				return false;
			},
			[upHandler, downHandler, enterHandler],
		);

		useImperativeHandle(ref, () => ({ handleKeyDown }), [handleKeyDown]);

		return (
			<AnimatePresence mode="wait">
				<motion.div
					variants={containerVariants}
					initial="hidden"
					animate="visible"
					exit="exit"
					className={cn(
						"min-w-52 max-w-72 max-h-60",
						"bg-background/95 backdrop-blur-xl",
						"text-popover-foreground",
						"rounded-xl shadow-xl shadow-black/10",
						"flex flex-col gap-1 overflow-y-auto p-1.5",
						"scrollbar-thin"
					)}
				>
					{items.length ? (
						items.map((item, index) => (
							<motion.div
								key={item.id}
								variants={itemVariants}
							>
								<Button
									variant="ghost"
									size="sm"
									className={cn(
										"w-full flex justify-start px-2 py-1.5 gap-2 rounded-lg h-auto",
										"transition-all duration-150",
										selectedIndex === index
											? "bg-primary/10 text-primary"
											: "hover:bg-muted/40"
									)}
									onClick={() => selectItem(index)}
									ref={(el) => {
										if (el) {
											itemRefs.current[index] = el;
										}
									}}
								>
									{renderItem ? (
										renderItem(item, selectedIndex === index)
									) : (
										<span className="px-2 text-sm">{item.name}</span>
									)}
								</Button>
							</motion.div>
						))
					) : (
						<motion.div
							variants={itemVariants}
							className="text-sm text-muted-foreground/60 px-3 py-3 text-center"
						>
							No results found
						</motion.div>
					)}
				</motion.div>
			</AnimatePresence>
		);
	},
);

GenericMentionList.displayName = "GenericMentionList";

function getMentionSuggestion<T extends BaseMentionItem>(
	config: MentionConfig<T>,
) {
	return {
		items: ({ query }: { query: string }) => {
			if (config.filter) {
				return config.filter(query, config.items);
			}
			return config.items.filter((item) =>
				item.name.toLowerCase().startsWith(query.toLowerCase()),
			);
		},
		render: () => {
			// biome-ignore lint/suspicious/noExplicitAny: Ok
			let component: ReactRenderer<any>;
			let popup: Instance;

			return {
				onStart: (props: SuggestionProps<T>) => {
					component = new ReactRenderer(GenericMentionList, {
						props: {
							items: props.items,
							command: props.command,
							renderItem: config.renderItem,
						},
						editor: props.editor,
					});

					if (!props.clientRect) {
						return;
					}

					popup = tippy(document.body, {
						getReferenceClientRect:
							props.clientRect as () => DOMRect,
						appendTo: () => document.body,
						content: component.element,
						showOnCreate: true,
						interactive: true,
						trigger: "manual",
						placement: "bottom-start",
					});
				},
				onUpdate: (props: SuggestionProps<T>) => {
					component.updateProps(props);

					if (!props.clientRect) {
						return;
					}

					popup.setProps({
						getReferenceClientRect:
							props.clientRect as () => DOMRect,
					});
				},
				onKeyDown: (props: { event: KeyboardEvent }) => {
					if (props.event.key === "Escape") {
						popup.hide();
						return true;
					}
					return component.ref?.handleKeyDown?.(props.event) || false;
				},
				onExit: () => {
					popup.destroy();
					component.destroy();
				},
			};
		},
	};
}

export type ChatInputSubmitButtonProps = ComponentProps<
	typeof InputGroupButton
> & {
	isStreaming?: boolean;
	onStop?: () => void;
	disabled?: boolean;
};

export function ChatInputSubmitButton({
	className,
	isStreaming,
	onStop,
	disabled,
	...props
}: ChatInputSubmitButtonProps) {
	const {
		onSubmit,
		onStop: onStopContext,
		isStreaming: isStreamingContext,
		disabled: contextDisabled,
	} = useContext(ChatInputContext);

	const loading = isStreaming ?? isStreamingContext;
	const effectiveOnStop = onStop ?? onStopContext;
	const effectiveDisabled = disabled ?? contextDisabled;

	const isStopVariant = loading && effectiveOnStop;
	const isLoadingVariant = loading && !effectiveOnStop;

	const handleClick = isStopVariant ? effectiveOnStop : onSubmit;

	if (isStopVariant) {
		return (
			<InputGroupButton
				variant="default"
				size="icon-sm"
				className={cn("rounded-full", className)}
				onClick={handleClick}
				disabled={effectiveDisabled}
				{...props}
			>
				<StopIcon className="h-4 w-4" />

				<span className="sr-only">Stop</span>
			</InputGroupButton>
		);
	}

	if (isLoadingVariant) {
		return (
			<InputGroupButton
				variant="default"
				size="icon-sm"
				className={cn("rounded-full", className)}
				onClick={handleClick}
				disabled={effectiveDisabled}
				{...props}
			>
				<Loader2 className="h-4 w-4 animate-spin" />
				<span className="sr-only">Loading</span>
			</InputGroupButton>
		);
	}

	return (
		<InputGroupButton
			variant="default"
			size="icon-sm"
			className={cn("rounded-full", className)}
			onClick={handleClick}
			disabled={effectiveDisabled}
			{...props}
		>
			<ArrowUpIcon />
			<span className="sr-only">Send</span>
		</InputGroupButton>
	);
}

const StopIcon = ({ className }: { className?: string }) => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 16 16"
		fill="currentColor"
		className={className}
		aria-hidden="true"
	>
		<title>Stop</title>
		<rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" />
	</svg>
);

export type ChatInputGroupAddon = ComponentProps<typeof InputGroupAddon>;

export function ChatInputGroupAddon({
	className,
	...props
}: ChatInputGroupAddon) {
	return <InputGroupAddon className={cn(className)} {...props} />;
}

export type ChatInputGroupButtonProps = ComponentProps<typeof InputGroupButton>;
export function ChatInputGroupButton({
	className,
	...props
}: ChatInputGroupButtonProps) {
	return <InputGroupButton className={cn(className)} {...props} />;
}

export type ChatInputGroupTextProps = ComponentProps<typeof InputGroupText>;
export function ChatInputGroupText({
	className,
	...props
}: ChatInputGroupTextProps) {
	return <InputGroupText className={cn(className)} {...props} />;
}

// biome-ignore lint/suspicious/noExplicitAny: Required for type inference
type MentionConfigsObject = Record<string, MentionConfig<any>>;

type ParsedFromObject<T extends MentionConfigsObject> = {
	content: string;
} & {
	[K in keyof T]?: T[K] extends MentionConfig<infer Item> ? Item[] : never;
};

type ParsedContentOnly = {
	content: string;
};

type UseChatInputReturn<Mentions extends MentionConfigsObject | undefined> = {
	value: JSONContent;
	onChange: (value: JSONContent) => void;
	parsed: Mentions extends MentionConfigsObject
		? ParsedFromObject<Mentions>
		: ParsedContentOnly;
	clear: () => void;
	handleSubmit: () => void;
} & (Mentions extends MentionConfigsObject
	? { mentionConfigs: Mentions }
	: { mentionConfigs?: never });

export function useChatInput<Mentions extends MentionConfigsObject>(config: {
	mentions: Mentions;
	initialValue?: JSONContent;
	onSubmit?: (parsed: ParsedFromObject<Mentions>) => void;
}): UseChatInputReturn<Mentions>;

export function useChatInput(config: {
	mentions?: never;
	initialValue?: JSONContent;
	onSubmit?: (parsed: ParsedContentOnly) => void;
}): UseChatInputReturn<undefined>;

export function useChatInput<
	Mentions extends MentionConfigsObject | undefined,
>({
	mentions,
	initialValue,
	onSubmit: onCustomSubmit,
}: {
	mentions?: Mentions;
	initialValue?: JSONContent;
	// biome-ignore lint/suspicious/noExplicitAny: Required for generic config handling
	onSubmit?: (parsed: any) => void;
}): UseChatInputReturn<Mentions> {
	const [value, setValue] = useState<JSONContent>(
		initialValue ?? { type: "doc", content: [] },
	);

	const configsArray = useMemo(
		() => (mentions ? Object.values(mentions) : []),
		[mentions],
	);

	const parsed = useMemo(
		() => parseContent(value, configsArray),
		[value, configsArray],
	);

	const clear = useCallback(() => {
		setValue({ type: "doc", content: [] });
	}, []);

	const handleSubmit = useCallback(() => {
		if (parsed.content.trim().length === 0) {
			return;
		}

		if (onCustomSubmit) {
			onCustomSubmit(parsed);
		}

		clear();
	}, [parsed, onCustomSubmit, clear]);

	return {
		value,
		onChange: setValue,
		parsed,
		clear,
		handleSubmit,
		...(mentions ? { mentionConfigs: mentions } : {}),
		// biome-ignore lint/suspicious/noExplicitAny: Type inference complexity
	} as any;
}

// biome-ignore lint/suspicious/noExplicitAny: Required for type inference
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;

// biome-ignore lint/suspicious/noExplicitAny: Required for type inference
type ConfigToField<Config extends MentionConfig<any>> =
	Config extends MentionConfig<infer T>
		? { [K in Config["type"]]: T[] }
		: never;

export type ParsedChatInputValue<
	// biome-ignore lint/suspicious/noExplicitAny: Required for type inference
	Configs extends readonly MentionConfig<any>[],
> = { content: string } & Partial<
	UnionToIntersection<
		{ [I in keyof Configs]: ConfigToField<Configs[I]> }[number]
	>
>;

// biome-ignore lint/suspicious/noExplicitAny: Required for generic config handling
export function parseContent<Configs extends readonly MentionConfig<any>[]>(
	json: JSONContent,
	configs: Configs,
): ParsedChatInputValue<Configs> {
	let content = "";
	// biome-ignore lint/suspicious/noExplicitAny: Dynamic mention types
	const mentions: Record<string, any[]> = {};

	function recurse(node: JSONContent) {
		if (node.type === "text" && node.text) {
			content += node.text;
		} else if (node.type === "hardBreak") {
			content += "\n";
		} else if (node.type?.endsWith("-mention")) {
			const mentionType = node.type.slice(0, -8);
			const config = configs.find((c) => c.type === mentionType);
			if (config) {
				const attrs = node.attrs ?? {};
				const id = attrs.id as string;
				//const type = attrs.type as string;
				const label = attrs.label as string;
				content += `<span class="mention mention-${mentionType}" data-type="${mentionType}" data-id="${id}" data-name="${label}" >${config.trigger}${label}</span>`;

				if (!mentions[mentionType]) {
					mentions[mentionType] = [];
				}
				const item = config.items.find((i) => i.id === id);
				if (
					item &&
					!mentions[mentionType].some(
						(existing) => existing.id === id,
					)
				) {
					mentions[mentionType].push(item);
				}
			} else {
				content += node.text ?? "";
			}
		} else if (node.content) {
			for (const child of node.content) {
				recurse(child);
			}
			if (node.type === "paragraph") {
				content += "\n\n";
			}
		}
	}

	if (json.content) {
		for (const node of json.content) {
			recurse(node);
		}
	}

	content = content.trim();

	return { content, ...mentions } as ParsedChatInputValue<Configs>;
}
