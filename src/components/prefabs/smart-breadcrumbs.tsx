"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** -------- NAV TREE (edit to match your app) -------- */
type Resolver = (segmentValue: string) => Promise<string>;
type NavNode = {
  slug: string;              // "projects", "issues", ":id", "settings", ""
  label?: string;
  resolveLabel?: Resolver;   // for dynamic nodes (e.g., ":id")
  children?: NavNode[];
};

const NAV_TREE: NavNode[] = [
  { slug: "projects", label: "Projects", children: [
      { slug: ":id", label: "Project", /* resolveLabel: async (id) => (await fetch(`/api/projects/${id}`)).json().then(d => d.name), */ children: [
        { slug: "", label: "Overview" },
        { slug: "issues", label: "Issues" },
        { slug: "settings", label: "Settings" },
      ]},
  ]},
  { slug: "issues", label: "Issues" },
  { slug: "settings", label: "Settings" },
];

/** -------- helpers -------- */
const humanize = (s: string) =>
  decodeURIComponent(s).replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function matchChild(children: NavNode[] | undefined, seg: string) {
  if (!children) return { node: undefined as NavNode | undefined, isDynamic: false };
  const exact = children.find((c) => c.slug === seg);
  if (exact) return { node: exact, isDynamic: false };
  const dyn = children.find((c) => c.slug.startsWith(":"));
  if (dyn) return { node: dyn, isDynamic: true };
  return { node: undefined as NavNode | undefined, isDynamic: false };
}

const buildHref = (parts: string[]) => "/" + parts.filter(Boolean).join("/");

/** -------- component -------- */
export function SmartBreadcrumbs({
  navTree = NAV_TREE,
  rootLabel = "Dashboard",
  hideOnRoot = true,         // hide breadcrumbs on "/"
  rootHasDropdown = false,   // root "Dashboard" has no dropdown
}: {
  navTree?: NavNode[];
  rootLabel?: string;
  hideOnRoot?: boolean;
  rootHasDropdown?: boolean;
}) {
  const pathname = usePathname() || "/";
  const segments = pathname.split("?")[0].split("/").filter(Boolean); // ["projects","123",...]

  // Hide on "/"
  if (hideOnRoot && segments.length === 0) return null;

  type Step = {
    seg: string;
    node?: NavNode;
    isDynamic: boolean;
    parentChildren: NavNode[];
  };

  // walk the nav tree to know siblings at each depth
  const steps: Step[] = [];
  let currentChildren: NavNode[] = navTree;
  for (const seg of segments) {
    const { node, isDynamic } = matchChild(currentChildren, seg);
    steps.push({ seg, node, isDynamic, parentChildren: currentChildren });
    currentChildren = node?.children ?? [];
  }

  // resolve dynamic labels (e.g., /projects/:id -> name)
  const [resolved, setResolved] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const tasks: Promise<void>[] = [];
      steps.forEach(({ seg, node, isDynamic }) => {
        if (isDynamic && node?.resolveLabel && !resolved[seg]) {
          tasks.push(
            node.resolveLabel(seg)
              .then((name) => { if (!cancelled) setResolved((m) => ({ ...m, [seg]: name })); })
              .catch(() => void 0)
          );
        }
      });
      await Promise.allSettled(tasks);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const crumbs = steps.map((s, i) => ({
    href: buildHref(segments.slice(0, i + 1)),
    label: (s.isDynamic ? resolved[s.seg] : s.node?.label) || humanize(s.seg),
    step: s,
    depth: i,
  }));

  const siblingsFor = (step: Step | null) => {
    if (!step) return navTree; // siblings under root
    return (step.parentChildren ?? []).filter((n) => n !== step.node);
  };

  const hrefForSibling = (depth: number, sibling: NavNode) => {
    const base = segments.slice(0, depth);
    const segValue = sibling.slug.startsWith(":") ? segments[depth] : sibling.slug;
    return buildHref([...base, segValue]);
  };

  const renderCrumb = (
    label: string,
    href: string,
    step: Step | null,
    depth: number,
    isLast: boolean,
    forceNoDropdown = false
  ) => {
    const siblings = siblingsFor(step)
      .filter((n) => !(n.slug.startsWith(":") && depth <= 0)); // hide dynamic siblings at top

    if (forceNoDropdown || siblings.length === 0) {
      return isLast ? (
        <BreadcrumbItem><BreadcrumbPage>{label}</BreadcrumbPage></BreadcrumbItem>
      ) : (
        <BreadcrumbItem>
          <BreadcrumbLink asChild><Link href={href}>{label}</Link></BreadcrumbLink>
        </BreadcrumbItem>
      );
    }

    return (
      <BreadcrumbItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {isLast ? (
              <BreadcrumbPage className="cursor-pointer">{label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href={href} className="inline-flex items-center cursor-pointer">
                  {label}
                </Link>
              </BreadcrumbLink>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {siblings.map((sib) => {
              const sibHref = hrefForSibling(depth, sib);
              return (
                <DropdownMenuItem key={sibHref} asChild>
                  <Link href={sibHref}>{sib.label ?? humanize(sib.slug)}</Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </BreadcrumbItem>
    );
  };

  const onRoot = segments.length === 0;
  const rootHref = "/";
  const rootIsLast = onRoot;
  const rootForceNoDropdown = !rootHasDropdown;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Root crumb: "Dashboard" (no dropdown by default) */}
        {renderCrumb(rootLabel, rootHref, null, 0, rootIsLast, rootForceNoDropdown)}

        {crumbs.map((c, i) => (
          <span key={c.href} className="inline-flex items-center gap-2">
            <BreadcrumbSeparator />
            {renderCrumb(c.label, c.href, c.step, c.depth, i === crumbs.length - 1, false)}
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
