"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { readMarkdownFile } from "@/app/actions";

const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-6 text-2xl font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-6 text-xl font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-lg font-semibold first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h4>
  ),
  p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  a: ({ href, children }) => {
    if (typeof href === "string" && /^https?:\/\//i.test(href)) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          {children}
        </a>
      );
    }

    if (typeof href === "string" && /^mailto:/i.test(href)) {
      return (
        <a href={href} className="underline underline-offset-2">
          {children}
        </a>
      );
    }

    return <span>{children}</span>;
  },
  img: ({ src, alt }) => {
    if (typeof src !== "string" || !/^https?:\/\//i.test(src)) {
      return null;
    }

    return (
      // Remote images come from the Markdown file, not a configured host.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt || ""}
        className="my-3 max-h-96 max-w-full rounded-lg"
      />
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-zinc-300 pl-3 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-black/10 dark:border-white/15" />,
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-zinc-100 p-3 font-mono text-[13px] leading-5 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[13px] dark:bg-zinc-900">
      {children}
    </pre>
  ),
  code: ({ className, children }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-zinc-800">
        {children}
      </code>
    ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-black/10 px-2 py-1 font-medium dark:border-white/15">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-black/10 px-2 py-1 align-top dark:border-white/15">
      {children}
    </td>
  ),
  input: ({ checked, type }) => (
    <input
      type={type || "checkbox"}
      checked={Boolean(checked)}
      disabled
      readOnly
      className="mr-2 align-middle"
    />
  ),
  del: ({ children }) => <del className="text-zinc-500">{children}</del>,
};

function compareName(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function fileRank(name) {
  const lower = name.toLowerCase();
  if (lower === "readme.md" || lower === "readme.markdown") {
    return 0;
  }

  return 1;
}

function buildMarkdownTree(files) {
  const root = { name: "", path: "", dirs: [], files: [] };
  const dirs = new Map([["", root]]);

  for (const file of files) {
    const parts = file.path.split("/");
    let parentPath = "";

    for (let index = 0; index < parts.length - 1; index += 1) {
      const name = parts[index];
      const path = parentPath ? `${parentPath}/${name}` : name;
      if (!dirs.has(path)) {
        const dir = { name, path, dirs: [], files: [] };
        dirs.set(path, dir);
        dirs.get(parentPath).dirs.push(dir);
      }
      parentPath = path;
    }

    dirs.get(parentPath).files.push({
      path: file.path,
      name: parts[parts.length - 1],
    });
  }

  function finalize(node) {
    node.dirs.sort((a, b) => compareName(a.name, b.name));
    node.files.sort((a, b) => {
      const rank = fileRank(a.name) - fileRank(b.name);
      if (rank !== 0) {
        return rank;
      }
      return compareName(a.name, b.name);
    });

    let count = node.files.length;
    for (const dir of node.dirs) {
      count += finalize(dir);
    }
    node.count = count;
    return count;
  }

  finalize(root);
  return root;
}

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M7 5l6 5-6 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0 text-zinc-500"
      aria-hidden="true"
    >
      <path
        d="M6 3.5h5.2L15 7.3V16a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 16V5A1.5 1.5 0 0 1 6.5 3.5H6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M11 3.5V7.5H15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function TreeItems({ node, activePath, onOpen }) {
  return (
    <>
      {node.files.map((file) => {
        const active = file.path === activePath;
        return (
          <li key={file.path}>
            <button
              type="button"
              title={file.path}
              aria-current={active ? "true" : undefined}
              onClick={() => onOpen(file)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                active ? "bg-zinc-100 dark:bg-zinc-800" : ""
              }`}
            >
              <FileIcon />
              <span className="truncate">{file.name}</span>
            </button>
          </li>
        );
      })}
      {node.dirs.map((dir) => (
        <Directory
          key={dir.path}
          node={dir}
          activePath={activePath}
          onOpen={onOpen}
        />
      ))}
    </>
  );
}

function Directory({ node, activePath, onOpen }) {
  const [open, setOpen] = useState(true);

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        <Chevron open={open} />
        <span className="truncate font-medium">{node.name}</span>
        <span className="ml-auto shrink-0 text-xs text-zinc-500">{node.count}</span>
      </button>
      {open ? (
        <div className="ml-5 border-l border-black/10 dark:border-white/10">
          <ul>
            <TreeItems node={node} activePath={activePath} onOpen={onOpen} />
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function MarkdownDocument({ content }) {
  return (
    <div className="px-5 py-4 text-sm leading-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function MarkdownMap({
  files = [],
  branch = "",
  truncated = false,
  error = null,
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const requestRef = useRef(0);
  const closeButtonRef = useRef(null);
  const wasOpenRef = useRef(false);

  const safeFiles = useMemo(
    () => files.filter((file) => typeof file?.path === "string" && file.path),
    [files],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return safeFiles;
    }

    return safeFiles.filter((file) => file.path.toLowerCase().includes(needle));
  }, [safeFiles, query]);

  const tree = useMemo(() => buildMarkdownTree(filtered), [filtered]);

  const close = useCallback(() => {
    requestRef.current += 1;
    setSelected(null);
    setLoading(false);
    setLoadError(null);
    setContent("");
  }, []);

  useEffect(() => {
    if (!selected) {
      wasOpenRef.current = false;
      return undefined;
    }

    const shouldFocus = !wasOpenRef.current;
    wasOpenRef.current = true;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (shouldFocus) {
      closeButtonRef.current?.focus();
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selected, close]);

  async function openFile(file) {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setSelected(file);
    setLoading(true);
    setLoadError(null);
    setContent("");

    let result;
    try {
      result = await readMarkdownFile(file.path);
    } catch {
      result = { ok: false, error: "Could not read that file." };
    }

    if (requestRef.current !== requestId) {
      return;
    }

    setLoading(false);
    if (!result?.ok) {
      setLoadError(result?.error || "Could not read that file.");
      return;
    }

    setContent(typeof result.content === "string" ? result.content : "");
  }

  const countLabel =
    safeFiles.length === 1
      ? "1 Markdown file"
      : `${safeFiles.length} Markdown files`;
  const showTree = Boolean(branch) && !error && filtered.length > 0;
  const showEmpty = Boolean(branch) && !error && safeFiles.length === 0;
  const showNoMatch =
    Boolean(branch) && !error && safeFiles.length > 0 && filtered.length === 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Markdown files</h2>
        <p className="text-sm text-zinc-500">
          {branch
            ? `${countLabel} on ${branch}`
            : "Select a branch to see Markdown files."}
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {truncated && !error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          The provider returned a partial file list, so some Markdown files may
          be missing.
        </p>
      ) : null}

      {branch && !error && safeFiles.length > 0 ? (
        <input
          id="markdown-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by path"
          aria-label="Filter Markdown files"
          className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-white/15 dark:bg-zinc-950"
        />
      ) : null}

      {showEmpty ? (
        <p className="rounded-xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/15">
          No Markdown files on {branch}.
        </p>
      ) : null}

      {showNoMatch ? (
        <p className="rounded-xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/15">
          No Markdown files match that filter.
        </p>
      ) : null}

      {showTree ? (
        <div className="max-h-[32rem] overflow-y-auto rounded-xl border border-black/10 dark:border-white/15">
          <ul className="py-1" key={query}>
            <TreeItems
              node={tree}
              activePath={selected?.path ?? ""}
              onOpen={openFile}
            />
          </ul>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close file"
            onClick={close}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="markdown-drawer-title"
            aria-busy={loading}
            className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-black/10 bg-white shadow-2xl dark:border-white/15 dark:bg-zinc-950"
          >
            <header className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4 dark:border-white/15">
              <div className="min-w-0">
                <h2 id="markdown-drawer-title" className="truncate text-base font-semibold">
                  {selected.name}
                </h2>
                <p className="mt-1 break-all text-xs text-zinc-500">{selected.path}</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-white/15 dark:hover:bg-zinc-900"
              >
                Close
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <p className="px-5 py-4 text-sm text-zinc-500">Loading…</p>
              ) : null}
              {loadError ? (
                <p className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                  {loadError}
                </p>
              ) : null}
              {!loading && !loadError && content.trim() ? (
                <MarkdownDocument content={content} />
              ) : null}
              {!loading && !loadError && !content.trim() ? (
                <p className="px-5 py-4 text-sm text-zinc-500">This file is empty.</p>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
