import Link from 'next/link';

const links = [
  { href: '/', label: '今日' },
  { href: '/history/', label: '历史' },
  { href: '/events/', label: '事件' },
  { href: '/risk/', label: '风险分析' },
  { href: '/bias/', label: '媒体偏向' },
];

export function Nav() {
  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-brand-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="OpenIntelHub" width={28} height={28} />
          <span>OpenIntelHub</span>
        </Link>
        <ul className="flex gap-4 text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-brand-500">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
